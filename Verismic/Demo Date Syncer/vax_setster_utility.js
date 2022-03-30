/**
 * Utility script that contains functions relating to Setster API calls
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Dec 2015     json
 *
 */

/**
 * {
			'contactname':pjson.contactname,
			'salesrep':pjson.salesrep,
			'salesrepemail':pjson.salesrepemail,
			'salesrepphone':pjson.salesrepphone,
			'salesreptitle':pjson.salesreptitle,
			'servicetext':pjson.servicetext,
			'date':pjson.demodate,
			'time':pjson.demotimetext,
			'clienttztext':pjson.clienttztext,
			'iscancelled':true or false,
			'ringlink':xxxx
		}
 */

function  getEmailMsg(_param)
{
	log('debug','getEmailMsg Parameter', JSON.stringify(_param));
	
	if (_param.iscancelled)
	{
		return 'Hello '+_param.contactname+
			   '<br/><br/>'+
			   _param.salesrep+' has cancelled the event below:'+
			   '<br/><br/>'+
			   '<b>Topic: </b>'+_param.servicetext+'<br/>'+
			   '<b>Time: </b>'+_param.date+' '+_param.time+' '+_param.clienttztext+'<br/>'+
			   '<br/>'+
			   _param.salesrep+'<br/>'+
			   _param.salesreptitle+'<br/>'+
			   'Cloud Management Suite<br/>'+
			   _param.salesrepemail+'<br/>'+
			   'Office: '+_param.salesrepphone+'<br/>'+
			   'www.cloudmanagementsuite.com';
	}
	
	var rcltext = strGlobalReplace(_param.ringlink, "\r", "<br/>");
	//rcltext = strGlobalReplace(rcltext,"\n", "<br/>");
	
	return 'Hello '+_param.contactname+
		   '<br/><br/>'+
		   _param.salesrep+' is inviting you to a scheduled RingCentral meeting.'+
		   '<br/><br/>'+
		   '<b>Topic: </b>'+_param.servicetext+'<br/>'+
		   '<b>Time: </b>'+_param.date+' '+_param.time+' '+_param.clienttztext+'<br/>'+
		   '<br/><br/>'+
		   rcltext+
		   '<br/>'+
		   'To cancel or reschedule this event, '+
		   'please contact '+_param.salesrep+' at '+_param.salesrepemail+'<br/>'+
		   '<br/>'+
		   _param.salesrep+'<br/>'+
		   _param.salesreptitle+'<br/>'+
		   '<b>Cloud Management Suite</b><br/>'+
		   '<div style="font-size: 11px">a DBA of Verismic Software.</div><br/>'+
		   _param.salesrepemail+'<br/>'+
		   'Office: '+_param.salesrepphone+'<br/>'+
		   'www.cloudmanagementsuite.com';
}

/**
 * 
 * {
		'start_date':getGmtInUtcFormat(apptjson.data.start_date),
		'duration':pjson.demoduration,
		'subject':pjson.companyname+' - '+pjson.demotypetext,
		'demotech':pjson.providertext,
		'demotechemail':pjson.provideremail,
		'salesrep':pjson.salesrep,
		'salesrepemail':pjson.salesrepemail,
		'servicetext':pjson.servicetext,
		'locationtext':pjson.locationtext,
		'company':pjson.companyname,
		'contact':pjson.contactname,
		'contactemail':pjson.email,
		'iscancelled':true or false,
		'nseventid':xxxx,
		'ringlink':xxxxx
   }
 */
