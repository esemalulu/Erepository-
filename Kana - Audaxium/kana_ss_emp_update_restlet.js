/*
Script Name : kana_ss_emp_update_restlet.js
Author : Sagar Shah
Date : 1/21/2013
Description : This restlet would be called by Workday-NetSuite Integration.
===================================================================================
CHANGEID : AUTO_RECORD_CREATION
Author : Sagar Shah
Date : 05/06/2013
Description : Check if the new hire record doesn't already exist and create one. Go ahead with Class info for now.
===================================================================================
CHANGEID : UPDATE_ONLY_IFCHANGED
Author : Sagar Shah
Date : 07/31/2013
Description : Update an employee record only if there are any updates from Workday.
===================================================================================
CHANGEID : SYNC_LOCATION
Author : Sagar Shah
Date : 07/31/2013
Description : Sync employee location as well.
===================================================================================
CHANGEID : APPROVAL_LIMIT
Author : Sagar Shah
Date : 09/04/2013
Description : Set the new employee approval limit to 0 by default.
===================================================================================
CHANGEID : JOB_RESOURCE_FLAG
Author : Sagar Shah
Date : 09/23/2013
Description : Set the new employee as job resource if dept is proserve or managed services.
===================================================================================
CHANGEID : SYNC_CLASS
Author : Sagar Shah
Date : 09/24/2013
Description : Sync Employee Class information.
*/

//No of Execution Units: 674*5 (load record) + 674*10 (submit record)
var sNetsuiteEmailId = 16921;//AppScript Notification 

function updateEmpDetailsPOST(empList)
{
	var empStatusList = new Object();
	var startIndex = empList.startIndex;
	var endIndex = empList.endIndex;

	for(var i=startIndex; i<endIndex; i++) {
			var empData = new Object();
			empData.empWorkdayID = empList['empWorkdayID'+i];
			empData.empSupervisorID = empList['empSupervisorID'+i];
			empData.empTitle = empList['empTitle'+i];
			empData.empDepartment = empList['empDepartment'+i];
			empData.empSubsidiary = empList['empSubsidiary'+i];
			empData.empFirstName = empList['empFirstName'+i];
			empData.empLastName = empList['empLastName'+i];
			empData.empEmail = empList['empEmail'+i];
			empData.empBusinessSite = empList['empBusinessSite'+i];
			empData.empClass = empList['empClass'+i];
			empStatusList['msg'+i] = updateEmployeeRecord(empData);
	}//end for loop
	return empStatusList;
}

