/**
 * ONLY execute this in Debugger mode. This script is meant to remove any short list/outstanding addresses 
 */

var SCT_EXIT_LEVEL = 50;
/**
 * To be ran as Debug mode.
 */

var ctx = nlapiGetContext();

//NEED to get Production IDs when we go live
var csvBackupFileNamePrefix = 'AddressesToBeRemoved';
var csvBackupFileFolderId = '172820'; //Audaixum Folder
var strFileHeader = 'Customer Name,Customer InternalID,Customer Status,Default Billing,Default Shipping,Address Label,Attention,Addressee,Phone,Address1,Address2,City,State,Zip,Country,AddressText\n';
var strFileBody = '';

//define search
var flt = [new nlobjSearchFilter('isinactive',null,'is','F')];
//besure to return the results ordered by Internalid in descending order
	
//MOD 7/21/2012: After initial process was completed, I found Oustanding records that may have been added or updated AFter script passed them.
//Below filter is a second pass at the script to remove unneeded addresses from the system 
flt.push(new nlobjSearchFilter('address',null,'isempty'));
flt.push(new nlobjSearchFilter('addresslabel',null,'isempty'));
flt.push(new nlobjSearchFilter('isdefaultbilling',null,'is','F'));
flt.push(new nlobjSearchFilter('isdefaultshipping',null,'is','F'));
	
//get list of 
var col = [new nlobjSearchColumn('internalid'),
           new nlobjSearchColumn('addressinternalid').setSort()]; 

var rslt = nlapiSearchRecord('customer', null, flt, col);

for (var i=0; rslt && i < rslt.length; i++) {
	
	alert('Processing Customer Internal ID: '+rslt[i].getValue('internalid'));
	
	if (!rslt[i].getValue('addressinternalid')) {
		alert('Breaking out. No need to process any further');
		
		//before rescheduling - save what we have done so far as a file in Audaxium folder
		var rightNow = new Date();
		var milsecTime = rightNow.getTime(); // for uniqueness
		var fileName = csvBackupFileNamePrefix + milsecTime + '.csv';
		var csvFileObj = nlapiCreateFile(fileName, 'CSV', strFileHeader + strFileBody);
		csvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(csvFileObj);
		
		break;
	} 
	
	//process newly added address or updated addresses
	var cust = nlapiLoadRecord('customer',rslt[i].getValue('internalid'));
	
	var addrCount = cust.getLineItemCount('addressbook');
	//loop through each addresses and remove address that has following characteristics
	// - NOT a default billing AND shipping address
	// - No Address Label
	// - No Address1 value 
	
	var updCustomerRec = false;
	
	//loop through list of addresses
	for (var j=1; j <= addrCount; j++) {
		var addrObj = objectizeAddressValue(cust, j);
		
		//nlapiLogExecution('debug','---- Address line '+i,'Is Def. Billing: '+addrObj.defaultbill+' // Is Def. Shipping: '+addrObj.defaultship+' // Label: '+addrObj.label+' // Addr1: '+addrObj.addr1);
		//MOD Request 7/13/2012 - Client wishes NOT to remove address that has address text overriden.
		if (addrObj.defaultbill=='F' && addrObj.defaultship=='F' && !addrObj.label && !addrObj.addr1 && !addrObj.addrtxt) {
			
			//nlapiLogExecution('debug','---- Delete line '+i, customerRec.getFieldValue('companyname')+'; line '+i+' to be deleted');
			
			//all four criteria match. should be removed
			//FOR NOW, only write it out to CSV file
			// - Double Quotes are used to wrap each value so that CSV file will not flake out
			strFileBody +='"'+cust.getFieldValue('companyname')+'",'+
						  '"'+cust.getId()+'",'+
						  '"'+cust.getFieldText('entitystatus')+'",'+
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
			cust.removeLineItem('addressbook',j);
		}
	}
	
	if (updCustomerRec) {
		//ignore mandatory fields for this update
		nlapiSubmitRecord(cust, false, true);
	}
	
	//check to see if we are running out of governance
	if (ctx.getRemainingUsage() <= SCT_EXIT_LEVEL &&  rslt.length > 0) {
		nlapiLogExecution('debug','Running low on goverance','Need to Reschedule at Customer ID; '+rslt[i].getValue('internalid'));
		
		//before rescheduling - save what we have done so far as a file in Audaxium folder
		var rightNow = new Date();
		var milsecTime = rightNow.getTime(); // for uniqueness
		var fileName = csvBackupFileNamePrefix + milsecTime + '.csv';
		var csvFileObj = nlapiCreateFile(fileName, 'CSV', strFileHeader + strFileBody);
		csvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(csvFileObj);
		
		break;
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

function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	if (!_fullString) {
		return '';
	}
	var jsrs = new RegExp(_searchChar, "g");
	var newString=_fullString.replace(jsrs,_replaceChar);
	return newString;
}

