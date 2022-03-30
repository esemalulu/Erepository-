/*
 ***********************************************************************
 *
 * Mod. Company: Audaxium
 * Mod. Author: joe@audaxium.com
 * File: AX_SSS_RenewalEmailAutomation.js
 * Mod. Date: March 3rd, 2014
 *
 * Reviewed by:
 * Review Date:
 *
 * 1/13/2014 - Enhancement by Joe.Son@Audaxium.com
 * - Make process look up Cash Sales Records
 * - Additional Document To send
 * 		ONLY when email automation rule has file set on the field
 * - Send Statement
 * 		ONLY when email automation rule has this field checked
 * 
 * 6/2/2014 - Bug fix
 * - Issue with contacts being attached to multiple customers returning as contact search result.
 * 		- Defect sends out email to wrong contact.
 * 		- Work around is to execute the search NOT against customer but against contact record and validating to make sure conotacts' customer is transactions customer.
 *
 * 1/24/2015 - Bug fix
 * - Bug was discovered a defect when the script is rescheduled current executions' Failed List doesn't get emailed out.
 *   Additional enhancements are made to add to failed list when run time error occurs.
 * 
 * 2/5/2016 - Enhancement
 * - Add Credit Memo as supported transaction type
 *   
 *
 ***********************************************************************/

var EMAIL_CC = null;
var EMAIL_BCC = null;

var FIELD_STATUS_VALUE_SCHEDULED = 'SCHEDULED';

//MOD. 3/3/2014 - JSON Array to keep track of transaction information.
/**
 * trxJson[transaction Number] = {
				"id":tranId,
				"type":record type,
				"company":linked company name,
				"companyid":linked company ID,
				"errormsg':error detail; cause of failure
			};
 */
var trxJson = {};

//JSON value contains type value to search type mapping.
/**
 * TO Add additional supported transaction types,
 * Add to below JSON object.
 * Testing:
 * 1. Make sure joinref is correctly identified. Most transaction will be customer. 
 * - Depending on transaction, entity referenced in the trx can be different. say employee on expense report
 * 
 * 2. Key is the Transaction Identifier in Search.  
 * - To get the Transaction Identifier in Search, create dummy saved search to include specific trx type you are interested in
 * 	 and load it in debugger.
 * 
 * - Transaction Identifier in Search is different than internal ID of the record.
 * 
 * 3. Create saved search to be used on new email automation rule
 * 
 * 4. Modify this script by executing agaist specific email automation rule.
 * - make sure return validate date function to return true.
 */
var typemap = {
	"CustInvc": {
		"recordid":"invoice",
		"joinref":"customer"
	},
	"CashSale":{
		"recordid":"cashsale",
		"joinref":"customer"
	},
	"Estimate":{
		"recordid":"estimate",
		"joinref":"customer"
	},
	//Added 9/1/2015
	"VendBill":{
		"recordid":"vendorbill",
		"joinref":"vendor"
	},
	//Added 2/5/2015
	"CustCred":{
		"recordid":"creditmemo",
		"joinref":"customer"
	}
	
};

/**
 * This function finds all the email automation records
 * @return null
 **/
