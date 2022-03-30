/**
 * Script Description: The purpose of this script is to update the sales team on each client record depending on territory assigned to the BDA Associate. This script will execute daily at midnight.
 * Mind Gym Ticket: 7189
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       Jan 22, 2016     rlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function updateBDASalesAssociate(type) 
{
	var salesRoles = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_sales_role');
	var employeeNotification = nlapiGetContext().getSetting('SCRIPT', 'custscript_employee_notifications');
	var ccVal = nlapiGetContext().getSetting('SCRIPT', 'custscript_copied_notifcations');
	var jobTitle = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_job_title');
	var cc = ccVal.split(',');
	
	if(salesRoles.indexOf(',') > -1) 
	{
		var salesRoleArray = salesRoles.split(',');
	}
	else 
	{
		var salesRoleArray = salesRoles;
	}

	var territoryids = [];
	var territory = '', 
		employee = '',
		empID = '',
		clientID = '',
		incrementor = 0,
		eTitle = '',
		errLog = '';
	
	var csvHeader = '"Status","Details","Employee ID","Employee Name","Company ID","Company Name","Operation"\n',
		csvBody = '',
		addClientSuccess = 0, 
		updateClientFailed = 0;

	var values = [ "-5","25"];
	//BDA Employee search - Pulls all BDA Employees	
	var employeeFilters = 
		[
			new nlobjSearchFilter('custentity_emp_bdaterritory', null, 'noneOf', values, '@NONE@'),
			new nlobjSearchFilter('releasedate', null, 'isempty')
		];
		
	var employeeColumns = 
		[
			new nlobjSearchColumn('internalid'),
			new nlobjSearchColumn('entityid'),
			new nlobjSearchColumn('title'),
			new nlobjSearchColumn('custentity_emp_bdaterritory')
		];
	
	var resultSet = nlapiSearchRecord('employee', null, employeeFilters, employeeColumns);
	top:for (var i = 0; resultSet && i < resultSet.length; i+=1)
	{
		try
		{
			// Looping through the returned employees and getting the information where the territories is not null
			if(resultSet[i].getValue(employeeColumns[3]) != "")
		    {
		        empID        = resultSet[i].getValue(employeeColumns[0]);
		        employee     = resultSet[i].getValue(employeeColumns[1]);
		        eTitle       = resultSet[i].getValue(employeeColumns[2]);
		        territory    = resultSet[i].getValue(employeeColumns[3]);	
		        territoryids.push(territory.split(","));
		        
		        // Client search based on employees territories
		        var addClientFilter = [
		                new nlobjSearchFilter('territory', null, 'anyOf', territoryids[incrementor]),
		                new nlobjSearchFilter('isinactive', null, 'is', 'F')
		        ];
		        
		        var addClientColumns = new Array();
		        	addClientColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
		        	addClientColumns[1] = new nlobjSearchColumn('altname', null, 'group');
		        	addClientColumns[2] = new nlobjSearchColumn('formulatext', null, 'max');
		        	addClientColumns[2].setLabel('Sales Rep/ Team');
		        	addClientColumns[2].setFormula("Replace(ns_concat({salesteammember}),',', '<BR>')");
		        	addClientColumns[3] = new nlobjSearchColumn('territory', null, 'max');
		        
		        // Searching for all clients that match the criteria for the search above.
		        var rs = nlapiSearchRecord('customer', null, addClientFilter, addClientColumns);
		        nlapiLogExecution('DEBUG','Number Of Records Returned', rs.length);
		        nlapiLogExecution('DEBUG','Employee', employee);
				if (rs != null)
				{
					for (var y = 0; y <rs.length; y+=1)
					{
						// ADD - If the employee is returned from the customer and they are not in the sales team add them into the sales team.
					    if(rs[y].getValue(addClientColumns[2]).search(employee) == -1)
					    {
					    	clientID = rs[y].getValue(addClientColumns[0])
					    	var rec = nlapiLoadRecord('customer', clientID);
					    		rec.selectNewLineItem('salesteam')
					    		rec.setCurrentLineItemValue('salesteam','employee', empID)
					    		rec.setCurrentLineItemValue('salesteam','contribution', 0.0);
					    		rec.commitLineItem('salesteam');
					    	nlapiSubmitRecord(rec);
					    	
					    	csvBody += '"Success",' +
					    				'"",' +
					    				'"' + empID + '",' +
					    				'"' + employee + '",' +
					    				'"' + clientID + '",' +
					    				'"' + rec.getFieldValue('companyname') + '",' +
					    				'"ADD BDA Associate"\n';
					    	addClientSuccess+=1;
					    }
						if(nlapiGetContext().getRemainingUsage() <= 50)
						{
							var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
							nlapiLogExecution('DEBUG','Rescheduling the script status', status);
							if(status == 'QUEUED')
								break top;
						}
					}
					incrementor+=1;
				}
		    }
		}
		catch (err)
		{
	    	csvBody += '"Error",' +
	    	'"' + getErrText(err) +'",'+
			'"' + empID + '",' +
			'"' + employee + '",' +
			'"' + clientID + '",' +
			'"' + rec.getFieldValue('companyname') + '",' +
			'""\n';
			incrementor+=1;
			updateClientFailed+=1;
			

		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / resultSet.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
	}
	
	if (csvBody)
	{
		var logFile = nlapiCreateFile('scriptExecutionLog.csv', 'CSV', csvHeader+csvBody);
		
		var sbj = 'Updating BDA Associate on Client Accounts Ran on '+ nlapiDateToString(new Date());
		var msg = 'Please see attached Log for Client Accounts with Updated BDA Associates. <br/><br/>' +
				  '# Of Clients with a BDA Associate successfully added: ' + addClientSuccess + '<br/>' +
				  '# Of Clients with an error: ' + updateClientFailed + '<br/>';
		
		nlapiSendEmail(-5, employeeNotification, sbj, msg, cc, null, null, logFile);	
	}
}


