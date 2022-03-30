/**
for (var ov=0; arOldval && ov < arOldval.length; ov++) {
				oldval += arOldval[ov];
				if ((ov+1) != arOldval.length) {
					oldval +=',';
				}
			}
*/

/**
 * Author: joe.son@audaxium.com
 * Date: 6/22/2012
 * Record: PNS Campaign Activity Config
 * Record Internal ID: customrecord_pns_camp_act_config
 * Desc:
 * Client level data validation and data consistency script for PNS Campaign Activity Config data entry.
 * This is deployed at record level because validation and check must be applied no mater what form they use
 */

/**
 * Javascript prototype extension to simulate List.contains method
 * @param {Object} arg
 * Usage:
 * arrayObject.contains(value to search in arrayObject)
 */
Array.prototype.contains = function(arg) {
	for (i in this) {
		if (this[i]==arg) return true;
	}
	return false;
};

/**
 * Fires when page completes loading or form is Reset
 * type: create, copy, edit
 */
function pageInit(type) {
	
}

/**
 * Fires when submit is pressed but prior to the form being submitted.
 * Always return true or false depending on values for the form elements are validated
 */
function saveRecord() {
	
	if (nlapiGetFieldText('custrecord_pns_action_trigger') != 'All Changes' && nlapiGetFieldText('custrecord_pns_action_trigger') != 'First Value' && !nlapiGetFieldValue('custrecord_pns_act_on_value')) {
		//when trigger is looking for specific values make sure act on value is set
		alert('You Must provide Act on Value for trigger type of '+nlapiGetFieldText('custrecord_pns_action_trigger'));
		return false;
	}
	
	//type is multi select, make sure to format the data correctly
	if (nlapiGetFieldText('custrecord_pns_fieldtype')=='Multiple Select' && nlapiGetFieldValue('custrecord_pns_act_on_value')) {
		var arVal = nlapiGetFieldValue('custrecord_pns_act_on_value').split(',');
		var formattedVal = '';
		for (var i=0; arVal && i < arVal.length; i++) {
			formattedVal += strTrim(arVal[i]);
			if ((i+1) != arVal.length) {
				formattedVal +=',';
			}
		}
		//auto format and reset the value of Act On Value
		nlapiSetFieldValue('custrecord_pns_act_on_value',formattedVal);
	}
	
	return true;
}

/**
 * Fires whenever a field is changed by the user or system similar to onchange event in JavaScript
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist 
 */
function fieldChanged(type, name, linenum) {

}

/**
 * Fires when a field is ABOUT to be changed by the user or by the system.
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist
 * return true when valid, false when invalid
 */
function validateField(type, name, linenum) {
	
	//when field being changed is "Act On Value" make sure values are correct
	if (name == 'custrecord_pns_act_on_value') {
		var strValue = strTrim(nlapiGetFieldValue(name));
		var strType = strTrim(nlapiGetFieldText('custrecord_pns_fieldtype'));
		var strTrigger = nlapiGetFieldText('custrecord_pns_action_trigger');
		
		if (strTrigger != 'All Changes' && strTrigger != 'First Value') {
			
			switch(strType) {
				case 'Check Box':
					//For Check Box, value MUST be T or F
					var cbAcceptVal = ['T','F'];
					if (!cbAcceptVal.contains(strValue)) {
						alert('Value must be T or F for Check Box field type');
						return false;
					}
					break;
				case 'Date':
					//For Date field, value MUST be of type date. 
					if (!isDate(strValue)) {
						return false;
					}
					break;
				default:
					if (strType == 'Decimal Number' || strType == 'Integer Number') {
						if (!validateNumber(strValue, strType)) {
							alert('Value must be a valid '+strType);
							return false;
						}
					}
			}
		}
	}
	
	return true;
}

//Helper function

function validateNumber(_val, _type) {
	if (_type == 'Decimal Number') {
		if (isNaN(parseFloat(_val))) {
			return false;
		} 
		return true;
	}
	
	//check for Integer Number
	if (isNaN(parseInt(_val))) {
		return false;
	}
	return true;
}

/**
 * Remove empty spaces before and after a string.
 * NS may return char type behavior when returning text back.
 * ie) When char field is set to 30 and actual string is 20, value returned may still be 30
 * @param {Object} stringToTrim
 */
function strTrim(stringToTrim) {
	if (!stringToTrim) {
		return '';
	}
	return stringToTrim.replace(/^\s+|\s+$/g,"");	
}

/**
 * DHTML date validation script. Courtesy of SmartWebby.com (http://www.smartwebby.com/dhtml/datevalidation.asp)
 */
// Declaring valid date character, minimum year and maximum year
var dtCh= "/";
var minYear=1900;
var maxYear=2100;

function isDate(dtStr){
	var daysInMonth = DaysArray(12);
	var pos1=dtStr.indexOf(dtCh);
	var pos2=dtStr.indexOf(dtCh,pos1+1);
	var strMonth=dtStr.substring(0,pos1);
	var strDay=dtStr.substring(pos1+1,pos2);
	var strYear=dtStr.substring(pos2+1);
	strYr=strYear;
	if (strDay.charAt(0)=="0" && strDay.length>1) strDay=strDay.substring(1);
	if (strMonth.charAt(0)=="0" && strMonth.length>1) strMonth=strMonth.substring(1);
	for (var i = 1; i <= 3; i++) {
		if (strYr.charAt(0)=="0" && strYr.length>1) strYr=strYr.substring(1);
	}
	month=parseInt(strMonth);
	day=parseInt(strDay);
	year=parseInt(strYr);
	if (pos1==-1 || pos2==-1){
		alert("The date format should be : mm/dd/yyyy");
		return false;
	}
	if (strMonth.length<1 || month<1 || month>12){
		alert("Please enter a valid month");
		return false;
	}
	if (strDay.length<1 || day<1 || day>31 || (month==2 && day>daysInFebruary(year)) || day > daysInMonth[month]){
		alert("Please enter a valid day");
		return false;
	}
	if (strYear.length != 4 || year==0 || year<minYear || year>maxYear){
		alert("Please enter a valid 4 digit year between "+minYear+" and "+maxYear);
		return false;
	}
	if (dtStr.indexOf(dtCh,pos2+1)!=-1 || isInteger(stripCharsInBag(dtStr, dtCh))==false){
		alert("Please enter a valid date");
		return false;
	}
	return true;
}


function isInteger(s){
	var i;
    for (i = 0; i < s.length; i++){   
        // Check that current character is number.
        var c = s.charAt(i);
        if (((c < "0") || (c > "9"))) return false;
    }
    // All characters are numbers.
    return true;
}

function stripCharsInBag(s, bag){
	var i;
    var returnString = "";
    // Search through string's characters one by one.
    // If character is not in bag, append to returnString.
    for (i = 0; i < s.length; i++){   
        var c = s.charAt(i);
        if (bag.indexOf(c) == -1) returnString += c;
    }
    return returnString;
}

function daysInFebruary (year){
	// February has 29 days in any year evenly divisible by four,
    // EXCEPT for centurial years which are not also divisible by 400.
    return (((year % 4 == 0) && ( (!(year % 100 == 0)) || (year % 400 == 0))) ? 29 : 28 );
}

function DaysArray(n) {
	for (var i = 1; i <= n; i++) {
		this[i] = 31;
		if (i==4 || i==6 || i==9 || i==11) {
			this[i] = 30;
		}
		if (i==2) {
			this[i] = 29;
		}
   } 
   return this;
}

