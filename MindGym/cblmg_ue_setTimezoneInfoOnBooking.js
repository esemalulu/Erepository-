/**
 * Contains Functions for 
 * 	- Timezone calculation, 
 * 	- loading Early Bird Available Coach Suitelet
 * 	- Dispatch Date Calculation
 * 
 *  4/12/2016 - Add in Function for Parent/Child Booking Related Functions
 *  
 */

/**
 * Parameter values are set at the company preference level
 */
var paramErrorNotifierEmployee = nlapiGetContext().getSetting('SCRIPT', 'custscript_tzbk_employee');
var paramErrorCcEmails = nlapiGetContext().getSetting('SCRIPT','custscript_tzbk_cclist');
if (paramErrorCcEmails) {
	paramErrorCcEmails = paramErrorCcEmails.split(',');
}

/**
 * Before Load Function
 * @param type
 * @param form
 * @param request
 */
function coachAvailOnBooking(type, form, request) 
{
	//custentity_bo_coachavailhtml
	if ( (type=='view' || type=='edit' || type=='copy') && 
		 nlapiGetFieldValue('enddate') && 
		 nlapiGetContext().getExecutionContext()=='userinterface')
	{
		
		var slUrl = nlapiResolveURL(
				'SUITELET', 
				'customscript_aux_sl_coachavailtoolv2', 
				'customdeploy_aux_sl_coachavailtoolv2', 
				'VIEW'
			);
		
		
		var coachOverrideFld = form.addField('custpage_coachoverride', 'checkbox', 'Override Coach on Child', null, null),
			cldBookFld = form.addField('custpage_childoverridelist', 'multiselect', 'Override Child Bookings', null,null);
		
		
		//Production for Early Bird
		//3 = administrator
		//1070	Global/Client Services
		//1114	Global/Client Services MGT
		
		if (nlapiGetRole()==3 || nlapiGetRole()==1070 || nlapiGetRole()==1114)
		{
			//4/14/2016 - Add in Dynamic field that allows users to pick and choose options for
			//			  overriding coach on children
			//			  - Fields are added ONLY in edit mode and it is identified as Parent booking
			//			  - Fields are place BEFORE Coach Field (custentity_bo_coach)
			//			  	This is because different forms have different fields after coach.
			//				Placing it before Coach form ensures it will always be in same location.
			
			//Comma separated list of ALL Child Booking IDs
			var childBookingIds = [],
				isParentBooking = 'F';
			
			if (nlapiGetFieldValue('custentity_bookingset_child'))
			{
				isParentBooking = 'T';
			}
			
			//Display override options for the user 
			if (type == 'edit' && isParentBooking == 'T')
			{
				coachOverrideFld.setDisplayType('disabled');
				cldBookFld.setDisplayType('disabled');
				cldBookFld.setDisplaySize(400, 5);
				
				log('debug','testing','inside show fields');
				
				//1. loop and populate list of all child booking IDs. 
				for (var cb=0; cb < nlapiGetFieldValues('custentity_bookingset_child').length; cb+=1)
				{
					//Even though NS returns this as an array, it seems to be NetSuite extended version array.
					//	This process converts it into native JavaScript array.
					childBookingIds.push(nlapiGetFieldValues('custentity_bookingset_child')[cb]);
				}
				
				//var form = nlapiCreateForm('test', false);
				
				var cbflt = [new nlobjSearchFilter('internalid', null, 'anyof', childBookingIds)],
					cbcol = [new nlobjSearchColumn('internalid'),
					         new nlobjSearchColumn('entityid'),
					         new nlobjSearchColumn('custentity_bo_coach'),
					         new nlobjSearchColumn('custentity_bo_item'),
					         new nlobjSearchColumn('enddate')],
					cbrs = nlapiSearchRecord('job', null, cbflt, cbcol);
				
				//Assume there are results
				for (var cbr=0; cbr < cbrs.length; cbr+=1)
				{
					//Build Option Text Value as
					// Booking Name : Date :Coach : Item
					var optionText = cbrs[cbr].getValue('entityid')+' : '+
									 (cbrs[cbr].getValue('custentity_bo_coach')?cbrs[cbr].getText('custentity_bo_coach'):'No Coach')+' : '+
									 (cbrs[cbr].getValue('custentity_bo_item')?cbrs[cbr].getText('custentity_bo_item'):'No Item')+' : '+
									 (cbrs[cbr].getValue('enddate')?cbrs[cbr].getValue('enddate'):'No Date');
					
					cldBookFld.addSelectOption(
						cbrs[cbr].getValue('internalid'), 
						optionText,
						false
					);
				}
						
			}
			
			//place it just before coach field
			//Override checkbox
			form.insertField(coachOverrideFld,'custentity_bo_coach');
			//Override child booking list
			form.insertField(cldBookFld, 'custentity_bo_coach');
			
			
			var countryVal = '';
			if (nlapiGetFieldText('jobtype') == 'Face to face')
			{
				countryVal = nlapiGetFieldValue('custentity_bo_eventcountry');
			}
			
			var isVirtualFlag = 'F';
			if (nlapiGetFieldValue('custentity_bo_virtualevent')=='T')
			{
				isVirtualFlag = 'T';
			}
			
			var isMasterTtt = 'F';
			if (nlapiGetFieldText('custentity_bo_item').indexOf('Certification') > -1)
			{
				isMasterTtt = 'T';
			}
			
			//check for job type 
			var isLicenseType = 'F';
			if (nlapiGetFieldValue('jobtype') == '12')
			{
				isLicenseType = 'T';
			}
			
			//1300 width is MAX due to resolution
			var inlineHtml = '<iframe src="'+
				slUrl+
				'&ifrmcntnr=T'+
				'&isiframe=T'+
				'&custpage_isparent='+isParentBooking+
				'&custpage_fromdate='+nlapiGetFieldValue('enddate')+
				'&custpage_todate='+nlapiGetFieldValue('enddate')+
				'&custpage_language='+(nlapiGetFieldValue('custentity_bo_spokenlanguage')?nlapiGetFieldValue('custentity_bo_spokenlanguage'):'')+
				'&custpage_country='+countryVal+
				'&custpage_isvirtual='+isVirtualFlag+
				'&custpage_subsidiary='+nlapiGetFieldValue('subsidiary')+
				'&custpage_bookingid='+nlapiGetRecordId()+
				'&custpage_apperyid='+(nlapiGetFieldValue('custentitycustentity_ext_apperyid')?nlapiGetFieldValue('custentitycustentity_ext_apperyid'):'')+
				'&custpage_bookingdate='+(nlapiGetFieldValue('enddate')?nlapiGetFieldValue('enddate'):'')+
				'&custpage_bookingtime='+(nlapiGetFieldValue('custentity_bo_eventtime')?nlapiGetFieldValue('custentity_bo_eventtime'):'')+
				'&custpage_courseid='+(nlapiGetFieldValue('custentity_bo_course')?nlapiGetFieldValue('custentity_bo_course'):'')+
				'&custpage_coursetext='+(nlapiGetFieldText('custentity_bo_course')?nlapiGetFieldText('custentity_bo_course'):'')+
				'&custpage_coachid='+(nlapiGetFieldValue('custentity_bo_coach')?nlapiGetFieldValue('custentity_bo_coach'):'')+
				'&custpage_progid='+(nlapiGetFieldValue('custentity_bo_trainingprogramme')?nlapiGetFieldValue('custentity_bo_trainingprogramme'):'')+
				'" width="1300" height="800" name="bookingcoachavail" seamless="seamless"></iframe>';
			nlapiSetFieldValue('custentity_bo_coachavailhtml',inlineHtml);
		}
		
		if (type == 'view')
		{
			if (nlapiGetFieldValue('custentity_bookingset_child'))
			{
				
				coachOverrideFld.setDisplayType('hidden');
				coachOverrideFld.setDefaultValue('F');
				
				cldBookFld.setDisplayType('hidden');
				
			}
		}
		
	}
	else
	{
		nlapiSetFieldValue('custentity_bo_coachavailhtml','');
	}
}

