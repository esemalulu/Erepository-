
/**
	 * Possible returned Date/Time value from Setster
	 * NEED CONVERSION 2015-12-18T11:00:00-08:00
	   ALREDY IN GMT 2015-12-17 13:00
	   
	 */
var _dtstring = '2016-02-09 23:00';	

	if (!_dtstring)
	{
		throw nlapiCreateError('SETSTER_ERR', 'No Date/Time Value to run conversion to GTM', true);
	}
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

	alert(convertedDate);
	
/************************************************/

var sessionid = '4bnpudg52imldoddfrp1jltbu1';
var apiurl = 'http://www.setster.com/api/v2/';

/************* Availability******************/
var availableDates = [],
	currDate = new Date('1/22/2016'),
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

var locid = '22117', //USA
	proid = '21233', //Joe Son
	serid = '41077', //Awesome call demo
	tzid = '548';

alert('curr date: '+currDateApi);
alert('nws  date: '+nextWeekSundayDateApi);

var avaUrl = apiurl+
'availability/?session_token='+sessionid+
'&location_id='+locid+
'&service_id='+serid+
'&provider_id='+proid+
'&timezone_id='+tzid+
'&start_date='+nextWeekSundayDateApi+
'&return=times'+
'&t=weekly';


var avaRes = nlapiRequestURL(avaUrl);
var avaResJson = JSON.parse(avaRes.getBody());
alert(avaRes.getBody());

/************* NExt Monday Finder **********/
var currDate = new Date('1/22/2016');
var tempDay='', tempDate = null;
var counter = 0;

//If current day is Sat, Sun or Monday, we need to adjust starting counter to be next Tue
var nextWeekCheckDate = nlapiAddDays(currDate, (7-currDate.getDay()));



/************* event detail ****************/
var eventid = '13316178363';

var postjson = {
	'data':JSON.stringify({
		'client_email':'mhson1978@gmail.com',
		'client_name':'AAA Conversion to Prospect',
		'employee_id':'21233', //Joe Son
		'location_id':'22117', //A-EUROPE
		'service_id':'41077', //Awesome service
		'start_date':'2015-12-17 13:00:00'
	})
};
	
	
var apiurl = apiurl+'appointment?session_token='+sessionid;
var res = nlapiRequestURL(apiurl, postjson,null,'POST');

//var apiurl = apiurl+'appointment/'+eventid+'/?session_token='+sessionid;	
//var res = nlapiRequestURL(apiurl, postjson,null,'PUT');	


var resjson = JSON.parse(res.getBody());
alert(resjson);


"22117" = V-USA

2015-12-18T11:00:00-08:00

2015-12-17 13:00

2015-12-17 21:00

