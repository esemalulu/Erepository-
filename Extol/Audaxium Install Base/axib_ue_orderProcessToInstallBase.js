/**
 * Sales order user event is triggered when SO has SO VP Approved checked for the first time and
 * line item contains item with class of Class = Software or Class = Maintenance.
 * List of CLASS IDs are passed in as comma separated list of Internal IDs passed in as Company Level Setting
 * Software class will be stored in Product while Maintenance class will be stored in Maintenance record
 * @param type
 */

//Company Level Preference
var paramSoftwareClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibsoftclassids'),
	paramMaintClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibmaintclassids'),
	//Added 6/25/2016 - Subscription Enhancement
	paramSubsClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_104_axibsubsclassids'),
	paramPrimaryErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibprimeerr');

//NEED TO Create Process Notifers

var paramCcErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_104_axibccerr');
if (paramCcErrorNotifier) {
	paramCcErrorNotifier = paramCcErrorNotifier.split(',');
} else {
	paramCcErrorNotifier = null; 
}

/**
 * Before Load Function trigger
 * @param type
 * @param form
 * @param request
 */
function ibSoBeforeLoad(type, form, request) {
	//Make sure to disable the VP APPROVED checkbox if already approved
	if (nlapiGetContext().getExecutionContext() == 'userinterface' && nlapiGetFieldValue('custbody21') == 'T') {
		if (nlapiGetContext().getRole()!='3') {
			//for testing open it up for Admins
			form.getField('custbody21').setDisplayType('disabled');
		}		
	}
}

/**
 * After Submit Function Trigger
 * @param type
 */
