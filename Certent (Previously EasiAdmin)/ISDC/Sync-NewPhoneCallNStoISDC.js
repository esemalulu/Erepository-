/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Apr 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var date = new Date();
	/**
	var time = new Date();
		time.setHours(date.getHours() - 12);
	var today = nlapiDateToString(time, 'datetime');	
	*/
	
	var twlvHoursAgoDate = date.getTime() - (12 * 3600000);
	var today = nlapiDateToString(new Date(twlvHoursAgoDate), 'datetime');
	
	log(
			'debug',
			'today // 12 hours ago date',
			nlapiDateToString(date,'datetime')+' // '+
			today
	);
	
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
		
	top:for(var y = 0; y < clients.length; y+=1)
	{
		var criteria = [
		                	new nlobjSearchFilter('internalid', 'company', 'is', clients[y], null),
		                	new nlobjSearchFilter('createddate', null, 'onorafter', today, null )
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
		try 
		{
			if(resultSet != null)
			{
				for(var i = 0; i < 1; i+=1)
				{
					var comm =  resultSet[i].getValue('startdate') + ' - ';
					    comm += resultSet[i].getValue('status') + ' - '; 
					    comm += resultSet[i].getValue('title') + ' - '; 
					    comm += resultSet[i].getText('assigned') + '\n';
					    
					
					var account = {};
						account["id"] = resultSet[i].getValue('custentity_aux_isdc_record_id', 'company', null);
			            account["description"] = comm;
					
					var accountInfo = {};
						accountInfo["operation"] = "updateAccount";
						accountInfo["parameters"] = [account];
						
					var isdcRequest = nlapiRequestURL(URL, JSON.stringify(accountInfo), header, null, "POST");
					var isdcResponse = JSON.parse(isdcRequest.body);
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
		catch (phonecallerr)
		{
			var eSbj = 'ISDC Error: Phone Call NS to ISDC',
				eMsg = 'Error while processing SYNC-NewPhoneCallNStoISDC.js<br/>'+
					   '<b>ERROR: </b><br/>'+
					   getErrText(phonecallerr) +'<br/><br/>'+
					   '<b>NS to ISDC JSON:</b><br/>'+
					   JSON.stringify(accountInfo);
		
			nlapiSendEmail(-5, 'easiadmin@audaxium.com', eSbj, eMsg, null, null, null, null, true);
		}
	}
}