function findEmailAutomationRecords(){

    try {
    	
		var columns = [new nlobjSearchColumn('custrecord_saved_search'),
		               new nlobjSearchColumn('custrecord_days_before_end'),
		               new nlobjSearchColumn('custrecord_email_template'),
		               new nlobjSearchColumn('custrecord_reply_email_address'),
		               new nlobjSearchColumn('custrecord_include_transaction'),
		               new nlobjSearchColumn('custrecord_follow_up_call'),
		               new nlobjSearchColumn('custrecord_call_date'),
		               new nlobjSearchColumn('custrecord_contact_roles'),
		               new nlobjSearchColumn('isinactive'),
		               new nlobjSearchColumn('custrecord_alternateroles'),
		               new nlobjSearchColumn('name'),
		               ////1/13/2014 enhancement
		               new nlobjSearchColumn('custrecord_aux_add_doc_to_send'),
		               new nlobjSearchColumn('custrecord_aux_send_statement')];
	    
		//PRODUCTION Filter
		var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		
		//**** WARNING ***** 
		//Below Filter ONLY Uncommented out during TESTING.
		//TEST Against Specific Email Rule
		//var filters = [new nlobjSearchFilter('internalid', null, 'anyof', '8')];
		
	    var results = nlapiSearchRecord('customrecord_email_automation', null, filters, columns);
	    if (results != null && results != '' && results.length > 0) 
	    {
	        for (var i = 0; i < results.length; i++) 
	        {
                if (isValidDay(results[i].getValue('custrecord_days_before_end'))) 
                {
                	//1/13/2014 - Enhancement
                	//log('debug','executing','valid date running');
                	//Parameter Def
                	//savedSearch, template, address, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName, addFile, sendStatement
                    findSavedSearchRecords(results[i].getValue('custrecord_saved_search'), //saved search
						results[i].getValue('custrecord_email_template'), //template to use
						results[i].getValue('custrecord_reply_email_address'), //Reply Email Address (Employee Record)
						results[i].getValue('custrecord_include_transaction'),  //Include transaction checkbox
						results[i].getValue('custrecord_follow_up_call'), //Create follow up call
						results[i].getValue('custrecord_call_date'), //follow up call delay (Number of days to delay from script execution date)
						results[i].getText('custrecord_contact_roles'), //Roles to Email to
						results[i].getText('custrecord_alternateroles'), //Alternate Roles to Email to
						results[i].getValue('name'), //Name of Rule
						results[i].getValue('custrecord_aux_add_doc_to_send'), //Additional file to send as attachment
						results[i].getValue('custrecord_aux_send_statement') //Send Statement checkbox
                    );
                }
	        }
	    }		
	} catch (e) {
		logError('Finding Automation records', e);
		throw nlapiCreateError('EA-ERR', getErrText(e), false);
	}
}

/**
 * This function creates a Phone Call event
 * @return null
 **/
function setupFollowUpCall(company, salesRep, daysAfter, tranID, searchJoin){
	
	try {
	    var callDay = new Date();
		
		// validates if a correct number to avoid Nan/nNan/Nan dates
		if ( daysAfter != null && daysAfter != '' && daysAfter > 0 ) {
			var callDay = nlapiAddDays(callDay, daysAfter);
			if (callDay.getDay() == 0) {
				callDay = nlapiAddDays(callDay, 1);
			} else if (callDay.getDay() == 6) {
				callDay = nlapiAddDays(callDay, 2);
			}
		}
		callDay = nlapiDateToString(callDay);
	    
		//Mod 9/3/2015
		//Added to support Vendor Bill
	    var phone = nlapiLookupField(searchJoin, company, 'phone');
	    
	    var phoneRecord = nlapiCreateRecord('phonecall');
	    phoneRecord.setFieldValue('title', 'Email Automation Follow up call');
	    phoneRecord.setFieldValue('startdate', callDay);
	    phoneRecord.setFieldValue('status', FIELD_STATUS_VALUE_SCHEDULED);
	    phoneRecord.setFieldValue('phone', phone);
	    
	    phoneRecord.setFieldValue('company', company);
	    phoneRecord.setFieldValue('transaction', tranID);
    
        nlapiSubmitRecord(phoneRecord, true, true);
    } catch (e) {
        logError('Create followup call failed for company ' + company, e);
    }
}

/**
 * This function sends an email
 * @return
 *1/13/2014 enhancement
 *	- addFile: ID of file to send
 *	- sendStatement (T or F) to send statement
 *4/21/2014 Update
 *	- recType parameter is passed by calling client. 
 *		This is to support sending email to customer email address based on Main_Company_Email Role
 *		recType of contact or customer is passed in from processRecord function.
 *
 **/