function generateIcsFile(_param)
{
	log('debug','generateIcsFile',JSON.stringify(_param));
	
	var statusText = '',
		methodText = '';
	if (_param.iscancelled)
	{
		statusText = 'STATUS:CANCELLED\n';
		methodText = 'METHOD:CANCEL\n';
	}
	
	log('debug','Ring Link Before Mod',_param.ringlink);
	
	var rcltext = strGlobalReplace(_param.ringlink, "\r", "\\n");
	rcltext = strGlobalReplace(rcltext,"\n", "");
	
	log('debug','Ring Link After Mod', rcltext);
	
	var icstext = 'BEGIN:VCALENDAR\n'+
					'VERSION:2.0\n'+
				  	'PRODID:-//NetSuite//Event Time//EN\n'+
				  	'X-WR-RELCALID:'+_param.nseventid+'\n'+
				  	methodText+
				  	'BEGIN:VEVENT\n'+
				  		'UID:'+_param.nseventid+'\n'+
				  		'DTSTART:'+_param.start_date+'\n'+
				  		'DURATION:PT0H'+_param.duration+'M0S\n'+
				  		'ORGANIZER;CN='+_param.salesrep+':MAILTO:'+_param.salesrepemail+'\n'+
				  		statusText+
				  		'SUMMARY:'+_param.subject+'\n'+
				  		'DESCRIPTION:The following details your appointment with '+
				  						_param.locationtext+' - '+_param.demotech+'\\n\\n'+
				  						'APPOINTMENT DETAILS\\n'+
				  						'What: '+_param.servicetext+'\\n'+
				  						'Sales Rep (Email): '+_param.salesrep+' ('+_param.salesrepemail+') \\n\\n'+
				  						rcltext+
				  						'\\n\\n'+
				  						'CLIENT DETAILS\\n'+
				  						'Contact: '+_param.contact+'\\n'+
				  						'Company: '+_param.company+'\\n'+
				  						'Email: '+_param.contactemail+'\n'+
				  	'END:VEVENT\n'+
				  'END:VCALENDAR';

	return nlapiCreateFile('event.ics', 'PLAINTEXT', icstext);
}

/**
 * Converts passed in NS 12H time into 24H:MM:SS
 * @param value
 */
function convertTo24H(value)
{
	//Value passed in is HH:MM am/pm
	var tempvalue = ((value.indexOf('am') > -1)?value.replace(' am',''):value.replace(' pm',''));
	
	var valar = tempvalue.split(':'); // 0=HH, 1=MM
	var valHour = parseFloat(valar[0]);
	
	//If it's in the evening, need to conver to 24H
	if (valHour < 10 && value.indexOf('pm') > -1)
	{
		valHour = valHour + 12;
		//Add leading 0
		valHour = '0'+valHour.toString();
	}
	
	return valHour+':'+valar[1]+':00';
}

/**
 * Converts passed in 24Hour time string into 12Hour time string
 * @param optionText
 * @returns {String}
 */
function convertToAmPm(optionText)
{
	//Need to convert text to am/pm
	var optionTextAr = optionText.split(':');
	var optionHour = optionTextAr[0],
		optionMin = optionTextAr[1],
		optionAmPm = 'am';
	if (parseInt(optionHour) > 11)
	{
		optionAmPm = 'pm';
			
		//We need to conver to 12H format
		if (parseInt(optionHour) > 12)
		{
			optionHour = parseInt(optionHour) - 12;
		}
	}
	
	if (optionHour < 10)
	{
		optionHour = '0'+parseInt(optionHour).toString();
	}
	
	//Just in case, only add am/pm if we need to
	if (optionText.indexOf('am') > -1 || optionText.indexOf('pm') > -1)
	{
		//This already has am/pm in it
		return optionHour+':'+optionMin;
	}
	
	return optionHour+':'+optionMin+' '+optionAmPm;
	
}

/**
 * Setster genertaes the ICS file in GMT Time.
 * This takes date/time of Setster and converts it to GMT
 * then returns the value in UTC format
 * Returns in following format to be used on ICS file
 * YYYYMMDDTHH24MMSSZ
 */
