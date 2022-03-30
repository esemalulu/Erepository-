/**
 * Data clean up to run as needed basis to.
 * 1. Run PardotUnlistList
 * 	- This once ran this will set the check box to indicate it's ready for removal
 * 
 * 2. backupAndDeleteCleanupRecords
 */

//Sandbox: at the time of deployment, Pardot List script ID was 80 and Backup/Delete script ID was 81.
//	In Production, Pardot List Script ID is 93.
//				   Backup/Delete Script ID is 94
//	IF Sandbox is refreshed and this process fails, it is due to difference in ID.

var ctx = nlapiGetContext();
//Last processed ID for Pardot Unlist process
var LAST_PROC_CUSTOMER_PARAM = 'custscript_lastproc_93pulist';
//Last processed ID for Backup and Delete process
var LAST_PROC_CUSTOMER_PARAM2 = 'custscript_lastproc_94bkdel';

//Company level parameters
// - To be processed entity status
var PURGE_RECORD_STATUS = 'custscript_purgestatus_93cleanup';
// - Folder ID to store data clean up related files
var PURGE_FOLDER_ID = 'custscript_storagefolder_93cleanup';
//	- Primary Notifier: Employee Record
var PURGE_PRIME_NOTIF = 'custscript_primenotif_93cleanup';
//	- Comma Separated list of additional emails.
var PURGE_ADDITIONAL_NOTIF = 'custscript_secondnotif_93cleanup';

if (nlapiGetContext().getEnvironment()=='SANDBOX') {
	//Last processed ID for Pardot Unlist process
	LAST_PROC_CUSTOMER_PARAM = 'custscript_lastproc_80pulist';
	//Last processed ID for Backup and Delete process
	LAST_PROC_CUSTOMER_PARAM2 = 'custscript_lastproc_81bkdel';

	//Company level parameters
	// - To be processed entity status
	PURGE_RECORD_STATUS = 'custscript_purgestatus_80cleanup';
	// - Folder ID to store data clean up related files
	PURGE_FOLDER_ID = 'custscript_storagefolder_80cleanup';
//		- Primary Notifier: Employee Record
	PURGE_PRIME_NOTIF = 'custscript_primenotif_80cleanup';
//		- Comma Separated list of additional emails.
	PURGE_ADDITIONAL_NOTIF = 'custscript_secondnotif_80cleanup';
}

var lastProcessedCustomerId = '';

var purgeRecStatus='';
var purgeFolderId='';
var purgePrimaryNotifier='';
var purgeAdditionialNotifiers=null;

var counter = 1;
var rsltSet = null;

var csvPardotToUnlist = nlapiGetContext().getEnvironment()+'-EmailToUnlist-Pardot-';
var csvPardotToUnlistHeader = 'EmailAddress\n';
var csvPardotToUnlistBody = '';

//Customer/Lead/Prospect Record backup header, body and file name
var customerRecBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-CustomerToBeRemoved-';
var customerRecHeader = 'Status, Log, Internal ID, Entity ID, Stage, Status, Company Name, First Name, Last Name, Email, Phone, Bill Address 1, Bill Address 2, Bill Zip, Ship Address 1, Ship Address 2, Ship Zip, '+
						'Inactive, Sales Rep, Channel Tier, Lead Source, Industry/Vertical, A.K.A, ULR(Web Address)\n';
var customerRecBody = '';

//Contact backup header, body and file name
var ctBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-ContactsRemovedOrUnattached-';
var ctCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Action Taken, Primary Companny, First Name, Last Name, Email, Phone, Title\n';
var ctCsvBody = '';

//Email backup header, body and file name
var emailBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-EmailsRemoved-';
var emailCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Email Date, Type, Author, Author Email, Recipient, Recipient Email, CC, BCC, Subject, Message Body\n';
var emailCsvBody = '';

//Activity backup header, body and file name
var activityBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-ActivitiesRemoved-';
var activityCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Type, Start Date, Completed Date, Assigned To, Title, Note/Message\n';
var activityCsvBody = '';

//Marketing Subscription backup header, body and file name
var mktSubBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-MarketingSubscription-';
var mktSubCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Subscription, Subscription Date, Subscription Status\n';
var mktSubCsvBody = '';

//User Note backup header, body and file name
var noteBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-UserNoteRemoved-';
var noteCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Type, Note Date, Author, Direction, Note Title, Note\n';
var noteCsvBody = '';

//File backup header, body and file name
var fileBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-FilesBackup-';
var fileCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, File Type, Folder, Name, Description, URL\n';
var fileCsvBody = '';

//TODO: Request additional information on Following:
//1 Do we want to DELETE any records with related support tickets? If so what fields would you like to back up?
//2 Some records seems to have linked Partner Records. Do we delete Partner record and what fields to backup?


/**
 * Gets CSV value. 
 * Get Text value first. If Text Value is null, get Value
 * @param _obj
 */
function getDataValue(_rs,_col) {
	if (_rs) {
		if (_rs.getText(_col)) {
			return _rs.getText(_col);
		}
		
		return _rs.getValue(_col);
	}
	
	return '';
}

/**
 * Entry function for processing pardot unlist generation *****************************************************************************
 */