function sendEmail(address, contactID, emailTemplate, returnAddress, addTransaction, tranID, addFile, sendStatement,searchType, recType){

	var attachement = new Array();
	var records = [];
	//1/13/2014 - FIX
    //Needs to be transaction NOT estimate to be attached to transaction record.
    records['transaction'] = tranID;
    
	try {
	    
	    //1/13/2014 - Enhancement. Modify this to an Array
	    if (addTransaction == 'T') {
	    	attachement.push(nlapiPrintRecord('TRANSACTION', tranID, 'PDF'));
	    }

	    //1/13/2014 - Enhancement addFile
	    if (addFile) {
	    	try {
	    		attachement.push(nlapiLoadFile(addFile));
	    	} catch (fileloaderr) {
	    		var esbj = 'Failed to Load File ID '+addFile+' For Transaction '+searchType+': Internal ID: '+tranID;
	    		var emsg = 'Unable to send File ID: '+addFile+' because following error occured:<br/><br/>'+
	    				   getErrText(fileloaderr);
	    		
	    		log('error','Error loading file to send',getErrText(fileloaderr));
	    		//6/9/2016 - must use transactional email to be notified right away
	    		nlapiSendEmail(-5, -5, esbj, emsg, null,null,records,attachment,true);
	    		log('debug','Email Sent to ','-5 user');
	    	}
	    }
	    
	    if (sendStatement=='T') {
	    	try {
	    		//entity
		    	var customerEntity = nlapiLookupField(searchType, tranID, 'entity', false);
		    	log('debug','entity id',customerEntity);
		    	attachement.push(nlapiPrintRecord('STATEMENT',customerEntity,'PDF'));
		    	
	    	} catch (statementerr) {
	    		var sesbj = 'Failed to generate Statement For Customer on Transaction '+searchType+': '+tranID;
	    		var semsg = 'Unable to generate Statement For Customer on Transaction '+searchType+': '+tranID+' because following error occured:<br/><br/>'+
	    				   getErrText(statementerr);
	    		
	    		log('error','Error generator statement',getErrText(statementerr));
	    		//6/9/2016 - must use transactional email to be notified right away
	    		nlapiSendEmail(-5, -5, sesbj, semsg, null,null,records,attachement,true);
	    		log('debug','Email Sent to ','-5 user');
	    	}
	    }
	    
	    //Mod 3/4/2014 - Change this to do mail merge with Transaction record.
	    //var mailInfo = nlapiMergeRecord(emailTemplate, 'contact', contactID);
	    
	    //Mail Merge will be done using Transaction Record AND Contact Record.
	    //Fields from both Transaction AND Contact records can be added
	    
	    //3/25/2015 - Updated to Support Scripted Template Mail Merge Operation
	    try {
	    	//log('debug','Email Template ID', emailTemplate)
	    	var emailMerger = nlapiCreateEmailMerger(emailTemplate);
	    	//If this passes, this is scripted email template
	    	emailMerger.setTransaction(tranID);
	    	emailMerger.setEntity(recType,contactID);
	    	
	    	//perform merger
	    	var emailmr = emailMerger.merge();
	    	//6/9/2016 - must use transactional email to be notified right away
	    	nlapiSendEmail(returnAddress, address, emailmr.getSubject(), emailmr.getBody(), EMAIL_CC, EMAIL_BCC, records, attachement,true);
            //nlapiLogExecution('audit', 'Traditional SCRIPTED Mail Merge','Email sent to ' + address + emailmr.getSubject() + emailmr.getBody());
	    	
	    } catch (scriptedtemperr) {
	    	//log('error','Create Email Merger Error',getErrText(scriptedtemperr));
	    	//Check for error message "not found among FreeMarker templates"
	    	if (getErrText(scriptedtemperr).indexOf('not found among FreeMarker templates') > -1) {
	    		//Try sending it out via traditional mail merge
	    		var mailInfo = nlapiMergeRecord(emailTemplate, searchType, tranID, recType, contactID);
	    	    //address
	    		//6/9/2016 - must use transactional email to be notified right away
	            nlapiSendEmail(returnAddress, address, mailInfo.getName(), mailInfo.getValue(), EMAIL_CC, EMAIL_BCC, records, attachement, true);
	            //nlapiLogExecution('audit', 'Traditional CRMSDK Mail Merge','Email sent to ' + address + mailInfo.getName() + mailInfo.getValue());
	    	} else {
	    		throw nlapiCreateError('MAILMERGE_ERROR','Error performing Mail Merge operation: '+ getErrText(scriptedtemperr),true);
	    	}
	    }
    } catch (e) {
        logError('Email to ' + address + ' failed', e);
        throw nlapiCreateError('ROLE_SENDEMAIL_ERR_', 'Error Actual Sending Email to '+address+' // '+e, true);
    }
}

