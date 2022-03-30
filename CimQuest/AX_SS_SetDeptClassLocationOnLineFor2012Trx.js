/**
 * Author: joe.son@audaxium.com
 * Date: 3/1/2012
 * Description:
 * - Goes through list of Opportunities, Quotes, Sales Orders, Invoices
 *  to fill in each lines' dept, class, location from its' items.
 * - Should skip those items that does NOT have dept, class and location set at the item level.
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
var SCRIPT_PARAM_PROC_ISTESTMODE='custscript_trxupd_istestmode';

//exit out at higher count so that ALL transactions can be processed.
var EXIT_COUNT=4000;
var ctx = nlapiGetContext();

var csvHeader = 'Transaction InternalID,Transaction Type, Transaction #, Update Status, Line ItemText, Item Dept, Item Class, Item Location, Err/Warning Msg\n';
var csvBody = '';
var csvSendTo = 'joe.son@audaxium.com';

var isTestMode = '';
var lastProcessedId = '';
//logs are stored in Audaxium 2012 Trx Line DCL Log folder
var LOG_FOLDER_ID = '267863';


//main function
function UpdateHistorical2012Trx() {

	if (!LOG_FOLDER_ID) {
		log('error','Log Folder ID missing','');
		return;
	}
	
	lastProcessedId = ctx.getSetting('SCRIPT',SCRIPT_PARAM_PROC_INTERNALID);
	isTestMode = ctx.getSetting('SCRIPT',SCRIPT_PARAM_PROC_ISTESTMODE);
	if (!isTestMode) {
		isTestMode = 'F';
	}
	
	try {
		
		//search for all opp, est, so, invoice for 2012
		var trxflt = [new nlobjSearchFilter('type',null,'anyof',['Opprtnty','Estimate','SalesOrd','CustInvc']),
		              new nlobjSearchFilter('trandate',null,'within','1/1/2012', '12/31/2012'),
		              new nlobjSearchFilter('mainline',null,'is','T'),
		              new nlobjSearchFilter('memorized',null,'is','F')];
		//sort the results by highest internal ID
		var trxcol = [new nlobjSearchColumn('internalid').setSort(true),
		              new nlobjSearchColumn('type'),
		              new nlobjSearchColumn('tranid')];
		//incase of reschedule, process where it left off by adding filter of internal ID (number) less than last processed trx internal id
		if (lastProcessedId && !isNaN(parseInt(lastProcessedId))) {
			trxflt.push(new nlobjSearchFilter('internalidnumber',null,'lessthan',lastProcessedId));
		}
		var trxrslt = nlapiSearchRecord('transaction', null, trxflt, trxcol);
		
		//when in test mode, process only top 10
		for (var i=0; trxrslt && i < ((isTestMode=='F')?trxrslt.length:10); i++) {
			log('debug','processing',trxrslt[i].getId()+'","'+trxrslt[i].getText('type')+'","'+trxrslt[i].getValue('tranid'));
			lastProcessedId = trxrslt[i].getId();
			var trx = null;
			try {
				trx = nlapiLoadRecord(trxrslt[i].getRecordType(), trxrslt[i].getId());
			} catch (trxloaderror) {
				log('ERROR','Error Loading Transaction:',trxrslt[i].getId()+'","'+trxrslt[i].getText('type')+'","'+trxrslt[i].getValue('tranid')+' // '+getErrText(trxloaderror));
				csvBody +='"'+trxrslt[i].getId()+'","'+trxrslt[i].getText('type')+'","'+trxrslt[i].getValue('tranid')+'","ERROR","","","","","'+getErrText(trxloaderror)+'"\n';
			}
			
			//process line when trx has been successfully loaded
			if (trx) {
				var tempcsv = '"'+trxrslt[i].getId()+'","'+trxrslt[i].getText('type')+'","'+trxrslt[i].getValue('tranid');
				var itemcnt = trx.getLineItemCount('item');
				if (itemcnt == 0) {
					csvBody += tempcsv+'","ERROR","","","","","Transaction contains no items"\n'; 
				} else {
					//loop process line item
					var itemJson = {};
					var itemIds = new Array();
					
					//gather all unique items in the line to do one search to get location, dept, and class
					for (var u=1; u <= itemcnt; u++) {
						//loop through itemIds and check for duplicate
						if (!checkForDups(itemIds, trx.getLineItemValue('item','item',u))) {
							itemIds.push(trx.getLineItemValue('item','item',u));
						}
					}
					
					var hasItemSearchError = false;
					try {
						//populate itemJson object
						var itemflt = [new nlobjSearchFilter('internalid', null, 'anyof', itemIds)];
						var itemcol = [new nlobjSearchColumn('internalid'),
						               new nlobjSearchColumn('itemid'),
						               new nlobjSearchColumn('location'),
						               new nlobjSearchColumn('department'),
						               new nlobjSearchColumn('class'),
						               new nlobjSearchColumn('type')];
						var itemrslt = nlapiSearchRecord('item', null, itemflt, itemcol);
						
						for (var rj=0; rj < itemrslt.length; rj++) {
							var ritemid = itemrslt[rj].getId();
							log('debug','ritemid // type', ritemid+' // '+itemrslt[rj].getText('type'));
							if (!itemJson[ritemid]) {
								itemJson[ritemid]={};
							}
							itemJson[ritemid]['itemtext'] = itemrslt[rj].getValue('itemid');
							itemJson[ritemid]['type'] = itemrslt[rj].getText('type');
							itemJson[ritemid]['location'] = (itemrslt[rj].getValue('location')?itemrslt[rj].getValue('location'):'');
							itemJson[ritemid]['department'] = (itemrslt[rj].getValue('department')?itemrslt[rj].getValue('department'):'');
							itemJson[ritemid]['class'] = (itemrslt[rj].getValue('class')?itemrslt[rj].getValue('class'):'');
						}
						
					} catch (itemssearcherror) {
						hasItemSearchError = true;
						csvBody +=tempcsv+'","ERROR","","","","","'+
								  '"Item Search for '+itemIds+' failed: '+getErrText(itemssearcherror)+'"\n';
					}
					
					//proceed only when there are no item search error
					if (!hasItemSearchError) {
						var updateTrx = false;
						for (var j=1; j <= itemcnt; j++) {
							//loop through itemIds and set dept, class location values
							log('debug','item loop j value',j);
							var pitemid = trx.getLineItemValue('item','item',j);
							log('debug','item id',pitemid);
							var lineloc = (trx.getLineItemValue('item','location',j)?trx.getLineItemValue('item','location',j):'');
							var lineclass = (trx.getLineItemValue('item','class',j)?trx.getLineItemValue('item','class',j):'');
							var linedept = (trx.getLineItemValue('item','department',j)?trx.getLineItemValue('item','department',j):'');
							
							if (!isNaN(parseInt(pitemid)) && parseInt(pitemid) < 0 ) {
								//unkown item to process
								log('debug','item loop Unknown check',j);
								//don't update the line item
								csvBody +=tempcsv+'","SKIP","Line: '+j+':'+trx.getLineItemText('item','item',j)+'","","","","'+
								          '"Item is unknown with Id of '+pitemid+'. Will be skipped"\n';
							} else if (itemJson[pitemid]['type'] == 'Description') {
								log('debug','item loop Description check',j);
								//don't update the line item
								csvBody +=tempcsv+'","SKIP","Line: '+j+':'+itemJson[pitemid]['itemtext']+'","'+itemJson[pitemid]['department']+'","'+
										  itemJson[pitemid]['class']+'","'+itemJson[pitemid]['location']+'","'+
								          '"Item is type is Description. Will be skipped"\n';
							} else if (!itemJson[pitemid]['class'] && !itemJson[pitemid]['location'] && !itemJson[pitemid]['department']) {
								log('debug','item loop skip',j);
								//don't update the line item
								csvBody +=tempcsv+'","SKIP","Line: '+j+':'+itemJson[pitemid]['itemtext']+'","'+itemJson[pitemid]['department']+'","'+
										  itemJson[pitemid]['class']+'","'+itemJson[pitemid]['location']+'","'+
								          '"Item is missing location/class/department values. Will be skipped"\n';
								
							} else {
								//other wise update
								//warn that class or department or location is missing
								if (!itemJson[pitemid]['class'] || !itemJson[pitemid]['location'] || !itemJson[pitemid]['department']) {
									csvBody +=tempcsv+'","WARN","Line: '+j+':'+itemJson[pitemid]['itemtext']+'","'+itemJson[pitemid]['department']+'","'+
									  		  itemJson[pitemid]['class']+'","'+itemJson[pitemid]['location']+'","'+
									  		  '"Item is missing location or class or department values. Will set available values"\n';
								}
								
								if (lineloc && lineclass && linedept) {
									log('debug','item skip all line value exists',j);
									csvBody +=tempcsv+'","SKIP","Line: '+j+':'+itemJson[pitemid]['itemtext']+'","'+itemJson[pitemid]['department']+'","'+
							  		  		  itemJson[pitemid]['class']+'","'+itemJson[pitemid]['location']+'","'+
							  		  		  '"Line Items location/class/department are already set. Will be skipped"\n';
								} else {
									if(!updateTrx) {
										updateTrx = true;
									}
									
									trx.selectLineItem('item', j);
									
									//only update missing fields
									if (!lineloc && itemJson[pitemid]['location']) {
										trx.setCurrentLineItemValue('item', 'location', itemJson[pitemid]['location']);
									}
									
									if (!lineclass && itemJson[pitemid]['class']) {
										trx.setCurrentLineItemValue('item', 'class', itemJson[pitemid]['class']);
									}
									
									if (!linedept && itemJson[pitemid]['department']) {
										trx.setCurrentLineItemValue('item', 'department', itemJson[pitemid]['department']);
									}
									log('debug','item loop j commit',j);
									trx.commitLineItem('item');
								}
							}
						}
						
						if (updateTrx) {
							try {
								//update by not doing any sourcing and ignoring 
								nlapiSubmitRecord(trx, false, true);
								csvBody +=tempcsv+'","SUCCESS","","","","","'+
						  		  		  '"Transaction Updated"\n';
							} catch (updtrxerror) {
								csvBody +=tempcsv+'","ERROR","","","","","'+
								  		  '"Transaction Update failed: '+getErrText(updtrxerror)+'"\n';
							}
						}
					}
				}
			}
			
			
			if (ctx.getRemainingUsage() <= EXIT_COUNT && (i+1) < trxrslt.length) {
				log('debug','Rescheduling at Internal ID ',trxrslt[i].getId());
				
				var param = new Array();
				param[SCRIPT_PARAM_PROC_INTERNALID] = lastProcessedId;
				param[SCRIPT_PARAM_PROC_ISTESTMODE] = isTestMode;
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		
		saveCsv(); 
		
		//create process csv file
		
	} catch (e) {
		
		log('ERROR','Runtime Error-Scheduled Script Terminated',getErrText(e));
		nlapiSendEmail('-5', 'joe.son@audaxium.com', 'Error occured while processing 2012 trx update', 'Scheduled Script Terminated!!!<br/>Failure Msg: '+getErrText(e));
		//save CSV 
		saveCsv();
	}
	
	
}

function saveCsv() {
	//generate skipped csv files and send to Audaxium
	if (!csvBody) {
		return;
	}
	
	try {
		var fileName = '2012OppEstSoInvLineClassDeptLocUpdate'+lastProcessedId+'_'+ (new Date().getTime())+'.csv';
		var fileObj = nlapiCreateFile(fileName,'CSV',csvHeader+csvBody);
		fileObj.setFolder(LOG_FOLDER_ID);
		nlapiSubmitFile(fileObj);
	} catch (filesaveerror) {
		//var attachment = new Array();
		//attachment.push(fileObj);
		
		nlapiSendEmail('-5', 'joe.son@audaxium.com', 'File save error at trx internal ID: '+lastProcessedId, 'Save Failure Msg: '+getErrText(filesaveerror)+'<br><br>'+csvBody);
		
		throw nlapiCreateError('FILESAVE_ERROR', getErrText(filesaveerror), true);
	}
	
	
}


function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}

function checkForDups(itemIds, itemid) {
	for (itm in itemIds) {
		if (itemIds[itm]==itemid) {
			return true;
		}
	}
	return false;
}

function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	if (!_fullString) {
		return '';
	}
	var jsrs = new RegExp(_searchChar, "g");
	var newString=_fullString.replace(jsrs,_replaceChar);
	return newString;
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
	
	txt = strGlobalReplace(txt, "\r", " || ");
	txt = strGlobalReplace(txt,"\n", " || ");
	
	return txt;
}
