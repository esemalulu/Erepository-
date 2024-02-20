/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Nov 2015     Jacob Shetler
 *
 */

/**
 * After creating a program, send an email to all employees that have access to approve or deny the program.
 * In the email include links to approve or deny the program.
 *  
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function AfterSubmit(type)
{
	if (type == 'create')
	{
		//Get all employees and email address in the group set in the script deployment.
		var empResults = createEmployeeHashFromGroup(nlapiGetContext().getSetting('SCRIPT', 'custscript_gd_emailgroup'));
		
		//Get the email that we'll use to send the emails under.
		var currentUserId = nlapiGetUser();
		
		//Set up the variables to use for each iteration of the loop.
		var programID = nlapiGetRecordId();
		var programName = nlapiGetFieldValue('name');
		var subject = 'Spiff Program - ' + programName;
		var records = new Object();
		records['record'] = nlapiGetRecordId();
		records['recordtype'] = nlapiGetRecordType();
		
		//Create the email body. First do the information for the spiff program.
		var tableFields = {};
		tableFields['Program Type'] = nlapiGetFieldText('custrecordprogram_type');
		tableFields['Description'] = nlapiGetFieldValue('custrecordprogram_description');
		tableFields['Sales Rep'] = nlapiGetFieldText('custrecordprogram_salesrep');
		tableFields['Dealer'] = nlapiGetFieldText('custrecordprogram_dealer');
		tableFields['Start Date'] = nlapiGetFieldValue('custrecordprogram_startdate');
		tableFields['End Date'] = nlapiGetFieldValue('custrecordprogram_enddate');
		tableFields['Comments'] = nlapiGetFieldValue('custrecordprogram_comments');
		var emailMessage = '<html><body><h3>New Spiff Program "' + programName + '" created. See details below.</h3>';
		emailMessage += '<table border="1px solid black" cellpadding="5">';
		for(var idx in tableFields) emailMessage += '<tr><td>' + idx + '</td><td>' + tableFields[idx] + '</td></tr>';
		emailMessage += '</table>';
		
		//Then do the table for all of the unit information
		var unitLineType = 'recmachcustrecordprogramunit_program';
		emailMessage += '<h3>Units That Apply</h3><table border="1px solid black" cellpadding="5"><tr><th>Unit</th><th>Model</th><th>Days on Lot</th><th>Incentive Amount</th></tr>';
		for (var i = 1; i <= nlapiGetLineItemCount(unitLineType); i++)
		{
			//Calculate the days on the lot. If the unit has a sold date, this value is empty. Otherwise it is the number of days since the shipped date.
			var daysOnLot = '';
			var soldDate = nlapiGetLineItemValue(unitLineType, 'custrecordprogramunit_solddate', i);
			var shipDate = nlapiGetLineItemValue(unitLineType, 'custrecordprogramunit_shipdate', i);
			if(soldDate == null || soldDate.length == 0)
			{
				if(shipDate != null && shipDate.length > 0)
				{
					daysOnLot = Math.floor((new Date() - new Date(shipDate)) / (1000*60*60*24)); //convert the date difference to days.
				}
			}
			else
			{
				if(shipDate != null && shipDate.length > 0)
				{
					daysOnLot = Math.floor((new Date(soldDate) - new Date(shipDate)) / (1000*60*60*24)); //convert the date difference to days.
				}
			}
			
			var modelText = nlapiLookupField('customrecordrvsunit', nlapiGetLineItemValue(unitLineType, 'custrecordprogramunit_unit', i), 'custrecordunit_model', true);
			emailMessage += '<tr><td>' + nlapiGetLineItemText(unitLineType, 'custrecordprogramunit_unit', i) + '</td>' +
								'<td>' + modelText + '</td>' +
								'<td>' + daysOnLot + '</td>'+
								'<td>' + nlapiGetLineItemValue(unitLineType, 'custrecordprogramunit_incentiveamount', i) + '</td></tr>';
		}
		emailMessage += '</table>';
		
		//Append the approve and cancel links. Send the emails.
		emailMessage += '<br />Use the following links to update the Spiff Program.';
		for (var employeeId in empResults)
		{
			//create the approve and cancel links.
			var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_approveprogramsuitelet', 'customdeploygd_approveprogramsuitelet_d', true);
			var linkStub = '<a href="' + suiteletURL + '&custscript_program_id=' + 	programID + '&custscript_program_userid=' + employeeId + '&custscript_program_approved=';
			var approveLink = linkStub + 'T">Approve</a>';
			var cancelLink = linkStub + 'F">Reject</a>';
			
			//send the email to the employee
			var curEmail = emailMessage + '<table style="font-size:24px"><tr><td style="padding-right: 50">' + approveLink + '</td><td>' + cancelLink + '</td></tr></table></body></html>';
			nlapiSendEmail(currentUserId, empResults[employeeId], subject, curEmail, null, null, records);
		}
		nlapiLogExecution('debug', 'email', curEmail);
	}
}

/**
 * Checks if the program is still open. If it is, set it to be approved or cancelled based on the approve parameter.
 * Also sets the approved/cancelled date and the approved/cancelled user.
 * 
 * @param request The request parameters coming from the email.
 * @param response We'll write out the result of trying to update the program in this object.
 */