/**
 * This function sends an email if at least 1 transaction failed
 * @return
 **/
function sendEmailWithFailedTransaction(returnAddress, ruleName, listOfFailedTransaction){

    var subject = 'Failed Results for the ' + ruleName + ' Email Automation Rule';
    var body = 'While performing the ' + ruleName + ' Email Automation Rule, no emails or follow up calls were performed for the following list of transactions:<br/><br/>';
    
	try {
		
		//trxJson
		//3/4/2014 - Send Hyperlinked Transaction Number with Company Name
	    for (var i = 0; i < listOfFailedTransaction.length; i++) {
	    	
	    	var trxNum = listOfFailedTransaction[i];
	    	var detailLine = trxNum;
	    	//when trx details are available
	    	if (trxJson[trxNum]) {
	    		detailLine = '<a href="https://system.netsuite.com'+nlapiResolveURL('RECORD', trxJson[trxNum].type, trxJson[trxNum].id, 'VIEW')+'">'+
	    					 trxNum+'</a>'+
	    					 ' - '+
	    					 trxJson[trxNum].company + ' (Internal ID: '+trxJson[trxNum].companyid+')<br/>&nbsp; &nbsp; &nbsp; <i>Error Message - '+trxJson[trxNum].errormsg+'</i>';
	    	}
	    
	    	
			body += detailLine+'<br/>';
	    }
	    //returnAddress
	    //6/9/2016 - must use transactional email to be notified right away
        nlapiSendEmail(returnAddress, returnAddress, subject, body, EMAIL_CC, EMAIL_BCC,null,null,true);
        nlapiLogExecution('audit', 'Email info'	,'Email sent to : ' + returnAddress + 
									'\nSubject : ' + subject + 
									'\nBody : ' + body);
    } catch (e) {
        logError('Email to ' + returnAddress + ' failed', e);
        throw nlapiCreateError('FAILED_TRX_EMAIL_ERR_CODE', 'Email to ' + returnAddress + ' failed: '+e+' // '+ruleName+' // '+listOfFailedTransaction, false);
    }
}

/**
 * This function saves the search performed on the specified transaction
 * @return null
 **/
function saveProcess(searchType, tranId, searchID){
    try {
		var tranRec = nlapiLoadRecord(searchType, tranId);
		
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
	    savedSearches[index] = searchID;
	    tranRec.setFieldValues('custbody_saved_search_processed_flag', savedSearches);
	    
	    //Catch the error IF saving process automation rule on custom field fails
	    try {
	    	nlapiSubmitRecord(tranRec, true, true);
	    } catch (saveprocerr) {
	    	logError('Save Process failed', saveprocerr);
	    }
	    
	    //--- As Required back up, create processed record
	    //This step is added JUST incase transaction period is closed can not be saved with update against 
	    //custbody_saved_search_processed_flag field on trx record
	    var procRuleRec = nlapiCreateRecord('customrecord_email_automation_proc');
	    procRuleRec.setFieldValue('custrecord_eap_trx', tranId);
	    procRuleRec.setFieldValue('custrecord_eap_procrule_search', searchID);
	    nlapiSubmitRecord(procRuleRec, true, true);
	    
	} catch (e) {
		logError('Save Process', e);
		throw nlapiCreateError('SAVE_RECORD_ERR', 'Error Saving '+tranId+' with processed automation rule // '+e, true);
	}
}

/**
 * This function takes a transaction found by the saved search and performs the emailing necessary
 * @return list of failed transactions
 **/
