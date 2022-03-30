/**
 * Sales order user event is triggered when SO is Approved and
 * line item contains item with class of Class = Subscription Manager.
 * List of CLASS IDs are passed in as comma separated list of Internal IDs passed in as Company Level Setting
 * @param type
 */

//Company Level Preference
var paramSubsMgrClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_64_subsmgrclassids');
var paramPrimaryErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_64_subsmgrprimeerr');
var paramDaysBeforeEndDate = nlapiGetContext().getSetting('SCRIPT', 'custscript_64_daysbeforeend');
/**
 * After Submit Function Trigger
 * @param type
 */
function subMgrSoAfterSubmit(type) {

	//Return out if type is delete of xedit or copy
	if (type!='approve')
	{
		log('debug',type+' is not supported','Unsupported action to trigger Subscription Manager process');
		return;
	}
	
	//Grab and build software class IDs
	if (paramSubsMgrClassIds) {
		paramSubsMgrClassIds = paramSubsMgrClassIds.split(',');
		
		if (paramSubsMgrClassIds.length == 0)
		{
			//9/18/2015 - Log Error and RETURN OUT without Processing
			nlapiSendEmail(-5, 
						   paramPrimaryErrorNotifier, 
						   'Unable to process Sub. Mgr for So Number '+nlapiGetFieldValue('tranid'), 
						   'Missing Item Class ID(s) to process. This is set under Company > Setup > General Preferences > Custom Preference Tab'
						   );
			
			//Log It
			log('error','SUBMGRERR', 'SO Number '+nlapiGetFieldValue('tranid')+' Missing Item Class ID(s) to process');
			return;
		}
	}
	
	log('debug','classes',paramSubsMgrClassIds);
	
	try
	{
		var newRec = nlapiGetNewRecord();
		//Build JSON object of Line Items to build
		var linej = {
			'salesorder':newRec.getId(),
			'number':newRec.getFieldValue('tranid'),
			'otherrefnum':newRec.getFieldValue('otherrefnum'),
			'terms':newRec.getFieldValue('terms'),
			'opportunity':(newRec.getFieldValue('opportunity')?newRec.getFieldValue('opportunity'):''),
			'opptitle':'',
			'itemclass':{},
			'items':{}
		};
		
		if (linej.opportunity)
		{
			linej.opptitle = nlapiLookupField('opportunity', linej.opportunity, 'title', false);
		}
		
		var lineCount = newRec.getLineItemCount('item');
		log('debug','line count',lineCount);
		
		//grab all Items and look up class for each unique items
		var itemIds = [];
		for (var i=1; i <= lineCount; i++) {
			if (!itemIds.contains(newRec.getLineItemValue('item','item',i)))
			{
				itemIds.push(newRec.getLineItemValue('item','item',i));
			}
		}
		
		//Do one search against Item to find all class values for each items.
		//This is because item class may not be sourced on the sales order.
		var itemFlt = [new nlobjSearchFilter('internalid', null, 'anyof', itemIds)];
		var itemCol = [new nlobjSearchColumn('internalid'),
		               new nlobjSearchColumn('class')];
		var itemRs = nlapiSearchRecord('item', null, itemFlt, itemCol);
		for (var c=0; c < itemRs.length; c+=1)
		{
			linej.itemclass[itemRs[c].getValue('internalid')] = itemRs[c].getValue('class');
		}
		
		for (var i=1; i <= lineCount; i++) {
			//loop through and check to see if line contains Subscription Manager class

			//Make sure class match before continuing
			var lineItemId = newRec.getLineItemValue('item', 'item', i);
			if (!paramSubsMgrClassIds.contains(linej.itemclass[lineItemId]))
			{
				continue;
			}
			
			linej.items[newRec.getLineItemValue('item','item',i)+'-'+i]={
				'line':i,
				'itemid':newRec.getLineItemValue('item','item',i),
				'itemname':newRec.getLineItemText('item','item',i),
				'qty':newRec.getLineItemValue('item','quantity',i),
				'desc':newRec.getLineItemValue('item','description',i),
				'revrecstart':newRec.getLineItemValue('item','revrecstartdate',i),
				'revrecend':newRec.getLineItemValue('item','revrecenddate',i),
				'termsinmonths':newRec.getLineItemValue('item','revrecterminmonths',i),
				'rate':newRec.getLineItemValue('item','rate',i),
				'amount':newRec.getLineItemValue('item','amount',i),
				'assetid':(newRec.getLineItemValue('item','custcol_assetid',i)?newRec.getLineItemValue('item','custcol_assetid',i):''),
				'billingschedule':newRec.getLineItemValue('item','billingschedule', i)
			};
		}
			
		//Core processing is handled by scheduled script (unscheduled with multiple deployments) due to complex logic it must run along with record creation.
		//THis is to NOT affect the user interaction performance
		var queuestatus = nlapiScheduleScript('customscript_ax_ss_subsmanager_procqso', null, {'custscript_65_procjson':JSON.stringify(linej)});
		log('debug','Queue Status: '+queuestatus,nlapiGetRecordId()+' // '+JSON.stringify(linej));
	}
	catch (submgrprocerr)
	{
		//9/18/2015 - Log Error
		nlapiSendEmail(-5, 
					   paramPrimaryErrorNotifier, 
					   'Unable to process Sub. Mgr for So Number '+nlapiGetFieldValue('tranid'), 
					   'Error was thrown while attempting to process SO for Sub. Mgr. Process:<br/><br/>'+
					   getErrText(submgrprocerr)
					   );
		
		//Log It
		log('error',
			'SO Number '+nlapiGetFieldValue('tranid'), 
			'Error was thrown while attempting to process SO for Sub. Mgr. Process:<br/><br/>'+getErrText(submgrprocerr)
		);
	}
	
}