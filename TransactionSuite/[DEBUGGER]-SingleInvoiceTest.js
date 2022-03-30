var EMAIL_CC = null;
var EMAIL_BCC = null;

var columns = new Array();
var filters = new Array();
	    
		filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[1] = new nlobjSearchFilter('internalid', null, 'anyof','3');

	    columns[0] = new nlobjSearchColumn('custrecord_saved_search');
	    columns[1] = new nlobjSearchColumn('custrecord_days_before_end');
	    columns[2] = new nlobjSearchColumn('custrecord_email_template');
	    columns[3] = new nlobjSearchColumn('custrecord_reply_email_address');
	    columns[4] = new nlobjSearchColumn('custrecord_include_transaction');
	    columns[5] = new nlobjSearchColumn('custrecord_follow_up_call');
	    columns[6] = new nlobjSearchColumn('custrecord_call_date');
	    columns[7] = new nlobjSearchColumn('custrecord_contact_roles');
	    columns[8] = new nlobjSearchColumn('isinactive');
		columns[9] = new nlobjSearchColumn('custrecord_alternateroles');
		columns[10] = new nlobjSearchColumn('name');
	    //1/13/2014 enhancement
		columns[11] = new nlobjSearchColumn('custrecord_aux_add_doc_to_send');
		columns[12] = new nlobjSearchColumn('custrecord_aux_send_statement');
		
	    var results = nlapiSearchRecord('customrecord_email_automation', null, filters, columns);

var savedSearch = results[0].getValue('custrecord_saved_search'); //saved search
var emailTemplate = results[0].getValue('custrecord_email_template'); //template to use
var address = results[0].getValue('custrecord_reply_email_address'); //Reply Email Address (Employee Record)
var returnAddress = address;
var addTransaction = results[0].getValue('custrecord_include_transaction');  //Include transaction checkbox
var followup = results[0].getValue('custrecord_follow_up_call'); //Create follow up call
var callDelay = results[0].getValue('custrecord_call_date'); //follow up call delay (Number of days to delay from script execution date)
var contactRoles = results[0].getText('custrecord_contact_roles'); //Roles to Email to
var alternateRoles = results[0].getText('custrecord_alternateroles'); //Alternate Roles to Email to
var ruleName = results[0].getValue('name'); //Name of Rule
var addFile = results[0].getValue('custrecord_aux_add_doc_to_send'); //Additional file to send as attachment
var sendStatement = results[0].getValue('custrecord_aux_send_statement'); //Send Statement checkbox

var typemap = {
	"CustInvc":"invoice",
	"CashSale":"cashsale",
	"Estimate":"estimate"
};

var searchFilters = [];
var searchColumns = [];

var companyID = '3362';
var tranID = '131759';


searchFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', tranID, null);
searchFilters[1] = new nlobjSearchFilter('mainline', null, 'is', 'T', null);
searchColumns[0] = new nlobjSearchColumn('internalid', 'customer');
searchColumns[1] = new nlobjSearchColumn('internalid');
searchColumns[2] = new nlobjSearchColumn('email', 'customer');
searchColumns[3] = new nlobjSearchColumn('type');

var aresults = nlapiSearchRecord(null, savedSearch, searchFilters, searchColumns);

var listOfFailedTransaction = new Array();
			
				
	var searchType = typemap[aresults[0].getValue('type')];
	var customer = aresults[0].getValue('internalid', 'customer');
	var tranId = aresults[0].getValue('internalid');
	if (customer != null && customer != '') {
		var customerEmail = aresults[0].getValue('email', 'customer');
		alert(customerEmail);
	}

var tranRec = nlapiLoadRecord(searchType, tranID);
var trxJson = {};
		//Mod 3/4/2014 - track all transaction being loaded
		if (!trxJson[tranRec.getFieldValue('tranid')]) {
			trxJson[tranRec.getFieldValue('tranid')] = {
				"id":tranId,
				"type":searchType,
				"company":tranRec.getFieldText('entity'),
				"companyid":tranRec.getFieldValue('entity')
			};
		}
		
	    var searches = tranRec.getFieldValues('custbody_saved_search_processed_flag');
	    
	    var savedSearches = new Array();
	    var index = 0;
	    if (searches != null) {
	        for (; index < searches.length; index++) {
	            savedSearches[index] = searches[index];
	        }
	    }
	    savedSearches[index] = savedSearch;
	    tranRec.setFieldValues('custbody_saved_search_processed_flag', savedSearches);
	    nlapiSubmitRecord(tranRec, true, true);


