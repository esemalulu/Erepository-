/**
 * 
 */

//Company Level Preference
var paramSoftwareClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibsoftclassids'),
	paramMaintClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibmaintclassids'),
	//Added 6/25/2016 - Subscription Enhancement
	paramSubsClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibsubsclassids'),
	paramPrimaryErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibprimeerr'),
	paramCcErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibccerr');

	if (paramCcErrorNotifier) {
	paramCcErrorNotifier = paramCcErrorNotifier.split(',');
} else {
	paramCcErrorNotifier = null; 
}

//Script Level Preference
var paramJson = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb105_procjson');

/**
JSON object def.

var sojson = {
	'enduser':newRec.getFieldValue('custbody_end_user'),
	'salesorder':newRec.getId(),
	'number':newRec.getFieldValue('tranid'),
	'startdate':newRec.getFieldValue('startdate'),
	'contractnumber':newRec.getFieldValue('custbody2'),
	'memo':newRec.getFieldValue('memo'),
	'prod':{
		[itemid-linenum]:{
			'line':xx,
			'itemid':xx,
			'qty':'xx',
			'class':'xx',
			'extolnote':'xx',
			'additionalinfo':itemAdditionalInfo
		}..
	},
	'maint':{
		[itemid-linenum]:{
			'line':xx,
			'itemid':xx,
			'qty':'xx',
			'class':'xx',
			'revrecstart':'xx',
			'revrecend':'xx',
			'termsinmonths':'xx',
			'price':'xx',
			'taxcode':'xx',
			'additionalinfo':itemAdditionalInfo
		}
	},
	//6/25/2916 - Subs Enhancement
	'subs':{
		[itemid-linenum]:{
			'line':xx,
			'itemid':xx,
			'qty':'xx',
			'class':'xx',
			'revrecstart':'xx',
			'revrecend':'xx',
			'termsinmonths':'xx',
			'price':'xx',
			'taxcode':'xx',
			'additionalinfo':itemAdditionalInfo
		}
	}
};
*/

