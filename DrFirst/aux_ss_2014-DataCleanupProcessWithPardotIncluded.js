/**
 * 
 */

var ctx = nlapiGetContext();
var LAST_PROC_CUSTOMER_PARAM = 'custscript_last_proc_2014cleanup';
var LAST_PROC_CUSTOMER_PARAMBUP = 'custscript_last_proc_2014cleanupbu';
var LAST_PROC_CUSTOMER_PARAM2 = 'custscript_last_proc_2014cleanup_bkdel';
var lastProcessedCustomerId = '';
var lastProcessedCustomerIdbu = '';

var counter = 1;
var rsltSet = null;

var csvBackupFileFolderId = '3045085'; //Audaixum > 2014 Data Clean UpFolder
var csvPardotToUnlist = 'PRODUCTION-EmailToUnlist-Pardot-';
var csvPardotToUnlistHeader = 'EmailAddress\n';
var csvPardotToUnlistBody = '';



function backupAndDeleteCleanupRecords() {
	//get any script parameter
	lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM2);
	
	//Customer/Lead/Prospect Record backup header, body and file name
	var customerRecBackupFileNamePrefix = 'PRODUCTION-CustomerToBeRemoved-';
	var customerRecHeader = 'Status, Log, Internal ID, Entity ID, Stage, Status, Company Name, First Name, Last Name, Email, Phone, Bill Address 1, Bill Address 2, Bill Zip, Ship Address 1, Ship Address 2, Ship Zip, '+
							'Inactive, Account Manager, DFClient, MT Go Live Date, Sales Rep, Practice Legal Name, Practice User Name, HSG Assessment Purchased, Last Sales Activity, Type (Account Info), '+
						'License Owner ID, Master Contract ID, Customer Type, Channel Manager, HIS, EMR Name, PMS Name, Meditech Rep\n';
	var customerRecBody = '';

	//Contact backup header, body and file name
	var ctBackupFileNamePrefix = 'PRODUCTION-ContactsRemovedOrUnattached-';
	var ctCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Action Taken, First Name, Last Name, Email, Phone, Title, NPI, Provider NPI, Specialty\n';
	var ctCsvBody = '';
	
	//Email backup header, body and file name
	var emailBackupFileNamePrefix = 'PRODUCTION-EmailsRemoved-';
	var emailCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Email Date, Type, Author, Author Email, Recipient, Recipient Email, CC, BCC, Subject, Message Body\n';
	var emailCsvBody = '';
	
	//Activity backup header, body and file name
	var activityBackupFileNamePrefix = 'PRODUCTION-ActivitiesRemoved-';
	var activityCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Type, Task Type, Created Date (Custom), Start Date, Completed Date, Assigned To, Title, Note/Message, Task Desc (Custom), Activity ID, Activity Identifier\n';
	var activityCsvBody = '';
	
	//Marketing Subscription backup header, body and file name
	var mktSubBackupFileNamePrefix = 'PRODUCTION-MarketingSubscription-';
	var mktSubCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Subscription, Subscription Date, Subscription Status\n';
	var mktSubCsvBody = '';
	
	//User Note backup header, body and file name
	var noteBackupFileNamePrefix = 'PRODUCTION-UserNoteRemoved-';
	var noteCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Type, Note Date, Author, Direction, Note Title, Note\n';
	var noteCsvBody = '';
	
	//Ticket backup header, body and file name
	var ticBackupFileNamePrefix = 'PRODUCTION-TicketsRemoved-';
	var ticCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Ticket Number, Profile, Subject, Assigned To, Account Manager, Sales Rep, Sales Representative, Incident Date, Date Closed, Contact, Email, '+
					   'Bugzilla URL, JIRA URL, Case Issue, Comments (Custom), Message Author, Message Date, Message Type, Message Body\n';
	var ticCsvBody = '';
	
	//File backup header, body and file name
	var fileBackupFileNamePrefix = 'PRODUCTION-FilesBackup-';
	var fileCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, File Type, Folder, Name, Description, URL\n';
	var fileCsvBody = '';
	
	//Sales Team backup header, body and file name
	var salesteamBackupFileNamePrefix = 'PRODUCTION-SalesTeamBackup-';
	var salesteamCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Sales Member Name, Sales Role, Primary Rep Name\n';
	var salesteamCsvBody = '';

	
	//define search - Original List to look for all For Deletion customer/prospects/lead records
	//					AND 
	//				  Processed for Pardot
	var flt = [new nlobjSearchFilter('custentity_for_deletion', null, 'is','T'),
	           new nlobjSearchFilter('custentity_datacleanup_pardotlistproc',null, 'is','T'),
	           new nlobjSearchFilter('internalidnumber', null,'between','37','494599')];
	
	//check to see if last processed id is present.
	if (lastProcessedCustomerId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
	}

	var col = [new nlobjSearchColumn('internalid').setSort(true),
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
	           new nlobjSearchColumn('custentity_type_account_info'), //Type (Account Info)
	           new nlobjSearchColumn('isinactive'), // is inacitve
	           new nlobjSearchColumn('custentity_account_manager'), // Account Manager
	           new nlobjSearchColumn('custentity_dfclient'), //DFClient
	           new nlobjSearchColumn('custentity_mt_go_live_date'), //MT Go Live Date
	           new nlobjSearchColumn('salesrep'), //Sales Rep
	           new nlobjSearchColumn('custentity_practice_legal_name'), //Practice Legal name
	           new nlobjSearchColumn('custentity_practice_username'), //Practice Username
	           new nlobjSearchColumn('custentity12'), //HSG Assessment Purchased
	           new nlobjSearchColumn('custentity_lic_owner_id'), //License Owner ID
	           new nlobjSearchColumn('custentity_master_contract_id'), //Master Contract ID
	           new nlobjSearchColumn('custentity_customer_type'), //Customer Type
	           new nlobjSearchColumn('custentity_channel_manager'), //Channel Manager
	           new nlobjSearchColumn('custentity_his'), //HIS
	           new nlobjSearchColumn('custentity_emr_name'), //EMR Name
	           new nlobjSearchColumn('custentity_pms_name'),
	           new nlobjSearchColumn('custentity_meditech_rep'),
	           new nlobjSearchColumn('stage'),
	           new nlobjSearchColumn('entitystatus')
	           ];

	var rslt = nlapiSearchRecord('customer', null, flt, col);
		
	for (var i=0; rslt && i < rslt.length; i++) {
		
		if (i==0) {
			log('debug','BK and Delete Starting at Internal ID',rslt[i].getValue('internalid'));
		}
		
		//Skip IF internal ID is 125321.  This is due to Large number of contacts to detach and unprocess.
		if (rslt[i].getValue('internalid') == '125322') {
			continue;
		}
		
		//log('debug','Processing ID',rslt[i].getValue('internalid'));
		
		//Filter used for all child record search
		var relflt = [new nlobjSearchFilter('internalid', null, 'anyof',rslt[i].getValue('internalid'))];
		
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
		              new nlobjSearchColumn('custevent_task_type','activity'), //4
		              new nlobjSearchColumn('custevent_task_description','activity'), //5
		              new nlobjSearchColumn('assigned','activity'), //6
		              new nlobjSearchColumn('custevent_activity_id','activity'), //7
		              new nlobjSearchColumn('custevent_mark_delete','activity'), //8 (Activity Identifier)
		              new nlobjSearchColumn('startdate','activity'), //9
		              new nlobjSearchColumn('completeddate','activity'), //10
		              new nlobjSearchColumn('custevent_created_date','activity'), //11 (Created Date Custom)
		              new nlobjSearchColumn('custevent_task_type','activity') //12
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
				
				if (actrs[a].getValue(actcols[5])) {
					taskdesc = strGlobalReplace(actrs[a].getValue(actcols[5]), '"', '\'\''); 
				}
				
				var actStatus = '', actLog='';
				
				var actrectype = 'activity';
				try {
					//Deleting activity causes issue.
					//Try deleting by 'type','activity'
					//nlapiDeleteRecord('activity', actrs[a].getValue(actcols[0]));
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
				
				activityCsvBody += '"'+actStatus+'",'+'"'+actLog+'",'+'"'+rslt[i].getValue('internalid')+'",'+
								   '"'+rslt[i].getValue('entityid')+'",'+
								   '"'+actrectype+'",'+
								   '"'+getDataValue(actrs[a], actcols[12])+'",'+
								   '"'+getDataValue(actrs[a], actcols[11])+'",'+
								   '"'+getDataValue(actrs[a], actcols[9])+'",'+
								   '"'+getDataValue(actrs[a], actcols[10])+'",'+
								   '"'+getDataValue(actrs[a], actcols[6])+'",'+
								   '"'+title+'",'+
								   '"'+note+'",'+
								   '"'+taskdesc+'",'+
								   '"'+getDataValue(actrs[a], actcols[7])+'",'+
								   '"'+getDataValue(actrs[a], actcols[8])+'"\n';
				
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
	
		//5. Ticket backup and delete
		var ticcol = [
		              new nlobjSearchColumn('internalid','case').setSort(true), //index 0
		              new nlobjSearchColumn('casenumber','case'), //index 1
		              new nlobjSearchColumn('title','case'), //index 2
		              new nlobjSearchColumn('contact','case'), //3
		              new nlobjSearchColumn('email','case'), //4
		              new nlobjSearchColumn('custevent_bugzilla_url','case'), //5
		              new nlobjSearchColumn('custevent7','case'), //6 Comments (Custom)
		              new nlobjSearchColumn('custevent_master_contract_code','case'), //7
		              new nlobjSearchColumn('assigned','case'), //8
		              new nlobjSearchColumn('profile','case'), //9
		              new nlobjSearchColumn('startdate','case'), //10
		              new nlobjSearchColumn('enddate','case'), //11
		              new nlobjSearchColumn('issue','case'), //12
		              new nlobjSearchColumn('custevent_jira_url','case'), //13
		              new nlobjSearchColumn('messageauthor','case'), //14
		              new nlobjSearchColumn('messagedate','case'), //15
		              new nlobjSearchColumn('message','case'), //16
		              new nlobjSearchColumn('messagetype','case'), //17
		              new nlobjSearchColumn('custevent_account_manager','case'), //18
		              new nlobjSearchColumn('custevent_sales_rep','case'), //19
		              new nlobjSearchColumn('custevent10','case') //20
		              
					 ];
		var ticrs = nlapiSearchRecord('customer',null,relflt, ticcol);
		var ticcols = (ticrs)?ticrs[0].getAllColumns():new Array();

		for (var t=0; ticrs && t < ticrs.length; t++) {
			//build CSV backup for Ticket
			if (ticrs[t].getValue(ticcols[0])) {
				
				var ttitle = '', tcomment='', tmessage='', tassignto='';
				if (ticrs[t].getValue(ticcols[2])) {
					ttitle = strGlobalReplace(ticrs[t].getValue(ticcols[2]), '"', '\'\''); 
				}
				
				if (ticrs[t].getValue(ticcols[6])) {
					tcomment = strGlobalReplace(ticrs[t].getValue(ticcols[6]), '"', '\'\''); 
				}
				
				if (ticrs[t].getValue(ticcols[16])) {
					tmessage = strGlobalReplace(ticrs[t].getValue(ticcols[16]), '"', '\'\''); 
				}
				
				if (ticrs[t].getValue(ticcols[8])) {
					tassignto = strGlobalReplace(ticrs[t].getValue(ticcols[8]), '=', ''); 
				}
				
				var caseStatus = '', caseLog='';
				
				try {
					nlapiDeleteRecord('supportcase', ticrs[t].getValue(ticcols[0]));
					caseStatus = 'Delete Success';
				} catch (casedelerr) {
					caseStatus = 'Delete Failed';
					caseLog = getErrText(casedelerr);
				}
				
				ticCsvBody += '"'+caseStatus+'",'+'"'+caseLog+'",'+'"'+rslt[i].getValue('internalid')+'",'+
							   '"'+rslt[i].getValue('entityid')+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[1])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[9])+'",'+
							   '"'+ttitle+'",'+
							   '"'+tassignto+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[18])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[19])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[20])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[10])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[11])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[3])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[4])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[5])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[13])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[12])+'",'+
							   '"'+tcomment+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[14])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[15])+'",'+
							   '"'+getDataValue(ticrs[t], ticcols[17])+'",'+
							   '"'+tmessage+'"\n';
			}						 
		}
		
		//6. File backup. NO need to delete the files. Just log location of the file
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
		
		//7. Sales Team backup.
		var salesteamcol = [
		              new nlobjSearchColumn('salesteammember').setSort(true), //index 0
		              new nlobjSearchColumn('salesteamrole'), //index 1
		              new nlobjSearchColumn('salesrep')
					 ];
		var salesteamrs = nlapiSearchRecord('customer',null,relflt, salesteamcol);
		var salesteamcols = (salesteamrs)?salesteamrs[0].getAllColumns():new Array();
	
		for (var st=0; salesteamrs && st < salesteamrs.length; st++) {
			//build CSV backup for Note
			if (salesteamrs[st].getValue(salesteamcols[0])) {
				
				salesteamCsvBody += '"Success",'+'"No Delete Necessary",'+'"'+rslt[i].getValue('internalid')+'",'+
							   '"'+rslt[i].getValue('entityid')+'",'+
							   '"'+getDataValue(salesteamrs[st], salesteamcols[0])+'",'+
							   '"'+getDataValue(salesteamrs[st], salesteamcols[1])+'",'+
							   '"'+getDataValue(salesteamrs[st], salesteamcols[2])+'"\n';
			}
						 
		}
		
		//7. Delete or Unattach contact record linked to THIS customer/lead/prospect record.
		var ctcol = [new nlobjSearchColumn('internalid','contact').setSort(true), //0
		             new nlobjSearchColumn('email','contact'), //1
		             new nlobjSearchColumn('phone','contact'), //2
		             new nlobjSearchColumn('custentity_npi','contact'), //3 
		             new nlobjSearchColumn('custentity_provider_npi','contact'), //4
		             new nlobjSearchColumn('custentity_specialty','contact'), //5
		             new nlobjSearchColumn('company','contact'), //6
		             new nlobjSearchColumn('firstname','contact'), //7
		             new nlobjSearchColumn('lastname','contact'), //8
		             new nlobjSearchColumn('title','contact') //9
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
						nlapiDetachRecord('contact', ctrs[ct].getValue(ctcols[0]), 'customer', rslt[i].getValue('internalid'));
						contactdStatus = 'Detach Success';
					} catch (contactderr) {
						contactdStatus = 'Detach Failed';
						contactdLog = getErrText(contactderr);
					}
				}
				
				ctCsvBody += '"'+contactdStatus+'",'+'"'+contactdLog+'",'+'"'+rslt[i].getValue('internalid')+'",'+
							   '"'+rslt[i].getValue('entityid')+'",'+
							   '"'+action+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[7])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[8])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[1])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[2])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[9])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[3])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[4])+'",'+
							   '"'+getDataValue(ctrs[ct], ctcols[5])+'"\n';
			}
						 
		}

		//0. Build Customer backup file. Search Against Last Sales Activity Record
		
		var custStatus = '', custLog='';
		
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
		 				'"'+rslt[i].getText('custentity_account_manager')+'",'+
		 				'"'+rslt[i].getValue('custentity_dfclient')+'",'+
		 				'"'+rslt[i].getValue('custentity_mt_go_live_date')+'",'+
		 				'"'+rslt[i].getText('salesrep')+'",'+
		 				'"'+rslt[i].getValue('custentity_practice_legal_name')+'",'+
		 				'"'+rslt[i].getValue('custentity_practice_username')+'",'+
		 				'"'+rslt[i].getValue('custentity12')+'",'+
		 				'"'+rslt[i].getValue('custentity_date_lsa')+'",'+
		 				'"'+rslt[i].getText('custentity_type_account_info')+'",'+
		 				'"'+rslt[i].getValue('custentity_lic_owner_id')+'",'+
		 				'"'+rslt[i].getValue('custentity_master_contract_id')+'",'+
		 				'"'+rslt[i].getText('custentity_customer_type')+'",'+
		 				'"'+rslt[i].getText('custentity_channel_manager')+'",'+
		 				'"'+rslt[i].getValue('custentity_his')+'",'+
		 				'"'+rslt[i].getValue('custentity_emr_name')+'",'+
		 				'"'+rslt[i].getValue('custentity_pms_name')+'",'+
		 				'"'+rslt[i].getValue('custentity_meditech_rep')+'"\n';

		
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
	
	//create email backup file
	if (emailCsvBody) {
		var emailfileName = emailBackupFileNamePrefix + milsecTime + '.csv';
		var emailCsvFileObj = nlapiCreateFile(emailfileName, 'CSV', emailCsvHeader + emailCsvBody);
		emailCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(emailCsvFileObj);
	}
	
	//create activity backup file
	if (activityCsvBody) {
		var activityfileName = activityBackupFileNamePrefix + milsecTime + '.csv';
		var activityCsvFileObj = nlapiCreateFile(activityfileName, 'CSV', activityCsvHeader + activityCsvBody);
		activityCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(activityCsvFileObj);
	}
	
	//create marketing subscription backup file
	if (mktSubCsvBody) {
		var mktsubfileName = mktSubBackupFileNamePrefix + milsecTime + '.csv';
		var mktsubCsvFileObj = nlapiCreateFile(mktsubfileName, 'CSV', mktSubCsvHeader + mktSubCsvBody);
		mktsubCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(mktsubCsvFileObj);
	}

	//create user note backup file
	if (noteCsvBody) {
		var unotefileName = noteBackupFileNamePrefix + milsecTime + '.csv';
		var unoteCsvFileObj = nlapiCreateFile(unotefileName, 'CSV', noteCsvHeader + noteCsvBody);
		unoteCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(unoteCsvFileObj);
	}

	//create Ticket backup file
	if (ticCsvBody) {
		var ticfileName = ticBackupFileNamePrefix + milsecTime + '.csv';
		var ticCsvFileObj = nlapiCreateFile(ticfileName, 'CSV', ticCsvHeader + ticCsvBody);
		ticCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(ticCsvFileObj);
	}
	
	//create File backup file
	if (fileCsvBody) {
		var filefileName = fileBackupFileNamePrefix + milsecTime + '.csv';
		var fileCsvFileObj = nlapiCreateFile(filefileName, 'CSV', fileCsvHeader + fileCsvBody);
		fileCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(fileCsvFileObj);
	}
	
	//create Sales Team backup file
	if (salesteamCsvBody) {
		var salesteamfileName = salesteamBackupFileNamePrefix + milsecTime + '.csv';
		var salesteamCsvFileObj = nlapiCreateFile(salesteamfileName, 'CSV', salesteamCsvHeader + salesteamCsvBody);
		salesteamCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(salesteamCsvFileObj);
	}
	

	//create Contact backup file
	if (ctCsvBody) {
		var ctfileName = ctBackupFileNamePrefix + milsecTime + '.csv';
		var ctCsvFileObj = nlapiCreateFile(ctfileName, 'CSV', ctCsvHeader + ctCsvBody);
		ctCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(ctCsvFileObj);
	}
	
	
	//create Customer backup file
	if (customerRecBody) {
		var customerRecfileName = customerRecBackupFileNamePrefix + milsecTime + '.csv';
		var customerRecCsvFileObj = nlapiCreateFile(customerRecfileName, 'CSV', customerRecHeader + customerRecBody);
		customerRecCsvFileObj.setFolder(csvBackupFileFolderId);
		nlapiSubmitFile(customerRecCsvFileObj);
	}
}

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
	var numberprocessed = 0;
	try {
		
		//get any script parameter
		lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM);
		
		//define search - Original List to look for all For Deletion customer/prospects/lead records
		//					AND 
		//				  Not Yet Processed for Pardot
		var flt = [new nlobjSearchFilter('custentity_for_deletion', null, 'is','T'),
		           new nlobjSearchFilter('custentity_datacleanup_pardotlistproc',null, 'is','F')];
		
		//check to see if last processed id is present.
		if (lastProcessedCustomerId) {
			//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
			flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
		}
	
		var col = [new nlobjSearchColumn('internalid', null, 'group').setSort(true),
		           new nlobjSearchColumn('email', null, 'group')];
		
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
	
			//log('debug','>>>>> Processing Customer ID ','>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ID: '+rslt[i].getValue('internalid', null, 'group')+' // Customer Level Email: '+rslt[i].getValue('email', null, 'group'));
			if (i==0) {
				startProcInternalId = rslt[i].getValue('internalid', null, 'group');
				log('debug','Starting at Internal ID',startProcInternalId);
			}
			
			//If email exists for customer level, do uniqueness search here
			if (rslt[i].getValue('email', null, 'group') && rslt[i].getValue('email', null, 'group') !='- None -') {
				var lvl2aexpflt = [
						              ['custentity_for_deletion', 'is','F'],
						              'and',
						              [
						               ['email','is',rslt[i].getValue('email', null, 'group')],
						               'or',
						               ['contact.email','is',rslt[i].getValue('email', null, 'group')]
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
					if (!pardotEmailList.contains(rslt[i].getValue('email', null, 'group'))) {
						//log('debug','> LVL 2a: '+rslt[i].getValue('internalid',null,'group'),'> No Results found for Customer Level Email. Unique. Add to Pardot List');
						pardotEmailList.push(rslt[i].getValue('email', null, 'group'));
						csvPardotToUnlistBody += rslt[i].getValue('email', null, 'group')+'\n';
					}
				} else {
					for (var n=0; n < lvl2aexprs.length; n++) {
						//log('debug','> LVL 2a: '+lvl2aexprs[n].getValue('internalid'),'> Company Email match outside: '+lvl2aexprs[n].getValue('email','contact'));
					}
				}
			}
			
			//Begin Level 2 search for all CONTACTs for THIS Customer marked to be deleted
			var lvl2flt = [new nlobjSearchFilter('custentity_for_deletion', null, 'is','T'),
			               new nlobjSearchFilter('internalid', null, 'anyof', rslt[i].getValue('internalid', null, 'group'))];
			
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
					              ['custentity_for_deletion', 'is','F'],
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
							//log('debug','> LVL 3: '+lvl2rs[j].getValue('internalid'),'> No Results found. Unique. Add to Pardot List');
							pardotEmailList.push(lvl2rs[j].getValue('email','contact'));
							//csvPardotToUnlistBody += lvl2rs[j].getValue('email','contact')+'\n';	
						}
					} else {
						for (var k=0; exprs && k < exprs.length; k++) {
							//log('debug','> LVL 3: '+exprs[k].getValue('internalid'),'> Contact Email: '+exprs[k].getValue('email','contact'));
						}
					}								
				} else{
					//THIS Can be deleted without any pardot action becuase there are NOT email address
					//log('debug','>>> LVL 2: '+lvl2rs[j].getValue('internalid'),'>>> No Email for Company and Contact ');
				}
			}
			
			//Set this Customer/Lead/Prospect record as pardot processed and update contacts to unattach
			//
			var updflds = ['custentity_datacleanup_pardotlistproc'];
			var updvals = ['T'];
			nlapiSubmitField('customer', rslt[i].getValue('internalid', null, 'group'), updflds, updvals, false);
			
			numberprocessed++;
			
			//log('debug','numberprocessed',numberprocessed);
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / 350) * 100);
			ctx.setPercentComplete(pctCompleted);
			
			
			//Reschedule logic
			if (numberprocessed==350 || (i+1)==1000 || ((i+1) < rslt.length && ctx.getRemainingUsage() < 500)) {
				//reschedule
				log('debug','350','Processed 350');
				var rparam = new Object();
				rparam['custscript_last_proc_2014cleanup'] = rslt[i].getValue('internalid', null, 'group');
				nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), rparam);
				break;
			}
		}
		
		log('debug','Pardot List',pardotEmailList);
		
		if (csvPardotToUnlistBody) {
			//at this point, create CSV of processed records
			var rightNow = new Date();
			var milsecTime = rightNow.getTime(); // for uniqueness
			var fileName = csvPardotToUnlist + milsecTime + '.csv';
			var csvFileObj = nlapiCreateFile(fileName, 'CSV', csvPardotToUnlistHeader + csvPardotToUnlistBody);
			csvFileObj.setFolder(csvBackupFileFolderId);
			nlapiSubmitFile(csvFileObj);
		}
	
	} catch (procerr) {
		log('error','Errored while processing Pardot','Internal ID Failed at'+startProcInternalId+' // ERROR: '+getErrText(procerr));
		throw nlapiCreateError('DTCLEAN-PardotListErr', getErrText(procerr), false);
	}
}

