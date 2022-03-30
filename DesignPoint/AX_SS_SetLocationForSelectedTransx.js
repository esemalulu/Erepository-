/**
 * Author: joe.son@audaxium.com
 * Date: 3/1/2012
 * Description:
 * - Goes through list of transactions returned from saved search
 *  to fill in Mainline Location based on client provided logic:
 *  	* INVOICE + SALES ORDER
 *  	- Set Location based on SHIP TO Address
 *  		- NO Ship to address = SKIP
 *  		- No Match for Ship to State = SKIP
 *  
 *  	* Purchase Order
 *  	- Ship to Address on Created From Transaction
 *  		- NO Ship to address = SKIP
 *  		- No Match for Ship to State = SKIP
 *  	
 *  	* Bill
 *  	- Ship to Address of linked transaction (Purchase Order)
 *  		- NO Ship to address = SKIP
 *  		- No Match for Ship to State = SKIP
 *  
 *  	* Skip any transactions that require location on Line Item level
 *  
 *    	NJ Region – New Jersey
	    NJ Region – New York
	    PA Region – Delaware
	    PA Region – Maryland
	    PA Region – Pennsylvania 
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
var SCRIPT_PARAM_PROC_INTERNALID='custscript_loctrxlast_processed_id';
var lastProcessedId = '';
var EXIT_COUNT=1000;
//Search will return identified transactions that does NOT have Main line location set
var MAIN_SEARCH_ID='customsearch_invsopobill_missing_loc'; //Saved Search only visible to administrators\
var iobj;

var csvHeader = 'Skipped Transaction InternalID, Skipped Transaction Type, Skipped Transaction #, Skipped Error Msg\n';
var csvBody = '';
var csvSendTo = 'joe.son@audaxium.com';

//JSON location mapping based on Shipping State
var locMap = {
	"Pennsylvania":7,
	"PA":7,
	"NJ":2,
	"NY": 3,
	"DE": 5,
	"MD": 6
};

//main function
function SetLocation() {
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
				
				printObject(iobj);
				
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


/**
 * Objectize row data for easy access.
 */
function objectizeRowData(_row) {
	iobj = new Object();
	iobj.id = _row.getValue(_row.getAllColumns()[0].getName(),_row.getAllColumns()[0].getJoin()); //internal id
	iobj.cfrom = _row.getValue(_row.getAllColumns()[1].getName(),_row.getAllColumns()[1].getJoin()); //created from (Linked Trx)
	iobj.trxrectype = _row.getValue(_row.getAllColumns()[2].getName(),_row.getAllColumns()[2].getJoin()); //transaction record type
	iobj.trxshipstate = _row.getValue(_row.getAllColumns()[3].getName(),_row.getAllColumns()[3].getJoin()); //transaction shipping state
	iobj.cfromshipstate = _row.getValue(_row.getAllColumns()[4].getName(),_row.getAllColumns()[4].getJoin()); //created from shipping state
	iobj.cfromrectype = _row.getValue(_row.getAllColumns()[5].getName(),_row.getAllColumns()[5].getJoin()); //created from record type
	iobj.trxnumber = _row.getValue(_row.getAllColumns()[6].getName(),_row.getAllColumns()[6].getJoin()); //trx number
}

function sendCsv(_index) {
	//generate skipped csv files and send to Audaxium
	if (!csvBody) {
		return;
	}
	
	var fileName = 'SkippedTransactions'+_index+'.csv';
	var fileObj = nlapiCreateFile(fileName,'CSV',csvHeader+csvBody);
	var attachment = new Array();
	attachment.push(fileObj);
	nlapiSendEmail('-5', csvSendTo, 'Skipped Transactions', 'Need to update manuall', null, null, null, attachment);
	
}

//'Skipped Transaction InternalID, Skipped Transaction Type, Skipped Transaction #, Skipped Error Msg\n';
function processTransaction() {
	try {
		var shipState = (iobj.trxshipstate)?iobj.trxshipstate:iobj.cfromshipstate;
		if (shipState) {
			//check to make sure location map exists for this ship State
			if (!locMap[shipState]) {
				//add it to csvBody and provide skipping reason
				log('DEBUG','Skipping','Shipping State ('+shipState+') not part of Mapping trx: Trx Number = '+iobj.trxnumber);
				csvBody+=iobj.id+','+iobj.trxrectype+','+iobj.trxnumber+',Shipping State ('+shipState+') not part of Mapping\n';
			} else {
				//ready to update
				log('DEBUG','Setting location value '+shipState+' to '+locMap[shipState]+' for '+iobj.trxrectype+'('+iobj.trxnumber+')');
				
				//inline editing is not supported. Need to load, set and submit
				var thisTrx = nlapiLoadRecord(iobj.trxrectype,iobj.id);
				thisTrx.setFieldValue('location',locMap[shipState]);
				nlapiSubmitRecord(thisTrx);
				
			}
		} else {
			//add it to csvBody and provide skipping reason
			log('DEBUG','Skipping','Shipping State not set on both trx: Trx Number = '+iobj.trxnumber);
			csvBody+=iobj.id+','+iobj.trxrectype+','+iobj.trxnumber+',Shipping Address State/Province is empty on both transaction AND created from ('+iobj.cfromshipstate+') Transaction\n';
		}
	} catch (e) {
		//when error occurs log it on the csv file and proceed to next
		//remove \n and \r
		var errtxt = '';
		errtxt = strGlobalReplace(getErrText(e),"\\r"," :: ");
		errtxt = strGlobalReplace(getErrText(e),"\\n"," :: ");
		
		csvBody+= iobj.id+','+iobj.trxrectype+','+iobj.trxnumber+',Skipping Due to Error (May be required at the line item level): '+errtxt+'\n';
		log('ERROR','Skipping Error occured',getErrText(e));
	}
	
}


function getParam(_rsltrow) {
	var param = new Array();
	param[SCRIPT_PARAM_PROC_INTERNALID] = _rsltrow.getValue('internalid');
	//ADD additional paramter. last processed internal ID is automatically added
	
	return param;
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
