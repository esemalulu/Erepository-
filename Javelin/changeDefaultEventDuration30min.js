var eventTriggerType;


/*  Function Name:  pageInit
 *
 *  Desctiption: validates the duration of a meeting depending on conditions.  For most it will use a default of 30min.
 */
function pageInit(type) {
	eventTriggerType= type;
	validateEventDuration(type);
}

/*  Function Name:  function fieldChange
 *
 *  Desctiption: If the startTime is changed in the UI, it should default the endtime to 30min later
 */
function fieldChange(type, name) {

	if (name == 'starttimepicker' || name == 'starttime') {
		validateEventDuration(eventTriggerType);
	}
}

/*  Function Name: validateEventDuration
 *
 *  Desctiption: 
 * 	This function is going to attemnpt to change the default duration of an event from 1hr to 30min.
 *	It's going to check the current userID to make sure it is one of the people that would like this 
 *	as their default behaviour.
 *
 *  Netsuite Record Type:  Event
 *  Netsuite fields used:  endtime, starttime
 */	
function validateEventDuration(type) {	

	// Only execute if this was triggered from the UI and it's a create event
	var currentContext = nlapiGetContext(); 
	var executionContext = currentContext.getExecutionContext();
	if (executionContext == 'userinterface' && type == 'create') {
		//  List of employee ID's who would like their default event duration to be 30 min.
		//	[Ted Lee = 3, Robert Gama = 105, Robert Gama (Test Account) = 1392, Adam Harte-Maxwell = 6, John Brown = 26, John Carlan = 27]
		var userID = nlapiGetUser();
		var numAttendees = nlapiGetLineItemCount('attendee');
		//alert('numAttendees= ' + numAttendees);
		if ((userID == 3 || userID == 105 || userID == 1392 || userID == 6 || userID == 26 || userID == 27 || userID==1916800) && (numAttendees == 1)) {
			var startTime = nlapiGetFieldValue('starttime');
			//startTime = '11:45 am';  // for testing different time scenarios
			var endTime = nlapiGetFieldValue('endtime');
			var startTimeObject = new Date(toTimeObject(startTime));
			var endTimeObject = new Date(toTimeObject(endTime));
			var duration = endTimeObject.getTime() - startTimeObject.getTime();  // in milliseconds
			duration = duration / (1000*60);
			//alert('duration= ' + duration);
			if (duration == 60) {
				endTime = addTime(startTime, 30);
				nlapiSetFieldValue('endtime', endTime, false, true);
				try {
					var txtBox = document.getElementById('title');
					if (txtBox != null ) {
						txtBox.focus();
					}
				}
				catch(err) {
					return false;
				}
			}
		}
	}		
}

/*  Function Name: addTime
 * 
 *  Desctiption: Adds a number of minutes to an existing time text variable with the format '3:45 pm'
 *  Arguments:  startTime (type=string), addMinutes (type=int)
 *  Returns: new time as string
 */