function updateEmployeeRecord(dataIn)
{
	var msg="";
	try
	{
		var empDataChangeFlag = false; //UPDATE_ONLY_IFCHANGED
		var empWorkdayID = dataIn.empWorkdayID;
		nlapiLogExecution ('DEBUG', 'Employee Workday ID', empWorkdayID);		
		
		var empRecordId = getEmpInternalID(empWorkdayID);
		if(empRecordId==null) {
			//AUTO_RECORD_CREATION - start			
			if(empWorkdayID=='' || empWorkdayID==null)
				return "WorkdayID is null.";
			
			var statusStr = checkAndCreateNewRecord(dataIn);
			if(statusStr != null)
				return statusStr;
			else
				return "Employee Not Found based on WorkdayID : "+empWorkdayID;
			//AUTO_RECORD_CREATION - end
		}
			
		var empRecord = nlapiLoadRecord('employee',empRecordId);//5 Units
		msg = "Success";

		var supRecordId = getEmpInternalID(dataIn.empSupervisorID);
		
		if(supRecordId==null) 
			msg = "Supervisor Not Found based on Supervisor WorkdayID : "+dataIn.empSupervisorID;	
		else {
			if(supRecordId==empRecordId)
				msg = "Employee cannot be Supervisor for self. WorkdayID : "+dataIn.empSupervisorID;
			else {
				//UPDATE_ONLY_IFCHANGED - start
				if(supRecordId!=empRecord.getFieldValue('supervisor')) {
					empDataChangeFlag = true;
					empRecord.setFieldValue('supervisor', supRecordId);
				}
				//UPDATE_ONLY_IFCHANGED - end
			}			
		}

		//UPDATE_ONLY_IFCHANGED - start
		if(dataIn.empTitle!=empRecord.getFieldValue('title') && dataIn.empTitle!=null) {
			empDataChangeFlag = true;
			empRecord.setFieldValue('title', dataIn.empTitle);
		}	
		//UPDATE_ONLY_IFCHANGED - end

		var deptID = getDepartmentInternalID(dataIn.empDepartment);
		if(deptID!=null) {
			//UPDATE_ONLY_IFCHANGED - start
			if(deptID!=empRecord.getFieldValue("department")) {
				empDataChangeFlag = true;
				empRecord.setFieldValue('department', deptID);
			}
			//UPDATE_ONLY_IFCHANGED - end
		}
		else {
			if(msg!="Success")
				msg += "Department Not Found : "+deptID;	
			else 
				msg = "Department Not Found : "+deptID;	
		}

		//SYNC_CLASS - start
		var classID = getClassInternalID(dataIn.empClass);
		if(classID!=null) {
			if(classID!=empRecord.getFieldValue("class")) {
				empDataChangeFlag = true;
				empRecord.setFieldValue('class', classID);
			}
		}
		else {
			if(msg!="Success")
				msg += "Class Not Found : "+deptID;	
			else 
				msg = "Class Not Found : "+deptID;	
		}
		//SYNC_CLASS - end

		//check if the subsidiary was changed in workday and just send the message 
		//but do not update subsidiary based on workday
		var subID = getSubsidiaryInternalID(dataIn.empSubsidiary);
		if(subID!=null && subID!=empRecord.getFieldValue("subsidiary")) {			
			if(msg!="Success")
				msg += "Subsidiary diff in Workday : "+dataIn.empSubsidiary;	
			else 
				msg = "Subsidiary diff in Workday : "+dataIn.empSubsidiary;	
		}			
		
		//SYNC_LOCATION - start		
		var locationID = getLocationInternalID(dataIn.empBusinessSite);
		if(locationID!=null) {
			//UPDATE_ONLY_IFCHANGED - start
			if(locationID!=empRecord.getFieldValue("custentity_emp_location")) {
				empDataChangeFlag = true;
				empRecord.setFieldValue('custentity_emp_location', locationID);
			}
			//UPDATE_ONLY_IFCHANGED - end
		}
		else {
			if(msg!="Success")
				msg += "Location Not Found : "+locationID;	
			else 
				msg = "Location Not Found : "+locationID;	
		}
		//SYNC_LOCATION - end
		
		if(empDataChangeFlag==true)
			nlapiSubmitRecord(empRecord, true,true);//10 Unites
		else
			msg += "** No Change";
		
		return msg;		
	}
	catch(exception){
			msg = exception.name+':'+exception.message;
			// catch error if any other exception occurs
			var errorText = 'UNEXPECTED ERROR: Emp Data sync with Workday ' + '\n\n' +
						'Script Name : kana_ss_emp_update_restlet.js' + '\n' +
						'Error Details: ' + exception.toString();
           	nlapiLogExecution('ERROR', 'Exception occurred', exception.toString());
           	
           	if(exception.name!='INSUFFICIENT_PERMISSION') //this must be the case when the employee is admin so avoid sending email
           		nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'Error Message - Emp Update from Workday', errorText, null, null);

	}
	return msg;
}

/*
* Find Employee InternalID with the given WorkdayID
*/
function getEmpInternalID(empWorkdayID) 
{		
		try
		{
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('internalid');
			
			var searchFilters = new Array();		
			searchFilters[0] = new nlobjSearchFilter('custentity_workday_empid', null, 'is', empWorkdayID);
			searchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is','F');	
			
			var searchresults = nlapiSearchRecord('employee', null, searchFilters, searchColumns );
			for (var i = 0; searchresults != null && i < searchresults.length; i++ )
			{
				var searchresult = searchresults[i];				
				var empInternalID = searchresult.getValue('internalid');		
				nlapiLogExecution ('DEBUG', 'Employee Internal ID', empInternalID);		
				if(empInternalID=='')
					return null;
				return empInternalID;
			}//end for loop		
			return null;
		}
		catch (exception)
		{
			return null;
		}
}
/*
* Find Department Name based on the Department ID from Workday
*/
function getDepartmentInternalID(deptWorkdayID) 
{		
		try
		{
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('internalid');
			
			var searchFilters = new Array();		
			searchFilters[0] = new nlobjSearchFilter('name', null, 'contains', deptWorkdayID);
			searchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is','F');	
			
			var searchresults = nlapiSearchRecord('department', null, searchFilters, searchColumns );
			for (var i = 0; searchresults != null && i < searchresults.length; i++ )
			{
				var searchresult = searchresults[i];				
				var deptInternalID = searchresult.getValue('internalid');		
				nlapiLogExecution ('DEBUG', 'Department Internal ID', deptInternalID);						
				return deptInternalID;
			}//end for loop		
			return null;
		}
		catch (exception)
		{
			return null;
		}
}

