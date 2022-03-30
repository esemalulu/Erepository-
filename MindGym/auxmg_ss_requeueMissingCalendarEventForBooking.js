/**
 * Scheduled script to go through results from search (based on customsearch_itappportal_bookingswocalev)
 * And trigger requeuing of Job Calendar Event Scheduled (customscript_job_calendarevent_scheduled) scheduled script.
 * THIS IS a backup solution incase existing dynamic scheduling process in place fails.
 * 	- With SuiteCloud license, this script will not be needed.
 */
function requeueJobsForCalendar() {
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_332_lastprocid');
	
	var bflt = [new nlobjSearchFilter('enddate', null, 'onorafter','today'),
	            new nlobjSearchFilter('id','custrecord_calevent_job', 'isempty',''),
	            new nlobjSearchFilter('entityid','custentity_bo_coach','doesnotcontain',['TBC']),
	            new nlobjSearchFilter('custentity_bo_coach', null, 'noneof',['@NONE@'])];
	
	var bcol = [new nlobjSearchColumn('internalid').setSort(true)];
	
	if (paramLastProcId) {
		bflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	var brs = nlapiSearchRecord('job', null, bflt, bcol);
	
	//loop through each and requeue
	for (var i=0; brs && i < brs.length; i += 1) {
		
		log('debug','processing id', brs[i].getValue('internalid'));
		
		var job = nlapiLoadRecord('job', brs[i].getValue('internalid'));
		//Codebase copied from sweet_job_calendarevent_scheduled.js
		var coachId = job.getFieldValue('custentity_bo_coach');
        log('DEBUG', 'Requeue started for coach', 'coachId=' + coachId);
        
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
            log('debug','About to create Calendar Event for Calendar ID',calendarId);
            try {
            	var event = nlapiCreateRecord('customrecord_calendarevent');
                event.setFieldValue('custrecord_calevent_calendar', calendarId);
                var eventId = SWEET.CalendarEvent.updateByJob(event, job);
                
                log('DEBUG', 'Info', 'Create event (' + eventId + ')');
                log('DEBUG', 'Info', 'Calendar id (' + calendarId + ')');
            } catch (createcalerr) {
            	log('error','Error Recreating calendar', getErrText(createcalerr));
            }
        }
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / brs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((i+1)==1000 || ((i+1) < brs.length && nlapiGetContext().getRemainingUsage() < 300)) {
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', brs[i].getId());
			var rparam = new Object();
			rparam['custscript_332_lastprocid'] = brs[i].getId();;
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
		
	}
	
}