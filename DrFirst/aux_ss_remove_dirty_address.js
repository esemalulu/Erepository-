/**
 * Scheduled Script that will run through list of ALL Customer record 
 * and remove any dirty addresses. Any removed addresses will be backed up to custom record.
 */

var SCT_EXIT_LEVEL = 2000;
var ctx = nlapiGetContext();
var LAST_PROC_CUSTOMER_PARAM = 'custscript_last_proc_customer_id';
var lastProcessedCustomerId = '';

var counter = 1;
var rsltSet = null;

//NEED to get Production IDs when we go live
var csvBackupFileNamePrefix = 'AddressesToBeRemoved';
var csvBackupFileFolderId = '172820'; //Audaixum Folder
var strFileHeader = 'Customer Name,Customer InternalID,Customer Status,Default Billing,Default Shipping,Address Label,Attention,Addressee,Phone,Address1,Address2,City,State,Zip,Country,AddressText\n';
var strFileBody = '';

function massRemoveDirtyAddresses() {
	
	//get any script parameter
	lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM);
	
	//define search
	var flt = [new nlobjSearchFilter('isinactive',null,'is','F')];
	//besure to return the results ordered by Internalid in descending order
	var col = [new nlobjSearchColumn('internalid').setSort(true)]; 
	
	//check to see if last processed id is present.
	if (lastProcessedCustomerId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
	}
	
	//using create search to get more than 1000 results
	rsltSet = nlapiCreateSearch('customer',flt,col).runSearch();
	
	rsltSet.forEachResult(processResultRow);
	
}

function processResultRow(row) {
	
	try {
		
		//to gain access to ALL Addresses, you need to load the record
		var customerRec = nlapiLoadRecord('customer',row.getValue('internalid'));
		
		//nlapiLogExecution('debug','Processing customer ID',row.getValue('internalid'));
		
		var addrCount = customerRec.getLineItemCount('addressbook');
		//loop through each addresses and remove address that has following characteristics
		// - NOT a default billing AND shipping address
		// - No Address Label
		// - No Address1 value 
		
		var updCustomerRec = false;
		
		for (var i=1; i <= addrCount; i++) {
			
			var addrObj = objectizeAddressValue(customerRec, i);
			
			//nlapiLogExecution('debug','---- Address line '+i,'Is Def. Billing: '+addrObj.defaultbill+' // Is Def. Shipping: '+addrObj.defaultship+' // Label: '+addrObj.label+' // Addr1: '+addrObj.addr1);
			//MOD Request 7/13/2012 - Client wishes NOT to remove address that has address text overriden.
			if (addrObj.defaultbill=='F' && addrObj.defaultship=='F' && !addrObj.label && !addrObj.addr1 && !addrObj.addrtxt) {
				
				//nlapiLogExecution('debug','---- Delete line '+i, customerRec.getFieldValue('companyname')+'; line '+i+' to be deleted');
				
				//all four criteria match. should be removed
				//FOR NOW, only write it out to CSV file
				// - Double Quotes are used to wrap each value so that CSV file will not flake out
				strFileBody +='"'+customerRec.getFieldValue('companyname')+'",'+
							  '"'+customerRec.getId()+'",'+
							  '"'+customerRec.getFieldText('entitystatus')+'",'+
							  '"'+addrObj.defaultbill+'",'+
							  '"'+addrObj.defaultship+'",'+
							  '"'+addrObj.label+'",'+
							  '"'+addrObj.attention+'",'+
							  '"'+addrObj.addressee+'",'+
							  '"'+addrObj.phone+'",'+
							  '"'+addrObj.addr1+'",'+
							  '"'+addrObj.addr2+'",'+
							  '"'+addrObj.city+'",'+
							  '"'+addrObj.state+'",'+
							  '"'+addrObj.zip+'",'+
							  '"'+addrObj.country+'",'+
							  '"'+addrObj.addrtxt+'"\n';
			
				//mark it to save the modified customer record
				if (!updCustomerRec) {
					updCustomerRec = true;
				}
				
				//Delete the line 
				customerRec.removeLineItem('addressbook',i);
			}
		}
		
		if (updCustomerRec) {
			//ignore mandatory fields for this update
			nlapiSubmitRecord(customerRec, false, true);
		}
		
		//check to see if we are running out of governance
		if (ctx.getRemainingUsage() <= SCT_EXIT_LEVEL &&  rsltSet.getResults(counter, (counter+2)).length > 0) {
			nlapiLogExecution('debug','Running low on goverance','Need to Reschedule - Rescheduling At Index: '+counter+' // last process customer ID: '+row.getValue('internalid'));
			
			//before rescheduling - save what we have done so far as a file in Audaxium folder
			var rightNow = new Date();
			var milsecTime = rightNow.getTime(); // for uniqueness
			var fileName = csvBackupFileNamePrefix + milsecTime + '.csv';
			var csvFileObj = nlapiCreateFile(fileName, 'CSV', strFileHeader + strFileBody);
			csvFileObj.setFolder(csvBackupFileFolderId);
			nlapiSubmitFile(csvFileObj);
			
			var param = new Array();
			param[LAST_PROC_CUSTOMER_PARAM] = row.getValue('internalid');
			
			var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
			if (schStatus == 'QUEUED') {
				return false;
			}
		}
		
		counter++;
		
		return true; //continue iterating through ResultSet
	} catch (e) {
		//throw custom exception and stop processing
		throw nlapiCreateError('CNT00001-Error Processing Customer','Error occured while processing Customer Internal ID: '+row.getValue('internalid')+' // '+e.toString());
		
		return false;
	}
	
}

