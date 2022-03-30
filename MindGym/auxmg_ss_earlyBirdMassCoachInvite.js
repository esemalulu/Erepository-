/**
 * Module Description
 * Scheduled script that is UNscheduled. Takes several parameters to process 
 * mass invitation of single coach to multiple bookings.
 * This script is designed to support Parent booking record with children 
 * being processed for coach invitation.
 * 
 * However, this can be used to manually kick off single coach invite to comma separated list
 * of booking records.
 * 
 * This script replicates what auxmg_sl_cs_V2coachAvailabilityChecker.js does
 * but for multiple booking records.
 * 
 * Script NOT designed to rescheduled since the Suitelet will ONLY pass in 5 coach invites at a time
 * Version    Date            Author           Remarks
 * 1.00       28 Mar 2016     json
 *
 */

/**
 */
                        
function massInviteCoachForBookings()
{
	var paramToProcText = nlapiGetContext().getSetting('SCRIPT','custscript_507_proctext'),
		paramUser = nlapiGetContext().getSetting('SCRIPT', 'custscript_507_user'),
		paramParentBookingId = nlapiGetContext().getSetting('SCRIPT','custscript_507_parentbooking'),
		//Child IDs are comma separated list of Internal IDs.  
		//	It is assumed that we will only see max 100 child booking records per parent
		paramChildBookingIds = nlapiGetContext().getSetting('SCRIPT','custscript_507_childids'),
		paramApperyId = nlapiGetContext().getSetting('SCRIPT','custscript_507_apperyid'),
		procList = [],
		childList = [],
		capperyJson = {},
		procLog = '';
	
	log('debug','paramToProcText',paramToProcText);
	
	if (!paramToProcText || !paramUser || !paramParentBookingId || 
		!paramChildBookingIds || !paramApperyId) {
		throw nlapiCreateError(
			'ERR_INVITE_PARENTCHILD_COACH', 
			'Unable to process due to missing information. All Parameters are required', 
			false
		);
	}
	
	//Split the process list by comma
	procList = paramToProcText.split(',');

	//Split up child booking by comma
	childList = paramChildBookingIds.split(',');

	if (childList.length > 0)
	{
		//Search out all child booking records appery ids
		var bflt = [new nlobjSearchFilter('internalid',null, 'anyof', childList)],
			bcol = [new nlobjSearchColumn('internalid'),
			        new nlobjSearchColumn('custentitycustentity_ext_apperyid')],
			brs = nlapiSearchRecord('job', null, bflt, bcol);
		
		for (var b=0; brs && b < brs.length; b+=1)
		{
			capperyJson[brs[b].getValue('internalid')] = brs[b].getValue('custentitycustentity_ext_apperyid');
		}
	}
	 
	log('debug','capperyJson', JSON.stringify(capperyJson));
	
	
	//Loop through each TO process Coach 
	for (var c=0; c < procList.length; c+=1)
	{
		//Value of coach || is separator; coachid||groupid||userid||action (add or delete)||invitedID
		var coachValues = procList[c].split('||');
		var icoachId = coachValues[0],
			igroupId = coachValues[1],
			iuserId = coachValues[2],
			iaction = coachValues[3],
			iinviteId = (coachValues[4]?coachValues[4]:'');
		
		try
		{
			if (!icoachId || !igroupId || !iaction)
			{
				throw nlapiCreateError('INVITATION-ERR', 'Missing Action to take, Coach, Group ID: '+coachValues, true);
			}
			
			if (iaction == 'add')
			{
				if (!iuserId)
				{
					throw nlapiCreateError('INVITATION-ERR', 'Missing User ID: '+coachValues, true);
				}
				
				var ivrec = nlapiCreateRecord('customrecord_bo_coachpool');
				ivrec.setFieldValue('custrecord_bo_coachpool_bookingid', paramParentBookingId);
				ivrec.setFieldValue('custrecord_bo_coachpool_apperyid', paramApperyId);
				ivrec.setFieldValue('custrecord_bo_coachpool_coachid', igroupId);
				ivrec.setFieldValue('custrecord_bo_coachpool_coachname', icoachId);
				ivrec.setFieldValue('custrecord_bo_coachpool_userid', iuserId);
				nlapiSubmitRecord(ivrec, true, true);
				
				//Go through each child and run invitation
				for (var cc=0; childList && cc < childList.length; cc+=1)
				{
					var ivrec = nlapiCreateRecord('customrecord_bo_coachpool');
					ivrec.setFieldValue('custrecord_bo_coachpool_bookingid', childList[cc]);
					ivrec.setFieldValue('custrecord_bo_coachpool_apperyid', (capperyJson[childList[cc]]?capperyJson[childList[cc]]:'') );
					ivrec.setFieldValue('custrecord_bo_coachpool_coachid', igroupId);
					ivrec.setFieldValue('custrecord_bo_coachpool_coachname', icoachId);
					ivrec.setFieldValue('custrecord_bo_coachpool_userid', iuserId);
					nlapiSubmitRecord(ivrec, true, true);
				}
				
				procLog += '<li>'+icoachId+' - Invite Success<br/>Following Booking IDs processed - Parent: '+paramParentBookingId+
						   ' All Bookings: '+paramChildBookingIds+'</li>';
			}
			//Deletion will be handled from each individual booking
			else if (iaction == 'delete' && iinviteId)
			{
				nlapiDeleteRecord('customrecord_bo_coachpool', iinviteId);
				
				procLog += '<li>'+icoachId+' - UNinvite Success<br/>Parent Booking ID '+paramParentBookingId+
				   		   'Uninivted for Coach</li>';
			}
		}
		catch (invprocerr)
		{
			log('error','Error Inviting Coach','Coach Values id/group/user '+coachValues+' // '+getErrText(invprocerr));
			procLog += '<li>'+icoachId+' - Fail<br/>'+getErrText(invprocerr)+'</li>';
		}
		
	}
	
	procLog = '<b>Parent Booking Invitationi Process Log</b>'+
			  '<ul>'+procLog+'</ul>';
		
	//7. Send Notification to triggering user
	nlapiSendEmail(
		-5, 
		paramUser, 
		'Invite Parent Booking Process Log '+nlapiDateToString(new Date()), 
		procLog, 
		null, 
		null, 
		null, 
		null, 
		true
	);
	
}
