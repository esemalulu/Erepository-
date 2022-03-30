/**
 * Course edition track/syncer will allow users to update Edition of the Course and
 * ensures ALL future booking related to ALL previous versions of the course is updated to THIS version.
 *
 * UPDATE 9/16/2015
 * - Instead of have it be triggered by change in Edition value, Client request to be triggered manually via button
 *
 * Key Elements to Track. Edition (custrecord_course_edition) field on
 * Course (customrecord_course) custom record.
 * - User Event will trigger and queue it up for process when:
 * 		- Edition value is changed but SET. Will not trigger for New Empty Value
 * 		- If Edition value is NULL or Empty, it is considered as LOWEST of the LOWEST
 * 		- Highest and Latest Course is identified as MAX Edition field value
 *
 * - Scheduled script will:
 * 		- Go through ALL Future Booking where following meets and update to Highest/Latest Course
 * 			- Booking Pack Ship Date is EMPTY
 * 			- Enddate is in the future based on CURRENT Date
 * 			- custentity_bo_iseditionrequested != 'T'
 *
 * When looking at the Course records, Following Fields are used to GROUP the different version of courses as ONE
 * 		- Topic
 * 		- Language
 * 		- Item
 *
 * Version    Date            Author           Remarks
 * 1.00       14 Sep 2015     json
 *
 */

/**
 * User Event Button based trigger regardless of what the action is
 */
function beforeLoadCourseMod(type, form, request)
{
	var d = new Date();

	if ( type == 'view' && nlapiGetContext().getExecutionContext() == 'userinterface')
	{
		// Add in Ability for user to manually kick off Sync Job via button.
		var manualSyncBtn = form.addButton(
			'custpage_synccourse',
			'Update Future Bookings',
			'window.location.href=window.location.href+\'&custparam_triggerupdate=T\''
		);

		var prevCourse = nlapiGetFieldValue('custrecord_course_previousedition');

		if (request.getParameter('custparam_disable')=='T')
		{
			manualSyncBtn.setDisabled(true);
		}

		//If page has been refreshed with custparam_triggerupdate set to true, queue it up, disable the button and change the value of it
		if (request.getParameter('custparam_triggerupdate') == 'T')
		{
			//Queue it up here
			var syncStatus = nlapiScheduleScript('customscript_aux_ss_course_update_notify', null, {'custscript_courseid': nlapiGetRecordId(), 'custscript_prevcourseid': prevCourse,  'custscript_sb348_courseid': nlapiGetRecordId()});
			log('debug', 'COURSE ID', nlapiGetRecordId());
			log('debug', 'prevCourse', prevCourse);
			log('debug', 'SB348_COURSEID', nlapiGetRecordId());

			if (syncStatus == 'QUEUED')
			{
				var day = nlapiAddDays(d, 1);
				var updateDate = nlapiDateToString(day, 'date');

				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecord_course_edition_update_date', updateDate);
				//Redirect it to THIS
				var rparam = {
					'custparam_disable':'T',
				};

				nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'VIEW', rparam);
			}
		}
	}
}

/**
 * Scheduled script to handle processing of Booking records to new
 * @param type
 */
