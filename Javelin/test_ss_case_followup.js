/**
 * Scheduled Script
 * Date: 11/14/2011
 * Desc:
 * Scheduled Script that processes cases marked as 'Customer to reply'
 */

var ctx = nlapiGetContext();
var lastProcessed='';
var caseStatusToProc='';
var today; 
var objConfig = new Object();

//used for testing case
var TEST_DATE='12/2/2011';

var EXIT_COUNT=9980;
var SCRIPT_PARAM_PROC_INTERNALID='custscript_last_processed_id';
var SCRIPT_PARAM_CASE_STATUS='custscript_case_auto_config_id';

var ERROR_EMAIL_TO='javeline@audaxium.com';
var ERROR_EMAIL_FROM='-5';

var CASE_SEARCH_ID = 'customsearch_case_automation_search'; 
var CASE_INTERNALID = 'supportcase';
var CASE_INSERTSOLUTION_ID='insertsolution';
var CASE_OUTGOING_MSG_ID='outgoingmessage';
var CASE_SEND_TO_CUSTOMER_ID='emailform';
var CASE_STATUS_ID = 'status';
var STATUS_SET_DATE_ID = 'custevent_status_set_date';
var CASE_NUMBER_ID='casenumber';
var CASE_SUBJECT_ID='title';
var CASE_CONTACT_ID='contact';
var CASE_ASSIGNED_TO_ID='assigned';

var CONFIG_REC_ID='customrecord_case_auto_config';
var CONFIG_ACT_CASE_STATUS = 'custrecord_act_case_status';
var CONFIG_SOLUTION = 'custrecord_solution_to_send';
var CONFIG_INIT_WAIT_DAYS = 'custrecord_init_wait_day';
var CONFIG_SET_TO_RESOLVE_DAYS = 'custrecord_days_to_wait_for_auto_resolve';
var CONFIG_FINAL_CASE_STATUS = 'custrecord_unresponse_case_status';
var CONFIG_NAME='name';

var SOLUTION_REC_ID='solution';
var SOLUTION_MSG_ID='description';

var CONTACT_REC_ID='contact';

var EMPLOYEE_REC_ID='employee';
var EMPLOYEE_FIRSTNAME_ID='firstname';

var NS_COMPANY_CONFIG_ID='companyinformation';
var NS_COMPANY_CONFIG_COMPNAME='companyname';

var INTERNAL_ID = 'internalid';
var INTERNAL_ID_NUM = 'internalidnumber';
var ENTITY_ID = 'entityid';
//action type
var SEND='SEND';
var WAIT='WAIT';
var RESOLVE='RESOLVE';

//String replacement
var CUSTOMER_NAME_PLACE_HOLDER='[CUSTOMERNAME]';
var CASE_NUMBER_PLACE_HOLDER='[CASENUMBER]';
var CASE_SUBJECT_PLACE_HOLDER='[CASESUBJECT]';
var UNRESPONSE_DAYS_PLACE_HOLDER='[UNRESPONSEDAYS]';
var RESPONSE_DAYS_PLACE_HOLDER='[RESPONSEDAYS]';
var SUPPORT_REP_PLACE_HOLDER='[SUPPORTREP]';

/**
 * Main Function.
 * 	objConfig.status //internal id of case status
	objConfig.solution //solution id to send to customer
	objConfig.daystosend //number of days to wait since the status set date to actually send the solution
	objConfig.daystorespond //number of days to wait for response after initial automated email
	objConfig.daystoresolve //total number of days to wait since the status set date to set case to End Status the solution
	objConfig.endstatus //end status case should be set to when it passes total number of days
	objConfig.configname
	objConfig.orgmsg //message text in Body
	objConfig.modmsg //modified message with replacement values from case
 */
