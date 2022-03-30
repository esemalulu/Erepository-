/*
 ***********************************************************************
 *
 * Mod. Company: Audaxium
 * Mod. Author: joe@audaxium.com
 * File: AX_SSS_RenewalEmailAutomation.js
 * Mod. Date: August 1st, 2016
 *
 * Modification being made to include all processing into single function 
 * easy debugging as well as controlling process flow.
 * Email generation to client will occur before record is tagged as processed   
 *
 ***********************************************************************/

var EMAIL_CC = null;
var EMAIL_BCC = null;

var FIELD_STATUS_VALUE_SCHEDULED = 'SCHEDULED';

//CONSTANTS FOR PROCESSED STATUS
var TS_PROCESSED='1',
	TS_COMPLEATE_FAIL='2',
	TS_PARTIAL_FAIL='3';

//MOD. 3/3/2014 - JSON Array to keep track of transaction information.
/**
 * trxFailedJson[procTrxJson.tranid] = {
		'id':procTrxJson.traninternalid,
		'type':procTrxJson.searchtype,
		'entity':procTrxJson.entitytext,
		'entityid':procTrxJson.entity,
		'errormsg':'Unable to find contact(s) to send transaction to.'
   };
 */
var trxFailedJson = {},
	failedTrxList = [],
	failedEmailFromTo = '',
	failedRuleName = '';

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
 * Primary entry functiona call
 * @return null
 **/
