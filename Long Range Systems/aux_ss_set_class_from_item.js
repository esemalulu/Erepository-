/**
 * Scheduled Script that will run through list of ALL transactions of type Opprtnty, Estimate, SalesOrd, CustInvc, PurchOrd, VendorBill 
 * with date of 1/1/2012 and on to set Class value from each line item.
 * - Those line item that already have value set for class will STILL be updated from Item
 * 
 */

var SCT_EXIT_LEVEL = 1000;
var ctx = nlapiGetContext();
var LAST_PROC_TRX_PARAM = 'custscript_last_proc_trx_id';
var lastProcessedTrxId = '';

var counter = 1;
var rsltSet = null;


var errorSubject = '';
var errorMsg = '';
/**
 * Javascript prototype extension to simulate List.contains method
 * @param {Object} arg
 * Usage:
 * arrayObject.contains(value to search in arrayObject)
 */
Array.prototype.contains = function(arg) {
	for (i in this) {
		if (this[i]==arg) return true;
	}
	return false;
};

function massUpdateClassOnLine() {
	
	//get any script parameter
	lastProcessedTrxId = ctx.getSetting('SCRIPT',LAST_PROC_TRX_PARAM);
	
	//define search
	var flt = [new nlobjSearchFilter('type',null,'anyof',['Opprtnty','Estimate','SalesOrd','CustInvc','PurchOrd','VendBill']),
	           new nlobjSearchFilter('trandate',null,'onorafter','1/1/2012'),
	           new nlobjSearchFilter('mainline',null,'is','T'),
	           new nlobjSearchFilter('memorized',null,'is','F')];
	//besure to return the results ordered by Internalid in descending order
	var col = [new nlobjSearchColumn('internalid').setSort(true)]; 
	
	//check to see if last processed id is present.
	if (lastProcessedTrxId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedTrxId));
	}
	
	//using create search to get more than 1000 results
	rsltSet = nlapiCreateSearch('transaction',flt,col).runSearch();
	
	rsltSet.forEachResult(processResultRow);
	
}

function processResultRow(row) {
	
	try {
		
		//to gain access to ALL Items, you need to load the record
		var trxRec = nlapiLoadRecord(row.getRecordType(),row.getValue('internalid'));
		
		//nlapiLogExecution('debug','Trx internal ID',row.getValue('internalid'));
		
		var itemCount = trxRec.getLineItemCount('item');
		var itemJson = {};
		
		//do this ONLY when there are items to process
		if (itemCount > 0) {
			buildItemClassJson(trxRec, itemJson, itemCount);
			
			for (var i=1; i <= itemCount; i++) {
				
				var itmtype = trxRec.getLineItemValue('item','itemtype',i);
				var currentLineItemClass = trxRec.getLineItemValue('item','class',i);
				
				if (itmtype != 'Description' && !currentLineItemClass) {
					
					var itmClass = itemJson[trxRec.getLineItemValue('item','item',i)];
					if (!itmClass) {
						itmClass='';
					}
					
					//nlapiLogExecution('debug','Updating itmtype // Updating to itmClass // Internal ID // Line Number',itmtype+' // '+itmClass+' // '+trxRec.getId()+' // '+i);
					
					trxRec.selectLineItem('item',i);
					trxRec.setCurrentLineItemValue('item','class',itmClass);
					trxRec.commitLineItem('item');
				}
			}
			
			try {
				nlapiSubmitRecord(trxRec, false, true);
			} catch (trxSubmitError) {
				//when error occurs send a notice to shane and myself 
				errorSubject = 'Error occured while saving transaction';
				errorMsg = 'Script File: aux_ss_set_class_from_item.js<br/><br/>'+
						   'Transaction Internal ID: '+trxRec.getId()+'<br/>'+
						   'Transaction Record Type: '+row.getRecordType()+'<br/>'+
						   'Error Message:<br/>'+
						   getErrText(trxSubmitError);
				
				nlapiSendEmail(-5, 'SCox@lrstech.net,joe.son@audaxium.com', errorSubject, errorMsg);
				
				//log it and continue
				nlapiLogExecution('error','Error Saving Transaction','Error occured while Saving Transaction type: '+row.getRecordType()+' Internal ID: '+row.getValue('internalid')+' = '+getErrText(trxSubmitError));
			}
		}
		
		//check to see if we are running out of governance
		if (ctx.getRemainingUsage() <= SCT_EXIT_LEVEL &&  rsltSet.getResults(counter, (counter+2)).length > 0) {
			nlapiLogExecution('debug','Running low on goverance','Need to Reschedule - Rescheduling At Index: '+counter+' Internal ID of transaction: '+row.getId());
			
			var param = new Array();
			param[LAST_PROC_TRX_PARAM] = row.getValue('internalid');

			var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
			if (schStatus == 'QUEUED') {
				return false;
			}
		}
		
		counter++;
		
		//For Week night run.
		//if (counter == 3) {
		//	return false;
		//}
	
		return true; //continue iterating through ResultSet
	} catch (e) {
		//throw custom exception and stop processing
		errorSubject = 'Error occured while Processing Transaction Line Class Update';
		errorMsg = 'Script File: aux_ss_set_class_from_item.js<br/><br/>'+
				   'Script was terminated due to this error<br/>'+
				   'Transaction Internal ID: '+row.getId()+'<br/>'+
				   'Transaction Record Type: '+row.getRecordType()+'<br/>'+
				   'Error Message:<br/>'+
				   getErrText(e);
			
		nlapiSendEmail(-5, 'SCox@lrstech.net,joe.son@audaxium.com', errorSubject, errorMsg);
			
		throw nlapiCreateError('TRX00001-Error Processing Transaction','Error occured while processing Transaction type: '+row.getRecordType()+' Internal ID: '+row.getValue('internalid')+' = '+getErrText(e));
		
		return false;
	}
}

/**
 * Translates Error into standarized text.
 * @param {Object} _e
 */
function getErrText(_e) {
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

function buildItemClassJson(_rec, _json, _itemcount) {
	//1. First loop through all items to get class for each item in the line
	//   - Build list of item array and run search ONCE per transaction.
	//   - We can do nlapiLookupField using itemtype but this is very inefficient if transaction have over 100 line items
	var uniqueItemId = new Array();
	for (var i=1; i <= _itemcount; i++) {
		var itemid = _rec.getLineItemValue('item','item',i);
		if (!uniqueItemId.contains(itemid)) {
			uniqueItemId.push(itemid);
		}
	}
	
	var flt = [new nlobjSearchFilter('internalid',null,'anyof',uniqueItemId)];
	var col = [new nlobjSearchColumn('internalid'),
	           new nlobjSearchColumn('class')];
	var rslt = nlapiSearchRecord('item',null,flt,col);
	for (var j=0; rslt && j < rslt.length; j++) {
		_json[rslt[j].getValue('internalid')] = rslt[j].getValue('class');
	}
}