function objectizeAddressValue(rec, line) {
	var aobj = new Object();
	aobj.defaultbill = rec.getLineItemValue('addressbook','defaultbilling',line);
	aobj.defaultship = rec.getLineItemValue('addressbook','defaultshipping',line);
	aobj.label = (rec.getLineItemValue('addressbook','label',line))?rec.getLineItemValue('addressbook','label',line):'';
	aobj.attention = (rec.getLineItemValue('addressbook','attention',line))?rec.getLineItemValue('addressbook','attention',line):'';
	aobj.addressee = (rec.getLineItemValue('addressbook','addressee',line))?rec.getLineItemValue('addressbook','addressee',line):'';
	aobj.phone = (rec.getLineItemValue('addressbook','phone',line))?rec.getLineItemValue('addressbook','phone',line):'';
	aobj.addr1 = (rec.getLineItemValue('addressbook','addr1',line))?rec.getLineItemValue('addressbook','addr1',line):'';
	aobj.addr2 = (rec.getLineItemValue('addressbook','addr2',line))?rec.getLineItemValue('addressbook','addr2',line):'';
	aobj.city = (rec.getLineItemValue('addressbook','city',line))?rec.getLineItemValue('addressbook','city',line):'';
	aobj.state = (rec.getLineItemValue('addressbook','state',line))?rec.getLineItemValue('addressbook','state',line):'';
	aobj.zip = (rec.getLineItemValue('addressbook','zip',line))?rec.getLineItemValue('addressbook','zip',line):'';
	aobj.country = (rec.getLineItemValue('addressbook','country',line))?rec.getLineItemValue('addressbook','country',line):'';
	
	var strAddrTxt = (rec.getLineItemValue('addressbook','addrtext',line))?rec.getLineItemValue('addressbook','addrtext',line):'';
	
	strAddrTxt = strGlobalReplace(strAddrTxt, "\\r", " :: ");
	strAddrTxt = strGlobalReplace(strAddrTxt,"\\n", " :: ");
	
	//nlapiLogExecution('debug','address text',strAddrTxt);
	
	aobj.addrtxt = strAddrTxt;
	
	return aobj;
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
