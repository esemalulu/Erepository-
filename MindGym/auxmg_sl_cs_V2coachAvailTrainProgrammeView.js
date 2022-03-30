/**
 * UI Suitelet that gives users ability to view invitiation status from Training Programme
 * @param req
 * @param res
 */


var monthAbbr = {
	'1':'Jan',
	'2':'Feb',
	'3':'Mar',
	'4':'Apr',
	'5':'May',
	'6':'Jun',
	'7':'Jul',
	'8':'Aug',
	'9':'Sep',
	'10':'Oct',
	'11':'Nov',
	'12':'Dec'
};

//Maximum number of coaches allowed to be invited at one time
var MAX_INVITE_ALLOWED = 20;

function coachAvailTrainProgView(req, res)
{

	//If isiframe=T, hide main navigation bar
	var isIframe = false;
	if (req.getParameter('isiframe')=='T' || req.getParameter('custpage_isiframeval')=='T' || req.getParameter('custparam_isiframe') == 'T')
	{
		isIframe = true;
	}

	var nsform = nlapiCreateForm('Booking Invitation Status', isIframe);
	//nsform.setScript('customscript_aux_cs_coachavailtoolv2');

	//Hide a isiframe
	var isIframeValueFld = nsform.addField('custpage_isiframeval', 'checkbox', '', '', null);
	isIframeValueFld.setDisplayType('hidden');
	isIframeValueFld.setDefaultValue((isIframe)?'T':'F');

	//Grab search submissions
	var paramProgrammeId = (req.getParameter('custpage_progid')?req.getParameter('custpage_progid'):'');
	var paramProjectManager = (req.getParameter('custpage_owner')?req.getParameter('custpage_owner'):'');

	//9/21/2016
	//Add parameter values to get item and topic filter options
	var paramItemId = (req.getParameter('custpage_item')?req.getParameter('custpage_item'):''),
		paramTopicId = (req.getParameter('custpage_topic')?req.getParameter('custpage_topic'):''),
		paramBooksetId = (req.getParameter('custpage_bs')?req.getParameter('custpage_bs'):'');

	var procMsgFld = nsform.addField('custpage_procmsg', 'inlinehtml', '', null, null);
	procMsgFld.setLayoutType('outsideabove');

	try
	{
		nsform.addSubmitButton('Filter Bookings');
		nsform.addFieldGroup('custpage_grpa', 'Search Filter Options', null);
		//======= Filter Column A
		//Booking Owner (Co-ordinator)
		//Nov 25 2015 - Oli requested to have drop down filter to allow filter by booking based on owner
		var ownerFlt = nsform.addField('custpage_owner','select','Co-ordinator: ',null,'custpage_grpa');
		ownerFlt.setBreakType('startcol');

		var progfld = nsform.addField('custpage_progid','text','Training Programme ID: ', null, 'custpage_grpa');
		progfld.setDisplayType('hidden');
		progfld.setDefaultValue(paramProgrammeId);

		//9/21/2016
		//Add in filter by Item and Topic
		var itemFlt = nsform.addField('custpage_item', 'select','Item: ', null, 'custpage_grpa');
		itemFlt.setBreakType('startcol');

		var topicFlt = nsform.addField('custpage_topic', 'select','Topic: ', null, 'custpage_grpa');
		topicFlt.setBreakType('startcol');

		//10/6/2016
		//Request to add filter for Booking Sets
		var booksetFlt = nsform.addField('custpage_bs', 'select', 'Booking Set: ', null, 'custpage_grpa');
		booksetFlt.setBreakType('startcol');

		//Main JSON Object used to build UI
		var bookingJson = {},
			coachJson = {},
			coachGrpToIdJson = {},
			bookingDates = [];

		//******************************************** UI DISPLAY ********************************************************************************/

		if (paramProgrammeId)
		{
			//Sandbox Testing Method.
			var curDate = new Date();
			if (nlapiGetContext().getEnvironment() == 'SANDBOX')
			{
				curDate = new Date('1/1/2016');
			}

			//1. Grab list of ALL Bookings related to THIS Programme
			var bflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			            new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', paramProgrammeId),
			            //new nlobjSearchFilter('custentity_bo_coach', null, 'anyof','@NONE@'),
			            new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(curDate)),
			            new nlobjSearchFilter('jobtype', null, 'anyof', ['11','13']), //11 Face to Face, 13 Virtual
			            //9/30/2016
			            //Add in filter to NOT include cancelled (37), Completed (42) or Delivered (36) bookings
			            new nlobjSearchFilter('status', null, 'noneof', ['37','42','36'])],
			    //10/17/2016
			    //Change the sorting by Booking Date
			    bcol = [
			            new nlobjSearchColumn('internalid'), //Booking Internal ID
			            new nlobjSearchColumn('entityid'),
			            new nlobjSearchColumn('subsidiary'),
			            new nlobjSearchColumn('enddate').setSort(true),
			            new nlobjSearchColumn('custentity_bo_eventtime'),
			            new nlobjSearchColumn('custentity_bo_course'),
			            new nlobjSearchColumn('jobtype'),
			            new nlobjSearchColumn('custentity_bo_owner'),
			            //9/21/2016
			            //Request to add Item and Topic columns as well as filters
			            //Request to colorize value if booked against preferred coach
			            new nlobjSearchColumn('custentity_bo_coach'), //Coach on booking
			            new nlobjSearchColumn('custentity_bo_item'), //Item on booking
			            new nlobjSearchColumn('custentity_bo_topic'), //Topic on booking
			            //10/6/2016
			            //Request to add Booking Set Filter
			            new nlobjSearchColumn('custentity_ax_bookingset'), // Booking Set on Booking
			            //10/17/2016
			            //Add in request to add Booking Parent
			            new nlobjSearchColumn('custentity_bookingset_parent') //Booking parent
			            ];

			//9/21/2016
			//Need to add in filter by Option for Owner
			//	THIS seems like it's broken
			if (paramProjectManager)
			{
				bflt.push(new nlobjSearchFilter('custentity_bo_owner', null, 'anyof', paramProjectManager));
			}

			//Need to add in filter by Option for Item
			if (paramItemId)
			{
				bflt.push(new nlobjSearchFilter('custentity_bo_item', null, 'anyof', paramItemId));
			}

			//Need to add in filter by Option. Filter by Owner seems to be broken
			if (paramTopicId)
			{
				bflt.push(new nlobjSearchFilter('custentity_bo_topic', null, 'anyof', paramTopicId));
			}

			//10/6/2016
			if (paramBooksetId)
			{
				bflt.push(new nlobjSearchFilter('custentity_ax_bookingset', null, 'anyof', paramBooksetId));
			}

			var brs = nlapiSearchRecord('job', null, bflt, bcol);

			bookingJson['list'] = [];

			//Nov 25 2015 - Track unique list of owners
			var ownerJson = {};

			//9/21/2016 - Track unique Item and Topic
			var itemJson = {},
				topicJson = {},
				//10/6/2016
				bookingsetJson = {};

			//add in empty option on the owner filter field
			ownerFlt.addSelectOption('', ' - Display All - ', true);

			//9/21/2016
			//Add in empty option for item and topic filter fields.
			itemFlt.addSelectOption('', ' - Display All - ', true);
			topicFlt.addSelectOption('', ' - Display All - ', true);

			//10/6/2016
			//Add in empty option for booking set
			booksetFlt.addSelectOption('', ' - Display All - ', true);

			//10/6/2016
			//We need to run original booking search without any additional filters.
			//This is so that the drop down can be built not based on filtered list but original
			//1. Grab list of ALL Bookings related to THIS Programme
			var oflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			            new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', paramProgrammeId),
			            //new nlobjSearchFilter('custentity_bo_coach', null, 'anyof','@NONE@'),
			            new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(curDate)),
			            new nlobjSearchFilter('jobtype', null, 'anyof', ['11','13']), //11 Face to Face, 13 Virtual
			            //9/30/2016
			            //Add in filter to NOT include cancelled (37), Completed (42) or Delivered (36) bookings
			            new nlobjSearchFilter('status', null, 'noneof', ['37','42','36'])],
			    ocol = [
			            new nlobjSearchColumn('custentity_bo_owner'),
			            new nlobjSearchColumn('custentity_bo_item'), //Item on booking
			            new nlobjSearchColumn('custentity_bo_topic'), //Topic on booking
			            new nlobjSearchColumn('custentity_ax_bookingset') // Booking Set on Booking
			            ],
			    ors = nlapiSearchRecord('job', null, oflt, ocol);

			for (var o=0; ors && o < ors.length; o+=1)
			{
				if (ors[o].getValue('custentity_bo_owner') && !ownerJson[ors[o].getValue('custentity_bo_owner')])
				{
					ownerJson[ors[o].getValue('custentity_bo_owner')] = ors[o].getText('custentity_bo_owner');
					ownerFlt.addSelectOption(
						ors[o].getValue('custentity_bo_owner'),
						ors[o].getText('custentity_bo_owner'),
						false
					);
				}

				//9/21/2016
				//Populate itemJson/itemFlt and topicJson/topicFlt objects
				if (ors[o].getValue('custentity_bo_item') && !itemJson[ors[o].getValue('custentity_bo_item')])
				{
					itemJson[ors[o].getValue('custentity_bo_item')] = ors[o].getText('custentity_bo_item');
					itemFlt.addSelectOption(
						ors[o].getValue('custentity_bo_item'),
						ors[o].getText('custentity_bo_item'),
						false
					);
				}

				if (ors[o].getValue('custentity_bo_topic') && !topicJson[ors[o].getValue('custentity_bo_topic')])
				{
					topicJson[ors[o].getValue('custentity_bo_topic')] = ors[o].getText('custentity_bo_topic');
					topicFlt.addSelectOption(
						ors[o].getValue('custentity_bo_topic'),
						ors[o].getText('custentity_bo_topic'),
						false
					);
				}

				//10/6/2016
				//Populate Booking Set info
				if (ors[o].getValue('custentity_ax_bookingset') && !bookingsetJson[ors[o].getValue('custentity_ax_bookingset')])
				{
					bookingsetJson[ors[o].getValue('custentity_ax_bookingset')] = ors[o].getText('custentity_ax_bookingset');
					booksetFlt.addSelectOption(
						ors[o].getValue('custentity_ax_bookingset'),
						ors[o].getText('custentity_ax_bookingset'),
						false
					);
				}
			}

			//Now run through filtered booking list
			for (var b=0; brs && b < brs.length; b+=1)
			{
				//9/21/2016
				//paramProjectManager logic taken out so that filtering can be done
				//	at booking search level
				//if (!paramProjectManager || (paramProjectManager == brs[b].getValue('custentity_bo_owner')))
				//{
				if (!bookingJson['list'].contains(brs[b].getValue('internalid')))
				{
					bookingJson['list'].push(brs[b].getValue('internalid'));
				}

				bookingJson[brs[b].getValue('internalid')]={
					//10/17/2016
					//Booking Parent ID
					'parentid':brs[b].getValue('custentity_bookingset_parent'),
					'parenttext':brs[b].getText('custentity_bookingset_parent'),
					'entityid':brs[b].getValue('entityid'),
					'subsidiaryid':brs[b].getValue('subsidiary'),
					'subsidiarytext':brs[b].getText('subsidiary'),
					'enddate':brs[b].getValue('enddate'),
					'time':brs[b].getValue('custentity_bo_eventtime'),
					'courseid':brs[b].getValue('custentity_bo_course'),
					'coursetext':brs[b].getText('custentity_bo_course'),
					'jobtypeid':brs[b].getValue('jobtype'),
					'jobtypetext':brs[b].getText('jobtype'),
					//9/21/2016
					//Add in Coach info
					'coachid':brs[b].getValue('custentity_bo_coach'),
					'coachtext':brs[b].getText('custentity_bo_coach'),
					//9/21/2016
					//Addin item and topic info
					'itemid':brs[b].getValue('custentity_bo_item'),
					'itemtext':brs[b].getText('custentity_bo_item'),
					'topicid':brs[b].getValue('custentity_bo_topic'),
					'topictext':brs[b].getText('custentity_bo_topic'),
					'invited':[],
					//{[coachGroupId]:{},[coachGroupId]:{},[coachGroupId]:{},}
					'response':{}
				};

				//Add to bookingDates
				if (brs[b].getValue('enddate'))
				{
					bookingDates.push(brs[b].getValue('enddate'));
				}
				//}
			}

			ownerFlt.setDefaultValue(paramProjectManager);
			if (!paramProjectManager)
			{
				//default to currently logged in user
				ownerFlt.setDefaultValue(nlapiGetUser());
			}

			//9/21/2016
			//set default value for itemFlt and topicFlt
			itemFlt.setDefaultValue(paramItemId);
			topicFlt.setDefaultValue(paramTopicId);

			//10/6/2016
			booksetFlt.setDefaultValue(paramBooksetId);

			//Sort bookingDates
			if (bookingDates.length > 0)
			{
				bookingDates.sort(function(a, b){return nlapiStringToDate(a)-nlapiStringToDate(b)});
			}
			//2. Grab list of all Selected coaches from Programme
			var progrec = nlapiLoadRecord('customrecord_trainingprogramme',paramProgrammeId),
				selectedCoaches = progrec.getFieldValues('custrecord_tp_selectedcoaches');

			var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', selectedCoaches)],
				ccol = [new nlobjSearchColumn('internalid'),
				        new nlobjSearchColumn('entityid'),
				        new nlobjSearchColumn('subsidiary'),
				        new nlobjSearchColumn('custentity_coach_groupingname'),
				        new nlobjSearchColumn('custentity_coach_isvirtualcertified')];

			var	crs = null;

			if (selectedCoaches)
			{
				crs = nlapiSearchRecord('vendor', null, cflt, ccol);
			}

			coachJson['list'] = [];
			for (var c=0; crs && c < crs.length; c+=1)
			{
				if (!coachJson['list'].contains(crs[c].getValue('internalid')))
				{
					coachJson['list'].push(crs[c].getValue('internalid'));
				}

				coachJson[crs[c].getValue('internalid')] = {
					'entityid':crs[c].getValue('entityid'),
					'subsidiaryid':crs[c].getValue('subsidiary'),
					'subsidiarytext':crs[c].getText('subsidiary'),
					'groupid':crs[c].getValue('custentity_coach_groupingname'),
					'grouptext':crs[c].getText('custentity_coach_groupingname'),
					'virtual':( (crs[c].getValue('custentity_coach_isvirtualcertified')=='T')?true:false),
					//Booking counts per each Booking Date
					'bookcount':{}
				};

				//Build out Group ID to Coach Internal ID
				//This is used to identify Coach (Vendor) Internal ID when attempting to identify Response
				coachGrpToIdJson[crs[c].getValue('custentity_coach_groupingname')] = crs[c].getValue('internalid');
			}

			//RUN ONLY OF both Booking and Coach Info exists
			if (coachJson['list'].length > 0 && bookingJson['list'].length > 0)
			{
				log('debug','booking date',bookingDates);
				//3. Grab number of bookings for selected coaches for booking date

				var bcntflt = [new nlobjSearchFilter('enddate','custentity_bo_coach','within',bookingDates[0], bookingDates[(bookingDates.length-1)]),
				               new nlobjSearchFilter('isinactive','custentity_bo_coach','is','F'),
				               new nlobjSearchFilter('internalid', null, 'anyof', selectedCoaches)];

				var bcntcol = [
				               new nlobjSearchColumn('internalid'), //Coach Internalid
				               new nlobjSearchColumn('enddate','custentity_bo_coach'), //Booking Start Date
				               ];

				var bcntrs = nlapiSearchRecord('vendor',null,bcntflt, bcntcol);
				//Loop through all bookings by coaches and identify total number of bookings for that coach on the booking date
				for (var bc=0; bcntrs && bc < bcntrs.length; bc+=1)
				{
					var rsBookDate = bcntrs[bc].getValue('enddate','custentity_bo_coach'),
						rsCoachId = bcntrs[bc].getValue('internalid');

					//Check to see if THIS rsBookDate is one of dates in Booking in the matrix.
					//	- This check is necessary because we are doing a range search based on All Bookings associated with TP.
					if (bookingDates.contains(rsBookDate))
					{
						//if bookcount in coachJson doesn't exist for this date, create one
						if (!coachJson[rsCoachId].bookcount[rsBookDate])
						{
							coachJson[rsCoachId].bookcount[rsBookDate]=0;
						}

						coachJson[rsCoachId].bookcount[rsBookDate]=parseInt(coachJson[rsCoachId].bookcount[rsBookDate]) + 1;
					}
				}


				//4. Grab list of current invitation list by booking and vendor IDs (NOT Group ID)
				var invitflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				                new nlobjSearchFilter('custrecord_bo_coachpool_bookingid', null, 'anyof', bookingJson['list']),
				                new nlobjSearchFilter('custrecord_bo_coachpool_coachname', null, 'anyof', coachJson['list'])];

				var invitcol = [new nlobjSearchColumn('internalid'),
				                new nlobjSearchColumn('custrecord_bo_coachpool_bookingid'),
				                new nlobjSearchColumn('custrecord_bo_coachpool_coachname')];

				var invitrs = nlapiSearchRecord('customrecord_bo_coachpool', null, invitflt, invitcol);

				for (var iv=0; invitrs && iv < invitrs.length; iv+=1)
				{
					//go through each invitation and add to booking JSON
					var ivBookingId = invitrs[iv].getValue('custrecord_bo_coachpool_bookingid');
					var ivCoachId = invitrs[iv].getValue('custrecord_bo_coachpool_coachname');

					if (bookingJson[ivBookingId])
					{
						bookingJson[ivBookingId].invited.push(ivCoachId);
					}
				}

				//5. Response should search for matching booking reference and ONLY return out latest response
				var respflt = [
				               new nlobjSearchFilter('custrecord_coachres_bookingref', null, 'anyof',bookingJson['list']),
				               new nlobjSearchFilter('isinactive', null, 'is','F'),
				               new nlobjSearchFilter('custrecord_coachres_userid', null, 'noneof', '@NONE@')
				               ];

				var respcol = [
				               new nlobjSearchColumn('custrecord_coachres_mongocreatedat', null, 'max').setSort(true),
				               new nlobjSearchColumn('custrecord_coachres_bookingref', null, 'group'),
				               new nlobjSearchColumn('custrecord_coachres_userid', null, 'group'),
				               new nlobjSearchColumn('custrecord_coachres_resp_choice', null, 'group'),
					           new nlobjSearchColumn('custrecord_coachres_notes', null, 'group'),
					           new nlobjSearchColumn('custrecord_coachres_course', null, 'group'), //Course Internal ID
					           new nlobjSearchColumn('custrecord_coachres_coursetext', null, 'group'), //Course TEXT as stored in MongoDB
					           new nlobjSearchColumn('custrecord_coachres_booking_date', null, 'group'), //Booking Date value from MongoDB
					           new nlobjSearchColumn('custrecord_coachres_booking_time', null, 'group') //Booking Time value from MongoDB
				              ];
				var resprs = nlapiSearchRecord('customrecord_coach_response', null, respflt, respcol);
				//Collect Response User ID
				var respUserIds = [];
				for (var r=0; resprs && r < resprs.length; r+=1)
				{
					if (!respUserIds.contains())
					{
						respUserIds.push(resprs[r].getValue('custrecord_coachres_userid', null, 'group'));
					}
				}

				//There are responses. Continue
				if (respUserIds.length > 0)
				{
					var rvflt = [new nlobjSearchFilter('custentity_user', null, 'anyof', respUserIds),
					             new nlobjSearchFilter('custentity_coach_groupingname', null, 'isnotempty','')];
					var rvcol = [new nlobjSearchColumn('custentity_coach_groupingname', null, 'group'),
					             new nlobjSearchColumn('custentity_user', null, 'group')];
					var rvrs = nlapiSearchRecord('vendor', null, rvflt, rvcol);

					//JSON object to map User ID to Coach Group ID
					var userIdToGroupJson = {};
					for (var rv=0; rv < rvrs.length; rv+=1)
					{
						userIdToGroupJson[rvrs[rv].getValue('custentity_user', null, 'group')] = rvrs[rv].getValue('custentity_coach_groupingname', null, 'group');
					}

					log('debug','resp user ids', respUserIds+' // JSON Map: '+JSON.stringify(userIdToGroupJson));

					//Now we have user ID from responses matched up with Coach Group ID, we can now update the responseinfo object
					/**
					 *
					 bookingJson[brs[b].getValue('internalid')]={
						'entityid':brs[b].getValue('entityid'),
						'subsidiaryid':brs[b].getValue('subsidiary'),
						'subsidiarytext':brs[b].getText('subsidiary'),
						'enddate':brs[b].getValue('enddate'),
						'time':brs[b].getValue('custentity_bo_eventtime'),
						'courseid':brs[b].getValue('custentity_bo_course'),
						'coursetext':brs[b].getText('custentity_bo_course'),
						'coachid':brs[b].getValue('custentity_bo_coach'),
						'coachtext':brs[b].getText('custentity_bo_coach'),
						'itemid':brs[b].getValue('custentity_bo_item'),
						'itemtext':brs[b].getText('custentity_bo_item'),
						'topicid':brs[b].getValue('custentity_bo_topic'),
						'topictext':brs[b].getText('custentity_bo_topic'),
						'invited':[],
						'response':{
							[coachId]:{
								'choiceid':'',
								'choicetext':'',
								'notes':'',
								'valid':false/true,
								'reason':''
							},
							[coachId]:{}
						}
					 };
					 */
					for (var r=0; resprs && r < resprs.length; r+=1)
					{
						var resUserId = resprs[r].getValue('custrecord_coachres_userid', null, 'group'),
							resChoiceId = resprs[r].getValue('custrecord_coachres_resp_choice', null, 'group'),
							resChoiceText = resprs[r].getText('custrecord_coachres_resp_choice', null, 'group'),
							resNotes = resprs[r].getValue('custrecord_coachres_notes', null, 'group'),
							resCourseId = resprs[r].getValue('custrecord_coachres_course', null, 'group'),
							resCourseText = resprs[r].getValue('custrecord_coachres_coursetext', null, 'group'),
							resBookDate = resprs[r].getValue('custrecord_coachres_booking_date', null, 'group'),
							resBookTime = resprs[r].getValue('custrecord_coachres_booking_time', null, 'group'),
							resBookId = resprs[r].getValue('custrecord_coachres_bookingref', null, 'group'),
							resGrpId = userIdToGroupJson[resUserId];

						if (resGrpId && coachGrpToIdJson[resGrpId] && bookingJson[resBookId])
						{
							//Need to see if THIS response is VALID
							var resIsValid = true,
								invalidReason = '',
								mappedCoachId = coachGrpToIdJson[resGrpId];

							if (resBookTime)
							{
								resBookTime = resBookTime.toLowerCase();
							}

							//Start examining below 4 check points
							if (bookingJson[resBookId].enddate != resBookDate)
							{
								resIsValid = false;
								invalidReason = 'Booking date does not match';
							}
							else if (bookingJson[resBookId].time !=  resBookTime)
							{
								resIsValid = false;
								invalidReason = 'Booking time does not match';
							}
							//Invalid UC#3: If Course ID matches but Course TEXT is different
							else if (bookingJson[resBookId].coursetext != resCourseText)
							{
								resIsValid = false;
								invalidReason = 'Course Name does not match';
							}
							//Invalid UC#4: If Course ID is different
							else if (bookingJson[resBookId].courseid != resCourseId)
							{
								resIsValid = false;
								invalidReason = 'Course does not match';
							}

							//Add to Booking JSON Object
							if (!bookingJson[resBookId].response[mappedCoachId])
							{
								bookingJson[resBookId].response[mappedCoachId] = {
									'choiceid':resChoiceId,
									'choicetext':resChoiceText,
									'notes':resNotes,
									'valid':resIsValid,
									'reason':invalidReason
								};
							}
						}
					}
				}
			}

			//--------- Add in the Coach/Booking Invite Matrix View
			var matrixview = nsform.addSubList('custpage_mlist', 'list', 'Invitation Status', null);

			var helpTextHtml = '<table width="100%">'+
							   '<tr>'+
							   '<td><div style="width: 15px; height: 15px; background-color: green"> </div> No Deliveries</td>'+
							   '<td><div style="width: 15px; height: 15px; background-color: orange"> </div> 1 - 3 Deliveries</td>'+
							   '<td><div style="width: 15px; height: 15px; background-color: red"> </div> 4 or More Deliveries</td>'+
							   '</tr>'+
							   '</table>';
			matrixview.setHelpText(helpTextHtml);

			//10/17/2016
			//Add in parent booking
			matrixview.addField('custpage_parentbooking','textarea','Parent Booking', null).setDisplayType('inline');

			matrixview.addField('custpage_booking', 'textarea', 'Booking Info', null).setDisplayType('inline');
			//9/12/2016
			//Add in Item and Topic columns
			matrixview.addField('list_item','textarea', 'Item', null).setDisplayType('inline');
			matrixview.addField('list_topic','textarea', 'Topic', null).setDisplayType('inline');

			//Loop through and in each coach by name.
			var coachArray = coachJson.list;
			for (var cm=0; cm < coachArray.length; cm+=1)
			{
				var cmCoachid = coachArray[cm];
				matrixview.addField('custpage_coach'+cmCoachid, 'text', coachJson[cmCoachid].entityid, null);
			}

			//Add in booking value/link as Row
			var matrixline = 1;
			var bookingArray = bookingJson.list;
			for (var bm=0; bookingArray && bm < bookingArray.length; bm+=1)
			{
				var bmBookingid = bookingArray[bm],
					bmInvited = bookingJson[bmBookingid].invited,
					bmResponses = bookingJson[bmBookingid].response,
					bmEndDate = bookingJson[bmBookingid].enddate;

				//9/21/2016
				//Add in value for item and topic
				matrixview.setLineItemValue('list_item', matrixline, bookingJson[bmBookingid].itemtext);
				matrixview.setLineItemValue('list_topic', matrixline, bookingJson[bmBookingid].topictext);

				//Flag to indicate that it is booked and found the preferred coach
				var isBookedCoachFound = false;

				//Go through and add Status for each coach for THIS booking
				for (var cm=0; cm < coachArray.length; cm+=1)
				{
					log('debug','booking // coach // date',bmBookingid+' // '+coachArray[cm]+' // '+bmEndDate);
					var cmCoachid = coachArray[cm],
						matrixText = 'NO INV';

					if (bmInvited.contains(cmCoachid))
					{
						matrixText = 'INV';
					}

					//Go through to see if this person Responded
					if (bmResponses[cmCoachid])
					{
						matrixText = bmResponses[cmCoachid].choicetext;

						if (!bmResponses[cmCoachid].valid)
						{
							//Invalid response. Mark it
							matrixText = matrixText+',!!!';
						}
					}

					//------- Check and set Color of Text depending on availability---------
					// Default to GREEN
					var matrixTextDisplay = '<div style="font-weight:bold; font-size: 15px; color: green">'+
								 			matrixText+
								 			'</div>';
					//9/21/2016
					//Check for booked
					if (bookingJson[bmBookingid].coachid == cmCoachid)
					{
						matrixTextDisplay = '<div style="font-weight:bold; font-size: 15px; color: blue">'+
								 			'BOOKED'+
								 			'</div>';

						isBookedCoachFound = true;
					}
					else if(coachJson[cmCoachid].bookcount[bmEndDate])
					{
						log('debug','count',coachJson[cmCoachid].bookcount[bmEndDate]);
						if (parseInt(coachJson[cmCoachid].bookcount[bmEndDate]) >= 4)
						{
							matrixTextDisplay = '<div style="font-weight:bold; font-size: 15px; color: red">'+
										 	matrixText+
										 	'</div>';
						}
						else
						{
							matrixTextDisplay = '<div style="font-weight:bold; font-size: 15px; color: orange">'+
										 	matrixText+
										 	'</div>';
						}
					}


					matrixview.setLineItemValue('custpage_coach'+cmCoachid,matrixline,matrixTextDisplay);
				}

				//9/21/2016
				//Section moved to last. There will be some Booking that are booked (With Coach set)
				//	But the coach isn't one of preferred coaches.
				//	for These outsiders, we change the booking color instead to blue
				var bookingLinkText = '<a href="'+
									  nlapiResolveURL('RECORD','job', bmBookingid, 'VIEW')+
									  '" target="_blank">'+
									  bookingJson[bmBookingid].entityid+
									  '</a>'+
									  ' ('+
									  bmEndDate+
									  ')';

				//If this booking has a coach and
				//	Flag to indicate booked coach is found on display is FALSE
				//	we change display of the booking record
				if (bookingJson[bmBookingid].coachid && !isBookedCoachFound)
				{
					bookingLinkText = '<div style="font-weight:bold; font-size:13px; color: blue">'+
									  '<a href="'+
									  nlapiResolveURL('RECORD','job', bmBookingid, 'VIEW')+
									  '" target="_blank">'+
									  bookingJson[bmBookingid].entityid+
									  '</a>'+
									  ' ('+
									  bmEndDate+
									  ')<br/>'+
									  'BOOKED-'+
									  bookingJson[bmBookingid].coachtext+
									  '</div>';
				}

				matrixview.setLineItemValue('custpage_booking', matrixline, bookingLinkText);

				//10/17/2016
				//Add in link to Parent booking if set
				var parentBookingLinkText = '';
				if (bookingJson[bmBookingid].parentid)
				{
					parentBookingLinkText = '<a href="'+
											nlapiResolveURL('RECORD','job', bookingJson[bmBookingid].parentid, 'VIEW')+
											'" target="_blank">'+
											bookingJson[bmBookingid].parenttext+
											'</a>';
				}

				matrixview.setLineItemValue('custpage_parentbooking', matrixline, parentBookingLinkText);

				matrixline+=1;
			}


			log('debug','bjson/cjson',JSON.stringify(bookingJson)+' // '+JSON.stringify(coachJson));


		}
	}
	catch (overallerr)
	{
		log('error','Error Coach AVail Checker UI', getErrText(overallerr));
		procMsgFld.setDefaultValue(
			'<div style="color:red; font-weight:bold">'+
			'Error processing coach availability checker:<br/>'+
			getErrText(overallerr)+
			'</div>'
		);
	}

	log('debug','Left Over Usage',nlapiGetContext().getRemainingUsage());

	res.writePage(nsform);

}