function pardotUnlistList() {
	
	var startProcInternalId = '';
	try {
		
		//new nlobjSearchFilter('entitystatus', null, 'anyof',PURGE_RECORD_STATUS),
        		
		//get any script parameter
		lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM);
		purgeRecStatus=ctx.getSetting('SCRIPT',PURGE_RECORD_STATUS);
		purgeFolderId=ctx.getSetting('SCRIPT',PURGE_FOLDER_ID);
		purgePrimaryNotifier=ctx.getSetting('SCRIPT',PURGE_PRIME_NOTIF);
		purgeAdditionialNotifiers=(ctx.getSetting('SCRIPT',PURGE_ADDITIONAL_NOTIF)?ctx.getSetting('SCRIPT',PURGE_ADDITIONAL_NOTIF).split(','):null);
		
		log('debug','Parameter Values', 'status: '+purgeRecStatus+' // folder id: '+purgeFolderId+' // Prime N: '+purgePrimaryNotifier+' // Additional N: '+purgeAdditionialNotifiers);
		
		//define search - Original List to look for all For Deletion customer/prospects/lead records
		//					AND 
		//				  Not Yet Processed for Pardot
		var flt = [new nlobjSearchFilter('entitystatus', null, 'anyof',purgeRecStatus),
		           new nlobjSearchFilter('custentity_datacleanup_pardotlistproc',null, 'is','F')];
		
		//check to see if last processed id is present.
		if (lastProcessedCustomerId) {
			//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
			flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
		}
	
		var col = [new nlobjSearchColumn('internalid').setSort(true),
		           new nlobjSearchColumn('email')];
		
		var lvl2col = [new nlobjSearchColumn('internalid').setSort(true),
		               new nlobjSearchColumn('entityid'),
		               new nlobjSearchColumn('email'),
		               new nlobjSearchColumn('internalid','contact'),
		               new nlobjSearchColumn('email','contact'),
		               new nlobjSearchColumn('company','contact')];
		
		var rslt = nlapiSearchRecord('customer',null,flt,col);
		
		//List of Email Addresses that needs to be pushed into Pardot for unassignment
		var pardotEmailList = new Array();
		
		for (var i=0; rslt && i < rslt.length; i++) {
			
			log('debug','>>>>> Processing Customer ID ','>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ID: '+rslt[i].getValue('internalid')+' // Customer Level Email: '+rslt[i].getValue('email'));
			if (i==0) {
				startProcInternalId = rslt[i].getValue('internalid');
				log('debug','Starting at Internal ID',startProcInternalId);
			}
			
			//If email exists for customer level, do uniqueness search here
			if (rslt[i].getValue('email')) {
				var lvl2aexpflt = [
						              ['entitystatus', 'noneof',purgeRecStatus],
						              'and',
						              [
						               ['email','is',rslt[i].getValue('email')],
						               'or',
						               ['contact.email','is',rslt[i].getValue('email')]
						              ]
				              	 ];
				var lvl2aexpcol = [new nlobjSearchColumn('internalid'),
					               new nlobjSearchColumn('entityid'),
					               new nlobjSearchColumn('email'),
					               new nlobjSearchColumn('email','contact')];
				//Search OUT side of dataset and see if there are MORE than one.
				//IF NO Results are returned, it needs to be added.
				var lvl2aexprs = nlapiSearchRecord('customer', null, lvl2aexpflt, lvl2aexpcol);
				if (!lvl2aexprs) {
					if (!pardotEmailList.contains(rslt[i].getValue('email'))) {
						//log('debug','> LVL 2a: '+rslt[i].getValue('internalid',null,'group'),'> No Results found for Customer Level Email. Unique. Add to Pardot List');
						pardotEmailList.push(rslt[i].getValue('email'));
						csvPardotToUnlistBody += rslt[i].getValue('email')+'\n';
					}
				} else {
					//This is for debugging and validation purposes. Comment out once in production
					for (var n=0; n < lvl2aexprs.length; n++) {
						log('debug','> LVL 2a: '+lvl2aexprs[n].getValue('internalid'),'> Company Email match outside: '+lvl2aexprs[n].getValue('email','contact'));
					}
				}
			}
			
			
			//Begin Level 2 search for all CONTACTs for THIS Customer marked to be deleted
			var lvl2flt = [new nlobjSearchFilter('entitystatus', null, 'anyof',purgeRecStatus),
			               new nlobjSearchFilter('internalid', null, 'anyof', rslt[i].getValue('internalid'))];
			
			//run secondary search to grab all results
			var lvl2rs = nlapiSearchRecord('customer', null, lvl2flt, lvl2col);
			
			//list of contacts to UN-Attach instead of deleting
			//var unattachContacts = new Array();
			for (var j=0; lvl2rs && j < lvl2rs.length; j++) {
				//Run 3rd search for Company level Email or Contact Email OUTSIDE of dataset.
				if (lvl2rs[j].getValue('email','contact')) {
					
					//log('debug','>>> LVL 2: '+lvl2rs[j].getValue('internalid'),'>>> Contact Email: '+lvl2rs[j].getValue('email','contact'));
					
					//Run Expression filter search 
					var expflt = [
					              ['entitystatus', 'noneof',purgeRecStatus],
					              'and',
					              [
					               ['email','is',lvl2rs[j].getValue('email','contact')],
					               'or',
					               ['contact.email','is',lvl2rs[j].getValue('email','contact')]
					              ]
					             ];
					var expcol = [new nlobjSearchColumn('internalid'),
					              new nlobjSearchColumn('entityid'),
					              new nlobjSearchColumn('email'),
					              new nlobjSearchColumn('email','contact')];
					//Search OUT side of dataset and see if there are MORE than one.
					//IF NO Results are returned, it needs to be added.
					var exprs = nlapiSearchRecord('customer', null, expflt, expcol);
					if (!exprs) {
						if (!pardotEmailList.contains(lvl2rs[j].getValue('email','contact'))) {
							log('debug','> LVL 3: '+lvl2rs[j].getValue('internalid'),'> No Results found. Unique. Add to Pardot List');
							pardotEmailList.push(lvl2rs[j].getValue('email','contact'));
							csvPardotToUnlistBody += lvl2rs[j].getValue('email','contact')+'\n';	
						}
					} else {
						//Validation purposes. IN production remove
						for (var k=0; exprs && k < exprs.length; k++) {
							log('debug','> LVL 3: '+exprs[k].getValue('internalid'),'> Contact Email: '+exprs[k].getValue('email','contact'));
						}
					}								
				} else{
					//THIS Can be deleted without any pardot action becuase there are NOT email address
					log('debug','>>> LVL 2: '+lvl2rs[j].getValue('internalid'),'>>> No Email for Company and Contact ');
				}
			}
			
			//Set this Customer/Lead/Prospect record as pardot processed and update contacts to unattach
			//
			var updflds = ['custentity_datacleanup_pardotlistproc'];
			var updvals = ['T'];
			nlapiSubmitField('customer', rslt[i].getValue('internalid'), updflds, updvals, false);
						
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
			ctx.setPercentComplete(pctCompleted);
			
			log('debug','Left Over Usage', ctx.getRemainingUsage());
			
			//Reschedule logic
			if ((i+1)==1000 || ((i+1) < rslt.length && ctx.getRemainingUsage() < 500)) {
				//reschedule
				log('debug','Rescheduling','Rescheduling after '+rslt[i].getValue('internalid'));
				var rparam = new Object();
				rparam[LAST_PROC_CUSTOMER_PARAM] = rslt[i].getValue('internalid');
				nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), rparam);
				break;
			}
		}
		
		log('debug','Pardot List',pardotEmailList);
		
		if (csvPardotToUnlistBody) {
			//at this point, create CSV of processed records
			var rightNow = new Date();
			var milsecTime = rightNow.getTime(); // for uniqueness
			var fileName = csvPardotToUnlist + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
			var csvFileObj = nlapiCreateFile(fileName, 'CSV', csvPardotToUnlistHeader + csvPardotToUnlistBody);
			csvFileObj.setFolder(purgeFolderId);
			nlapiSubmitFile(csvFileObj);
			
			var sbj = ctx.getEnvironment()+'- Pardot Unlist Generated';
			var msg = 'Attached is CSV to send to Pardot to process mass sales rep unassignment. <br/><br/>'+
					  fileName+' also stored under AUX: Data Clean up Related Files Folder';
			nlapiSendEmail(3707, purgePrimaryNotifier, sbj, msg, purgeAdditionialNotifiers, null, null, csvFileObj);
		}
	
	} catch (procerr) {
		log('error','Errored while processing Pardot','Internal ID Failed at'+startProcInternalId+' // ERROR: '+getErrText(procerr));
		throw nlapiCreateError('DTCLEAN-PardotListErr', getErrText(procerr), false);
	}
}


