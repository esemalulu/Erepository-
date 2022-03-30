/**
 * Author: joe.son@audaxium.com
 * Date: 5/4/2012
 * Desc: 
 * Case Management Suitelet called from source case form. This Suitelet will allow users to 
 * - Merge source case with other case.
 * - Ability to inactivate or delete source case.
 * - (Future) Split source case into two cases
 * Action is provided from the form. MERGE || SPLIT
 */

var caseobj = new Object();
var SubTitle = {
	"MERGE":"Merge Source Case to Target Case",
	"SPLIT":"Split Source Case into Two Cases", //future development
	"ERROR":"Error Occured"
};
var nsform;
var ctx = nlapiGetContext();

function caseMgmt(req, res) {
	initReqVals(req);
	
	var isResult = (caseobj.target)?true:false;
	
	initForm(isResult);
	
	if (!caseobj.haserror) {
		//load details source case as well as action related fields
		getRecordsToMerge();
		
		if (caseobj.target) {
			//process Case Merge
			
			processMerge();
			
			nsform.addButton('custpage_closesl','Close Window','redirectToNewCase(\''+caseobj.target+'\')');
		} else {
			//display Case Merge For User Confirmation
			displayLinkedSourceRecords();
			
			nsform.addSubmitButton('Merge Cases');
			
		}
	}
	
	res.writePage(nsform);
}

function processMerge() {
	var armsg = caseobj.sourcemessages;
	var arfile = caseobj.sourcefiles;
	
	var srctxt = caseobj.sourcerec.getFieldValue('casenumber')+' '+
				 caseobj.sourcerec.getFieldValue('title')+
				 ' ('+caseobj.sourcerec.getFieldValue('company')+')';
	
	var targettxt = caseobj.targetrec.getFieldValue('casenumber')+' '+
					caseobj.targetrec.getFieldValue('title')+
					' ('+caseobj.targetrec.getFieldValue('company')+')';
	
	//result screen
	caseobj.result='<b>Status of Case Merger from <i>'+srctxt+'</i> to <i>'+targettxt+'</i></b><br/><br/>';
	
	//merge messages to target
	//WARNING: this calls nlapiSubmitField for EACH messages. 
	//TODO: We will need logic to NOT inactivate or Delete source case if 
	//      more than 100 messages are present! = 500 API governance
	caseobj.result += 'Messages/Content Merge Status:<br/>';

	//incase there are no messages
	if (!caseobj.hasmsgs) {
		caseobj.result += ' &nbsp; > No Messages/Content to Merge<br/>';
	} else {
		for (var m=0; armsg && m < armsg.length; m++) {
			var msginternalId = armsg[m].getValue('internalid','messages');
			if (msginternalId) {
				//Work around for recipientmail field issue
				
				var msg = nlapiLoadRecord('message',msginternalId);
				
				var recEmails = msg.getFieldValue('recipientemail');
				var arRecEmails = new Array();
				var ccString = '';
				
				if (recEmails.indexOf(',') > -1) {
					arRecEmails = recEmails.split(',');
				} else if (recEmails.indexOf(';') > -1) {
					arRecEmails = recEmails.split(';');
				}
				//check to see if we need to adjust the value of recEmails
				if (arRecEmails.length > 1) {
					msg.setFieldValue('recipientemail',arRecEmails[0]);
					for (var i=1; i < arRecEmails.length; i++) {
						ccString += arRecEmails[i]+';';
					}
					ccString = ccString.substr(0, (ccString.length-1));
					msg.setFieldValue('cc',ccString);
				}
				
				
				msg.setFieldValue('activity',caseobj.target);
				msg.setFieldValue('internalonly',caseobj.markinternal);
				nlapiSubmitRecord(msg);
				//Mod Requested by Adam: set internalonly flag if Mark All messages as internal only is checked
				//var emailFldToUpdate = ['internalonly','activity'];
				//var emailVals = [caseobj.markinternal,caseobj.target];
				//var emailFldToUpdate = ['activity'];
				//var emailVals = [caseobj.target];
				//nlapiSubmitField('message', msginternalId, emailFldToUpdate, emailVals);
				caseobj.result += ' &nbsp; > '+msginternalId+' Message and Content Moved Successfully<br/>';
			}
		}
	}
	
	
	//incase there are no files
	if (!caseobj.hasfiles) {
		caseobj.result += ' &nbsp; > No Files to Attach<br/>';
	} else {
		//merge files to target
		caseobj.result += '<br/>Case Files Merge Status:<br/>';
		for (var f=0; arfile && f < arfile.length; f++) {
			var fileinternalId = arfile[f].getValue('internalid','file');
			if (fileinternalId) {
				nlapiAttachRecord('file',fileinternalId,'supportcase',caseobj.target);
				caseobj.result += '&nbsp; > '+fileinternalId+' Case File Attached Successfully<br/>';
			}
		}
	}
	
	//Depending on user selected action, delete or inactivate source case
	
	if (caseobj.deletesource == 'T') {
		try {
			nlapiDeleteRecord('supportcase', caseobj.source);
			caseobj.result += '<br/>'+srctxt+' has been <b><i>Deleted</i></b>';
		} catch (e) {
			nlapiSubmitField('supportcase',caseobj.source,'isinactive','T');
			caseobj.result += '<br/>Error Occured while attempting to delete <i>'+srctxt+'</i><br/>'+
			  				  '<b><i>'+e.getDetails()+'</i></b><br/>'+
			  				  'ALTERNATE Action Taken: '+srctxt+' is set to Inactive';
		}
	} else {
		//Company wide setting to NOT delete. Inactivate source
		nlapiSubmitField('supportcase',caseobj.source,'isinactive','T');
		caseobj.result += '<br/>'+srctxt+' has been <b><i>Set to Inactive</i></b><br/>';
	}
	
	
	var rmsg = nsform.addField('custpage_resultmsg','inlinehtml','Results');
	rmsg.setDefaultValue(caseobj.result);
	
}