/**
var rolesArray = contactRoles.split(",");
var found = [];
		if ( rolesArray.length > 0 && rolesArray[0] != '' ) {
			var filterExp = [
			                 ['isinactive', 'is','F'],
			                 'AND',
			                 [
			                  ['customerprimary.internalid', 'anyof', companyID],
			                  'OR',
			                  ['customer.internalid', 'anyof', companyID]
			                  ]
			                 ];
			var searchColumns = [new nlobjSearchColumn('internalid'),
			                     new nlobjSearchColumn('phone'),
			                     new nlobjSearchColumn('email'),
			                     new nlobjSearchColumn('contactrole'),
			                     new nlobjSearchColumn('internalid','customer')];
			
			var bresults = nlapiSearchRecord('contact', null, filterExp, searchColumns);
			for (var b = 0; bresults != null && b < bresults.length; b++) {
				var roleCustomerId = bresults[b].getValue('internalid', 'customer');
				
				if (roleCustomerId == companyID && bresults[b].getText('contactrole')) {
					for (var c = 0; c < rolesArray.length; c++) {
						if ( bresults[b].getText('contactrole') == rolesArray[c]) {
							found.push(bresults[b]);
						}
					}
				}
			}
		}
    
    alert(found);

for (var f = 0; found && f < found.length; f++) {
	var contactID = found[f].getValue('internalid');
	var address = found[f].getValue('email');
	var phone = found[f].getValue('phone');
	alert(contactID+' // '+address+' // '+phone);
	
	//sendEmail(address, contactID, template, returnAddress, addTransaction, tranId, addFile, sendStatement, searchType, 'contact');
	var recType = 'contact';		
	var attachement = new Array();
	var records = [];
	//1/13/2014 - FIX
    //Needs to be transaction NOT estimate to be attached to transaction record.
    records['transaction'] = tranID;
    
	if (addTransaction == 'T') {
		attachement.push(nlapiPrintRecord('TRANSACTION', tranID, 'PDF'));
	}

	if (addFile) {
		attachement.push(nlapiLoadFile(addFile));
	}

	alert(attachement);

	try {
		alert('Email Template ID '+emailTemplate);
	    var emailMerger = nlapiCreateEmailMerger(emailTemplate);
	    //If this passes, this is scripted email template
	    emailMerger.setTransaction(tranID);
	    emailMerger.setEntity(recType,contactID);
	    	
	    //perform merger
	    var emailmr = emailMerger.merge();
	    
		nlapiSendEmail(returnAddress, 'joe.son@audaxium.com', 'TEST:'+emailmr.getSubject(), emailmr.getBody(), EMAIL_CC, EMAIL_BCC, records, attachement);
        alert('Traditional SCRIPTED Mail Merge Email sent to ' + address + emailmr.getSubject() + emailmr.getBody());
	    	
	} catch (scriptedtemperr) {
		if (scriptedtemperr.getDetails().indexOf('not found among FreeMarker templates') > -1) {
	    	//Try sending it out via traditional mail merge
	    	var mailInfo = nlapiMergeRecord(emailTemplate, searchType, tranID, recType, contactID);
	    	
			nlapiSendEmail(returnAddress, 'joe.son@audaxium.com', 'TEST:'+mailInfo.getName(), mailInfo.getValue(), EMAIL_CC, EMAIL_BCC, records, attachement);
	        alert('Traditional CRMSDK Mail Merge Email sent to ' + address + mailInfo.getName() + mailInfo.getValue());
	    } else {
	    		throw nlapiCreateError('MAILMERGE_ERROR','Error performing Mail Merge operation', getErrText(scriptedtemperr));
	    }
	}
}
*/