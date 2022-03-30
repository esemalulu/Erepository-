/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Mar 2016     WORK-rehanlakhani
 * customsearch2405
 *
 */ 
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */





function scheduled(type) {
	var user = ["audaxium", "admin", "bvmcYVpFboCHd1b6KUSTdtiI2FusNdVU"];
	var contacts = [];
	var rIndex = 0;
	var rMax = 1000;
	var resultSet;
	var d = new Date();
	var ids = [];
	var recordCounter = 0;
	
	var searchFilter = [
		                    new nlobjSearchFilter('entityid', 'company', 'isnotempty', null, null),
		                    //new nlobjSearchFilter('custentitypi_score', null, 'isnotempty', null, null),
		                    //new nlobjSearchFilter('custentitypi_url', null, 'isnotempty', null, null),
		                    //new nlobjSearchFilter('custentity_aux_isdc_record_id', 'company', 'isnotempty', null, null)
		                    new nlobjSearchFilter('custentity_aux_isdc_record_id', null, 'isempty', null, null)
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
		var ids = [];
		var recordCounter = 0;
		for(var i = 0; i<resultSet.length; i+=1)
		{
			var contact = {};
				contact["first_name"] 		= resultSet[i].getValue('firstname');
				contact["last_name"] 		= resultSet[i].getValue('lastname');
				contact["title"] 			= resultSet[i].getValue('title');
				contact["phone"] 			= resultSet[i].getValue('phone');
				contact["email"]			= resultSet[i].getValue('email');
				contact["mobile_phone"] 	= resultSet[i].getValue('mobilephone');
				contact["addr1"] 			= resultSet[i].getValue('billaddress1');
				contact["city"] 			= resultSet[i].getValue('billcity');
				contact["state"] 			= resultSet[i].getValue('billstate');
				contact["zip"] 				= resultSet[i].getValue('billzipcode');
				contact["country"] 			= resultSet[i].getValue('billcountry');
				contact["customFields_24"] 	= resultSet[i].getValue('internalid');
				contact["customFields_22"] 	= "https://system.netsuite.com/app/common/entity/contact.nl?=" + resultSet[i].getValue('internalid');
				contact["customFields_20"] 	= resultSet[i].getValue('custentitypi_url');
				contact["customFields_16"] 	= resultSet[i].getValue('custentitypi_score');
				contact["account_name"] 	= resultSet[i].getText('company');
				contact["account_id"] 		= resultSet[i].getValue('custentity_aux_isdc_record_id', 'company', null);
				ids.push(resultSet[i].getValue('internalid'));
				contacts.push(contact);
				recordCounter+=1;
				if(contacts.length == 100)
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

					var option = {};
						option["unique_value"] = "false";
					
					var contactInfo = {};
						contactInfo["operation"] = "upsertContacts";
						contactInfo["parameters"] = [isdccontacts, option];
						
					var isdcRequest = nlapiRequestURL(URL, JSON.stringify(contactInfo), header, null, "POST");
					var isdcResponse = JSON.parse(isdcRequest.body);

					if(isdcResponse != null)
					{
						for(var y = 0; y<isdcResponse.length; y+=1)
						{
								var lastUpdated = nlapiDateToString(d,'datetimetz');
								var rec = nlapiLoadRecord('contact', ids[y]);
									rec.setFieldValue('custentity_aux_isdc_record_id', isdcResponse[y].toString());
									rec.setFieldValue('custentity_aux_isdc_lastupdated', lastUpdated);
								nlapiSubmitRecord(rec);
								if(nlapiGetContext().getRemainingUsage() <= 50)
								{
									
									var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
									nlapiLogExecution('DEBUG','Rescheduling the script status', status);
									if(status == 'QUEUED')
										break top;
								}
								
						}
					}
					recordCounter = 0;
					ids.length = 0;
					contacts.length = 0;
				} 
				if(resultSet.length < 100)
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

					var option = {};
						option["unique_value"] = "false";
					
					var contactInfo = {};
						contactInfo["operation"] = "upsertContacts";
						contactInfo["parameters"] = [isdccontacts, option];
						
					var isdcRequest = nlapiRequestURL(URL, JSON.stringify(contactInfo), header, null, "POST");
					var isdcResponse = JSON.parse(isdcRequest.body);

					if(isdcResponse != null)
					{
						for(var y = 0; y<isdcResponse.length; y+=1)
						{
								var lastUpdated = nlapiDateToString(d,'datetimetz');
								var rec = nlapiLoadRecord('contact', ids[y]);
									rec.setFieldValue('custentity_aux_isdc_record_id', isdcResponse[y].toString());
									rec.setFieldValue('custentity_aux_isdc_lastupdated', lastUpdated);
								nlapiSubmitRecord(rec);
								if(nlapiGetContext().getRemainingUsage() <= 50)
								{
									
									var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
									nlapiLogExecution('DEBUG','Rescheduling the script status', status);
									if(status == 'QUEUED')
										break top;
								}
								
						}
					}
					recordCounter = 0;
					ids.length = 0;
					contacts.length = 0;
				}
		}
	}
	while (resultSet.length >= 1000)
}