function executeOrderProc() {
	
	//Grab and build software class IDs
	if (paramSoftwareClassIds) {
		paramSoftwareClassIds = paramSoftwareClassIds.split(',');
		//6/25/2016 - Subs Enhancement.
		//		Loop through each and make sure there are no extra spaces 
		for (var p=0; p < paramSoftwareClassIds.length; p+=1)
		{
			paramSoftwareClassIds[p] = strTrim(paramSoftwareClassIds[p]);
		}
	} else {
		//Turn it into empty array
		paramSoftwareClassIds = [];
	}
	
	//Grab and build maintenance class IDs
	if (paramMaintClassIds) {
		paramMaintClassIds = paramMaintClassIds.split(',');
		//6/25/2016 - Subs Enhancement.
		//		Loop through each and make sure there are no extra spaces 
		for (var p=0; p < paramMaintClassIds.length; p+=1)
		{
			paramMaintClassIds[p] = strTrim(paramMaintClassIds[p]);
		}
	} else {
		//Turn it into empty array
		paramMaintClassIds = [];
	}
	
	//6/25/2016 - Subscription Enhancement
	//Grab and build Subscription class IDs
	if (paramSubsClassIds)
	{
		paramSubsClassIds = paramSubsClassIds.split(',');
		//6/25/2016 - Subs Enhancement.
		//		Loop through each and make sure there are no extra spaces 
		for (var p=0; p < paramSubsClassIds.length; p+=1)
		{
			paramSubsClassIds[p] = strTrim(paramSubsClassIds[p]);
		}
	}
	else
	{
		paramSubsClassIds = [];
	}
	
	if (!paramJson) {
		throw nlapiCreateError('INSTALLBASE_EXECUTE_ORDER-ERR', 'Sales Order JSON Object is required. Please reprocess it from Sales order', false);
		return;
	}

	var sojson = JSON.parse(paramJson);
	
	log('debug','Param JSON', JSON.stringify(sojson));
	
	var sorec = nlapiLoadRecord('salesorder', sojson.salesorder, {recordmode:'dynamic'});
	
	try {

		//1. Go through Product JSON and create it
		if (sojson.prod) {
			//create Product records
			for (var p in sojson.prod) {
				
				log('debug','checking line',sorec.getLineItemValue('item', 'custcol_axib_lineprocessed', sojson.prod[p].line));
				//JUST incase it gets reprocess manuall from scheduled script, check to make sure THIS SO line isn't processed
				if (sorec.getLineItemValue('item', 'custcol_axib_lineprocessed', sojson.prod[p].line) != 'T') {
					var prodrec = nlapiCreateRecord('customrecord_aeprod', {recordmode:'dynamic'});
					prodrec.setFieldValue('custrecord_aeprod_customer', sojson.enduser);
					prodrec.setFieldValue('custrecord_aeprod_item', sojson.prod[p].itemid);
					prodrec.setFieldValue('custrecord_aeprod_itemqty', sojson.prod[p].qty);
					prodrec.setFieldValue('custrecord_aeprod_itemdesc', sojson.prod[p].desc);
					prodrec.setFieldValue('custrecord_aeprod_so', sojson.salesorder);
					prodrec.setFieldValue('custrecord_aeprod_soextnote', sojson.prod[p].extolnote);
					//8/19/2015 - Track Additional Info
					prodrec.setFieldValue('custrecord_aeprod_addinfo', sojson.prod[p].additionalinfo);
					var prodrecid = nlapiSubmitRecord(prodrec, true, true);
					log('audit', 'SO #'+sojson.number,'Processed created IB:Product Internal ID '+prodrecid);
					sorec.setLineItemValue('item','custcol_axib_lineprocessed', sojson.prod[p].line,'T');
				}
				
			}
		}
		
		//6/25/2016 - Subs Enhancement
		//	Go through sojson.subs and create new Subscription records
		if (sojson.subs)
		{
			//For Subscription, Terms in Months value needs tbe derived from Customers Renewal Cycle
			var renewalCycleMaps = {
	    		'1':1,
	    		'2':12,
	    		'3':3,
	    		'4':6
	    	};
			
			//Grab connected customer records renewal cycle
			var custRenewCycle = nlapiLookupField('customer', sorec.getFieldValue('custbody_end_user'), 'custentity_sub_renewal_cycle', false);
			
			//create Subscription records
			for (var s in sojson.subs)
			{
				log('debug','checking line',sorec.getLineItemValue('item', 'custcol_axib_lineprocessed', sojson.subs[s].line));
				//JUST incase it gets reprocess manuall from scheduled script, check to make sure THIS SO line isn't processed
				if (sorec.getLineItemValue('item', 'custcol_axib_lineprocessed', sojson.subs[s].line) != 'T') {
					var subrec = nlapiCreateRecord('customrecord_aesubscription',{recordmode:'dynamic'});
					subrec.setFieldValue('custrecord_aesubs_customer', sojson.enduser);
					subrec.setFieldValue('custrecord_aesubs_item', sojson.subs[s].itemid);
					subrec.setFieldValue('custrecord_aesubs_itemqty', sojson.subs[s].qty);
					subrec.setFieldValue('custrecord_aesubs_itemdesc', sojson.subs[s].desc);
					subrec.setFieldValue('custrecord_aesubs_state', '1'); //Default to Active
					subrec.setFieldValue('custrecord_aesubs_so', sojson.salesorder);
					subrec.setFieldValue('custrecord_aesubs_soentstartdt', sojson.subs[s].revrecstart);
					subrec.setFieldValue('custrecord_aesubs_soentenddt', sojson.subs[s].revrecend);
					subrec.setFieldValue('custrecord_aesubs_sotermsmonths', renewalCycleMaps[custRenewCycle]);
					subrec.setFieldValue('custrecord_aesubs_monthlyrate', sojson.subs[s].price);
					subrec.setFieldValue('custrecord_aesubs_taxcode', sojson.subs[s].taxcode);
					subrec.setFieldValue('custrecord_aesubs_addinfo', sojson.subs[s].additionalinfo);
					
					var subrecrecid = nlapiSubmitRecord(subrec, true, true);
					log('audit', 'SO #'+sojson.number,'Processed created Subscription Internal ID '+subrecrecid);
					sorec.setLineItemValue('item', 'custcol_axib_lineprocessed', sojson.subs[s].line,'T');
					
					//TODO: New Use case identified where a Sales order could get approved with RR Start Date on or before 1st of current Month.
					//		Once Brian validates the use case, we need to add in a check to see if we need to create Renewal Invoice Right away.
					//		
					//		Easy way to do this is to call the axib_ss2_subscriptionRenewalInvoiceGen.js Scheduled script
					//			With Following parameters:
					//			custscript_sb118_custcustomer = THIS Customer
					//			custscript_sb118_custexecdate = 1st of THIS Month
					
					
				}
			}
		}
		
		//2. Go through Matinenance JSON and create it
		if (sojson.maint) {
			//create maint records
			for (var m in sojson.maint) {
				
				log('debug','checking line',sorec.getLineItemValue('item', 'custcol_axib_lineprocessed', sojson.maint[m].line));
				//JUST incase it gets reprocess manuall from scheduled script, check to make sure THIS SO line isn't processed
				if (sorec.getLineItemValue('item', 'custcol_axib_lineprocessed', sojson.maint[m].line) != 'T') {
					var maintrec = nlapiCreateRecord('customrecord_aemaint',{recordmode:'dynamic'});
					maintrec.setFieldValue('custrecord_aemaint_customer', sojson.enduser);
					maintrec.setFieldValue('custrecord_aemaint_item', sojson.maint[m].itemid);
					maintrec.setFieldValue('custrecord_aemaint_itemqty', sojson.maint[m].qty);
					maintrec.setFieldValue('custrecord_aemaint_itemdesc', sojson.maint[m].desc);
					maintrec.setFieldValue('custrecord_aemaint_state', '1'); //Default to Active
					maintrec.setFieldValue('custrecord_aemaint_so', sojson.salesorder);
					maintrec.setFieldValue('custrecord_aemaint_soentstartdt', sojson.maint[m].revrecstart);
					maintrec.setFieldValue('custrecord_aemaint_soentenddt', sojson.maint[m].revrecend);
					maintrec.setFieldValue('custrecord_aemaint_sotermsmonths', sojson.maint[m].termsinmonths);
					maintrec.setFieldValue('custrecord_aemaint_monthlyrate', sojson.maint[m].price);
					//Add in tax code internal id
					maintrec.setFieldValue('custrecord_aemaint_taxcode', sojson.maint[m].taxcode);
					
					//8/19/2015 - Track Additional Info
					maintrec.setFieldValue('custrecord_aemaint_addinfo', sojson.maint[m].additionalinfo);
					
					var maintrecid = nlapiSubmitRecord(maintrec, true, true);
					log('audit', 'SO #'+sojson.number,'Processed created IB:Maintenance Internal ID '+maintrecid);
					sorec.setLineItemValue('item', 'custcol_axib_lineprocessed', sojson.maint[m].line,'T');
				}
			}
		}
		
		//3. Need to go through and update end user customer record 
		//Calculate Maintenance End Date
		//	Using Maintenance product revenue recognition end date from last sales order with maintenance line item.
		var maintEndDate = '';
		var mflt = [new nlobjSearchFilter('custbody_end_user', null, 'anyof', sojson.enduser),
		            new nlobjSearchFilter('revrecenddate', null, 'isnotempty',''),
		            new nlobjSearchFilter('class','item','anyof',paramMaintClassIds),
		            new nlobjSearchFilter('mainline', null, 'is','F')];
		var mcol = [new nlobjSearchColumn('trandate', null, 'group'),
		            new nlobjSearchColumn('revrecenddate', null, 'group').setSort(true)];
		var mrs = nlapiSearchRecord('salesorder', null, mflt, mcol);
		//if there are result, always take the first record value since result is sorted by revrecenddate in DESC order
		if (mrs && mrs.length > 0) {
			maintEndDate = strTrim(mrs[0].getValue('revrecenddate', null, 'group'));
		}
		log('debug','maint end date', maintEndDate);
		//Look up customer since and renewal paid dates from end user
		var endUserInfo = nlapiLookupField('customer', sojson.enduser, ['custentity_axlms_custsincedate','custentity_axlms_renewalpaidon'], false);
		
		//Customer Since
		//	Using the date of the first sales order with any item.  EXTOL only uses sales orders to create a new customer. ONLY Set if it’s not set
		var customerSinceDate = endUserInfo.custentity_axlms_custsincedate || '';
		if (!customerSinceDate) {
			//Need to find the date of First Sales Order
			var cflt = [new nlobjSearchFilter('custbody_end_user', null, 'anyof', sojson.enduser),
			            new nlobjSearchFilter('mainline', null, 'is','T')];
			var ccol = [new nlobjSearchColumn('trandate').setSort()];
			var crs = nlapiSearchRecord('salesorder', null, cflt, ccol);
			//if there are results, always take the first record value since result is sorted by trandate ASC order
			customerSinceDate = strTrim(crs[0].getValue('trandate'));
		}
		
		//Renewed On
		//	 latest invoice are paid in full with Order Type ({custbody_order_type}) = Renewal, Renewal Manual or Renewal - Automated.
		//	 This process should be handled by UE on Invoice as part of renewal process but it is also triggered here if the field is empty
		//	 In Sandbox this will AWLAYS be Empty since latest refresh did NOT port over system information
		var renewedOnDate = endUserInfo.custentity_axlms_renewalpaidon || '';
		if (!renewedOnDate) {
			var rflt = [new nlobjSearchFilter('custbody_end_user', null, 'anyof', sojson.enduser),
			            new nlobjSearchFilter('custbody_order_type',null,'anyof',['2','6','14']), //Renewal (2), Renewal Manual (6) or Renewal - Automated (14)
			            new nlobjSearchFilter('mainline', null, 'is','T'),
			            new nlobjSearchFilter('field','systemnotes','anyof',['TRANDOC.KSTATUS']),
			            new nlobjSearchFilter('newvalue','systemnotes','is','Paid in Full')];
			
			var rcol = [new nlobjSearchColumn('date', 'systemNotes', 'MAX').setSort(true)];
			var rrs = nlapiSearchRecord('invoice', null, rflt, rcol);
			if (rrs && rrs.length > 0) {
				renewedOnDate = strTrim(rrs[0].getValue('date','systemNotes','MAX'));
				log('debug','renewedondate',renewedOnDate.length);
				if (renewedOnDate) {
					log('debug','renewedOnDate','Is it? '+renewedOnDate);
					//this is coming back as date/time since it's system note. convert it date
					renewedOnDate = nlapiDateToString(nlapiStringToDate(renewedOnDate));
				}
			}
		}
		
		
		log(
			'debug',
			'Execute Order Process About to Update End User ID '+sojson.enduser,
			'Maint. End Date: '+maintEndDate+' // Customer Since: '+customerSinceDate+' // Renewed On Date: '+renewedOnDate
		);
				
		//Run Update on end user record
		var updfld = ['custentity_axlms_maintenddate','custentity_axlms_custsincedate','custentity_axlms_renewalpaidon'];
		var updval = [maintEndDate, customerSinceDate, renewedOnDate];
			
		nlapiSubmitField('customer', sojson.enduser, updfld, updval, false);
		
	} catch (procerr) {
		log('error','Error processing: ', getErrText(procerr)+' :: '+paramJson);
		//SEND OUT detail retry error
		
	}
	
	//Save the Sales Order anyway
	//10/1/2015 - Incase this fails due to record changed error
	//	Go through and make sure all line values' custcol_axib_lineprocessed matches with sorec 
	try
	{
		nlapiSubmitRecord(sorec, true, true);
	}
	catch (updsoerr)
	{
		if (getErrText(updsoerr).indexOf('RCRD_HAS_BEEN_CHANGED') > -1)
		{
			log('error','SO Save Error','Record Changed since Last load of '+sojson.salesorder, 'Resaving value');
			var newsorec = nlapiLoadRecord('salesorder', sojson.salesorder, {recordmode:'dynamic'});
			var linecnt = newsorec.getLineItemCount('item');
			for (var i=1; i <= linecnt; i+=1)
			{
				var valFromOld = sorec.getLineItemValue('item','custcol_axib_lineprocessed',i);
				newsorec.setLineItemValue('item', 'custcol_axib_lineprocessed', i,valFromOld);
			}
			
			//try saving again
			nlapiSubmitRecord(newsorec, true, true);
		}
	}
	
}
