/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Apr 2016     WORK-rehanlakhani
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
var pgCounter = 0;
var today = new Date();
var d = new Date();
var criteria = [];

function scheduled(type) {
	
	var twlvHoursAgoDate = today.getTime() - (12 * 3600000);
		twlvHoursAgoDate = new Date(twlvHoursAgoDate);
	
	var month = (twlvHoursAgoDate.getMonth() +1);
	if(month < 10) { month = "0" + month; }

	var day = twlvHoursAgoDate.getDate();
	if( day < 10 ){ day = "0" + day; }
	
	var date =  twlvHoursAgoDate.getFullYear() + '-' + month + '-' + day + ' ' + 
				twlvHoursAgoDate.getHours() + ':' + twlvHoursAgoDate.getMinutes() + ':' + twlvHoursAgoDate.getSeconds();
	
	log(
		'debug',
		'Today // 12 Hours Ago Date // ISDC Look up date', 
		nlapiDateToString(today, 'datetime')+' // '+
		nlapiDateToString(twlvHoursAgoDate, 'datetime')+' // '+
		date
	);
	
	
	auth["operation"] = "apiLogin";
	auth["parameters"] = user;

	connection = nlapiRequestURL(URL, JSON.stringify(auth), null, null, "POST");
	
	var headers = connection.getAllHeaders();
	var	session = connection.getHeaders("Set-Cookie");
	var sess = session[0].split(';');
		header["Cookie"] = sess[0]
	
	try 
	{	
		var c1 = {};
		c1["field"] = "date_modified";
		c1["operator"] = ">=";
		c1["values"] = [date];
		criteria.push(c1);
		
		var c2 = {};
		c2["field"] = "deleted";
		c2["operator"] = "=";
		c2["values"] = "0";
		criteria.push(c2);
		
		var c3 = {};
		c3["field"] = "first_name";
		c3["operator"] = "!=";
		c3["values"] = "";
		criteria.push(c3);
		
		var c4 = {};
		c4["field"] = "last_name";
		c4["operator"] = "!=";
		c4["values"] = "";
		criteria.push(c4);
		
		var contacts = {};
		contacts["operation"] = "getContacts";
		contacts["parameters"] = [criteria, pgCounter, 500];
		
		var isdcResponse = nlapiRequestURL(URL, JSON.stringify(contacts), header, null, "POST");
		var isdcBody = JSON.parse(isdcResponse.body);
		
		if(isdcBody != null || isdcBody.length != 0)
		{
			for(var i = 0; i<= isdcBody.length; i+=1);
			{
				for(var key in isdcBody)
				{			
					var record = isdcBody[key];
					if(record.customFields_24 != undefined)
					{
						var recID = record.customFields_24;
						var contact = nlapiLoadRecord('contact', recID);
							!record.title       ? contact.setFieldText('title','')         : contact.setFieldText('title', record.title);
							!record.phone       ? contact.setFieldValue('phone', '')       : contact.setFieldValue('phone', record.phone);
							!record.mobilephone ? contact.setFieldValue('mobilephone', '') : contact.setFieldValue('mobilephone', record.mobile_phone);
							contact.setFieldValue('custentity_aux_isdc_lastupdated', nlapiDateToString(d, 'datetimetz'));
						nlapiSubmitRecord(contact, false, true);
					}
				}
			}
		}
	}
	catch (upconerr)
	{
		var eSbj = 'ISDC Error: Update Contact to NS Error' + recID,
			eMsg = 'Error while processing SYNC-UpdateContactsISDCtoNS.js<br/>'+
				   '<b>ERROR: </b><br/>'+
				   getErrText(upconerr) +'<br/><br/>'+
				   '<b>NS to ISDC JSON:</b><br/>'+
				   JSON.stringify(record);
	
		nlapiSendEmail(-5, 'easiadmin@audaxium.com', eSbj, eMsg, null, null, null, null, true);
	}
}
