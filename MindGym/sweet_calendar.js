/**
* Calendar library
*
* @require  sweet_time.js
*/

var SWEET = SWEET || {};
SWEET.Calendar = SWEET.Calendar || {};
SWEET.CalendarEvent = SWEET.CalendarEvent || {};

/**
* Update a calendar event based on a job
*
* @param {Object} event
* @param {Object} job
* @return {String}
*/
SWEET.CalendarEvent.updateByJob = function(event, job) {

    if (!event) {
        nlapiCreateError('SWEET_INVALID_ARGUMENT', 'Event parameter is required');
    }

    if (!job) {
        nlapiCreateError('SWEET_INVALID_ARGUMENT', 'Job parameter is required');
    }

    // @todo Coach

    // Title
    var title = 'N/A';
    var courseId = job.getFieldValue('custentity_bo_course');
    if (courseId) {
        var course = nlapiLoadRecord('customrecord_course', courseId);
        title = course.getFieldValue('name');
    }

    // Start date
    var startDate = job.getFieldValue('enddate');
    if (!startDate) {
    	nlapiLogExecution('error','SWEET_STARTDATE_REQD', 'Start date is missing. Please update job record and try again.');
    	return '';
    }

    // Time zone (start & end)
    var endDate = '', endTime = '';
    var startTimeZone = job.getFieldValue('custentity_bo_eventtimezone');
    if (!startTimeZone) {
        nlapiLogExecution('error','SWEET_TIMEZONE_REQD', 'Time zone is missing. Please update job record and try again.');
        return '';
    }

    // Start time & end date
    var startTime = job.getFieldValue('custentity_bo_eventtime');
    var sample = job.getFieldValue('datecreated');
    if (startTime) {
        // Calculate end time (start time + 90 mins)
        var t1 = nlapiStringToDate(startDate + ' ' + startTime);
        var duration = 90 * 60 * 1000; // 90 minutes in milliseconds
        var t2 = new Date();
        t2.setTime(t1.getTime() + duration);
        endDate = nlapiDateToString(t2);
        endTime = SWEET.Time.convertDateToTimeString(t2, sample);
    } else {
        // Assume full day
        var t1 = nlapiStringToDate(startDate);
        t1.setHours(0);
        t1.setMinutes(0);
        startTime = SWEET.Time.convertDateToTimeString(t1, sample);
        t1.setHours(23);
        t1.setMinutes(59);
        endTime = SWEET.Time.convertDateToTimeString(t1, sample);
        endDate = startDate;
        event.setFieldValue('custrecord_calevent_isfullday', 'T');
    }

    event.setFieldValue('custrecord_calevent_title', title);
    event.setFieldValue('custrecord_calevent_startdate', startDate);
    event.setFieldValue('custrecord_calevent_starttime', startTime);
    event.setFieldValue('custrecord_calevent_starttimezone', startTimeZone);
    event.setFieldValue('custrecord_calevent_enddate', endDate);
    event.setFieldValue('custrecord_calevent_endtime', endTime);
    event.setFieldValue('custrecord_calevent_endtimezone', startTimeZone);
    event.setFieldValue('custrecord_calevent_job', job.getId());
    
    return nlapiSubmitRecord(event);
};

/**
* Find calendar by coach id and name
*
* @param {String} coachId
* @param {String} name
* @return {String}
*/
SWEET.Calendar.findByCoachIdAndName = function(coachId, name) {
    if (!coachId) {
        nlapiCreateError('SWEET_INVALID_ARGUMENT', 'coachId parameter is required');
    }
    if (!name) {
        nlapiCreateError('SWEET_INVALID_ARGUMENT', 'name parameter is required');
    }
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_cal_coach', null, 'is', coachId));
    filters.push(new nlobjSearchFilter('custrecord_cal_name', null, 'is', name));
    var calendars = nlapiSearchRecord('customrecord_calendar', null, filters, null);
    if (calendars) {
        return calendars[0];
    }
}

/**
* Create calendar by coach id and name
*
* @param {String} coachId
* @param {String} name
* @return {String}
*/
SWEET.Calendar.createByCoachIdAndName = function(coachId, name) {
    if (!coachId) {
        nlapiCreateError('SWEET_INVALID_ARGUMENT', 'coachId parameter is required');
    }
    if (!name) {
        nlapiCreateError('SWEET_INVALID_ARGUMENT', 'name parameter is required');
    }
    var calendar = nlapiCreateRecord('customrecord_calendar');
    calendar.setFieldValue('custrecord_cal_coach', coachId);
    calendar.setFieldValue('custrecord_cal_name', name);
    return nlapiSubmitRecord(calendar);
}
