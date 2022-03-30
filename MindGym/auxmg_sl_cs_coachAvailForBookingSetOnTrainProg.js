/**
 * Coding is done in SS1 to match V2coachAvailabilityChecker.
 * 
 * Tool mimics similar behavior as V2coachAvailabilityChecker viewed from Booking record
 * 	- It behaves in same way if the booking is part of a group. 
 * 
 * This tool will grab list of coaches based on training programmes being vieweds' preferred coach list.
 * If there are multiple booking sets assoicated to training programme, user must filteer it by single booking set.
 * Processor will grab list of all bookings associated with selected booking set and invite selected coaches
 * to all the booking.
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Sep 2016     json
 *
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

/***************** SUITELET SCRIPT **********************/
function earlyBirdBookingSet(req, res)
{
	
	var nsform = nlapiCreateForm('Early Bird - Booking Set Invite Tool', true);
	nsform.setScript('customscript_aux_cs_cavailchkontphelper');
	
	var procMsgFld = nsform.addField('custpage_procmsg', 'inlinehtml', '', null, null);
	procMsgFld.setLayoutType('outsideabove');
	
	//Below are passed in from Training Programme record being viewed.
	var paramTpId = (req.getParameter('custpage_progid')?req.getParameter('custpage_progid'):''),
		paramTpClientId = (req.getParameter('custpage_progcliid')?req.getParameter('custpage_progcliid'):''),
		//User Submitted info
		paramSelBsOptions = (req.getParameterValues('custpage_bslist'))?req.getParameterValues('custpage_bslist'):[],
		//Parameter comes through via URL level parameter for queuing up processor script
		paramCpbslist = (req.getParameter('cpbslist')?req.getParameter('cpbslist'):'');
		
	//In case this was submitted for queuing up the processor, look for cpbslist paramter.
	//	 This is because it will come through as string value
	if (paramSelBsOptions.length == 0 && paramCpbslist)
	{
		paramSelBsOptions = paramCpbslist.split(',');
	}
	
	try
	{
		//Validation Rule: 
		//paramTpId and paramTpClientId must be passed in
		if (!paramTpId || !paramTpClientId)
		{
			throw nlapiCreateError('MISSING_INFO', 'Required Training Programme and/or Client on Training Programme Missing', false);
		}
		
		//Add in hidden form fields to capture request level params
		var hideTpIdFld = nsform.addField('custpage_progid', 'text', 'Hidden Programme ID', null, null);
		hideTpIdFld.setDisplayType('hidden');
		hideTpIdFld.setDefaultValue(paramTpId);
		
		var hideTpClientIdFld = nsform.addField('custpage_progcliid', 'text', 'Hidden Programme Client ID', null, null);
		hideTpClientIdFld.setDisplayType('hidden');
		hideTpClientIdFld.setDefaultValue(paramTpClientId);
		
		//----------- INVITE COACH PROCESS ------------------------------------
		//	We Simply Queue up Scheduled Script based on user selection
		//	and redirect the user to THIS Suitelet to display the message to user
		//ASSUMPTION:
		//	We assume that comma separated list of coaches AND comma separated list of Booking set
		//	will not go beyond 4000 characters (each).  
		//================= PROCESS INVITATION ============================
		if (req.getParameter('invitecoaches') && req.getParameter('invitecoaches').length > 0)
		{
			var procmsg = '',
				arInvCoach = req.getParameter('invitecoaches').split(',');
			
			log('debug','arInvCoach',arInvCoach);
			
			//Queue it up for processing
			//customscript_ax_ss_earlybirdcoachmassinv
			var queueStatus = nlapiScheduleScript(
								'customscript_aux_ss_procbooksetcoachinv', 
								null, 
								{
									'custscript_sb531_tpid':paramTpId,
									'custscript_sb531_tpcid':paramTpClientId,
									'custscript_sb531_triggeruser':nlapiGetContext().getUser(),
									'custscript_sb531_bslist':paramCpbslist,
									'custscript_sb531_coachlist':req.getParameter('invitecoaches')
								}
							  );
			
			if (queueStatus == 'QUEUED')
			{
				procmsg = 'Successfully Queued up.';
			}
			else
			{
				procmsg = 'Failed to Queued up with Queue Status '+queueStatus;
			}
			
			//send redirect
			var rparam = {
				'custparam_procmsg':procmsg,
				'custpage_progid':paramTpId,
				'custpage_progcliid':paramTpClientId,
				'ifrmcntnr':'T',
				'isiframe':'T'
			};
			
			nlapiSetRedirectURL(
				'SUITELET', 
				'customscript_aux_sl_coachavailbstp', 
				'customdeploy_aux_sl_coachavailbstp',
				'VIEW', 
				rparam
			);
			
			return;
		}
		//================= END PROCESS INVITATION ============================
		
		//If procmsg parameter is set, this means this is to confirm to user
		//	their selection has been queued up for processing.
		//	Display it to the user
		if (req.getParameter('custparam_procmsg'))
		{
			var styleColor = 'green',
				additionalFyi = '<br/>You will recieve email notification once completed.';
			if (req.getParameter('custparam_procmsg').indexOf('Failed') > -1)
			{
				styleColor = 'red';
				additionalFyi = '';
			}
			procMsgFld.setDefaultValue(
				'<div style="color:'+styleColor+'; font-size: 15px">'+
				'Your request to invite selected coaches to selected booking set(s) for this training programme '+
				req.getParameter('custparam_procmsg')+
				additionalFyi+
				'<br/><br/>'+
				'</div>'
			);			
		}
		
		//Load Training Programme being viewed.
		var tprec = nlapiLoadRecord('customrecord_trainingprogramme', paramTpId),
			prefCoaches = tprec.getFieldValues('custrecord_tp_selectedcoaches'),
			
			//Process JSON which contains all necessary variable under single object
			//Array object used for processing later.
			
			/**
			 * bsbJson will contain list of ALL booking records details
			 * {
			 * 		[booking id]:{
			 * 			'entityid':'',
			 * 			'enddate':'',
			 * 			'coachid':'',
			 * 			'coachtext':''
			 * 		}
			 * }
			 * 
			 * bsbDates will contain list of all Unique Dates for all booking in this result
			 * 	so that we can search for availability of each coach
			 * 
			 * hasCoachJson will contain list of ALL bookings that Has Coach already assigned
			 * {
			 * 		[booking id]:{
			 * 			'entityid':'',
			 * 			'coachtext':'',
			 * 			'enddate':'',
			 * 			'bookingsettext':''
			 * 		}
			 * }
			 *
			 * coachinfo will contain list of ALL preferred coach and their information to be displayed
			 * {
			 * 		[coachid]:{
			 * 			'coachtext':'',
			 * 			'countrytext':'',
			 * 			'languagetext':'',
			 * 			'totaldel':0,
			 * 			'deldetail':{
			 * 				[date]:[count]
			 * 			},
			 * 			'deldatecount':0
			 * 		}
			 * }
			 */
			procJson = {
				//Array of list of preferred coaches
				'jsPrefCoaches':[],
				//List of booking set ids for THIS Training Program
				'bookingsetids':[],
				//JSON object that list Booking Set ID and Name for THIS Training Programme
				'bsjson':{},
				//All bookings in Booking Set selected
				'bsbJson':{},
				//List of unique booking dates in selected booking set
				'bsbDates':{},
				//flag to indicate there is coach assigned 
				'hasCoach':false,
				//List of bookings that HAS Coach assigned
				'hasCoachJson':{},
				//List of all preferred coaches and their display information
				'coachinfo':{},
				//Total Bookings per selected Booking Set
				//	This number represents how many bookings each selected coaches 
				//	will be invited to
				'totalbookings':0
				
			};
			
		
		//If no preferred coach is set, return with error message.
		//No further processing necessary at this point if missing.
		if (!prefCoaches)
		{
			procMsgFld.setDefaultValue(
				'<div style="color:red; font-size: 15px">'+
				'Training Programme is missing one or more preferred coaches to process invitation'+
				'</div>'
			);
			
			res.writePage(nsform);
			
			return;
		}
		
		//if prefCoaches are set, we need to turn it into JS Array since this gets returned as NS Array
		for (var p=0; p < prefCoaches.length; p+=1)
		{
			procJson.jsPrefCoaches.push(prefCoaches[p]);
		}
		
		//PRODUCTION NOTE:
		//	We may want to limit the return booking set based on 
		//	ON OR AFTER CURRENT DATE
		var bslflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		              new nlobjSearchFilter('custrecord_auxmg_bookingset_programme', null, 'anyof', paramTpId),
		              new nlobjSearchFilter('custrecord_auxmg_bookingset_client', null, 'anyof', paramTpClientId)],
			bslcol = [new nlobjSearchColumn('internalid'),
			          new nlobjSearchColumn('name'),
			          new nlobjSearchColumn('custrecord_auxmg_bookingset_startdate').setSort(false)],
			bslrs = nlapiSearchRecord('customrecord_auxm_bookingset', null, bslflt, bslcol);
		for (var b=0; bslrs && b < bslrs.length; b+=1)
		{
			procJson.bookingsetids.push(bslrs[b].getValue('internalid'));
			procJson.bsjson[bslrs[b].getValue('internalid')] = bslrs[b].getValue('name');
		}
		
		//--------------- UI BUILD ----------------
		//Add in Search Button 
		nsform.addSubmitButton('Check Coach Availability');
		
		//Add hidden textarea with comma separated list of Booking List Ids
		//	This is to be used on client side to help select all
		var hiddenBsListFld = nsform.addField('custpage_hidebslist', 'textarea', '', null, null);
		hiddenBsListFld.setDisplayType('hidden');
		hiddenBsListFld.setDefaultValue(procJson.bookingsetids.toString());
		
		//Add Filter Option
		nsform.addFieldGroup('grpa', 'Filter Options', null);
		var booksetlistfld = nsform.addField('custpage_bslist', 'multiselect', 'Select Booking List', null, 'grpa');
		//We are going to add No Booking Set Option by default.
		booksetlistfld.setDisplaySize(400, 4);
		booksetlistfld.setMandatory(true);
		booksetlistfld.setBreakType('startcol');
		booksetlistfld.addSelectOption('-1', 'No Booking Set', false);
		//Loop through procJson.bsjson and add in the Booking Set related to THIS Training Programme
		for (var bs in procJson.bsjson)
		{
			booksetlistfld.addSelectOption(bs, procJson.bsjson[bs], false);
		}
		booksetlistfld.setDefaultValue(paramSelBsOptions);
		
		//Select ALL and Select NONE Links
		var selhelpfld = nsform.addField('custpage_selhelp', 'inlinehtml', '', null, 'grpa');
		selhelpfld.setDefaultValue(
			'<a href="#" onclick="toggleBsfld(\'all\')">Select All</a>'+
			'&nbsp; | &nbsp; '+
			'<a href="#" onclick="toggleBsfld(\'none\')">Select None</a>'
		);
		
		//Add in next column inlineHTML field to display any notices or FYI information.
		var fyiFld = nsform.addField('custpage_fyiinfo', 'inlinehtml', 'FYI', null, 'grpa');		
		fyiFld.setBreakType('startcol');
		
		//Need to add sublist with ability to take action against it.
		//add in sublist with all lines sorted by SO number, and line squence number in DESC
		var linesl = nsform.addSubList('custpage_availls', 'list', 'Coach Availability For Booking Set', null);
		linesl.addField('avail_select','checkbox','Invite');
		linesl.addField('avail_coach','textarea','Coach').setDisplayType('inline');
		linesl.addField('avail_coachid','text','Coach ID').setDisplayType('hidden');
		linesl.addField('avail_country','text','Country');
		linesl.addField('avail_language','text','Language');
		linesl.addField('avail_count','integer',' # Del').setDisplayType('inline');
		
		//------------- POST Related Action ---------------------
		//	THIS is when user clicks Check Availability Submit Button
		if (req.getMethod() == 'POST')
		{
			//----------- Search for matching Booking for User Selected Booking Set List
			//If user have selected Booking Set list from drop down list,
			// 
			if (paramSelBsOptions.length > 0)
			{
				//A. Look for all bookings associated with selected booking set options.
				//	 We need to run createSearch method to grab ALL Booking information 
				//	 related to selected booking sets.
				var bsIdsToMatch = [],
					//10/18/2016
					//hasNoBs = When list of selected Booking Set Filter includes "No Booking Set" option
					//hasYesBs = When list of selected Booking Set filter includes Actual Booking Sets
					hasNoBs = false,
					hasYesBs = false;
				for (var psb=0; psb < paramSelBsOptions.length; psb+=1)
				{
					if (paramSelBsOptions[psb] == '-1')
					{
						//bsIdsToMatch.push('@NONE@');
						//for NONE we don't add it to bsIdsToMatch array.
						//see below for expression filter build
						hasNoBs = true;
					}
					else
					{
						bsIdsToMatch.push(paramSelBsOptions[psb]);
						hasYesBs = true;
					}
				}
				
				//10/18/2016
				//Effie requested that IF the user selected No Booking Set filter, we need to search for 
				//	Bookings where both Booking set is Null AND Coach is Null.
				//	In order to make this work, we have to build a Expression based filter.
				var bookingSetFlt = [];
				if (hasNoBs && hasYesBs)
				{
					//This is a use case where both @NONE@ and BookingSet Ids must be matched
					bookingSetFlt = [
					                 	[
					                 	 	['custentity_ax_bookingset', 'anyof','@NONE@'],
					                 	 	'and',
					                 	 	['custentity_bo_coach', 'anyof','@NONE@']
					                 	],
					                 	'or',
					                 	['custentity_ax_bookingset', 'anyof', bsIdsToMatch]
					                ];
				}
				else if (hasNoBs && !hasYesBs)
				{
					//This where user ONLY selected "No Booking Set" Option
					bookingSetFlt = [
				                 	 	['custentity_ax_bookingset', 'anyof','@NONE@'],
				                 	 	'and',
				                 	 	['custentity_bo_coach', 'anyof','@NONE@']
			                 	 	];
				}
				else
				{
					//this is default. It can NEVER be !hasNoBs and !hasYesBs
					//Default is for ONLY Actual Booking Set selection
					bookingSetFlt = ['custentity_ax_bookingset', 'anyof', bsIdsToMatch];
				}
					
				//Now let's fully build out bsbflt object
				var bsbflt = [
				              	bookingSetFlt,
				              	'and',
				              	['isinactive', 'is', 'F'],
				              	'and',
				              	['custentity_bo_trainingprogramme', 'anyof',paramTpId],
				              	'and',
				              	['parent', 'anyof', paramTpClientId],
				              	'and',
				              	['jobtype','anyof',['11','13']],
				              	'and',
				              	['status','noneof',['37','42','36']]
				             ];
				
				//Run Booking search grab ALL Bookings associated with selected booking set selected
				//	This may include those with NO booking set but matching training programme
				/**
				var bsbflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				              new nlobjSearchFilter('custentity_ax_bookingset', null, 'anyof', bsIdsToMatch),
				              new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', paramTpId),
				              new nlobjSearchFilter('parent', null, 'anyof', paramTpClientId),
				              //ONLY Pull booking that are Face to Face (11) or Virtual (13)
				              new nlobjSearchFilter('jobtype', null, 'anyof', ['11','13']),
				              new nlobjSearchFilter('status', null, 'noneof', ['37','42','36'])],
				*/              
				var	bsbcol = [new nlobjSearchColumn('internalid'),
					          new nlobjSearchColumn('entityid'),
					          new nlobjSearchColumn('enddate'),
					          new nlobjSearchColumn('custentity_bo_coach'),
					          new nlobjSearchColumn('custentity_ax_bookingset')];
				
				//Sandbox Testing Method.
				//For production, include entitystatus filter as well as change the date to current date
				var curDate = new Date();
				if (nlapiGetContext().getEnvironment() == 'SANDBOX')
				{
					curDate = new Date('1/1/2016');
				}
				
				//Add in Enviornment specific Date
				//bsbflt.push(new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(curDate)));
				bsbflt.push('and');
				bsbflt.push(['enddate','onorafter', nlapiDateToString(curDate)]);
				
				//ASSUMPTION: No more than 1000 booking records will be returned.
				//			  Criteria limits it down handful of booking records.
				var	bsbrs = nlapiSearchRecord('job', null,bsbflt, bsbcol);
				/**
				 * bsbJson will contain list of ALL booking records details
				 * {
				 * 		[booking id]:{
				 * 			'entityid':'',
				 * 			'enddate':'',
				 * 			'coachid':'',
				 * 			'coachtext':''
				 * 		}
				 * }
				 * 
				 * bsbDates will contain list of all Unique Dates for all booking in this result
				 * 	so that we can search for availability of each coach
				 * 
				 * hasCoachJson will contain list of ALL bookings that Has Coach already assigned
				 * {
				 * 		[booking id]:{
				 * 			'entityid':'',
				 * 			'coachtext':'',
				 * 			'enddate':'',
				 * 			'bookingsettest':''
				 * 		}
				 * }
				 */
				
				//Incase there aren't any bookings, return out
				if (!bsbrs)
				{
					procMsgFld.setDefaultValue(
						'<div style="color:red; font-size: 15px">'+
						'No Bookings found for selected BookingSet(s). Please try again later.<br/>'+
						'<br/>'+
						'</div>'
					);
						
					res.writePage(nsform);
						
					return;
				}
				
				for (var br=0; br < bsbrs.length; br+=1)
				{
					log('debug','booking id being added',bsbrs[br].getValue('internalid'));
					//Add to Total Bookings
					procJson.totalbookings = parseInt(procJson.totalbookings) + 1;
					
					//Add unique date to bsbDates JSON object
					if (!procJson.bsbDates[bsbrs[br].getValue('enddate')])
					{
						procJson.bsbDates[bsbrs[br].getValue('enddate')] = 0;
					}
					
					//We are going grab count of bookings for each of these dates
					//	This is purely for FYI purposes.
					//	These are number of bookings per each unique date FOR Booking Set Selected
					procJson.bsbDates[bsbrs[br].getValue('enddate')] = parseInt(procJson.bsbDates[bsbrs[br].getValue('enddate')]) + 1;
					
					//Populate bsbJson
					procJson.bsbJson[bsbrs[br].getValue('internalid')] = {
						'entityid':bsbrs[br].getValue('entityid'),
						'enddate':bsbrs[br].getValue('enddate'),
						'coachid':bsbrs[br].getValue('custentity_bo_coach'),
						'coachtext':bsbrs[br].getText('custentity_bo_coach')
					};
					
					//If coach is assigned, add to this
					if (bsbrs[br].getValue('custentity_bo_coach'))
					{
						procJson.hasCoach = true;
						procJson.hasCoachJson[bsbrs[br].getValue('internalid')] = {
							'entityid':bsbrs[br].getValue('entityid'),
							'coachtext':bsbrs[br].getText('custentity_bo_coach'),
							'enddate':bsbrs[br].getValue('enddate'),
							'bookingsettext':bsbrs[br].getText('custentity_ax_bookingset')
						};
					}
				}
				
				//----------- Look up details of ALL Preferred Coach -----------------------
				//	Here we run a search against vendor to grab details of preferred coach
				//	We will build initial skeleton of procJson.coachinfo
				var cvflt = [new nlobjSearchFilter('internalid', null, 'anyof', procJson.jsPrefCoaches)],
					cvcol = [new nlobjSearchColumn('internalid'),
					         new nlobjSearchColumn('entityid'),
					         new nlobjSearchColumn('custentity_coach_primarydeliverycountry'),
					         new nlobjSearchColumn('custentity_coach_nativelanguage')],
					cvrs = nlapiSearchRecord('vendor', null, cvflt, cvcol);
				
				//we assume there are results
				for (var cv=0; cv < cvrs.length; cv+=1)
				{
					//We build procJson.coachinfo
					procJson.coachinfo[cvrs[cv].getValue('internalid')] = {
						'coachtext':cvrs[cv].getValue('entityid'),
						'countrytext':cvrs[cv].getText('custentity_coach_primarydeliverycountry'),
						'languagetext':cvrs[cv].getText('custentity_coach_nativelanguage'),
						'totaldel':0,
						'deldetail':{},
						'deldatecount':0
					};
				}
				
				//----------- Grab Coach Availability for each of unique booking dates -----
				//	Here we look up list of ALL Booking (In Production, not to include completed, delivered and cancelled)
				//	that are already associated with list of preferred coaches for the booking set bookings' date.
				//	We are trying to find out how many bookings he/she already has booked for the dates
				var cbflt = [
				             ['custentity_bo_coach','anyof',procJson.jsPrefCoaches],
				             'and',
				             ['isinactive', 'is','F'],
				             'and',
				             ['enddate', 'onorafter', nlapiDateToString(curDate)],
				             'and',
				             ['jobtype', 'anyof', ['11','13']]
				            ],
				    
					cbcol = [new nlobjSearchColumn('internalid', null, 'count'),
					         new nlobjSearchColumn('custentity_bo_coach', null, 'group'),
					         new nlobjSearchColumn('enddate', null, 'group').setSort()];
				
				//Env. Based search. In Production, do not return cancelled, completed or delivered bookings 
				//		associated with preferred coaches
				if (nlapiGetContext().getEnvironment() == 'PRODUCTION')
				{
					cbflt.push('and');
					cbflt.push(['status','anyof',['37','42','36']]);
				}
				
				//Go through each of bsbDates and add to filter
				var dateFilter = [];
				for (var bsbd in procJson.bsbDates)
				{
					dateFilter.push(['enddate', 'on', bsbd]);
					dateFilter.push('or');
				}
				//Remove the last or element since it'll be extra 'or' value.
				//	for/in loop doesn't know when to end it so we remove the last element instead
				dateFilter.splice(dateFilter.length-1, 1);
				
				//add the filter to cbflt
				cbflt.push('and');
				cbflt.push(dateFilter);
				
				var	cbrs = nlapiSearchRecord('job', null, cbflt, cbcol);
				
				//Loop through the Booking result and update coachinfo JSON coach info by Coach 
				for (var cb=0; cbrs && cb < cbrs.length; cb+=1)
				{
					var cbCoachId = cbrs[cb].getValue('custentity_bo_coach', null, 'group'),
						cbDate = cbrs[cb].getValue('enddate', null, 'group'),
						cbBookCount = cbrs[cb].getValue('internalid', null, 'count');
					
					//Add to totaldel for this coach
					procJson.coachinfo[cbCoachId].totaldel = parseInt(procJson.coachinfo[cbCoachId].totaldel) +
															 parseInt(cbBookCount);
					
					//Add to deldetail for THIS Date
					if (!procJson.coachinfo[cbCoachId].deldetail[cbDate])
					{
						procJson.coachinfo[cbCoachId].deldetail[cbDate] = 0;
						
						//Add to total number of unique booking date
						procJson.coachinfo[cbCoachId].deldatecount = parseInt(procJson.coachinfo[cbCoachId].deldatecount) + 1;
					}
					
					procJson.coachinfo[cbCoachId].deldetail[cbDate] = parseInt(procJson.coachinfo[cbCoachId].deldetail[cbDate]) +
																	  parseInt(cbBookCount);
					
				}
				
				//----------- Go Through procJson.coachinfo and add to sublist
				var helpTextHtml = '<b>Please select list of coaches you wish to offer this booking set to and click "Invite Coaches" Button</b><br/><br/>'+
								   '<table width="100%">'+
								   '<tr>'+
								   '<td><div style="font-weight:bold; size: 14px">&raquo;</div> Selected Coach</td>'+
								   '<td><div style="width: 15px; height: 15px; background-color: green"> </div> No Deliveries</td>'+
								   '<td><div style="width: 15px; height: 15px; background-color: orange"> </div> 1 - 3 Deliveries</td>'+
								   '<td><div style="width: 15px; height: 15px; background-color: red"> </div> 4 or More Deliveries</td>'+
								   '</tr>'+
								   '</table>';
				linesl.setHelpText(helpTextHtml);
				
				//Add the invitation buttons
				linesl.addButton('custpage_invite', 'Invite Coaches', 'availToolInviteCoaches()');
				linesl.addMarkAllButtons();
				
				var lineNumber = 1;
				for (var ci in procJson.coachinfo)
				{
					//log('debug','coach date count', procJson.coachinfo[ci].deldatecount);
					
					//Build Coach Text by delivery count colors
					var availStyle = 'font-weight:bold; font-size: 13px;',
						bookingCount = parseInt(procJson.coachinfo[ci].totaldel);
					if (bookingCount==0)
					{
						availStyle +='color: green;';
					}
					else if (bookingCount > 0 && bookingCount < 4)
					{
						availStyle +='color: orange;';
					}
					else
					{
						availStyle +='color: red;';
					}
					
					var availCodeHtml = '<div style="'+availStyle+'">'+procJson.coachinfo[ci].coachtext+'</div>';
					
					linesl.setLineItemValue('avail_coach', lineNumber, availCodeHtml);
					linesl.setLineItemValue('avail_coachid', lineNumber, ci);
					linesl.setLineItemValue('avail_country', lineNumber, procJson.coachinfo[ci].countrytext);
					linesl.setLineItemValue('avail_language', lineNumber, procJson.coachinfo[ci].languagetext);
					linesl.setLineItemValue('avail_count', lineNumber, procJson.coachinfo[ci].totaldel.toFixed(0));
					lineNumber+=1;
				}
				
				
				//----------- FYI Message Build --------------------------------------
				var hasCoachHtml = '',
					bsBookCountByDateHtml = '';
				//NEED To Build out any messages that needs to be displayed to the user
				
				//Let's show the user statistics for list of bookings under selected booking sets
				bsBookCountByDateHtml = '<div style="font-size: 14px; color: green">'+
									    '&raquo; &nbsp; '+
									    '<a style="color:green" href="#" onclick="togglDetailDivs(\'bsdatedetail\')">'+
									    '<b>Selected BookingSet Booking Dates ('+procJson.totalbookings+' Bookings)</b></a>'+
									    '</div><br/>';
				
				var bsdatetable = '<div id="bsdatedetail" '+
								  'style="padding: 2px; width:650px; height:200px; overflow:scroll; display:none; float:left; font-size: 13px" >'+
								  '<div style="font-size: 12px; color: black">'+
								  'Dates are used to identify availability of preferred coaches.  Number next to date'+
								  ' referrs to number of bookings within selected booking sets on that day<br/>'+
								  '</div>',
					//Show 4 columns per each row. 
					showColsIndex = 3,
					curColIndex = 1;
				for (var bsd in procJson.bsbDates)
				{
					bsdatetable += '<b>'+bsd+' ('+procJson.bsbDates[bsd]+' Bookings)</b>';
					
					if (curColIndex == showColsIndex)
					{
						bsdatetable += '<br/>';
						//reset the variables
						curColIndex = 1;
					}
					else
					{
						bsdatetable += ', ';
						//increment by 1
						curColIndex+=1;
					}
				}
				
				bsdatetable += '</div>';
				
				bsBookCountByDateHtml = bsBookCountByDateHtml + bsdatetable;
				
				//If there are one or more bookings with coach alraedy assigned, build out hasCoachHtml
				if (procJson.hasCoach)
				{
					hasCoachHtml = '<br/><div style="font-size: 14px; color: red">'+
								   '&raquo; &nbsp; '+
								   '<a style="color:red" href="#" onclick="togglDetailDivs(\'coachassignedlist\')">'+
								   '<b>One or More Bookings have Coach Assigned</b></a>'+
								   '</div><br/>';
					
					var acbDetailHtml = '<table border="1" cellspacing="0" cellpadding="5" width="600px">'+
										'<tr>'+
										'<td><b>Booking</b></td>'+
										'<td><b>Booking Set</b></td>'+
										'<td><b>Coach Assigned</b></td>'+
										'</tr>';
					for (var hc in procJson.hasCoachJson)
					{
						var assignedBkSet = procJson.hasCoachJson[hc].bookingsettext;
						if (!assignedBkSet)
						{
							assignedBkSet = 'No Booking Set';
						}
						
						acbDetailHtml += '<tr>'+
										 '<td>'+
										 	procJson.hasCoachJson[hc].entityid+
										 	'<br/>'+
										 	'('+procJson.hasCoachJson[hc].enddate+')'+
										 '</td>'+
										 '<td>'+assignedBkSet+'</td>'+
										 '<td>'+procJson.hasCoachJson[hc].coachtext+'</td>'+
										 '</tr>';
					}
					
					//Defult hide detail section
					acbDetailHtml = '<div id="coachassignedlist" '+
									'style="padding: 2px; width:650px; height:250px; overflow:scroll; display:none; float:left" >'+
									acbDetailHtml+
									'</table>'+
									'</div>';
					
					hasCoachHtml = '<div style="padding: 3px">'+
								   hasCoachHtml + acbDetailHtml+
								   '</div>';
					
				}
				
				fyiFld.setDefaultValue(bsBookCountByDateHtml + hasCoachHtml);
				
			}//End Check for selected Booking Set Values
			
		}//End Post Action
		
		
	}
	catch(procerr)
	{
		procMsgFld.setDefaultValue(
			'<div style="color:red; font-size: 15px">'+
			'Unexpected Error Occurred: <br/>'+
			getErrText(procerr)+
			'</div>'
		);
	}
	
	res.writePage(nsform);
	
}


