/**
 * Author: joe.son@audaxium.com
 * Date: 3/1/2012
 * Description:
 * - Goes through list of Opportunities, Quotes, Sales Orders, Invoices, PO’s, and Bills
 *  to fill in each lines' dept and class from its' item.
 * - Should skip those items that does NOT have dept and class set at the item level.
 * - Skip those items that may require Location data.
 * Note on Scheduled Script:
 * Scheduled script should ALWAYS have parameter called "Last Processed Internal ID"
 * - Search SHOULD always be ordered by Internal ID in descending order.
 * - When lastProcessedId is not null and it is of type Number, Additional search filter should be added
 * EXCEPTION to the Last Processed Internal ID rule is when scheduled script IS running based on
 *   - Pre determined exit flag on a record or TIME based execution
 * 
 */

//each scheduled script MUST have script parameter called Last Processed Internal ID.
//ID of last proessed internal id is defined in CMWL_Constants.js
var SCRIPT_PARAM_PROC_INTERNALID='custscript_trxlast_processed_id';
var lastProcessedId = '';
var EXIT_COUNT=1000;
var MAIN_SEARCH_ID='customsearch_oppqtesopobill_search'; //Saved Search only visible to administrators
var ctx = nlapiGetContext();
var iobj;

var csvHeader = 'Skipped Transaction InternalID, Skipped Transaction Type, Skipped Transaction #, Skipped Error Msg\n';
var csvBody = '';
var csvSendTo = 'joe.son@audaxium.com';

//main function
function CorrectTrx() {
	var rescheduled=false;
	try {
		initScriptParam();
		log('DEBUG','Last Processed ID',lastProcessedId);
		var rslt = getMainSearch();
		if (rslt && rslt.length > 0) {
			//begin executing scheduled script
			log('DEBUG','Result Size',rslt.length);
			//rslt.length
			for (var i=0; i <rslt.length; i++) {
				
				objectizeRowData(rslt[i]);
				
				processTransaction();
				
				//Reschedule when it runs out of gov.
				if (verifyMeter(i,rslt, EXIT_COUNT)) {
					rescheduled=true;
					sendCsv(i);
					break;
				}
			}
			
			if (!rescheduled) {
				//if this is the end of iteration, send out the csv file
				sendCsv(0);
			}
		}
	} catch (e) {
		log('ERROR','Runtime Error',getErrText(e));
	}
}

function sendCsv(_index) {
	//generate skipped csv files and send to Audaxium
	if (!csvBody) {
		return;
	}
	
	var fileName = 'SkippedInvoices'+_index+'.csv';
	var fileObj = nlapiCreateFile(fileName,'CSV',csvHeader+csvBody);
	var attachment = new Array();
	attachment.push(fileObj);
	nlapiSendEmail('-5', csvSendTo, 'Skipped Invoices', 'Need to update manuall', null, null, null, attachment);
	
}

function processTransaction() {
	var trx = nlapiLoadRecord(iobj.rectype,iobj.id);
	try {
		//load the trx record for processing.
		
		var itmcnt = trx.getLineItemCount('item'); //get total count of this Invoices' line items
		var updtrx = false;
		log('DEBUG',iobj.rectype+': '+iobj.id,'Item Count: '+itmcnt);
		for (var i=1; i<=itmcnt; i++) {
			//objectize each line item for each of use 
			var itmobj = new Object();
			itmobj.dept = trx.getLineItemValue('item','department',i);
			itmobj.liclass = trx.getLineItemValue('item','class',i);
			itmobj.item = trx.getLineItemValue('item','item',i);
			itmobj.itmtype = trx.getLineItemValue('item','itemtype',i);
			itmobj.linenum = i;
			itmobj.trx = trx;
			
			log('DEBUG','Item Type',itmobj.itmtype);
			
			//if existing dept or class is empty or null, look up values.
			//ignore Description item type to avoid unnecessary processing
			if (itmobj.itmtype!='Description' && (!itmobj.dept || !itmobj.liclass)) {
				//set the flag to submit this record after changing line items.
				if(!updtrx) {
					updtrx = true;
				}
				modifyItemLine(itmobj);
			} else {
				log('DEBUG','Description Item. Skip to next','');
			}
		}
		
		//check to see if we need to update the trx (submit the record)
		if (updtrx) {
			log('DEBUG','Line Items Updated','Save Record and Commit the changes');
			nlapiSubmitRecord(trx);
			
		} else {
			log('DEBUG','All Items set with Dept/Class','No need to update this Invoice');
		}	
	} catch (e) {
		//when error occurs log it on the csv file and proceed to next
		csvBody+= trx.getId()+','+iobj.rectype+','+trx.getFieldValue('tranid')+','+getErrText(e)+'\n';
		log('ERROR','Error occured',getErrText(e));
	}
	
}

/**
 * 
 * @param itmobj
 */
function modifyItemLine(itmobj) {
	log('DEBUG','Exec modifyItemLine(itmobj) '+iobj.rectype+' Item/dept/class/itemType',itmobj.item+'//'+itmobj.dept+'//'+itmobj.liclass+'//'+itmobj.itmtype);
	
	queryItemForDeptAndClass(itmobj);
	
	//if Item doesn't have dept and class set. Do additional search on Linked Transaction
	if (!itmobj.itmdept && !itmobj.itmclass) {
		//set line item values
		log('DEBUG','Search Linked Transaction for Dept/Class','');
		queryLinkedTransForDeptAndClass(itmobj);
		
	}
	setLineValues(itmobj);
	
}