function processCourseUpdate(type)
{
	var d = new Date();
	var todaysDate = nlapiDateToString(d, 'date');

	var sf = [
	          	new nlobjSearchFilter('custrecord_course_edition_update_date', null, 'isnotempty')
	         ];

	var sc = [
	          	new nlobjSearchColumn('custrecord_course_edition_update_date'),
	          	new nlobjSearchColumn('internalid')
	         ];

	var courseSearch = nlapiSearchRecord('customrecord_course', null, sf, sc);
	if(courseSearch != null)
	{
		for(var i = 0; i < courseSearch.length; i+=1)
		{
			var courseDate = courseSearch[i].getValue('custrecord_course_edition_update_date');
			var courseId   = courseSearch[i].getValue('internalid');

			if(courseDate == todaysDate)
			{
				//Constant Values
				var paramPrimaryNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_primarynotifier'),
					paramAddrNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_addrnotifier'),

				//Dynamic Values
					paramCourseId = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_courseid'),
					paramLastProcBookingId = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_lastprocbookid'),
					paramPrimaryCourseId = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_primecourse'),
					paramPrimaryCourseName = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_primename'),
					paramPrimaryCourseEdition = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_primeedition'),
					paramPreviousCouseIds = nlapiGetContext().getSetting('SCRIPT','custscript_sb348_previouscourseids');

				nlapiLogExecution('DEBUG','COURSE ID',paramCourseId);
				if (paramAddrNotifier)
				{
					paramAddrNotifier = paramAddrNotifier.split(',');
				}
				else
				{
					paramAddrNotifier = null;
				}

				if (paramPreviousCouseIds)
				{
					paramPreviousCouseIds = paramPreviousCouseIds.split(',');
				}
				//if Course ID modified is not set, throw an error and terminate script
				if (!paramCourseId)
				{
					log('error','Missing Required INFO','Missing required newly modified/created course ID');
					throw nlapiCreateError('COURSEMOD-ERR', 'Missing required newly modified/created course ID', true);
				}

				//if Primary Notifier is NOT Set, throw error
				if (!paramPrimaryNotifier)
				{
					log('error','Missing Required INFO','Missing required primary employee to notify of update progress and process errors');
					throw nlapiCreateError('COURSEMOD-ERR', 'Missing required primary employee to notify of update progress and process errors', true);
				}

				var courseJson = {};

				try
				{
					//1. Look up Required Course Related INFO from THIS Course
					var lookupFlds = ['custrecord_course_language', //language
					                  'custrecord_course_item', //item
					                  'custrecord_course_topic', //topic
					                  'custrecord_course_edition', //Edition value of THIS course
					                  'name'],
					    lookupVals = nlapiLookupField('customrecord_course', paramCourseId, lookupFlds, false);

					courseJson = {
						'language':lookupVals['custrecord_course_language'] || '',
						'item':lookupVals['custrecord_course_item'] || '',
						'topic':lookupVals['custrecord_course_topic'] || '',
						'edition':lookupVals['custrecord_course_edition'] || '',
						'name':lookupVals['name'],
						'id':paramCourseId,
						'primary':paramPrimaryCourseId || '',
						'primaryname':paramPrimaryCourseName || '',
						'primaryedition':paramPrimaryCourseEdition || '',
						'previous':paramPreviousCouseIds || []
					};

					log('DEBUG', 'Primary Notifier', paramPrimaryNotifier);
					log('DEBUG', 'VALUES', JSON.stringify(courseJson));

					//CHECK: Make sure language, item and topic values are set on this course
					if (!courseJson.language || !courseJson.item || !courseJson.topic)
					{
						throw nlapiCreateError('COURSEMOD-ERR',
											   'Course ID '+courseJson.id+' is missing Language, Item or Topic on the record.',
											   false);
					}

					//1. If primary course ID isn't passed in, run logic to identify primary AND list of all previous courses
					if (!courseJson.primary)
					{
						log('debug','Looking up primary and previous','Running Primary/Previous Logic');
						//Sort by Edition DESC so the max is returned. IF First record returned does NOT have Edition Value, Throw ERROR
						//Ignore inactive records
						var allCourseFlt = [new nlobjSearchFilter('custrecord_course_language', null, 'anyof', courseJson.language),
						                    new nlobjSearchFilter('custrecord_course_item', null, 'anyof', courseJson.item),
						                    new nlobjSearchFilter('custrecord_course_topic', null, 'anyof', courseJson.topic)];

						//Need to default empty edition to -1 to sort correctly
						var formulaNumberCol = new nlobjSearchColumn('formulanumeric', null, null);
						formulaNumberCol.setFormula("NVL({custrecord_course_edition}, -1)");

						var allCourseCol = [new nlobjSearchColumn('internalid'),
						                    formulaNumberCol.setSort(true),
						                    new nlobjSearchColumn('custrecord_course_edition'),
						                    new nlobjSearchColumn('name')];

						var allCourseRs = nlapiSearchRecord('customrecord_course', null, allCourseFlt, allCourseCol);
						log('DEBUG', 'COURSE SEARCH RESULT SET', JSON.stringify(allCourseRs));

						//Throw Error if NOTHING is returned
						if (!allCourseRs)
						{
							throw nlapiCreateError('COURSEMOD-ERR', 'NO Results Found with matching Language, Item and Topic', false);
						}

						//loop through and identify primary and previous.
						for (var e=0; e < allCourseRs.length; e+=1)
						{
							log('debug','e','what is e: '+e);
							//If very first record is missing Edition, throw error
							if (e==0 && !allCourseRs[e].getValue('custrecord_course_edition'))
							{
								throw nlapiCreateError('COURSEMOD-ERR',
													   'Primary/Previous Course Search Error: '+
													   'Course ID '+allCourseRs[e].getValue('internalid')+
													   ' is missing Edition value',
													   false);
							}

							//All is good identify the the critical elements
							if (e==0)
							{
								//VERY first record, this is the new Primary
								courseJson.primary = allCourseRs[e].getValue('internalid');
								courseJson.primaryname = allCourseRs[e].getValue('name');
								courseJson.primaryedition = allCourseRs[e].getValue('custrecord_course_edition');
							}
							else
							{
								courseJson.previous.push(allCourseRs[e].getValue('internalid'));
							}
						}
					}
					else
					{
						log('debug','Using provided primary and previous','Using provided Primary/Previous Logic');
					}

					//---------------------------------------------------------------------------------------------

					//2. At this point, we Assume Primary and previous courses are identified
					//	 Next step is to identify ALL Booking records linked to previous courses
					//	 And run UPDATE to point to Primary Course
					var emailSbj = 'Course ID '+courseJson.id+' Modified',
						emailMsg = 'Process META Data:<br/>'+
								   'Updated/Created Course Name (ID): '+courseJson.name+' ('+courseJson.id+')<br/>'+
								   'Primary Course ID: '+courseJson.primary+'<br/>'+
								   'Primary Course Name: '+courseJson.primaryname+'<br/>'+
								   'Primary Course Edition: '+courseJson.primaryedition+'<br/>'+
								   'Previous Course IDs: '+courseJson.previous.toString(),

						csvHeader = '"Status","Booking ID","Booking Name","Booking Owner","Actual End Date","Item","Client","Old Course/ID","New Course/ID","Coach"\n',
						failedCsvBody = '',
						successCsvBody = '';

					if (courseJson.previous.length > 0)
					{
						//3.Execute Search to grab list of ALL booking associated with previous course list
						var bookFlt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
						               new nlobjSearchFilter('enddate', null, 'onorafter','today'),
						               new nlobjSearchFilter('custentity_bo_iseditionrequested', null, 'is','F'),
						               new nlobjSearchFilter('custentity_bo_packshippingdate', null, 'isempty',''),
						               new nlobjSearchFilter('custentity_bo_course', null, 'anyof', courseJson.previous)];

						//if last processed booking id is passed in from reschedlue, pick up where it left off
						if (paramLastProcBookingId)
						{
							bookFlt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcBookingId));
						}

						var bookCol = [
						               new nlobjSearchColumn('internalid').setSort(true), //Booking ID
						               new nlobjSearchColumn('altname'), //Booking Name
						               new nlobjSearchColumn('custentity_bo_owner'), //Owner
						               new nlobjSearchColumn('enddate'), //Actual End Date
						               new nlobjSearchColumn('custentity_bo_item'), //Item
						               new nlobjSearchColumn('custentity_bo_coach'), //Coach
						               new nlobjSearchColumn('custentity_bo_course'), //Original Coach
						               new nlobjSearchColumn('customer'), //Client Account
						               ];

						var bookRs = nlapiSearchRecord('job', null, bookFlt, bookCol);

						//if there re no results, generate email body appropriately
						if (!bookRs)
						{
							emailMsg = 'No Bookings Found with course matching Previous Course ID(s)<br/><br/>'+
									   emailMsg;
						}
						else
						{
							//4. THIS IS THE MEAT! ----------- Loop through Each Booking and run upate.
							//		Make sure to track success and failures into designated variables
							//		Reschedule if running out of Governance limit
							//		MUST Pass in:
							//			- Last Processed Booking ID
							//			- Stringified comma separated list of Previous Booking IDs
							//			- Primary Booking ID
							for (var bk=0; bk < bookRs.length; bk+=1)
							{
								log('debug','Booking ID',bookRs[bk].getValue('internalid'));
								try
								{

									nlapiSubmitField('job', bookRs[bk].getValue('internalid'), 'custentity_bo_course', courseJson.primary, true);

									//Add to Success CSV Body
									//csvHeader = '"Status","Booking ID","Booking Name","Booking Owner","Actual End Date","Item","Client","Old Course/ID","New Course/ID","Coach"\n',
									successCsvBody += '"Success",'+
													  '"'+bookRs[bk].getValue('internalid')+'",'+
													  '"'+bookRs[bk].getValue('altname')+'",'+
													  '"'+bookRs[bk].getText('custentity_bo_owner')+'",'+
													  '"'+bookRs[bk].getValue('enddate')+'",'+
													  '"'+bookRs[bk].getText('custentity_bo_item')+'",'+
													  '"'+bookRs[bk].getText('customer')+'",'+
													  '"'+bookRs[bk].getText('custentity_bo_course')+'/'+bookRs[bk].getValue('custentity_bo_course')+'",'+
													  '"'+courseJson.primaryname+'/'+courseJson.primary+'",'+
													  '"'+bookRs[bk].getText('custentity_bo_coach')+'"\n';
									log('debug','Booking ID '+bookRs[bk].getValue('internalid'),'Updated Successfully');
									nlapiSubmitField('customrecord_course', courseId, 'custrecord_course_edition_update_date', '');
								}
								catch (bookupderr)
								{
									//csvHeader = '"Status","Booking ID","Booking Name","Booking Owner","Actual End Date","Item","Client","Old Course/ID","New Course/ID","Coach"\n',
									failedCsvBody += '"Failed // '+getErrText(bookupderr)+'",'+
													 '"'+bookRs[bk].getValue('internalid')+'",'+
													 '"'+bookRs[bk].getValue('altname')+'",'+
													 '"'+bookRs[bk].getText('custentity_bo_owner')+'",'+
													 '"'+bookRs[bk].getValue('enddate')+'",'+
													 '"'+bookRs[bk].getText('custentity_bo_item')+'",'+
													 '"'+bookRs[bk].getText('customer')+'",'+
													 '"'+bookRs[bk].getText('custentity_bo_course')+'/'+bookRs[bk].getValue('custentity_bo_course')+'",'+
													 '"'+courseJson.primaryname+'/'+courseJson.primary+'",'+
													 '"'+bookRs[bk].getText('custentity_bo_coach')+'"\n';

									log('debug','Booking ID '+bookRs[bk].getValue('internalid'),'Update Failed');
								}

								//Reschedule logic here ----------------------
								//Set % completed of script processing
								var pctCompleted = Math.round(((bk+1) / bookRs.length) * 100);
								nlapiGetContext().setPercentComplete(pctCompleted);

								if ((bk+1)==1000 || ((bk+1) < bookRs.length && nlapiGetContext().getRemainingUsage() < 500))
								{
									//reschedule
									log('audit','Getting Rescheduled at', bookRs[bk].getValue('internalid'));
									var rparam = new Object();
									rparam['custscript_sb348_courseid'] = paramCourseId;
									rparam['custscript_sb348_lastprocbookid'] = bookRs[bk].getValue('internalid');
									rparam['custscript_sb348_primecourse'] = courseJson.primary;
									rparam['custscript_sb348_primename'] = courseJson.primaryname;
									rparam['custscript_sb348_primeedition'] = courseJson.primaryedition;
									rparam['custscript_sb348_previouscourseids'] = courseJson.previous.toString();

									nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
									break;
								}
							}



							emailMsg = 'Found total of '+bookRs.length+' to process. You may recieve more than one email depending on the size.<br/>'+
									   'Attached are CSV files representing Successful and/or Failed Booking Updates<br/><br/>'+
									   emailMsg;
						}
					}
					else
					{
						emailMsg = 'No Previous Cours(es) were found. No Need to run Update<br/><br/>'+
								   emailMsg;
					}

					log('debug','Final emailMsg', emailMsg);

					//TESTING
					log('debug','THIS Course Info',JSON.stringify(courseJson));

					//Generate Email Notification
					var arFiles = [];
					if (successCsvBody)
					{
						arFiles.push(nlapiCreateFile('SuccessfulBookingUpdates.csv', 'CSV', csvHeader+successCsvBody));
					}

					if (failedCsvBody)
					{
						arFiles.push(nlapiCreateFile('FailedBookingUpdates.csv', 'CSV', csvHeader+failedCsvBody));
					}

					nlapiSendEmail(-5, paramPrimaryNotifier, emailSbj, emailMsg, paramAddrNotifier, null, null, arFiles, null, null, null);


				}
				catch (procerr)
				{
					log('error','Unable to Process Course',getErrText(procerr)+' // '+JSON.stringify(courseJson));
					//Generate Error Email
					var errSbj = 'Error occured while trying to process Update of Course ID '+paramCourseId,
						errMsg = 'Following Error occured for course ID '+paramCourseId+
								 '<br/><br/>'+
								 getErrText(procerr)+
								 '<br/><br/>'+
								 'JSON Object: <br/>'+
								 JSON.stringify(courseJson);

					nlapiSendEmail(-5, paramPrimaryNotifier, errSbj, errMsg, paramAddrNotifier);

				}
			}
		}
	}


}

