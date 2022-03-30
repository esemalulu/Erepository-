/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Jun 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) 
{	
	var paramTwAcctSID           = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_prodsid');
	var paramTwAcctToken         = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_prodtoken');
	var paramTwBaseApi           = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_api_url');
	var paramCoachSavedSearch    = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_coach_savedsearch');
	var paramAmericasPhoneNumber = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_mg_a_phonenumber');
	var paramOthersPhoneNumber   = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_mg_o_phonenumber');
	var paramExecuteInTest       = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_execute_testmode');
	var paramSub2Phone           = nlapiGetContext().getSetting('SCRIPT', 'custscript_officenumber_uk');
	var paramSub3Phone           = nlapiGetContext().getSetting('SCRIPT', 'custscript_officenumber_usa');
	var paramSub4Phone           = nlapiGetContext().getSetting('SCRIPT', 'custscript_officenumber_asia');
	var paramSub5Phone           = nlapiGetContext().getSetting('SCRIPT', 'custscript_officenumber_middleeast');

	var monthJson = {
			1:"Jan",
			2:"Feb",
			3:"Mar",
			4:"Apr",
			5:"May",
			6:"Jun",
			7:"Jul",
			8:"Aug",
			9:"Sep",
			10:"Oct",
			11:"Nov",
			12:"Dec"
		};

	var subsPhone = {
			"2":paramSub2Phone,
			"3":paramSub3Phone,
			"4":paramSub4Phone,
			"5":paramSub5Phone
		};
	
	var sendFromNumber = '',
		bookingId = '',
		bookingType  = '',
		bookingOwnerSubsidary = '',
		bookingOfficePhone = '',
		sendToNumber = '',
		actualSendToNumber = '',
		msgBody = '',
		bookingOfficePhonenumber = '',
		timerElapsed = false,
		successCount = 0,
		failCount = 0,
		totalCount = 0,
		bookingErrors = '';
	var coachResultSet = nlapiSearchRecord(null, paramCoachSavedSearch, null, null);
	if(coachResultSet != null)
	{
		totalCount = coachResultSet.length;
		var columns = coachResultSet[0].getAllColumns();
		for(var i = 0; i < coachResultSet.length; i+=1)
		{
			var startTime = new Date().getTime();
			var bookingDate        = coachResultSet[i].getValue(columns[0]);
			var coachName          = coachResultSet[i].getText(columns[1]);
			var coachId            = coachResultSet[i].getValue(columns[1]);
			var coachFirstName     = coachResultSet[i].getValue(columns[2]);
			var numDeliveries      = coachResultSet[i].getValue(columns[3]);
			var numClients         = coachResultSet[i].getValue(columns[4]);
			var coachNumber        = coachResultSet[i].getValue(columns[5]);
			var coachStartTime     = coachResultSet[i].getValue(columns[6]);
			var gmtStartTime       = coachResultSet[i].getValue(columns[7]);
			var coachTzCountryId   = coachResultSet[i].getValue(columns[8]);
			var coachTzCountryText = coachResultSet[i].getText(columns[8]);
			var coachCountryId     = coachResultSet[i].getValue(columns[9]);
			var coachCountryText   = coachResultSet[i].getText(columns[9]);
			var searchDateTime     = coachResultSet[i].getValue(columns[10]);
			var numF2F             = coachResultSet[i].getValue(columns[11]);
			var numVirtual         = coachResultSet[i].getValue(columns[12]);
			var ddMM               = coachResultSet[i].getValue(columns[13]);
			
			if(coachNumber == '- None -') {coachNumber = '';}
			if(coachTzCountryText == '- None -') {coachTzCountryText = '';}
			
			if(!coachNumber || !coachTzCountryId)
			{
				log('DEBUG','FAILED', 'The Coach number or Coach Timezone is not set correctly for search result row: ' + i+1);
				bookingErrors += 'The Coach number or Coach Timezone is not set correctly for search result row: ' + i+1 + '<br>';;
				failCount+=1;
			}
			else
			{
				var location = countries(coachCountryText);
				if(location == "Other")
				{
					sendFromNumber = paramOthersPhoneNumber;
				}
				else
				{
					sendFromNumber = paramAmericasPhoneNumber;
				}
			}
			
			// Cleaning Coach Phone Number
			coachNumber = coachNumber.replace("+","");
			coachNumber = strGlobalReplace(coachNumber, ' ', '');
			coachNumber = coachNumber.replace("(", '');
			coachNumber = coachNumber.replace(")", '');
			sendFromNumber = sendFromNumber.replace("+", "");
			
			try
			{
				if(numVirtual != 0)
				{
					var bookingFilter = [
					                     new nlobjSearchFilter('custentity_coach_groupingname', 'custentity_bo_coach', 'anyOf', coachId),
					                     new nlobjSearchFilter('custentity_cbl_booking_coachdatetime', null, 'is', searchDateTime)
					                    ];
				}
				
				if (numF2F != 0)
				{
					var bookingFilter = [
					                     new nlobjSearchFilter('custentity_coach_groupingname', 'custentity_bo_coach', 'anyOf', coachId),
					                     new nlobjSearchFilter('custentity_cbl_booking_eventdatetime', null, 'is', searchDateTime)
					                    ];
				}
				
				var bookingColumns = [
				                      new nlobjSearchColumn('internalid'),
						              new nlobjSearchColumn('jobtype'),
						              new nlobjSearchColumn('subsidiary','custentity_bo_owner'),
						              new nlobjSearchColumn('custentitycustentity_bo_virtualchannel'),
						              new nlobjSearchColumn('custentity_bo_eventaddress1'),
						              new nlobjSearchColumn('custentity_bo_eventaddress2'),
						              new nlobjSearchColumn('custentity_bo_eventcity')
				                     ];
				var searchBooking = nlapiSearchRecord('job', null, bookingFilter, bookingColumns);
				if(searchBooking == null)
				{
						log('DEBUG','FAILED', 'A Booking record was not returned from the search for: ' + coachName + ' at this date \ time ' + searchDateTime);
						bookingErrors += 'A Booking record was not returned from the search for: ' + coachName + ' at this date \ time ' + searchDateTime + '<br>';
						failCount+=1;
				}
				else
				{
					bookingId   = searchBooking[0].getId();
					bookingType = searchBooking[0].getText('jobtype');
					bookingOwnerSubsidary = searchBooking[0].getValue('subsidiary', 'custentity_bo_owner');
					bookingOfficePhonenumber = subsPhone[bookingOwnerSubsidary];
				}
				
				
				sendToNumber = coachNumber;
				actualSendToNumber = coachNumber;
				
				// Cleaning up the date format depending on coaches continent - matching their standards for MM-DD
				var ddMmValue = ddMM;
				var arDdMm = ddMM.split('/');
				if (sendFromNumber == '16463744275') {
					//If being sent from US number, convert to MM-DD
					ddMmValue = monthJson[parseInt(arDdMm[1])]+'-'+arDdMm[0];
				} else {
					ddMmValue = arDdMm[0]+'-'+monthJson[parseInt(arDdMm[1])];
				}
				
				/**
				 * Test Parameters
				 * US SMS Sent to : Rehan Lakhani - ( 1-416-400-0501 )
				 * OTHER SMS Sent to : David Atkinson - ( 447850642111 )
				 */
				if (paramExecuteInTest == 'T') 
				{
					if (sendFromNumber == '16463744275') 
					{
						actualSendToNumber = '14164000501';
					}
					else if (sendFromNumber == '447903574922') 
					{
						actualSendToNumber = '447850642111';
					}
				}
				
				/**
				 * REQUIRED: First parameter sent to Twilio in NLAPIRequestURL()
				 */
				var twURL = paramTwBaseApi + 'Accounts/' + paramTwAcctSID + '/Messages.json';
				
				/**
				 * Grammar Checking Start
				 */
				var delText = 'deliveries';
				if (parseInt(numDeliveries)==1) {
					delText = 'delivery';
				}
				
				var cliText = 'clients';
				if (parseInt(numClients)==1) {
					cliText = 'client';
				}
				
				var infoText = '';
				if (parseInt(numF2F) > 0 && parseInt(numVirtual) > 0) {
					infoText = 'You have '+numF2F+' F2F and '+numVirtual+' Virtual ';
				} else {
					//Only that has number
					if (parseInt(numF2F) > 0) {
						infoText = 'You have '+numF2F+' F2F ';
					} else if (parseInt(numVirtual) > 0) {
						infoText = 'You have '+numVirtual+' Virtual ';
					}
				}
				
				/**
				 * Grammar Checking End
				 */

			
				//Based on Booking ID, identify which timezone value using Booking Type
				var timeZoneId = '';
				var tzvalues = nlapiLookupField('job', bookingId, ['custentity_cbl_booking_coachtz','custentity_bo_eventtimezone'], false);
				
				if (bookingType == 'Face to face') {
					timeZoneId = tzvalues['custentity_bo_eventtimezone'];
				} else {
					timeZoneId = tzvalues['custentity_cbl_booking_coachtz'];
				}
				
				var timeZoneValue = '';
				if (timeZoneId) 
				{
					var tzabrvalues = nlapiLookupField('customrecord_timezone', timeZoneId, ['custrecord_tz_abbreviation','custrecord_tz_offset'], false);
					timeZoneValue = (tzabrvalues['custrecord_tz_abbreviation']?tzabrvalues['custrecord_tz_abbreviation']:'NA')+ 
									'(GMT '+
									(tzabrvalues['custrecord_tz_offset']?tzabrvalues['custrecord_tz_offset']:'+NA')+
									')';
				}
				
				msgBody = 'MG '+delText+' '+ddMmValue+'\n'+
						  'Dear '+coachFirstName+'\n'+
						  infoText+'tomorrow for '+numClients+' '+cliText+' starting at '+
						  coachStartTime+' '+timeZoneValue+'.\n'+
						  'Any issues please call us on '+bookingOfficePhonenumber;
				
				var twHeader = twilioHeaders(paramTwAcctSID, paramTwAcctToken);
				var postStr = 'From='+encodeURIComponent('+'+sendFromNumber)+'&To='+encodeURIComponent('+'+actualSendToNumber)+'&Body='+encodeURIComponent(msgBody);
				log('DEBUG','Coach Phone Number', actualSendToNumber);
				var response = nlapiRequestURL(twURL, postStr, twHeader, null, 'POST');
				if(response.code == "201")
				{
					successCount+=1;
				}
				else if (response.code == "400")
				{
					bookingErrors += response.body + '<br>';
					failCount+=1;
				}
				
				while(!timerElapsed)
				{
					var newTime = new Date().getTime();
					if ((newTime - startTime) >= 1000)
					{
						log('DEBUG','Timer Set','1 Second has Elapsed before sending the next request');
						timerElapsed = true;
						startTime = newTime;
					}
				}
				
			}
			catch (err)
			{
				throw nlapiCreateError('SMSERR','Expected Error:' + getErrText(err), true);
			}
		}
		
		var rightNow = new Date();
			twURL = paramTwBaseApi + 'Accounts/' + paramTwAcctSID + '/Messages.csv?DateSent=' + rightNow.getFullYear() + '-' + (rightNow.getMonth()+1) + '-' + rightNow.getDate();
			
		var csv = nlapiRequestURL(twURL, null, twHeader, null, 'GET');
		
		var emailfileName = 'Mind Gym Coach Notification Log-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
		var emailCsvFileObj = nlapiCreateFile(emailfileName, 'CSV', csv.body);
		
		
		var	emailBody  = 'Attached is a CSV Log Generated by Twilio. This CSV gives you detailed information on all SMSs sent via Twilio.<br><br>';
			emailBody += '<b>Total Number of Messages supposed to be sent</b>: ' + totalCount + '<br>';
			emailBody += '<b>Total Number of Messages sent</b>: ' + successCount + '<br>';
			emailBody += '<b>Total Number of Messages with Failure</b>: ' + failCount + '<br>';
			
			if(failCount != 0)
			{
				emailBody += '<br>';
				emailBody += 'Below is the reason why ' + failCount + ' did not get sent:<br>';
				emailBody += '<br>';
				emailBody += bookingErrors;
			}
		
		
		nlapiSendEmail('-5', 'mindgym@audaxium.com','Mind Gym SMS Notifications Log - Version 2.0', emailBody, ['mindgym@audaxium.com','david.atkinson@themindgym.com','caroline.amer@themindgym.com','logs@themindgym.com'], null, null, emailCsvFileObj)
	}	
	
	
}


function twilioHeaders(PSid, PToken)
{
	var auth = nlapiEncrypt(PSid + ':' + PToken, 'base64');
	
	var twilioHeader = new Array();
		twilioHeader['Authorization'] = 'Basic ' + auth;
		twilioHeader['Content-Type']  = "application/x-www-form-urlencoded";	
	
	return twilioHeader;
}