/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Apr 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var to = nlapiGetContext().getSetting('SCRIPT', 'custscript_employee');
	var ccVal = nlapiGetContext().getSetting('SCRIPT', 'custscript_copiedemp');
	
	var cc = ccVal.split(',');
	var empID = [];
	var csvHeader = '"Status","Details","Employee ID","Company ID","Company Name","Operation"\n';
	var csvBody = '';
	var salesRep;
	var removeSuccess = 0;
	var removeFailure = 0;
	var rIndex = 0;
	var rMax = 1000;
	var resultSet;
	//var values = [ "-5","25"];
	
	var sf = [
	          	  new nlobjSearchFilter('title', null, 'is', 'Business Development Associate', null),
	              new nlobjSearchFilter('isinactive', null, 'is', 'F', null),
		  	      new nlobjSearchFilter('custentity_emp_bdaterritory', null, 'noneOf','@NONE@'),
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
	}

	
	var criteria = [
	                	new nlobjSearchFilter('isinactive', null, 'is', 'F', null),
	                	new nlobjSearchFilter('territory', null, 'noneof', '@NONE@', null)
	               ];
	
	var columns = [
	               		new nlobjSearchColumn('entityid'),
	               		new nlobjSearchColumn('altname'),
	               		new nlobjSearchColumn('salesrep'),
	               		new nlobjSearchColumn('internalid')
	              ];
	
	var custSearch = nlapiCreateSearch('customer',criteria, columns);
	var rs = custSearch.runSearch();
	try 
	{
		top:do 
		{
			resultSet = rs.getResults(rIndex, rIndex + rMax);
			for(var i = 0; i<resultSet.length; i+=1)
			{
				salesRep = resultSet[i].getValue('salesrep');
				var custRec = nlapiLoadRecord('customer', resultSet[i].getValue('internalid'));
				var lineCount = custRec.getLineItemCount('salesteam');
				for (var y = 0; y <lineCount; y+=1)
				{
					var salesTeamMember = custRec.getLineItemValue('salesteam','employee', y+1)
					if(empID.indexOf(salesTeamMember) > -1)
					{
						custRec.removeLineItem('salesteam', y+1);
						removeSuccess+=1;
					}
				}
				nlapiSubmitRecord(custRec);
				csvBody += '"SUCCESS","","' + salesRep + '","' + resultSet[i].getValue('internalid') + '","' + resultSet[i].getValue('entityid') + '","REMOVE OLD SALES REP SUCCESSFULLY"\n';
				if(nlapiGetContext().getRemainingUsage() <= 50)
				{
					
					var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
					nlapiLogExecution('DEBUG','Rescheduling the script status', status);
					if(status == 'QUEUED')
						break top;
				}
				var pctCompleted = Math.round(((i+1) / resultSet.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
			}
			rIndex = rIndex + rMax;
		} while (resultSet >= 1000)
	}
	catch (err)
	{
		removeFailure+=1;
		csvBody += '"FAILURE","' + getErrText(err) + '","' + salesRep + '","' + resultSet[i].getValue('internalid') + '","' + resultSet[i].getValue('entityid') + '","REMOVE OLD SALES REP SUCCESSFULLY"\n';
	}
	
	
	 if (csvBody)
		{
			var logFile = nlapiCreateFile('OldSalesRepRemovalLog.csv', 'CSV', csvHeader+csvBody);
			
			var sbj = 'Remove Old Sales Rep Ran on '+ nlapiDateToString(new Date());
			var msg = 'Please see attached Log for Client Accounts with Old Sales Reps. <br/><br/>' +
					  '# Of Clients with a Old Sales Reps successfully removed: ' + removeSuccess + '<br/>' +
					  '# Of Clients with an error: ' + removeFailure + '<br/>';
			
			nlapiSendEmail(-5, to, sbj, msg, cc, null, null, logFile);	
		}
}
