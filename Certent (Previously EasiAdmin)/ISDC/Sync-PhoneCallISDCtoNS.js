/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Apr 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var criteria = [];
	var today = new Date();
	var d = new Date();
	var URL = "https://certent.insidesales.com/do=noauth/rest/service";
	var user = ["audaxium", "admin", "bvmcYVpFboCHd1b6KUSTdtiI2FusNdVU"];
	
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
	
	/**
	var month = (today.getMonth() +1);
	if(month < 10) { month = "0" + month; }

	var day = today.getDate();
	if( day < 10 ){ day = "0" + day; }

	var date = today.getFullYear() + '-' + month + '-' + day + ' ' + (today.getHours()-12) + ':' + today.getMinutes() + ':' + today.getSeconds();
	*/
	
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
	
	var employee = [];
	
	var emp1 = {};
		emp1["field"] = "date_created";
		emp1["operator"] = ">=";
		emp1["values"] = ["2016-01-01 00:00:00"];
		employee.push(emp1);
		
	var emp2 = {};
		emp2["field"] = "deleted";
		emp2["operator"] = "=";
		emp2["values"] = 0;
		employee.push(emp2);
		
	var employees = {};
		employees["operation"] = "getEmployees";
		employees["parameters"] = [employee, 0 ,500];
		
	var empDictionary = [];
	
	var isdcRequest = nlapiRequestURL(URL, JSON.stringify(employees), header, null, "POST");
	var isdcResponse = JSON.parse(isdcRequest.body);
	
	if(isdcResponse != null)
	{
		for(var y = 0; y<isdcResponse.length; y+=1)
		{
			empDictionary.push({
				key:   isdcResponse[y].id,
				value: isdcResponse[y].first_name + ' ' + isdcResponse[y].last_name
			});
		}
	}

	var c1 = {};
		c1["field"] = "date_created";
		c1["operator"] = ">";
		c1["values"] = [date];
		criteria.push(c1);
	
	var tasks = {};
		tasks["operation"] = "getTasks";
		tasks["parameters"] = [criteria, 0, 500];
		
	var isdcRequest = nlapiRequestURL(URL, JSON.stringify(tasks), header, null, "POST");
	var isdcResponse = JSON.parse(isdcRequest.body);
	
	try
	{
		if(isdcResponse != null)
		{
			for(var i = 0; i<isdcResponse.length; i+=1)
			{
				var desc   = isdcResponse[i].description;
				var isdcID = isdcResponse[i].account_id;
				var date   = isdcResponse[i].due;
				var userId = isdcResponse[i].created_by_user_id;
				var sub    = isdcResponse[i].name;
				var stat   = isdcResponse[i];
				for(var key in empDictionary)
				{
					var user = empDictionary[key];
					if(user.key == userId)
					{
						var name = user.value;
					}
				}
				
				var sf = [
				          	new nlobjSearchFilter('custentity_aux_isdc_record_id', null, 'is', isdcID)
				         ];
				
				var sc = [
				          	new nlobjSearchColumn('internalid')
				         ];
				
				var search = nlapiSearchRecord('customer', null, sf, sc);
				if(search != null)
				{
					for(var i = 0; i<search.length; i+=1)
					{
						var compId = search[i].getValue('internalid');
					}
				}
				var sDate = date.split(' ');
				var phoneCall = nlapiCreateRecord('phonecall');
					phoneCall.setFieldValue('company', compId);
					phoneCall.setFieldValue('title', sub);
					phoneCall.setFieldText('assigned', name);
					phoneCall.setFieldText('startdate', sDate[0]);
					phoneCall.setFieldText('status', stat);
					phoneCall.setFieldValue('message', desc);
				
				nlapiSubmitRecord(phoneCall, false, true);
				
			}
	
		}
	} 
	catch (phonecallerr)
	{
		var eSbj = 'ISDC Error: Phone Call ISDC to NS Error',
			eMsg = 'Error while processing SYNC-PhoneCallISDCtoNS.js<br/>'+
				   '<b>ERROR: </b><br/>'+
				   getErrText(phonecallerr) +'<br/><br/>'+
				   '<b>NS to ISDC JSON:</b><br/>'+
				   JSON.stringify(tasks);
	
		nlapiSendEmail(-5, 'easiadmin@audaxium.com', eSbj, eMsg, null, null, null, null, true);
	}

}