/**
 * Display ALL items that WILL be moved/merged to Target Case.
 * 
 */
function displayLinkedSourceRecords() {
	//show list of Messages linked to this Case to user
	var armsg = caseobj.sourcemessages;
	var msglist = nsform.addSubList('custpage_msglist','list','Messages/Contents to be Merged');
	
	if (armsg && armsg.length > 0) {
		msglist.addField('msglist_msg_internalid','text','Message InternalID');
		msglist.addField('msglist_msg_mdate','text','Message Date');
		msglist.addField('msglist_msg_msbj','text','Message Subject');
		msglist.addField('msglist_msg_mhasatt','text','Message Has Attachment');
		var mline = 1;
		for (var m=0; m < armsg.length; m++) {
			msglist.setLineItemValue('msglist_msg_internalid', mline, armsg[m].getValue('internalid','messages'));
			msglist.setLineItemValue('msglist_msg_mdate', mline, armsg[m].getValue('messagedate','messages'));
			msglist.setLineItemValue('msglist_msg_msbj', mline, armsg[m].getValue('subject','messages'));
			msglist.setLineItemValue('msglist_msg_mhasatt', mline, armsg[m].getValue('hasattachment','messages'));
			mline++;
		}
	}
	
	//show list of Files linked to this Case to user
	var arfile = caseobj.sourcefiles;
	var filelist = nsform.addSubList('custpage_filelist','list','Case Files to be Merged');
	
	if (arfile && arfile.length > 0) {
		filelist.addField('filelist_file_internalid','text','File InternalID');
		filelist.addField('filelist_file_folder','text','Folder');
		filelist.addField('filelist_file_fname','text','File Name');
		filelist.addField('filelist_file_filetype','text','File Type');
		var fline = 1;
		for (var f=0; f < arfile.length; f++) {
			filelist.setLineItemValue('filelist_file_internalid', fline, arfile[f].getValue('internalid','file'));
			filelist.setLineItemValue('filelist_file_folder', fline, arfile[f].getText('folder','file'));
			filelist.setLineItemValue('filelist_file_fname', fline, arfile[f].getValue('name','file'));
			filelist.setLineItemValue('filelist_file_filetype', fline, arfile[f].getValue('filetype','file'));
			fline++;
		}
	}
}

/**
 * Conducts search against source case and gathers internal IDs of each record types.
 * V1: Messages, Files
 */
function getRecordsToMerge() {
	
	caseobj.sourcemessages = getMessagesToAttach();
	var armsg = caseobj.sourcemessages;
	if (!armsg) {
		caseobj.hasmsgs = false;
	} else if (armsg && armsg.length==1 && !armsg[0].getValue('internalid','messages')) {
		//incase empty/null message list comes back
		caseobj.sourcemessages = new Array();
		caseobj.hasmsgs = false;
	} else {
		caseobj.hasmsgs = true;
	}
	
	caseobj.sourcefiles = getFilesToAttach();
	var arfile = caseobj.sourcefiles;
	
	if (!arfile) {
		caseobj.hasfiles = false;
	} else if (arfile && arfile.length==1 && !arfile[0].getValue('internalid','file')) {
		//set it to new array so that display is controlled properly.
		caseobj.sourcefiles = new Array();
		caseobj.hasfiles = false;
	} else {
		caseobj.hasfiles = true;
	}
	
	//Other Possible Records to Merge:
	//Activitiy Subtab Records: JoinID=activity
	//User Note Subtab Records: JoinID=userNotes
}

