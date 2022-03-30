/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
var isItemChaned = false;
var oldItemValue = '';
function localform_saveRecord() {

  // Update address fields
  sweet_job_lib_updateAddressFields();
  
  // State field is mandatory if country is United States
  if (nlapiGetFieldValue('custentity_bo_eventcountry') == SWEET_COUNTRY_UNITED_STATES) {
    var state = nlapiGetFieldValue('custentity_bo_eventstate');
    if (state == undefined || (String(state).length < 1)) {
      alert('State field is a mandatory field when country is set to United States.');
      return false;
    }
  }
  
  // Time zone field is mandatory when the exact time is known
  if (nlapiGetFieldValue('custentity_bo_eventtime') && !nlapiGetFieldValue('custpage_timezone')) {
    alert('Time zone field is mandatory when the exact time is known.');
    return false;
  }

if(isItemChaned){
transactions  = nlapiGetLineItemCount('custpage_transsublist');

  if ((transactions >= 1) && (nlapiGetFieldValue('entitystatus') == '66')) {
  var answer = confirm("Changing an item will also change the line item of the respective quote. This may reset price and quote amount. Are you sure you want to make this change? Speak to Finance if you are unsure");
      if (!answer){
	  return false;
      }
  }  
   if ((transactions >= 1) && (nlapiGetFieldValue('entitystatus') != '66')) {
  var answer = confirm("Changing an item will also change the line item of the respective sales order. This may reset price and sales order amount. Are you sure you want to make this change? Speak to Finance if you are unsure");
      if (!answer){
	  return false;
      }
  } 
 } 
  
  return true;
}

/**
 * FieldChanged hook
 *
 * @param {String} type
 * @param {String} name
 * @return {Void}
 */