/***************** CLIENT SCRIPT ************************/
/**
 * Function to queue up processing.
 * This will build out TPID, Selected BookingSet Ids and selected coach ids
 * and pass it in as URL parameter to THIS Suitelet
 */
function availToolInviteCoaches()
{
	//We need to first make sure there are atleast one coach selected.
	var lcnt = nlapiGetLineItemCount('custpage_availls'),
		hasSelected = false,
		strInviteList = '';
	for (var l=1; l <= lcnt; l+=1)
	{
		if (nlapiGetLineItemValue('custpage_availls', 'avail_select', l) == 'T')
		{
			hasSelected = true;
			
			strInviteList += nlapiGetLineItemValue('custpage_availls', 'avail_coachid', l)+',';
		}
	}
	
	//if no lines are selected, throw error
	if (!hasSelected)
	{
		alert('You must select atleast one preferred coach to invite to booking set(s)');
		return false;
	}
	
	//We now need to build URL to refresh THIS suitelet with paramters to queue it up.
	//Build URL to Reload the page
	var slUrl = nlapiResolveURL(
					'SUITELET', 
					'customscript_aux_sl_coachavailbstp', 
					'customdeploy_aux_sl_coachavailbstp', 
					'VIEW'
				);
	
	//remove last comma
	strInviteList = strInviteList.substr(0, (strInviteList.length-1) );
	
	slUrl += '&custpage_progid='+nlapiGetFieldValue('custpage_progid')+
			 '&custpage_progcliid='+nlapiGetFieldValue('custpage_progcliid')+
			 '&cpbslist='+nlapiGetFieldValues('custpage_bslist')+
			 '&invitecoaches='+strInviteList;

	//TESTING
	//alert(strInviteList+' [Size: '+strInviteList.length+']');
	//alert(slUrl);
	//------

	
	window.ischanged = false;
	window.location = slUrl;
	
}

/**
 * Function to show or hide coach assigned detail window 
 * and booking set booking counts by date
 */
function togglDetailDivs(_id)
{
	var curDisplay = document.getElementById(_id).style.display;  
	//If the window is currently no display display it
	if (curDisplay == 'none')
	{
		document.getElementById(_id).style.display = 'block';
	}
	else
	{
		document.getElementById(_id).style.display = 'none';
	}
}

/**
 * Client Helper to select all or none
 * @param _type
 */
function toggleBsfld(_type)
{
	if (_type == 'all')
	{
		var bslistfldval = nlapiGetFieldValue('custpage_hidebslist'),
			allvals = [];
		
		if (!bslistfldval)
		{
			return;
		}
		
		allvals = bslistfldval.split(',');
		//add -1 value
		allvals.push('-1');
		nlapiSetFieldValues('custpage_bslist', allvals, true, true);
	}
	else
	{
		nlapiSetFieldValue('custpage_bslist', '', true, true);
	}
}
