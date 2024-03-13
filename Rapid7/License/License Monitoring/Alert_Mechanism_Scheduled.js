
function alertPhoneStatsDown(){

	var alertSearches = new Array();
	alertSearches[alertSearches.length] = new alertObject('Phone Statistics', 'customrecordphonestatistics', 2305, new Array(1, 2, 3, 4, 5), new Array(8, 9, 10, 11, 12, 13, 14, 15, 16, 17), 1, 2, new Array('errol_fagone@rapid7.com'));
	
	for (var i = 0; i < alertSearches.length; i++) {
	
		var objCurrentAlert = alertSearches[i];
		nlapiLogExecution("DEBUG", 'Looking into alerts for', objCurrentAlert.name);
		if (todayInList(objCurrentAlert.days) && hourInList(objCurrentAlert.hours)) {
		
			var results = nlapiSearchRecord(objCurrentAlert.recordId, objCurrentAlert.searchId);
			if (results == null || results.length < 1) {
			
				try {
					var txt = "Netsuite Alert for Regular Expected Activity\n\n" +
					"Haven't had any activity from " +
					objCurrentAlert.name;
					var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
					nlapiSendEmail(adminUser, objCurrentAlert.to, 'No activity from ' + objCurrentAlert.name + " alert", txt, objCurrentAlert.cc);
				} 
				catch (err) {
					nlapiLogExecution('ERROR', 'Failed to send notification Email', 'Fail');
				}
			}
			else 
				if (results[0] != null) {
					var today = new Date();
					var columns = results[0].getAllColumns();
					var dateOfActivity = results[0].getValue(columns[0]);
					
					var lastActivity = nlapiStringToDate(dateOfActivity);
					var oneHour = 1000 * 60 * 60;
					
					var difference = parseInt((today.getTime() + (3 * oneHour) - lastActivity.getTime()) / oneHour);
					
					
					if (difference >= objCurrentAlert.thresholdHrs) {
						var txt = "Netsuite Alert for Regular Expected Activity\n\n" +
						"Haven't had any activity from " +
						objCurrentAlert.name +
						"\nLast heard from at: " +
						dateOfActivity +
						"\n\nThis is greater than the specified expected interval of " +
						objCurrentAlert.thresholdHrs +
						" hours.";
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(adminUser, objCurrentAlert.to, 'No activity from ' + objCurrentAlert.name + " alert", txt, objCurrentAlert.cc);
					}
				}
		}
	}
}

function alertObject(name, recordId, searchId, days, hours, thresholdHrs, to, cc){

	this.name = name;
	this.recordId = recordId;
	this.searchId = searchId;
	this.days = days != null && days != '' ? days : new Array(1, 2, 3, 4, 5); //weekday
	this.hours = hours != null && hours != '' ? hours : new Array(8, 9, 10, 11, 12, 13, 14, 15, 16, 17); //business hours
	this.thresholdHrs = thresholdHrs != null && thresholdHrs != '' ? thresholdHrs : 1; //1 Hr
	this.to = to != null && to != '' ? to : 2; //DZ
	this.cc = cc;
}

//Is today one of the alertdays?
//For example weekends are not alert days for phone system
function todayInList(listOfDays){
	nlapiLogExecution('DEBUG','Checking if day is in present list','yup');
	var today = new Date();
	var day = today.getDay();
	for(var i=0;listOfDays!=null && i<listOfDays.length;i++){
		if (day == listOfDays[i]) {
			nlapiLogExecution('DEBUG','Day '+day,'is on the list');
			return true;
		}
	}
	nlapiLogExecution('DEBUG','Day '+day,'is not on the list');
	return false;
}

function hourInList(listOfHours){
	nlapiLogExecution('DEBUG','Checking if hour is in present list','yup');
	var today = new Date();
	var hour = today.getHours();
	nlapiLogExecution('DEBUG','The hour is ',hour);
	for (var i = 0; listOfHours != null && i < listOfHours.length; i++) {
		if (hour == listOfHours[i]) {
			nlapiLogExecution('DEBUG','Hour '+hour,'is on the list');
			return true;
		}
	}
	nlapiLogExecution('DEBUG','Hour '+hour,'is not on the list');
	return false;
}
