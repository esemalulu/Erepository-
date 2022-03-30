//Company Level Preference used for Twilio access information

/**
 * 
 * THIS SCRIPT HAS BEEN DECOMMISSIONED. VERSION 2 IS auxmg_ss_MindGymNotificationsSMSTwilio.js & auxmg_ss_ParentGymNotificationsViaTwilio.js
 * 
 */
//PRODUCTION
var paramTwAcctSid = nlapiGetContext().getSetting('SCRIPT','custscript_tw322_acctsid');
var paramTwAuthToken = nlapiGetContext().getSetting('SCRIPT','custscript_tw322_authtoken');
//TEST
var paramTwTestAcctSid = nlapiGetContext().getSetting('SCRIPT','custscript_tw322_testacctsid');
var paramTwTestAuthToken = nlapiGetContext().getSetting('SCRIPT','custscript_tw322_testauthtoken');
var paramIsParentGym = nlapiGetContext().getSetting('SCRIPT','custscript_tw322_isparentgym');

//Script level notifier
var paramCoachSavedSearch = nlapiGetContext().getSetting('SCRIPT','custscript_tw322_ssid');
var paramExecuteInTest = nlapiGetContext().getSetting('SCRIPT','custscript_tw322_istestmode');

var paramSub2Phone = nlapiGetContext().getSetting('SCRIPT', 'custscript_tw322_sub2phone');
var paramSub3Phone = nlapiGetContext().getSetting('SCRIPT', 'custscript_tw322_sub3phone');
var paramSub4Phone = nlapiGetContext().getSetting('SCRIPT', 'custscript_tw322_sub4phone');
var paramSub5Phone = nlapiGetContext().getSetting('SCRIPT', 'custscript_tw322_sub5phone');

var MAX_DAILY_LIMIT = 250;

var subsPhone = {
	"2":paramSub2Phone,
	"3":paramSub3Phone,
	"4":paramSub4Phone,
	"5":paramSub5Phone
};

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


//----- CSV Process result
var csvHeader = '"Status","Process Log","Sent FROM Number","Mobile Number","Sent To Number","Booking Internal ID","Coach Full Name", "Coach First Name", "# of Deliveries", "# of Clients", "Coach Start Time"\n';
var csvBody = '';

