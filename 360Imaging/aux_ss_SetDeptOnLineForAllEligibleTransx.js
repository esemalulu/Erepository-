/**
 * Author: joe.son@audaxium.com
 * Date: 3/1/2012
 * Description:
 * - Goes through list of ALL eligible transactions and updates or analyze Division on each line.
 * Saved Search: customsearch_all_trx_for_div_correction
 * 		- MainLine = False (Only return line items)
 * 		- Item is not none (has atleast one line of items - This removes trx with ONLY expenses)
 * 		- Tax Line = False (Remove Tax line)
 * 		- Shopping Line == False (Remove Shopping charge line)
 * 		- item:Type is NONE of = Description, Subtotal, Discount
 * 		- Memorized = False (Removes memorized transaction)
 * 		- All of the Above AND
 * 			- Line Division is Empty
 * 				OR
 * 			- Line Division does NOT equal items' Division
 * 
 * When Line Division is empty and Items' division is set
 * 		-> Update line with Division from Item
 * 
 * When Both are emtpy
 * 		-> Add as Error
 * 
 * Round 2: Removing this Message
 * When Line and Items' Division does NOT match
 * case when {department} != {item.department} then 1 else 0 end
 * 		-> Add as Warning
 * 
 * Note on Scheduled Script:
 * Scheduled script should ALWAYS have parameter called "Last Processed Internal ID"
 * - Search SHOULD always be ordered by Internal ID in descending order.
 * - When lastProcessedId is not null and it is of type Number, Additional search filter should be added
 * EXCEPTION to the Last Processed Internal ID rule is when scheduled script IS running based on
 *   - Pre determined exit flag on a record or TIME based execution
 * 
 * 
 * Date = trandate
 * ref/number = tranid
 * TransactionType = type
 * line Ite = item : item
 * item dept = department : item
 */

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

//each scheduled script MUST have script parameter called Last Processed Internal ID.
//ID of last proessed internal id is defined in CMWL_Constants.js
var SCRIPT_PARAM_PROC_INTERNALID='custscript_trxlast_processed_id';
var lastProcessedId = '';
var EXIT_COUNT=1000;
//Main save search returns all eligible trx internal IDs - Grouped
var MAIN_SEARCH_ID='customsearch_all_trx_for_div_correction'; //Saved Search only visible to administrators

var LINE_SEARCH_ID='customsearch_trx_for_divcor_line';

var ctx = nlapiGetContext();
var logFolderId = 20441;
var round2Folder = 20442;
var fileNamePrefix = 'Round2_DbErrorFix_Division_Correction_Transaction_#INDEX#_#TIME#.csv';

var csvHeader = 'Transaction InternalID, Transaction Type, Transaction #, Line item, Item Line Number, Line Division, Item Division, Status, Description, Record Update status, Record Update Desc\n';
var csvBody = '';
var sendErrorTo = 'joe.son@audaxium.com';

