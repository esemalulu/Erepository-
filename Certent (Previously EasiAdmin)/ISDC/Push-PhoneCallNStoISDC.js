/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Apr 2016     WORK-rehanlakhani
 * startdate - status - title - assigned
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var clients = [];
	var user = ["audaxium", "admin", "bvmcYVpFboCHd1b6KUSTdtiI2FusNdVU"];
	var searchFilter = [
	                    	new nlobjSearchFilter('custentity_aux_isdc_record_id', null, 'isnotempty', null, null)
	                   ];
	
	var searchColumn = [
	                    	new nlobjSearchColumn('internalid')
	                   ];
	
	var search = nlapiSearchRecord('customer', null, searchFilter, searchColumn)
	for(var i = 0; i<search.length; i+=1)
	{
		clients.push(search[i].getValue('internalid'));
	}
	
	top:for(var y = 0; y < clients.length; y+=1)
	{
		var criteria = [
		                	new nlobjSearchFilter('internalid', 'company', 'is', clients[y], null)
		               ];
		
		var columns = [
			               new nlobjSearchColumn('company'),
			               new nlobjSearchColumn('status'),
			               new nlobjSearchColumn('startdate').setSort(true),
			               new nlobjSearchColumn('title'),
			               new nlobjSearchColumn('assigned'),
			               new nlobjSearchColumn('custentity_aux_isdc_record_id', 'company', null)
		              ];
		
		var resultSet = nlapiSearchRecord('phonecall', null, criteria, columns);
		var comm = '';
		if(resultSet != null)
		{
			switch(resultSet.length)
			{
			case 1:
			case 2:
			case 3:
				for(var z = 0; z < resultSet.length; z+=1)
				{
					comm += resultSet[z].getValue('startdate') + ' - ';
				    comm += resultSet[z].getValue('status') + ' - '; 
				    comm += resultSet[z].getValue('title') + ' - '; 
				    comm += resultSet[z].getText('assigned') + '\n';
				

				    var URL = "https://certent.insidesales.com/do=noauth/rest/service";
					var auth = {};
						auth["operation"] = "apiLogin";
						auth["parameters"] = user;
		
					var connection = nlapiRequestURL(URL, JSON.stringify(auth), null, null, "POST");
					
					var headers = connection.getAllHeaders();
					var	session = connection.getHeaders("Set-Cookie");
					var sess = session[0].split(';');
					
					var header = {};
						header["Cookie"] = sess[0];
						header["contentType"] = "application/json";
				    
					var account = {};
						account["id"] = resultSet[z].getValue(columns[5]);
			            account["customFields_88"] = comm;
					
					var accountInfo = {};
						accountInfo["operation"] = "updateAccount";
						accountInfo["parameters"] = [account];
						
						nlapiLogExecution('DEBUG','Request', JSON.stringify(accountInfo));
					var isdcRequest = nlapiRequestURL(URL, JSON.stringify(accountInfo), header, null, "POST");
						nlapiLogExecution('DEBUG','Response', isdcRequest.body);
					var isdcResponse = JSON.parse(isdcRequest.body);
						nlapiLogExecution('DEBUG','Parsed Response', JSON.parse(isdcRequest.body));
				}

				break;
			default:
				for(var i = 0; i < 3; i+=1)
				{
					comm += resultSet[i].getValue('startdate') + ' - ';
				    comm += resultSet[i].getValue('status') + ' - '; 
				    comm += resultSet[i].getValue('title') + ' - '; 
				    comm += resultSet[i].getText('assigned') + '\n';
				}
			    
				var URL = "https://certent.insidesales.com/do=noauth/rest/service";
				var auth = {};
					auth["operation"] = "apiLogin";
					auth["parameters"] = user;

				var connection = nlapiRequestURL(URL, JSON.stringify(auth), null, null, "POST");
				
				var headers = connection.getAllHeaders();
				var	session = connection.getHeaders("Set-Cookie");
				var sess = session[0].split(';');
				
				var header = {};
					header["Cookie"] = sess[0];
					header["contentType"] = "application/json";
			    
				var account = {};
					account["id"] = resultSet[i].getValue('custentity_aux_isdc_record_id', 'company', null);
		            account["customFields_88"] = comm;
				
				var accountInfo = {};
					accountInfo["operation"] = "updateAccount";
					accountInfo["parameters"] = [account];
						
					nlapiLogExecution('DEBUG','Request', JSON.stringify(accountInfo));
				var isdcRequest = nlapiRequestURL(URL, JSON.stringify(accountInfo), header, null, "POST");
					nlapiLogExecution('DEBUG','Response', isdcRequest.body);
				var isdcResponse = JSON.parse(isdcRequest.body);
					nlapiLogExecution('DEBUG','Parsed Response', JSON.parse(isdcRequest.body));

				break;
			}
			
			if(isdcResponse != null)
			{
				nlapiSubmitField('customer', clients[y], 'custentity_aux_isdc_lastupdated', nlapiDateToString(new Date(), 'datetimetz'))
			}
			
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