function findEmailAutomationRecords()
{
	
	try
	{
		//1. Let's grab list of ALL Email Automation Rules currently active in the system
		var tsrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')],
					  //TESTING
					  //, new nlobjSearchFilter('internalid', null, 'anyof', 6)],
					  
			tsrcol = [new nlobjSearchColumn('custrecord_saved_search'),
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
		              //1/13/2014 enhancement
		              new nlobjSearchColumn('custrecord_aux_add_doc_to_send'),
		              new nlobjSearchColumn('custrecord_aux_send_statement')],
		    //execute search against "Email Automation Rule" custom record.
			tsrrs = nlapiSearchRecord('customrecord_email_automation', null, tsrflt, tsrcol);
		
		//Loop through each Email Automation rule and execute CORE Process
		MAIN_LOOP:
		for (var t=0; tsrrs && t < tsrrs.length; t+=1)
		{
			//reset set for each Email Automation Rules
			failedEmailFromTo = tsrrs[t].getValue('custrecord_reply_email_address');
			failedTrxList = [];
			trxFailedJson = {},
			failedRuleName = tsrrs[t].getValue('name');
			
			//For each Rule, we validate if TODAY is the right day to process the CORE process
			//Based on "Day of the month the email should be sent"
			//1. Calculate Last Day of THIS month based on Current Date.
			//2. Subtract Number of Days Before End of Month from Last Day of the month
			//	 Subtract additiona 1 day from above value. 
			//3. As long as TODAY MONTH > MONTH From #2 OR
			//		 		TODAY DAY > DAY From #2
			var daysBeforeNum = tsrrs[t].getValue('custrecord_days_before_end'),
				curDate = new Date(),
				lastDayOfMonth = new Date();
			
			lastDayOfMonth.setDate(1);
			lastDayOfMonth = nlapiAddMonths(lastDayOfMonth, 1);
		    lastDayOfMonth = nlapiAddDays(lastDayOfMonth, -1);
				
		    //Subtract NUMBER OF DAYS BEFORE END OF MONTH - 1 day from Last Day of the month.
		    var dayLookedFor = nlapiAddDays(lastDayOfMonth, -(parseInt(daysBeforeNum) - 1));
		    
		    //Only process if logic matches
		    //TESTING Logic:
		    //	Just make sure CURRENT MONTH is greater than the number to trigger processing
		    
		    //LIVE Logic:
		    //if (curDate.getMonth() > dayLookedFor.getMonth() || curDate.getDate() >= dayLookedFor.getDate())
		    if (curDate.getMonth() > dayLookedFor.getMonth() || curDate.getDate() >= dayLookedFor.getDate())
		    {
		    	var procJson = {
		    		'ruleid':tsrrs[t].getId(),
		    		'savedsearch':tsrrs[t].getValue('custrecord_saved_search'),
		    		'savedsearchtext':tsrrs[t].getText('custrecord_saved_search'),
		    		'emailtemplate':tsrrs[t].getValue('custrecord_email_template'),
		    		'fromaddress':tsrrs[t].getValue('custrecord_reply_email_address'),
		    		'fromaddresstext':tsrrs[t].getText('custrecord_reply_email_address'),
		    		'addtrx':tsrrs[t].getValue('custrecord_include_transaction'),
		    		'followup':tsrrs[t].getValue('custrecord_follow_up_call'),
		    		'calldelay':tsrrs[t].getValue('custrecord_call_date'),
		    		'contactroles':tsrrs[t].getText('custrecord_contact_roles'),
		    		'alternateroles':tsrrs[t].getText('custrecord_alternateroles'),
		    		'rulename':tsrrs[t].getValue('name'),
		    		'addfile':tsrrs[t].getValue('custrecord_aux_add_doc_to_send'),
		    		'sendstatement':tsrrs[t].getValue('custrecord_aux_send_statement')
		    	};
		    	
		    	//convert contractroles and altrnateroles into an array object
		    	if (procJson.contactroles)
		    	{
		    		procJson.contactroles = procJson.contactroles.split(',');
		    	}
		    	
		    	if (procJson.alternateroles)
		    	{
		    		procJson.alternateroles = procJson.alternateroles.split(',');
		    	}
		    	
		    	//----------------- We start processing of CORE of Transaction SUITE. ------------------------ 
		    	//Mod 7/16/2014
			    //Current architecture will ONLY process one of 3 transactions.
			    // Logic is applied in order: Estimate > Invoice > Cash Sale.
			    //		If result is found, rest of the transaction types are NOT processed.
			    // Instead of running three search against specific transaction type, 
		    	//	execute the saved search and look for returned results transaction type.
			    
		    	//NOTE Added 9/2/2015 
		    	//custbody_saved_search_processed_flag on transaction is still used as primary source to search for email automation rule candidate
		    	//	This is because majority of the times, email automation rule will execute against transactions that are 
		    	//	in Open Accounting Period
		    	var coreflt = [new nlobjSearchFilter('custbody_saved_search_processed_flag', null, 'noneof', procJson.savedsearch),
			                   new nlobjSearchFilter('mainline', null, 'is', 'T', null)];
			    //Mod 9/2/2015
			    //Add in reference to vendor as well.
			    //	- This search is designed to return out reference to both customer and vendor.
			    //	- IF we add PO to be one of processable trx, we need to add employee and possibly partner reference as well
			    var corecols = [new nlobjSearchColumn('internalid', 'customer'),
			                    new nlobjSearchColumn('email', 'customer'),
			                    new nlobjSearchColumn('phone', 'customer'),
			                    new nlobjSearchColumn('internalid', 'vendor'),
			                    new nlobjSearchColumn('email', 'vendor'),
			                    new nlobjSearchColumn('phone', 'vendor'),
			                    new nlobjSearchColumn('internalid'),
			                    new nlobjSearchColumn('type'),
			                    new nlobjSearchColumn('entity'),
			                    new nlobjSearchColumn('custbody_saved_search_processed_flag')];
			    
			    //Execute search against Matched Email Automation Rule Saved Search
			    //	With additional filters and columns added
			    var corers = nlapiSearchRecord(null, procJson.savedsearch, coreflt, corecols),
			    	isRescheduled = false;
		    	
			    //log('debug','procJson',JSON.stringify(procJson));
		    	
			    if (corers && corers.length > 0)
			    {
			    	//---------------- CORE PROCESS PREP ------------------------
				    var coreProcTrxIds = [],
				    	coreProcTrxJson = {};
				    for (var c=0; corers && c < corers.length; c+=1)
				    {
				    	coreProcTrxIds.push(corers[c].getValue('internalid'));
				    }
				    
				    //log('debug','coreProcTrxIds',coreProcTrxIds);
				    
				    //While custbody_saved_search_processed_flag is STILl the primary source to identify
				    //	What TRX got process before, it is possible that this failed out due to 
				    //	Closing of Accounting Period.
				    //	We do this by grabing list of ALL Transactio IDs returned in corers and matching it
				    //	against processed custom record
				    //Lookup and build list of all transactions that may have been processed or failed before.
				    //	Each candidate returned from core search may have already gone through 
				    //Just incare there are more than 1000, run while loop to get ALL!
				    var igtflt = [new nlobjSearchFilter('custrecord_eap_trx', null, 'anyof', coreProcTrxIds),
		                          new nlobjSearchFilter('isinactive', null, 'is', 'F'), 
		                          new nlobjSearchFilter('custrecord_eap_procrule_search', null, 'anyof', procJson.savedsearch)],
				    	igtcol = [new nlobjSearchColumn('internalid'),
				    	          new nlobjSearchColumn('custrecord_eap_trx'),
				    	          new nlobjSearchColumn('custrecord_eap_procrule_search'),
				    	          new nlobjSearchColumn('custrecord_eap_procstatus'),
				    	          new nlobjSearchColumn('custrecord_eap_completedemailforall'),
				    	          new nlobjSearchColumn('custrecord_eap_entitiesrecemails'),
				    	          new nlobjSearchColumn('custrecord_eap_generatedphonecall')],
				    	igtRss = nlapiCreateSearch('customrecord_email_automation_proc', igtflt, igtcol).runSearch(),
				    	maxIndex = 1000,
				    	startIndex = 0,
				    	endIndex = 1000;
				    //Build the coreProcTrxJson object for look up purposes
				    /**
				    [trx internal id]:
				    {
				    	'id':'',
				    	'ruleid':'',
				    	'status':'',
				    	'completedemail':'',
				    	'entitieswithemail':'',
				    	'phonecallid':''
				    }
				    */
				    while (maxIndex==1000) 
				    {
				    	
						//results in THIS set
						var igtrs = igtRss.getResults(startIndex, endIndex);
					
						for (var ig=0; igtrs && ig < igtrs.length; ig++) 
			            {
					    	coreProcTrxJson[igtrs[ig].getValue('custrecord_eap_trx')] = {
					    		'id':igtrs[ig].getValue('internalid'),
					    		'ruleid':igtrs[ig].getValue('custrecord_eap_procrule_search'),
					    		'status':igtrs[ig].getValue('custrecord_eap_procstatus'),
					    		'completedemail':igtrs[ig].getValue('custrecord_eap_completedemailforall'),
					    		'entitieswithemail':igtrs[ig].getValue('custrecord_eap_entitiesrecemails'),
					    		'phonecallid':igtrs[ig].getValue('custrecord_eap_generatedphonecall')
					    	};
			            }
					
						//Increment it to next 1000 set
						maxIndex = igtrs.length;
						startIndex = endIndex;
						endIndex = endIndex + 1000;
					}
				    
				    //log('debug', '--- EAP JSON', JSON.stringify(coreProcTrxJson));
				    
				    //-------------------- CORE PROCESS START for Each Transaction -------------------
				    
				    //WE loop through each result of transaction search defined in the Email Automation Rule and begin processing
				    SEARCH_LOOP:
				    for (var c=0; corers && c < corers.length; c+=1)
				    {
				    	//We Only process those that are NOT in COMPLETELY processed state
				    	// AND
				    	//Transaction Type matches those ALLOWED to be processed
				    	
				    	//First let's decide if we NEED to process this
				    	//	If we have this transaction in already processed custom record, 
				    	//	we mark it to be process as long as the status isn't processed.
				    	var procTrxRecord = false;
				    	if (
				    		!coreProcTrxJson[corers[c].getValue('internalid')] ||
				    		(coreProcTrxJson[corers[c].getValue('internalid')] &&
				    		 coreProcTrxJson[corers[c].getValue('internalid')].status != TS_PROCESSED)
				    	   )
				    	{
				    		procTrxRecord = true;
				    	}
				    	
				    	if (procTrxRecord && typemap[corers[c].getValue('type')]) 
						{
				    		//JSON of processing transaction
				    		var procTrxJson = {
				    			'searchtype':typemap[corers[c].getValue('type')].recordid,
				    			'searchjoin':typemap[corers[c].getValue('type')].joinref,
				    			'entity':corers[c].getValue('entity'),
				    			'entitytext':corers[c].getText('entity'),
				    			'traninternalid':corers[c].getValue('internalid'),
				    			'entityemail':corers[c].getValue('email', typemap[corers[c].getValue('type')].joinref),
				    			'entityphone':corers[c].getValue('phone', typemap[corers[c].getValue('type')].joinref),
				    			'processedrules':corers[c].getValue('custbody_saved_search_processed_flag'),
				    			'tranid':'',
				    			'primeemails':[],
				    			'altemails':[],
				    			'sententityids':[],
				    			'phonecallid':''
				    		};
				    		
				    		//log('debug','---- Core procTrxJson', JSON.stringify(procTrxJson));
				    		
				    		//Look up tranid
				    		procTrxJson.tranid = nlapiLookupField(procTrxJson.searchtype, procTrxJson.traninternalid, 'tranid');
				    		//It's possible tranid value might be empty. 
				    		//in such case, build it as [type]+Internal ID [value of internal id]
				    		if (!procTrxJson.tranid)
				    		{
				    			procTrxJson.tranid = procTrxJson.searchtype+
				    								 ' Internal ID: '+
				    								 procTrxJson.traninternalid;
				    		}
				    		
				    		var primeCustEmail = false;
				    		if (procJson.contactroles.indexOf('Main_Company_Email') > -1 && procTrxJson.entityemail) 
				    		{
				    			primeCustEmail = true;
				    		}
				    		
				    		var altCustEmail = false;
				    		if (procJson.alternateroles.indexOf('Main_Company_Email') > -1 && procTrxJson.entityemail) 
				    		{
				    			altCustEmail = true;
				    		}
				    		
				    		//--------------- Recipient Email Search ---------------------------------------
				    		//Look up recipient email info to send the trx email to 
				    		//4/21/2014 - Main_Company_Email contact role is flag to use company email address.
				    		//			  It is NOT a role that is assigned at the contact level
				    		//	
				    		var parentRefJoinFilter = null;
				    		if (procTrxJson.searchjoin=='customer')
				    		{
				    			parentRefJoinFilter= [
				    									['customerprimary.internalid', 'anyof', procTrxJson.entity],
				    									'OR',
				    									['customer.internalid', 'anyof', procTrxJson.entity]
				    			                     ];
				    			
				    		}
				    		else if (procTrxJson.searchjoin=='vendor')
				    		{
				    			parentRefJoinFilter= ['vendor.internalid','anyof',procTrxJson.entity];
				    			                      
				    		}
				    		
				    		var filterExp = [
				    		                 	['isinactive', 'is','F'],
				    		                 	'AND',
				    		                 	parentRefJoinFilter
				    		                 	
				    		                 ],
				    		    searchColumns = [new nlobjSearchColumn('internalid'),
				    		                     new nlobjSearchColumn('phone'),
				    		                     new nlobjSearchColumn('email'),
				    		                     new nlobjSearchColumn('contactrole'),
				    		                     new nlobjSearchColumn('internalid',procTrxJson.searchjoin)],
				    		
				    		    contactrs = nlapiSearchRecord('contact', null, filterExp, searchColumns);
				    		//Loop through each contract Found and populate primeemails or altemails
				    		//	We run the search Once and programmatically build out emails for each
				    		for (var ct=0; contactrs && ct < contactrs.length; ct+=1)
				    		{
				    			var ctEntityId = contactrs[ct].getValue('internalid', procTrxJson.searchjoin);
				    			//We only care about contact record that matches THIS transactions' entity Value
				    			if (ctEntityId == procTrxJson.entity && 
				    				contactrs[ct].getText('contactrole')) 
				    			{
				    				/**
				    				log(
				    					'debug',
				    					'---- Contact Email Look up', 
				    					'Primary Roles RA: '+procJson.contactroles+
				    					' // Alternate Roles RA: '+procJson.alternateroles+
				    					' // CT Search Role: '+contactrs[ct].getText('contactrole')+' // '+contactrs[ct].getValue('email')
				    				);
				    				*/
				    				
				    				//If This contact Role Matches Email Automation Rules primary role procJson.contactroles
				    				// and it is unique email address
				    				//	Add it to procTrxJson.primeemails
				    				if (procJson.contactroles &&
				    					procJson.contactroles.indexOf(contactrs[ct].getText('contactrole')) > -1 &&
				    					contactrs[ct].getValue('email') && 
				    					!procTrxJson.primeemails.contains(contactrs[ct].getValue('email')))
				    				{
				    					
				    					//log('debug','Prime contact Role Check',procJson.contactroles.indexOf(contactrs[ct].getText('contactrole')));
				    					procTrxJson.primeemails.push({
				    						'contactid':contactrs[ct].getValue('internalid'),
				    						'contactemail':contactrs[ct].getValue('email'),
				    						'rectype':'contact'
				    					});
				    					
				    				}
				    				
				    				//If This contact Role Matches Email Automation Rules alternate role procJson.alternateroles
				    				// and it is unique email address
				    				//	Add it to procTrxJson.primeemails
				    				if (procJson.alternateroles &&
				    					procJson.alternateroles.indexOf(contactrs[ct].getText('contactrole')) > -1 &&
				    					contactrs[ct].getValue('email') && 
				    					!procTrxJson.altemails.contains(contactrs[ct].getValue('email')))
				    				{
				    					//log('debug','Alt contact Role Check',procJson.alternateroles.indexOf(contactrs[ct].getText('contactrole')));
				    					procTrxJson.altemails.push({
				    						'contactid':contactrs[ct].getValue('internalid'),
				    						'contactemail':contactrs[ct].getValue('email'),
				    						'rectype':'contact'
				    					});
				    				}
				    			}
				    		}
				    		
				    		//log('debug','primeemails / altemails', JSON.stringify(procTrxJson.primeemails)+' // '+JSON.stringify(procTrxJson.altemails));
				    		
				    		//----------------- DETERMINE WHO TO SEND TO --------------- 
				    		var sendToArray = [],
				    			sendToEmail = '';
				    		
				    		if (procTrxJson.primeemails.length > 0 || primeCustEmail)
				    		{
				    			sendToArray = procTrxJson.primeemails;
				    			//need to check to make sure it is marked to send to comapny as well
				    			if (primeCustEmail)
				    			{
				    				sendToEmail = procTrxJson.entityemail;
				    			}
				    		}
				    		else if (procTrxJson.altemails.length > 0 || altCustEmail)
				    		{ 
				    			sendToArray = procTrxJson.primeemails;
				    			//need to check to make sure it is marked to send to comapny as well
				    			if (altCustEmail)
				    			{
				    				sendToEmail = procTrxJson.entityemail;
				    			}
				    		}
				    		
				    		//------------------ NO RECEPIENT INFO CHECK ----------------
				    		//log('debug','check for sendToArray', JSON.stringify(sendToArray)+' // '+sendToArray.length+' // sendToEmail: '+sendToEmail);
				    		if (sendToArray.length ==0 && !sendToEmail)
				    		{
				    			//Consider this as an error.
				    			//------- Add to EAP Custom record as Failed --------------
				    			//1. Add to list of failedTrxList that contains tranid value 
				    			//log('error','tranid to error', procTrxJson.tranid);
				    			failedTrxList.push(procTrxJson.tranid);
				    			//2. Add to trxJson
				    			trxFailedJson[procTrxJson.tranid] = {
				    				'id':procTrxJson.traninternalid,
				    				'type':procTrxJson.searchtype,
				    				'entity':procTrxJson.entitytext,
				    				'entityid':procTrxJson.entity,
				    				'errormsg':'Unable to find contact(s) to send transaction to.'
				    			};
				    			
				    			//3. Add to the Email Automation Processed Custom record with this issue.
				    			if (!coreProcTrxJson[procTrxJson.traninternalid])
				    			{
				    				//Create New custom record
				    				var eapRec = nlapiCreateRecord('customrecord_email_automation_proc');
				    				eapRec.setFieldValue('custrecord_eap_procstatus', TS_COMPLEATE_FAIL);
				    				eapRec.setFieldValue('custrecord_eap_procdetail', 'Unable to find contact(s) to send transaction to.');
				    				eapRec.setFieldValue('custrecord_eap_trx', procTrxJson.traninternalid);
				    				eapRec.setFieldValue('custrecord_eap_automationrule', procJson.ruleid);
				    				eapRec.setFieldValue('custrecord_eap_procrule_search', procJson.savedsearch);
				    				nlapiSubmitRecord(eapRec, true, true);
				    			}
				    			else
				    			{
				    				//update it
				    				var updFlds = ['custrecord_eap_procstatus',
				    				               'custrecord_eap_procdetail'],
				    					updVals = [TS_COMPLEATE_FAIL,
				    					           'Unable to find contact(s) to send transaction to.'];
				    				nlapiSubmitField(
				    					'customrecord_email_automation_proc', 
				    					coreProcTrxJson[procTrxJson.traninternalid].id, 
				    					updFlds, 
				    					updVals, 
				    					true
				    				);
				    			}
				    		}
				    		else
				    		{
				    			//---------------------- SEND OUT EMAIL --------------------
				    			//	If Send to Email value is set, add to sendToArray
				    			//	with contactid as entity id
				    			if (sendToEmail)
				    			{
				    				sendToArray.push({
				    					'contactid':procTrxJson.entity,
				    					'contactemail':sendToEmail,
				    					'rectype':procTrxJson.searchjoin
				    				});
				    			}
				    			//We send out the email to each contactID in the sendToArray
				    			//1. Loop through and send to Each contacts.
				    			//		each element contains JSON element {contactid:'', contactemai:'', rectype:''}
				    			
				    			//keep track of email sent
				    			var sentToEmailAddresses = [];
				    			try
				    			{
				    				
				    				//VERY Possible that there may be Memorized Transactions in here.
				    				//	these are identified by tranid of "Memorized"
				    				//	We do the check here and throw the error so that they can be properly updated 
				    				if (procTrxJson.tranid == 'Memorized')
				    				{
				    					throw nlapiCreateError(
				    								'MEMORIZED_TRX_ERROR',
				    								'This transaction is Memorized Transaction and can not be processed.',
				    								true
				    						  );
				    				}
				    				
				    				var attachments = [],
				    					records = {
				    						'transaction':procTrxJson.traninternalid
				    					};
				    				
				    				//If Email Automation Rule was marked as attach printed version, attach it.
				    				//log('debug','check addtrx', procJson.addtrx);
				    				if (procJson.addtrx == 'T')
				    				{
				    					attachments.push(nlapiPrintRecord('TRANSACTION', procTrxJson.traninternalid,'PDF'));
				    				}
				    				
				    				//If additional files were marked to be attached, load them and add to attachment
				    				//log('debug','check additional files', procJson.addfile);
				    				if (procJson.addfile)
				    				{
				    					attachments.push(nlapiLoadFile(procJson.addfile));
				    				}
				    				
				    				//If user requested statement to be sent, generate it and attach it
				    				//log('debug','check send statement', procJson.sendstatement);
				    				if (procJson.sendstatement == 'T')
				    				{
				    					try
				    					{
				    						attachments.push(nlapiPrintRecord('STATEMENT',procTrxJson.entity,'PDF'));
				    					}
				    					catch(stmterr)
				    					{
				    						//Some Entity such as vendor bill does NOT have statements.
				    						//	ignore the error for now 
				    						log('error','WARNING - Unable to generate statement', 'Unable to generate statement');
				    					}
				    					
				    				}
				    				
				    				//log('debug','attachments', 'number of attch '+attachments.length, 'attached');
				    				//log('debug','records to attach', 'Record to attch to '+JSON.stringify(records));
				    				
				    				for(var st=0; st < sendToArray.length; st+=1)
					    			{
					    				var ctjson = sendToArray[st],
					    					procEmailGen = true;
					    				
					    				//log('debug','Check to see if email was sent to this contact first','We need to make sure of this ');
					    				if (coreProcTrxJson[procTrxJson.traninternalid] &&
					    					coreProcTrxJson[procTrxJson.traninternalid].entitieswithemail)
						    			{
					    					//log('debug','Checking to entity','check '+ctjson.contactid);
					    					
					    					var sentIds = coreProcTrxJson[procTrxJson.traninternalid].entitieswithemail.split(',');
					    					
					    					if (sentIds.indexOf(ctjson.contactid) > -1)
					    					{
					    						procEmailGen = false;
					    						
					    						log('debug','Already sent','sent ids: '+sentIds+' // this ctid: '+ctjson.contactid);
					    					}
					    				}
					    				
					    				if (procEmailGen)
					    				{
					    					//All checking and prepping is done. 
						    				//Send out the email.
						    				//Mod 3/4/2014 - Change this to do mail merge with Transaction record.
						    			    //var mailInfo = nlapiMergeRecord(emailTemplate, 'contact', contactID);
						    			    
						    			    //Mail Merge will be done using Transaction Record AND Contact Record.
						    			    //Fields from both Transaction AND Contact records can be added
						    			    
						    			    //3/25/2015 - Updated to Support Scripted Template Mail Merge Operation
						    			    try 
						    			    {
						    			    	//log('debug','Email Template ID', emailTemplate)
						    			    	var emailMerger = nlapiCreateEmailMerger(procJson.emailtemplate);
						    			    	//If this passes, this is scripted email template
						    			    	emailMerger.setTransaction(procTrxJson.traninternalid);
						    			    	emailMerger.setEntity(ctjson.rectype,ctjson.contactid);
						    			    	
						    			    	//perform merger
						    			    	var emailmr = emailMerger.merge();
						    			    	//6/9/2016 - must use transactional email to be notified right away
						    			    	nlapiSendEmail(
						    			    		procJson.fromaddress, 
						    			    		ctjson.contactid, 
						    			    		emailmr.getSubject(), 
						    			    		emailmr.getBody(), 
						    			    		EMAIL_CC, 
						    			    		EMAIL_BCC, 
						    			    		records, 
						    			    		attachments,
						    			    		true
						    			    	);
						    		            //log('debug','>>>> Send via scriptable mail template', 'from: '+procJson.fromaddress+' // to: '+ctjson.contactid);
						    			    } 
						    			    catch (scriptedtemperr) 
						    			    {
						    			    	//log('error','Create Email Merger Error',getErrText(scriptedtemperr));
						    			    	//Check for error message "not found among FreeMarker templates"
						    			    	
						    			    	//TODO: We MUST Remove this section of the code Once EVERYONEs' Upgrade is completed
						    			    	//If it errors out, have it error out complete.
						    			    	
						    			    	if (getErrText(scriptedtemperr).indexOf('not found among FreeMarker templates') > -1) 
						    			    	{
						    			    		//Try sending it out via traditional mail merge
						    			    		var mailInfo = nlapiMergeRecord(
						    			    							procJson.emailtemplate, 
						    			    							procTrxJson.searchtype, 
						    			    							procTrxJson.traninternalid, 
						    			    							ctjson.rectype, 
						    			    							ctjson.contactid
						    			    					   );
						    			    	    //address
						    			    		//6/9/2016 - must use transactional email to be notified right away
						    			            nlapiSendEmail(
						    			            	procJson.fromaddress, 
						    			            	ctjson.contactid, 
						    			            	mailInfo.getName(), 
						    			            	mailInfo.getValue(), 
						    			            	EMAIL_CC, 
						    			            	EMAIL_BCC, 
						    			            	records, 
						    			            	attachments, 
						    			            	true
						    			            );
						    			            //log('debug','>>>> Send via CRMSDK mail template', 'from: '+procJson.fromaddress+' // to: '+ctjson.contactid);
						    			    	} 
						    			    	else 
						    			    	{
						    			    		//throw the error and let it get caught as error
						    			    		throw nlapiCreateError('MAILMERGE_ERROR','Error performing Mail Merge and Email operation: '+ getErrText(scriptedtemperr),true);
						    			    	}
						    			    }
						    				
					    				} //End Check to see if we already sent to this contact before
					    				
					    				sentToEmailAddresses.push(ctjson.contactemail);
					    				
					    				//Add to procTrxJson.sententityids
					    				procTrxJson.sententityids.push(ctjson.contactid);
					    				
					    			}
				    				
				    				log('debug','sent emails', sentToEmailAddresses);
				    				
				    				//------------- Email Generation is DONE. CHECK for Follow Up Call Setting --------
				    				if (procJson.followup == 'T')
				    				{
				    					//We only want to process if it didn't have phone call already generated
				    					if (coreProcTrxJson[procTrxJson.traninternalid] &&
						    				!coreProcTrxJson[procTrxJson.traninternalid].phonecallid)
							    		{
				    						try 
					    					{
					    					    var callDay = new Date();
					    						
					    						// validates if a correct number to avoid Nan/nNan/Nan dates
					    						if ( procJson.calldelay && !isNaN(procJson.calldelay) && parseInt(procJson.calldelay) > 0) 
					    						{
					    							callDay = nlapiAddDays(callDay, procJson.calldelay);
					    							//Check for weekend
					    							if (callDay.getDay() == 0) 
					    							{
					    								callDay = nlapiAddDays(callDay, 1);
					    							} 
					    							else if (callDay.getDay() == 6) 
					    							{
					    								callDay = nlapiAddDays(callDay, 2);
					    							}
					    						}
					    						callDay = nlapiDateToString(callDay);
					    					    
					    						//Mod 9/3/2015
					    						//Added to support Vendor Bill
					    					    var phoneRecord = nlapiCreateRecord('phonecall');
					    					    phoneRecord.setFieldValue('title', 'Email Automation Follow up call');
					    					    phoneRecord.setFieldValue('startdate', callDay);
					    					    phoneRecord.setFieldValue('status', FIELD_STATUS_VALUE_SCHEDULED);
					    					    phoneRecord.setFieldValue('phone', procTrxJson.phone);
					    					    
					    					    phoneRecord.setFieldValue('company', procTrxJson.entity);
					    					    phoneRecord.setFieldValue('transaction', procTrxJson.traninternalid);
					    				    
					    				        var phoneRecId = nlapiSubmitRecord(phoneRecord, true, true);
					    				        
					    				        //log('debug', '>>>> Phone Created', phoneRecId);
					    				        
					    				        //Add to procTrxJson.phonecallid
					    				        procTrxJson.phonecallid = phoneRecId;
					    				    }
					    					catch (e) 
					    					{
					    				       throw nlapiCreateError(
					    				    		   'PHONE_CALL_ERROR',
					    				    		   'Emails SENT with Error Creating Followup Call: '+ getErrText(e),
					    				    		   true
					    				    		 );
					    				    }
							    		}
				    					else
				    					{
				    						//Only set it if there is a value
				    						if (coreProcTrxJson[procTrxJson.traninternalid])
				    						{
				    							procTrxJson.phonecallid = coreProcTrxJson[procTrxJson.traninternalid].phonecallid;
				    						}
				    						
				    					}//check for already generated phone call
				    					
				    				}//End Phone Call Create
				    				
				    				//---------------- ALL DONE. MARK THIS Transaction as COMPLETED
				    				//1. Mark the Transaction with Processed Saved Search
				    				var curProcSearchIds = procTrxJson.processedrules;
				    				if (curProcSearchIds)
				    				{
				    					curProcSearchIds = curProcSearchIds.split(',');
				    				}
				    				else
				    				{
				    					curProcSearchIds = [];
				    				}
				    				
				    				//Add to curProcSearchIds array
				    				curProcSearchIds.push(procJson.savedsearch);
				    				
				    				//1. Add/Update to the Email Automation Processed Custom record with success
				    				try
				    				{
				    					
				    					if (!coreProcTrxJson[procTrxJson.traninternalid])
						    			{
						    				//Create New custom record
						    				var eapRec = nlapiCreateRecord('customrecord_email_automation_proc');
						    				eapRec.setFieldValue('custrecord_eap_procstatus', TS_PROCESSED);
						    				eapRec.setFieldValue('custrecord_eap_procdetail', 'Successfully Processed Transaction against Email Automation rule');
						    				eapRec.setFieldValue('custrecord_eap_trx', procTrxJson.traninternalid);
						    				eapRec.setFieldValue('custrecord_eap_automationrule', procJson.ruleid);
						    				eapRec.setFieldValue('custrecord_eap_procrule_search', procJson.savedsearch);
						    				eapRec.setFieldValues('custrecord_eap_entitiesrecemails', procTrxJson.sententityids);
						    				eapRec.setFieldValue('custrecord_eap_completedemailforall', 'T');
						    				eapRec.setFieldValue('custrecord_eap_generatedphonecall', procTrxJson.phonecallid);
						    				
						    				nlapiSubmitRecord(eapRec, true, true);
						    			}
						    			else
						    			{
						    				//update it
						    				var updFlds = ['custrecord_eap_procstatus',
						    				               'custrecord_eap_procdetail',
						    				               'custrecord_eap_completedemailforall',
						    				               'custrecord_eap_generatedphonecall',
						    				               'custrecord_eap_entitiesrecemails'],
						    					updVals = [TS_PROCESSED,
						    					           'Successfully Processed Transaction against Email Automation rule',
						    					           'T',
						    					           procTrxJson.phonecallid,
						    					           procTrxJson.sententityids];
						    									    				
						    				nlapiSubmitField(
						    					'customrecord_email_automation_proc', 
						    					coreProcTrxJson[procTrxJson.traninternalid].id, 
						    					updFlds, 
						    					updVals, 
						    					true
						    				);
						    			}
				    					
				    					log('debug','Email Automation Record Created/Updated',procTrxJson.traninternalid+' saved with value of '+curProcSearchIds);
				    				}
				    				catch (rptcreateerr)
				    				{
				    					throw nlapiCreateError(
				    						'RPT_SAVE_ERROR',
					    					'Emails and Followup Calls (If required) PROCESSED Successfully but Failed to create '+
					    						'"Email Automation Processed" custom record  with processed saved search: '+ getErrText(rptcreateerr),
					    					true
					    				);
				    				}
				    				
					    			//2. Try to Update the Transaction as Email process.
					    			//	Order is being changed because it is more important to have the
					    			//	Reporting table created
					    			try
				    				{
				    					nlapiSubmitField(
				    						procTrxJson.searchtype, 
				    						procTrxJson.traninternalid, 
				    						'custbody_saved_search_processed_flag', 
				    						curProcSearchIds, 
				    						false
				    					);
				    					
				    					log('debug','transaction saved',procTrxJson.traninternalid+' saved with value of '+curProcSearchIds);
				    				}
				    				catch(trxsaveerr)
				    				{
				    					
				    					//8/28/2016 
				    					//	Check to see if Error is INSUFFICIENT_PERMISSION error.
				    					//	and ONLY throw the error when it is NOT INSUFFICIENT_PERMISSION error
				    					if (getErrText(trxsaveerr).indexOf('INSUFFICIENT_PERMISSION') < 0)
				    					{
				    						throw nlapiCreateError(
				    							'TRX_SAVE_ERROR',
					    						'Emails and Followup Calls (If required) PROCESSED Successfully but Failed '+
					    							'to save transaction with processed saved search: '+ getErrText(trxsaveerr),
					    						true
					    					);
				    					}
				    					else
				    					{
				    						log('error','WARNING: Unable to Save Transaction', 'Accounting Period Maybe Closed for Trx ID '+procTrxJson.traninternalid);
				    					}
				    				}
				    				
				    			}
				    			catch (emailerr)
				    			{
				    				var errMessage = 'No Emails were generated due to error \n'+
				    								 'Error:' +getErrText(emailerr),
				    					procStatus = TS_COMPLEATE_FAIL,
				    					//all Emails are presumed to have been processed.
				    					allEmailsSent = 'F';
				    				
				    				//Process Step specific error message
				    				if (getErrText(emailerr).indexOf('MEMORIZED_TRX_ERROR') > -1)
				    				{
				    					errMessage = 'This transaction is Memorized Transaction.'+
				    								 ' Please update your search to NOT Include Memorized Transaction for processing. '+
				    								 'Error: '+getErrText(emailerr);
	    					
				    					procStatus = TS_COMPLEATE_FAIL;
				    				
				    				}
				    				else if (getErrText(emailerr).indexOf('MAILMERGE_ERROR') > -1)
				    				{
				    					//If one or more emails were sent, show it on the error detail
					    				if (sentToEmailAddresses.length > 0)
					    				{
					    					errMessage = 'There were multiple emails identified as recepient.  '+
					    								 'Failure occured for one of the email while others were successfull\n\n'+
					    								 'Successfully Sent Email Addresses: '+sentToEmailAddresses+'\n\n'+
					    								 'Error: '+getErrText(emailerr);
					    					
					    					procStatus = TS_PARTIAL_FAIL;
					    				}
				    				}
				    				else if (getErrText(emailerr).indexOf('PHONE_CALL_ERROR') > -1)
				    				{
				    					errMessage = 'ALL EMAILS Were Generated Successfully BUT Failed to Create Follow up phone call\n\n'
				    								 'Error: '+getErrText(emailerr);
				    					
				    					procStatus = TS_PARTIAL_FAIL;
				    					
				    					allEmailsSent = 'T';
				    				}
				    				else if (getErrText(emailerr).indexOf('TRX_SAVE_ERROR') > -1)
				    				{
				    					errMessage = 'Process completed for Emails and/or Phone Calls but Failed to Save Transaction with Processed Automation Rule. \n\n'+
		    								 		 'Error: '+getErrText(emailerr);
		    					
				    					procStatus = TS_PARTIAL_FAIL;
				    					
				    					allEmailsSent = 'T';
				    				}
				    				else if (getErrText(emailerr).indexOf('RPT_SAVE_ERROR') > -1)
				    				{
				    					errMessage = 'Process completed for Emails and/or Phone Calls but Failed to Create "Email Automation Processed" Custom Record'+
				    								 ' with Processed Automation Rule. \n\n'+
				    								 'Error: '+getErrText(emailerr);
				    				
				    					procStatus = TS_PARTIAL_FAIL;
							
				    					allEmailsSent = 'T';
				    				}
				    				
				    				//1. Add to list of failedTrxList that contains tranid value 
					    			log('error','Failed to Process Email/Phone Call', 'Trx Number: '+procTrxJson.tranid+' // Error: '+errMessage);
					    			failedTrxList.push(procTrxJson.tranid);
					    			//2. Add to trxJson
					    			trxFailedJson[procTrxJson.tranid] = {
					    				'id':procTrxJson.traninternalid,
					    				'type':procTrxJson.searchtype,
					    				'entity':procTrxJson.entitytext,
					    				'entityid':procTrxJson.entity,
					    				'errormsg':errMessage
					    			};
					    			
					    			//2. Add to the Email Automation Processed Custom record with this issue.
					    			if (!coreProcTrxJson[procTrxJson.traninternalid])
					    			{
					    				//Create New custom record
					    				var eapRec = nlapiCreateRecord('customrecord_email_automation_proc');
					    				eapRec.setFieldValue('custrecord_eap_procstatus', procStatus);
					    				eapRec.setFieldValue('custrecord_eap_procdetail', errMessage);
					    				eapRec.setFieldValue('custrecord_eap_trx', procTrxJson.traninternalid);
					    				eapRec.setFieldValue('custrecord_eap_automationrule', procJson.ruleid);
					    				eapRec.setFieldValue('custrecord_eap_procrule_search', procJson.savedsearch);
					    				if (procTrxJson.sententityids.length > 0)
					    				{
					    					eapRec.setFieldValues('custrecord_eap_entitiesrecemails', procTrxJson.sententityids);
					    				}
					    				eapRec.setFieldValue('custrecord_eap_completedemailforall', allEmailsSent);
					    				eapRec.setFieldValue('custrecord_eap_generatedphonecall', procTrxJson.phonecallid);
					    				
					    				nlapiSubmitRecord(eapRec, true, true);
					    			}
					    			else
					    			{
					    				//update it
					    				var updFlds = ['custrecord_eap_procstatus',
					    				               'custrecord_eap_procdetail',
					    				               'custrecord_eap_completedemailforall',
					    				               'custrecord_eap_generatedphonecall'],
					    					updVals = [procStatus,
					    					           errMessage,
					    					           allEmailsSent,
					    					           procTrxJson.phonecallid];
					    				
					    				if (procTrxJson.sententityids.length > 0)
					    				{
					    					updFlds.push('custrecord_eap_entitiesrecemails');
					    					updVals.push(procTrxJson.sententityids);
					    				}
					    				
					    				nlapiSubmitField(
					    					'customrecord_email_automation_proc', 
					    					coreProcTrxJson[procTrxJson.traninternalid].id, 
					    					updFlds, 
					    					updVals, 
					    					true
					    				);
					    			}
				    			}//End Process Error Processing
				    			
				    		}
				    		
				    		//log('debug', '>>>> trxJson <<< ', JSON.stringify(trxFailedJson));
				    		
						}
				    	else
				    	{
				    		log(
				    			'audit',
				    			'Transaction Internal ID '+corers[c].getValue('internalid')+' Already processed', 
				    			JSON.stringify(coreProcTrxJson[corers[c].getValue('internalid')])
				    		);
				    	}//End Check for Ignore and process trx types
				    
				    	//log('debug','<<<<< Search Loop >>>>', c);
				    	
				    	//TESTING
				    	//if (c == 5)
				    	//{
				    	//	isRescheduled = true;
				    	//	break SEARCH_LOOP;
				    	//}
				    	//TESTING
				    	
				    	//------Check for Reschedule logic here
				    	//When it reschedules, it will break out of SEARCH_LOOP
				    	//Set % completed of script processing
						var pctCompleted = Math.round(((c+1) / corers.length) * 100);
						nlapiGetContext().setPercentComplete(pctCompleted);
						
						log('debug','Remaining usage', 'Rule Name: '+procJson.rulename+'Trx Internal ID: '+corers[c].getId()+' // Usage Left: '+nlapiGetContext().getRemainingUsage());
						
						if ((c+1)==1000 || ((c+1) < corers.length && nlapiGetContext().getRemainingUsage() < 1000)) 
						{
							//reschedule
							isRescheduled = true;
							nlapiLogExecution('debug','Getting Rescheduled at', corers[c].getId());
							nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
							break SEARCH_LOOP;
						}
				    	
				    				    	
				    }//End Loop for corers processing SEARCH_LOOP
				    
				    //Generate failed trx email
				    //At this point, send out the Failed Email Transaction.
				    //IF it was rescheduled, break out of MAIN_LOOP
				    if (failedTrxList.length > 0)
				    {
				    	var failedTrxSbj = 'Failed Results for the '+
				    					   failedRuleName+
				    					   ' Email Automation Rule',
				    		failedTrxBody = 'One or more failures occured while attempting to process Email and/or Follow up call creations:',
				    		failedList = '';
				    	
				    	//Loop through trxFailedJson and add in the details
				    	for (var ftj in trxFailedJson)
				    	{
				    		var htmlErrMsg = strGlobalReplace(trxFailedJson[ftj].errormsg, '\\n', '<br/>');
				    		
				    		failedList += '<li>'+
				    					  trxFailedJson[ftj].type+' '+trxFailedJson[ftj].id+'<br/>'+
				    					  'Company Name (ID): '+
				    					  trxFailedJson[ftj].entity+' ('+trxFailedJson[ftj].entityid+')<br/>'+
				    					  'Error: <br/>'+
				    					  htmlErrMsg+
				    					  '</li>';
				    	}
				    	failedTrxBody = '<ul>'+
				    					failedList+
				    					'</ul>';
				    	
				    	nlapiSendEmail(
				    		failedEmailFromTo, 
				    		failedEmailFromTo, 
				    		failedTrxSbj, 
				    		failedTrxBody, 
				    		null, 
				    		null, 
				    		null, 
				    		null, 
				    		true
				    	);
				    	
				    	//If rescheduled, break out of MAIN_LOOP
				    	if (isRescheduled)
				    	{
				    		break MAIN_LOOP;
				    	}
				    }
			    }//end check for corers size
			    
		    }//End Date Logic Check
		}//End MAIN_LOOP For loop
		
		
	}
	catch(procerr)
	{
		log('error', 'Processing Failed due to unexpected error', getErrText(procerr));
		
		//If we have value in failedTrxList, generate and send the list
		if (failedTrxList.length > 0)
		{
			var failedTrxSbj = 'Failed Results for the '+
							   failedRuleName+
							   ' Email Automation Rule',
				failedTrxBody = 'Unexpected error occured while processing Transaction suite and terminated the scheduled process.'+
								'Unexpected Error:<br/>'+
								getErrText(procerr)+
								'<br/><br/>'+
								'Before The error, One or more failures occured while attempting to process Email and/or Follow up call creations:',
				failedList = '';
				
				//Loop through trxFailedJson and add in the details
				for (var ftj in trxFailedJson)
				{
				var htmlErrMsg = strGlobalReplace(trxFailedJson[ftj].errormsg, '\\n', '<br/>');
				
				failedList += '<li>'+
							  trxFailedJson[ftj].type+' '+trxFailedJson[ftj].id+'<br/>'+
							  'Company Name (ID): '+
							  trxFailedJson[ftj].entity+' ('+trxFailedJson[ftj].entityid+')<br/>'+
							  'Error: <br/>'+
							  htmlErrMsg+
							  '</li>';
				}
				failedTrxBody = '<ul>'+
							failedList+
							'</ul>';
				
				nlapiSendEmail(
				failedEmailFromTo, 
				failedEmailFromTo, 
				failedTrxSbj, 
				failedTrxBody, 
				null, 
				null, 
				null, 
				null, 
				true
				);
		}
		
		//Throw the error
		throw nlapiCreateError(
			'TS-ERR', 
			'Unexpected Error during processing: '+getErrText(procerr), 
			true
		);
	}
}
