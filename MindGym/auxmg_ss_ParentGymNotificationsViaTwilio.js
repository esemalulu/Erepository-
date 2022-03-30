/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Jun 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var paramTwAcctSID        = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_prodsid');
	var paramTwAcctToken      = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_prodtoken');
	var paramBaseApiURL       = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_apiurl');
	var paramSavedSearch      = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_savedsearch');
	var paramTestMode         = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_testmode');
	var paramAmericasPhoneNum = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_americasphone');
	var paramOthersPhoneNum   = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_othersphonenumber');
	var paramSub2Phone        = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_officenumberuk');
	var paramSub3Phone        = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_officenumber_usa');
	var paramSub4Phone        = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_officenumber_asia');
	var paramSub5Phone        = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_pg_officenumber_middle');
	
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
	var coachResultSet = nlapiSearchRecord(null, paramSavedSearch, null, null);
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
				log('DEBUG','FAILED', 'The Coach number or Coach Timezone is not set correctly for search result row: ' + i);
				bookingErrors += 'The Coach number or Coach Timezone is not set correctly for search result row: ' + i + '<br>';;
				failCount+=1;
			}
			else
			{
				var location = countries(coachCountryText);
				if(location == "Other")
				{
					sendFromNumber = paramOthersPhoneNum;
				}
				else
				{
					sendFromNumber = paramAmericasPhoneNum;
				}
				log('DEBUG', 'Sent From Number - Library', sendFromNumber);
			}
			
			// Cleaning Coach Phone Number
			coachNumber = coachNumber.replace("+","");
			coachNumber = strGlobalReplace(coachNumber, ' ', '');
			coachNumber = coachNumber.replace("(", '');
			coachNumber = coachNumber.replace(")", '');
			sendFromNumber = sendFromNumber.replace("+", "");
			
			try
			{
				var bookingFilter = [
						            	new nlobjSearchFilter('custentity_bo_coach', null, 'anyof', coachId),
						            	new nlobjSearchFilter('enddate', null, 'on', bookingDate)
						           ];
				
			
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
				if (paramTestMode == 'T') 
				{
					if (sendFromNumber == '16463744275') 
					{
						actualSendToNumber = '14164000501';
					}
					else if (sendFromNumber == '447481344496') 
					{
						actualSendToNumber = '447850642111';
					}
				}
				
				/**
				 * REQUIRED: First parameter sent to Twilio in NLAPIRequestURL()
				 */
				var twURL = paramBaseApiURL + 'Accounts/' + paramTwAcctSID + '/Messages.json';
				
				/**
				 * Grammar Checking Start
				 */
				var delText = 'deliveries';
				if (parseInt(numDeliveries)==1) {
					delText = 'delivery';
				}
				var cliText = 'schools';
					if(parseInt(numClients) == 1)
					{
						cliText = 'school';
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
				
				msgBody = 'PG '+delText+' '+ddMmValue+' at '+ coachStartTime +
						  'Dear '+coachFirstName+'\n'+
						  'Have a great session tomorrow.'+
						  'Let us know if you need anything on '+bookingOfficePhonenumber;
				
				var twHeader = twilioHeaders(paramTwAcctSID, paramTwAcctToken);
				var postStr = 'From='+encodeURIComponent('+'+sendFromNumber)+'&To='+encodeURIComponent('+'+actualSendToNumber)+'&Body='+encodeURIComponent(msgBody);
				var response = nlapiRequestURL(twURL, postStr, twHeader, null, 'POST');
				if(response.code == "201")
				{
					successCount+=1;
				}
				else if (response.code == "400")
				{
					bookingErrors += response.body + '<br><br>';
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
			twURL = paramBaseApiURL + 'Accounts/' + paramTwAcctSID + '/Messages.csv?DateSent=' + rightNow.getFullYear() + '-' + (rightNow.getMonth()+1) + '-' + rightNow.getDate();
			
		var csv = nlapiRequestURL(twURL, null, twHeader, null, 'GET');
		
		var emailfileName = 'Parent Gym Coach Notification Log-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
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
		
		
		nlapiSendEmail('-5', 'logs@themindgym.com','Parent Gym SMS Notifications Log - Version 2.0', emailBody, ['mindgym@audaxium.com','sophie.horgan@parentgym.com','Geethika.Jayatilaka@parentgym.com'], null, null, emailCsvFileObj);
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