function ApproveOrCancelProgramSuitelet(request, response)
{
	//get the parameters
	var programID = request.getParameter('custscript_program_id');
	var userID = request.getParameter('custscript_program_userid');
	var approved = request.getParameter('custscript_program_approved');
	var todayString = nlapiDateToString(new Date());
	
	//create the label to display the result.
	var displayText = '';
	
	//make sure the program is still set to Open
	var program = nlapiLoadRecord('customrecordrvsprogram', programID);
	if(program != null)
	{
		if(program.getFieldValue('custrecordprogram_status') == 1)
		{
			//set the status, date, and user. Also set the display message
			var empName = '';
			if(approved == 'T')
			{
				program.setFieldValue('custrecordprogram_status', 4);
				program.setFieldValue('custrecordprogram_approvedby', userID);
				program.setFieldValue('custrecordprogram_approveddate', todayString);
				displayText = 'Program "' + program.getFieldValue('name') + '" has been approved.';
				empName = program.getFieldText('custrecordprogram_approvedby');
			}
			else
			{
				program.setFieldValue('custrecordprogram_status', 2);
				program.setFieldValue('custrecordprogram_cancelledby', userID);
				program.setFieldValue('custrecordprogram_cancelleddate', todayString);
				displayText = 'Program "' + program.getFieldValue('name') + '" has been rejected.';
				empName = program.getFieldText('custrecordprogram_cancelledby');
			}
			
			//submit the record
			nlapiSubmitRecord(program);
			
			//send the emails saying what just happened
			sendEmailsAfterApproveOrReject(approved == 'T', program.getFieldValue('name'), empName);
		}
		else
		{
			//then the program is not Open. Give a message depending on the current status of the program.
			displayText = 'Program "' + program.getFieldValue('name') + '" has';
			if(program.getFieldValue('custrecordprogram_status') == 2)
				displayText += ' already been rejected by ' + program.getFieldText('custrecordprogram_cancelledby') + '.';
			else if (program.getFieldValue('custrecordprogram_status') == 3)
				displayText += ' expired.';
			else if (program.getFieldValue('custrecordprogram_status') == 4)
				displayText += ' already been approved by ' + program.getFieldText('custrecordprogram_approvedby') + '.';
			else if (program.getFieldValue('custrecordprogram_status') == 5)
				displayText += ' already been completed.';
				
			displayText += ' You may not change its status.';
		}
	}
	else
	{
		displayText = 'Error: Could not find a program with the specified ID: ' + programID;
	}
	
	//give the response
	response.write('<html><body><h3>' + displayText + '<br />Please close your browser window.</h3></body></html>');
}


/**
 * Sends an email to the group set by the parameter on the script on the result of the program being approved/rejected.
 * 
 * @param approved True if the program was approved, false otherwise
 * @param programName The name of the program to include in the email.
 * @param userName The name of the user that approved/rejected.
 */
function sendEmailsAfterApproveOrReject(approved, programName, userName)
{
	//get the employees to send the emails to
	var empResults = createEmployeeHashFromGroup(nlapiGetContext().getSetting('SCRIPT', 'custscript_program_responseemails'));
	
	//loop over the employees and send a simple email saying that it has been approved/rejected
	var emailMessage = '<html><body><p>Program Spiff "' + programName + '" has been ' + (approved ? 'approved' : 'rejected') + ' by ' + userName + '.</p></body></html>';
	var subject = 'Program Spiff "' + programName + '" ' + (approved ? 'Approved' : 'Rejected');
	for(var empID in empResults)
	{
		nlapiSendEmail(empID, empResults[empID], subject, emailMessage);
	}
}

/**
 * Finds all employees of a group and returns a hash of employeeID -> employeeEmail.
 * 
 * @param groupID The ID of the group.
 */
function createEmployeeHashFromGroup(groupID)
{
	var empResults = {};
	if(groupID != null && groupID != '')
	{
		var group = nlapiLoadRecord('entitygroup', groupID);
		for (var i = 1; i <= group.getLineItemCount('groupmembers'); i++)
		{
			var curEmail = group.getLineItemValue('groupmembers', 'memberemail', i);
			var curEmpResult = nlapiSearchRecord('employee', null, new nlobjSearchFilter('email', null, 'is', curEmail), new nlobjSearchColumn('internalid'));
			if(curEmpResult != null && curEmpResult.length > 0)
			{
				empResults[curEmpResult[0].getValue('internalid')] = curEmail;
			}
		}
	}
	return empResults;
}

/* Use this code to get all employees with the sales manager function. GD doesn't want to use this right now.
var filters = [];
filters.push(new nlobjSearchFilter('custentityrvssalesmanagerfunction', null, 'is', 'T'));
var columns = [];
columns.push(new nlobjSearchColumn('internalid'));
columns.push(new nlobjSearchColumn('email'));
var empResults = nlapiSearchRecord('employee', null, filters, columns);
*/