function processRecord(searchType, tranId, salesRep, savedSearch, companyID, template, returnAddress, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName, listOfFailedTransaction, addFile, sendStatement, customerEmail, searchJoin){

	//log('debug','search type',searchType);
	
	verifyMetering(1000, null, returnAddress, ruleName, listOfFailedTransaction);
	
	var tranName = nlapiLookupField(searchType, tranId, 'tranid');
    try {
		saveProcess(searchType, tranId, savedSearch);
		//log('debug','saved',searchType+' // '+tranId+' Saved');
	    
		//4/21/2014 - Main_Company_Email contact role is flag to use company email address.
		//			  It is NOT a role that is assigned at the contact level
			//log('debug','customerEmail', customerEmail);
			//log('debug','contactRoles', contactRoles);
			//log('debug','alternateRoles', alternateRoles);
		
		var results = executeSearch(contactRoles, companyID, searchJoin);
	    
		var primeCustEmail = false;
		if (contactRoles.indexOf('Main_Company_Email') > -1 && customerEmail) {
			primeCustEmail = true;
		}
		
		var altCustEmail = false;
		if (alternateRoles.indexOf('Main_Company_Email') > -1 && customerEmail) {
			altCustEmail = true;
		}
		
		//log('debug','primeCustEmail', primeCustEmail);
		//log('debug','altCustEmail', altCustEmail);
		if ((results != null && results != '' && results.length > 0) || primeCustEmail) {//send to everyone if no role, send to primary role
	    	
	    	log('debug','Primary Role','Running primary role');
	    	
	        validateAndMail(results, returnAddress, template, returnAddress, addTransaction, tranId, addFile, sendStatement,searchType, primeCustEmail, customerEmail, companyID, searchJoin);
	        // create only 1 follow up call for the first one found
	        if (followup == 'T') {
	            setupFollowUpCall(companyID, returnAddress, callDelay, tranId, searchJoin);
	        }
	    } else {
	    	
	        var results = executeSearch(alternateRoles, companyID,searchJoin);
	        
	        if ((results != null && results != '' && results.length > 0) || altCustEmail) {//all customer
	        	log('debug','Alt Role','Runing Alt role');
	            validateAndMail(results, salesRep, template, returnAddress, addTransaction, tranId, addFile, sendStatement,searchType, altCustEmail, customerEmail,companyID, searchJoin);
	            // create only 1 follow up call for the first one found
	            if (followup == 'T') {
	                setupFollowUpCall(companyID, salesRep, callDelay, tranId, searchJoin);
	            }
	        } else {// No customer, this may happen quite often, not to be alarmed
	        	listOfFailedTransaction.push(tranName);	       
	        	//add to transaction error message
	    		if (trxJson[tranName]) {
	    			trxJson[tranName]['errormsg'] = 'No contact to send transaction to found.';
	    		}
	        }
	    }
	} catch (e) {
		logError('Process records', e);
		//add to transaction error message
		if (trxJson[tranName]) {
			trxJson[tranName]['errormsg'] = getErrText(e);
		}
		listOfFailedTransaction.push(tranName);
	}
   
	return listOfFailedTransaction;
}

/**
 * Function to execute a search on contact, filter if there is role
 * @param {Object} searchColumns
 * @param {Object} searchFilters
 * @return results
 */
function executeSearch(listRoles, companyID, searchJoin){
	var found = [];
	
	try {
		var rolesArray = listRoles.split(",");
		
		if ( rolesArray.length > 0 && rolesArray[0] != '' ) {
			//Make sure Inactive are not pulled.
			//Search form contact.
			/**
			 * Mod: 6/2/2014
			 * - Client discovered a defect where Invoice/Statement is sent to contact who SHOULD NOT have recieved.
			 * issue can happen if a contact is attached to multiple customer records. 
			 * When contact is attached to or has relationship with multiple customer records, 
			 * Contact role search will return contacts with roles for other attached customers. 
			 * 
			 * Resolution is to run search against Contact record and make sure customer relationship returned matches companyID.
			 * 	Filter needs to search for Primary Customer match OR Attachment Customer match
			 */
			
			//Mod 9/2/2015
			//- Based on searchJoin, contact search filter will change.
			//	As of This MODE, there are ONLY two; customer and vendor.
			var parentRefJoinFilter = null;
			if (searchJoin=='customer')
			{
				parentRefJoinFilter= [
										['customerprimary.internalid', 'anyof', companyID],
										'OR',
										['customer.internalid', 'anyof', companyID]
				                     ];
				
			}
			else if (searchJoin=='vendor')
			{
				parentRefJoinFilter= ['vendor.internalid','anyof',companyID];
				                      
			}
			
			var filterExp = [
			                 	['isinactive', 'is','F'],
			                 	'AND',
			                 	parentRefJoinFilter
			                 	
			                 ];
			var searchColumns = [new nlobjSearchColumn('internalid'),
			                     new nlobjSearchColumn('phone'),
			                     new nlobjSearchColumn('email'),
			                     new nlobjSearchColumn('contactrole'),
			                     new nlobjSearchColumn('internalid',searchJoin)];
			
			var results = nlapiSearchRecord('contact', null, filterExp, searchColumns);
			for (var i = 0; results != null && i < results.length; i++) {
				var roleCustomerId = results[i].getValue('internalid', searchJoin);
				
				//If roleCustomerId matches companyID, proceed
				log('debug','Role Customer ID // CompanyID', roleCustomerId+' // '+companyID);
				
				if (roleCustomerId == companyID && results[i].getText('contactrole')) {
					for (var j = 0; j < rolesArray.length; j++) {
						log('debug','contact role text', results[i].getText('contactrole')+' // Email Address: '+results[i].getValue('email'));
						
						//10/16/2015 CHECK TO make Sure Emil address is set 
						
						if ( results[i].getText('contactrole') == rolesArray[j] && results[i].getValue('email')) {
							log('debug','contact role matched','Matched with role array: '+results[i].getText('contactrole'));
							found.push(results[i]);
						}
					}
				}
			}
		}
    } catch (err) {
        logError('Could not find contact', err);
        throw nlapiCreateError('ROLE_SEARCH_ERR_', 'Error Searching contact based on Role: '+listRoles+' with Company ID '+companyID+' // '+err, true); 
    }
    
    return found;
}