function addTime(startTime, addMinutes) {

	try {
		// Parse Netsuite 12-hr clock time string into components and make the number values integers
		var startHour = parseInt(startTime.substr(0, startTime.indexOf(':')));
		var startMinutes = parseInt(startTime.substr(startTime.indexOf(':')+1, 2));
		var startAMPM = startTime.substr(startTime.toLowerCase().indexOf('m') - 1, 2);
		var endHours;
		var endMinutes;
		var endAMPM;
	}
	catch(err) {
		var errorAlert= 'The date input into the addTime function was not the correct format.\n\n';
		errorAlert+='Please ensure that the date is formatted as follows ot use this function: 3:45 pm\n\n';
		errorAlert+='Contact your Netsuite addmin to fix script changeDefaultEventDuration30min\n\n';
		alert(errorAlert);
		return false;
	}
		
	try {
		// Change hour to 24-hour clock format
		if (startAMPM.toLowerCase() == 'am' && startHour == 12) {
			//alert('Time is 12:?? am, converting hour to 0');
			startHour = 0;
		}
		else if (startAMPM.toLowerCase() == 'pm' && startHour != 12) {
			//alert('Time is in afternoon, adding 12hrs');
			startHour = startHour + 12;
		}
		
		// Convert the strings to a date object for doing the addition
		var newStartTime = new Date();
		newStartTime.setHours(startHour);
		newStartTime.setMinutes(startMinutes);
		newStartTime.setSeconds(0);
		
		// Create a new data object for the new time to be returned
		var newEndTime = new Date(newStartTime);
		newEndTime.setMinutes(newStartTime.getMinutes() + addMinutes);
		
		//alert('newEndTime.getHours()= ' + newEndTime.getHours());  // For debug
		
		// Convert the new date object back to a 12-hour clock format string
		if (newEndTime.getHours() < 12) {
			endAMPM = 'am';
		} 
		else {
			endAMPM = 'pm';
		}
		if (newEndTime.getHours() == 0) {
			endHours = '12'; 
		}
		else if (newEndTime.getHours() > 12) {
			endHours = '' + (newEndTime.getHours() - 12);
		}
		else {
			endHours = newEndTime.getHours();
		}
		endMinutes = pad(newEndTime.getMinutes());
		var newTime = endHours + ':' + endMinutes + ' ' + endAMPM;
		return newTime;
	}
	catch(err) {
		var errorAlert= 'There was an error converting the date.\n\n';
		errorAlert+='Please contact the Netsuite admin to fix this issue.\n\n';
		alert(errorAlert);
		return false;	
	}
}

/*  Function Name: toTimeObject
 *
 *  Desctiption: Converts a Netsuite time string to a date object.	
 */
function toTimeObject(strNetsuiteTime) {

	var timeHours = parseInt(strNetsuiteTime.substr(0, strNetsuiteTime.indexOf(':')));
	var timeMinutes = parseInt(strNetsuiteTime.substr(strNetsuiteTime.indexOf(':')+1, 2));
	var timeAMPM = strNetsuiteTime.substr(strNetsuiteTime.toLowerCase().indexOf('m') - 1, 2);
	try {
		// Change hour to 24-hour clock format
		if (timeAMPM.toLowerCase() == 'am' && timeHours == 12) {
			//alert('Time is 12:?? am, converting hour to 0');
			timeHours = 0;
		}
		else if (timeAMPM.toLowerCase() == 'pm' && timeHours != 12) {
			//alert('Time is in afternoon, adding 12hrs');
			timeHours = timeHours + 12;
		}
		
		// Convert the strings to a date object for doing the addition
		var newTimeObject = new Date();
		newTimeObject.setHours(timeHours);
		newTimeObject.setMinutes(timeMinutes);
		newTimeObject.setSeconds(0);
		return newTimeObject;
	}
	catch(err) {
		alert('There was an error in the toTimeObject function');
	}
}

/*  Function Name:  toNetsuiteTimeStr
 *
 *  Desctiption: Converts a date object to a Netsuite time in the format 3:45 pm
 */
function toNetsuiteTimeStr(timeObject) {

	var timeHours;
	var timeMinutes;
	var timeAMPM;
	
	var newTimeObject = new Date();
	newTimeObject = timeObject;
	
	if (newTimeObject.getHours() < 12) {
		timeAMPM = 'am';
	} 
	else {
		timeAMPM = 'pm';
	}
	if (newTimeObject.getHours() == 0) {
		timeHours = '12'; 
	}
	else if (newTimeObject.getHours() > 12) {
		timeHours = '' + (newTimeObject.getHours() - 12);
	}
	else {
		timeHours = newTimeObject.getHours();
	}
	timeMinutes = pad(newTimeObject.getMinutes());
	toNetsuiteTimeStr = timeHours + ':' + timeMinutes + ' ' + timeAMPM;
	return toNetsuiteTimeStr;
}

/*  Function Name:  pad
 *
 *  Desctiption: pads a 1-digit number to have a leading zero
 */
function pad(number) {
    var str = '' + number;
    if (str.length < 2) {
        str = '0' + str;
    }
    return str;
}