//main function
function CorrectDivisionOnTrx() {
	var rescheduled=false;
	try {
		initScriptParam();
		//log('DEBUG','Last Processed ID',lastProcessedId);
		var rslt = getMainSearch();
		
		if (rslt && rslt.length > 0) {
			//begin executing scheduled script
			//nlapiLogExecution('DEBUG','Result Size',rslt.length);
			//rslt.length
			loop1:
			for (var i=0; i <rslt.length; i++) {
				
				var trxid = rslt[i].getValue('internalid',null,'group');
				var trxtype = rslt[i].getValue('recordtype',null,'group');
				nlapiLogExecution('debug','Processing Internal ID: '+trxid, trxid);
				//run secondary search to ONLY bring out eligible line item from THIS trx
				var linefilter = [new nlobjSearchFilter('internalid',null,'anyof',trxid)];
				var lrslt = nlapiSearchRecord('transaction', LINE_SEARCH_ID, linefilter, null);
				
				//load 
				var trxrec = nlapiLoadRecord(trxtype, trxid);
				var updRecord = false;
				var trxAllItemColumns = (trxrec.getAllLineItemFields('item'))?trxrec.getAllLineItemFields('item'):new Array();
				var hasDivisionColumn = trxAllItemColumns.contains('department');
				
				loop2:
				//assume lrslt returns value
				for (var l=0; l < lrslt.length; l++) {
					var robj = new Object();
					robj.trxid = lrslt[l].getId();
					robj.trxtype = lrslt[l].getRecordType();
					robj.trxref = lrslt[l].getValue('tranid');
					robj.trxdate = lrslt[l].getValue('trandate');
					robj.trxformid = lrslt[l].getValue('customform');
					robj.trxformtext = lrslt[l].getText('customform');
					robj.linenumber = trxrec.findLineItemValue('item','line',lrslt[l].getValue('linesequencenumber'));
					robj.lineitemid = lrslt[l].getValue('item');
					robj.lineitemtext = lrslt[l].getText('item');
					robj.linedeptid = lrslt[l].getValue('department');
					robj.linedepttext = lrslt[l].getText('department');
					robj.itemdeptid = lrslt[l].getValue('department','item');
					robj.itemdepttext = lrslt[l].getText('department','item');
					
					var status='', procdesc='';
					
					//nlapiLogExecution('debug','item line number',robj.linenumber);
					//nlapiLogExecution('debug','Has Division Col',hasDivisionColumn);
					
					if (!hasDivisionColumn) {
						status = 'ERROR';
						procdesc = 'Form is missing division field.Form Name (id): '+robj.trxformtext+' ('+robj.trxformid+')';
						csvBody += '"'+robj.trxid+'","'+robj.trxtype+'","'+robj.trxref+'","'+robj.lineitemtext+' ('+robj.lineitemid+')","'+
						   		   robj.linenumber+'","'+robj.linedepttext+' ('+robj.linedeptid+')","'+robj.itemdepttext+' ('+robj.itemdeptid+')","'+
						   		   status+'","'+procdesc+'","TRX Update Skipped","Missing Division column on transaction line"\n';
						updRecord = false;
						break loop2;
					}
					
					if (robj.linenumber != -1) {
						if (!robj.linedeptid && !robj.itemdeptid) {
							status = 'ERROR';
							procdesc = 'Both Item and Line Division Missing';
						} else if (robj.linedeptid && robj.itemdeptid != robj.linedeptid) {
							status = 'WARNING';
							procdesc = 'Line and Item Division Does Not match. No update action Taken';
						} else if (!robj.linedeptid && robj.itemdeptid) {
							//flag it to submit record
							//Set the flag to true ONCE 
							if (!updRecord) {
								updRecord = true;
							}
							
							status = 'UPDATE';
							procdesc = 'Line Division set to Item Division';
										
							trxrec.setLineItemValue('item','department',robj.linenumber, robj.itemdeptid);
						}
									
						if (l==0) {
							csvBody += '"'+robj.trxid+'","'+robj.trxtype+'","'+robj.trxref+'","'+robj.lineitemtext+' ('+robj.lineitemid+')","'+
									   robj.linenumber+'","'+robj.linedepttext+' ('+robj.linedeptid+')","'+robj.itemdepttext+' ('+robj.itemdeptid+')","'+
									   status+'","'+procdesc+'","#US#","#UD#"\n';
						} else {
							csvBody += '"","","","'+robj.lineitemtext+' ('+robj.lineitemid+')","'+
									   robj.linenumber+'","'+robj.linedepttext+' ('+robj.linedeptid+')","'+robj.itemdepttext+' ('+robj.itemdeptid+')","'+
									   status+'","'+procdesc+'","",""\n';
						}
					}
					
				}//end for loop of line search
				
				//nlapiLogExecution('debug','finished line analysis','loop2 ended');
				
				if (updRecord) {
					try {
						nlapiSubmitRecord(trxrec, false, true);
						csvBody = csvBody.replace('#US#','TRX Update SUCCESS');
						csvBody = csvBody.replace('#UD#','SUCCESS');
					} catch (trxUpdError) {
						var recupddesc = strGlobalReplace(trxUpdError.toString(), "\r", " || ");
						recupddesc = strGlobalReplace(recupddesc,"\n", " || ");
									
						csvBody = csvBody.replace('#US#','TRX Update FAILED');
						csvBody = csvBody.replace('#UD#',recupddesc);
					}
				} else if (hasDivisionColumn){
					csvBody = csvBody.replace('#US#','TRX Update SKIPPED');
					csvBody = csvBody.replace('#UD#','Warning/Errors exists');
				} else {
					csvBody = csvBody.replace('#US#','TRX Update SKIPPED');
					csvBody = csvBody.replace('#UD#','Warning/Errors exists');
				}
				
				//Reschedule when it runs out of gov.
				if (ctx.getRemainingUsage() <= EXIT_COUNT && (i+1) < rslt.length) {
					var param = new Array();
					param[SCRIPT_PARAM_PROC_INTERNALID] = rslt[i].getValue('internalid',null,'group');
					
					var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
					if (schStatus=='QUEUED') {
						nlapiLogExecution('debug','Script Rescheduled','Last Processed ID: '+rslt[i].getValue('internalid',null,'group'));
						rescheduled=true;
						saveCsv(i);
						break;
					}
				}
			}//end for loop of Group search
			
			if (!rescheduled) {
				//if this is the end of iteration, send out the csv file
				saveCsv(0);
			}
		}
	} catch (e) {
		nlapiLogExecution('debug','Process Error',e.toString());
		if (csvBody) {
			saveCsv(-1);
		}
		//send script terminating error email
		nlapiSendEmail(-5, sendErrorTo, '360-Division Correction Script Error', 'Script terminated due to error<br/>'+e.toString()+'<br/><br/>CSV Body<br/>'+csvBody);
	}
}

/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	if (!_fullString) {
		return '';
	}
	var jsrs = new RegExp(_searchChar, "g");
	var newString=_fullString.replace(jsrs,_replaceChar);
	return newString;
}

function saveCsv(_index) {
	//generate skipped csv files and send to Audaxium
	if (!csvBody) {
		return;
	}
	
	var today = new Date();
	var fileName = fileNamePrefix.replace('#INDEX#', _index);
	fileName = fileName.replace('#TIME#',today.getTime());
	var fileObj = nlapiCreateFile(fileName,'CSV',csvHeader+csvBody);
	//Round 1 files:
	//fileObj.setFolder(logFolderId);
	
	//Round 2 files:
	fileObj.setFolder(round2Folder);
	
	nlapiSubmitFile(fileObj);
	
}

function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
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
