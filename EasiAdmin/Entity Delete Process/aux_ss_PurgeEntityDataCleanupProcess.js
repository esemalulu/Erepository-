/**
 * Data clean up to run as needed basis to.
 * 1. backupAndDeleteCleanupRecords
 * Saved search MUST be Sorted by InternalID DESC order
 */

var ctx = nlapiGetContext();
//Last processed ID for Pardot Unlist process
var LAST_PROC_CUSTOMER_PARAM = 'custscript_lastproc_sb128id';


var lastProcessedCustomerId = '';

//Sandbox: 2432062
//Production:
//2636613 (Aux: Backup of Deleted Entity)
var purgeFolderId='2636613';

//Admin: Leads created 12/30/14 – 01/01/15	 	customsearch_lsa_customer_30
var purgeSavedSearchId='customsearch_lsa_customer_30';

//Admin: Leads modified by Sales after 01/01/15	 	customsearch_lsa_customer_30_2	
var tobeLeftAloneSavedSearchId = 'customsearch_lsa_customer_30_2';

var counter = 1;
var rsltSet = null;

//Customer/Lead/Prospect Record backup header, body and file name
var customerRecBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-CustomerToBeRemoved-';
var customerRecHeader = 'Status, Log, Internal ID, Entity ID, Stage, Status, Company Name, First Name, Last Name, Email, Phone, Bill Address 1, Bill Address 2, Bill Zip, Ship Address 1, Ship Address 2, Ship Zip, Sales Rep, Lead Source\n';
var customerRecBody = '';

//Contact backup header, body and file name
var ctBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-ContactsRemovedOrUnattached-';
var ctCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Contact ID, Action Taken, Primary Companny, First Name, Last Name, Email, Phone, Title\n';
var ctCsvBody = '';

//Email backup header, body and file name
var emailBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-EmailsRemoved-';
var emailCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Email Date, Type, Author, Author Email, Recipient, Recipient Email, CC, BCC, Subject, Message Body\n';
var emailCsvBody = '';

//Activity backup header, body and file name
var activityBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-ActivitiesRemoved-';
var activityCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Type, Start Date, Completed Date, Assigned To, Title, Note/Message\n';
var activityCsvBody = '';

//User Note backup header, body and file name
var noteBackupFileNamePrefix = nlapiGetContext().getEnvironment()+'-UserNoteRemoved-';
var noteCsvHeader = 'Status, Log, Entity Internal ID, Entity ID, Type, Note Date, Author, Direction, Note Title, Note\n';
var noteCsvBody = '';

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