//****************** Client Script *************************/
function availToolPageInit(type)
{
	//go through and disable the checkbox if already invited
	//nlapiSetLineItemDisabled('custpage_availls','avail_select',true,1);
	for (var al=1; al <= nlapiGetLineItemCount('custpage_availls'); al+=1)
	{
		//If already invited, disable the field
		if (nlapiGetLineItemValue('custpage_availls','avail_invitationinfo', al))
		{
			//Disable Invite
			nlapiSetLineItemDisabled('custpage_availls','avail_select',true,al);

			//Enable Uninvite ONLY if there are NO values on responded
			if (nlapiGetLineItemValue('custpage_availls','avail_hasresponse',al) != 'T')
			{
				nlapiSetLineItemDisabled('custpage_availls','avail_unselect',false,al);
			}
		}
	}

}

function availToolInviteCoaches()
{
	//Validation
	var totalLines = nlapiGetLineItemCount('custpage_availls'),
		//comma separated list of coach IDs
		strInviteList = '',
		//total selected by user
		totalSelectedByUser = 0;

	//Double check to make sure there were any mistakes on visual display of coach lines
	if (totalLines < 1)
	{
		alert('There are no coaches available to invite for this booking.');
		return false;
	}

	//MAX_INVITE_ALLOWED check to make sure number of checked doesn't exceed total allowed
	for (var c=1; c <= totalLines; c+=1)
	{
		if (nlapiGetLineItemValue('custpage_availls','avail_select',c)=='T' ||
			nlapiGetLineItemValue('custpage_availls','avail_unselect',c)=='T')
		{
			var coachId = nlapiGetLineItemValue('custpage_availls','avail_coachid',c),
				groupId = nlapiGetLineItemValue('custpage_availls','avail_groupid',c),
				userId = nlapiGetLineItemValue('custpage_availls','avail_userid',c),
				inviteId = (nlapiGetLineItemValue('custpage_availls','avail_invitationid',c)?nlapiGetLineItemValue('custpage_availls','avail_invitationid',c):'');

			var action = 'add';
			if (nlapiGetLineItemValue('custpage_availls','avail_unselect',c)=='T')
			{
				action = 'delete';
			}

			strInviteList += coachId+'||'+groupId+'||'+userId+'||'+action+'||'+inviteId+',';

			totalSelectedByUser += 1;

		}

		if (totalSelectedByUser > MAX_INVITE_ALLOWED)
		{
			alert(
				'You have selected more than '+
				MAX_INVITE_ALLOWED+
				' coaches to invite or uninvite. Please remove '+
				(totalSelectedByUser - MAX_INVITE_ALLOWED)+
				' some and try again'
			);
			return false;
		}
	}

	//If NONE Is selected, throw error
	if (totalSelectedByUser == 0)
	{
		alert('You must select atleast 1 coach to invite. Max allowed is '+MAX_INVITE_ALLOWED);
		return false;
	}

	//Build URL to Reload the page
	var slUrl = nlapiResolveURL(
					'SUITELET',
					'customscript_aux_sl_coachavailtoolv2',
					'customdeploy_aux_sl_coachavailtoolv2',
					'VIEW'
				);

	//remove last comma
	strInviteList = strInviteList.substr(0, (strInviteList.length-1) );

	slUrl += '&custpage_bookingid='+nlapiGetFieldValue('custpage_bookingid')+
			 '&custpage_subsidiary='+nlapiGetFieldValue('custpage_subsidiary')+
			 '&custpage_country='+nlapiGetFieldValue('custpage_country')+
			 '&custpage_language='+nlapiGetFieldValue('custpage_language')+
			 '&custpage_isvirtual='+nlapiGetFieldValue('custpage_isvirtual')+
			 '&custpage_fromdate='+nlapiGetFieldValue('custpage_fromdate')+
			 '&custpage_todate='+nlapiGetFieldValue('custpage_todate')+
			 '&custpage_apperyid='+nlapiGetFieldValue('custpage_apperyid')+
			 '&invitecoaches='+strInviteList;

	window.ischanged = false;
	window.location = slUrl;
}

/**** Deleted code snippets ****/
/**
var soLinkText = '<a href="'+
				 ''+
				 '" target="_blank">View Coach'+
				 liners[l].getValue('tranid')+
				 '</a>';
*/

/**
 * Request to be removed List of Coach for THIS Coach Grouping Name but keeping the code base in JUST IN CASE
var coachInfoText = '<table>';
log('debug','internalids',JSON.stringify(availJson[l].internalids));
for (var cc in availJson[l].internalids)
{
	var vjson = availJson[l].internalids[cc];
	var linkText = '<a href="'+
				   nlapiResolveURL('RECORD', 'vendor', cc, 'VIEW')+
				   '" target="_blank">'+
				   vjson.name+' [ID '+cc+']'+
				   '</a>';
	coachInfoText += '<tr>'+
					 '<td>'+linkText+'</td>'+
					 '</tr>';
}
coachInfoText += '</table>';
*/