function getGmtInUtcFormat(_dtstring)
{
	/**
	 * Possible returned Date/Time value from Setster
	 * NEED CONVERSION 2015-12-18T11:00:00-08:00
	   ALREDY IN GMT 2015-12-17 13:00
	   
	 */
	
	if (!_dtstring)
	{
		throw nlapiCreateError('SETSTER_ERR', 'No Date/Time Value to run conversion to GTM', true);
	}
	log('debug','getGmtInUtcFormat', _dtstring);
	var convertedDate = _dtstring;
	//1. Check to see if we need to run conversion.
	if (_dtstring.indexOf('T') > -1 && (_dtstring.indexOf('+') > -1 || _dtstring.indexOf('-') > -1) )
	{
		//Run Conversion
		//1. Need to UTC Formatted date passed in into Date Object.
		//	 This is necessary to run calculation against Hours
		var dtArray = _dtstring.split('T'), //0=Date portion, 1=Time portion with TZ Offset
			dateArray = dtArray[0].split('-'), //0=year, 1=month, 2=day
			tzDelimiter = (dtArray[1].indexOf('+')>-1?'+':'-'), //if it's -, means to add while + means to subtract
			timeArray = dtArray[1].split(tzDelimiter), // 0=Time, 1=TZ Offset
			dateObj = new Date(
					  	dateArray[1]+
					  	'/'+
					  	dateArray[2]+
					  	'/'+
					  	dateArray[0]+
					  	' '+
					  	timeArray[0]
					  );
		
		//2. Conver to GMT using the TZ Offset
		//	 This part simply adds/subtracts the Hour. 
		//	  08:00 = Split using : and use first index element as Hour
		var tzHourValue = parseFloat(timeArray[1].split(':')[0]); //0 is the Hour Value 
		// if (delimiter is + subtract, if - add)
		if (tzDelimiter=='-')
		{
			dateObj.setHours(dateObj.getHours()+tzHourValue);
		}
		else
		{
			dateObj.setHours(dateObj.getHours()-tzHourValue);
		}
		
		//Manuall build out UTC Formatted Date
		
		var hourValue = dateObj.getHours(),
			minValue = dateObj.getMinutes(),
			secValue = dateObj.getSeconds();
		if (hourValue < 10)
		{
			hourValue = '0'+hourValue;
		}
		
		if (minValue < 10)
		{
			minValue = '0'+minValue;
		}
		
		if (secValue < 10)
		{
			secValue = '0'+secValue;
		}
		
		var twoDigitMonthValue = dateObj.getMonth()+1;
		if (twoDigitMonthValue < 10)
		{
			twoDigitMonthValue = '0'+twoDigitMonthValue.toString();
		}
		
		var twoDigitDayValue = dateObj.getDate();
		if (twoDigitDayValue < 10)
		{
			twoDigitDayValue = '0'+twoDigitDayValue.toString();
		}
		
		convertedDate = dateObj.getFullYear().toString()+
						twoDigitMonthValue+
						twoDigitDayValue+
						'T'+
						hourValue.toString()+
						minValue.toString()+
						secValue.toString()+
						'Z';
		
	}
	else
	{
		//2015-12-17 13:00 
		var gmtDtArray = _dtstring.split(' '), //0=date, 1=time
			gmtDateOnlyArray = gmtDtArray[0].split('-'), //0=Year, 1=month, 2=day
			gmtYearValue = gmtDateOnlyArray[0],
			gmtMonthValue = '',
			gmtDayValue = '',
			gmtTimeArray = gmtDtArray[1].split(':'); //0=Hour, 1= Min
		
		gmtMonthValue = parseFloat(gmtDateOnlyArray[1]);
		if (gmtMonthValue < 10)
		{
			gmtMonthValue='0'+gmtMonthValue;
		}
		
		gmtDayValue = parseFloat(gmtDateOnlyArray[2]);
		if (gmtDayValue < 10)
		{
			gmtDayValue='0'+gmtDayValue;
		}
		
		convertedDate = gmtYearValue+
						gmtMonthValue+
						gmtDayValue+
						'T'+
						gmtTimeArray[0]+
						gmtTimeArray[1]+
						'00Z';
	}
	
	return convertedDate;
	
}