function backupAndDeleteCleanupRecords() {
	//get any script parameter
	lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_CUSTOMER_PARAM);
		
	//define search - Original List to look for all To be Purged customer/prospects/lead records
	//					AND 
	//				  Processed for Pardot
	var flt = null;

	//check to see if last processed id is present.
	if (lastProcessedCustomerId) {
		flt = new Array();
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
	           new nlobjSearchColumn('salesrep'), //Sales Rep
	           new nlobjSearchColumn('leadsource'), //Lead Source
	           new nlobjSearchColumn('url')];

	
	var rslt = nlapiSearchRecord(null, purgeSavedSearchId, flt, col);
	
	try {
		for (var i=0; rslt && i < rslt.length; i++) {
			
			if (i==0) {
				log('debug','BK and Delete Starting at Internal ID',rslt[i].getValue('internalid'));
			}
			
			//--- Adding in Search against tobeLeftAloneSavedSearchId to see if THIS record was updated on or after 1/1/2015
			var skipflt = [new nlobjSearchFilter('internalid', null, 'anyof', [rslt[i].getValue('internalid')])];
			var srs = nlapiSearchRecord(null, tobeLeftAloneSavedSearchId, skipflt, null);

			if (srs && srs.length > 0) {
				log('audit','Skipping Internal ID: '+rslt[i].getValue('internalid'),'This ID is on the list of Admin: Leads modified by Sales after 01/01/15 search');
				
				customerRecBody += '"Delete Failed",'+'"Has been modified after 1/1/2015",'+'"'+rslt[i].getValue('internalid')+'",'+
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
								'"'+rslt[i].getText('salesrep')+'",'+
								'"'+rslt[i].getText('leadsource')+'"\n';
			
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
				ctx.setPercentComplete(pctCompleted);
				
				continue;
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
							
				customerRecBody += '"Delete Skipped",'+'"Has transactions",'+'"'+rslt[i].getValue('internalid')+'",'+
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
				 				'"'+rslt[i].getText('salesrep')+'",'+
				 				'"'+rslt[i].getText('leadsource')+'"\n';
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
				ctx.setPercentComplete(pctCompleted);
				
				
				continue;
			}
			
			//3/20/2015 - Check for activities, IF activities exists, do NOT delete
			var actcol = [new nlobjSearchColumn('internalid',null,'group'),
			    	      new nlobjSearchColumn('internalid','activity','count')];
			var actrs = nlapiSearchRecord('customer',null,relflt, actcol);
			//if record has activities, mark it and continue to next
			if (parseInt(actrs[0].getValue('internalid','activity','count')) > 0) {
							
				customerRecBody += '"Delete Skipped",'+'"Has Activities (Phone, Task and/or Event)",'+'"'+rslt[i].getValue('internalid')+'",'+
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
				 				'"'+rslt[i].getText('salesrep')+'",'+
				 				'"'+rslt[i].getText('leadsource')+'"\n';
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
				ctx.setPercentComplete(pctCompleted);
				
				continue;
			}
			
			//4. User Note check
			var notecol = [new nlobjSearchColumn('internalid',null,'group'),
				    	   new nlobjSearchColumn('internalid','userNotes','count')];
			var noters = nlapiSearchRecord('customer',null,relflt, notecol);
			//if record has user note, mark it and continue to next
			if (parseInt(noters[0].getValue('internalid','userNotes','count')) > 0) {
							
				customerRecBody += '"Delete Skipped",'+'"Has User Notes",'+'"'+rslt[i].getValue('internalid')+'",'+
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
				 				'"'+rslt[i].getText('salesrep')+'",'+
				 				'"'+rslt[i].getText('leadsource')+'"\n';
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
				ctx.setPercentComplete(pctCompleted);
				
				
				continue;
			}
			
			//5. Support Case Check
			var ticcol = [new nlobjSearchColumn('internalid',null,'group'),
			              new nlobjSearchColumn('internalid','case','count')];
			var ticrs = nlapiSearchRecord('customer',null,relflt, ticcol);
			//if record has support case, mark it and continue to next
			if (parseInt(ticrs[0].getValue('internalid','case','count')) > 0) {
							
				customerRecBody += '"Delete Skipped",'+'"Has Support Cases",'+'"'+rslt[i].getValue('internalid')+'",'+
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
				 				'"'+rslt[i].getText('salesrep')+'",'+
				 				'"'+rslt[i].getText('leadsource')+'"\n';
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
				ctx.setPercentComplete(pctCompleted);
				
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
						msg = strGlobalReplace(msgrs[m].getValue(msgcols[3]), '\n', ' // ');
						msg = strGlobalReplace(msgrs[m].getValue(msgcols[3]), '\r', ' // ');
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
					
			/**
			 * 3/20/2015 - 
			 * Requested that we need to NOT delete if lead has any activiteis OR user notes
			
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
						note = strGlobalReplace(actrs[a].getValue(actcols[3]), '\n', ' // ');
						note = strGlobalReplace(actrs[a].getValue(actcols[3]), '\r', ' // ');
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
						nnote = strGlobalReplace(noters[un].getValue(notecols[3]), '\n', ' // ');
						nnote = strGlobalReplace(noters[un].getValue(notecols[3]), '\r', ' // ');
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
			
			*****************************************************************************/
			
			//7. Delete or Unattach contact record linked to THIS customer/lead/prospect record.
			var ctcol = [new nlobjSearchColumn('internalid','contact').setSort(true), //0
			             new nlobjSearchColumn('email','contact'), //1
			             new nlobjSearchColumn('phone','contact'), //2
			             new nlobjSearchColumn('company','contact'), //3
			             new nlobjSearchColumn('firstname','contact'), //4
			             new nlobjSearchColumn('lastname','contact'), //5
			             new nlobjSearchColumn('title','contact'), //6
			             new nlobjSearchColumn('custentity_easi_contact_role', 'contact') //7
						];
			var ctrs = nlapiSearchRecord('customer', null, relflt, ctcol);
			
			var ctcols = (ctrs)?ctrs[0].getAllColumns():new Array();
			
			for (var ct=0; ctrs && ct < ctrs.length; ct++) {
				//build CSV backup for Note
				if (ctrs[ct].getValue(ctcols[0])) {
					
					//Chage: IF Contact has Another associate AT ALL OR has custom field called Contact Type SHOULD NOT BE DELETED
					var action = 'Delete';
					var actionDetail = '';
					//log('debug','contact company',ctrs[ct].getValue('company','contact'));
					
					var isAssociatedWithOtherClients = false;
					//Search against contact record with THIS id to see how many company returns, IF so, set this to be true to be Unattached.
					var attachflt = [new nlobjSearchFilter('internalid', null, 'anyof', [ctrs[ct].getValue(ctcols[0])])];
					var attachcol = [new nlobjSearchColumn('internalid','company')];
					var attachrs = nlapiSearchRecord('contact', null, attachflt, attachcol);
					if (attachrs && attachrs.length > 1) {
						isAssociatedWithOtherClients = true;
						actionDetail += '// Multiple Attachment // ';
						
					}
					
					//If contact type field is set, set it to true to be Unattached
					var hasContactType = false;
					if (ctrs[ct].getValue('custentity_easi_contact_role','contact')) {
						hasContactType = true;
						actionDetail += '// Has Contact Type // ';
					}
					
					if (rslt[i].getValue('internalid') != ctrs[ct].getValue('company','contact')) {
						actionDetail += '// Primary Diff From Lead // ';
					}
					
					if (isAssociatedWithOtherClients || hasContactType || rslt[i].getValue('internalid') != ctrs[ct].getValue('company','contact')) {
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
								   '"'+ctrs[ct].getValue('internalid','contact')+'",'+
								   '"'+action+' ('+actionDetail+')",'+
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
			 				'"'+rslt[i].getText('salesrep')+'",'+
			 				'"'+rslt[i].getText('leadsource')+'"\n';

			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
			ctx.setPercentComplete(pctCompleted);
			
			//Reschedule logic
			if ((i+1)==1000 || ((i+1) < rslt.length && ctx.getRemainingUsage() < 500)) {
				//reschedule
				var rparam = new Object();
				rparam[LAST_PROC_CUSTOMER_PARAM] = rslt[i].getValue('internalid');
				nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), rparam);
				break;
			}
		}
	} catch (processerr) {
		log('error','Script terminating error','ERROR during process: '+getErrText(processerr));
	}
	
	
	log('debug','Remaining Usage Exit Main Loop',ctx.getRemainingUsage());
	
	//at this point, create CSV of processed records
	var rightNow = new Date();
	var milsecTime = rightNow.getTime(); // for uniqueness
		
	//create email backup file
	if (emailCsvBody) {
		var emailfileName = emailBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		var emailCsvFileObj = nlapiCreateFile(emailfileName, 'CSV', emailCsvHeader + emailCsvBody);
		emailCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(emailCsvFileObj);	
	}
	
	/**
	//create activity backup file
	if (activityCsvBody) {
		var activityfileName = activityBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		var activityCsvFileObj = nlapiCreateFile(activityfileName, 'CSV', activityCsvHeader + activityCsvBody);
		activityCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(activityCsvFileObj);
	}
	
	//create user note backup file
	if (noteCsvBody) {
		var unotefileName = noteBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		var unoteCsvFileObj = nlapiCreateFile(unotefileName, 'CSV', noteCsvHeader + noteCsvBody);
		unoteCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(unoteCsvFileObj);
	}
	*/
	
	//create Contact backup file
	if (ctCsvBody) {
		var ctfileName = ctBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		var ctCsvFileObj = nlapiCreateFile(ctfileName, 'CSV', ctCsvHeader + ctCsvBody);
		ctCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(ctCsvFileObj);
	}
	
	//create Customer backup file - ONLY report that is sent to user.
	//Array is kept just incase client wants related record log on email
	if (customerRecBody) {
		var customerRecfileName = customerRecBackupFileNamePrefix + milsecTime + '-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		var customerRecCsvFileObj = nlapiCreateFile(customerRecfileName, 'CSV', customerRecHeader + customerRecBody);
		customerRecCsvFileObj.setFolder(purgeFolderId);
		nlapiSubmitFile(customerRecCsvFileObj);
	}
}
