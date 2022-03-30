/**
 * Author: joe.son@audaxium.com
 * Date: 12/2/2012
 * Record: estimate
 * Desc:
 * Script fires for beforeLoad and afterSubmit events. BeforeLoad event will place dynamic checkbox 
 * to allow user to sync with linked opportunity record in Edit mode. 
 * 
 * AfterSubmit will attempt to sync line items from quote to opportunity
 */

//Company Level setting that takes comma separated list of email addresses to send error notification emails to as CC
var paramAxSendErrorEmailsTo = nlapiGetContext().getSetting('SCRIPT','custscript_axbqosync_senderr');
//array version of cc emails. 
var arrayCcEmailTo = null;
if (paramAxSendErrorEmailsTo && paramAxSendErrorEmailsTo.length > 0) {
	arrayCcEmailTo = paramAxSendErrorEmailsTo.split(',');
}
//Company Level setting. Value will be used as Label of dynamic field.
var paramAxTriggerLabel = nlapiGetContext().getSetting('SCRIPT','custscript_axbqosync_triglabel');

/**
 * Create and place Sync Up with Opportunity checkbox 
 * if opportunity field is filled.
 */
function EstimateUserEventBeforeLoad(type, form, request){

	if ((type == 'edit'  || type=='create') && nlapiGetRecordType()=='estimate' && nlapiGetFieldValue('opportunity')) {
		var syncCheckBox = form.addField('custpage_axbsyncwithopp', 'checkbox',paramAxTriggerLabel, null, null);
		form.insertField(syncCheckBox, 'customform');
	}
}

function EstimateUserEventAfterSubmit(type){
	
	if (nlapiGetContext().getExecutionContext()!='userinterface')
	{
		return;
	}
	
	if (nlapiGetFieldValue('custpage_axbsyncwithopp')=='T') {
		try {
		
			if (!nlapiGetFieldValue('opportunity'))
			{
				return;
			}
			
			//1 load linked opportunity and quote record
			var oppRec = nlapiLoadRecord('opportunity', nlapiGetFieldValue('opportunity'),{recordmode:'dynamic'});
			//1a. Grab newly add
			var quoteRec = nlapiGetNewRecord();
			
			//2. clear out Opp line items
			var oppLineCnt = oppRec.getLineItemCount('item');
			//Go through and remove all line items on the linked opportunity record
			for (var i=oppLineCnt; i >= 1 ; i--) {
				oppRec.removeLineItem('item', i);
			}
			
			//3. Loop through each line on quote and add to opportunity
			var quoteLineCnt = quoteRec.getLineItemCount('item');
			for (var q=1; q <= quoteLineCnt; q++) {
				/**
				 * Sync specific fields only in dynamic mode:
				 * item, quanityt, units, description, price, rate, amount
				 */
				oppRec.selectNewLineItem('item');
				
				//item
				oppRec.setCurrentLineItemValue('item','item',quoteRec.getLineItemValue('item', 'item', q));
				//quantity
				oppRec.setCurrentLineItemValue('item','quantity',quoteRec.getLineItemValue('item', 'quantity', q));
				//units
				oppRec.setCurrentLineItemText('item','units',quoteRec.getLineItemText('item', 'units', q));
				//description
				oppRec.setCurrentLineItemValue('item','description',quoteRec.getLineItemValue('item', 'description', q));
				//price
				//log('debug','quote line sync price level',quoteRec.getLineItemText('item', 'price', q));
				oppRec.setCurrentLineItemValue('item','price',quoteRec.getLineItemValue('item', 'price', q));
				//rate
				//log('debug','quote line sync rate',quoteRec.getLineItemText('item', 'rate', q));
				oppRec.setCurrentLineItemValue('item','rate',quoteRec.getLineItemValue('item', 'rate', q));
				//amount
				//log('debug','quote line sync amount',quoteRec.getLineItemText('item', 'amount', q));
				oppRec.setCurrentLineItemValue('item','amount',quoteRec.getLineItemValue('item', 'amount', q));
				
				//10/4/2014 - Modified to sync department and class column fields regardless of global requirement
				//department
				oppRec.setCurrentLineItemValue('item','department',quoteRec.getLineItemValue('item', 'department', q));
				//class
				oppRec.setCurrentLineItemValue('item','class',quoteRec.getLineItemValue('item', 'class', q));
				
				
				oppRec.commitLineItem('item');
			}
			
			try {
				nlapiSubmitRecord(oppRec, true, true);
			} catch (oppSyncError) {
				var quoteNum = quoteRec.getFieldValue('tranid');
				//var quoteNum = 'TESTING';
				var oppTitle = oppRec.getFieldValue('title');
				var oppNum = oppRec.getFieldValue('tranid');
				var errSbj = 'Error Syncing line items from Quote #'+quoteNum+' to Opportunity #'+oppNum+' ('+oppTitle+')';
				var errMsg = 'Following error occured while attempting to sync line items from Quote #'+quoteNum+' to '+
							 'Opportunity #'+oppNum+' ('+oppTitle+'). Please correct issues on Quote record and try again or '+
							 'contact your administrator:<br/><br/>'+
							 getAxErrText(oppSyncError)+'<br/><br/>'+
							 'Possible reasons:<br/>'+
							 '- Drop down items may have been inactivated<br/>'+
							 '- Value(s) being set maybe invalid';
				
				
				//notify user
				nlapiSendEmail(-5, paramAxSendErrorEmailsTo, errSbj, errMsg);
				
				nlapiLogExecution('error','Error Saving Opportunity', 'Quote #'+quoteNum+' // Opp #'+oppNum+' // '+getAxErrText(oppSyncError));
			}
			
		} catch (quoteoppsyncerr) {
			var errSbj = 'Unexpected Error Syncing line items from Quote to Opportunity';
			var errMsg = 'Following unexpected error occured while attempting to sync line items from Quote Opportunity<br/><br/> '+
						 getAxErrText(quoteoppsyncerr)+'<br/><br/>';
			
			//notify user
			nlapiSendEmail(-5, nlapiGetContext().getUser(), errSbj, errMsg, arrayCcEmailTo);
			
			nlapiLogExecution('error','Unexpected Error Syncing Quote lines to Opportunity', getAxErrText(quoteoppsyncerr));
		}
	}
}

function getAxErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}	
	return txt;
}