/**
 * Delete the event completely out of the system.
 * NO Notification is generated
 * @param _param
 * {
 *   'sessionid':sessionid,
 *   'eventid':apptid
 * }
 */
function deleteSetsterAppt(_param)
{
	var robj = {
		'status':false,
		'error':''
	};
			
	try
	{
		var delUrl = paramApiUrl+
			'appointment/'+
			_param.eventid+
			'/?session_token='+_param.sessionid;
			
		log('debug','avail time', delUrl);
		var delRes = nlapiRequestURL(delUrl,null,null,'DELETE');
		var delResJson = JSON.parse(delRes.getBody());
			
		log('debug','del res',delRes.getBody());
				
		//If statusCode is 0, it's successful
		if (delResJson.statusCode == '0')
		{
			robj.status = true;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Deleting Event from Setsetr: '+
						 '('+_param.eventid+') '+
						 delResJson.statusCode+
						 ' // '+
						 delResJson.statusDescription;
		}
	}
	catch (delerr)
	{
		robj.status = false;
		robj.error = 'Error Deleting Event from Setster: '+
					 '('+_param.eventid+') '+
					 ' // '+
					 getErrText(delerr);
	}
	return robj;	
}

/**
 * Get the detail of event always in GMT timezone (ID 422)
 * @param _param
 * {
		'session':pjson.sessionid,
		'eventid':apptjson.id
   }
 */
function getSetsterEvent(_param)
{
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
		
	try
	{
		var evtUrl = paramApiUrl+
			'appointment/'+
			_param.eventid+
			'/?session_token='+_param.session+
			'&timezone_id=422';

		log('debug','avail time', evtUrl);
			
		var evtRes = nlapiRequestURL(evtUrl);
		var evtResJson = JSON.parse(evtRes.getBody());
		
		log('debug','evt res',evtRes.getBody());
			
		//If statusCode is 0, it's successful
		if (evtResJson.statusCode == '0')
		{
			robj.status = true;
			robj.data = evtResJson.data;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting Event Detail from Setsetr: '+
						 '('+_param.eventid+') '+
						 evtResJson.statusCode+
						 ' // '+
						 evtResJson.statusDescription;
		}
	}
	catch (evterr)
	{
		robj.status = false;
		robj.error = 'Error Getting Event Detail from Setster: '+
					 '('+_param.eventid+') '+
					 ' // '+
					 getErrText(evterr);
	}
	return robj;	
}

/**
 * Function to grab available times based on
 * date, location, service and employee
 * This function is called from client side
 * @parameter _param
 * {
 *   'date':YYYY-MM-DD,
 *   'location':xx,
 *   'service':xx,
 *   'provider':xx,
 *   'session':xxxxx,
 *   'timezone':xxx
 * }
 */
function getAvailableTimeByDate(_param)
{
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
	
	try
	{
		var avaUrl = paramApiUrl+
			'availability/?session_token='+_param.session+
			'&location_id='+_param.location+
			'&service_id='+_param.service+
			'&provider_id='+_param.provider+
			'&timezone_id='+_param.timezone+
			'&start_date='+_param.date+
			'&return=times'+
			'&t=daily';

		log('debug','avail time', avaUrl);
		
		var avaRes = nlapiRequestURL(avaUrl);
		var avaResJson = JSON.parse(avaRes.getBody());
		
		log('debug','ava res',avaRes.getBody());
		
		//If statusCode is 0, it's successful
		if (avaResJson.statusCode == '0')
		{
			robj.status = true;
			robj.data = avaResJson.data;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting Available times from Setsetr: '+
						 avaResJson.statusCode+
						 ' // '+
						 avaResJson.statusDescription;
		}
	}
	catch (avaerr)
	{
		robj.status = false;
		robj.error = 'Error Getting Available times from Setster: '+getErrText(avaerr);
	}
	log('debug','about to return',JSON.stringify(robj));
	return robj;	
}

