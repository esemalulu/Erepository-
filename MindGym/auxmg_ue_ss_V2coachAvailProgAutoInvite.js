/**
 * Script file containing functions for Early Bird programme customization.
 * These are geared towards view from Training Programme record page.
 * Phase 1 Developments:
 * 1. When Training Programme is saved and has values for Selected Coaches:
 * 		- All Coaches listed on this record will automatically be invited to 
 * 		  Booking records that matches criteria:
 * 			- Booking does NOT have coach set
 * 			- Coach is NOT invited to related booking.
 * 			- Native/Fluent language matches
 * 			- Subsidiary matches
 * 			- Country matches
 * 			- Booking date is on or after current date
 * 		- Auto invitation will be handled by undeployed scheduled script with MUTIPLE Deployments
 * 			- User event will queue it up for processing.
 * 
 * 2. V2coachAvailabilityChecker will be cloned to be used as display under each programme.
 * 		- This will show booking as Y (Rows) and each selected coaches as X (Columns).
 * 			- Value will simply be invited with potential mouse over functionality.
 * 			
 * 3. Existing V2coachAvailabilityChecker will be modified
 * 		- When booking belongs to a training programme, show list of selected coaches ONLY.

 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Oct 2015     json
 *
 */

function trainProgBeforeLoad(type, form, request) 
{
	//custentity_bo_coachavailhtml
	if (type=='view' || type=='edit' || type=='copy')
	{
		var slUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_aux_sl_catoolv2progview', 
			'customdeploy_aux_sl_coachavailtoolv2', 
			'VIEW'
		);
		
		//1300 width is MAX due to resolution
		var inlineHtml = '<iframe src="'+
			slUrl+
			'&ifrmcntnr=T'+
			'&isiframe=T'+
			'&custpage_progid='+nlapiGetRecordId()+
			'" width="1300" height="500" name="TrainProgInviteStatus" seamless="seamless"></iframe>';
		nlapiSetFieldValue('custrecord_trainproginvstatusivew',inlineHtml);	
		
		//9/25/2016
		//Add inlinehtml to display Booking Set Coach Invitation HTML
		var bsUrl = nlapiResolveURL(
			'SUITELET',
			'customscript_aux_sl_coachavailbstp',
			'customdeploy_aux_sl_coachavailbstp',
			'VIEW'
		);
		
		var bsInlineHtml = '<iframe src="'+
			bsUrl+
			'&ifrmcntnr=T'+
			'&isiframe=T'+
			'&custpage_progid='+nlapiGetRecordId()+
			'&custpage_progcliid='+nlapiGetFieldValue('custrecord_tp_clientaccount')+
			'" width="1300" height="500" name="BookingSetCoachInvite" seamless="seamless"></iframe>';
		nlapiSetFieldValue('custrecord_booksetcoachinvitevew',bsInlineHtml);	
	}
}

/**
 * User event script will trigger for NONE delete and ONLY for changes in 
 * SELECTED COACHES (custrecord_tp_selectedcoaches) field.
 * Assumes that IF no value is provided for selected coach, it will NOT queue up the process
 */
function trainProgAfterSubmit(type){

	
	/**************** Auto invitation process *************/
	if (type == 'delete' || type == 'xedit')
	{
		return;
	}
	
	var queueUpAutoInvite = false;
	
	if (nlapiGetFieldValues('custrecord_tp_selectedcoaches'))
	{
		//We need to see Selected coach field has changed
		if (type == 'create')
		{
			queueUpAutoInvite = true;
		}
		else
		{
			var oldRec = nlapiGetOldRecord(),
				newRec = nlapiGetNewRecord(),
				oldNsVal = oldRec.getFieldValues('custrecord_tp_selectedcoaches'),
				newNsVal = newRec.getFieldValues('custrecord_tp_selectedcoaches'),
				oldValues = [],
				newValues = [];
			
			//Loop through and build up both. This is due to NS returning Object
			for (var oi=0; oldNsVal && oi < oldNsVal.length; oi+=1)
			{
				oldValues.push(oldNsVal[oi]);
			}
			
			for (var ni=0; newNsVal && ni < newNsVal.length; ni+=1)
			{
				newValues.push(newNsVal[ni]);
			}
			log('debug','old value',oldValues);
			log('debug','new value',newValues);
			
			if (!compareArray(oldValues, newValues))
			{
				queueUpAutoInvite = true;
			}
		}
		
		if (queueUpAutoInvite)
		{
			var paramJson = {
				'custscript_420_tpid':nlapiGetRecordId(),
				'custscript_420_triguserid':nlapiGetContext().getUser()
			};
			
			var queueStatus = nlapiScheduleScript('customscript_aux_ss_autoinvitetpcoaches', null, paramJson);
			
			log('audit','queue up auto invite','queue up scheduled script: Status='+queueStatus+' // Parameter: '+JSON.stringify(paramJson));
		}
	}
}

