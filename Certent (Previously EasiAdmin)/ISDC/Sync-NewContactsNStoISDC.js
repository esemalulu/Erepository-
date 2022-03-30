/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Mar 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var user = ["audaxium", "admin", "bvmcYVpFboCHd1b6KUSTdtiI2FusNdVU"];
var today = new Date();
var d = new Date();

function scheduled(type) {
	var rIndex = 0;
	var rMax = 1000;
	var resultSet;
	
	var twlvHoursAgoDate = today.getTime() - (12 * 3600000);

	twlvHoursAgoDate = new Date(twlvHoursAgoDate);
	
	log(
		'debug',
		'today // 12 hours ago date',
		nlapiDateToString(today,'datetime')+' // '+
		nlapiDateToString(twlvHoursAgoDate, 'datetime')
	);
	
	var searchFilter = [
	                    	new nlobjSearchFilter('entityid', 'company', 'isnotempty', null, null),
	                    	new nlobjSearchFilter('datecreated', null, 'onorafter', null, nlapiDateToString(twlvHoursAgoDate, 'datetime'))
                       ];
	
	var searchColumn = [
		                    new nlobjSearchColumn('internalid'),
		                    new nlobjSearchColumn('firstname'),
		                    new nlobjSearchColumn('lastname'),
		                    new nlobjSearchColumn('company'),
		                    new nlobjSearchColumn('title'),
		                    new nlobjSearchColumn('email'),
		                    new nlobjSearchColumn('phone'),
		                    new nlobjSearchColumn('mobilephone'),
		                    new nlobjSearchColumn('custentitypi_score'),
		                    new nlobjSearchColumn('custentitypi_url'),
		                    new nlobjSearchColumn('billaddress1'),
		                    new nlobjSearchColumn('billcity'),
		                    new nlobjSearchColumn('billstate'),
		                    new nlobjSearchColumn('billzipcode'),
		                    new nlobjSearchColumn('billcountry'),
	                    	new nlobjSearchColumn('custentity_aux_isdc_record_id','company')
	                   ];
	

	
	var search = nlapiCreateSearch('contact', searchFilter, searchColumn);
	var rs = search.runSearch();
	top:do
	{
		resultSet = rs.getResults(rIndex, rIndex + rMax);
		var contacts = [];
		var ids = [];
		for(var i = 0; i<resultSet.length; i+=1)
		{
			var val = isdcCountry(resultSet[i].getValue('billcountry'));
			var contact = {};
				contact["id"]				= resultSet[i].getValue('custentity_aux_isdc_record_id');
				contact["first_name"] 		= resultSet[i].getValue('firstname');
				contact["last_name"] 		= resultSet[i].getValue('lastname');
				contact["title"] 			= resultSet[i].getValue('title');
				contact["phone"] 			= resultSet[i].getValue('phone');
				contact["email"]			= resultSet[i].getValue('email');
				contact["mobile_phone"] 	= resultSet[i].getValue('mobilephone');
				contact["addr1"] 			= resultSet[i].getValue('billaddress1');
				contact["city"] 			= resultSet[i].getValue('billcity');
				if(val == "CA")
				{
					contact["state"] 		= isdcProvince(resultSet[i].getValue('billstate'));
				}
				else
				{
					contact["state"]		= isdcStates(resultSet[i].getValue('billstate'));
				}
				contact["zip"] 				= resultSet[i].getValue('billzipcode');
				contact["country"] 			= isdcCountry(resultSet[i].getValue('billcountry'));
				contact["customFields_24"] 	= resultSet[i].getValue('internalid');
				contact["customFields_22"] 	= "https://system.netsuite.com/app/common/entity/contact.nl?=" + resultSet[i].getValue('internalid');
				contact["customFields_20"] 	= resultSet[i].getValue('custentitypi_url');
				contact["customFields_16"] 	= resultSet[i].getValue('custentitypi_score');
				contact["account_name"] 	= resultSet[i].getText('company');
				contact["account_id"] 		= resultSet[i].getValue('custentity_aux_isdc_record_id', 'company', null);
				ids.push(resultSet[i].getValue('internalid'));
				contacts.push(contact);
				
				if(contacts.length == 50)
				{
					try 
					{
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
						
						var isdccontacts = {};
							isdccontacts = contacts;
						
						var contactInfo = {};
							contactInfo["operation"] = "updateContacts";
							contactInfo["parameters"] = [isdccontacts];
							
						var isdcRequest = nlapiRequestURL(URL, JSON.stringify(contactInfo), header, null, "POST");
						var isdcResponse = JSON.parse(isdcRequest.body);

						if(isdcResponse != null)
						{
							for(var y = 0; y<isdcResponse.length; y+=1)
							{
									var lastUpdated = nlapiDateToString(today,'datetimetz');
									var rec = nlapiLoadRecord('contact', ids[y]);
										rec.setFieldValue('custentity_aux_isdc_lastupdated', lastUpdated);
									nlapiSubmitRecord(rec, false, true);
									if(nlapiGetContext().getRemainingUsage() <= 50)
									{
										var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
										nlapiLogExecution('DEBUG','Rescheduling the script status', status);
										if(status == 'QUEUED')
											break top;
									}
									
							}
						}
						contacts.length = 0;
						ids.length = 0;
					}
					catch (upconerr)
					{
						var eSbj = 'ISDC Error: Update Contact to ISDC Error',
							eMsg = 'Error while processing SYNC-UpdateContactsNStoISDC.js<br/>'+
								   '<b>ERROR: </b><br/>'+
								   getErrText(upconerr) +'<br/><br/>'+
								   '<b>NS to ISDC JSON:</b><br/>'+
								   JSON.stringify(contactInfo);
					
						nlapiSendEmail(-5, 'easiadmin@audaxium.com', eSbj, eMsg, null, null, null, null, true);
					}
				}

			}
		rIndex = rIndex + rMax; 
	} 
	while(resultSet.length >= 1000)
		
	if(resultSet.length <= 50)
	{
		top:for(var i = 0; i<resultSet.length; i+=1)
		{
			var val = isdcCountry(resultSet[i].getValue('billcountry'));
			var contact = {};
				contact["id"]				= resultSet[i].getValue('custentity_aux_isdc_record_id');
				contact["first_name"] 		= resultSet[i].getValue('firstname');
				contact["last_name"] 		= resultSet[i].getValue('lastname');
				contact["title"] 			= resultSet[i].getValue('title');
				contact["phone"] 			= resultSet[i].getValue('phone');
				contact["email"]			= resultSet[i].getValue('email');
				contact["mobile_phone"] 	= resultSet[i].getValue('mobilephone');
				contact["addr1"] 			= resultSet[i].getValue('billaddress1');
				contact["city"] 			= resultSet[i].getValue('billcity');
				if(val == "CA")
				{
					contact["state"] 		= isdcProvince(resultSet[i].getValue('billstate'));
				}
				else
				{
					contact["state"]		= isdcStates(resultSet[i].getValue('billstate'));
				}
				contact["zip"] 				= resultSet[i].getValue('billzipcode');
				contact["country"] 			= isdcCountry(resultSet[i].getValue('billcountry'));
				contact["customFields_24"] 	= resultSet[i].getValue('internalid');
				contact["customFields_22"] 	= "https://system.netsuite.com/app/common/entity/contact.nl?=" + resultSet[i].getValue('internalid');
				contact["customFields_20"] 	= resultSet[i].getValue('custentitypi_url');
				contact["customFields_16"] 	= resultSet[i].getValue('custentitypi_score');
				contact["account_name"] 	= resultSet[i].getText('company');
				contact["account_id"] 		= resultSet[i].getValue('custentity_aux_isdc_record_id', 'company', null);
				ids.push(resultSet[i].getValue('internalid'));
				contacts.push(contact);
				
			try 
			{
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
				
				var isdccontacts = {};
					isdccontacts = contacts;
				
				var contactInfo = {};
					contactInfo["operation"] = "updateContacts";
					contactInfo["parameters"] = [isdccontacts];
					
				var isdcRequest = nlapiRequestURL(URL, JSON.stringify(contactInfo), header, null, "POST");
				var isdcResponse = JSON.parse(isdcRequest.body);

				if(isdcResponse != null)
				{
					for(var y = 0; y<isdcResponse.length; y+=1)
					{
							var lastUpdated = nlapiDateToString(today,'datetimetz');
							var rec = nlapiLoadRecord('contact', ids[y]);
								rec.setFieldValue('custentity_aux_isdc_lastupdated', lastUpdated);
							nlapiSubmitRecord(rec, false, true);
							if(nlapiGetContext().getRemainingUsage() <= 50)
							{
								var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
								nlapiLogExecution('DEBUG','Rescheduling the script status', status);
								if(status == 'QUEUED')
									break top;
							}
							
					}
				}
				contacts.length = 0;
				ids.length = 0;
			}
			catch (upconerr)
			{
				var eSbj = 'ISDC Error: New Contact to ISDC Error',
					eMsg = 'Error while processing SYNC-NewContactNStoISDC.js<br/>'+
						   '<b>ERROR: </b><br/>'+
						   getErrText(upconerr) +'<br/><br/>'+
						   '<b>NS to ISDC JSON:</b><br/>'+
						   JSON.stringify(contactInfo);
			
				nlapiSendEmail(-5, 'easiadmin@audaxium.com', eSbj, eMsg, null, null, null, null, true);
			}
				
		}
		
	}
}