/**
 * Function to grab list of available dates based on
 * CURRENT Date.
 * This function will need to look at WEEKLY list based on current date.
 * AND
 * First Sunday of NEXT WEEK Based on Current Date. 
 * @parameter _param
 * {
 * 	 'nsdate':'MM/DD/YYYY',
 *   'location':xx,
 *   'service':xx,
 *   'provider':xx,
 *   'session':xxxxx,
 *   'timezone':xxx
 * }
 */
function getNextAvailableDates(_param)
{
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
	
	//1. We need to grab next WEEK Date based on current date.
	var availableDates = [],
		currDate = new Date(_param.nsdate),
		currDateApi = currDate.getFullYear()+
					  '-'+
					  (currDate.getMonth()+1)+
					  '-'+
					  currDate.getDate(),
		nextWeekSundayDate = nlapiAddDays(currDate, (7-currDate.getDay())),
		nextWeekSundayDateApi = nextWeekSundayDate.getFullYear()+
							    '-'+
							    (nextWeekSundayDate.getMonth()+1)+
							    '-'+
							    nextWeekSundayDate.getDate();
	try
	{
		//Get available dates for current date
		var avaUrl = paramApiUrl+
			'availability/?session_token='+_param.session+
			'&location_id='+_param.location+
			'&service_id='+_param.service+
			'&provider_id='+_param.provider+
			'&timezone_id='+_param.timezone+
			'&start_date='+currDateApi+
			'&return=times'+
			'&t=weekly';
		
		var avaRes = nlapiRequestURL(avaUrl);
		var avaResJson = JSON.parse(avaRes.getBody());
		
		var thisWeekAvail = true,
			nextWeekAvail = true;
		
		//If statusCode is 0, it's successful
		if (avaResJson.statusCode == '0')
		{
			log('debug','this week',JSON.stringify(avaResJson));
			if (!(avaResJson.data.times.length==0))
			{
				//Loop through each results and add to availableDates array
				for (var t in avaResJson.data.times)
				{
					var art = t.split('-'); //0=year, 1=month, 2=date
					availableDates.push(
						art[1]+'/'+art[2]+'/'+art[0]
					);
				}
			}
			else
			{
				thisWeekAvail = false;
			}
			

			robj.data = availableDates;
			
			//Run nextWeekSundayDateApi Search
			//Get available dates for current date
			var wvaUrl = paramApiUrl+
						 'availability/?session_token='+_param.session+
						 '&location_id='+_param.location+
						 '&service_id='+_param.service+
						 '&provider_id='+_param.provider+
						 '&timezone_id='+_param.timezone+
						 '&start_date='+nextWeekSundayDateApi+
						 '&return=times'+
						 '&t=weekly';
			
			var wvaRes = nlapiRequestURL(wvaUrl);
			var wvaResJson = JSON.parse(wvaRes.getBody());
			//If statusCode is 0, it's successful
			if (wvaResJson.statusCode == '0')
			{
				
				robj.status = true;
				
				if (!(wvaResJson.data.times.length==0))
				{
					//Loo through each results and add to availableDates array
					for (var w in wvaResJson.data.times)
					{
						var arw = w.split('-'); //0=year, 1=month, 2=date
						availableDates.push(
							arw[1]+'/'+arw[2]+'/'+arw[0]
						);
					}
				}
				else
				{
					nextWeekAvail = false;
				}
				
				//IF at this point, both this and next weeks are booked, call and grab first available date
				if (!thisWeekAvail && !nextWeekAvail)
				{
					
					var nvaUrl = paramApiUrl+
					 			 'availability/?session_token='+_param.session+
					 			 '&location_id='+_param.location+
					 			 '&service_id='+_param.service+
					 			 '&provider_id='+_param.provider+
					 			 '&timezone_id='+_param.timezone+
					 			 '&start_date='+nextWeekSundayDateApi+
					 			 '&return=times'+
					 			 '&first_available=1'+
					 			 '&t=weekly';
		
					var nvaRes = nlapiRequestURL(nvaUrl);
					var nvaResJson = JSON.parse(nvaRes.getBody());
					
					log('debug','nvaResJson NEXT Avail', nvaRes.getBody());
					
					//If statusCode is 0, it's successful
					if (nvaResJson.statusCode == '0')
					{
						if (!(nvaResJson.data.times.length==0))
						{
							//Loo through each results and add to availableDates array
							for (var n in nvaResJson.data.times)
							{
								var arn = n.split('-'); //0=year, 1=month, 2=date
								availableDates.push(
									arn[1]+'/'+arn[2]+'/'+arn[0]
								);
							}
						}
					}
					
					robj.data = availableDates;

				}				
			}
			else
			{	
				robj.status = false;
				robj.error = 'Error Getting Next Available Dates from Setsetr: '+
							 wvaResJson.statusCode+
							 ' // '+
							 wvaResJson.statusDescription;
			}
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting Next Available Dates from Setsetr: '+
						 avaResJson.statusCode+
						 ' // '+
						 avaResJson.statusDescription;
		}
	}
	catch (avaerr)
	{
		robj.status = false;
		robj.error = 'Error Getting Available Dates from Setster: '+getErrText(avaerr);
	}
	log('debug','about to return',JSON.stringify(robj));
	return robj;	
}

