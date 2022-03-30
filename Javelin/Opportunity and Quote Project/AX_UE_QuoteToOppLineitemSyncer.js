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

/**
 * Create and place Sync Up with Opportunity checkbox 
 * if opportunity field is filled.
 */
function EstimateUserEventBeforeLoad(type, form, request){

	if ((type == 'edit'  || type=='create') && nlapiGetFieldValue('opportunity')) {
		var syncCheckBox = form.addField('custpage_syncwithopp', 'checkbox','Sync Lineitems with Opportunity: ', null, null);
		form.insertField(syncCheckBox, 'customform');
	}
	
	//Add button to generate Printable Quote
	if (type == 'view' && nlapiGetRecordType()=='estimate') {
		var pdfgenUrl = nlapiResolveURL('SUITELET',
									'customscript_ax_sl_custom_quotepdf_gen',
									'customdeploy_ax_sl_custom_quotepdf_gen')+'&custparam_quoteid='+nlapiGetRecordId();

		//add a button to the quote record
		form.addButton('custpage_btn_pdfgen',
					   'Generate Custom Quote PDF',
					   'window.open(\''+pdfgenUrl+'\', \'\', \'width=1000,height=600,resizable=yes,scrollbars=yes\');return true;');
	}
}

function EstimateUserEventAfterSubmit(type){
	if (nlapiGetFieldValue('custpage_syncwithopp')=='T') {
		//1 load linked opportunity and quote record
		var oppRec = nlapiLoadRecord('opportunity', nlapiGetFieldValue('opportunity'),{recordmode:'dynamic'});
		var quoteRec = nlapiGetNewRecord();
		
		//2. grab all item columns from quote record
		var oppItemCols = oppRec.getAllLineItemFields('item');
		
		//3. clear out Opp line items
		var oppLineCnt = oppRec.getLineItemCount('item');
		
		for (var i=oppLineCnt; i >= 1 ; i--) {
			oppRec.removeLineItem('item', i);
		}
		
		//4. Loop through each line on quote and add to opportunity
		
		//Mod: Sync ONLY fields defined on the array
		//Mod: 8/20/2014 - Adding Department and Class as part of sync process to make sure it works incase one or more of fields become required
		var syncFields = ['item', 'quantity', 'units', 'description', 'price', 'rate', 'amount','department','class'];
		
		var quoteLineCnt = quoteRec.getLineItemCount('item');
		for (var q=1; q <= quoteLineCnt; q++) {
			if (quoteRec.getLineItemValue('item', 'item', q) == '0') {
				log('debug','skipping item on line '+q+' to opp', quoteRec.getLineItemValue('item', 'item', q));
				continue;
			}
			log('debug','adding item on line '+q+' to opp', quoteRec.getLineItemValue('item', 'item', q));
			oppRec.selectNewLineItem('item');
			for (var oc=0; oc < syncFields.length; oc++) {
				//add each opp columns value from quote
				
				//if (quoteRec.getLineItemValue('item', syncFields[oc], q)) {
					log('debug','adding', syncFields[oc]+' // item col '+quoteRec.getLineItemValue('item', syncFields[oc], q)+' // '+quoteRec.getLineItemText('item', syncFields[oc], q));
					oppRec.setCurrentLineItemValue('item', syncFields[oc], quoteRec.getLineItemValue('item', syncFields[oc], q));
					
				//}				
			}
			
			oppRec.commitLineItem('item');
		}
		
		try {
			nlapiSubmitRecord(oppRec, true, true);
		} catch (oppSyncError) {
			var quoteNum = quoteRec.getFieldValue('tranid');
			var oppTitle = oppRec.getFieldValue('title');
			var oppNum = oppRec.getFieldValue('tranid');
			var errSbj = 'Error Syncing line items from Quote #'+quoteNum+' to Opportunity #'+oppNum+' ('+oppTitle+')';
			var errMsg = 'Following error occured while attempting to sync line items from Quote #'+quoteNum+' to '+
						 'Opportunity #'+oppNum+' ('+oppTitle+'). Please correct issues on Quote record and try again or '+
						 'contact your administrator:<br/><br/>'+
						 getErrText(oppSyncError)+'<br/><br/>'+
						 'Possible reasons:<br/>'+
						 '- Drop down items may have been inactivated<br/>'+
						 '- Value(s) being set maybe invalid';
			
			
			var adminToCc = new Array();
			var empFlt = [new nlobjSearchFilter('giveaccess', null, 'is','T'),
			              new nlobjSearchFilter('role', null, 'anyof','3')];
			var empCol = [new nlobjSearchColumn('email')];
			var empRslt = nlapiSearchRecord('employee', null, empFlt, empCol);
			for (var e=0; empRslt && e < empRslt.length; e++) {
				adminToCc.push(empRslt[e].getValue('email'));
			}
			if (adminToCc.length > 0) {
				adminToCc = null;
			}
			
			//notify user
			//nlapiSendEmail(-5, getCurrentUser(), errSbj, errMsg, adminToCc);
			
			log('error','Error Syncing Quote lines to Opportunity', 'Quote #'+quoteNum+' // Opp #'+oppNum+' // '+getErrText(oppSyncError));
		}
		
	}
}