/**
 * Schedued script that is triggered by the User Event on after submit
 * on Training Programme record.
 */
function trainProgAutoInvite()
{
	var paramJson = {
		'progid':nlapiGetContext().getSetting('SCRIPT', 'custscript_420_tpid'),
		'triguser':nlapiGetContext().getSetting('SCRIPT','custscript_420_triguserid'),
		'lastprocid':nlapiGetContext().getSetting('SCRIPT','custscript_420_lastprocid')
	};
	
	try
	{
		//Make sure BOTH parameters are passed in
		if (!paramJson.progid || !paramJson.triguser)
		{
			throw nlapiCreateError(
				'AUTOINVITE-ERR', 
				'Missing required Training Program ID and Triggering User ID',
				true);
		}
		
		var trainProgRec = nlapiLoadRecord('customrecord_trainingprogramme', paramJson.progid),
			selectedCoaches = trainProgRec.getFieldValues('custrecord_tp_selectedcoaches');
		
		if (!selectedCoaches || (selectedCoaches && selectedCoaches.length <=0))
		{
			/**
			 * TODO: Do we need to Auto Uninvite if selected coach list is empty? 
			 * If THIS is something Client wants, we need to set a flag at this stage and
			 * After doing the search with all related booking and coaches, we need to go through and Uninvite them
			 */
			
			throw nlapiCreateError(
				'AUTOINVITE-ERR', 
				'Missing values for Selected coches', 
				true
			);
		}
		
		/**
		 * bookings[bookingId]:{
		 *   'index':xx,
		 *   'subsidiary':xx,
		 *   'entityid':xx,
		 *   'endate':xx,
		 *   'time':xx,
		 *   'language':xx,
		 *   'country':xx,
		 *   'apperyid':xx,
		 *   'course':xx
		 * }
		 * 
		 * coaches[coachId]:{
		 * 	 'subsidiary':yy,
		 *   'entityid':yy,
		 *   'groupid':yy,
		 *   'groupname':yy,
		 *   'nativelanguageid':yy,
		 *   'nativelanguagetext':yy,
		 *   'deliverycountryid':yy,
		 *   'deliverycountrytext':yy,
		 *   'virtualcertified':yy,
		 *   'portalid':yy
		 * }
		 */
		var procJson = {
			'bookings':{},
			'coaches':{}
		};
		
		//1. Grab list of ALL Booking records related to THIS training programm.
		var bflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		            new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', paramJson.progid),
		            new nlobjSearchFilter('custentity_bo_coach', null, 'anyof','@NONE@'),
		            new nlobjSearchFilter('jobtype', null, 'anyof', ['11','13']),
		            new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(new Date()))];
		
		//Last processed ID is the internal ID of booking.
		if (paramJson.lastprocid)
		{
			new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramJson.lastprocid);
		}
		
		//Grab list of ALL values needed for comparing and processing auto invitation
		var bcol = [
		            new nlobjSearchColumn('internalid').setSort(true), //Booking Internal ID
		            new nlobjSearchColumn('entityid'),
		            new nlobjSearchColumn('subsidiary'),
		            new nlobjSearchColumn('enddate'), //Booking Date
		            new nlobjSearchColumn('custentity_bo_eventtime'), //Booking time
		            new nlobjSearchColumn('custentity_bo_spokenlanguage'), //Booking spoken language
		            new nlobjSearchColumn('custentity_bo_eventcountry'), //Booking country
		            new nlobjSearchColumn('custentitycustentity_ext_apperyid'), //Booking Appery ID
		            new nlobjSearchColumn('custentity_bo_course'), //Booking Course
		            new nlobjSearchColumn('jobtype')
		            ],
		    brs = nlapiSearchRecord('job', null, bflt, bcol);
		
		//1a. If No bookings are available. Exit out. NO need to process
		if (!brs)
		{
			log(
				'debug',
				'No Bookings to Auto invite',
				'No need to process due to No Booking records to '+
					'Auto invite for Training Programme Internal ID: '+paramJson.progid
			);
			
			return;
		}
		
		//2. Loop through and build procJson.bookings JSON object]
		//		- This assumes There are always less than 1000 booking 
		//		  that matches
		for (var b=0; b < brs.length; b+=1)
		{
			procJson.bookings[brs[b].getValue('internalid')] = {
				'index':b,
				'entityid':brs[b].getValue('entityid') || '',
				'subsidiary':brs[b].getValue('subsidiary') || '',
				'endate':brs[b].getValue('enddate') || '',
				'time':brs[b].getValue('custentity_bo_eventtime') || '',
				'language':brs[b].getValue('custentity_bo_spokenlanguage') || '',
				'country':brs[b].getValue('custentity_bo_eventcountry') || '',
				'countrytext':brs[b].getText('custentity_bo_eventcountry') || '',
				'apperyid':brs[b].getValue('custentitycustentity_ext_apperyid') || '',
				'course':brs[b].getValue('custentity_bo_course') || '',
				'jobtype':brs[b].getValue('jobtype') || '',
				'jobtypetext':brs[b].getText('jobtype') || ''
			};
		}
		
		//3. Grab information for ALL Selected Coaches (selectedCoaches)
		var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', selectedCoaches),
		            new nlobjSearchFilter('category', null, 'anyof', ['5','12']),
		            //new nlobjSearchFilter('custentity_coach_groupingname', null, 'noneof',['@NONE@','723','380','369']),
		            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var ccol = [
		            new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('entityid'), //Coach Entity ID
		            new nlobjSearchColumn('custentity_coach_groupingname'), //Coach Group
		            new nlobjSearchColumn('custentity_coach_primarydeliverycountry'), //Primary Delivery Country
		            new nlobjSearchColumn('custentity_coach_isvirtualcertified'), //Virtual Certified
		            new nlobjSearchColumn('subsidiary'), //Subsidiary
		            new nlobjSearchColumn('custentity_user'), //Portal User ID
		            new nlobjSearchColumn('custentity_languages'), //Fluent Langagues
		            new nlobjSearchColumn('custentity_coach_nativelanguage') //Coach Native language
		           ];
		var crs = nlapiSearchRecord('vendor', null, cflt, ccol);
		
		//3a. If NO Coaches return, treat it as error
		if (!crs)
		{
			throw nlapiCreateError(
				'AUTOINVITE-ERR', 
				'No Coach (Vendor/Supplier) Detail returned. '+
					'Selected Coach IDs are '+selectedCoaches, 
				true
			); 
		}
		
		//4. Loop htrough and build procJson.
		for (var c=0; c < crs.length; c+=1)
		{
			procJson.coaches[crs[c].getValue('internalid')] = {
				'subsidiary':crs[c].getValue('subsidiary') || '',
				'entityid':crs[c].getValue('entityid') || '',
				'groupid':crs[c].getValue('custentity_coach_groupingname') || '',
				'groupname':crs[c].getText('custentity_coach_groupingname') || '',
				'nativelanguageid':crs[c].getValue('custentity_coach_nativelanguage') || '', //SELECT
				'nativelanguagetext':crs[c].getText('custentity_coach_nativelanguage') || '', //SELECT
				'fluentlanguages':(crs[c].getValue('custentity_languages')?crs[c].getValue('custentity_languages').split(','):[]), //MULTI SELECT
				'fluentlanguagestext':(crs[c].getText('custentity_languages')?crs[c].getText('custentity_languages').split(','):[]), //MULTI SELECT
				'deliverycountryid':crs[c].getValue('custentity_coach_primarydeliverycountry') || '',
				'deliverycountrytext':crs[c].getText('custentity_coach_primarydeliverycountry') || '',
				'virtualcertified':crs[c].getValue('custentity_coach_isvirtualcertified'),
				'portalid':crs[c].getValue('custentity_user')
			};
		}
		
		log('debug','About to start processing', JSON.stringify(procJson));
		
		//Log to send to user
		var procsLog = '';
		//************************ START Actual Processing of INVITATION *********************************/
		for (var bb in procJson.bookings)
		{
			var bjson = procJson.bookings[bb];
			
			log('debug','processing Booking JSON', JSON.stringify(bjson));
			
			//5. For Each Booking, we go through Each Coach and Add to Invitiation
			//	 IF All Criteria Matches:
			// 		- Coach is NOT invited to related booking.
			// 		- Native/Fluent language matches
			// 		- Subsidiary matches
			// 		- Country matches
			//			- Nov 25 2015 - Modification requested by client to BY-Pass if 
			//			  booking is virtual and coach is virtual certified
			// 		- Booking date is on or after current date
			
			for (var cc in procJson.coaches)
			{
				var cjson = procJson.coaches[cc];
				
				//5. Make sure Group Name is NONE of ['@NONE@','723','380','369']
				//	- Group name unassigned, TBC, RECRUITING and Multile Coaches
				if (!cjson.groupid || cjson.groupid == '723' ||
					cjson.groupid == '380' || cjson.groupid == '369')
				{
					log(
						'debug',
						'Group name issue one of Unassigned, TBC, Recruiting and/or Multiple Coaches',
						'Coach Group Name value is '+cjson.groupname
					);
						
						procsLog += '<li>'+
									'<b>FAIL - Booking '+bjson.entityid+' ('+bb+')</b>: <br/>'+
									'- Unable to add <i>Coach '+cjson.entityid+' ('+cc+')</i> because '+
									'Group name issue one of Unassigned, TBC, Recruiting and/or Multiple Coaches<br/>'+
									'Coach Group Name value is '+(cjson.groupname?cjson.groupname:'-EMPTY-')+
									'<br/><br/>'+
									'</li>';
									
						
						continue;
				}
				
				//5a. Make sure match on Subsidiary
				if (cjson.subsidiary != bjson.subsidiary)
				{
					log(
						'debug',
						'Subsidiary does not match',
						'Coach ('+cjson.subsidiary+') and Booking '+
							'('+bjson.subsidiary+') Subsidiary does NOT Match'
					);
					
					procsLog += '<li>'+
								'<b>FAIL - Booking '+bjson.entityid+' ('+bb+')</b>: <br/>'+
								'- Unable to add <i>Coach '+cjson.entityid+' ('+cc+')</i> because '+
								'Subsidiary does not match<br/>'+
								'Coach ('+cjson.subsidiary+') and Booking '+
								'('+bjson.subsidiary+') Subsidiary does NOT Match'+
								'<br/><br/>'+
								'</li>';
								
					
					continue;
				}
				
				//5b. Booking Spoken language matches Coaches Native OR Fluent languages
				if (cjson.nativelanguageid != bjson.language &&
					!cjson.fluentlanguages.contains(bjson.language))
				{
					
					//Nov 25. 2015 - Do extra check to see if it can be programmatically accepted. 
					//				 English vs. English - US 1/37
					//				 Danish vs. Danish (Same) 44/45
					var acceptLangEng = ['1','37'],
						accpetLangDanish = ['44', '45'],
						coachIsEnglish = acceptLangEng.contains(cjson.nativelanguageid),
						bookIsEnglish = acceptLangEng.contains(bjson.language),
						coachIsDanish = accpetLangDanish.contains(cjson.nativelanguageid),
						bookIsDanish = accpetLangDanish.contains(bjson.language),
						bookEnglishInFluent = false,
						bookDanishInFluent = false;
					
					if (bookIsEnglish || bookIsDanish)
					{
						for (var c=0; cjson.fluentlanguages && c < cjson.fluentlanguages.length; c+=1)
						{
							var fluentLang = cjson.fluentlanguages[c];
							log('debug','checking fluent',fluentLang);
							if (acceptLangEng.contains(fluentLang) && !bookEnglishInFluent)
							{
								bookEnglishInFluent = true;
							}
							
							if (accpetLangDanish.contains(fluentLang) && !bookDanishInFluent)
							{
								bookDanishInFluent = true;
							}
						}
					}
					
					log('debug','c-native // b-lang // c-fluent', cjson.nativelanguageid+' // '+bjson.language+' // '+cjson.fluentlanguages);
					log('debug','c-english // b-english // b-english-fluent // b-danish-fluent',coachIsEnglish+' // '+bookIsEnglish+' // '+bookEnglishInFluent+' // '+bookDanishInFluent);
					
					//Check to see if we need to do further checking 
					if ( (coachIsEnglish && bookIsEnglish) || 
						 (coachIsDanish && bookIsDanish) || 
						 (bookIsEnglish && bookEnglishInFluent) || 
						 (bookIsDanish && bookDanishInFluent) )
					{
						log('debug','This is Good By Pass it','By Passing');
					}
					else
					{
						log(
							'debug',
							'Langauges does not match',
							'Booking Langauge: '+bjson.language+
								' does not match coaches Native: '+cjson.nativelanguageid+
								' OR Fluent languages: '+cjson.fluentlanguages
						);
							
						procsLog += '<li>'+
									'<b>FAIL - Booking '+bjson.entityid+' ('+bb+')</b>: <br/>'+
									'- Unable to add <i>Coach '+cjson.entityid+' ('+cc+')</i> because '+
									'Language does not match<br/>'+
									'Booking Langauge: '+bjson.language+
									' does not match coaches Native: '+cjson.nativelanguageid+
									' OR Fluent languages: '+cjson.fluentlanguages+
									'<br/><br/>'+
									'</li>';
							
						continue;
					}
					
				}



				
/*				//Ticket 14383 - remove Country validation

				//5c. Make sure Country matches
				if (cjson.deliverycountryid != bjson.country)
				{
					
					//Nov 25 2015 - Add in check to ignore if booking is virtual and coach is virtual certified
					if (bjson.jobtype != '13' || (bjson.jobtype == '13' && cjson.virtualcertified != 'T' ))
					{
					
						log(
							'debug',
							'(Type: '+bjson.jobtypetext+') Delivery Country and Booking Country does not match',
							'Booking country: '+bjson.countrytext+' ('+bjson.country+')'+
								' and Coach country: '+cjson.deliverycountrytext+' ('+cjson.deliverycountryid+')'+
								' does NOT match'
						);
							
						procsLog += '<li>'+
									'<b>FAIL - Booking ('+bjson.jobtypetext+') '+bjson.entityid+' ('+bb+')</b>: <br/>'+
									'- Unable to add <i>Coach '+cjson.entityid+' ('+cc+')</i> because '+
									'Country does not match<br/>'+
									'Booking country: '+bjson.countrytext+' ('+bjson.country+')'+
									' and Coach country: '+cjson.deliverycountrytext+' ('+cjson.deliverycountryid+')'+
									' does NOT match'+
									'<br/><br/>'+
									'</li>';
							
						continue;
					}
					
				}
*/				
				
				
				//6. Make sure coach has portal ID
				if (!cjson.portalid)
				{
					log(
						'debug',
						'Coach is missing portal id',
						'Coach ID: '+cjson.entityid+
							'(Internal ID '+
							cc+
							')'
					);
						
						procsLog += '<li>'+
									'<b>FAIL - Coach '+cjson.entityid+' ('+cc+')</b>: <br/>'+
									'- Missing Portal ID '+
									'<br/><br/>'+
									'</li>';
						
						continue;
				}
				
				//5d. Search against Coach Pool and make sure - This Error is NOT logged as an error 
				//		this coach hasn't been invited already for THIS booking
				var invflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				              new nlobjSearchFilter('custrecord_bo_coachpool_bookingid', null, 'anyof', bb),
				              new nlobjSearchFilter('custrecord_bo_coachpool_userid', null, 'anyof', cjson.portalid),
				              new nlobjSearchFilter('custrecord_bo_coachpool_coachid', null, 'anyof', cjson.groupid),
				              new nlobjSearchFilter('custrecord_bo_coachpool_coachname', null, 'anyof', cc)];
				var invcol = [new nlobjSearchColumn('internalid')];
				var invrs = nlapiSearchRecord('customrecord_bo_coachpool', null, invflt, invcol);
				
				if (invrs && invrs.length > 0)
				{
					//Move on with next coach since this Coach has already been invited for THIS Booking
					log(
						'debug',
						'Alredy Invited',
						'Coach '+
							cjson.groupname+
							' (Vendor ID: '+
							cc+
							') is already invited for Booking ID '+
							bb
					);
					
					continue;
				}
				
				//*********** CAN Invite ******************/
				log('debug','CAN INVITE Coach','Coach '+cc+' can be invited to Booking '+bb);
				
				try 
				{
					var ivrec = nlapiCreateRecord('customrecord_bo_coachpool');
					ivrec.setFieldValue('custrecord_bo_coachpool_bookingid', bb);
					ivrec.setFieldValue('custrecord_bo_coachpool_apperyid', bjson.apperyid);
					ivrec.setFieldValue('custrecord_bo_coachpool_coachid', cjson.groupid);
					ivrec.setFieldValue('custrecord_bo_coachpool_coachname', cc);
					ivrec.setFieldValue('custrecord_bo_coachpool_userid', cjson.portalid);
					var invid = nlapiSubmitRecord(ivrec, true, true);
					
					procsLog += '<li>'+
								'<b>SUCCESS - Booking '+bjson.entityid+' ('+bb+')</b>: <br/>'+
								'- Successfully invited <i>Coach '+cjson.entityid+' ('+cc+')</i> // '+
								'Invitation ID '+invid+' created.'+
								'<br/><br/>'+
								'</li>';
				}
				catch (inverr)
				{
					procsLog += '<li>'+
								'<b>FAIL - Booking '+bjson.entityid+' ('+bb+')</b>: <br/>'+
								'- Failed to invite <i>Coach '+cjson.entityid+' ('+cc+')</i> because of unexpected error<br/> '+
								getErrText(inverr)+
								'<br/><br/>'+
								'</li>';
				}
				
			}
			
			//Reschedule logic
			//Set % completed of script processing
			var pctCompleted = Math.round(((parseInt(bjson.index)+1) / brs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//Reschedule here will ONLY apply if we are running low on usage
			if (nlapiGetContext().getRemainingUsage() < 1000) 
			{
				//reschedule
				log('debug','Getting Rescheduled at', bb);
				var rparam = {
					'custscript_420_lastprocid':bb,
					'custscript_420_triguserid':paramJson.triguser,
					'custscript_420_tpid':paramJson.progid
				};
				
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}	
			
		}//End For each Loop for Booking
		
		//Send Notification IF error exists
		if (procsLog)
		{
			var sbj = 'Error Occured during Auto Invitation Process',
				msg = 'Training Programme Internal ID '+paramJson.progid+
					  ' had one or more failures while attempting to auto invite selected coaches.<br/><br/>'+
					  '<ul>'+procsLog+'</ul>'+
					  '<br/><br/>Process JSON Object:<br/>'+
					  JSON.stringify(procJson);
			
			var recordObj = {
				'record':paramJson.progid,
				'recordtype':'customrecord_trainingprogramme'
			};
			nlapiSendEmail(
				-5, 
				paramJson.triguser, 
				sbj, 
				msg,
				null,
				null,
				recordObj
			);
		}
		
	}
	catch (execerr)
	{
		//log and throw the error to terminate the script and notify the users
		log(
			'error',
			'EarlyBird Auto Invite Error',
			getErrText(execerr)+' // '+JSON.stringify(paramJson)
		);
		
		throw nlapiCreateError(
			'AUTOINVITE-ERR', 
			'Script Terminating Error occured with '+
				'following Parameter Values: '+
				JSON.stringify(paramJson)+
				' // '+
				getErrText(execerr), 
			false
		);
	}
}
