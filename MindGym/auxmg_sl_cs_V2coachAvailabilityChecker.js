/**
 * UI Suitelet that gives users ability to search for available coaches based series of filters.
 * Version 2 of Coach Availability Checker that will now Integrate with Coach Pool (Invitation) and Coach Response
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

function coachAvailCheckerV2(req, res)
{

	//If isiframe=T, hide main navigation bar
	var isIframe = false;
	if (req.getParameter('isiframe')=='T' || req.getParameter('custpage_isiframeval')=='T' || req.getParameter('custparam_isiframe') == 'T')
	{
		isIframe = true;

	}

	var nsform = nlapiCreateForm('MindGym Coach Availability/Booking Tool', isIframe);
	nsform.setScript('customscript_aux_cs_coachavailtoolv2');

	//Hide a isiframe
	var isIframeValueFld = nsform.addField('custpage_isiframeval', 'checkbox', '', '', null);
	isIframeValueFld.setDisplayType('hidden');
	isIframeValueFld.setDefaultValue((isIframe)?'T':'F');

	var procMsgFld = nsform.addField('custpage_procmsg', 'inlinehtml', '', null, null);
	procMsgFld.setLayoutType('outsideabove');

	//Grab search submissions

	//Nov. 18 2015 - Add in parameter to grab Training Programme on Booking Record.
	//				 If Training Programme is pass in, Disable all filter option and remove search availability.
	//				 Display will ONLY show list of coaches from Selected Coaches on the Training Program Record
	var paramTpId = (req.getParameter('custpage_progid')?req.getParameter('custpage_progid'):''),
		paramIsParent = (req.getParameter('custpage_isparent')?req.getParameter('custpage_isparent'):''),
		paramChildIds = (req.getParameter('custpage_childids')?req.getParameter('custpage_childids'):''),
		paramBookingId = (req.getParameter('custpage_bookingid')?req.getParameter('custpage_bookingid'):''),
		paramSubsidiary = (req.getParameter('custpage_subsidiary')?req.getParameter('custpage_subsidiary'):''),
		paramCoachCountry = (req.getParameter('custpage_country')?req.getParameter('custpage_country'):''),
		paramCoachLanguage = (req.getParameter('custpage_language')?req.getParameter('custpage_language'):''),
		paramCoachIsVirtual = (req.getParameter('custpage_isvirtual')=='T'?'T':'F'),
		paramFromDate = (req.getParameter('custpage_fromdate')?req.getParameter('custpage_fromdate'):''),
		paramToDate=(req.getParameter('custpage_todate')?req.getParameter('custpage_todate'):''),
		paramApperyId = (req.getParameter('custpage_apperyid')?req.getParameter('custpage_apperyid'):''),
		paramBookingDate = (req.getParameter('custpage_bookingdate')?req.getParameter('custpage_bookingdate'):''),
		paramBookingTime = (req.getParameter('custpage_bookingtime')?req.getParameter('custpage_bookingtime').toLowerCase():''),
		paramCourseId = (req.getParameter('custpage_courseid')?req.getParameter('custpage_courseid'):''),
		paramCourseText = (req.getParameter('custpage_coursetext')?req.getParameter('custpage_coursetext'):''),
		paramCoachId = (req.getParameter('custpage_coachid')?req.getParameter('custpage_coachid'):'');

	//8/11/2016 - If isIframe is false, we need to grab other information directly from
	//			  Booking Record Loaded
	if (!isIframe && paramBookingId)
	{
		var thisBookRec = nlapiLoadRecord('job',paramBookingId);
		paramSubsidiary = thisBookRec.getFieldValue('subsidiary');
		paramFromDate = thisBookRec.getFieldValue('enddate');
		paramToDate = thisBookRec.getFieldValue('enddate');
	}

	//This is passed in when SL is done processing invitation.
	var paramProcMsg = (req.getParameter('custparam_procmsg')?req.getParameter('custparam_procmsg'):'');
	if (paramProcMsg)
	{
		//Since it was redirected look for custparam_ parameter.
		//This is NS limitation when it's being redirected via nlapiSetRedirect, parameters MUST be in custparam_ format

		//Nov 18 2015 - add in training programme ID (paramTpId)
		paramTpId = req.getParameter('custparam_progid');
		paramBookingId = req.getParameter('custparam_bookingid');
		paramIsParent = req.getParameter('custparam_isparent');
		paramChildIds = req.getParameter('custparam_childids');
		paramSubsidiary = req.getParameter('custparam_subsidiary');
		paramCoachCountry = req.getParameter('custparam_country');
		paramCoachLanguage = req.getParameter('custparam_language');
		paramCoachIsVirtual = (req.getParameter('custparam_isvirtual')=='T'?'T':'F');
		paramFromDate = req.getParameter('custparam_fromdate');
		paramToDate = req.getParameter('custparam_todate');
		paramApperyId = req.getParameter('custparam_apperyid');
		paramBookingDate = (req.getParameter('custparam_bookingdate')?req.getParameter('custparam_bookingdate'):'');
		paramBookingTime = (req.getParameter('custparam_bookingtime')?req.getParameter('custparam_bookingtime').toLowerCase():'');
		paramCourseId = (req.getParameter('custparam_courseid')?req.getParameter('custparam_courseid'):'');
		paramCourseText = (req.getParameter('custparam_coursetext')?req.getParameter('custparam_coursetext'):'');
		paramCoachId = (req.getParameter('custparam_coachid')?req.getParameter('custparam_coachid'):'');

		var textColor = 'color: green';
		if (paramProcMsg.indexOf('Error') > -1)
		{
			textColor = 'color: red';
		}
		procMsgFld.setDefaultValue(
			'<div style="font-size: 14px; font-weight: bold; '+textColor+'">'+
			paramProcMsg+
			'</div>'
		);
	}

	var bookRec = null;

	try
	{
		if (paramIsParent == 'T')
		{
			bookRec = nlapiLoadRecord('job',paramBookingId);
		}

		//================= PROCESS INVITATION ============================
		if (req.getParameter('invitecoaches') && req.getParameter('invitecoaches').length > 0)
		{
			var procmsg = '',
				errorids = '',
				arInvCoach = req.getParameter('invitecoaches').split(',');

			log('debug','arInvCoach',arInvCoach);

			//4/26/2016 - If this is coming from parent booking with children, queue it up
			if (paramIsParent=='T' && paramChildIds)
			{
				//Queue it up for processing
				//customscript_ax_ss_earlybirdcoachmassinv
				var queueStatus = nlapiScheduleScript(
									'customscript_ax_ss_earlybirdcoachmassinv',
									null,
									{
										'custscript_507_proctext':req.getParameter('invitecoaches'),
										'custscript_507_user':nlapiGetContext().getUser(),
										'custscript_507_parentbooking':paramBookingId,
										'custscript_507_childids':paramChildIds,
										'custscript_507_apperyid':paramApperyId
									}
								  );

				if (queueStatus == 'QUEUED')
				{
					procmsg = 'Successfully Queued up Parent/Child Booking Invitation.';
				}
				else
				{
					procmsg = 'Failed to Queued up Parent/Child Booking Invitation. Queue Status Returned was '+queueStatus;
				}
			}
			else
			{
				for (var a=0; a < arInvCoach.length; a+=1)
				{
					//Value of coach || is separator; coachid||groupid||userid||action (add or delete)||invitedID
					var coachValues = arInvCoach[a].split('||');
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
							ivrec.setFieldValue('custrecord_bo_coachpool_bookingid', paramBookingId);
							ivrec.setFieldValue('custrecord_bo_coachpool_apperyid', paramApperyId);
							ivrec.setFieldValue('custrecord_bo_coachpool_coachid', igroupId);
							ivrec.setFieldValue('custrecord_bo_coachpool_coachname', icoachId);
							ivrec.setFieldValue('custrecord_bo_coachpool_userid', iuserId);
							nlapiSubmitRecord(ivrec, true, true);
						}
						else if (iaction == 'delete' && iinviteId)
						{
							nlapiDeleteRecord('customrecord_bo_coachpool', iinviteId);
						}


					}
					catch (invprocerr)
					{
						log('error','Error Inviting Coach','Coach Values id/group/user '+coachValues+' // '+getErrText(invprocerr));
						errorids += icoachId+',';
					}
				}

				if (errorids && errorids.length > 0)
				{
					errorids = errorids.substr(0, (errorids.length-1) );
					procmsg = 'Error occured with 1 or more coaches: '+errorids+' // Check to make sure they all have Portal/User ID and Group ID assigned';
				}
				else
				{
					procmsg = 'Successfully invited/uninvited coaches';
				}
			}



			//send redirect
			var rparam = {
				'custparam_procmsg':procmsg,
				//Nov 18 2015 - add in training programme ID (paramTpId)
				'custparam_progid':paramTpId,
				'custparam_bookingid':paramBookingId,
				'custparam_subsidiary':paramSubsidiary,
				'custparam_country':paramCoachCountry,
				'custparam_language':paramCoachLanguage,
				'custparam_isvirtual':paramCoachIsVirtual,
				'custparam_fromdate':paramFromDate,
				'custparam_todate':paramToDate,
				'custparam_apperyid':paramApperyId,
				'custparam_bookingdate':paramBookingDate,
				'custparam_bookingtime':paramBookingTime,
				'custparam_courseid':paramCourseId,
				'custparam_coursetext':paramCourseText,
				'custparam_coachid':paramCoachId,
				'custparam_isiframe':'T',
				'custparam_isparent':paramIsParent,
				'custparam_childids':paramChildIds
			};

			nlapiSetRedirectURL(
				'SUITELET',
				'customscript_aux_sl_coachavailtoolv2',
				'customdeploy_aux_sl_coachavailtoolv2',
				'VIEW',
				rparam
			);

			return;
		}
		//================= END PROCESS INVITATION ============================

		var filterOptionTitle = 'Search Filter Options';
		if (paramIsParent == 'T')
		{
			filterOptionTitle = 'Search Filter Options (Booking Group)';
		}
		nsform.addFieldGroup('custpage_grpa', 'Search Filter Options', null);
		//======= Filter Column A
		var bookingFld = nsform.addField('custpage_bookingid', 'select', 'Booking', 'job', 'custpage_grpa');
		bookingFld.setBreakType('startcol');
		bookingFld.setMandatory(true);
		bookingFld.setDefaultValue(paramBookingId);
		if (isIframe)
		{
			bookingFld.setDisplayType('hidden');
		}

		//Add in Subsidary Field
		var subsFld = nsform.addField('custpage_subsidiary','select','Subsidiary','subsidiary','custpage_grpa');
		subsFld.setDefaultValue(paramSubsidiary);
		subsFld.setBreakType('startcol');
		subsFld.setDisplayType('inline');

		//Add in Training Programme Field
		var trainProgFld = nsform.addField('custpage_progid','select','Training Program','customrecord_trainingprogramme','custpage_grpa');
		trainProgFld.setDefaultValue(paramTpId);
		if (paramTpId)
		{
			trainProgFld.setBreakType('startcol');
			trainProgFld.setDisplayType('inline');
		}
		else
		{
			trainProgFld.setDisplayType('hidden');
		}

		//Below fields are created purely for resubmit.
		//Will be hidden
		var fromDateFld = nsform.addField('custpage_fromdate','date','From Date',null,'custpage_grpa');
		fromDateFld.setDisplayType('hidden');
		fromDateFld.setDefaultValue(paramFromDate);

		var toDateFld = nsform.addField('custpage_todate','date','To Date',null,'custpage_grpa');
		toDateFld.setDisplayType('hidden');
		toDateFld.setDefaultValue(paramToDate);

		var apperyIdFld = nsform.addField('custpage_apperyid','text','Appery ID', null, 'custpage_grpa');
		apperyIdFld.setDisplayType('hidden');
		apperyIdFld.setDefaultValue(paramApperyId);

		var bookingDateFld = nsform.addField('custpage_bookingdate','date','Booking Date',null,'custpage_grpa');
		bookingDateFld.setDisplayType('hidden');
		bookingDateFld.setDefaultValue(paramBookingDate);

		var bookingTimeFld = nsform.addField('custpage_bookingtime','timeofday','Booking Time',null,'custpage_grpa');
		//bookingTimeFld.setDisplayType('hidden');
		bookingTimeFld.setDefaultValue(paramBookingTime);

		var bookingCourseIdFld = nsform.addField('custpage_courseid','text','Booking Course ID',null,'custpage_grpa');
		bookingCourseIdFld.setDisplayType('hidden');
		bookingCourseIdFld.setDefaultValue(paramCourseId);

		var bookingCourseTextFld = nsform.addField('custpage_coursetext','text','Booking Course Text',null,'custpage_grpa');
		bookingCourseTextFld.setDisplayType('hidden');
		bookingCourseTextFld.setDefaultValue(paramCourseText);

		var bookingCoachIdFld = nsform.addField('custpage_coachid','text','Booking Coach ID',null,'custpage_grpa');
		bookingCoachIdFld.setDisplayType('hidden');
		bookingCoachIdFld.setDefaultValue(paramCoachId);

		//======= Filter Column B
		//Coach Primary Delivery Country
		var countryFlt = nsform.addField('custpage_country','select','Delivery Country: ',null,'custpage_grpa');
		countryFlt.setBreakType('startcol');

		//Do a search and load due to iframe issue
		var ctrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var ctrcol = [new nlobjSearchColumn('name').setSort(),
		              new nlobjSearchColumn('internalid')];
		var ctrrs = nlapiSearchRecord('customrecord_country', null, ctrflt, ctrcol);
		countryFlt.addSelectOption('', '', true);
		for (var ctr=0; ctrrs && ctr < ctrrs.length; ctr+=1)
		{
			countryFlt.addSelectOption(ctrrs[ctr].getValue('internalid'), ctrrs[ctr].getValue('name'), false);
		}
		countryFlt.setDefaultValue(paramCoachCountry);

		//======= Filter Column C
		var coachLang = nsform.addField('custpage_language','select','Coach Fluent/Native Language: ','customrecord_languages','custpage_grpa');
		coachLang.setBreakType('startcol');
		coachLang.setDefaultValue(paramCoachLanguage);
		//if (isIframe)
		//{
			//coachLang.setDisplayType('hidden');
		//}

		//======= Filter Column E
		//Coach/Is virtual certified
		var isVirtual = nsform.addField('custpage_isvirtual','checkbox','Virtual Certified', null, 'custpage_grpa');
		isVirtual.setBreakType('startcol');
		isVirtual.setDefaultValue(paramCoachIsVirtual);
		//if (isIframe)
		//{
			//isVirtual.setDisplayType('hidden');
		//}

		nsform.addSubmitButton('Check Availability');
		//----------------- Run Search ---------------------------------------------------------
		//1. Grab list of ALL coaches that matches Coach related filter
		//2. Grab summary based search of booking count for coaches that matches filter

		//Main JSON Object used to build UI
		var availJson = {};

		var coachGroupIds = [];
		//Nov 18 2015 - Add in Training Program related JSON objects
		var tpCoachList = [];
		/***************** POST or isIframe Processor *********************************/
		if (req.getMethod() == 'POST' || isIframe)
		{

			if (paramTpId)
			{
				var tpSelCoachLookup = nlapiLookupField('customrecord_trainingprogramme', paramTpId, 'custrecord_tp_selectedcoaches');
				if (strTrim(tpSelCoachLookup))
				{
					tpCoachList = strTrim(tpSelCoachLookup).split(',');
				}
			}

			//Oct. 20 2015
			//Due to incosistencies on sycing values on native to fluent field on coaches,
			//	search is modified to use expression based filter to allow for OR expression
			var coachListExpFlt = [
			                       	['isinactive', 'is', 'F'],
			                       	'AND',
			                       	['category','anyof',['5','12']],
			                       	'AND',
			                       	['custentity_coach_groupingname', 'noneof',['@NONE@','723','380','369']]
			                      ];

			if (paramCoachCountry)
			{
				//custentity_coach_primarydeliverycountry
				coachListExpFlt.push('AND');
				coachListExpFlt.push(['custentity_coach_primarydeliverycountry', 'anyof', paramCoachCountry]);
			}

			if (paramCoachLanguage)
			{
				//custentity_coach_nativelanguage
				//OR
				//custentity_languages
				coachListExpFlt.push('AND');
				coachListExpFlt.push([
				                   	['custentity_languages', 'anyof', paramCoachLanguage],
				                   	'OR',
				                   	['custentity_coach_nativelanguage', 'anyof', paramCoachLanguage]
				                  ]);
			}

			if (paramCoachIsVirtual=='T')
			{
				//custentity_coach_isvirtualcertified
				coachListExpFlt.push('AND');
				coachListExpFlt.push(['custentity_coach_isvirtualcertified', 'is', paramCoachIsVirtual]);
			}

			if (paramSubsidiary)
			{
				coachListExpFlt.push('AND');
				coachListExpFlt.push(['subsidiary', 'anyof', paramSubsidiary]);
			}


			//Nov 18 2015 - Add in logic to return list of ALL Selected Coaches
			if (paramTpId && tpCoachList.length > 0)
			{
				coachListExpFlt = [
				                   	coachListExpFlt,
				                   	'OR',
				                   	[
										['internalid','anyof',tpCoachList],
										'AND',
										['isinactive', 'is', 'F'],
										'AND',
										['category','anyof',['5','12']],
										'AND',
										['custentity_coach_groupingname', 'noneof',['@NONE@','723','380','369']]
				                   	]
				                  ];
			}

			//coachListFlt.push(new nlobjSearchFilter('custentity_coach_masterrecord', null, 'is','T')); //ONLY bring out Master Record
			var coachListCol = [
			                    new nlobjSearchColumn('internalid'),
			                    new nlobjSearchColumn('entityid'),
			                    new nlobjSearchColumn('custentity_coach_groupingname'), //Grouping name is used for display
			                    new nlobjSearchColumn('category'),
			                    new nlobjSearchColumn('subsidiary'),
			                    new nlobjSearchColumn('custentity_coach_primarydeliverycountry'), //Grap Coach Country
			                    new nlobjSearchColumn('custentity_coach_isseniorcertified'), //Senior Audience Ready
			                    new nlobjSearchColumn('custentity_coach_masterttt'), // Master Coach
			                    new nlobjSearchColumn('custentity_coach_isvirtualcertified'), //Virtual Certified
			                    new nlobjSearchColumn('custentity_coach_nativelanguage'),
			                    new nlobjSearchColumn('custentity_languages'),
			                    new nlobjSearchColumn('custentity_coach_masterrecord'), // Identify if the Coach is a Master Record
			                    new nlobjSearchColumn('custentity_user') //Portal ID
								];

			//Nov 18 2015 - Add in sorting option where IF Vendor ID is one of TP value, set number as 0 other wise 1.
			//			    Sort it ASC by this column so that Selected Coaches Come out first
			if (tpCoachList.length > 0)
			{
				var coachSortCol = new nlobjSearchColumn('formulanumeric');
				var caseWhenString = '';
				for (var tp=0; tp < tpCoachList.length; tp+=1)
				{
					caseWhenString += '{internalid}=='+tpCoachList[tp];
					if ( (tp+1) != tpCoachList.length )
					{
						caseWhenString += ' OR ';
					}
				}

				//Build the Case Formula
				caseWhenString = 'Case when '+
								 caseWhenString+
								 'then 0 else 1 end';

				coachSortCol.setFormula(caseWhenString);
				coachSortCol.setSort();
				//Add to the coach column
				coachListCol.push(coachSortCol);
			}

			//Look for ALL matching Coaches and build initial availJson
			var coachListRs = nlapiSearchRecord('vendor', null, coachListExpFlt, coachListCol);
			//Populate initial availJson along with list of coach IDs
			for (var c=0; coachListRs && c < coachListRs.length; c+=1)
			{
				var cgid = coachListRs[c].getValue('custentity_coach_groupingname');

				if (!coachGroupIds.contains(cgid))
				{
					coachGroupIds.push(cgid);
				}

				if (!availJson[cgid])
				{
					availJson[cgid] = {
						'internalid':{},
						'caninvite':true,
						'noinvitereason':'',
						'country':'',
						'name':'',
						'language':'',
						'portalid':'',
						'bookingcount':0,
						'bookingdetail':{},
						'bydate':{},
						'invitationid':'',
						'invitationinfo':'',
						'responseinfo':{
							'bookingid':'',
							'userid':'',
							'responsedatetime':'',
							'choice':'',
							'notes':'',
							'bookingdate':'',
							'bookingtime':'',
							'courseid':'',
							'coursetext':'',
							'isvalid':true, //Defaults to true.
							'invalidreason':''
						}


					};
				}

				log('debug','Coach/Subs check',coachListRs[c].getValue('subsidiary')+' // '+paramSubsidiary);
				//Nov 18 2015 - Just incase there are Training Programme specific Coaches, run logic to determine if they CAN be invited
				if (paramSubsidiary && coachListRs[c].getValue('subsidiary')!=paramSubsidiary)
				{
					//Check against Subsidiary
					availJson[cgid].caninvite = false;
					availJson[cgid].noinvitereason = 'Invalid Subsidiary';
				}
				else if (paramCoachCountry && coachListRs[c].getValue('custentity_coach_primarydeliverycountry') != paramCoachCountry)
				{
					//Check against delivery country
					availJson[cgid].caninvite = false;
					availJson[cgid].noinvitereason = 'Invalid Delivery Country';
				}
				else if (!coachListRs[c].getValue('custentity_user'))
				{
					//Check Portal ID is set
					availJson[cgid].caninvite = false;
					availJson[cgid].noinvitereason = 'Invalid Portal ID';
				}
				else if (paramCoachLanguage)
				{
					//Check to see if language matches
					//custentity_coach_nativelanguage single select
					//custentity_languages multiselect
					var matchFluent = false,
						matchNative = false;
					if (coachListRs[c].getValue('custentity_languages') &&
						coachListRs[c].getValue('custentity_languages').indexOf(paramCoachLanguage) > -1)
					{
						//Check of language match against coach fluent languages
						matchFluent = true;
					}

					log('debug','checking language to param',coachListRs[c].getValue('custentity_languages').indexOf(paramCoachLanguage));
					log('debug','checking native lang to param', coachListRs[c].getValue('custentity_coach_nativelanguage')==paramCoachLanguage);

					if (coachListRs[c].getValue('custentity_coach_nativelanguage') &&
						coachListRs[c].getValue('custentity_coach_nativelanguage')==paramCoachLanguage)
					{
						matchNative = true;
					}

					if (!matchFluent && !matchNative)
					{
						availJson[cgid].caninvite = false;
						availJson[cgid].noinvitereason = 'Invalid Languages';
					}
				}

				availJson[cgid].internalid = {
						'id':coachListRs[c].getValue('internalid'),
						'name':coachListRs[c].getValue('entityid'),
						'virtual':coachListRs[c].getValue('custentity_coach_isvirtualcertified')=='T'?'T':'F',
				};
				availJson[cgid].country = coachListRs[c].getText('custentity_coach_primarydeliverycountry');
				availJson[cgid].name = coachListRs[c].getText('custentity_coach_groupingname');
				availJson[cgid].language = coachListRs[c].getText('custentity_coach_nativelanguage');
				availJson[cgid].portalid = coachListRs[c].getValue('custentity_user');
				var parentRec = coachListRs[c].getValue('custentity_coach_masterrecord')=='T'?'T':'F';
				if (parentRec == 'T')
				{
					availJson[cgid].parent = coachListRs[c].getValue('internalid');
				}
				else
				{
					availJson[cgid].parent = '';
				}
			}

			log('debug','after search','coachGroupIds: '+coachGroupIds.length);

			//coachGroupIds
			//search for booking count within the date range
			//log('debug','coachGroupIds',coachGroupIds.toString());
			if (coachGroupIds.length > 0)
			{
				//availJson
				//'invitationinfo':'',
				//'responseinfo':''
				//paramBookingId
				/******* Related Coach Invitation/Json Population Logic ****************/

				var invitflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				                new nlobjSearchFilter('custrecord_bo_coachpool_bookingid', null, 'anyof', paramBookingId),
				                new nlobjSearchFilter('custrecord_bo_coachpool_coachid', null, 'anyof', coachGroupIds)];

				var invitcol = [new nlobjSearchColumn('internalid'),
				                new nlobjSearchColumn('created'),
				                new nlobjSearchColumn('lastmodified'),
				                new nlobjSearchColumn('custrecord_bo_coachpool_coachid'),
				                new nlobjSearchColumn('custrecord_bo_coachpool_userid')];

				var invitrs = nlapiSearchRecord('customrecord_bo_coachpool', null, invitflt, invitcol);

				for (var iv=0; invitrs && iv < invitrs.length; iv+=1)
				{
					var invGroupId = invitrs[iv].getValue('custrecord_bo_coachpool_coachid');
					availJson[invGroupId].invitationid = invitrs[iv].getValue('internalid');
					availJson[invGroupId].invitationinfo = '@'+invitrs[iv].getValue('created');
				}
				/******* END Related Coach Invitation/Json Population Logic ****************/

				/******* Related Coach RESPONSES by Above Invitation IDs *******************/
				//Response should search for matching booking reference and ONLY return out latest response
				log('debug','availJson with invitation', JSON.stringify(availJson));
				var respflt = [
				               new nlobjSearchFilter('custrecord_coachres_bookingref', null, 'anyof',paramBookingId),
				               new nlobjSearchFilter('isinactive', null, 'is','F')
				               ];

				var respcol = [
				               new nlobjSearchColumn('custrecord_coachres_mongocreatedat', null, 'min'),
				               new nlobjSearchColumn('custrecord_coachres_userid', null, 'group'),
				               new nlobjSearchColumn('custrecord_coachres_resp_choice', null, 'group'),
					           new nlobjSearchColumn('custrecord_coachres_notes', null, 'group'),
					           new nlobjSearchColumn('custrecord_coachres_course', null, 'group'), //Course Internal ID
					           new nlobjSearchColumn('custrecord_coachres_coursetext', null, 'group'), //Course TEXT as stored in MongoDB
					           new nlobjSearchColumn('custrecord_coachres_booking_date', null, 'group'), //Booking Date value from MongoDB
					           new nlobjSearchColumn('custrecord_coachres_booking_time', null, 'group') //Booking Time value from MongoDB
				              ];
					var resprs = nlapiSearchRecord('customrecord_coach_response', null, respflt, respcol);

					//loop through each responses for each response and build out list of User IDs.
					//This list will be used to search against Vendor record to find matching Group ID
					//This is because MongoDB does not store coach group id. It ONLY knows of bookingID and userID
					//Since this entire LIST is based of Coach Group Name, it will need to identify what the group name is based on userID
					var respUserIds = [];
					for (var r=0; resprs && r < resprs.length; r+=1)
					{
						if (!respUserIds.contains(resprs[r].getValue('custrecord_coachres_userid', null, 'group')))
						{
							respUserIds.push(resprs[r].getValue('custrecord_coachres_userid', null, 'group'));
						}
					}
					log('debug','respon array', respUserIds);
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
						 *  'bookingid':'',
							'userid':'',
							'responsedatetime':'',
							'choice':'',
							'notes':'',
							'bookingdate':'',
							'bookingtime':'',
							'courseid':'',
							'coursetext':'',
							'isvalid':true//false,
							'invalidreason':''
						 */
						for (var r=0; resprs && r < resprs.length; r+=1)
						{
							var resGrpId = userIdToGroupJson[resprs[r].getValue('custrecord_coachres_userid', null, 'group')];
							if (resGrpId && availJson[resGrpId])
							{
								//Need to see if THIS response is VALID
								var resIsValid = true,
									invalidReason = '';

								var bookingTimeValue = resprs[r].getValue('custrecord_coachres_booking_time', null, 'group');
								if (bookingTimeValue)
								{
									bookingTimeValue = bookingTimeValue.toLowerCase();
								}


								//Start examining below 4 check points
								if (paramBookingDate != resprs[r].getValue('custrecord_coachres_booking_date', null, 'group') )
								{
									resIsValid = false;
									invalidReason = 'Booking date does not match';
								}
								else if (paramBookingTime !=  bookingTimeValue)
								{
									resIsValid = false;
									invalidReason = 'Booking time does not match';
								}
								//Invalid UC#3: If Course ID matches but Course TEXT is different
								else if (paramCourseText != resprs[r].getValue('custrecord_coachres_coursetext', null, 'group'))
								{
									resIsValid = false;
									invalidReason = 'Course Name does not match';
								}
								//Invalid UC#4: If Course ID is different
								else if (paramCourseId != resprs[r].getValue('custrecord_coachres_course', null, 'group'))
								{
									resIsValid = false;
									invalidReason = 'Course does not match';
								}

								log('debug','resGrpId // Invalid Reason',resGrpId+' // '+invalidReason+' // Booking time compare: '+paramBookingTime+' // '+bookingTimeValue);

								availJson[resGrpId].responseinfo = {
									'bookingid':paramBookingId,
									'userid':resprs[r].getValue('custrecord_coachres_userid', null, 'group'),
									'responsedatetime':resprs[r].getValue('custrecord_coachres_mongocreatedat', null, 'min'),
									'choice':resprs[r].getText('custrecord_coachres_resp_choice', null, 'group'),
									'notes':resprs[r].getValue('custrecord_coachres_notes', null, 'group'),
									'bookingdate':resprs[r].getValue('custrecord_coachres_booking_date', null, 'group'),
									'bookingtime':resprs[r].getValue('custrecord_coachres_booking_time', null, 'group'),
									'courseid':resprs[r].getValue('custrecord_coachres_course', null, 'group'),
									'coursetext':resprs[r].getValue('custrecord_coachres_coursetext', null, 'group'),
									'isvalid':resIsValid,
									'invalidreason':invalidReason
								};

								log('debug','avail json for responseinfo', JSON.stringify(availJson[resGrpId].responseinfo));
							}
						}

					}

				/******* ENDRelated Coach RESPONSES by Above Invitation IDs *******************/

				/******* Related Booking Search/Json Population Logic ****************/

				var bookflt = [new nlobjSearchFilter('enddate','custentity_bo_coach','within',paramFromDate, paramToDate),
				               new nlobjSearchFilter('isinactive','custentity_bo_coach','is','F'),
				               new nlobjSearchFilter('custentity_coach_groupingname', null, 'anyof', coachGroupIds),
				               //9568 Changes. Remove Cancelled Bookings
				               new nlobjSearchFilter('custentity_bo_iscancelled','custentity_bo_coach', 'is','F')];
				log('debug','book flt built', 'book flt built');
				//Change the bookflt so that it ONLY looks up booking info for Specific Dates
				if (paramIsParent=='T')
				{
					//Apr. 15 2016 - Parent Booking Related
					var bookGroupDates = [];

					//if the booking record is Parent we need to grab Date range based on all children
					var nsChildIds = bookRec.getFieldValues('custentity_bookingset_child'),
						jsChildIds = [];
					//This is converting NS Array object into JavaScript array object
					jsChildIds.push(paramBookingId);
					for (var nsc=0; nsc < nsChildIds.length; nsc+=1)
					{
						jsChildIds.push(nsChildIds[nsc]);
					}

					//Add in Parent/Child related hidden fields here
					var isParentFld = nsform.addField('custpage_isparent', 'checkbox', 'Is parent', null, null);
					isParentFld.setDefaultValue(paramIsParent);
					isParentFld.setDisplayType('hidden');

					var childIdsFld = nsform.addField('custpage_childids','textarea','Child IDs', null,null);
					childIdsFld.setDefaultValue(jsChildIds.toString());
					childIdsFld.setDisplayType('hidden');

					log('debug','jsChildIds', jsChildIds);

					//Search for ALL End Dates of child booking records.
					var	chdflt = [new nlobjSearchFilter('internalid', null, 'anyof', jsChildIds),
					   	          new nlobjSearchFilter('enddate', null, 'isnotempty','')],
						chdcol = [new nlobjSearchColumn('enddate').setSort()],
						chdrs = nlapiSearchRecord('job', null, chdflt, chdcol);

					for (var k=0; k < chdrs.length; k+=1)
					{
						if (!bookGroupDates.contains(chdrs[k].getValue('enddate')))
						{
							bookGroupDates.push(chdrs[k].getValue('enddate'));
						}
					}

					log('debug','bookGroupDates', bookGroupDates);

					//Assume there are results
					//Set the From and To dates
					paramFromDate = chdrs[0].getValue('enddate');
					paramToDate = chdrs[chdrs.length - 1].getValue('enddate');

					log('debug','from /to', paramFromDate+' // '+paramToDate);

					var dateFlt = [];
					//Go through each date and create enddate filter
					for (var bd=0; bd < bookGroupDates.length; bd+=1)
					{
						dateFlt.push(['custentity_bo_coach.enddate','on',bookGroupDates[bd]]);
						if ( (bd+1) != bookGroupDates.length)
						{
							dateFlt.push('OR');
						}

					}

					log('debug', 'dateFlt', JSON.stringify(dateFlt));

					//Modify the bookflt to expression based and ONLY bring out Booking on those childs' dates
					bookflt = [
					           	['custentity_bo_coach.isinactive','is','F'],
					           	'AND',
					           	['custentity_coach_groupingname','anyof',coachGroupIds],
					           	'AND',
					           	//9568 Changes. Remove Cancelled Bookings
					           	['custentity_bo_coach.custentity_bo_iscancelled','is','F']
					          ];

					if (dateFlt.length > 0)
					{
						bookflt.push('AND');
						bookflt.push(dateFlt);
					}

					log('debug','bookflt',JSON.stringify(bookflt));

				}

				var bookcol = [
				               new nlobjSearchColumn('custentity_coach_groupingname'),
				               new nlobjSearchColumn('internalid','custentity_bo_coach'), //Internalid
				               new nlobjSearchColumn('enddate','custentity_bo_coach'), //Start Date
				               new nlobjSearchColumn('custentity_bo_eventtime','custentity_bo_coach'), //Start time
				               new nlobjSearchColumn('customer','custentity_bo_coach'), //Client
				               new nlobjSearchColumn('jobtype','custentity_bo_coach'), //Booking Type
				               new nlobjSearchColumn('custentity_bo_item','custentity_bo_coach') //Item
				               ];

				var bookrs = nlapiSearchRecord('vendor',null,bookflt, bookcol);

				log('debug','bookrs ran', 'ran bookrs vendor search');

				//MUST do additional search against ITEM to grab value for Duration for each ITEM on the booking
				var arBookItems = [];
				//JSON object to track duration by Item
				var itemDurationJson = {};
				for (var bb=0; bookrs && bb < bookrs.length; bb+=1)
				{
					if (!arBookItems.contains(bookrs[bb].getValue('custentity_bo_item','custentity_bo_coach')))
					{
						arBookItems.push(bookrs[bb].getValue('custentity_bo_item','custentity_bo_coach'));
					}
				}

				//add in the counts
				for (var b=0; bookrs && b < bookrs.length; b+=1)
				{
					//log('debug',bookrs[b].getText('custentity_coach_groupingname'),bookrs[b].getValue('custentity_coach_groupingname')+' // '+bookrs[b].getValue('internalid','custentity_bo_coach'));
					var coachGrpId = bookrs[b].getValue('custentity_coach_groupingname');
					if (availJson[coachGrpId])
					{
						//OVERALL TOTAL Booking count for this Coach Group
						availJson[coachGrpId].bookingcount = parseInt(availJson[coachGrpId].bookingcount) + 1;

						//populate availJson[coachgroup].bydate JSON object with bookingcount and bookingdetail for THAT Date
						var bookDate = '';
						if (bookrs[b].getValue('enddate','custentity_bo_coach'))
						{
							//convert the date to currently logged in users' format
							bookDate = nlapiDateToString(nlapiStringToDate(bookrs[b].getValue('enddate','custentity_bo_coach')));
						}

						if (!availJson[coachGrpId].bydate[bookDate])
						{
							availJson[coachGrpId].bydate[bookDate]= {
								'bookingcount':0,
								'dayavailability':{
									'morning':0,
									'afternoon':0,
									'evening':0
								}
							};
						}
						//DATE Specific Booking Count
						availJson[coachGrpId].bydate[bookDate].bookingcount = parseInt(availJson[coachGrpId].bydate[bookDate].bookingcount)+1;

						//build in dayavailability for THIS Date.
						//morning 5 to < 12
						//afternoon 12 to < 6
						//evening 6 to 11pm
						//bookrs[b].getValue('custentity_bo_eventtime','custentity_bo_coach')
						if (bookrs[b].getValue('custentity_bo_eventtime','custentity_bo_coach'))
						{
							var timeValue = bookrs[b].getValue('custentity_bo_eventtime','custentity_bo_coach').toLowerCase();
							if (timeValue.indexOf('am') > -1)
							{
								availJson[coachGrpId].bydate[bookDate].dayavailability.morning = parseInt(availJson[coachGrpId].bydate[bookDate].dayavailability.morning) + 1;
							}
							else
							{
								var hourValue = parseInt(timeValue.split(':'));
								if (hourValue == 12 || (hourValue >= 1 && hourValue < 6))
								{
									availJson[coachGrpId].bydate[bookDate].dayavailability.afternoon = parseInt(availJson[coachGrpId].bydate[bookDate].dayavailability.afternoon) + 1;
								}
								else if (hourValue >= 6 && hourValue < 12)
								{
									availJson[coachGrpId].bydate[bookDate].dayavailability.evening = parseInt(availJson[coachGrpId].bydate[bookDate].dayavailability.evening) + 1;
								}
							}
						}//Booking time check
					}
				}//Booking check
				/******* END Related Booking Search/Json Population Logic ****************/
			}//Check for CoachGroupId Size Check

		}

		//******************************************** UI DISPLAY ********************************************************************************/

		if (paramFromDate || paramToDate)
		{
			//------------ Add in Sublist to display Booking Date Coach Info ---------
			var canInvite = false;

			//canInvite flag is set to true if parent booking record is being viewed or booking records date is after current date
			if (paramIsParent=='T' || (nlapiStringToDate(paramFromDate).getTime() > new Date().getTime() && !paramCoachId) )
			{
				canInvite = true;
			}

			//Display the result
			var lineNumber = 1;
			var tempdate = nlapiStringToDate(paramFromDate);
			var detailTabLabel = tempdate.getDate()+
								 ' '+
								 monthAbbr[(tempdate.getMonth()+1)]+
								 ' Availability';

			//Apr 15 2016 - Change the lable to show range
			if (paramIsParent=='T')
			{
				var tempEnd = nlapiStringToDate(paramToDate);
				detailTabLabel = tempdate.getDate()+
								 ' '+
								 monthAbbr[(tempdate.getMonth()+1)]+
								 ' - '+
								 tempEnd.getDate()+
								 ' '+
								 monthAbbr[(tempEnd.getMonth()+1)]+
								 ' Availability';
			}


			//add in sublist with all lines sorted by SO number, and line squence number in DESC
			var linesl = nsform.addSubList('custpage_availls', 'list', detailTabLabel, null);
			var coachSelBox = linesl.addField('avail_select','checkbox','Invite');
			//Add in Uninvite box - It's disabled by default. Client script will enable them as needed
			linesl.addField('avail_unselect','checkbox','Uninvite').setDisplayType('disabled');

			if (!canInvite)
			{
				coachSelBox.setDisplayType('disabled');
			}
			//Nov 18 2015
			//	- Add in flags to allow invitation. This can happen if booking belongs to training programme and
			//	  some coaches selected may not meet the criteria
			linesl.addField('avail_tpcaninvite','checkbox','TP Can Invite').setDisplayType('hidden');

			//linesl.addField('avail_colorcode','textarea','...').setDisplayType('inline');
			linesl.addField('avail_coach','textarea','Coach').setDisplayType('inline');
			linesl.addField('avail_coachid','text','Coach ID').setDisplayType('hidden');
			linesl.addField('avail_groupid','text','Coach Group ID').setDisplayType('hidden');
			linesl.addField('avail_userid','text','Coach User ID').setDisplayType('hidden');

			linesl.addField('avail_viewcoach','textarea','C-Cal');
			linesl.addField('avail_country','text','Country');
			linesl.addField('avail_language','text','Language');
			linesl.addField('avail_count','integer',' # Del').setDisplayType('inline');
			var amCol = linesl.addField('avail_morning','integer','AM');
			var pmCol = linesl.addField('avail_afternoon','integer','PM');
			var epmCol = linesl.addField('avail_evening','integer','E-PM');

			//TAKEN OUT FOR NOW
			//linesl.addField('avail_bookdetail','textarea','Delivery Info').setDisplayType('inline');
			linesl.addField('avail_invitationinfo','textarea','Invited').setDisplayType('inline');
			linesl.addField('avail_invitationid','text','Invited ID').setDisplayType('hidden');
			linesl.addField('avail_latestresponse','textarea','Latest Response').setDisplayType('inline');
			linesl.addField('avail_latestresponsenotes','textarea','Latest Response').setDisplayType('inline');
			linesl.addField('avail_hasresponse','checkbox','Has Response').setDisplayType('hidden');

			var parentChildGroupText = '';

			if (paramIsParent=='T')
			{
				parentChildGroupText = '# of Del are for this Booking Group. It is Sum of all deliveries on '+bookGroupDates;
				//Hide Coach Specific fields
				amCol.setDisplayType('hidden');
				pmCol.setDisplayType('hidden');
				epmCol.setDisplayType('hidden');
			}

			var helpTextHtml = '<b>Please select list of coaches you wish to offer this booking to and click "Invite Coaches" Button</b><br/><br/>'+
							   '<i>Maximum # of Coaches you can invite or uninvite at one time is <b>'+MAX_INVITE_ALLOWED+'</b></i><br/><br/>'+
							   (parentChildGroupText?'<p><b>'+parentChildGroupText+'</b></p>':'')+
							   '<table width="100%">'+
							   '<tr>'+
							   '<td><div style="font-weight:bold; size: 14px">&raquo;</div> Selected Coach</td>'+
							   '<td><div style="width: 15px; height: 15px; background-color: green"> </div> No Deliveries</td>'+
							   '<td><div style="width: 15px; height: 15px; background-color: orange"> </div> 1 - 3 Deliveries</td>'+
							   '<td><div style="width: 15px; height: 15px; background-color: red"> </div> 4 or More Deliveries</td>'+
							   '</tr>'+
							   '</table>';
			linesl.setHelpText(helpTextHtml);


			//ONLY display invite button IF the booking date is in the future.
			if (canInvite)
			{
				linesl.addButton('custpage_invite', 'Invite/Uninvite Coaches', 'availToolInviteCoaches()');
			}

			linesl.addMarkAllButtons();

			for (var l in availJson)
			{
				//grab date specific Booking info
				//	- By Default, booking count is for THIS Bookings' Date
				var datejson = availJson[l].bydate[nlapiDateToString(tempdate)];
				var bookingCount = (datejson)?datejson.bookingcount:0;

				//If parent, show TOTAL Count for THIS Coach
				if (paramIsParent == 'T')
				{
					bookingCount = availJson[l].bookingcount;
				}

				//Add in Response
				/**
				'bookingid':paramBookingId,
				'userid':resprs[r].getValue('custrecord_coachres_userid', null, 'group'),
				'responsedatetime':
				'choice':resprs[r].getText('custrecord_coachres_resp_choice', null, 'group'),
				'notes':resprs[r].getValue('custrecord_coachres_notes', null, 'group'),
				'bookingdate':resprs[r].getValue('custrecord_coachres_booking_date', null, 'group'),
				'bookingtime':resprs[r].getValue('custrecord_coachres_booking_time', null, 'group'),
				'courseid':resprs[r].getValue('custrecord_coachres_course', null, 'group'),
				'coursetext':resprs[r].getValue('custrecord_coachres_coursetext', null, 'group'),
				'isvalid':resIsValid,
				'invalidreason':invalidReason
				*/

				var choiceText = '',
					notesValue = '',
					respDetail = '';
				if (availJson[l].responseinfo)
				{
					//Check the hidden box that says HAS response with choice of Yes/No/Maybe
					//Also populate hidden detail of response
					if (availJson[l].responseinfo.choice)
					{
						linesl.setLineItemValue('avail_hasresponse',lineNumber, 'T');

						//Build HTML for the Detail
						respDetail = '<div style="font-size: 11px">'+
									 //'<b>Responded Date: </b>'+
									 //availJson[l].responseinfo.responsedatetime+
									 //'<br/>'+
									 '<b>Response Booking Date/Time: </b>'+
									 availJson[l].responseinfo.bookingdate+
									 ' '+
									 availJson[l].responseinfo.bookingtime+
									 '<br/>'+
									 '<b>Response Course Info: </b>'+
									 availJson[l].responseinfo.coursetext+
									 ' ('+availJson[l].responseinfo.courseid+')'+
									 '<br/>'+
									 '<b>Response Notes:</b><br/>'+
									 availJson[l].responseinfo.notes+
									 '</div>';

						//Colorize the choiceText based on validity
						choiceText = '<div style="font-weight:bold; font-size: 13px; color: green">'+
									 availJson[l].responseinfo.choice+
									 '</div>';

						notesValue = '<div style="font-weight:bold; font-size: 13px; color: green">Valid Response</div>';

						if (!availJson[l].responseinfo.isvalid)
						{
							choiceText = '<div style="font-weight:bold; font-size: 13px; color: red">'+
										 availJson[l].responseinfo.choice+
										 '</div>';

							notesValue = '<div style="font-weight:bold; font-size: 13px; color: red">'+
										 'Invalid Reason: '+
										 availJson[l].responseinfo.invalidreason+
										 '</div>';
						}

						notesValue = notesValue+
									 '<br/>'+
									 respDetail;

					} //End check for value of choice

				}//End check for existance of responseinfo object

				linesl.setLineItemValue('avail_latestresponse', lineNumber, choiceText);
				linesl.setLineItemValue('avail_latestresponsenotes', lineNumber, notesValue);

				//Nov 18 2015
				// - Add in Training Programme related can invite flags
				linesl.setLineItemValue('avail_tpcaninvite', lineNumber, (availJson[l].caninvite?'T':'F'));


				if (datejson)
				{
					//Add in morning, afternoon and evening numbers
					//dayavailability
					linesl.setLineItemValue('avail_morning', lineNumber, datejson.dayavailability.morning.toFixed(0));
					linesl.setLineItemValue('avail_afternoon', lineNumber, datejson.dayavailability.afternoon.toFixed(0));
					linesl.setLineItemValue('avail_evening', lineNumber, datejson.dayavailability.evening.toFixed(0));

				}
				else
				{
					//Add in morning, afternoon and evening numbers
					//dayavailability
					linesl.setLineItemValue('avail_morning', lineNumber, '0');
					linesl.setLineItemValue('avail_afternoon', lineNumber, '0');
					linesl.setLineItemValue('avail_evening', lineNumber, '0');
				}

				linesl.setLineItemValue('avail_coachid', lineNumber, availJson[l].internalid.id);
				linesl.setLineItemValue('avail_groupid', lineNumber, l);
				linesl.setLineItemValue('avail_userid', lineNumber, availJson[l].portalid);

				linesl.setLineItemValue('avail_invitationinfo', lineNumber, availJson[l].invitationinfo);
				if (!availJson[l].caninvite)
				{
					linesl.setLineItemValue(
						'avail_invitationinfo',
						lineNumber,
						'<div style="font-weight:bold; font-size: 13px; color: red">'+
						availJson[l].noinvitereason+
						'</div>'
					);
				}

				linesl.setLineItemValue('avail_invitationid', lineNumber, availJson[l].invitationid);

				var portalUrl = 'https://coach.themindgym.com/calendar?coach_id='+availJson[l].portalid+
								'&year='+tempdate.getFullYear()+
								'&month='+(tempdate.getMonth()+1)+
								'&day='+tempdate.getDate();

				var portalUrlHtml = '<a href="'+portalUrl+'" target="_blank">View</a>';

				linesl.setLineItemValue('avail_country', lineNumber, availJson[l].country);


				linesl.setLineItemValue('avail_viewcoach', lineNumber, portalUrlHtml);
				linesl.setLineItemValue('avail_language', lineNumber, availJson[l].language);
				linesl.setLineItemValue('avail_count', lineNumber, bookingCount.toFixed(0));

				var availStyle = 'font-weight:bold; font-size: 13px;';
				if (bookingCount==0)
				{
					availStyle +='color: green;';
					//reset bookInfoText to empty if no booking
					bookInfoText = '';
				}
				else if (bookingCount > 0 && bookingCount < 4)
				{
					availStyle +='color: orange;';
				}
				else
				{
					availStyle +='color: red;';
				}

				//Nov 18 2015 - IF Coach is one of Selected Coach from Training Programme, mark it with &raquo; special character
				var tpPreferredCoach = '';
				if (tpCoachList.contains(availJson[l].internalid.id))
				{
					tpPreferredCoach = '&raquo; &nbsp; ';
				}

				var availCodeHtml = '<div style="'+availStyle+'">'+ tpPreferredCoach + availJson[l].name+'</div>';
				//4/22/2016 - Those with more than one total count, show details
				if (paramIsParent == 'T' && bookingCount > 0)
				{
					//Build Div HTML that shows details of each date and sessions
					var divHtml = '',
						dateTd = '',
						valueTd = '';
					for (var byd in availJson[l].bydate)
					{
						dateTd += '<td>'+byd+'</td>';
						valueTd += '<td>'+availJson[l].bydate[byd].bookingcount+' Bookings</td>';
					}
					divHtml += '<div id="countdetail'+l+'" style="display:none; float:left">'+
							   '<table border="1" cellspacing="0" cellpadding="3">'+
							   '<tr>'+dateTd+'</tr>'+
							   '<tr>'+valueTd+'</tr>'+
							   '</table>'+
							   '</div>';

					availCodeHtml =  '<div>'+
									 '<a style="'+availStyle+'" href="#" onmouseover="toggleCountDetails(\'show\',\''+l+'\')" onmouseout="toggleCountDetails(\'hide\',\''+l+'\')">'+
									 tpPreferredCoach + availJson[l].name+
									 '</a></div>'+
									 '<br/>'+
									 divHtml;
				}


				linesl.setLineItemValue('avail_coach', lineNumber, availCodeHtml); //+' // '+availJson[l].parent

				//linesl.setLineItemValue('avail_colorcode', lineNumber, availCodeHtml);

				lineNumber+=1;
			}//End For each display of Matching Coaches

		}

		//Write out availJson JSON object
		var inlinejson = nsform.addField('custpage_availjson','inlinehtml');
		inlinejson.setDefaultValue('<script language="javascript">var availJson = '+JSON.stringify(availJson)+'; </script>');

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
function toggleCountDetails(action, line)
{
	if (action=='show')
	{
		document.getElementById('countdetail'+line).style.display='block';
	}
	else
	{
		document.getElementById('countdetail'+line).style.display='none';
	}
}

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

		//Nov 18 2015 - If can invite flag is set, disable check boxes
		if (nlapiGetLineItemValue('custpage_availls','avail_tpcaninvite', al)!='T')
		{
			nlapiSetLineItemDisabled('custpage_availls','avail_select',true,al);
			nlapiSetLineItemDisabled('custpage_availls','avail_unselect',true,al);

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

	//TESTING
	//alert(strInviteList+' [Size: '+strInviteList.length+']');
	//return;
	//------

	slUrl += '&custpage_bookingid='+nlapiGetFieldValue('custpage_bookingid')+
			 '&custpage_subsidiary='+nlapiGetFieldValue('custpage_subsidiary')+
			 '&custpage_country='+nlapiGetFieldValue('custpage_country')+
			 '&custpage_language='+nlapiGetFieldValue('custpage_language')+
			 '&custpage_isvirtual='+nlapiGetFieldValue('custpage_isvirtual')+
			 '&custpage_fromdate='+nlapiGetFieldValue('custpage_fromdate')+
			 '&custpage_todate='+nlapiGetFieldValue('custpage_todate')+
			 '&custpage_apperyid='+nlapiGetFieldValue('custpage_apperyid')+
			 '&custpage_isparent='+nlapiGetFieldValue('custpage_isparent')+
			 '&custpage_childids='+nlapiGetFieldValue('custpage_childids')+
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