/**
 * Function that validate emails to send and it sends the email.
 * @param {Object} results
 * @param {Object} salesRep
 * @param {Object} template
 * @param {Object} returnAddress
 * @param {Object} addTransaction
 * @param {Object} tranId
 * 1/13/2014 enhancement
 * @param {Object} addFile 
 * 			User selected File ID on the Email Automation Record to send.
 * @param {Object} sendStatement
 * 			User provided value of T or F on the Email Automation Record to attach Statement with the email.
 * 
 */
function validateAndMail(results, salesRep, template, returnAddress, addTransaction, tranId, addFile, sendStatement,searchType, sendToMainCompany, customerEmail,companyID, searchJoin){
    try {
    	
    	/**
    	 * Mod 6/2/2014 - executeSearch is now based on contact. 
    	 * 	- Result is no longer returned from Customer and below is the column reference.
    	 * var searchColumns = [new nlobjSearchColumn('internalid'),
			                     new nlobjSearchColumn('phone'),
			                     new nlobjSearchColumn('email'),
			                     new nlobjSearchColumn('contactrole'),
			                     new nlobjSearchColumn('internalid',searchJoin)];
    	 */
    	
    	for (var i = 0; results && i < results.length; i++) 
    	{
	        var contactID = results[i].getValue('internalid');
	        var address = results[i].getValue('email');
	        var phone = results[i].getValue('phone');
	        
	        if (contactID == null || contactID == '') {
	            nlapiLogExecution('error', 'Contact information not found');
	            continue;
	        }
	        
	        if (address == null || address == '') {
	            nlapiLogExecution('error', 'Contact address not found','Contact ID: '+contactID+' // For Trx ID: '+tranId);
	            continue;
	        }
	        
	        log('debug','validate mail ID // address // phone', contactID+' // '+address+' // '+phone);
	        
	        sendEmail(address, contactID, template, returnAddress, addTransaction, tranId, addFile, sendStatement, searchType, 'contact');
	    }
    	
    	//if Main_Company_Email was selected as one of the roles, send it here
    	if (sendToMainCompany && customerEmail) {
    		log('debug','Send to '+searchJoin, 'Sending to '+customerEmail);
    		sendEmail(customerEmail, companyID, template, returnAddress, addTransaction, tranId, addFile, sendStatement, searchType, searchJoin);
    	}
    	
	} catch (e) {
		logError('Mail and validation', e);
		throw nlapiCreateError('ROLE_SENDEMAIL_ERR_', 'Error Sending Email to '+customerEmail+' // '+e, true);
	}
}

/**
 * This function finds all the email automation records
 * @return null
 *
 * 1/13/2014 - Enhancement to send additional files and/or send statement based on email automation rule
 **/