function setLineValues(itmobj) {
	var deptVal = (itmobj.itmdept)?itmobj.itmdept:itmobj.trandept;
	var classVal = (itmobj.itmclass)?itmobj.itmclass:itmobj.tranclass;
	
	log('DEBUG','itm//tran dept',itmobj.itmdept+' // '+itmobj.trandept);
	log('DEBUG','itm//tran class',itmobj.itmclass+' // '+itmobj.tranclass);
	log('DEBUG','deptVal//classVal',deptVal+' // '+classVal);
	
	//if trx item is missing dept AND replacement value is FOUND
	if (!itmobj.dept && deptVal) {
		log('DEBUG','Setting Dept','At line #'+itmobj.linenum);
		itmobj.trx.setLineItemValue('item','department',itmobj.linenum,deptVal);
	}
	
	if (!itmobj.liclass && classVal) {
		log('DEBUG','Setting Class','At line #'+itmobj.linenum);
		itmobj.trx.setLineItemValue('item','class',itmobj.linenum,classVal);
	}
	
	//log('DEBUG','Get Line item Values: ',itmobj.trx.getLineItemValue('item','department',itmobj.linenum));
}

/**
 * runs look up on THIS item record to find dept/class designation
 * @param itmobj
 */
function queryItemForDeptAndClass(itmobj) {
	var flt = [new nlobjSearchFilter('internalid',null,'anyof',itmobj.item)];
	var col = [new nlobjSearchColumn('department'), new nlobjSearchColumn('class')];
	var rslt = nlapiSearchRecord('item',null,flt,col);
	itmobj.itmdept = rslt[0].getValue('department');
	itmobj.itmclass = rslt[0].getValue('class');
	log('DEBUG','Item dept/class lookup',itmobj.itmdept+' // '+itmobj.itmclass);
}


/**
 * runs look up on linked transactions (createdfrom) to find THIS items' dept/class designation
 * @param itmobj
 */
function queryLinkedTransForDeptAndClass(itmobj) {
	if (!iobj.cfrom) {
		log('DEBUG','Linked Trax is Null or Empty','Skip Linked Look up');
		return;
	}
	//do search of the linked transaction internal ID to get transaction record type
	var flt = [new nlobjSearchFilter('internalid',null,'anyof',iobj.cfrom)];
	var col = [new nlobjSearchColumn('internalid')];
	var rslt = nlapiSearchRecord('transaction',null,flt,col);
	var linkedtx = nlapiLoadRecord(rslt[0].getRecordType(),iobj.cfrom);
	//Find out the line number of item on this transaction.
	var itemLine = linkedtx.findLineItemValue('item','item',itmobj.item);
	log('DEBUG','Transaction Type',rslt[0].getRecordType()+' // Item found on line#'+itemLine);
	
	itmobj.trandept = '';
	itmobj.tranclass = '';
	if(itemLine > -1) {
		itmobj.trandept = linkedtx.getLineItemValue('item','department',itemLine);
		itmobj.tranclass = linkedtx.getLineItemValue('item','class',itemLine);
	}
	
	log('DEBUG','Linked Trax dept/class',itmobj.trandept+' // '+itmobj.tranclass);
}

/**
 * Objectize row data for easy access.
 */
function objectizeRowData(_row) {
	iobj = new Object();
	iobj.id = _row.getValue('internalid');
	iobj.cfrom = _row.getValue('createdfrom');
	iobj.rectype = _row.getRecordType();
}

function getParam(_rsltrow) {
	var param = new Array();
	param[SCRIPT_PARAM_PROC_INTERNALID] = _rsltrow.getValue('internalid');
	//ADD additional paramter. last processed internal ID is automatically added
	
	return param;
}

function verifyMeter(_curArrayIndex, _rslt, _exitCnt) {
	log('DEBUG','Usage Meter','-------------------------'+ctx.getRemainingUsage()+'---------------------------');
	if (ctx.getRemainingUsage() <=_exitCnt && (_curArrayIndex+1) < _rslt.length) {
		var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), getParam(_rslt[_curArrayIndex]));
		if (schStatus=='QUEUED') {
			return true;
		}
	} else {
		return false;
	}
}

function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}

function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}
	return strGlobalReplace(txt,"\\,","_");
}

function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}

/**
 * Search items
 */
function getMainSearch() {
	var flt=null;
	if (lastProcessedId && !isNaN(parseInt(lastProcessedId))) {
		flt = new Array();
		//add in additional filter option to reduce the result set: where internalID < last processed
		flt[0] = new nlobjSearchFilter('internalidnumber',null,'lessthan',lastProcessedId);
	}
	return nlapiSearchRecord('transaction', MAIN_SEARCH_ID, flt,null);
}

/**
 * sets up script parameter if any.
 */
function initScriptParam() {
	lastProcessedId = ctx.getSetting('SCRIPT',SCRIPT_PARAM_PROC_INTERNALID);
}