function localform_fieldChanged(type, name) {

if (name == 'custentity_bo_item'){

  if (!isItemChaned)  {
   isItemChaned = true;
  }
if (oldItemValue == nlapiGetFieldValue('custentity_bo_item')){
 isItemChaned = false;
}
}

if(name == 'jobtype')
{
    var jobType= nlapiGetFieldValue('jobtype');

   if(jobType == '14')
   {
        var recId = nlapiGetRecordId();
        if(recId && recId.length > 0)
            nlapiSubmitField('job', nlapiGetRecordId(), [ 'jobtype','entitystatus'], ['14',''], false);
        nlapiSetFieldValue('customform', '82');
    }

    if(jobType == '15')
   {
        var recId = nlapiGetRecordId();
        if(recId && recId.length > 0)
            nlapiSubmitField('job', nlapiGetRecordId(), [ 'jobtype','entitystatus'], ['15',''], false);
        nlapiSetFieldValue('customform', '87');
    }

   if(jobType == '16')
   {
        var recId = nlapiGetRecordId();
        if(recId && recId.length > 0)
           nlapiSubmitField('job', nlapiGetRecordId(), [ 'jobtype','entitystatus'], ['16',''], false);
        nlapiSetFieldValue('customform', '85');
    }
}
  
if(name == 'custentity_booking_status')
{
        nlapiSetFieldValue('entitystatus', nlapiGetFieldValue('custentity_booking_status'));
}
  // Update address text if location field is changed
  if (name == 'custentity_bo_eventlocation')  {
    sweet_job_lib_updateAddressFields();
  }
  
  // Update time zone if country is changed and event is not virtual
  var optVirtualEvent = (nlapiGetFieldValue('custentity_bo_virtualevent') == 'T'); // Virtual event
  if (name == 'custentity_bo_eventcountry' && !optVirtualEvent) {
    var countryId = nlapiGetFieldValue('custentity_bo_eventcountry');
    nlapiRemoveSelectOption('custpage_timezone', null); // Reset time zone list
    var timeZones = getTimeZonesByCountryId(countryId);
    
    if (!timeZones) { // If country has no entry in the time zone table...
      timeZones = getAllTimeZones(timeZoneId); // ...show all entries
    }
    
    var selected = timeZones.length == 1; // If single choice, select this by default
    if (!selected) {
      nlapiInsertSelectOption('custpage_timezone', '', ' - Select time zone - ', true);
    }
    
    var i = 0, n = timeZones.length;
    for (; i < n; i++) {
      nlapiInsertSelectOption('custpage_timezone', timeZones[i].id, timeZones[i].name, selected);
    }
  }
  
  // Reset pack/pre-pack flags if coach is changed
  if (name == 'custentity_bo_coach') {
    var isPackShipped = nlapiGetFieldValue('custentity_bo_ispackshipped') == 'T';
    var isPrePackShipped = nlapiGetFieldValue('custentity_bo_isprepackshipped') == 'T';
    if (nlapiGetFieldValue('custentity_bo_eventtimezone') == '') {
    alert('Please enter a Time Zone, without a Time Zone this booking wont appear in the Coaches Calendar');}
    if (isPrePackShipped || isPackShipped) {
      var answer = confirm("Pack/pre-pack has already been sent.\n\nShould a new pack/pre-pack be sent to the new coach?\n\nPress OK for Yes, or Cancel for No.");
      if (answer){
        nlapiSetFieldValue('custentity_bo_ispackshipped', 'F');
        nlapiSetFieldValue('custentity_bo_packshippingdate', '');
        nlapiSetFieldValue('custentity_bo_isprepackshipped', 'F');
        nlapiSetFieldValue('custentity_bo_prepackshippingdate', '');
      }
    }
  }

// Reset pack/pre-pack flags if Course is changed
  if (name == 'custentity_bo_course') {
    var isPackShipped = nlapiGetFieldValue('custentity_bo_ispackshipped') == 'T';
    var isPrePackShipped = nlapiGetFieldValue('custentity_bo_isprepackshipped') == 'T';
    if (isPrePackShipped || isPackShipped) {
      var answer = confirm("Pack/pre-pack has already been sent.\n\nShould a new pack/pre-pack be sent with the new course materials?\n\nPress OK for Yes, or Cancel for No.");
      if (answer){
        nlapiSetFieldValue('custentity_bo_ispackshipped', 'F');
        nlapiSetFieldValue('custentity_bo_packshippingdate', '');
        nlapiSetFieldValue('custentity_bo_isprepackshipped', 'F');
        nlapiSetFieldValue('custentity_bo_prepackshippingdate', '');
      }
    }
  }
  
  // Display warning if time is outside business hours (9:00 am to 6:00 pm)
  if (name == 'custentity_bo_eventtime') {
    var startDate = nlapiGetFieldValue('enddate');
    var startTime = nlapiGetFieldValue('custentity_bo_eventtime');
    var time = nlapiStringToDate(startDate + ' ' + startTime);
    var firstBusinessHour = nlapiStringToDate(startDate);
    firstBusinessHour.setHours(9);
    firstBusinessHour.setMinutes(0);
    var lastBusinessHour = nlapiStringToDate(startDate);
    lastBusinessHour.setHours(18);
    lastBusinessHour.setMinutes(0);
    
    if (time < firstBusinessHour || time > lastBusinessHour) {
      alert("Warning: Time is outside business hours.");
    }
  }
}

//16/1/2015 - Mapped to bookingUiPageInit function in cblmg_cs_BookingUiClientHelper.js
function localform_pageInit(){

/*
// Added this to fix the 'Pending Brief' status issue with workflows.
  var isBriefEntered = sweet_job_lib_isSet(nlapiGetFieldValue('custentity_bo_coachbrief'));
  if(isBriefEntered){
    nlapiSetFieldValue('custentity_coach_brief_isempty', 'T');
  } else {
    nlapiSetFieldValue('custentity_coach_brief_isempty', 'F');
  }
*/
oldItemValue = nlapiGetFieldValue('custentity_bo_item');

}