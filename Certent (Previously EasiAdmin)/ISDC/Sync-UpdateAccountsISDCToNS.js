/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Mar 2016     WORK-rehanlakhani
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
	
	//JS 5/2/2016 - Script to look for 12 hour ago. 
	//				THIS MUST BE Done Via Milisecond Calculation NOT simple subtraction
	//				EVERYTHING MUST be based off of newly calculated date. NOT Current Date
	//			 	1 hour is 3,600,000 miliseconds
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
	
	var accounts = {};
	accounts["operation"] = "getAccounts";
	accounts["parameters"] = [criteria, pgCounter, 500];
	
	var isdcResponse = nlapiRequestURL(URL, JSON.stringify(accounts), header, null, "POST");
	var isdcBody = JSON.parse(isdcResponse.body);
	
	if(isdcBody != null || isdcBody.length != 0)
	{
		for(var i = 0; i<= isdcBody.length; i+=1);
		{
			nlapiLogExecution('DEBUG','Number of Record to be Updated',isdcBody.length);
			for(var key in isdcBody)
			{			
				var record = isdcBody[key];
				if(record.customFields_10 != undefined)
				{
					var recID = record.customFields_10;
					try
					{
						var custRec = nlapiLoadRecord('customer', recID);
							! record.billing_phone   ? custRec.setFieldValue('phone', '')                         : custRec.setFieldValue('phone', record.billing_phone);
							! record.website         ? custRec.setFieldValue('url', 'http://')                    : custRec.setFieldValue('url', record.website);
							! record.customFields_60 ? custRec.setFieldText('custentity_broker', '')              : custRec.setFieldText('custentity_broker', record.customFields_60);
							! record.customFields_62 ? custRec.setFieldText('custentity_legacy_system', '')       : custRec.setFieldText('custentity_legacy_system', record.customFields_62);
							! record.customFields_58 ? custRec.setFieldText('custentity_rivet_filing_agent', '')  : custRec.setFieldText('custentity_rivet_filing_agent', record.customFields_58);
							
							if (record.customFields_30 != null)
							{
								var isdcDate = (record.customFields_30).split('-');
								var ipoDate = isdcDate[1] + '/' + isdcDate[2] + '/' + isdcDate[0];
								custRec.setFieldValue('custentity_ipo_date', ipoDate);
							}
							else
							{
								custRec.setFieldValue('custentity_ipo_date', '');
							}
							
							! record.customFields_77 ? custRec.setFieldText('entitystatus', '')                   : custRec.setFieldText('entitystatus', record.customFields_77);
							! record.customFields_26 ? custRec.setFieldText('custentitylead_type', '')            : custRec.setFieldText('custentitylead_type', record.customFields_26);
							! record.customFields_28 ? custRec.setFieldText('custentity_easi_pulbic_company', '') : custRec.setFieldText('custentity_easi_pulbic_company', record.customFields_28);
							! record.customFields_56 ? custRec.setFieldText('custentity_rivet_xbrl_vendor', '')   : custRec.setFieldText('custentity_rivet_xbrl_vendor', record.customFields_56);
							custRec.setFieldValue('custentity_aux_isdc_lastupdated', nlapiDateToString(d, 'datetimetz'));
							nlapiLogExecution('DEBUG', 'NetSuite Record ID', recID);
							nlapiLogExecution('DEBUG','ISDC Record ID', record.id);
						nlapiSubmitRecord(custRec, false, true);
					}
					catch (updaccterr)
					{
						//JS 5/2/2016 - Temp. Error Handling.
						var eSbj = 'ISDC Error: Updating L/P/C Internal ID '+recID,
							eMsg = 'Error while processing SYNC-UpdateAccountsISDCtoNS.js<br/>'+
								   '<b>ERROR: </b><br/>'+
								   getErrText(updaccterr)+'<br/><br/>'+
								   '<b>ISDC Record JSON:</b><br/>'+
								   JSON.stringify(record);
						
						nlapiSendEmail(-5, 'easiadmin@audaxium.com', eSbj, eMsg, null, null, null, null, true);
					}
				}
			}
			
		}
	}
}
