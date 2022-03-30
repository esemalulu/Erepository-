/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Apr 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var employeeNotification = nlapiGetContext().getSetting('SCRIPT', 'custscript_employee_notifications1');
	var ccVal = nlapiGetContext().getSetting('SCRIPT', 'custscript_copied_notifications1');
	
	var cc = ccVal.split(',');
	var empID = [];
	var terr = [];
	var territories = [];
	var csvHeader = '"Status","Details","Employee ID","Company ID","Company Name","Operation"\n';
	var csvBody = '';
	var removeBDASuccess = 0;
	var removeBDAFailure = 0;
	var values = [ "-5","25"];
	
	var sf = 
		[
			new nlobjSearchFilter('custentity_emp_bdaterritory', null, 'noneOf', values, '@NONE@'),
			new nlobjSearchFilter('releasedate', null, 'isempty')
		];
	
	var sc = [
		          new nlobjSearchColumn('entityid'),
		          new nlobjSearchColumn('internalid'),
		          new nlobjSearchColumn('custentity_emp_bdaterritory')
	         ];
	
	var resultSet = nlapiSearchRecord('employee', null, sf, sc);
	for (var i = 0; i< resultSet.length; i+=1)
	{
		empID.push(resultSet[i].getValue('internalid'));
		if(resultSet[i].getValue('custentity_emp_bdaterritory') != '')
		{
			terr.push(resultSet[i].getValue('custentity_emp_bdaterritory'));
		}
	}
	
	top:for(var a = 0; a < empID.length; a+=1)
	{
		var sf = [
		          	new nlobjSearchFilter('territory', null, 'anyof', terr[a].split(',')),
		          	new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		          	new nlobjSearchFilter('salesteammember', null, 'noneof', empID[a]),
		          	new nlobjSearchFilter('salesteamrole', null, 'anyof', '28')
		        ];
	    
	    var sc = [
	              	new nlobjSearchColumn('internalid'),
	              	new nlobjSearchColumn('altname')
	             ];
	    
	    try
	    {
		    var search = nlapiSearchRecord('customer', null, sf, sc);
		    if(search != null)
		    {
			    var eID = empID[a];
			    for(var i = 0; i < search.length; i+=1)
			    {
			    	var rec = nlapiLoadRecord('customer', search[i].getValue('internalid'));
			    	var lineCount = rec.getLineItemCount('salesteam');
			    	for (var y = 0; y < lineCount; y+=1)
			    	{
			    		var role = rec.getLineItemValue('salesteam', 'salesrole', y+1);
			    		var emp  = rec.getLineItemValue('salesteam', 'employee', y+1);
			    		if(role  == '28' && emp != eID)
			    		{
			    			rec.removeLineItem('salesteam', y+1);
			    		}
			    	}
			    	nlapiSubmitRecord(rec);
			    	csvBody += '"Success",' +
								'"",' +
								'"' + eID + '",' +
								'"' + rec.getId() + '",' +
								'"' + rec.getFieldValue('companyname') + '",' +
					'"REMOVE BDA Associate"\n';
				    removeBDASuccess+=1;
					if(nlapiGetContext().getRemainingUsage() <= 50)
					{
						var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
						nlapiLogExecution('DEBUG','Rescheduling the script status', status);
						if(status == 'QUEUED')
							break top;
					}
			    }
		    }
	    } 
	    catch (err)
	    {
	    	csvBody += '"Error",' +
	    			'"' + getErrText(err) +'",'+
					'"' + eID + '",' +
					'"' + rec.getId()+ '",' +
					'"' + rec.getFieldValue('companyname') + '",' +
			'"REMOVE BDA Associate"\n';
			removeBDAFailure+=1;
	    }
	}
    if (csvBody)
	{
		var logFile = nlapiCreateFile('scriptExecutionLog.csv', 'CSV', csvHeader+csvBody);
		
		var sbj = 'Removed BDA Associate on Client Accounts Ran on '+ nlapiDateToString(new Date());
		var msg = 'Please see attached Log for Client Accounts with Removed BDA Associates. <br/><br/>' +
				  '# Of Clients with a BDA Associate successfully removed: ' + removeBDASuccess + '<br/>' +
				  '# Of Clients with an error: ' + removeBDAFailure + '<br/>';
		
		nlapiSendEmail(-5, employeeNotification, sbj, msg, cc, null, null, logFile);	
	}
    
}