//SYNC_CLASS - start
/*
* Find Class Name based on the Class value from Workday
*/
function getClassInternalID(classWorkdayID) 
{		
		try
		{
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('internalid');
			
			var searchFilters = new Array();		
			searchFilters[0] = new nlobjSearchFilter('name', null, 'contains', classWorkdayID);
			searchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is','F');	
			
			var searchresults = nlapiSearchRecord('classification', null, searchFilters, searchColumns );
			for (var i = 0; searchresults != null && i < searchresults.length; i++ )
			{
				var searchresult = searchresults[i];				
				var classInternalID = searchresult.getValue('internalid');		
				nlapiLogExecution ('DEBUG', 'Class Internal ID', classInternalID);						
				return classInternalID;
			}//end for loop		
			return null;
		}
		catch (exception)
		{
			return null;
		}
}
//SYNC_CLASS - end

//SYNC_LOCATION - start
/*
* Find Location based on the Location Name from Workday
*/
function getLocationInternalID(locationWorkdayName) 
{		
		try
		{
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('internalid');
			
			var searchFilters = new Array();		
			searchFilters[0] = new nlobjSearchFilter('name', null, 'is', locationWorkdayName);
			searchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is','F');	
			
			var searchresults = nlapiSearchRecord('customrecord_kana_locations', null, searchFilters, searchColumns );
			for (var i = 0; searchresults != null && i < searchresults.length; i++ )
			{
				var searchresult = searchresults[i];				
				var locationInternalID = searchresult.getValue('internalid');		
				nlapiLogExecution ('DEBUG', 'Location Internal ID', locationInternalID);						
				return locationInternalID;
			}//end for loop		
			return null;
		}
		catch (exception)
		{
			return null;
		}
}
//SYNC_LOCATION - end

/*
* Find Subsidiary InternalID based on the Subsidiary ID from Workday
*/
function getSubsidiaryInternalID(subWorkdayID) 
{		
		try
		{
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('internalid','custrecord_subsidiary');
			
			var searchFilters = new Array();		
			searchFilters[0] = new nlobjSearchFilter('custrecord_workday_sub_id', null, 'is',subWorkdayID);	
			
			var searchresults = nlapiSearchRecord('customrecord_workday_sub_id_mapping', null, searchFilters, searchColumns );
			for (var i = 0; searchresults != null && i < searchresults.length; i++ )
			{
				var searchresult = searchresults[i];				
				var subInternalID = searchresult.getValue(searchColumns[0]);		
				nlapiLogExecution ('DEBUG', 'Subsidiary Internal ID', subInternalID);						
				return subInternalID;
			}//end for loop		
			return null;
		}
		catch (exception)
		{
			return null;
		}
}


//AUTO_RECORD_CREATION - start
/*
 * The function does the following:
 *  1. Check if the Employee record is inactive. IF found, return appropriate message.
 *  2. Check if the Employee record exists based on email id but without any Workday ID value. If found, assign 
 *  	the Workday ID and forward appropriate message.
 *  3. If the above two conditions fail create a new Employee record.
 */