function findSavedSearchRecords(savedSearch, template, address, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName, addFile, sendStatement){

    try {
		
	  //Mod 7/16/2014
	    //Current architecture will ONLY process one of 3 transactions.
	    // Logic is applied in order: Estimate > Invoice > Cash Sale.
	    //		If result is found, rest of the transaction types are NOT processed.
	    // Instead of running three search against specific transaction type, execute the saved search and look for returned results transaction type.
	    
    	//NOTE Added 9/2/2015 
    	//custbody_saved_search_processed_flag on transaction is still used as primary source to search for email automation rule candidate
    	var searchFilters = [new nlobjSearchFilter('custbody_saved_search_processed_flag', null, 'noneof', savedSearch, null),
	                         new nlobjSearchFilter('mainline', null, 'is', 'T', null)];
	    
	    //Mod 9/2/2015
	    //Add in reference to vendor as well.
	    //	- This search is designed to return out reference to both customer and vendor.
	    //	- IF we add PO to be one of processable trx, we need to add employee and possibly partner reference as well
	    var searchColumns = [new nlobjSearchColumn('internalid', 'customer'),
	                         new nlobjSearchColumn('email', 'customer'),
	                         new nlobjSearchColumn('internalid', 'vendor'),
	                         new nlobjSearchColumn('email', 'vendor'),
	                         new nlobjSearchColumn('internalid'),
	                         new nlobjSearchColumn('type')];
	    
	    var results = nlapiSearchRecord(null, savedSearch, searchFilters, searchColumns);
	    
	    //log('debug','typemap', JSON.stringify(typemap));
	    
	    if (results != null && results != '' && results.length > 0) {
	        
	    	//---- We are going to get list of all Transactions and search again Email Automation Processed to see if any are good to process foro THIS savedSearch
	    	//Lookup if this saved search was already executed in the "Email Automation Processed" custom record
            //Go through search result and get list of all Transaction IDs
	    	var trxList = [];
	    	
	    	//THIS JSON tracks Transaction that can be ignored since it was already processed
	    	var trxIgnoreList = {};
	    	
	    	for (var jj=0; jj < results.length; jj++)
	    	{
	    		trxList.push(results[jj].getValue('internalid'));
	    	}
	    	
	    	//Execute search ONCE and build the LIST of Trx to Ignore for THIS Search
	    	var procflt = [new nlobjSearchFilter('custrecord_eap_trx', null, 'anyof', trxList),
                           new nlobjSearchFilter('isinactive', null, 'is', 'F'), 
                           new nlobjSearchFilter('custrecord_eap_procrule_search', null, 'anyof', savedSearch)];
	    	
            var proccol = [new nlobjSearchColumn('custrecord_eap_trx')];
            var procrs = nlapiSearchRecord('customrecord_email_automation_proc', null, procflt, proccol);
            
            for (var ig=0; procrs && ig < procrs.length; ig++) 
            {
            	trxIgnoreList[procrs[ig].getValue('custrecord_eap_trx')] = procrs[ig].getValue('custrecord_eap_trx');
            }
            //log('debug','Ignore List',JSON.stringify(trxIgnoreList));
	    	//--------------------------------------------------------------------------------------------------------------------------------------------------------
            
			var listOfFailedTransaction = new Array();
			
			for (var i = 0; i < results.length; i++) 
			{
				log('debug','Trx Type',results[i].getValue('type'));
				//ONLY process if it's NOT in ignore list
				if (trxIgnoreList[results[i].getValue('internalid')]) 
				{
					log('audit','Ignore Transaction. ', 'Already Processed Transaction ID: '+results[i].getValue('internalid')+' with saved search ID '+savedSearch);
					continue;
				}
				
				//ONLY process Invoice, CashSale or Estimate
				if (!results[i].getValue('type') || !typemap[results[i].getValue('type')]) 
				{
					continue;
				}
				
				log('debug','Processing Trx Type',results[i].getValue('type'));
				
				//set searchType to mapped internal id
				var searchType = typemap[results[i].getValue('type')].recordid;
				
				//Mod 9/2/2015 
				//Join Ref Added to support search reference identifier
				var searchJoin = typemap[results[i].getValue('type')].joinref;
				nlapiLogExecution('debug','Runnin for ',searchType+' // JOIN: '+searchJoin);
				
	            var customer = results[i].getValue('internalid', searchJoin);
	            var tranId = results[i].getValue('internalid');
	            
	            //Mod 9/2/2015
	            //Variable customer and customerEmail can now be customer or vendor
	            if (customer != null && customer != '') {
	            	
	            	var customerEmail = results[i].getValue('email', searchJoin);
	            	
	            	//Mod 9/2/2015
	            	//Pass in searchJoin value for other function to use
	                listOfFailedTransaction = processRecord(searchType, 
	                										tranId, 
	                										address, 
	                										savedSearch, 
	                										customer, 
	                										template, 
	                										address, 
	                										addTransaction, 
	                										followup, 
	                										callDelay, 
	                										contactRoles, 
	                										alternateRoles, 
	                										ruleName, 
	                										listOfFailedTransaction,
	                										addFile, 
	                										sendStatement,
	                										customerEmail,
	                										searchJoin);
	            }
	        }
			if (listOfFailedTransaction != null && listOfFailedTransaction != '') {
                nlapiLogExecution("DEBUG", "listOfFailedTransaction", listOfFailedTransaction);
                sendEmailWithFailedTransaction(address, ruleName, listOfFailedTransaction);
            }
	    }
	} catch (err) {
        logError('Saved search failed or not estimate nor invoice', err);
        throw nlapiCreateError('EA-ERR', getErrText(err), true);
    }
}

