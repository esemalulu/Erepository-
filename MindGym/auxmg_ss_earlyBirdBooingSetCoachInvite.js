/**
 * Module Description
 * Scheduled script that is UNscheduled. Takes several parameters to process 
 * mass invitation of selected booking set + training Programme + Coaches to ALL 
 * associated bookings.
 * 
 * This script is triggered from "AUX-SL CoachAvail for BookingSet TProg" Suitelet
 * 
 * Script MUST be able to reschedule due to unknown number of bookings to coach to process
 * 	invitation against. 
 * Version    Date            Author           Remarks
 * 1.00       28 Mar 2016     json
 *
 */

/**
 */
                        
function massInviteCoachForBookingSet()
{
	var paramTpId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb531_tpid'),
		paramTpClientId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb531_tpcid'),
		paramBslist = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb531_bslist'),
		paramCoachlist = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb531_coachlist'),
		paramTriggerUser = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb531_triggeruser'),
		//Stringified version of JSON object to track result of coach processing
		paramProcResult = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb531_procrslt');
	
	log('debug','parameters',paramTpId+' // '+paramBslist+' // '+paramCoachlist+' // '+paramTriggerUser);
	
	//Run validation to make sure ALL 4 parameters are filled in
	if (!paramTpId || !paramBslist || !paramCoachlist || !paramTriggerUser || !paramTpClientId)
	{
		throw nlapiCreateError(
			'BS_MASS_INVITE_ERR', 
			'Missing Required information to process Mass Coach Invitation for booking set', 
			false
		);
	}
	
	//10/6/2016
	var resultJson = {};
	if (paramProcResult)
	{
		resultJson = JSON.parse(paramProcResult);
	}
	
	//Start processing
	var procJson = {
		'tpid':paramTpId,
		'tpcid':paramTpClientId,
		'tptext':'',
		'bslist':paramBslist.split(','),
		'bstext':{},
		'coachlist':paramCoachlist.split(','),
		'origcoachlist':[],
		'user':paramTriggerUser,
		'allbookings':{}
	};
	
	try
	{
		//A. We first build script copy of coachlist passed in.
		//	We loop through each coach and process invitation.
		//	Once a coach is invited, we take that coach off of procJson.coachlist
		//	and Reschedule the script to run through next coach in line
		//	When Reschedule, we pass in modified coachlist (less one just processed)
		//	When ALL coaches are processed in procJson.coachlist, we do NOT reschedule
		//	and send completed notification out to user who triggered it.
		for (var c=0; c < procJson.coachlist.length; c+=1)
		{
			procJson.origcoachlist.push(procJson.coachlist[c]);
		}
		
		//Lets first grab list of ALL Booking Records that I need to run against
		//B. Look for all bookings associated with selected booking set options.
		//	 We need to run createSearch method to grab ALL Booking information 
		//	 related to selected booking sets.
		var bsIdsToMatch = [];
		for (var psb=0; psb < procJson.bslist.length; psb+=1)
		{
			if (procJson.bslist[psb] == '-1')
			{
				bsIdsToMatch.push('@NONE@');
			}
			else
			{
				bsIdsToMatch.push(procJson.bslist[psb]);
			}
		}
		
		//Run Booking search grab ALL Bookings associated with selected booking set selected
		//	This may include those with NO booking set but matching training programme
		var bsbflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		              new nlobjSearchFilter('custentity_ax_bookingset', null, 'anyof', bsIdsToMatch),
		              new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', procJson.tpid),
		              new nlobjSearchFilter('parent', null, 'anyof', procJson.tpcid),
		              //ONLY Pull booking that are Face to Face (11) or Virtual (13)
		              new nlobjSearchFilter('jobtype', null, 'anyof', ['11','13']),
		              new nlobjSearchFilter('status', null, 'noneof', ['37','42','36'])],
		              
			bsbcol = [new nlobjSearchColumn('internalid'),
			          new nlobjSearchColumn('custentitycustentity_ext_apperyid'), //Appery ID
			          new nlobjSearchColumn('custentity_ax_bookingset'), //Booking set on booking
			          new nlobjSearchColumn('custentity_bo_trainingprogramme')]; //Training Program
		
		//Sandbox Testing Method.
		//For production, include entitystatus filter as well as change the date to current date
		var curDate = new Date();
		if (nlapiGetContext().getEnvironment() == 'SANDBOX')
		{
			curDate = new Date('1/1/2016');
		}
		
		//Add in Enviornment specific Date
		bsbflt.push(new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(curDate)));
		
		//ASSUMPTION: No more than 1000 booking records will be returned.
		//			  Criteria limits it down handful of booking records.
		var	bsbrs = nlapiSearchRecord('job', null,bsbflt, bsbcol);
		
		if (!bsbrs)
		{
			throw nlapiCreateError('NO_BOOKING_FOR_BS', 'No Bookings were found for selected booking set(s)', true);
		}
		
		//Loop through ALL Bookings and add to procJson.allbookings
		for (var b=0; bsbrs && b < bsbrs.length; b+=1)
		{
			procJson.tptext = bsbrs[b].getText('custentity_bo_trainingprogramme');
			
			var bsId = bsbrs[b].getValue('custentity_ax_bookingset'),
				bsText = bsbrs[b].getText('custentity_ax_bookingset');
			if (!bsId)
			{
				bsId = '-1';
				bsText = 'No Booking Set';
			}
			
			procJson.bstext[bsId] = bsText;
			
			//appery id is coming from Booking record being added
			procJson.allbookings[bsbrs[b].getValue('internalid')] = {
				'apperyid':bsbrs[b].getValue('custentitycustentity_ext_apperyid'),
				'bookingset':(bsbrs[b].getValue('custentity_ax_bookingset')?bsbrs[b].getValue('custentity_ax_bookingset'):'')
			};
		}
		
		//C. CORE PROCESS.
		var isRescheduled = false;
		
		//log('debug','Before Processing Coach List', nlapiGetContext().getRemainingUsage()+' // '+procJson.origcoachlist.toString());
		
		for (var ci=0; ci < procJson.origcoachlist.length; ci+=1)
		{
			//Load the coach record to grab Portal ID (user id), and group id
			var coachRec = nlapiLoadRecord('vendor', procJson.origcoachlist[ci]);
						
			//We look at Coach Pool (Invitation) and grab list of booking sets THIS Coach was invited to 
			//	The booking Set and/or Training Program
			//	When booking set coach invitations are process, it will add to coach pool record the booking set (if available) and training programme
			var invcJson = {},
				invcflt = [new nlobjSearchFilter('custrecord_bo_coachpool_coachname', null, 'anyof', procJson.origcoachlist[ci]),
				           new nlobjSearchFilter('custrecord_bo_coachpool_tp', null, 'anyof', procJson.tpid),
				           new nlobjSearchFilter('custrecord_bo_coachpool_bookset', null, 'anyof', bsIdsToMatch)],
				invccol = [new nlobjSearchColumn('custrecord_bo_coachpool_coachname'),
				           new nlobjSearchColumn('custrecord_bo_coachpool_bookset'),
				           new nlobjSearchColumn('custrecord_bo_coachpool_bookingid')],
				invcrs = nlapiSearchRecord('customrecord_bo_coachpool', null, invcflt, invccol);
			
			for (var ic=0; invcrs && ic < invcrs.length; ic+=1)
			{
				var invkey = invcrs[ic].getValue('custrecord_bo_coachpool_bookset'),
					invBookingID = invcrs[ic].getValue('custrecord_bo_coachpool_bookingid');
				if (!invkey)
				{
					invkey = '-1';
				}
				
				//Build the JSON by BookingSet-TPID-BookingID
				invcJson[invkey+'-'+procJson.tpid+'-'+invBookingID] = 'booking invited'; 
			}
			
			//log('audit','invcJson', JSON.stringify(invcJson));
			
			//We loop through ALL Bookings and add to Coach Pool.
			//	For Booking Set process, we also add booking set and training programme value on the pool record
			var hasSkippedBooking = false,
				invitedToBooking = false;
			for (var bk in procJson.allbookings)
			{
				//We check to see if THIS bookingset key is already processed
				var lookupKey = procJson.allbookings[bk].bookingset+'-'+procJson.tpid+'-'+bk;
				if (!procJson.allbookings[bk].bookingset)
				{
					lookupKey = '-1-'+procJson.tpid+'-'+bk;
				}
				
				//log('debug', 'lookupKey', lookupKey);
				
				if (invcJson[lookupKey])
				{
					log('debug','Bookingset/tpid key already processed', lookupKey+' for coach id '+procJson.origcoachlist[ci]+' already processed');
					
					hasSkippedBooking = true;
					
					continue;
				}
				
				var cprec = nlapiCreateRecord('customrecord_bo_coachpool');
				cprec.setFieldValue('custrecord_bo_coachpool_bookingid', bk);
				cprec.setFieldValue('custrecord_bo_coachpool_userid', coachRec.getFieldValue('custentity_user'));
				cprec.setFieldValue('custrecord_bo_coachpool_coachid', coachRec.getFieldValue('custentity_coach_groupingname'));
				cprec.setFieldValue('custrecord_bo_coachpool_coachname', procJson.origcoachlist[ci]);
				cprec.setFieldValue('custrecord_bo_coachpool_apperyid', procJson.allbookings[bk].apperyid);
				cprec.setFieldValue('custrecord_bo_coachpool_bookset', procJson.allbookings[bk].bookingset);
				cprec.setFieldValue('custrecord_bo_coachpool_tp', procJson.tpid);
				var cprecid = nlapiSubmitRecord(cprec, true, true);
				
				invitedToBooking = true;
				
				log('debug','cprecid', cprecid);
			}
			
			//At this point, we check to see what the result was for THIS Coach
			if (hasSkippedBooking && !invitedToBooking)
			{
				//This means NO Invitation was sent because out of ALL bookings, all matched with
				//	selected booking sets as existing 
				resultJson[procJson.origcoachlist[ci]] = 'Already Invited to BookingSet/Training Programme selections';
			}
			else
			{
				//This means one or more invitations was processed. 
				resultJson[procJson.origcoachlist[ci]] = 'Invited to BookingSet/Training Programme selections';
			}
				
			//Once done processing, you take out coach id from 
			//	procJson.coachlist
			//Find the index in the coachlist first and remove it.
			//	This is because each time it removes, the index will change
			var removeIndex = procJson.coachlist.indexOf(procJson.origcoachlist[ci]);
			procJson.coachlist.splice(removeIndex, 1);
			
			log('audit','After processing '+procJson.origcoachlist[ci], nlapiGetContext().getRemainingUsage()+' // resultJson: '+JSON.stringify(resultJson));
			//Check for Gov. If it is less than 4500 reschedule 9930 // 9070
			if (procJson.coachlist.length > 0 && nlapiGetContext().getRemainingUsage() <= 4500)
			{
				var rparam = {
					'custscript_sb531_tpid':procJson.tpid,
					'custscript_sb531_tpcid':procJson.tpcid,
					'custscript_sb531_triggeruser':procJson.user,
					'custscript_sb531_bslist':procJson.bslist.toString(),
					'custscript_sb531_coachlist':procJson.coachlist.toString(),
					'custscript_sb531_procrslt':JSON.stringify(resultJson)
				};
				
				nlapiScheduleScript(
					nlapiGetContext().getScriptId(), 
					nlapiGetContext().getDeploymentId(), 
					rparam
				 );
				
				isRescheduled = true;
				
				log('audit','Script Rescheduled','Remaining Coach List: '+procJson.coachlist.toString());
				
				break;
			}
		}
		
		if (!isRescheduled)
		{
			/**
			need to loop through resultJSON and build invitation result
			
			Also need to grab names of booking set if -1, mark it as none
			
			Also need to grab training programme name
			
			Need to correct already processed data. this needs to go against all bookings as well
			*/
			
			var coachIds = [],
				coachNameJson = {};
			for (var r in resultJson)
			{
				coachIds.push(r);
			}
			
			//Search for vendor matching the IDs and grab entityid
			var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', coachIds)],
				ccol = [new nlobjSearchColumn('internalid'),
				        new nlobjSearchColumn('entityid')],
				crs = nlapiSearchRecord('vendor', null, cflt, ccol);
			
			for (var c=0; c < crs.length; c+=1)
			{
				coachNameJson[crs[c].getValue('internalid')] = crs[c].getValue('entityid');
			}
			
			
			//Send Email Notification
			var compsbj = 'REVIEW REQUIRED: EarlyBird Coach Booking Set Invitation for Programme '+procJson.tpctext,
				compmsg = 'Successfully processed ALL EarlyBird Invitations for the following Booking Sets and Coaches<br/>'+
						  '<br/>'+
						  'Programme: '+procJson.tptext+' ('+procJson.tpid+')<br/>';
			
			//Loop through and build Booking Set Text value
			var bookSetTextVal = '';
			for (var bsl=0; bsl < procJson.bslist.length; bsl+=1)
			{
				bookSetTextVal += '<li>'+procJson.bstext[procJson.bslist[bsl]]+' ('+procJson.bslist[bsl]+')</li>';

			}
			
			compmsg = compmsg + 
					  'Booking Sets:<ul>'+bookSetTextVal+'</ul>';
			
			//Loop through resultJson and add to each coaches invitation status
			var coachInvStatus = '';
			for (var r in resultJson)
			{
				coachInvStatus += '<li>'+coachNameJson[r]+' ('+r+'): '+resultJson[r]+'</li>';
			}
			
			//Add to compmsg
			
			compmsg = compmsg +
					  'Coach Invitation Status:<ul>'+coachInvStatus+'</ul>';
			
			//Add in contact
			compmsg += '<br/><br/>'+
					   'If you have any queries please contact the helpdesk@themindgym.com';
			
			var recordObj = {
				'record':paramTpId,
				'recordtype':'customrecord_trainingprogramme'
			};
			
			nlapiSendEmail(
				-5, 
				paramTriggerUser, 
				compsbj, 
				compmsg,
				null,
				null,
				recordObj,
				null,
				true
			);
		}
	}
	catch(bsierr)
	{
		log('error','Error Prcoessing', getErrText(bsierr));
		
		//Generate Email
		var sbj = 'Error Occured while Processing Booking Set Invitations',
			msg = 'Following Error occured:<br/>'+
				  getErrText(bsierr)+
				  '<br/><br/>Process JSON Object:<br/>'+
				  JSON.stringify(procJson);
	
		var recordObj = {
			'record':paramTpId,
			'recordtype':'customrecord_trainingprogramme'
		};
		
		nlapiSendEmail(
			-5, 
			paramTriggerUser, 
			sbj, 
			msg,
			null,
			null,
			recordObj,
			null,
			true
		);
	}
}