function backupAndDeleteCleanupRecords() {
	//get any script parameter
	lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM2);
	purgeRecStatus=ctx.getSetting('SCRIPT',PURGE_RECORD_STATUS);
	purgeFolderId=ctx.getSetting('SCRIPT',PURGE_FOLDER_ID);
	purgePrimaryNotifier=ctx.getSetting('SCRIPT',PURGE_PRIME_NOTIF);
	purgeAdditionialNotifiers=(ctx.getSetting('SCRIPT',PURGE_ADDITIONAL_NOTIF)?ctx.getSetting('SCRIPT',PURGE_ADDITIONAL_NOTIF).split(','):null);
	
	log('debug','Backup/Delete Parameter Values', 'status: '+purgeRecStatus+' // folder id: '+purgeFolderId+' // Prime N: '+purgePrimaryNotifier+' // Additional N: '+purgeAdditionialNotifiers);
	
	//define search - Original List to look for all To be Purged customer/prospects/lead records
	//					AND 
	//				  Processed for Pardot
	var flt = [new nlobjSearchFilter('entitystatus', null, 'anyof',purgeRecStatus),
	           new nlobjSearchFilter('custentity_datacleanup_pardotlistproc',null, 'is','T')];

	//check to see if last processed id is present.
	if (lastProcessedCustomerId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
	}

	var col = [new nlobjSearchColumn('internalid').setSort(true),
	           new nlobjSearchColumn('stage'),
	           new nlobjSearchColumn('entitystatus'),
	           new nlobjSearchColumn('entityid'), //Entity ID
	           new nlobjSearchColumn('companyname'), //Company Name
	           new nlobjSearchColumn('firstname'), //First Name
	           new nlobjSearchColumn('lastname'), //Last Name
	           new nlobjSearchColumn('email'), //Email
	           new nlobjSearchColumn('phone'), //Phone
	           new nlobjSearchColumn('billaddress1'), //bill Address 1
	           new nlobjSearchColumn('billaddress2'), //bill Address 2
	           new nlobjSearchColumn('billzipcode'), //bill Zipcode
	           new nlobjSearchColumn('shipaddress1'), //bill Address 1
	           new nlobjSearchColumn('shipaddress2'), //bill Address 2
	           new nlobjSearchColumn('shipzip'), //bill Zipcode
	           new nlobjSearchColumn('custentity_date_lsa'), //Last Sales Activity
	           new nlobjSearchColumn('isinactive'), // is inacitve
	           new nlobjSearchColumn('salesrep'), //Sales Rep
	           new nlobjSearchColumn('custentity_customer_channel_tier'), //Channel Tier
	           new nlobjSearchColumn('leadsource'), //Lead Source
	           new nlobjSearchColumn('custentity33'), //Industry/Vertical\
	           new nlobjSearchColumn('custentity12'), //A.K.A
	           new nlobjSearchColumn('url')];

	
	var rslt = nlapiSearchRecord('customer', null, flt, col);
		
	for (var i=0; rslt && i < rslt.length; i++) {
		
		if (i==0) {
			log('debug','BK and Delete Starting at Internal ID',rslt[i].getValue('internalid'));
		}
		
		//Filter used for all child record search
		var relflt = [new nlobjSearchFilter('internalid', null, 'anyof',rslt[i].getValue('internalid'))];
		
		//00. Check for Transaction FIRST. If Transaction Exists, DO NOT Delete and Continue
		var trxcol = [new nlobjSearchColumn('internalid', null,'group'),
		              new nlobjSearchColumn('internalid','transaction','count')];
		//search to see if this customer has any matching transaction records
		var trxrs = nlapiSearchRecord('customer', null, relflt, trxcol);
		log('debug','transaction count for '+rslt[i].getValue('internalid'), trxrs[0].getValue('internalid','transaction','count'));
		
		//if record has trx, mark it and continue to next
		if (parseInt(trxrs[0].getValue('internalid','transaction','count')) > 0) {
			
			//Update the Cuustomer record with Error log
			nlapiSubmitField('customer', rslt[i].getValue('internalid'), 'custentity_datacleanup_error', 'Has '+trxrs[0].getValue('internalid','transaction','count')+' transactions', false);
			
			customerRecBody += '"Delete Failed",'+'"Has transactions",'+'"'+rslt[i].getValue('internalid')+'",'+
			 				   '"'+rslt[i].getValue('entityid')+'",'+
			 				   '"'+rslt[i].getValue('stage')+'",'+
			 				   '"'+rslt[i].getText('entitystatus')+'",'+
			 				   '"'+rslt[i].getValue('companyname')+'",'+
			 				   '"'+rslt[i].getValue('firstname')+'",'+
			 				   '"'+rslt[i].getValue('lastname')+'",'+
			 				   '"'+rslt[i].getValue('email')+'",'+
			 				   '"'+rslt[i].getValue('phone')+'",'+
			 				   '"'+rslt[i].getValue('billaddress1')+'",'+
			 				   '"'+rslt[i].getValue('billaddress2')+'",'+
			 				  '"'+rslt[i].getValue('billzipcode')+'",'+
			 				 '"'+rslt[i].getValue('shipaddress1')+'",'+
			 				'"'+rslt[i].getValue('shipaddress2')+'",'+
			 				'"'+rslt[i].getValue('shipzip')+'",'+
			 				'"'+rslt[i].getValue('isinactive')+'",'+
			 				'"'+rslt[i].getText('salesrep')+'",'+
			 				'"'+rslt[i].getText('custentity_customer_channel_tier')+'",'+
			 				'"'+rslt[i].getText('leadsource')+'",'+
			 				'"'+rslt[i].getText('custentity33')+'",'+
			 				'"'+rslt[i].getValue('custentity12')+'",'+
			 				'"'+rslt[i].getValue('url')+'"\n';
			continue;
		}
		
		
		//01. Check for linked Support cases
		var casecol = [new nlobjSearchColumn('internalid', null, 'group'),
		               new nlobjSearchColumn('internalid','case','count')];
		var casers = nlapiSearchRecord('customer',null,relflt, casecol);
		//if record has trx, mark it and continue to next
		if (parseInt(casers[0].getValue('internalid','case','count')) > 0) {
			
			//Update the Cuustomer record with Error log
			nlapiSubmitField('customer', rslt[i].getValue('internalid'), 'custentity_datacleanup_error', 'Has '+casers[0].getValue('internalid','case','count')+' support cases', false);
			
			customerRecBody += '"Delete Failed",'+'"Has Cases",'+'"'+rslt[i].getValue('internalid')+'",'+
			 				   '"'+rslt[i].getValue('entityid')+'",'+
			 				   '"'+rslt[i].getValue('stage')+'",'+
			 				   '"'+rslt[i].getText('entitystatus')+'",'+
			 				   '"'+rslt[i].getValue('companyname')+'",'+
			 				   '"'+rslt[i].getValue('firstname')+'",'+
			 				   '"'+rslt[i].getValue('lastname')+'",'+
			 				   '"'+rslt[i].getValue('email')+'",'+
			 				   '"'+rslt[i].getValue('phone')+'",'+
			 				   '"'+rslt[i].getValue('billaddress1')+'",'+
			 				   '"'+rslt[i].getValue('billaddress2')+'",'+
			 				  '"'+rslt[i].getValue('billzipcode')+'",'+
			 				 '"'+rslt[i].getValue('shipaddress1')+'",'+
			 				'"'+rslt[i].getValue('shipaddress2')+'",'+
			 				'"'+rslt[i].getValue('shipzip')+'",'+
			 				'"'+rslt[i].getValue('isinactive')+'",'+
			 				'"'+rslt[i].getText('salesrep')+'",'+
			 				'"'+rslt[i].getText('custentity_customer_channel_tier')+'",'+
			 				'"'+rslt[i].getText('leadsource')+'",'+
			 				'"'+rslt[i].getText('custentity33')+'",'+
			 				'"'+rslt[i].getValue('custentity12')+'",'+
			 				'"'+rslt[i].getValue('url')+'"\n';
			continue;
		}
		
		
		//1. Email Message backup and delete
		var msgcol = [
		              new nlobjSearchColumn('internalid','messages').setSort(true), //index 0
		              new nlobjSearchColumn('messagetype','messages'), //index 1
		              new nlobjSearchColumn('subject','messages'), //index 2
		              new nlobjSearchColumn('message','messages'), //3
		              new nlobjSearchColumn('author','messages'), //4
		              new nlobjSearchColumn('authoremail','messages'), //5
		              new nlobjSearchColumn('recipient','messages'), //6
		              new nlobjSearchColumn('recipientemail','messages'), //7
		              new nlobjSearchColumn('cc','messages'), //8
		              new nlobjSearchColumn('bcc','messages'), //9
		              new nlobjSearchColumn('messagedate','messages') //10
					 ];
		var msgrs = nlapiSearchRecord('customer',null,relflt, msgcol);
		var msgcols = (msgrs)?msgrs[0].getAllColumns():new Array();
		for (var m=0; msgrs && m < msgrs.length; m++) {
			//build CSV backup for Email
			if (msgrs[m].getValue('internalid','messages')) {
				
				var sbj = '', msg='';
				if (msgrs[m].getValue(msgcols[2])) {
					sbj = strGlobalReplace(msgrs[m].getValue(msgcols[2]), '"', '\'\''); 
				}
				
				if (msgrs[m].getValue(msgcols[3])) {
					msg = strGlobalReplace(msgrs[m].getValue(msgcols[3]), '"', '\'\''); 
				}
				
				//TODO:Delete Email
				var emailStatus = '', emailLog='';
				
				try {
					nlapiDeleteRecord('message', msgrs[m].getValue('internalid','messages'));
					emailStatus = 'Delete Success';
				} catch (emaildelerr) {
					emailStatus = 'Delete Failed';
					emailLog = getErrText(emaildelerr);
				}
				
				emailCsvBody += '"'+emailStatus+'",'+'"'+emailLog+'",'+'"'+rslt[i].getValue('internalid')+'",'+
				 '"'+rslt[i].getValue('entityid')+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[0])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[10])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[1])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[4])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[5])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[6])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[7])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[8])+'",'+
				 '"'+getDataValue(msgrs[m], msgcols[9])+'",'+
				 '"'+sbj+'",'+
				 '"'+msg+'"\n';
			}
		}
		
		//2. Activities backup and delete
		var actcol = [
		              new nlobjSearchColumn('internalid','activity').setSort(true), //index 0
		              new nlobjSearchColumn('type','activity'), //index 1
		              new nlobjSearchColumn('title','activity'), //index 2
		              new nlobjSearchColumn('message','activity'), //3
		              new nlobjSearchColumn('assigned','activity'), //4
		              new nlobjSearchColumn('startdate','activity'), //5
		              new nlobjSearchColumn('completeddate','activity'), //6
					 ];
		var actrs = nlapiSearchRecord('customer',null,relflt, actcol);
		var actcols = (actrs)?actrs[0].getAllColumns():new Array();
		
		for (var a=0; actrs && a < actrs.length; a++) {
			//build CSV backup for Activities
			if (actrs[a].getValue(actcols[0])) {
				var title = '', note='', taskdesc = '';
				if (actrs[a].getValue(actcols[2])) {
					title = strGlobalReplace(actrs[a].getValue(actcols[2]), '"', '\'\''); 
				}
				
				if (actrs[a].getValue(actcols[3])) {
					note = strGlobalReplace(actrs[a].getValue(actcols[3]), '"', '\'\''); 
				}
				
				var actStatus = '', actLog='';
				
				var actrectype = 'activity';
				try {
					//Deleting activity causes issue.
					//Try deleting by 'type','activity'
					if (getDataValue(actrs[a], actcols[1])=='Phone Call') {
						actrectype = 'phonecall';
					} else if (getDataValue(actrs[a], actcols[1])=='Task') {
						actrectype = 'task';
					} else if (getDataValue(actrs[a], actcols[1])=='Event') {
						actrectype = 'calendarevent';
					}
					nlapiDeleteRecord(actrectype, actrs[a].getValue(actcols[0]));
					actStatus = 'Delete Success';
				} catch (actdelerr) {
					actStatus = 'Delete Failed';
					actLog = getErrText(actdelerr);
				}
				
				activityCsvBody += '"'+actStatus+'",'+
								   '"'+actLog+'",'+
								   '"'+rslt[i].getValue('internalid')+'",'+
								   '"'+rslt[i].getValue('entityid')+'",'+
								   '"'+actrectype+'",'+
								   '"'+getDataValue(actrs[a], actcols[4])+'",'+
								   '"'+getDataValue(actrs[a], actcols[5])+'",'+
								   '"'+getDataValue(actrs[a], actcols[6])+'",'+
								   '"'+title+'",'+
								   '"'+note+'"\n';
				
			}
						 
		}

		//3. Marketing Subscription backup
		var mrcol = [
		              new nlobjSearchColumn('subscription').setSort(true), //index 0
		              new nlobjSearchColumn('subscriptiondate'), //index 1
		              new nlobjSearchColumn('subscriptionstatus') //index 2
					 ];
		var mrrs = nlapiSearchRecord('customer',null,relflt, mrcol);
		var mrcols = (mrrs)?mrrs[0].getAllColumns():new Array();
		
		for (var m=0; mrrs && m < mrrs.length; m++) {
			//build CSV backup for Marketing Subscriptioin
			mktSubCsvBody += '"Backup Success",'+'"No Deletion Necessary",'+'"'+rslt[i].getValue('internalid')+'",'+
							 '"'+rslt[i].getValue('entityid')+'",'+
							 '"'+getDataValue(mrrs[m], mrcols[0])+'",'+
							 '"'+getDataValue(mrrs[m], mrcols[1])+'",'+
							 '"'+getDataValue(mrrs[m], mrcols[2])+'"\n';
						 
		}
		
		//4. User Note backup and delete
		var notecol = [
		              new nlobjSearchColumn('internalid','userNotes').setSort(true), //index 0
		              new nlobjSearchColumn('author','userNotes'), //index 1
		              new nlobjSearchColumn('title','userNotes'), //index 2
		              new nlobjSearchColumn('note','userNotes'), //3
		              new nlobjSearchColumn('notetype','userNotes'), //4
		              new nlobjSearchColumn('notedate','userNotes'), //5
		              new nlobjSearchColumn('direction','userNotes') //6
					 ];
		var noters = nlapiSearchRecord('customer',null,relflt, notecol);
		var notecols = (noters)?noters[0].getAllColumns():new Array();
		
		for (var un=0; noters && un < noters.length; un++) {
			//build CSV backup for Note
			if (noters[un].getValue(notecols[0])) {
				var ntitle = '', nnote='';
				if (noters[un].getValue(notecols[2])) {
					ntitle = strGlobalReplace(noters[un].getValue(notecols[2]), '"', '\'\''); 
				}
				
				if (noters[un].getValue(notecols[3])) {
					nnote = strGlobalReplace(noters[un].getValue(notecols[3]), '"', '\'\''); 
				}
				
				var usernoteStatus = '', usernoteLog='';
				
				try {
					nlapiDeleteRecord('note', noters[un].getValue(notecols[0]));
					usernoteStatus = 'Delete Success';
				} catch (usernotedelerr) {
					usernoteStatus = 'Delete Failed';
					usernoteLog = getErrText(usernotedelerr);
				}
				
				noteCsvBody += '"'+usernoteStatus+'",'+'"'+usernoteLog+'",'+'"'+rslt[i].getValue('internalid')+'",'+
							   '"'+rslt[i].getValue('entityid')+'",'+
							   '"'+getDataValue(noters[un], notecols[4])+'",'+
							   '"'+getDataValue(noters[un], notecols[5])+'",'+
							   '"'+getDataValue(noters[un], notecols[1])+'",'+
							   '"'+getDataValue(noters[un], notecols[6])+'",'+
							   '"'+ntitle+'",'+
							   '"'+nnote+'"\n';
			}						 
		}
		
		//5. File backup. NO need to delete the files. Just log location of the file
		var filecol = [
		              new nlobjSearchColumn('internalid','file').setSort(true), //index 0
		              new nlobjSearchColumn('name','file'), //index 1
		              new nlobjSearchColumn('folder','file'), //index 2
		              new nlobjSearchColumn('description','file'), //3
		              new nlobjSearchColumn('filetype','file'), //4
		              new nlobjSearchColumn('url','file') //5
					 ];
		var filers = nlapiSearchRecord('customer',null,relflt, filecol);
		var filecols = (filers)?filers[0].getAllColumns():new Array();
		
		for (var f=0; filers && f < filers.length; f++) {
			//build CSV backup for Note
			if (filers[f].getValue(filecols[0])) {
				
				var fname = '', fdesc='';
				if (filers[f].getValue(filecols[1])) {
					fname = strGlobalReplace(filers[f].getValue(filecols[1]), '"', '\'\''); 
				}
				
				if (filers[f].getValue(filecols[3])) {
					fdesc = strGlobalReplace(filers[f].getValue(filecols[3]), '"', '\'\''); 
				}
				
				fileCsvBody += '"Success",'+'"No Delete Necessary",'+'"'+rslt[i].getValue('internalid')+'",'+
							   '"'+rslt[i].getValue('entityid')+'",'+
							   '"'+getDataValue(filers[f], filecols[4])+'",'+
							   '"'+getDataValue(filers[f], filecols[2])+'",'+
							   '"'+fname+'",'+
							   '"'+fdesc+'",'+
							   '"'+getDataValue(filers[f], filecols[5])+'"\n';
			}
						 
		}
		
		//7. Delete or Unattach contact record linked to THIS customer/lead/prospect record.
		var ctcol = [new nlobjSearchColumn('internalid','contact').setSort(true), //0
		             new nlobjSearchColumn('email','contact'), //1
		             new nlobjSearchColumn('phone','contact'), //2
		             new nlobjSearchColumn('company','contact'), //3
		             new nlobjSearchColumn('firstname','contact'), //4
		             new nlobjSearchColumn('lastname','contact'), //5
		             new nlobjSearchColumn('title','contact') //6
					];
		var ctrs = nlapiSearchRecord('customer', null, relflt, ctcol);
		var ctcols = (ctrs)?ctrs[0].getAllColumns():new Array();
		
		for (var ct=0; ctrs && ct < ctrs.length; ct++) {
			//build CSV backup for Note
			if (ctrs[ct].getValue(ctcols[0])) {
				
				var action = 'Delete';
				//log('debug','contact company',ctrs[ct].getValue('company','contact'));
				if (rslt[i].getValue('internalid') != ctrs[ct].getValue('company','contact')) {
					action = 'Unattach';
				}
				
				//Try delete or detach
				var contactdStatus='', contactdLog='';
				if (action == 'Delete') {
					try {
						nlapiDeleteRecord('contact', ctrs[ct].getValue(ctcols[0]));
						contactdStatus = 'Delete Success';
					} catch (contactderr) {
						contactdStatus = 'Delete Failed';
						contactdLog = getErrText(contactderr);
						try {
							nlapiDetachRecord('contact', ctrs[ct].getValue(ctcols[0]), 'customer', rslt[i].getValue('internalid'));
							contactdStatus = '(Delete Failed) Detach Success';
						} catch (contactderr) {
							contactdStatus = '(Delete Failed) Detach Failed';
							contactdLog = getErrText(contactderr);
						}
					}
				} else {
					try {
						//nlapiDetachRecord('contact', ctrs[ct].getValue(ctcols[0]), 'customer', rslt[i].getValue('internalid'));
						contactdStatus = 'Detach Success';
					} catch (contactderr) {
						contactdStatus = 'Detach Failed';
						contactdLog = getErrText(contactderr);
					}
				}
				
				ctCsvBody += '"'+contactdStatus+'",'+'"'+contactdLog+'",'+'"'+rslt[i].getValue('internalid')+'",'+
							   '"'+rslt[i].getValue('entityid')+'",'+
							   '"'+action+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[3])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[4])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[5])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[1])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[2])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[6])+'"\n';
			}
						 
		}
		
		
		//0. Build Customer backup file. Search Against Last Sales Activity Record
		var custStatus = '', custLog='';
		
		//REMOVE partner references if any
		/*
		var custRec = nlapiLoadRecord('customer',rslt[i].getValue('internalid'));
		var partnerCount = custRec.getLineItemCount('partners');
		for (var p=1; p <= partnerCount; p++) {
			custRec.removeLineItem('partners', p);
		}
		*/
		
		try {
			nlapiDeleteRecord('customer', rslt[i].getValue('internalid'));
			custStatus = 'Delete Success';
		} catch (custdelerr) {
			custStatus = 'Delete Failed';
			custLog = getErrText(custdelerr);
			
			//Check to see if this was deleted as part of contact delete. If so mark it as success
			if (getErrText(custdelerr).indexOf('RCRD_DSNT_EXIST') > -1) {
				custStatus = 'Delete Success';
				custLog = 'NO record exists. Delete as part of contact delete';
			} else {
				//Update the Cuustomer record with Error log
				nlapiSubmitField('customer', rslt[i].getValue('internalid'), 'custentity_datacleanup_error', getErrText(custdelerr), false);
			}
		}
		
		customerRecBody += '"'+custStatus+'",'+'"'+custLog+'",'+'"'+rslt[i].getValue('internalid')+'",'+
		 				   '"'+rslt[i].getValue('entityid')+'",'+
		 				   '"'+rslt[i].getValue('stage')+'",'+
		 				   '"'+rslt[i].getText('entitystatus')+'",'+
		 				   '"'+rslt[i].getValue('companyname')+'",'+
		 				   '"'+rslt[i].getValue('firstname')+'",'+
		 				   '"'+rslt[i].getValue('lastname')+'",'+
		 				   '"'+rslt[i].getValue('email')+'",'+
		 				   '"'+rslt[i].getValue('phone')+'",'+
		 				   '"'+rslt[i].getValue('billaddress1')+'",'+
		 				   '"'+rslt[i].getValue('billaddress2')+'",'+
		 				  '"'+rslt[i].getValue('billzipcode')+'",'+
		 				 '"'+rslt[i].getValue('shipaddress1')+'",'+
		 				'"'+rslt[i].getValue('shipaddress2')+'",'+
		 				'"'+rslt[i].getValue('shipzip')+'",'+
		 				'"'+rslt[i].getValue('isinactive')+'",'+
		 				'"'+rslt[i].getText('salesrep')+'",'+
		 				'"'+rslt[i].getText('custentity_customer_channel_tier')+'",'+
		 				'"'+rslt[i].getText('leadsource')+'",'+
		 				'"'+rslt[i].getText('custentity33')+'",'+
		 				'"'+rslt[i].getValue('custentity12')+'",'+
		 				'"'+rslt[i].getValue('url')+'"\n';

		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
		ctx.setPercentComplete(pctCompleted);
		
		//Reschedule logic
		if ((i+1)==1000 || ((i+1) < rslt.length && ctx.getRemainingUsage() < 2000)) {
			//reschedule
			var rparam = new Object();
			rparam[LAST_PROC_CUSTOMER_PARAM2] = rslt[i].getValue('internalid');
			nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), rparam);
			break;
		}
	}
	
	log('debug','Remaining Usage Exit Main Loop',ctx.getRemainingUsage());
	
	//at this point, create CSV of processed records
	var rightNow = new Date();
	var milsecTime = rightNow.getTime(); // for uniqueness
	
	var csvattachments = new Array();
	var strFileNames = '';
	
	//create email backup file
	if (emailCsvBody) {
		var emailfileName = emailBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		strFileNames += '<li>'+emailfileName+'</li>';
		var emailCsvFileObj = nlapiCreateFile(emailfileName, 'CSV', emailCsvHeader + emailCsvBody);
		emailCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(emailCsvFileObj);
		
	}
	
	//create activity backup file
	if (activityCsvBody) {
		var activityfileName = activityBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		strFileNames += '<li>'+activityfileName+'</li>';
		var activityCsvFileObj = nlapiCreateFile(activityfileName, 'CSV', activityCsvHeader + activityCsvBody);
		activityCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(activityCsvFileObj);
	}
	
	//create marketing subscription backup file
	if (mktSubCsvBody) {
		var mktsubfileName = mktSubBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		strFileNames += '<li>'+mktsubfileName+'</li>';
		var mktsubCsvFileObj = nlapiCreateFile(mktsubfileName, 'CSV', mktSubCsvHeader + mktSubCsvBody);
		mktsubCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(mktsubCsvFileObj);
	}

	//create user note backup file
	if (noteCsvBody) {
		var unotefileName = noteBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		strFileNames += '<li>'+unotefileName+'</li>';
		var unoteCsvFileObj = nlapiCreateFile(unotefileName, 'CSV', noteCsvHeader + noteCsvBody);
		unoteCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(unoteCsvFileObj);
	}
	
	//create File backup file
	if (fileCsvBody) {
		var filefileName = fileBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		strFileNames += '<li>'+filefileName+'</li>';
		var fileCsvFileObj = nlapiCreateFile(filefileName, 'CSV', fileCsvHeader + fileCsvBody);
		fileCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(fileCsvFileObj);
	}
	
	//create Contact backup file
	if (ctCsvBody) {
		var ctfileName = ctBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		strFileNames += '<li>'+ctfileName+'</li>';
		var ctCsvFileObj = nlapiCreateFile(ctfileName, 'CSV', ctCsvHeader + ctCsvBody);
		ctCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(ctCsvFileObj);
	}
	
	//create Customer backup file - ONLY report that is sent to user.
	//Array is kept just incase client wants related record log on email
	if (customerRecBody) {
		var customerRecfileName = customerRecBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		strFileNames = '<li>'+customerRecfileName+'</li>'+strFileNames;
		var customerRecCsvFileObj = nlapiCreateFile(customerRecfileName, 'CSV', customerRecHeader + customerRecBody);
		customerRecCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(customerRecCsvFileObj);
		csvattachments.push(customerRecCsvFileObj);
	}
	
	var sbj = ctx.getEnvironment()+'- Data Cleanup Execution Log Notificatioin';
	var msg = 'Attached CSV file shows execution log of each To Be Purged records. <br/><br/>'+
			  'Following File(s) are stored under AUX: Data Clean up Related Files Folder'+
			  '<ul>'+strFileNames+'</ul>';
	nlapiSendEmail(3707, purgePrimaryNotifier, sbj, msg, purgeAdditionialNotifiers, null, null, csvattachments);
	
}