/**
 * Grabs Account INFO Setster account.
 * Account JSON will be referenced when Location is using "Use Company Default" for timezone.
 * Account info also includes dteails from Profile
 */
function getSetsterAccountDetail(_param)
{
	
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
	
	try
	{
		var acctUrl = paramApiUrl+
			'account/?session_token='+_param.sessionid;

		var acctRes = nlapiRequestURL(acctUrl);
		var acctResJson = JSON.parse(acctRes.getBody());
		
		//If statusCode is 0, it's successful
		if (acctResJson.statusCode == '0')
		{
			robj.status = true;
			robj.data = acctResJson.data;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting Account Details from Setsetr: '+
						 acctResJson.statusCode+
						 ' // '+
						 acctResJson.statusDescription;
		}
	}
	catch (accterr)
	{
		robj.status = false;
		robj.error = 'Error Getting Account Details from Setster: '+getErrText(accterr);
	}
	
	return robj;
}

/**
 * Grabs list of ALL Timezones in Setster account.
 */
function getAllSetsterTimezone(_param)
{
	
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
	
	try
	{
		var tzUrl = paramApiUrl+
			'tz/list/?session_token='+_param.sessionid;

		var tzRes = nlapiRequestURL(tzUrl);
		var tzResJson = JSON.parse(tzRes.getBody());
		
		//If statusCode is 0, it's successful
		if (tzResJson.statusCode == '0')
		{
			robj.status = true;
			robj.data = tzResJson.data;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting ALL Time Zonesfrom Setsetr: '+
						 tzResJson.statusCode+
						 ' // '+
						 tzResJson.statusDescription;
		}
	}
	catch (tzerr)
	{
		robj.status = false;
		robj.error = 'Error Getting ALL Time Zones from Setster: '+getErrText(tzerr);
	}
	
	return robj;
}

/**
 * Function to grab all Provider (Employee)
 * 
 */
function getAllProvider(_param)
{
	//TODO: Need to check for session
	
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
	
	try
	{
		var proUrl = paramApiUrl+
			'employee/?session_token='+_param.sessionid;

		var proRes = nlapiRequestURL(proUrl);
		var proResJson = JSON.parse(proRes.getBody());
		
		//If statusCode is 0, it's successful
		if (proResJson.statusCode == '0')
		{
			robj.status = true;
			robj.data = proResJson.data;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting ALL Providers (Employees) from Setsetr: '+
						 proResJson.statusCode+
						 ' // '+
						 proResJson.statusDescription;
		}
	}
	catch (proerr)
	{
		robj.status = false;
		robj.error = 'Error Getting ALL Providers (Employees) from Setster: '+getErrText(proerr);
	}
	
	return robj;
	
}