/**
 * Entry function for processing pardot unlist generation - Process Bottom UP *****************************************************************************
 * 
 * var LAST_PROC_CUSTOMER_PARAMBUP = 'custscript_last_proc_2014cleanupbu';
 */
function bottomUpPardotUnlistList() {
	
		var startProcInternalIdbu = '';
		var numberprocessed = 0;
		try {
			
			//get any script parameter
			lastProcessedCustomerIdbu = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAMBUP);
			
			//define search - Original List to look for all For Deletion customer/prospects/lead records
			//					AND 
			//				  Not Yet Processed for Pardot
			var flt = [new nlobjSearchFilter('custentity_for_deletion', null, 'is','T'),
			           new nlobjSearchFilter('custentity_datacleanup_pardotlistproc',null, 'is','F')];
			
			//check to see if last processed id is present.
			if (lastProcessedCustomerIdbu) {
				//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
				flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan',lastProcessedCustomerIdbu));
			}
		
			var col = [new nlobjSearchColumn('internalid', null, 'group').setSort(),
			           new nlobjSearchColumn('email', null, 'group')];
			
			var lvl2col = [new nlobjSearchColumn('internalid').setSort(),
			               new nlobjSearchColumn('entityid'),
			               new nlobjSearchColumn('email'),
			               new nlobjSearchColumn('internalid','contact'),
			               new nlobjSearchColumn('email','contact'),
			               new nlobjSearchColumn('company','contact')];
			
			var rslt = nlapiSearchRecord('customer',null,flt,col);
		
		//List of Email Addresses that needs to be pushed into Pardot for unassignment
		var pardotEmailList = new Array();
		
		for (var i=0; rslt && i < rslt.length; i++) {
	
			//log('debug','>>>>> Processing Customer ID ','>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ID: '+rslt[i].getValue('internalid', null, 'group')+' // Customer Level Email: '+rslt[i].getValue('email', null, 'group'));
			if (i==0) {
				startProcInternalIdbu = rslt[i].getValue('internalid', null, 'group');
				log('debug','Starting at Internal ID Bottom Up',startProcInternalIdbu);
			}
			
			//If email exists for customer level, do uniqueness search here
			if (rslt[i].getValue('email', null, 'group') && rslt[i].getValue('email', null, 'group') !='- None -') {
				var lvl2aexpflt = [
						              ['custentity_for_deletion', 'is','F'],
						              'and',
						              [
						               ['email','is',rslt[i].getValue('email', null, 'group')],
						               'or',
						               ['contact.email','is',rslt[i].getValue('email', null, 'group')]
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
					if (!pardotEmailList.contains(rslt[i].getValue('email', null, 'group'))) {
						//log('debug','> LVL 2a: '+rslt[i].getValue('internalid',null,'group'),'> No Results found for Customer Level Email. Unique. Add to Pardot List');
						pardotEmailList.push(rslt[i].getValue('email', null, 'group'));
						csvPardotToUnlistBody += rslt[i].getValue('email', null, 'group')+'\n';
					}
				} else {
					for (var n=0; n < lvl2aexprs.length; n++) {
						//log('debug','> LVL 2a: '+lvl2aexprs[n].getValue('internalid'),'> Company Email match outside: '+lvl2aexprs[n].getValue('email','contact'));
					}
				}
			}
			
			//Begin Level 2 search for all CONTACTs for THIS Customer marked to be deleted
			var lvl2flt = [new nlobjSearchFilter('custentity_for_deletion', null, 'is','T'),
			               new nlobjSearchFilter('internalid', null, 'anyof', rslt[i].getValue('internalid', null, 'group'))];
			
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
					              ['custentity_for_deletion', 'is','F'],
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
							//log('debug','> LVL 3: '+lvl2rs[j].getValue('internalid'),'> No Results found. Unique. Add to Pardot List');
							pardotEmailList.push(lvl2rs[j].getValue('email','contact'));
							//csvPardotToUnlistBody += lvl2rs[j].getValue('email','contact')+'\n';	
						}
					} else {
						for (var k=0; exprs && k < exprs.length; k++) {
							//log('debug','> LVL 3: '+exprs[k].getValue('internalid'),'> Contact Email: '+exprs[k].getValue('email','contact'));
						}
					}								
				} else{
					//THIS Can be deleted without any pardot action becuase there are NOT email address
					//log('debug','>>> LVL 2: '+lvl2rs[j].getValue('internalid'),'>>> No Email for Company and Contact ');
				}
			}
			
			//Set this Customer/Lead/Prospect record as pardot processed and update contacts to unattach
			//
			var updflds = ['custentity_datacleanup_pardotlistproc'];
			var updvals = ['T'];
			nlapiSubmitField('customer', rslt[i].getValue('internalid', null, 'group'), updflds, updvals, false);
			
			numberprocessed++;
			
			//log('debug','numberprocessed',numberprocessed);
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / 350) * 100);
			ctx.setPercentComplete(pctCompleted);
			
			
			//Reschedule logic
			if (numberprocessed==350 || (i+1)==1000 || ((i+1) < rslt.length && ctx.getRemainingUsage() < 1000)) {
				//reschedule
				log('debug','350 Bottom UP','Processed 350');
				var rparam = new Object();
				rparam['custscript_last_proc_2014cleanupbu'] = rslt[i].getValue('internalid', null, 'group');
				nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), rparam);
				break;
			}
		}
		
		log('debug','Pardot List Bottom UP',pardotEmailList);
		
		if (csvPardotToUnlistBody) {
			//at this point, create CSV of processed records
			var rightNow = new Date();
			var milsecTime = rightNow.getTime(); // for uniqueness
			var fileName = csvPardotToUnlist + milsecTime + '.csv';
			var csvFileObj = nlapiCreateFile(fileName, 'CSV', csvPardotToUnlistHeader + csvPardotToUnlistBody);
			csvFileObj.setFolder(csvBackupFileFolderId);
			nlapiSubmitFile(csvFileObj);
		}
	
	} catch (procerr) {
		log('error','Errored while processing Pardot Bottom up','Internal ID Failed at'+startProcInternalIdbu+' // ERROR: '+getErrText(procerr));
		throw nlapiCreateError('DTCLEAN-PardotListErr', getErrText(procerr), false);
	}
}



