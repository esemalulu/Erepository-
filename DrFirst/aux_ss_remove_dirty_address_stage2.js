/**
 * Scheduled Script that will run through list of ALL Customer record 
 * and remove any dirty addresses. Any removed addresses will be backed up to custom record.
 * Phase 2 Removal: Removal All address where zipcode is the ONLY available address on the line.
 */

var SCT_EXIT_LEVEL = 500;
var ctx = nlapiGetContext();
var LAST_PROC_CUSTOMER_PARAM = 'custscript_last_proc_customer_idp2';
var lastProcessedCustomerId = '';

var counter = 1;
var rsltSet = null;

var csvBackupFileNamePrefix = 'Phase2AddressesToBeRemoved';
var csvBackupFileFolderId = '172820'; //Audaixum Folder
var strFileHeader = 'Customer Name,Customer InternalID,Customer Status,Default Billing,Default Shipping,Address Label,Attention,Addressee,Phone,Address1,Address2,City,State,Zip,Country,AddressText\n';
var strFileBody = '';
var savedSearchId = 'customsearch1855';
var bolCreateCsvFile = false;

function massRemoveDirtyAddressesP2() {
	
	//get any script parameter
	lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM);
	
	//define search
	var flt = null;
	
	//check to see if last processed id is present.
	if (lastProcessedCustomerId) {
		flt = new Array();
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
	}

	var rslt = nlapiSearchRecord('customer','customsearch1855',flt,null);

	for (var i=0; rslt && i < rslt.length; i++) {
		try {
			//to gain access to ALL Addresses, you need to load the record
			var customerRec = nlapiLoadRecord('customer',rslt[i].getValue('internalid'));
			
			var updateCustomerRec = false;
			
			//find the address internal ID in the addressbook line item
			var lineNumberToRemove = customerRec.findLineItemValue('addressbook','internalid',rslt[i].getValue('addressinternalid'));
			if (lineNumberToRemove && lineNumberToRemove >= 1) {
				//alert(lineNumberToRemove);
				
				var addrObj = objectizeAddressValue(customerRec, lineNumberToRemove);
				
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
				if (!updateCustomerRec) {
					updateCustomerRec = true;
				}
				
				customerRec.removeLineItem('addressbook',lineNumberToRemove);
				
				if (!bolCreateCsvFile) {
					bolCreateCsvFile = true;
				}
				
				nlapiSubmitRecord(customerRec, false, true);
				
				//alert('Usage Left after Updating: '+ctx.getRemainingUsage());
				
				//check to make sure we have enough processing governance points If not, create CSV File
				if (ctx.getRemainingUsage() <=SCT_EXIT_LEVEL && (i+1) < rslt.length) {
					nlapiLogExecution('debug','Rescheduling Index: '+i+' // Customer Internal ID: '+rslt[i].getValue('internalid'));
					var param = new Array();
					param[LAST_PROC_CUSTOMER_PARAM] = rslt[i].getValue('internalid');
					
					var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
					if (schStatus=='QUEUED') {
						break;
					}
				}
			}
		} catch (e) {
			nlapiLogExecution('error','error occured while executing Phase 2 update','Errored Internal Id of customer: '+rslt[i].getValue('internalid')+' // '+e.toString());
			//make sure the file WILL be created at this point
			if (!bolCreateCsvFile) {
				bolCreateCsvFile = true;
			}
			break;
		}
	}
	
	//check to see if we need to create CSV file
	if (bolCreateCsvFile) {
		//before rescheduling - save what we have done so far as a file in Audaxium folder
		var rightNow = new Date();
		var milsecTime = rightNow.getTime(); // for uniqueness
		var fileName = csvBackupFileNamePrefix + milsecTime + '.csv';
		var csvFileObj = nlapiCreateFile(fileName, 'CSV', strFileHeader + strFileBody);
		csvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(csvFileObj);
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