function processCoachSmsNotifier() {

	log('debug','test acct id', paramTwTestAcctSid);
	log('debug','test auth token', paramTwTestAuthToken);
	
	try {
		
		//Search list of send from numbers and build JSON object to track # SMS sent
		var sfcol = [new nlobjSearchColumn('internalid'),
		             new nlobjSearchColumn('name')];
		var sflrs = nlapiSearchRecord('customlist_twiliophonenumber', null, null, sfcol);
		
		var fromnumber = {};
		
		//assume there are results
		for (var sf=0; sf < sflrs.length; sf++) {
			fromnumber[sflrs[sf].getValue('name')]={
				'sent':0,
				'usage':0.0
			};
		}
		
		//0. Build Authentication Header
		var twApiBase = 'https://api.twilio.com/2010-04-01/';
		//PROD Header
		var PBASE64ACCESS = nlapiEncrypt(paramTwAcctSid+':'+paramTwAuthToken, 'base64');
		var pheaders = new Array();
		pheaders['Authorization'] = 'Basic ' + PBASE64ACCESS;
		pheaders["Content-Type"] = "application/x-www-form-urlencoded";

		//TEST Header
		var TBASE64ACCESS = nlapiEncrypt(paramTwTestAcctSid+':'+paramTwTestAuthToken, 'base64');
		var theaders = new Array();
		theaders['Authorization'] = 'Basic ' + TBASE64ACCESS;
		theaders["Content-Type"] = "application/x-www-form-urlencoded";
		
		//1. Look up list of Coach to process. ASSUME the columns Definition is Static
		var crs = nlapiSearchRecord(null, paramCoachSavedSearch, null, null);
		
		if (crs && crs.length > 0) {
			
			//Grab all Columns
			/**
			 * 
			 * 0 = Delivery Date
			 * 1 = Coach Full Name
			 * 2 = Coach First Name
			 * 3 = Number of Deliveries
			 * 4 = Number of Clients
			 * 5 = Mobile Number
			 * 6 = Start Time
			 * 7 = GMT Start time
			 * 8 = Coach Time Zone Country
			 * 9 = Coach Country
			 * 10 = Search
			 * 11 = # F2F
			 * 12 = # Virtual
			 * 13 = DD-MM
			 */
			var cols = crs[0].getAllColumns();
			
			//NOW Time for waiting 1 second
			var nowTime = new Date().getTime();
			
			//loop through each result
			for (var i=0; i < crs.length; i++) {
				
				var exitWait = false;
				
				var coachFullName = crs[i].getText(cols[1]);
				var coachRecId = crs[i].getValue(cols[1]);
				var coachFirstName = crs[i].getValue(cols[2]);
				var numDeliveries = crs[i].getValue(cols[3]);
				var numClients = crs[i].getValue(cols[4]);
				var coachNumber = crs[i].getValue(cols[5]);
				var coachStartTime = crs[i].getValue(cols[6]);
				var gmtStartTime = crs[i].getValue(cols[7]);
				var coachTzCountryId = crs[i].getValue(cols[8]);
				var coachTzCountryText = crs[i].getText(cols[8]);
				var coachCountryId = crs[i].getValue(cols[9]);
				var coachCountryText = crs[i].getText(cols[9]);
				var searchDateTime = crs[i].getValue(cols[10]);
				var numF2f = crs[i].getValue(cols[11]);
				var numVir = crs[i].getValue(cols[12]);
				var ddMm = crs[i].getValue(cols[13]);
				var endDate = crs[i].getValue(cols[0]);
				//12/27/2014 - Replace out - None - values from key fields
				if (coachNumber == '- None -') {
					coachNumber = '';
				}
				
				if (coachTzCountryId == '- None -') {
					coachTzCountryId = '';
				}
				
				
				
				var procStatus = '', procLog='';
				var sendFromNumber = '', sendToNumber='', actualSendToNumber='';
				
				var msgBody = '';
				
				//log('debug','Testing', coachFullName+' // '+coachTzCountryText+' // '+coachNumber +' // '+ coachCountryId);
				
				//Try processing each returned data
				//-------------- Search for Booking ID based on Coach Grouping name and Coach Date/Time.
				var bookingId = '', bookingType='', bookingOwnerSubsidiary='', bookingOfficePhonenumber = '';
				var bookingAddr1 = '', bookingAddr2='', bookingCity='', bookingChannel='';
				try {
				
					//Do some error checking first
					if (!coachTzCountryId || !coachNumber) {
						//Missing critical info to send SMS message. Error out
						procStatus = 'Failed';
						procLog = 'Missing Coach Timezone Country and/or coach mobile number';
					} else {
						
						//Country ID is coming out as an abbr. Run search instead.
						var twflt = [new nlobjSearchFilter('internalid', null, 'is', coachTzCountryId)];
						var twcol = [new nlobjSearchColumn('custrecord_country_twiliophonenumber')];
						var twrs = nlapiSearchRecord('customrecord_country', null, twflt, twcol);
						//assume there is always one
						if (twrs && twrs.length > 0) {
							//Grab text value
							sendFromNumber = twrs[0].getText('custrecord_country_twiliophonenumber');
						}
						
						log('debug','country tz id', coachTzCountryId+' // '+sendFromNumber);
						
						if (!sendFromNumber) {
							procStatus = 'Failed';
							procLog = coachTzCountryId+' is missing Twilio Send From Number';
						}
					}
					
					//Remove any characters fromo coachNumber
					coachNumber = coachNumber.replace("+","");
					coachNumber = strGlobalReplace(coachNumber, ' ', '');
					coachNumber = coachNumber.replace("(", '');
					coachNumber = coachNumber.replace(")", '');
					
					//log('debug','Modified Coach Number', coachNumber);
					try {
						
						//1. Search for Matching Booking ID 
						//2016-03-08 00:00:00 // 181733
						log('debug','Search D/T // Coach Rec ID', searchDateTime+' // '+coachRecId);
						log('debug','Search D/T // Coach Rec ID', endDate+' // '+coachRecId);
						 if (paramIsParentGym == 'T'){
							 var bbflt = 
								   [
						            	new nlobjSearchFilter('custentity_bo_coach', null, 'anyof', coachRecId),
						            	new nlobjSearchFilter('enddate', null, 'on', endDate)
						           ];
						 }
						 else
						 {
							 nlapiLogExecution('DEBUG','Coach Record ID', coachRecId);
							 nlapiLogExecution('DEBUG','Search DateTime', searchDateTime);
							var bbflt =[
					            new nlobjSearchFilter('custentity_coach_groupingname','custentity_bo_coach','anyof', coachRecId),
					            new nlobjSearchFilter('custentity_cbl_booking_coachdatetime', null, 'is',searchDateTime)
					            ];
						 }
						var bbcol = [new nlobjSearchColumn('internalid'),
						             new nlobjSearchColumn('jobtype'),
						             new nlobjSearchColumn('subsidiary','custentity_bo_owner'),
						             new nlobjSearchColumn('custentitycustentity_bo_virtualchannel'),
						             new nlobjSearchColumn('custentity_bo_eventaddress1'),
						             new nlobjSearchColumn('custentity_bo_eventaddress2'),
						             new nlobjSearchColumn('custentity_bo_eventcity')];
						var bbrs = nlapiSearchRecord('job', null, bbflt, bbcol);
						
						if (bbrs == null){
							//Throw error
							throw nlapiCreateError('SMSERR', 'Unable to find the booking record, Coach ID: '+coachRecId+' Search date time: '+searchDateTime, true);
						}
						
						bookingId = bbrs[0].getId();
						bookingType = bbrs[0].getText('jobtype');
						bookingOwnerSubsidiary = bbrs[0].getValue('subsidiary','custentity_bo_owner');
						bookingOfficePhonenumber = subsPhone[bookingOwnerSubsidiary];
						
						log('debug', 'testing', bookingOwnerSubsidiary);
						log('debug', 'testing', bookingOfficePhonenumber);
						
						/**
						 * REMOVED for now until we can find use for it. 
						bookingAddr1 = (bbrs[0].getValue('custentity_bo_eventaddress1')?bbrs[0].getValue('custentity_bo_eventaddress1'):'');
						bookingAddr2 = (bbrs[0].getValue('custentity_bo_eventaddress2')?bbrs[0].getValue('custentity_bo_eventaddress2'):'');
						bookingCity = (bbrs[0].getValue('custentity_bo_eventcity')?bbrs[0].getValue('custentity_bo_eventcity'):'');
						bookingChannel = (bbrs[0].getValue('custentitycustentity_bo_virtualchannel')?bbrs[0].getText('custentitycustentity_bo_virtualchannel'):'');
						
						log('debug','address',bookingAddr1+' // '+bookingAddr2+' // '+bookingChannel);
						*/
					} catch (bookerr) {
						//so that it gets logged as failure
						throw nlapiCreateError('SMSCERR','Expected Error: '+getErrText(bookerr), true);
					}
					
					//log('debug','Coach Name // Booking ID // Book Type', coachFullName+' // '+bookingId+' // '+bookingType);
					
					//------------- Based on Execution mode modify actualSendToNumber ------
					sendToNumber = coachNumber;
					actualSendToNumber = coachNumber;
					
					//Modify dd/mm format depending on number being sent
					var ddMmValue = ddMm;
					arDdMm = ddMm.split('/');
					if (sendFromNumber == '16463744275') {
						//If being sent from US number, convert to MM-DD
						ddMmValue = monthJson[parseInt(arDdMm[1])]+'-'+arDdMm[0];
					} else {
						ddMmValue = arDdMm[0]+'-'+monthJson[parseInt(arDdMm[1])];
					}
					
					//--------------------- TEST execution value
					if (paramExecuteInTest == 'T') {
						//based on send From Number, swtich to test number
						if (sendFromNumber == '16463744275') {
							//THIS IS US Number, send to Joe Son
							actualSendToNumber = '14164000501';
						} else if (sendFromNumber == '447903574922') {
							//Send to David A
							actualSendToNumber = '447850642111';
						}
					}
					
					//Build Delivery Message
					var twApiSendSms = twApiBase+'Accounts/'+paramTwAcctSid+'/SMS/Messages.json';
					
					//text grammar check
					var delText = 'deliveries';
					if (parseInt(numDeliveries)==1) {
						delText = 'delivery';
					}
					
					var cliText = 'clients';
					if (parseInt(numClients)==1) {
						cliText = 'client';
					}
					
					if(paramIsParentGym == 'T')
					{
						cliText = 'schools'
						if(parseInt(numClients) == 1)
						{
							cliText = 'school';
						}
					}
					
					//Mind Gym delivery(s) [DD-MM]
					//You have [# F2F] F2F and [# Virtual] Virtual tomorrow for [# Clients] client(s) starting at [Start]
					//Any issues please call us on [Office #]
					
						var infoText = '';
						if (parseInt(numF2f) > 0 && parseInt(numVir) > 0) {
							infoText = 'You have '+numF2f+' F2F and '+numVir+' Virtual ';
						} else {
							//Only that has number
							if (parseInt(numF2f) > 0) {
								infoText = 'You have '+numF2f+' F2F ';
							} else if (parseInt(numVir) > 0) {
								infoText = 'You have '+numVir+' Virtual ';
							}
						}

					
					//Based on Booking ID, identify which timezone value using Booking Type
					var timeZoneId = '';
					var tzvalues = nlapiLookupField('job', bookingId, ['custentity_cbl_booking_coachtz','custentity_bo_eventtimezone'], false);
					log('debug','Booking ID '+bookingId, JSON.stringify(tzvalues));
					if (bookingType == 'Face to face') {
						timeZoneId = tzvalues['custentity_bo_eventtimezone'];
					} else {
						timeZoneId = tzvalues['custentity_cbl_booking_coachtz'];
					}
					
					var timeZoneValue = '';
					if (timeZoneId) {
						var tzabrvalues = nlapiLookupField('customrecord_timezone', timeZoneId, ['custrecord_tz_abbreviation','custrecord_tz_offset'], false);
						timeZoneValue = (tzabrvalues['custrecord_tz_abbreviation']?tzabrvalues['custrecord_tz_abbreviation']:'NA')+ 
										'(GMT '+
										(tzabrvalues['custrecord_tz_offset']?tzabrvalues['custrecord_tz_offset']:'+NA')+
										')';
					}
					
					if (paramIsParentGym == 'T' )
					{
						msgBody = 'PG '+delText+' '+ddMmValue+' at '+ coachStartTime +
								  'Dear '+coachFirstName+'\n'+
								  'Have a great session tomorrow.'+
								  'Let us know if you need anything on '+bookingOfficePhonenumber;

					}
					else
					{
						msgBody = 'MG '+delText+' '+ddMmValue+'\n'+
								  'Dear '+coachFirstName+'\n'+
								  infoText+'tomorrow for '+numClients+' '+cliText+' starting at '+
								  coachStartTime+' '+timeZoneValue+'.\n'+
								  'Any issues please call us on '+bookingOfficePhonenumber;
					}
					
					
					// -------------------- Need to grab fromNum from couach country record 
					
					log('debug','Message Body', msgBody);
					
					var postStr = 'From='+encodeURIComponent('+'+sendFromNumber)+'&To='+encodeURIComponent('+'+actualSendToNumber)+'&Body='+encodeURIComponent(msgBody);
					
					//nlapiRequestURL(url, postdata, headers, callback, httpMethod)
					var sendRes = nlapiRequestURL(twApiSendSms, postStr, pheaders, null, 'POST');
					var retJson = eval('('+sendRes.getBody()+')');
					
					if (retJson.status == '400') {
						procStatus = 'Failed';
						procLog = retJson.status+' // '+strGlobalReplace(retJson.message, ',', ' ');
					} else {
						procStatus = 'Success';						
						procLog = retJson.status+' // Message Sent to '+actualSendToNumber;
						
						fromnumber[sendFromNumber].sent = parseInt(fromnumber[sendFromNumber].sent)+1;
						
						debug('debug','fromnumber JSON',JSON.stringify(fromnumber));
					}
					
					//wait one second before processing next
					while (!exitWait) {
						var wp = new Date().getTime();
						if ((wp - nowTime) >= 1000) {
							log('debug','Waited one second','Process next after 1 second');
							exitWait = true;
							nowTime = wp;
						}
					}
					
				} catch (procerr) {
					
					procStatus = 'Failed';
					procLog = 'Unexpected Error: '+getErrText(procerr);
					
				}
				log('debug','Status // log',procStatus+' // '+procLog);
				//BUILD CSV 
				csvBody += '"'+procStatus+'", '+
						   '"'+procLog+'", '+
						   '"'+sendFromNumber+'",'+
						   '"'+sendToNumber+'",'+
						   '"'+actualSendToNumber+'",'+
						   '"'+bookingId+'",'+
						   '"'+coachFullName+'",'+
						   '"'+coachFirstName+'",'+
						   '"'+numDeliveries+'",'+
						   '"'+numClients+'",'+
						   '"'+coachStartTime+' ('+coachCountryText+')"\n';				
			}
			
			//Notify Team Members
			
			if(paramIsParentGym == 'T')
			{
				if (csvBody) {
					var rightNow = new Date();
					var emailfileName = 'Parent Gym Coach Notification Log-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
					var emailCsvFileObj = nlapiCreateFile(emailfileName, 'CSV', csvHeader + csvBody);
					
					var logmsg = 'Attached is process log for today. Below is statistics for each number';
					
					var statstext = '';
					for (var num in fromnumber) {
						
						var usageValue = ((parseInt(fromnumber[num].sent)/MAX_DAILY_LIMIT)*100).toFixed(0);
						statstext +='<li><b>'+num+'</b>: '+fromnumber[num].sent+' ('+usageValue+'%) </li>';
						
						//send out a message to helpdesk if THIS Number reaches 80 or more
						log('debug','Writing out Usage for '+fromnumber[num],'Usage % Value: '+usageValue);
						if (parseInt(usageValue) >= 80) {
							var alertsbj = 'SMS tomorrow delivery Usage Alert';
							var alertmsg = usageValue+'% of SMS\'s used on the number '+num+'. Please log into Twilio and add new number with same country code';
							nlapiSendEmail(-5, 'helpdesk@themindgym.com', alertsbj, alertmsg, ['mindgym@audaxium.com','david.atkinson@themindgym.com','sophie.horgan@parentgym.com','Geethika.Jayatilaka@parentgym.com']);
						}
					}
					statstext = '<ul>'+statstext+'</ul>';
					
					nlapiSendEmail(-5, 'logs@themindgym.com', 'Parent Gym Coach Notification Processed', logmsg + statstext, ['mindgym@audaxium.com','david.atkinson@themindgym.com', 'sophie.horgan@parentgym.com','Geethika.Jayatilaka@parentgym.com'], null, null, emailCsvFileObj);
				}
			}
			else
			{
				if (csvBody) {
					var rightNow = new Date();
					var emailfileName = 'Mind Gym Coach Notification Log-'+(rightNow.getMonth()+1)+'_'+rightNow.getDate()+'_'+rightNow.getFullYear()+'.csv';
					var emailCsvFileObj = nlapiCreateFile(emailfileName, 'CSV', csvHeader + csvBody);
					
					var logmsg = 'Attached is process log for today. Below is statistics for each number';
					
					var statstext = '';
					for (var num in fromnumber) {
						
						var usageValue = ((parseInt(fromnumber[num].sent)/MAX_DAILY_LIMIT)*100).toFixed(0);
						statstext +='<li><b>'+num+'</b>: '+fromnumber[num].sent+' ('+usageValue+'%) </li>';
						
						//send out a message to helpdesk if THIS Number reaches 80 or more
						log('debug','Writing out Usage for '+fromnumber[num],'Usage % Value: '+usageValue);
						if (parseInt(usageValue) >= 80) {
							var alertsbj = 'SMS tomorrow delivery Usage Alert';
							var alertmsg = usageValue+'% of SMS\'s used on the number '+num+'. Please log into Twilio and add new number with same country code';
							nlapiSendEmail(-5, 'helpdesk@themindgym.com', alertsbj, alertmsg, ['mindgym@audaxium.com','david.atkinson@themindgym.com']);
						}
					}
					statstext = '<ul>'+statstext+'</ul>';
					
					nlapiSendEmail(-5, 'logs@themindgym.com', 'Mind Gym Coach Notification Processed', logmsg + statstext, ['mindgym@audaxium.com','david.atkinson@themindgym.com'], null, null, emailCsvFileObj);
				}
			}

			
		}
		
	} catch (processerr) {
		log('error','Process Error', getErrText(processerr));
	}
	
}