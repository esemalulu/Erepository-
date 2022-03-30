/**
* Update/Create/Delete calendar events associated with job
*
* @param {String} type  User event type
* @param {String} job  Job id
*
* @require sweet_calendar.js
* @require sweet_time.js
*/

/**
* SweetScriptScheduled Class
*
*/
var SweetScriptScheduled = function() {

    /**
    * Class attributes
    */
    this.type = null;
    this.jobId = null;
    this.job = null;

    /**
    * Run script
    *
    * @return {Void}
    */
    this.run = function() {
        var context = nlapiGetContext();

        try {
        	// Get script parameters
            this.type = context.getSetting('SCRIPT', 'custscript_type');
            if (!this.type) {
                nlapiCreateError('SWEET_INVALID_ARGUMENT', 'type parameter is required');
            }
            this.jobId = context.getSetting('SCRIPT', 'custscript_job');
            if (!this.jobId) {
                nlapiCreateError('SWEET_INVALID_ARGUMENT', 'jobId parameter is required');
            }

            nlapiLogExecution('DEBUG', 'Params', 'type=' + this.type + ', id=' + this.jobId);

            // Load job record
            if (this.type != 'delete') {
                this.job = nlapiLoadRecord('job', this.jobId);
            }

            // Handle event type
            switch (this.type) {
                case 'create':
                    this._createCalendarEvents();
                    break;
                case 'edit':
                    this._updateCalendarEvents();
                    break;
                case 'xedit':
                	//6/29/2014 - Inline Edit Added
                    //	When Booking record is inline edited, it will ONLY queue up this script if updated field is one of following fields:
                        /**
                        'enddate', // Date
                        'custentity_bo_course', // Course
                        'custentity_bo_eventtime', // Exact Time
                        'custentity_bo_eventtimezone', // Event Time Zone (Hidden on the form)
                        'entityid' // Booking No.
                        */
                	
                    this._updateCalendarEvents();
                    break;
                case 'delete':
                    this._deleteCalendarEvents();
                    break;
            }
        } catch (runerr) {
        	nlapiLogExecution('debug', 'ERROR Job Calendar', getErrText(runerr));
        	
        	//11/2/2015
        	//Create a error log
        	var errrec  = nlapiCreateRecord('customrecord_ax_jobcalendarqueueerr', null);
        	errrec.setFieldValue('custrecord_jcqe_job', context.getSetting('SCRIPT', 'custscript_job'));
        	errrec.setFieldValue('custrecord_jcqe_type', context.getSetting('SCRIPT', 'custscript_type'));
        	errrec.setFieldValue('custrecord_jcqe_oerr', getErrText(runerr));
        	nlapiSubmitRecord(errrec, true, true);
        }
        
    };

    /**
    * Create and associate new calendar event(s) with this job record
    *
    * @return {Void}
    */
    this._createCalendarEvents = function() {
        var coachId = this.job.getFieldValue('custentity_bo_coach');
        nlapiLogExecution('DEBUG', 'Info', '_createCalendarEvents');
        nlapiLogExecution('DEBUG', 'Info', 'coachId=' + coachId);
        var calName = 'Bookings';
        if (coachId) { // Create event
            var calendar = SWEET.Calendar.findByCoachIdAndName(coachId, calName);
          //CBL Modificationo 6/26/2014
            //var calendarId declaration outside if/else block.
            var calendarId = '';
            if (calendar) {
                calendarId = calendar.getId();
            } else {
                calendarId = SWEET.Calendar.createByCoachIdAndName(coachId, calName);
            }
            
            try {
            	var event = nlapiCreateRecord('customrecord_calendarevent');
                event.setFieldValue('custrecord_calevent_calendar', calendarId);
                var eventId = SWEET.CalendarEvent.updateByJob(event, this.job);
                nlapiLogExecution('DEBUG', 'Info', 'Create event (' + eventId + ')');
                nlapiLogExecution('DEBUG', 'Info', 'Calendar id (' + calendarId + ')');
            } catch (createcalerr) {
            	//notify joe.son@codeboxllc of error.
            	var sbj = 'Error Creating Event for '+this.job.getFieldValue('entityid')+' ('+this.jobId+')';
            	var msg = 'Calendar ID: '+calendarId+'<br/>'+
            			  'Error Details:<br/>'+
            			  getErrText(createcalerr);
            	nlapiSendEmail(-5, 'mindgym@audaxium.com', sbj, msg, null, null, null, null);
            }
            
        }
    }

    /**
    * Update calendar events associated with this job record
    *
    * @return {Void}
    */
    this._updateCalendarEvents = function() {
        var coachId = this.job.getFieldValue('custentity_bo_coach');
        nlapiLogExecution('DEBUG', 'Info', '_updateCalendarEvents: JobID of '+this.jobId);
        nlapiLogExecution('DEBUG', 'Info', 'coachId=' + coachId);

        // Get calendar events associated with this job
        var columns = new Array();
        columns.push(new nlobjSearchColumn('custrecord_calevent_calendar'));
        columns.push(new nlobjSearchColumn('custrecord_cal_coach', 'custrecord_calevent_calendar'));
        var filters = new Array();
        //6/29/2014
        //Mod: CodeBox JSON
        //filter operator was using is, changed to anyof.
        //	- For any filter against select fields, you MUST use anyof
        filters.push(new nlobjSearchFilter('custrecord_calevent_job', null, 'anyof', this.jobId));
        var events = nlapiSearchRecord('customrecord_calendarevent', null, filters, columns);

        if (events) {
            var i = 0, n = events.length;
            for (; i < n; i++) {
                var eventId = events[i].getId();

                if (coachId) { // Update event
                    var event = nlapiLoadRecord('customrecord_calendarevent', eventId);
                    var calCoachId = events[i].getValue('custrecord_cal_coach', 'custrecord_calevent_calendar');
                    var calName = 'Bookings';

                    if (coachId != calCoachId) { // Change calendar
                        var calendar = SWEET.Calendar.findByCoachIdAndName(coachId, calName);
                        //CBL Modificationo 6/26/2014
                        //var calendarId declaration outside if/else block.
                        var calendarId = '';
                        if (calendar) {
                            calendarId = calendar.getId();
                        } else {
                            calendarId = SWEET.Calendar.createByCoachIdAndName(coachId, calName);
                            nlapiLogExecution('DEBUG', 'Info', 'Create calendar (' + calendarId + ')');
                        }
                        event.setFieldValue('custrecord_calevent_calendar', calendarId);
                    }
                    nlapiLogExecution('DEBUG', 'Info', 'Update event (' + eventId + ')');
                    SWEET.CalendarEvent.updateByJob(event, this.job);
                } else { // Delete event
                    nlapiLogExecution('DEBUG', 'Info', 'Delete event (' + eventId + ')');
                    nlapiDeleteRecord(events[i].getRecordType(), eventId); // Delete the event
                }
            }
        } else {
            this._createCalendarEvents();
        }
    }

    /**
    * Delete calendar events that are not associated with a job record
    *
    * Note: Because this script is triggered after the job record has been deleted
    * we can't search on the job id because the job field on the calendar event
    * record has been set to null.
    *
    * @return {Void}
    */
    this._deleteCalendarEvents = function() {
        nlapiLogExecution('DEBUG', 'Info', '_deleteCalendarEvents');

        // Find all events that are not associated with a job
        var filters = new Array();
        filters.push(new nlobjSearchFilter('custrecord_calevent_job', null, 'anyof', '@NONE@'));
        var events = nlapiSearchRecord('customrecord_calendarevent', null, filters, null);

        if (events) {
            var i = 0, n = events.length;
            for (; i < n; i++) {
                var eventId = events[i].getId();
                nlapiLogExecution('DEBUG', 'Info', 'Delete event (' + eventId + ')');
                nlapiDeleteRecord(events[i].getRecordType(), eventId);
            }
        }
    }
}

/**
 * Translates Error into standarized text.
 * @param {Object} _e
 */
function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}
	
	txt = strGlobalReplace(txt, "\r", " || ");
	txt = strGlobalReplace(txt,"\n", " || ");
	
	return txt;
}

/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}

/**
* Main
*
* @return {Void}
*/
function sweet_scheduled() {
    var script = new SweetScriptScheduled();
    script.run();
}