function calcDispatchDateBeforeSubmit(type)
{
	/************ Calculate and set Book/Pack Dispatch Date field value *****/
	if (type == 'delete' || type == 'view' || type == 'xedit')
	{
		return;
	}
	
	
	if(nlapiGetFieldValue('jobtype') == '12') // 12 = License
	{		
		nlapiSetFieldValue('custentity_bo_packdispatchdate', nlapiGetFieldValue('enddate'));		
	}


	
	if(nlapiGetFieldValue('jobtype') != '12' ||
	   nlapiGetFieldValue('jobtype') != '14' || 				// 12 = License OR 14 = Parent Gym
	   nlapiGetFieldValue('custentity_bo_item') != '2603')		// Item = Parent Gym Printing
	{

		//- Conditions: ONLY Execut when following criteria matches:
		//	- Booking/Pack Shipping Date (custentity_bo_packshippingdate) is Empty
		//	- Booking/Is Delivered (custentity_bo_isdelivered) is F
		//	- Booking/Pack Dispatch Date (custentity_bo_packdispatchdate) Is Empty
		//	- Country (custentity_bo_eventcountry) is Set
		if (!nlapiGetFieldValue('custentity_bo_packshippingdate') &&
			nlapiGetFieldValue('custentity_bo_isdelivered') != 'T' &&
			!nlapiGetFieldValue('custentity_bo_packdispatchdate') &&
			nlapiGetFieldValue('custentity_bo_eventcountry') &&
			nlapiGetFieldValue('enddate'))
		{
			
			//1. Grab the custrecord_country_dispatchdate from country record
			var dispatchNumOfDays = '',
				//format is MM/DD
				arSkipDates = ['12/31','1/1','12/25','12/26'];
			try
			{
				dispatchNumOfDays = nlapiLookupField(
										'customrecord_country', 
										nlapiGetFieldValue('custentity_bo_eventcountry'),
										'custrecord_country_dispatchdate', 
										false
									);
				
			}
			catch (errlookup)
			{
				log(
					'error',
					'Error looking up Dispatch Date Value', 
					'Error looking up Dispatch Date value for '+
						nlapiGetFieldText('custentity_bo_eventcountry')+
						' // '+
						getErrText(errlookup));
			}
			
			//log('debug','Dispatch Number of Days', dispatchNumOfDays);
			
			if (dispatchNumOfDays)
			{
				nlapiSetFieldValue(
						'custentity_bo_packdispatchdate', 
						getBusinessDate(
							nlapiStringToDate(nlapiGetFieldValue('enddate')), 
							parseInt(dispatchNumOfDays), 
							true,
							arSkipDates
						)
					);
			}		
		}		
	
	
	}
	
	

	
}

