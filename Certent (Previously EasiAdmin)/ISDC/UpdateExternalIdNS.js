/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Mar 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
var connection;
var URL = "https://certent.insidesales.com/do=noauth/rest/service";
var user = ["audaxium", "admin", "bvmcYVpFboCHd1b6KUSTdtiI2FusNdVU"];
var auth = {};
var header = {};
var pgCounter = 1;
var accNoInfoCriteria = [];
var paramPageCount = nlapiGetContext().getSetting('SCRIPT','custscript_aux_pagecount');



function scheduled(type) 
{
	var csvHeader = '"Company Name","Netsuite Record ID","ISDC Record ID"\n';
	var csvBody = '';
	auth["operation"] = "apiLogin";
	auth["parameters"] = user;

	connection = nlapiRequestURL(URL, JSON.stringify(auth), null, null, "POST");
	
	var headers = connection.getAllHeaders();
	var	session = connection.getHeaders("Set-Cookie");
	var sess = session[0].split(';');
	
	header["Cookie"] = sess[0];
	
	var c1 = {};
	c1["field"] = "date_created";
	c1["operator"] = ">=";
	c1["values"] = ["2016-01-14 00:00:00"];
	accNoInfoCriteria.push(c1);
	
	var c2 = {};
	c2["field"] = "deleted";
	c2["operator"] = "=";
	c2["values"] = ["0"];
	accNoInfoCriteria.push(c2);

	for(var y = 0; y < 100; y+=1)
	{
		var accnoInfo = {};
			accnoInfo["operation"] = "getAccounts";
			accnoInfo["parameters"] = [accNoInfoCriteria, pgCounter, 500];
		
		var isdcResponse = nlapiRequestURL(URL, JSON.stringify(accnoInfo), header, null, "POST");
		var isdcBody = JSON.parse(isdcResponse.body)
		
		
		if(isdcBody != null)
		{
			for(var i = 0; i<= isdcBody.length; i+=1);
			{
				for(var key in isdcBody)
				{			
					var record = isdcBody[key];
					if(record.customFields_10 != undefined)
					{
						if(record.customFields_10 != 0)
						{
							var isdcID = record.id;
							var companyName = record.name;
							var nsID = record.customFields_10;
							csvBody += '"' + companyName + '","' + nsID + '","' + isdcID + '"\n';
						}
					}
				}
			}
			
			if(isdcBody.length == 500)
			{
				var csv = nlapiCreateFile('UpdateInformation' + y + '.csv', 'CSV', csvHeader+csvBody);
				csv.setFolder(-14);
				nlapiSubmitFile(csv);
				csvBody = '';
				paramPageCount++;
				pgCounter+=500;
			}
			else
			{
				var csv = nlapiCreateFile('UpdateInformation' + y + '.csv', 'CSV', csvHeader+csvBody);
				csv.setFolder(-14);
				nlapiSubmitFile(csv);
				csvBody = '';
				paramPageCount++;
				pgCounter+=500;
			}
		}
	}
}