function checkAndCreateNewRecord(dataIn) {
	try
	{
		if(isEmpInactive(dataIn.empWorkdayID))
			return "Employee record is inactive.";
		
		//Update WorkdayID based on employee email id
		var searchColumns = new Array();
		searchColumns[0] = new nlobjSearchColumn('internalid');
		
		var searchFilters = new Array();		
		searchFilters[0] = new nlobjSearchFilter('email', null, 'is', dataIn.empEmail);
		searchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is','F');	
		searchFilters[2] = new nlobjSearchFilter('custentity_workday_empid', null, 'isempty');	
		
		var searchresults = nlapiSearchRecord('employee', null, searchFilters, searchColumns );
		for (var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			var searchresult = searchresults[i];				
			var empInternalID = searchresult.getValue('internalid');							
			if(empInternalID=='')
				return null;
			
			var empRecord = nlapiLoadRecord('employee', empInternalID);//5 Units
			empRecord.setFieldValue('custentity_workday_empid', dataIn.empWorkdayID);
			
			nlapiSubmitRecord(empRecord, true,true);//10 Unites
			return "WorkdayID is now setup for the Employee. The record would be updated in the next sync.";
			
		}//end for loop
		
		//Create a new Employee record assuming it is a New Hire
		var empRecord = nlapiCreateRecord('employee');
		empRecord.setFieldValue('firstname', dataIn.empFirstName);
		empRecord.setFieldValue('lastname', dataIn.empLastName);
		empRecord.setFieldValue('email', dataIn.empEmail);
		empRecord.setFieldValue('custentity_workday_empid', dataIn.empWorkdayID);
		
		var supRecordId = getEmpInternalID(dataIn.empSupervisorID);
		if(supRecordId!=null)
			empRecord.setFieldValue('supervisor', supRecordId);
		
		empRecord.setFieldValue('title', dataIn.empTitle);

		//set Subsidiary
		var subID = getSubsidiaryInternalID(dataIn.empSubsidiary);
		if(subID!=null) 
			empRecord.setFieldValue('subsidiary', subID);

		//set Department
		var deptID = getDepartmentInternalID(dataIn.empDepartment);
		if(deptID!=null) 
			empRecord.setFieldValue('department', deptID);
	
		
		//SYNC_CLASS - start
		var classID = getClassInternalID(dataIn.empClass);
		if(classID!=null)
			empRecord.setFieldValue('class', classID);
		//SYNC_CLASS - end		
		
		//JOB_RESOURCE_FLAG - start
		if(deptID==8 || deptID==52) //8 is proserve and 52 is managed services
			empRecord.setFieldValue('isjobresource', 'T');
		//JOB_RESOURCE_FLAG - end

		//set Class
		
		//set Location
		var locationID = getLocationInternalID(dataIn.empBusinessSite);
		if(locationID!=null) 
			empRecord.setFieldValue('custentity_emp_location', locationID);
		
		//APPROVAL_LIMIT - start
		empRecord.setFieldValue('expenselimit', '0.0');
		empRecord.setFieldValue('approvallimit', '0.0');
		empRecord.setFieldValue('purchaseorderlimit', '0.0');
		empRecord.setFieldValue('purchaseorderapprovallimit', '0.0');
		//APPROVAL_LIMIT - end

		nlapiSubmitRecord(empRecord, true,true);//10 Unites
		return "New Employee record created";
	}
	catch (exception)
	{
		return exception.name+':'+exception.message;
	}
	
}

/*
* Check if the Employee record is inactive based on the WorkdayID
*/
function isEmpInactive(empWorkdayID) 
{		
		try
		{
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('internalid');
			
			var searchFilters = new Array();		
			searchFilters[0] = new nlobjSearchFilter('custentity_workday_empid', null, 'is', empWorkdayID);
			searchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is','T');	
			
			var searchresults = nlapiSearchRecord('employee', null, searchFilters, searchColumns );
			for (var i = 0; searchresults != null && i < searchresults.length; i++ )
			{
				var searchresult = searchresults[i];				
				var empInternalID = searchresult.getValue('internalid');								
				if(empInternalID=='')
					return false;
				return true;
			}//end for loop		
			return false;
		}
		catch (exception)
		{
			return false;
		}
}

//AUTO_RECORD_CREATION - end

/*
* test function using HTTP GET method to update Emp record
*/
function updateEmpDetailsGET(dataIn)
{
	var empInternalId = dataIn.empInternalId;
	nlapiLogExecution ('DEBUG', 'Employee Number', empInternalId);
	var opptyObject = new Object();
	var empRecord = nlapiLoadRecord('employee',empInternalId);
	empRecord.setFieldValue('title', dataIn.empTitle);
	nlapiSubmitRecord(empRecord, true,true);
	opptyObject.msg = "Success";
	return opptyObject;
}