/**
 * This function determines if the day is valid and not during a weekend
 **/
// Based on day of the month the email should be sent
// number of days before the end of the month
function isValidDay(daysAhead){
	
	try {
		var today = new Date();
	    
		//Last day of the month is calculated by:
		//1. Set current date to first of current month.
		//2. Add one month  (nlapiAddMonth 1)
		//3. Subtract one day (nlapiAddDays -1)
		var lastDayOfMonth = new Date();
	    lastDayOfMonth.setDate(1);
	    lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1);
	    lastDayOfMonth = nlapiAddDays(lastDayOfMonth, -1);
	    
	    //Subtract NUMBER OF DAYS BEFORE END OF MONTH - 1 day from Last Day of the month.
	    var dayLookedFor = nlapiAddDays(lastDayOfMonth, -(daysAhead - 1));
	    
	    log('debug','today // lastDayofMonth // (daysAhead) dayLookedFor', today+' // '+lastDayOfMonth+' // '+daysAhead+' -- '+dayLookedFor);
	    
	    //As long as dayLookedFor MONTH is AFTER Current Month OR Date is on or after Date of day to looked for date
	    if (today.getMonth() > dayLookedFor.getMonth() || today.getDate() >= dayLookedFor.getDate()) {
	        return true;
	    }
	} catch (e) {
		logError('Check valid day', e);
	}
	
	//For testing, simply return true
	//TESTING Must Always be done in App Account
	//return true;
	
	return false;
}

/**
 * This function verifies if usage metering is getting dangerously low
 * If so, it schedules another execution of the script, then throws an error to kill the current execution
 */
//verifyMetering(140, null, returnAddress, ruleName, listOfFailedTransaction)
function verifyMetering(maxUnits, params, returnAddress, ruleName, listOfFailedTransaction){
    if (isNaN(parseInt(maxUnits, 10))) {
        maxUnits = 1000;
    }
    if (nlapiGetContext().getExecutionContext() == 'scheduled' && nlapiGetContext().getRemainingUsage() <= maxUnits) {
    	
    	sendEmailWithFailedTransaction(returnAddress, ruleName, listOfFailedTransaction);
    	
        nlapiLogExecution('audit', 'verifyMetering()', 'Metering low, scheduling anohter execution: '+nlapiGetContext().getRemainingUsage());
        
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
        throw nlapiCreateError('METERING_LOW_ERR_CODE', 'Usage metering low, another execution has been scheduled. This Error can be ignored', true);
    }

}

/**
 * Processes errors
 * @param {Object} title:		 additional information
 * @param {Object} err:			 error description
 */
function logError(title, err){
	
	nlapiLogExecution('error',title, getErrText(err));

}