/**
 * Function to grab all Services
 * 
 */
function getAllServices(_param)
{
	//TODO: Need to check for session
	
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
	
	try
	{
		var serUrl = paramApiUrl+
			'service/?session_token='+_param.sessionid;

		var serRes = nlapiRequestURL(serUrl);
		var serResJson = JSON.parse(serRes.getBody());
		
		//If statusCode is 0, it's successful
		if (serResJson.statusCode == '0')
		{
			robj.status = true;
			robj.data = serResJson.data;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting ALL Services from Setsetr: '+
						 serResJson.statusCode+
						 ' // '+
						 serResJson.statusDescription;
		}
	}
	catch (sererr)
	{
		robj.status = false;
		robj.error = 'Error Getting ALL Services from Setster: '+getErrText(sererr);
	}
	
	return robj;
	
}

/**
 * Function to grab all locations with linked Provider and Services
 * 
 */
function getAllLocations(_param)
{
	//TODO: Need to check for session
	
	var robj = {
		'status':false,
		'error':'',
		'data':null
	};
	
	try
	{
		var locUrl = paramApiUrl+
			'location/?links=all'+
			'&session_token='+_param.sessionid;

		var locRes = nlapiRequestURL(locUrl);
		var locResJson = JSON.parse(locRes.getBody());
		
		//If statusCode is 0, it's successful
		if (locResJson.statusCode == '0')
		{
			robj.status = true;
			robj.data = locResJson.data;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Getting ALL Locations from Setsetr: '+
						 locResJson.statusCode+
						 ' // '+
						 locResJson.statusDescription;
		}
	}
	catch (locerr)
	{
		robj.status = false;
		robj.error = 'Error Getting ALL Locations from Setster: '+getErrText(locerr);
	}
	
	return robj;
	
}


/**
 * Function to authenticate into Setster and get session ID
 * Sample Response from Setster
 * {
    statusCode: 0,
    statusDescription: "OK",
    data: {
       "user": {
            "id": "6682",    
            "company_id": "5890",
            "account_type": "5",
            "enable_locations": "1",
            "intuit_user_id": null,
            "nick_name": "demo-api",
            "is_owner": "1",
            "enabled": true
        },
       "session_token":"bl0l9e0g9t1lvul5fg635jre32"
    }
}
 * @return 
 * {
		'status':false,
		'error':'',
		'sessionid':''
	}
 */
function setsterAuthenticate()
{
	//Below for testing in DEBUGGER 
	//Setster SANDBOX
	//var paramApiUrl = 'http://www.setster.com/api/v2/',
	//	paramApiToken = 'd550c11da58b2bf8948f254612021867',
	//	paramApiEmail = 'jloofbourrow@verismic.com',
	//	authSessionId = '';
	var robj = {
		'status':false,
		'error':'',
		'sessionid':''
	};
	
	try 
	{
		var rparam = {
			'email':paramApiEmail,
			'token':paramApiToken
		};
		
		var authUrl = paramApiUrl+
					  'account/authenticate';
		
		var authRes = nlapiRequestURL(authUrl, rparam);
		var authResJson = JSON.parse(authRes.getBody());
		
		//If statusCode is 0, it's successful
		if (authResJson.statusCode == '0')
		{
			robj.status = true;
			robj.sessionid = authResJson.data.session_token;
		}
		else
		{	
			robj.status = false;
			robj.error = 'Error Authenticating into Setsetr: '+
						 authResJson.statusCode+
						 ' // '+
						 authResJson.statusDescription;
		}
	}
	catch (autherr)
	{
		robj.status = false;
		robj.error = 'Error Authenticating into Setster: '+getErrText(autherr);
	}
	
	return robj;
}