/**
 * Returns All Messages currently attached to Source Case
 * @returns
 */
function getMessagesToAttach() {
	var flt = [new nlobjSearchFilter('internalid',null,'anyof',caseobj.source)];
	var col = [new nlobjSearchColumn('internalid','messages'),
	           new nlobjSearchColumn('messagedate','messages'),
	           new nlobjSearchColumn('subject','messages'),
	           new nlobjSearchColumn('hasattachment','messages')];
	return nlapiSearchRecord('supportcase',null,flt,col);
}

/**
 * Returns All Files currently attached to Source Case
 * @returns
 */
function getFilesToAttach() {
	var flt = [new nlobjSearchFilter('internalid',null,'anyof',caseobj.source)];
	var col = [new nlobjSearchColumn('internalid','file'),
	           new nlobjSearchColumn('folder','file'),
	           new nlobjSearchColumn('name','file'),
	           new nlobjSearchColumn('filetype','file')];
	return nlapiSearchRecord('supportcase',null,flt,col);
}

function initForm(isResult) {
	//used as popup window
	nsform = nlapiCreateForm('Case Management : '+SubTitle[caseobj.action],true);
	//nsform.setScript('customscript_aux_ue_casemerge_helper');
	nsform.setScript('customscript_cs_case_mgmt_helper');
	
	//display Error Message if haserror is true
	if (caseobj.haserror) {
		//error occured. Display message to user
    	var errMsg = nsform.addField('custpage_errmsg','text','ERROR OCCURED:');
    	errMsg.setDefaultValue('<b>'+caseobj.errortext+'</b>');
    	errMsg.setDisplayType('inline');
    	errMsg.setLayoutType('outsideabove');
	} else {
		//only show for initial merge screen. NOT the result
		if (!isResult) {
			//merge configuration override
			var deleteSource = nsform.addField('custscript_deletesource', 'checkbox', 'Delete Source');
			deleteSource.setLayoutType('outsideabove');
			if (ctx.getSetting('SCRIPT','custscript_deletesource') == 'T') {
				deleteSource.setDefaultValue('T');
			}
			
			//Mod Requested by Adam. Allow user to check this box so that all source messages are marked as "Internal Only" 
			var markInternalOnly = nsform.addField('custpage_internalonly','checkbox','Mark All Source Message(s) as Internal Only');
			markInternalOnly.setLayoutType('outsideabove');
			
			
			//source case details
			var srcFld = nsform.addField('custpage_srccase','text','Source Case: ');
			srcFld.setDefaultValue('<b>'+caseobj.sourcerec.getFieldValue('casenumber')+' '+caseobj.sourcerec.getFieldValue('title')+' ('+caseobj.sourcerec.getFieldText('company')+')</b>');
			srcFld.setDisplayType('inline');
			
			var targetCase = nsform.addField('custpage_targetcase','select','Select Case to Merge Into','supportcase');
			targetCase.setMandatory(true);
		}
				
		//create hidden fields for sourcecase and action
		var hiddenSourceCaseFld = nsform.addField('custpage_sourcecase','text','Source Case ID');
		hiddenSourceCaseFld.setDefaultValue(caseobj.source);
		hiddenSourceCaseFld.setDisplayType('hidden');
		
		var hiddenActionFld = nsform.addField('custpage_action','text','Case Mgmt Action');
		hiddenActionFld.setDefaultValue(caseobj.action);
		hiddenActionFld.setDisplayType('hidden');
	}
}

function initReqVals(req) {
	caseobj.source = req.getParameter('custpage_sourcecase');
	caseobj.action = req.getParameter('custpage_action');
	//below are action specific req vals. - Future Dev: Split variables should be added
	caseobj.target = req.getParameter('custpage_targetcase');
	caseobj.deletesource = req.getParameter('custscript_deletesource');
	caseobj.markinternal = req.getParameter('custpage_internalonly')?'T':'F';
	//if target is available, load it
	if (caseobj.target) {
		caseobj.targetrec = nlapiLoadRecord('supportcase',caseobj.target);
	}
	
	//if source is available, load it
	if (caseobj.source) {
		//load source case details
		var sRec = nlapiLoadRecord('supportcase',caseobj.source);
		caseobj.sourcerec = sRec;
	}
	
	if (!caseobj.source || !caseobj.action) {
		caseobj.haserror = true;
		caseobj.action = 'ERROR';
		caseobj.errortext = 'Please click Merge Case button from Source Case Detail Page';
	}	
}

function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}