/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Feb 2013     efagone
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function processThem(type){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	processChangeRecords();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
	
}

function processChangeRecords(){

	var arrChangesToProcess = nlapiSearchRecord('customrecordr7employeechangerecords', 13222);
	
	for (var i = 0; arrChangesToProcess != null && i < arrChangesToProcess.length && timeLeft() && unitsLeft(); i++) {
	
		var changeReqId = arrChangesToProcess[i].getId();
		
		try {
		
			var recChangeReq = nlapiLoadRecord('customrecordr7employeechangerecords', changeReqId);
			
			var employeeId = recChangeReq.getFieldValue('custrecordr7employeechangeemployee');
			var finalVerification = recChangeReq.getFieldValue('custrecordr7employeechangeverification');
			var employeeRecUpdated = recChangeReq.getFieldValue('custrecordr7employeechangerecordupdated');
			
			if (finalVerification == 'F' || employeeRecUpdated == 'T') {
				//doesn't meet criteria
				nlapiLogExecution('ERROR', 'Someone is off', 'Employee Change Result Didnt meet criteria to be processed');
				continue;
			}
			
			var recEmployee = nlapiLoadRecord('employee', employeeId);
			
			// set employee fields
			
			var classification = recChangeReq.getFieldValue('custrecordr7employeechangeclassification');
			if (hasValue(classification)) {
				recEmployee.setFieldValue('employeestatus', classification);
			}
			
			var bonus = recChangeReq.getFieldValue('custrecordr7employeechangebonus');
			if (hasValue(bonus)) {
				recEmployee.setFieldValue('custentityr7employeebonusamountannual', bonus);
			}
			
			var bonusFreq = recChangeReq.getFieldValue('custrecordr7employeechangebonusfrequency');
			if (hasValue(bonusFreq)) {
				recEmployee.setFieldValue('custentityr7employeebonuspaymentsched', bonusFreq);
			}
			
			var eligCommission = recChangeReq.getFieldValue('custrecordr7employeechangecommission');
			if (hasValue(eligCommission)) {
				recEmployee.setFieldValue('eligibleforcommission', eligCommission);
			}
			
			var title = recChangeReq.getFieldValue('custrecordr7employeechangejobtitle');
			if (hasValue(title)) {
				recEmployee.setFieldValue('title', title);
			}
			
			var department = recChangeReq.getFieldValue('custrecordr7employeechangedepartment');
			if (hasValue(department)) {
				recEmployee.setFieldValue('department', department);
			}
			
			var location = recChangeReq.getFieldValue('custrecordr7employeechangelocation');
			if (hasValue(location)) {
				recEmployee.setFieldValue('location', location);
			}
			
			var directMgr = recChangeReq.getFieldValue('custrecordr7employeechangedirectmanager');
			if (hasValue(directMgr)) {
				recEmployee.setFieldValue('custentityr7supervisordirect', directMgr);
			}
			
			var commissionMgr = recChangeReq.getFieldValue('custrecordr7employeechangecommissionmngr');
			if (hasValue(commissionMgr)) {
				recEmployee.setFieldValue('supervisor', commissionMgr);
				recEmployee.setFieldValue('custentityr7empeffectivedatecommsupervis', nlapiDateToString(new Date()));
			}
			
			var practiceMgr = recChangeReq.getFieldValue('custrecordr7employeechangepracticemngr');
			if (hasValue(practiceMgr)) {
				recEmployee.setFieldValue('custentityr7practicegroupmanager', practiceMgr);
			}
			
			var expenseApprover = recChangeReq.getFieldValue('custrecordr7employeechangeexpenseapprove');
			if (hasValue(expenseApprover)) {
				recEmployee.setFieldValue('approver', expenseApprover);
			}
			
			var purchaseApprover = recChangeReq.getFieldValue('custrecordr7employeechangepurchaseapprov');
			if (hasValue(purchaseApprover)) {
				recEmployee.setFieldValue('purchaseorderapprover', purchaseApprover);
			}
			
			var timeApprover = recChangeReq.getFieldValue('custrecordr7employeechangetimeapprover');
			if (hasValue(timeApprover)) {
				recEmployee.setFieldValue('timeapprover', timeApprover);
			}
			
			var travelApprover = recChangeReq.getFieldValue('custrecordr7employeechangetravelapprover');
			if (hasValue(travelApprover)) {
				recEmployee.setFieldValue('custentityr7travelapprover', travelApprover);
			}
			
			var quoteApprover = recChangeReq.getFieldValue('custrecordr7employeechangequoteapprover');
			if (hasValue(quoteApprover)) {
				recEmployee.setFieldValue('custentityr7approvalapprover', quoteApprover);
			}
			
			var newPay = recChangeReq.getFieldValue('custrecordr7employeechangepay');
			var origPay = recChangeReq.getFieldValue('custrecordr7employeechangeorigpayrate');
			if (hasValue(newPay) && newPay != origPay) {
				recEmployee.setFieldValue('custentityr7lastraisedate', nlapiDateToString(new Date()));
				recEmployee.setFieldValue('custentityr7salaryregular', newPay);
			}
			var newCommission = recChangeReq.getFieldValue('custrecordr7commissionamount');
			if(hasValue(newCommission))
				{
				recEmployee.setFieldValue('custentityr7commissiontarget', newCommission);
				}
			
			nlapiSubmitRecord(recEmployee);

			nlapiSubmitField('customrecordr7employeechangerecords', changeReqId, 'custrecordr7employeechangerecordupdated', 'T');

			//send from = Caitlin Swofford (3889342), send to = Liliana Herrera (70111348)
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Employee Change Record Processed', 'Employee: ' + employeeId);

			nlapiLogExecution('AUDIT', 'Employee Change Record Processed', 'Employee: ' + employeeId);

			}

			catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiLogExecution('ERROR', 'Error Processing Emp Change Req', 'Error: ' + e);

			//send from = Caitlin Swofford (3889342), send to = Caitlin Swofford (3889342)

			nlapiSendEmail(adminUser, adminUser, 'Error Processing Emp Change Req', 'Change Rec ID: ' + changeReqId + '\nError: ' + e, 'caitlin_swofford@rapid7.com');

			}
		
	}
	
	if (i >= 999) {
		rescheduleScript = true;
	}
}

function hasValue(value){

	if (value != null && value != '') {
		return true;
	}
	
	return false;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}