/**
 * After submit
 * @param type
 */
function setTimezoneInfoAfterSubmit(type) {

	/*********** Parent/Child Booking related functions ******/
	//Parent/Child Booking Related functions
	//4/12/2016
	
	try
	{
		//ONLY execute when in User Interface
		if (nlapiGetContext().getExecutionContext()=='userinterface' && (type=='edit' || type=='xedit'))
		{
			//Same array value from auxmg_sl_cs_ss_parentChildBookingSelProc.js file
			var oldRec = nlapiGetOldRecord(),
				newRec = nlapiGetNewRecord(),
				overwriteFromPrt = ['custentity_bo_overduecomments', //Overdue Comments
			                        'custentity_bo_coach', // Coach
			                        'custentity_bo_exec', //Project Manager
			                        'custentity_bo_owner', //Co-ordinator
			                        'custentity_bo_buyer', //Buyer
			                        'custentity_bo_eventtimezone', //Time Zone
			                        'custentity_bo_pack_shipto', //Shipt TO
			                        'custentity_bo_eventaddress1', //Address 1
			                        'custentity_bo_eventaddress2', //Address 2
			                        'custentity_bo_eventcity', //City
			                        'custentity_bo_eventcountry', //Country
			                        'custentity_bo_eventpostcode', //Post Code
			                        'custentity_bo_trainingprogramme', //Training Programme
			                        'custentity_bo_sitecontact', //Site Contact
			                        'custentity_bo_dresscode', //Dress Code
			                        'custentitycustentity_bo_virtualchannel', //Virtual Channel
			                        'custentity_bo_travelnotes', //Travel Notes
			                        'custentity_bo_eventstate', //State
			                        'custentity_cbl_shipadr_lat', //Lat
			                        'custentity_cbl_shipadr_lng', //Lng
			                        'custentity_ax_bookingset']; //booking set
			
			//1. We need to see if any of the values of above fields have changed
			if (type == 'xedit')
			{
				//For inline edit, load the record.
				//We need to load it to see if THIS booking record has children to update
				newRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			}
			
			//------------ Check to see if Field Value have changed for child booking ----------------
			//	- THIS will check to see if oldRec had any values for child booking.
			//	  old vs new will be compared to see what Child Booking IDs needs to have Parent REMOVED
			//	  Since NS doesn't support multiselect, each child booking IDs to be removed
			//	  will be broken into 30 counts.
			//	  Each 30 will be queue up for processing.
			//	    Passing in comma separated list of IDs has character limit of 4000 (texarea field).
			//		Plus, since parent booking is disabled, script will charge 30 unit to update. 
			//		Passing in 30 per queue record will allow quick processing by scheduled script 
			//		without having to reschedule.
			if (oldRec.getFieldValues('custentity_bookingset_child'))
			{
				var removeParentBooking = [],
					oldRecChild = [],
					oldRecValues = oldRec.getFieldValues('custentity_bookingset_child'),
					newRecChild = [],
					newRecValues = newRec.getFieldValues('custentity_bookingset_child');
					
				
				//1. Need to go through and populate both child arrasy for comparison
				for (var olc=0; olc < oldRecValues.length; olc+=1)
				{
					oldRecChild.push(oldRecValues[olc]);
				}
				
				//2. check to see if we have values for newRecValues.
				if (!newRecValues || (newRecValues && newRecValues.length == 0))
				{
					//EVERYTHING was cleared out. Remove parent from All following Child Booking Record
					removeParentBooking = oldRecChild;
				}
				else
				{
					//Build up newRecChild array
					for (var nlc=0; nlc < newRecValues.length; nlc+=1)
					{
						newRecChild.push(newRecValues[nlc]);
					}
					
					//3. Go compare old vs new value
					for (var olc=0; olc < oldRecChild.length; olc+=1)
					{
						//If the value is NOT in the new list, add to remove array
						if (!newRecChild.contains(oldRecChild[olc]))
						{
							removeParentBooking.push(oldRecChild[olc]);
						}
					}
				}
				
				log('debug','old values // new values // To Remove', oldRecChild+' // '+newRecChild+' // '+removeParentBooking);
				
				//4. queue up delete job if removeParentBooking is NOT empty
				//		Queue up 30 child records at a time.
				var resetCounter = 0,
					childString = '',
					resetPoint = 30;
				for (var r=0; r < removeParentBooking.length; r+=1)
				{
					childString += removeParentBooking[r]+',';
					
					//increment resetCounter
					resetCounter += 1;
					
					if (resetCounter >= resetPoint || 
						( (r+1) == removeParentBooking.length) )
					{
						childString = childString.substring(0, (childString.length - 1));
						//Queue it up
						var	params = {
								'custscript_499_delprttext':childString
							},
							queueStatus = '';
						
						queueStatus = nlapiScheduleScript(
									  	'customscript_ax_ss_setprntchildbooking', 
									  	null, 
									  	params
							  		  );
							
						if (queueStatus != 'QUEUED')
						{
							
							log(
								'error',
								'Error Queuing Up Parent Removal Job - Parent Booking '+nlapiGetRecordId(), 
								'Unable to find open deployment for Child IDs '+childString+'. Queue Status came back as '+queueStatus
							)
							;
							var derrsbj = 'Error Queuing Up Parent Removal Job - Parent Booking '+nlapiGetRecordId();
							var derrmsg = 'Unable to find open deployment for Child IDs '+childString+'. Queue Status came back as '+queueStatus;
							
							nlapiSendEmail(-5, paramErrorNotifierEmployee, derrsbj, derrmsg, paramErrorCcEmails, null, null, null,true);
							
						}
						
						log('debug','Queued up for Processing', JSON.stringify(params));
						
						//Reset resetCounter
						resetCounter = 0;
						childString = '';
					}
				}//End loop for queuing up parent removal job
							
			} //End setup for Parent Removal
			
			
			//Execute This Section ONLY if THIS is a Parent record
			if (newRec.getFieldValues('custentity_bookingset_child'))
			{
				//Loop through each of the overwrite fields and see if something changed.
				var queueUpParentToChildSync = false,
					arChildBooking = newRec.getFieldValues('custentity_bookingset_child'),
					//Formated Text String to pass to scheduled script
					//[ChildID]:[ParentID],...
					procText = '',
					overrideCoachOnChild = '';
				
				for (var w=0; w < overwriteFromPrt.length; w+=1)
				{
					var oldCompareValue = oldRec.getFieldValue(overwriteFromPrt[w])?oldRec.getFieldValue(overwriteFromPrt[w]):'',
						newCompareValue = newRec.getFieldValue(overwriteFromPrt[w])?newRec.getFieldValue(overwriteFromPrt[w]):'';
						
					if (oldCompareValue != newCompareValue)
					{
						log(
							'debug',
							'paret booking OW Fld Change', 
							'Record ID: '+nlapiGetRecordId()+' // Field: '+overwriteFromPrt[w]+
								'Old Value: '+oldCompareValue+' // '+
								'New Value: '+newCompareValue
						);
						
						queueUpParentToChildSync = true;
						break;
					}
				}
				
				//Queue up 20 records at a time.
				if (queueUpParentToChildSync)
				{
					//Apr. 15 2016 - Build a list of overrideCoachOnChild
					//	This list is generated if the user changed Coach field and 
					//	Checked the Override on Child Booking checkbox. 
					if (newRec.getFieldValue('custpage_coachoverride') == 'T')
					{
						//Grab user selected values 
						for (var cl=0; cl < newRec.getFieldValues('custpage_childoverridelist').length; cl+=1)
						{
							overrideCoachOnChild += newRec.getFieldValues('custpage_childoverridelist')[cl]+',';
						}
						overrideCoachOnChild = overrideCoachOnChild.substring(0, (overrideCoachOnChild.length-1));
					}
					
					
					//Go through Each Child and build procText
					var p2cResetCnt = 0,
						//20 matches the Queue limit from UI Suitelet
						p2cResetPoint = 20;
					
					for (var cc=0; cc < arChildBooking.length; cc+=1)
					{
						procText += arChildBooking[cc]+':'+nlapiGetRecordId()+',';
						
						//increment the counter
						p2cResetCnt +=1;
						
						if (p2cResetCnt >= p2cResetPoint || 
							( (cc+1) == arChildBooking.length) )
						{
							
							procText = procText.substring(0, (procText.length-1));
							
							var	params = {
									'custscript_499_proctext':procText,
									'custscript_499_user':nlapiGetContext().getUser(),
									'custscript_499_selectivecoachoverride':overrideCoachOnChild
								},
								queueStatus = '';
							
							queueStatus = nlapiScheduleScript(
										  	'customscript_ax_ss_setprntchildbooking', 
										  	null, 
										  	params
								  		  );
								
							if (queueStatus != 'QUEUED')
							{
								var derrsbj = 'Error Queuing Up Parent/Child Update Job - Parent Booking '+nlapiGetRecordId();
								var derrmsg = 'Unable to find open deployment for Child IDs '+procText+'. Queue Status came back as '+queueStatus;
								
								log(
									'error',
									derrsbj,
									derrmsg
								);
								
								nlapiSendEmail(-5, paramErrorNotifierEmployee, derrsbj, derrmsg, paramErrorCcEmails, null, null, null,true);
							}
							else
							{
								log('debug','Queued up for Processing', JSON.stringify(params));
							}
							
							p2cResetCnt = 0;
							procText='';
						}
					}
					
				}//Queue up Child Update Process
				
			}//check for Parent Booking
			
		}//Check for edit/xedit
	}
	catch (ptrclderr) 
	{
		//send to david for error
		log('error','Error Processing Parent/Child Booking Update', getErrText(ptrclderr));
		var errsbj = 'Error occured while Processing Parent/Child Booking Update: '+nlapiGetRecordId();
		var errmsg = getErrText(ptrclderr)+'<br/><br/>';
		
		var recUrl = 'https://system.netsuite.com'+nlapiResolveURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'VIEW');
		errmsg += '<a href="'+recUrl+'" target="_blank">View '+entityId+' Booking Record</a>';
		
		nlapiSendEmail(-5, paramErrorNotifierEmployee, errsbj, errmsg, paramErrorCcEmails, null, null, null,true);
		
	}
	
	/*********** Time Zone related function ******************/
	var entityId = '';
	try 
	{
		
		//auto return if delete
		if (type == 'delete' || type=='view') 
		{
			return;
		}
		
		//log('debug','Type',type);
		
		var bkrec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		entityId = bkrec.getFieldValue('entityid');
		//Ignore all Parent Gym  items custentity_bo_item
		if (bkrec.getFieldValue('custentity_bo_item') == '1570') 
		{
			//log('debug','Item is Parent Gym','Ignore Booking records with Parent Gym Item');
			return;
		}
		
		
		var bkdt = bkrec.getFieldValue('enddate'); 							//Get Date/Time of event.			
		var bktime = bkrec.getFieldValue('custentity_bo_eventtime');
		var bkdeldate = bkrec.getFieldValue('custentity_bo_deliverydate');	//Get Delivery Date	
		
		//ONLY process when both Date and Time is set
		if (!bkdt || !bktime) {
			return;
		}
				
		var bkdatetime = nlapiStringToDate(bkdt+' '+bktime,'datetimetz');	
		
		var bkdelivery = nlapiStringToDate(bkdeldate+' '+bktime,'datetimetz');	
		
		//log('debug','Executing', nlapiGetContext().getExecutionContext());
		
		var coachTzId='', coachTzOlsenValue='';
		if (bkrec.getFieldValue('custentity_bo_coach')) 
		{
			//lookup coach time zone and set it on this record
			//Make sure to use new Coach/Time Zone instead of old Time Zone field
			coachTzId = nlapiLookupField('vendor', bkrec.getFieldValue('custentity_bo_coach'), 'custentity_coach_timezone', false);
			//log('debug','coachTzId',coachTzId);
			if (coachTzId) {
				bkrec.setFieldValue('custentity_cbl_booking_coachtz', coachTzId);
				//lookup oselvn value
				coachTzOlsenValue = nlapiLookupField('customrecord_timezone', coachTzId, 'custrecord_tz_olsenmap', false);
			}
		}
		
		if (bkrec.getFieldValue('custentity_bo_eventtimezone')) 
		{
			var bkTzOlsenValue = nlapiLookupField('customrecord_timezone', bkrec.getFieldValue('custentity_bo_eventtimezone'), 'custrecord_tz_olsenmap', false);
			
			if (bkTzOlsenValue) 
			{
				
				//5/6/2014 - Timezone fix due to issue with resetting of date/time based on Users timezone
				var gmtOlsenValue = 'Europe/London';
				//var timeFormat25Value = 'fmHH24:fmMI';
				//1. Load Users' timezone
				var userConfig = nlapiLoadConfiguration('userpreferences');
				var userTimeZoneValue = userConfig.getFieldValue('TIMEZONE');
				//var userTimeFormatValue = userConfig.getFieldValue('TIMEFORMAT');
				
				//2. Temporarily change user Timezone to GMT
				if (gmtOlsenValue != userTimeZoneValue) 
				{
					userConfig.setFieldValue('TIMEZONE', gmtOlsenValue);
					//userConfig.setFieldValue('TIMEFORMAT', timeFormat25Value);
					nlapiSubmitConfiguration(userConfig);
				}
				
				
				if (bkrec.getFieldValue('jobtype') != '12' && (bkdt && bktime)) 
				{				
					//5/6/2014 - Timezone fix due to issue with resetting of date/time based on Users timezone
					//Hidden date/time field custentity_cbl_booking_tzcalcdtfld is used for calculating time zone based date/time
					bkrec.setFieldValue('custentity_cbl_booking_eventdatetime',getStandardizedDateString(bkdatetime)); 
					//nlapiDateToString(bkdatetime, 'datetimetz'));
					
					//set GMT version of events date/time based on events time zone
					bkrec.setDateTimeValue('custentity_cbl_booking_tzcalcdtfld', nlapiDateToString(bkdatetime, 'datetimetz'), bkTzOlsenValue);
					
					//5/23/2014 - Standardize Display as YYYY-MM-DD HH:MM:SS am/pm
					//log('debug','GMT',nlapiStringToDate(bkrec.getFieldValue('custentity_cbl_booking_tzcalcdtfld'),'datetime'));
									
					//set GMT time
					bkrec.setFieldValue('custentity_cbl_booking_gmtdatetime', getStandardizedDateString(nlapiStringToDate(bkrec.getFieldValue('custentity_cbl_booking_tzcalcdtfld'),'datetimetz')));
					
					//custentity_cbl_booking_estdatetime
					//14 - Eastern Time
					bkrec.setFieldValue('custentity_cbl_booking_estdatetime', getStandardizedDateString(nlapiStringToDate(bkrec.getDateTimeValue('custentity_cbl_booking_tzcalcdtfld', 14),'datetimetz')));
					
					
					//69 - Singapore key
					//custentity_cbl_booking_singdatetime
					bkrec.setFieldValue('custentity_cbl_booking_singdatetime', getStandardizedDateString(nlapiStringToDate(bkrec.getDateTimeValue('custentity_cbl_booking_tzcalcdtfld', 69),'datetimetz')));
				
					
				}

				
				if (bkrec.getFieldValue('jobtype') == '12' && bkdeldate ) 
				{				
					//Hidden date/time field custentity_cbl_booking_tzcalcdtfld is used for calculating time zone based date/time
					bkrec.setFieldValue('custentity_cbl_booking_eventdatetime',getStandardizedDateString(bkdelivery)); 
					//nlapiDateToString(bkdelivery, 'datetimetz'));
					
					//set GMT version of events date/time based on events time zone
					bkrec.setDateTimeValue('custentity_cbl_booking_tzcalcdtfld', nlapiDateToString(bkdelivery, 'datetimetz'), bkTzOlsenValue);
									
					//set GMT time
					bkrec.setFieldValue('custentity_cbl_booking_gmtdatetime', getStandardizedDateString(nlapiStringToDate(bkrec.getFieldValue('custentity_cbl_booking_tzcalcdtfld'),'datetimetz')));
					
					//custentity_cbl_booking_estdatetime
					//14 - Eastern Time
					bkrec.setFieldValue('custentity_cbl_booking_estdatetime', getStandardizedDateString(nlapiStringToDate(bkrec.getDateTimeValue('custentity_cbl_booking_tzcalcdtfld', 14),'datetimetz')));
									
					//69 - Singapore key
					//custentity_cbl_booking_singdatetime
					bkrec.setFieldValue('custentity_cbl_booking_singdatetime', getStandardizedDateString(nlapiStringToDate(bkrec.getDateTimeValue('custentity_cbl_booking_tzcalcdtfld', 69),'datetimetz')));
				}		
				
				//if Coach tz is set AND tz olsen is set, set coaches date/time
				//log('debug','coach Tx Oldsen', coachTzOlsenValue);
				if (coachTzOlsenValue && bkrec.getFieldValue('custentity_cbl_booking_tzcalcdtfld')) 
				{
					//20/1/2015
					//Add in Time of Day Value
					bkrec.setFieldValue(
						'custentity_cbl_booking_coachexacttime', 
						nlapiDateToString(
							nlapiStringToDate(
								bkrec.getDateTimeValue(
									'custentity_cbl_booking_tzcalcdtfld', 
									coachTzOlsenValue
								),
								'datetimetz'
							),
							'timeofday'
						)
					);
					bkrec.setFieldValue('custentity_cbl_booking_coachdtnsformat', nlapiDateToString(nlapiStringToDate(bkrec.getDateTimeValue('custentity_cbl_booking_tzcalcdtfld', coachTzOlsenValue),'datetimetz'),'datetimetz'));
					
					bkrec.setFieldValue('custentity_cbl_booking_coachdatetime', 
										getStandardizedDateString(nlapiStringToDate(bkrec.getDateTimeValue('custentity_cbl_booking_tzcalcdtfld', coachTzOlsenValue),'datetimetz')));
				}
				
				//Ticket #9999 5/23/2016 - Calculate Participant Date/Time, Time Difference
				//	ONLY trigger for booking type of virtual
				if (bkrec.getFieldValue('jobtype') == '13' && 
					bkrec.getFieldValue('custentity_bo_eventparticipanttimezone'))
				{
					var partiTz = nlapiGetFieldValue('custentity_bo_eventparticipanttimezone'),
						partiOlsen = nlapiLookupField('customrecord_timezone', bkrec.getFieldValue('custentity_bo_eventparticipanttimezone'), 'custrecord_tz_olsenmap', false);
					
					//We are going to set the participant date/time value using participant TZ
					if (partiTz && partiOlsen)
					{
						
						bkrec.setFieldValue('custentity_cbl_booking_partdatetime', 
								getStandardizedDateString(nlapiStringToDate(bkrec.getDateTimeValue('custentity_cbl_booking_tzcalcdtfld', partiOlsen),'datetimetz')));

					}
				}
				
				
				//Mod Req: 5/6/2014 - Revert back User Timezone back to original
				if (userTimeZoneValue != gmtOlsenValue) {
					userConfig = nlapiLoadConfiguration('userpreferences');
					userConfig.setFieldValue('TIMEZONE', userTimeZoneValue);
					//userTimeFormatValue
					//userConfig.setFieldValue('TIMEFORMAT', userTimeFormatValue);
					nlapiSubmitConfiguration(userConfig);
				}				
			}
		}		
		
		nlapiSubmitRecord(bkrec, false, true);
		
	} catch (bktzerr) {
		
		//send to david for error
		//oliver.fisk@themindgym.com
		
		//TODO Send errors.
		log('error','Error calculating date/time', getErrText(bktzerr));
		var errsbj = 'Error occured while setting timezone values for Booking Record ID: '+nlapiGetRecordId();
		var errmsg = 'Below error occured while trying to calculate and set time zone date/time value:<br/><br/>'+
					 getErrText(bktzerr)+'<br/><br/>';
		
		var recUrl = 'https://system.netsuite.com'+nlapiResolveURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'VIEW');
		errmsg += '<a href="'+recUrl+'" target="_blank">View '+entityId+' Booking Record</a>';
		
		nlapiSendEmail(-5, paramErrorNotifierEmployee, errsbj, errmsg, paramErrorCcEmails, null, null, null,true);
		
	}
	
}


//ADD in Xedit feature to recalc the time/zone field.