function autoResponseToCase() {
	initScriptParam();
	var rslt = getMatchingCases();
	var currentCaseId = '';
	log('DEBUG','lastProcessed', lastProcessed);
	log('DEBUG','Case Status To Proc',objConfig.status);
	log('DEBUG','Solution to send',objConfig.solution);
	log('DEBUG','Days to Wait for Solution to go out', objConfig.daystosend);
	log('DEBUG','Days to wait after solution goes out',objConfig.daystorespond);
	log('DEBUG','Days to wait to resolve the case',objConfig.daystoresolve);
	log('DEBUG','Final Status when no response',objConfig.endstatus);
	log('DEBUG','Original Solution Text',objConfig.origmsg);
	
	
	try {
		if (rslt && rslt.length > 0) {
			for (var i=0; i < rslt.length; i++) {
				var objCase = initCaseObject(rslt[i]);
				currentCaseId = objCase.caseid;
				
				var autoActionType = checkAutoAction(objCase.waitdate);
				log('DEBUG','Action to take',autoActionType);
				
				if (autoActionType != WAIT) {
					processCase(autoActionType, objCase);
					log('DEBUG','Updated Text',objConfig.modmsg);
				}
				
				
				if (verifyMeter(i,rslt)) {
					log('DEBUG','Rescheduling','Rescheduled');
					break;
				}		
			}
			log('DEBUG','Outside For Loop','Out side for loop');
		} else {
			log('DEBUG','No Case to Process','No Case to processed for Auto Response Configuration: '+objConfig.configname);
		}
			
	} catch (e) {
		log('ERROR','Runtime Error',e.toString());
		//private
		var strSbj='Error occured while processing auto case response';
		var strMsg='Error occured while processing Case (InternalID): '+currentCaseId+'<br/><br/>';	
		if (!e) {
			//send generic error message
			strMsg += 'An Unexpected Error occured';
		}else if (e instanceof nlobjError) {
			strMsg += e.getCode()+'<br/>'+e.getDetails();
		} else {
			strMsg += e.toString();
		}
		nlapiSendEmail(ERROR_EMAIL_FROM, ERROR_EMAIL_TO, strSbj, strMsg);	
	}
	
}

/**
 * Helper functions
 */

/**
 * Process each case and check to see if it needs to 
 * send response email or mark it as resolved
 */
function processCase(_type,_objCase) {
	if (_type == RESOLVE) {
		//set case status to Resolved
		nlapiSubmitField(CASE_INTERNALID, _objCase.caseid, CASE_STATUS_ID, 6);
	} else {
		//replace place holder strings in Solution with actual values
		replacePlaceHolderValues(_objCase);
		//load the case record, set solution fields and save it.
		var crec = nlapiLoadRecord(CASE_INTERNALID, _objCase.caseid);
		crec.setFieldValue(CASE_OUTGOING_MSG_ID, objConfig.modmsg);
		crec.setFieldValue(CASE_SEND_TO_CUSTOMER_ID, 'T');
		log('DEBUG','Testing',nlapiSubmitRecord(crec));
	}

}

/**
 * Replace Place holder if contact is not defined on the case, introduction will default to Valued Customer.
 */
function replacePlaceHolderValues(_objCase) {
	
	var solutionText = objConfig.origmsg;
	//replace or default Customer First Name
	if (_objCase.contactid) {
		var supportRepName = 
		solutionText = solutionText.replace(CUSTOMER_NAME_PLACE_HOLDER, nlapiLookupField(CONTACT_REC_ID,_objCase.contactid,ENTITY_ID));
	} else {
		//default to Valued Customer
		solutionText = solutionText.replace(CUSTOMER_NAME_PLACE_HOLDER,'Valued Customer');
	}
	
	//replace or default support rep
	if (_objCase.assignedto) {
		log('DEBUG','Assigned To',_objCase.assignedto);
		solutionText = solutionText.replace(SUPPORT_REP_PLACE_HOLDER, nlapiLookupField(EMPLOYEE_REC_ID,_objCase.assignedto,EMPLOYEE_FIRSTNAME_ID));
	} else {
		var nsCompanyName = nlapiLoadConfiguration(NS_COMPANY_CONFIG_ID).getFieldValue(NS_COMPANY_CONFIG_COMPNAME);
		log('DEBUG','NS Company Name',nsCompanyName);
		solutionText = solutionText.replace(SUPPORT_REP_PLACE_HOLDER, nsCompanyName);
	}
	
	//replace case info
	solutionText = solutionText.replace(CASE_NUMBER_PLACE_HOLDER, _objCase.number).replace(CASE_SUBJECT_PLACE_HOLDER,_objCase.subject);

	//replace unresponse days
	solutionText = solutionText.replace(UNRESPONSE_DAYS_PLACE_HOLDER, objConfig.daystosend);
	
	//replace response days
	solutionText = solutionText.replace(RESPONSE_DAYS_PLACE_HOLDER, objConfig.daystorespond);
	
	objConfig.modmsg = solutionText;
}

/**
 * Based on today's date, checks to see what action it needs to take
 */
function checkAutoAction(_waitdate) {
	var wsdate = new Date(_waitdate);
	var dateDiff = parseInt(today.getTime() - wsdate.getTime())/(24*3600*1000);
	
	log('DEBUG','Wait Date / Today',wsdate.toString()+' / '+today.toString());
	log('DEBUG','Date Difference', dateDiff);
	
	if ( (dateDiff < objConfig.daystosend) || (dateDiff > objConfig.daystosend && dateDiff < objConfig.daystoresolve) ) {
		return WAIT;
	} else if (dateDiff == objConfig.daystosend) {
		return SEND;
	} else if (dateDiff >= objConfig.daystoresolve ) {
		return RESOLVE;
	}
	
}