function ibSoAfterSubmit(type) 
{

	//Return out if type is delete of xedit or copy
	
	//6/28/2016 - Adding approve action.
	//	There is workflow that triggers on approve to check the VP approved checkbox.
	//	Adding approve so that it can be handled.
	//	Script will continue to look for VP approve being checked.
	
	if (type!='create' && type!='edit' && type!='approve')
	{
		log('debug',type+' is not supported','Unsupported action to trigger AXInstall Base');
		return;
	}
	
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
	
	log('debug','classes',paramSoftwareClassIds+' // '+paramMaintClassIds+' // '+paramSubsClassIds);
	
	//Need to check to see if this is the first time VP is approving SO
	//SO VP Approved: custbody_ax_sovp_approved (Sandbox) // custbody21 (Production)
	var oldRec = nlapiGetOldRecord();
	var newRec = nlapiGetNewRecord();
	if (newRec.getFieldValue('custbody21')=='T' && (!oldRec || (oldRec && oldRec.getFieldValue('custbody21') != 'T'))) 
	{
		//Let's check to make sure line items contain software class items
		//6/25/2016 - Subs Enhancement 
		//	Add check for Subscription Class list.
		if (paramSoftwareClassIds.length <= 0 || paramMaintClassIds.length <= 0 || paramSubsClassIds.length <=0) {
			log('error','No Software, Maintenance and/or Subscription Class Defined', 'SO Number '+newRec.getFieldValue('tranid')+' May NOT be processed. Company Level preference may not have been set');
			return;
		}
		
		//Build JSON object of Line Items to build
		//9/2/2016
		// Change the process so that if it does NOT have Prod, Maint and Subs,
		// Don't queue it up at all!
		var hasProd = false,
			hasMaint = false,
			hasSubs = false;
		
		var linej = {
			'enduser':newRec.getFieldValue('custbody_end_user'),
			'salesorder':newRec.getId(),
			'number':newRec.getFieldValue('tranid'),
			'startdate':newRec.getFieldValue('startdate'),
			'contractnumber':newRec.getFieldValue('custbody2'),
			'memo':newRec.getFieldValue('memo'),
			'prod':{},
			'maint':{},
			//6/25/2016 - Subs Enhancement 
			'subs':{}
		};
		
		var lineCount = newRec.getLineItemCount('item');
		log('debug','line count',lineCount);
		
		//Do a first swip to grab list of Kit items
		var arKitItems = [];
		var arKitElement = {};
		for (var k=1; k <= lineCount; k++) {
			//log('debug','line type',newRec.getLineItemValue('item','itemtype',k));
			if (newRec.getLineItemValue('item','itemtype',k)=='Kit' && !arKitItems.contains(newRec.getLineItemValue('item','item',k))) {
				arKitItems.push(newRec.getLineItemValue('item','item',k));
			}
		}
		//log('debug','size of kit item',arKitItems.length);
		if (arKitItems.length > 0) {
			//execute saved search to grab list of all member item list and add it to description for that ITEM
			var memflt = [new nlobjSearchFilter('internalid', null, 'anyof', arKitItems)];
			var memcol = [new nlobjSearchColumn('internalid').setSort(true),
			              new nlobjSearchColumn('memberitem')];
			var memrs = nlapiSearchRecord('item', null, memflt, memcol);
			for (var m=0; memrs && m < memrs.length; m++) {
				//log('debug','member length',memrs.length);
				var mitemid = memrs[m].getValue('internalid');
				var memitemtext = memrs[m].getText('memberitem');
				if (!arKitElement[mitemid]) {
					arKitElement[mitemid] = memitemtext;
				} else {
					arKitElement[mitemid] += memitemtext+',';
				}
			}
		}
		
		log('debug','arKitElement',JSON.stringify(arKitElement));
		
		for (var i=1; i <= lineCount; i++) {
			//loop through and check to see if line contains class of Software class
			var itemClass = newRec.getLineItemValue('item', 'class', i);
			var itemid = newRec.getLineItemValue('item','item',i);
			var itemqty = newRec.getLineItemValue('item','quantity',i);
			var itemdesc = newRec.getLineItemValue('item','description',i);
			if (arKitElement[itemid]) {
				itemdesc += ' '+arKitElement[itemid];
			}
			var itemExtolNote = newRec.getLineItemValue('item','custcol1',i);
			var itemRevRecStart = newRec.getLineItemValue('item','revrecstartdate',i);
			var itemRevRecEnd = newRec.getLineItemValue('item','revrecenddate',i);
			var itemTermsInMonths = newRec.getLineItemValue('item','revrecterminmonths',i);
			var itemPrice = newRec.getLineItemValue('item','custcol_list_rate',i);
			//Make sure we don't reprocess what's already been processed by THIS trigger
			var itemLIneProcessed = newRec.getLineItemValue('item','custcol_axib_lineprocessed',i);
			
			//8/19/2015 - request to grab additional info
			var itemAdditionalInfo = newRec.getLineItemValue('item','custcol_aib_addinfo',i) || '';
			
			if (paramSoftwareClassIds.contains(itemClass) && itemLIneProcessed!='T') 
			{
				//9/2/2016
				//Set hasProd to true
				hasProd = true;
				
				linej.prod[itemid+'-'+i]={
					'line':i,
					'itemid':itemid,
					'qty':itemqty,
					'class':itemClass,
					'desc':itemdesc,
					'extolnote':itemExtolNote,
					'additionalinfo':itemAdditionalInfo
				};
			} 
			else if (paramMaintClassIds.contains(itemClass) && itemLIneProcessed!='T') 
			{
				var lineTaxCode = newRec.getLineItemValue('item','taxcode',i);
				
				//9/2/2016
				//Set hasMaint to true
				hasMaint = true;
				
				linej.maint[itemid+'-'+i]={
					'line':i,
					'itemid':itemid,
					'qty':itemqty,
					'desc':itemdesc,
					'class':itemClass,
					'revrecstart':itemRevRecStart,
					'revrecend':itemRevRecEnd,
					'termsinmonths':itemTermsInMonths,
					'price':itemPrice,
					'taxcode':lineTaxCode,
					'additionalinfo':itemAdditionalInfo
				};
			}
			//6/25/2016 - Subs Enhancement 
			//	Add check for Subscription Class and add to subs json element
			else if (paramSubsClassIds.contains(itemClass) && itemLIneProcessed!='T') 
			{
				var lineTaxCode = newRec.getLineItemValue('item','taxcode',i);
				
				//9/2/2016
				//Set hasSubs to true
				hasSubs = true;
				
				
				linej.subs[itemid+'-'+i]={
					'line':i,
					'itemid':itemid,
					'qty':itemqty,
					'desc':itemdesc,
					'class':itemClass,
					'revrecstart':itemRevRecStart,
					'revrecend':itemRevRecEnd,
					'termsinmonths':itemTermsInMonths,
					'price':itemPrice,
					'taxcode':lineTaxCode,
					'additionalinfo':itemAdditionalInfo
				};
			}
		}
		
		//9/2/2016 
		//	Return out if SO does NOT have Prod, Maint and Subs items
		if (!hasProd && !hasMaint && !hasSubs)
		{
			log('audit', 'Skip Processing SO, No Prod, Maint and Subs Items found', JSON.stringify(linej));
			
			return;
		}
		
		//Core processing is handled by scheduled script (unscheduled with multiple deployments) due to complex logic it must run along with record creation.
		//THis is to NOT affect the user interaction performance
		var queuestatus = nlapiScheduleScript('customscript_axib_execorderproc', null, {'custscript_sb105_procjson':JSON.stringify(linej)});
		if (queuestatus != 'QUEUED') {
			//notify current user
			var errSendTo = nlapiGetContext().getUser();
			nlapiSendEmail(
				-5, 
				errSendTo, 
				'Error Queuing up Install Base Execution of Order Processing.', 
				'Queue Status returned was '+queuestatus+'<br/><br/>'+
				'Below Sales Order info Failed to get queued up: <br/><br/>'+JSON.stringify(linej), 
				paramCcErrorNotifier, 
				null, 
				null, 
				null,
				true
			);
			
			log(
				'error',
				'Error Queuing up Install Base Execution of Order Processing', 
				'Queue Status: '+queuestatus+' // Below Sales Order info Failed to get queued up: <br/><br/>'+JSON.stringify(linej)
			);
		}
		
		log('debug','obj',JSON.stringify(linej));
	}
}