/**
 * User Event to track changes in Edition value
 * This is automated version where it will trigger IF editioin values are different.
 * Commenting it out because Client wanted it to be triggered via button
 * Keeping code base just in case they want to bring it back

function afterSubmitCourseMod(type)
{
	var canProcess = false;

	var newrec = nlapiGetNewRecord();
	var oldrec = nlapiGetOldRecord();

	if (type=='delete')
	{
		//Don't process if it's delete just return out
		return;
	}
	else if (type=='create' && newrec.getFieldValue('custrecord_course_edition'))
	{
		//Automatic process since they are
		//CREATE: NEW and has a value for Edition
		canProcess = true;
	}
	else if (type=='xedit')
	{
		//This part is xedit and MUST be checked to see if this field was modified
		var allFields = newrec.getAllFields();
		for (var af = 0; allFields && af < allFields.length; af+=1)
		{
			if (allFields[af] == 'custrecord_course_edition' && newrec.getFieldValue('custrecord_course_edition'))
			{
				log('debug','xedit field check',allFields[af]);
				canProcess = true;
			}
		}
	}
	else
	{
		//This is edit we need to make sure to ONLY process when values are different
		if (newrec.getFieldValue('custrecord_course_edition') &&
			newrec.getFieldValue('custrecord_course_edition') != oldrec.getFieldValue('custrecord_course_edition'))
		{
			canProcess = true;
		}
	}

	//-----------If we can process at this point, Queue it up by passing in THIS course ID
	log('debug','Final canProcess',canProcess);
	if (canProcess)
	{
		//Queue it up here
		nlapiScheduleScript('customscript_aux_ss_courseeditionupdproc', null, {'custscript_sb348_courseid':nlapiGetRecordId()});
	}
}
 */