function log(_type,_title,_msg) {
	nlapiLogExecution(_type,_title,_msg);
}

/**
 * Verify if the scheduled script needs to reschedule itself based on EXIT_COUNT
 */
function verifyMeter(_curArrayIndex, _rslt) {
	log('DEBUG','USAGe Meter',ctx.getRemainingUsage());
	if (ctx.getRemainingUsage() <=EXIT_COUNT && (_curArrayIndex+1) < _rslt.length) {
		var param = new Array();
		param[SCRIPT_PARAM_PROC_INTERNALID] = _rslt[_curArrayIndex].getValue(INTERNAL_ID);
		param[SCRIPT_PARAM_CASE_STATUS] = caseStatusToProc;
		
		var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
		if (schStatus=='QUEUED') {
			return true;
		}
	} else {
		return false;
	}
}

/**
 * Search Cases waiting for Customer to reply
 */
function getMatchingCases() {
	//set activating status filter here
	var flt = new Array();
	log('DEBUG','Status to check',objConfig.status);
	flt[0]=new nlobjSearchFilter(CASE_STATUS_ID,null,'anyof',objConfig.status);
	if (lastProcessed) {
		flt[1] = new nlobjSearchFilter(INTERNAL_ID_NUM,null,'lessthan',parseInt(lastProcessed));
	}
	
	return nlapiSearchRecord(CASE_INTERNALID,CASE_SEARCH_ID,flt,null);
}

function initScriptParam() {
	//TESTING 
	today = new Date(TEST_DATE);
	//PROD
	//today = new Date(getTodayString());
	lastProcessed = ctx.getSetting('SCRIPT',SCRIPT_PARAM_PROC_INTERNALID);
	caseStatusToProc = ctx.getSetting('SCRIPT',SCRIPT_PARAM_CASE_STATUS);
	if (caseStatusToProc) {
		setConfiguration();
		return true;
	} else {
		return false;
	}
}

function initCaseObject(_row) {
	var obj = new Object();
	obj.caseid = _row.getValue(INTERNAL_ID);
	obj.waitdate = _row.getValue(STATUS_SET_DATE_ID);
	obj.contactid = _row.getValue(CASE_CONTACT_ID);
	obj.number = _row.getValue(CASE_NUMBER_ID);
	obj.subject = _row.getValue(CASE_SUBJECT_ID);
	obj.assignedto = _row.getValue(CASE_ASSIGNED_TO_ID);
	
	return obj;
}

function setConfiguration() {
	log('DEBUG','Begin Setting Config','Starting config');
	var flds = new Array();
	flds[0]=CONFIG_ACT_CASE_STATUS;
	flds[1]=CONFIG_SOLUTION;
	flds[2]=CONFIG_INIT_WAIT_DAYS;
	flds[3]=CONFIG_SET_TO_RESOLVE_DAYS;
	flds[4]=CONFIG_FINAL_CASE_STATUS;
	flds[5]=CONFIG_NAME;
	var cfg = nlapiLookupField(CONFIG_REC_ID, caseStatusToProc,flds);
	//set objConfig
	objConfig.configname=cfg[CONFIG_NAME]; 
	objConfig.status = cfg[CONFIG_ACT_CASE_STATUS]; //internal id of case status
	objConfig.solution = cfg[CONFIG_SOLUTION];
	objConfig.daystosend = cfg[CONFIG_INIT_WAIT_DAYS];
	objConfig.daystorespond = cfg[CONFIG_SET_TO_RESOLVE_DAYS];
	objConfig.daystoresolve = parseInt(cfg[CONFIG_INIT_WAIT_DAYS]) + parseInt(cfg[CONFIG_SET_TO_RESOLVE_DAYS]); //total days it needs to wait to close
	objConfig.endstatus = cfg[CONFIG_FINAL_CASE_STATUS];
	if (objConfig.solution) {
		//lookup solution text
		objConfig.origmsg = nlapiLookupField(SOLUTION_REC_ID, objConfig.solution, SOLUTION_MSG_ID);
	}
	
	log('DEBUG','set configuration',objConfig.status);
}

/**
 * Returns todays date formatted in MM/DD/YYYY in String
 */
function getTodayString() {
	var strMon, strDate, strYear;
	var today = new Date();
	strMon = today.getMonth() + 1;
	strDate = today.getDate();
	strYear = today.getFullYear();
	return strMon+'/'+strDate+'/'+strYear;
}

