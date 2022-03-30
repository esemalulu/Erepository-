/**
 * UI Suitelet that gives users ability to search for available coaches based series of filters.
 * This SL simulates what Saved Search https://system.netsuite.com/app/common/search/searchresults.nl?searchid=3054&saverun=T&whence= was not able to do.
 * Issue with using saved search is that adding date filter at the filter level removed 0 coaches. 
 * Logic has to be done dynamically by summary formula logic
 * 
 * @param req
 * @param res
 */

var arBookingStatus = [
                       {"value":"37","text":"Cancelled"},{"value":"76","text":"Complete"},{"value":"42","text":"Completed"},
                       {"value":"36","text":"Delivered"},{"value":"75","text":"Delivery"},{"value":"89","text":"Development - 0. Review"},
                       {"value":"74","text":"Development - 1. Initiation"},{"value":"90","text":"Development - 10. Internal Close"},
                       {"value":"82","text":"Development - 2. Outline"},{"value":"77","text":"Development - 3. First Iteration"},
                       {"value":"78","text":"Development - 4. Second Iteration"},{"value":"84","text":"Development - 5. Subsequent Iteration"},
                       {"value":"85","text":"Development - 6. Design"},{"value":"86","text":"Development - 7. Pilot"},
                       {"value":"87","text":"Development - 8. Post Pilot"},{"value":"88","text":"Development - 9. Sign-off"},
                       {"value":"83","text":"Pending 7 Day Check"},{"value":"46","text":"Pending Brief"},{"value":"28","text":"Pending Coach"},
                       {"value":"44","text":"Pending Course"},{"value":"35","text":"Pending Delivery"},{"value":"41","text":"Pending Elapsed Feedback"},
                       {"value":"50","text":"Pending Eprompts"},{"value":"40","text":"Pending Immediate Feedback"},{"value":"49","text":"Pending Invites"},
                       {"value":"45","text":"Pending Location"},{"value":"34","text":"Pending Pack"},{"value":"33","text":"Pending Pre-pack"},
                       {"value":"71","text":"Pending Webex"},{"value":"43","text":"Pending Zone"},{"value":"66","text":"Provisional"},
                       {"value":"72","text":"Sales"},{"value":"73","text":"Scope"}];

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


function coachAvailChecker(req, res)
{

	//If isiframe=T, hide main navigation bar
	var isIframe = false;
	if (req.getParameter('isiframe')=='T' || req.getParameter('custpage_isiframeval')=='T')
	{
		isIframe = true;
	}
	
	var nsform = nlapiCreateForm('MindGym Coach Availability Checker', isIframe);
	nsform.setScript('customscript_aux_cs_coachavailcheckhelp');
	
	//Hide a isiframe 
	var isIframeValueFld = nsform.addField('custpage_isiframeval', 'checkbox', '', '', null);
	isIframeValueFld.setDisplayType('hidden');
	isIframeValueFld.setDefaultValue((isIframe)?'T':'F');
	
	var procMsgFld = nsform.addField('custpage_procmsg', 'inlinehtml', '', null, null);
	procMsgFld.setLayoutType('outsideabove');
	
	//Grab search submissions
	var paramFromDate = (req.getParameter('custpage_fromdate')?req.getParameter('custpage_fromdate'):'');
	var paramToDate = (req.getParameter('custpage_todate')?req.getParameter('custpage_todate'):'');
	var paramCoachProgramme = (req.getParameter('custpage_coachprogramme')?strTrim(req.getParameter('custpage_coachprogramme')):'');
	var paramCoachUpskills = (req.getParameter('custpage_coachupskills')?strTrim(req.getParameter('custpage_coachupskills')):'');
	var paramCoachLists = (req.getParameterValues('custpage_coaches')?req.getParameterValues('custpage_coaches'):'');
	var paramCoachCountry = (req.getParameter('custpage_country')?req.getParameter('custpage_country'):'');
	var paramCoachLanguage = (req.getParameter('custpage_language')?req.getParameter('custpage_language'):'');
	var paramCoachIsSenior = (req.getParameter('custpage_issenior')=='T'?'T':'F');
	var paramCoachIsMaster = (req.getParameter('custpage_ismaster')=='T'?'T':'F');
	var paramCoachIsVirtual = (req.getParameter('custpage_isvirtual')=='T'?'T':'F');
	var paramCoachNoDel = (req.getParameter('custpage_nodelcoaches')=='T'?'T':'F');
	var paramCoachClientLicenseOnly = (req.getParameter('custpage_cclonly')=='T'?'T':'F');
	
	try
	{
		//Hidden cclonly field.
		//This is ONLY set by iframe version where value comes from Booking type being "License" (12)
		var cclOnlyFld = nsform.addField('custpage_cclonly', 'checkbox','Client License Only: ', null, null);
		cclOnlyFld.setDefaultValue(paramCoachClientLicenseOnly);
		cclOnlyFld.setDisplayType('hidden');
		
		nsform.addFieldGroup('custpage_grpa', 'Search Filter Options', null);
		//======= Filter Column A
		var fromDate = nsform.addField('custpage_fromdate', 'date', 'Delivery From: ', null, 'custpage_grpa');
		fromDate.setBreakType('startcol');
		fromDate.setMandatory(true);
		fromDate.setDefaultValue(paramFromDate);
		if (isIframe)
		{
			fromDate.setDisplayType('hidden');
		}
		
		var toDate = nsform.addField('custpage_todate','date','Delivery To: ', null, 'custpage_grpa');
		toDate.setMandatory(true);
		toDate.setDefaultValue(paramToDate);
		if (isIframe)
		{
			toDate.setDisplayType('hidden');
		}
		
		//======= Filter Column B
		var coachList = nsform.addField('custpage_coaches','multiselect','Coaches: ', 'customrecord_coach','custpage_grpa');
		coachList.setDefaultValue(paramCoachLists);
		coachList.setBreakType('startcol');
		if (isIframe)
		{
			coachList.setDisplayType('hidden');
		}
		
		//======= Filter Column C
		var coachProgramme = nsform.addField('custpage_coachprogramme','select','Coach Programme: ', 'customrecord_trainingprogramme', 'custpage_grpa');
		coachProgramme.setBreakType('startcol');
		coachProgramme.setDefaultValue(paramCoachProgramme);
		if (isIframe)
		{
			coachProgramme.setDisplayType('hidden');
		}
		
		var coachUpskills = nsform.addField('custpage_coachupskills','select','Coach Product/Upskills: ', 'customlist_coach_product_upskill', 'custpage_grpa');
		coachUpskills.setDefaultValue(paramCoachUpskills);
		if (isIframe)
		{
			coachUpskills.setDisplayType('hidden');
		}
		
		//======= Filter Column D
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
		if (isIframe)
		{
			//countryFlt.setDisplayType('hidden');
		}
		
		//Coach Primary Language
		var coachLang = nsform.addField('custpage_language','select','Coach Native Language: ','customrecord_languages','custpage_grpa');
		coachLang.setDefaultValue(paramCoachLanguage);
		if (isIframe)
		{
			coachLang.setDisplayType('hidden');
		}
		
		//======= Filter Column E
		//Coach/Is Senior certified
		var isSenior = nsform.addField('custpage_issenior','checkbox','Senior Audience Ready',null,'custpage_grpa');
		isSenior.setBreakType('startcol');
		isSenior.setDefaultValue(paramCoachIsSenior);
		if (isIframe)
		{
			isSenior.setDisplayType('hidden');
		}
		
		//Coach/Is Master TTT
		var isMaster = nsform.addField('custpage_ismaster','checkbox','Master Coach', null, 'custpage_grpa');
		isMaster.setDefaultValue(paramCoachIsMaster);
		if (isIframe)
		{
			isMaster.setDisplayType('hidden');
		}
		
		//Coach/Is virtual certified
		var isVirtual = nsform.addField('custpage_isvirtual','checkbox','Virtual Certified', null, 'custpage_grpa');
		isVirtual.setDefaultValue(paramCoachIsVirtual);
		if (isIframe)
		{
			isVirtual.setDisplayType('hidden');
		}
		
		//ONLY Show NO Delivery coaches
		var onlyNoDel = nsform.addField('custpage_nodelcoaches','checkbox','Only Show No Deliveries', null, 'custpage_grpa');
		onlyNoDel.setDefaultValue(paramCoachNoDel);
		if (isIframe)
		{
			onlyNoDel.setDisplayType('hidden');
		}
		
		//if (!isIframe)
		//{
			nsform.addSubmitButton('Check Availability');
		//}
		
		
		//----------------- Run Search ---------------------------------------------------------
		//1. Grab list of ALL coaches that matches Coach related filter
		//2. Grab summary based search of booking count for coaches that matches filter
		
		//Main JSON Object used to build UI
		var availJson = {};
		
		var coachGroupIds = [];
		
		if (req.getMethod() == 'POST' || isIframe)
		{
			
			var coachListFlt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
								new nlobjSearchFilter('custentity_coach_coachstatus', null, 'noneof','2')];
			
			if (paramCoachClientLicenseOnly=='T')
			{
				//ONLY display Coaches (vendors) with category of Coach - Client license
				coachListFlt.push(new nlobjSearchFilter('category', null, 'anyof',['9']));
			}
			else
			{
				coachListFlt.push(new nlobjSearchFilter('category', null, 'anyof',['5','12']));
			}


			
			if (paramCoachCountry)
			{
				//custentity_coach_primarydeliverycountry
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_primarydeliverycountry', null, 'anyof', paramCoachCountry));
			}
			
			if (paramCoachLanguage)
			{
				//custentity_coach_nativelanguage
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_nativelanguage', null, 'anyof', paramCoachLanguage));
			}
			
			if (paramCoachIsSenior=='T')
			{
				//custentity_coach_isseniorcertified
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_isseniorcertified', null, 'is', paramCoachIsSenior));
			}
			if (paramCoachIsMaster=='T')
			{
				//custentity_coach_masterttt
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_masterttt', null, 'is', paramCoachIsMaster));
			}
			if (paramCoachIsVirtual=='T')
			{
				//custentity_coach_isvirtualcertified
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_isvirtualcertified', null, 'is', paramCoachIsVirtual));
			}
			
			//custentity_coach_programmes
			if (paramCoachProgramme)
			{
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_programmes', null, 'anyof', paramCoachProgramme));
			}
			
			//custentity19 (Product Upskills)
			if (paramCoachUpskills)
			{
				coachListFlt.push(new nlobjSearchFilter('custentity19', null, 'anyof', paramCoachUpskills));
			}
			
			//custentity_coach_groupingname
			if (paramCoachLists && paramCoachLists.length > 0)
			{
				log('debug','adding paramcochlist','adding: '+paramCoachLists);
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_groupingname', null, 'anyof', paramCoachLists));
			}
			else
			{
				log('debug','adding exclusion','default excusion');
				//DO Not include TBC (723), Recruiting (380) and Multiple Coaches (369) group names
				coachListFlt.push(new nlobjSearchFilter('custentity_coach_groupingname', null, 'noneof',['@NONE@','723','380','369']));
			}
			
			var coachListCol = [
			                    new nlobjSearchColumn('internalid'),
			                    new nlobjSearchColumn('entityid'),
			                    new nlobjSearchColumn('custentity_coach_groupingname'), //Grouping name is used for display
			                    new nlobjSearchColumn('custentity_coach_primarydeliverycountry'), //Grap Coach Country
			                    new nlobjSearchColumn('custentity_coach_isseniorcertified'), //Senior Audience Ready
			                    new nlobjSearchColumn('custentity_coach_masterttt'), // Master Coach
			                    new nlobjSearchColumn('custentity_coach_isvirtualcertified'), //Virtual Certified
			                    new nlobjSearchColumn('custentity_coach_nativelanguage'),
			                    new nlobjSearchColumn('custentity_user') //Portal ID
								];
			
			log('debug','coachListFlt',coachListFlt.length);
			
			var coachListRs = nlapiSearchRecord('vendor', null, coachListFlt, coachListCol);
			log('debug','all vendor search','Executed');
			
			//Populate initial availJson along with list of coach IDs
			for (var c=0; coachListRs && c < coachListRs.length; c+=1)
			{
				if (!coachGroupIds.contains(coachListRs[c].getValue('custentity_coach_groupingname')))
				{
					coachGroupIds.push(coachListRs[c].getValue('custentity_coach_groupingname'));
				}
				
				if (!availJson[coachListRs[c].getValue('custentity_coach_groupingname')])
				{
					availJson[coachListRs[c].getValue('custentity_coach_groupingname')] = {
						'internalids':{},
						'country':'',
						'name':'',
						'language':'',
						'portalid':'',
						'bookingcount':0,
						'bookingdetail':{},
						'bydate':{}
					};
				}
				
				availJson[coachListRs[c].getValue('custentity_coach_groupingname')].internalids[coachListRs[c].getValue('internalid')]={
						'id':coachListRs[c].getValue('internalid'),
						'name':coachListRs[c].getValue('entityid'),
						'senior':coachListRs[c].getValue('custentity_coach_isseniorcertified')=='T'?'T':'F',
						'virtual':coachListRs[c].getValue('custentity_coach_isvirtualcertified')=='T'?'T':'F',
						'master':coachListRs[c].getValue('custentity_coach_masterttt')=='T'?'T':'F'
				};
				availJson[coachListRs[c].getValue('custentity_coach_groupingname')].country = coachListRs[c].getText('custentity_coach_primarydeliverycountry');
				availJson[coachListRs[c].getValue('custentity_coach_groupingname')].name = coachListRs[c].getText('custentity_coach_groupingname');
				availJson[coachListRs[c].getValue('custentity_coach_groupingname')].language = coachListRs[c].getText('custentity_coach_nativelanguage');
				availJson[coachListRs[c].getValue('custentity_coach_groupingname')].portalid = coachListRs[c].getValue('custentity_user');
			}
			
			log('debug','after search','coachGroupIds: '+coachGroupIds.length);
			
			//coachGroupIds
			//search for booking count within the date range
			//log('debug','coachGroupIds',coachGroupIds.toString());
			if (coachGroupIds.length > 0)
			{
				var bookflt = [new nlobjSearchFilter('enddate','custentity_bo_coach','within',paramFromDate, paramToDate),
				               new nlobjSearchFilter('isinactive','custentity_bo_coach','is','F'),
				               new nlobjSearchFilter('custentity_coach_groupingname', null, 'anyof', coachGroupIds),
				               //Case 9568 - Need to make sure we Exclude any booking that's been cancelled
				               new nlobjSearchFilter('custentity_bo_iscancelled','custentity_bo_coach','is','F')
				               ];
				
				
				//if status is passed in, use it
				//if (paramBookingStatus)
				//{
				//	bookflt.push(new nlobjSearchFilter('status','custentity_bo_coach','anyof',paramBookingStatus));
				//}
				
				//Modified to bring out unique booking
				/**
				var bookcol = [new nlobjSearchColumn('custentity_coach_groupingname', null,'group'),
				               new nlobjSearchColumn('internalid','custentity_bo_coach','count')];
				*/
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
				if (arBookItems.length > 0)
				{
					var itemDurFlt = [new nlobjSearchFilter('internalid', null, 'anyof', arBookItems)];
					var itemDurCol = [new nlobjSearchColumn('internalid'),
					                  new nlobjSearchColumn('custitem_job_duration')];
					var itemDurRs = nlapiSearchRecord('item', null, itemDurFlt, itemDurCol);
					
					for (var idm=0; itemDurRs && idm < itemDurRs.length; idm+=1)
					{
						itemDurationJson[itemDurRs[idm].getValue('internalid')] = itemDurRs[idm].getValue('custitem_job_duration');
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
						
						var bookingId = bookrs[b].getValue('internalid','custentity_bo_coach');
						var durationValue = '';
						if (itemDurationJson[bookrs[b].getValue('custentity_bo_item','custentity_bo_coach')])
						{
							durationValue = itemDurationJson[bookrs[b].getValue('custentity_bo_item','custentity_bo_coach')]+' min';
						}
						//OVERALL Booking Detail for this Coach Group
						availJson[coachGrpId].bookingdetail[bookingId] = {
							'client':bookrs[b].getText('customer','custentity_bo_coach'),
							'jobtype':bookrs[b].getText('jobtype','custentity_bo_coach'),
							'datetime':bookrs[b].getValue('enddate','custentity_bo_coach')+' '+bookrs[b].getValue('custentity_bo_eventtime','custentity_bo_coach'),
							'item':bookrs[b].getText('custentity_bo_item','custentity_bo_coach'),
							'duration':durationValue
						};
						
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
								'bookingdetail':{},
								'dayavailability':{
									'morning':0,
									'afternoon':0,
									'evening':0
								}
							};
						}
						//DATE Specific Booking Count
						availJson[coachGrpId].bydate[bookDate].bookingcount = parseInt(availJson[coachGrpId].bydate[bookDate].bookingcount)+1;
						availJson[coachGrpId].bydate[bookDate].bookingdetail[bookingId] = {
							'client':bookrs[b].getText('customer','custentity_bo_coach'),
							'jobtype':bookrs[b].getText('jobtype','custentity_bo_coach'),
							'datetime':bookrs[b].getValue('enddate','custentity_bo_coach')+' '+bookrs[b].getValue('custentity_bo_eventtime','custentity_bo_coach'),
							'item':bookrs[b].getText('custentity_bo_item','custentity_bo_coach'),
							'duration':durationValue
						};
						
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
			}
			
		}
		
		if (paramFromDate || paramToDate)
		{
		
			//------------ FIREST Tab is the high level overview sublist where ALL date range is displayed --------
			//add in sublist with all lines sorted by SO number, and line squence number in DESC
			var hltempdate = nlapiStringToDate(paramFromDate);
			var hlLineNumber = 1;
			var linesh = nsform.addSubList('custpage_availhl', 'list', 'Date Range Highlevel Overview', null);
			linesh.addField('availh_coach','text','Coach');
			
			//Loop through each date and build out the columns for each date
			while(hltempdate <= nlapiStringToDate(paramToDate))
			{
				
				linesh.addField('availh_'+hltempdate.getTime(),'textarea', hltempdate.getDate()+' '+monthAbbr[(hltempdate.getMonth()+1)]);
				
				hltempdate = nlapiAddDays(hltempdate, 1);
			}
			//Loop through each coach and add in values to each columns
			for (var l in availJson)
			{
				//log('debug','running high level',availJson[l].name+' on line '+hlLineNumber);
				//availJson[l].name
				linesh.setLineItemValue('availh_coach', hlLineNumber, availJson[l].name);
				
				//for each coach temp date
				var linetempdate = nlapiStringToDate(paramFromDate);
				while(linetempdate <= nlapiStringToDate(paramToDate))
				{
					//grab bydate JSON object for THIS coach
					var datejson = availJson[l].bydate[nlapiDateToString(linetempdate)];
					var hlBookingCount = (datejson)?datejson.bookingcount:0;
					
					//log('debug','linetempdate '+nlapiDateToString(linetempdate)+' // Line '+hlLineNumber, 'Booking count: '+hlBookingCount);
					
					linesh.setLineItemValue('availh_'+linetempdate.getTime(), hlLineNumber, hlBookingCount.toFixed(0));
					
					linetempdate = nlapiAddDays(linetempdate, 1);
				}
				
				hlLineNumber+=1;
				
			}
			
			
			//------------ Go through EACH Date from to to date and add in Sublist specific for that Date ---------
			var tempdate = nlapiStringToDate(paramFromDate);
			//MAX Sublist display
			var maxdisplay = 7;
			var curcount = 0;
			
			while(tempdate <= nlapiStringToDate(paramToDate))
			{
				if (curcount == maxdisplay)
				{
					break;
				}
				
				//Display the result
				var lineNumber = 1;
				
				var detailTabLabel = tempdate.getDate()+' '+monthAbbr[(tempdate.getMonth()+1)]+' Availability';
				
				//add in sublist with all lines sorted by SO number, and line squence number in DESC
				var linesl = nsform.addSubList('custpage_availls'+curcount, 'list', detailTabLabel, null);
				linesl.addField('avail_colorcode'+curcount,'textarea','...').setDisplayType('inline');
				linesl.addField('avail_coach'+curcount,'text','Coach');
				linesl.addField('avail_viewcoach'+curcount,'textarea','Coach Calendar');
				linesl.addField('avail_country'+curcount,'text','Country');
				linesl.addField('avail_language'+curcount,'text','Language');
				linesl.addField('avail_count'+curcount,'integer',' # Deliveries').setDisplayType('inline');
				linesl.addField('avail_morning'+curcount,'integer','Morning');
				linesl.addField('avail_afternoon'+curcount,'integer','Afternoon');
				linesl.addField('avail_evening'+curcount,'integer','Evening');
				linesl.addField('avail_bookdetail'+curcount,'textarea','Delivery Information').setDisplayType('inline');
				
				var helpTextHtml = '<table width="100%">'+
								   '<tr>'+
								   '<td><div style="width: 25px; height: 25px; background-color: green"> </div> No Deliveries</td>'+
								   '<td><div style="width: 25px; height: 25px; background-color: orange"> </div> 1 - 3 Deliveries</td>'+
								   '<td><div style="width: 25px; height: 25px; background-color: red"> </div> 4 or More Deliveries</td>'+
								   '</tr>'+
								   '</table>';
				linesl.setHelpText(helpTextHtml);
				
				for (var l in availJson)
				{
					
					
					//grab date specific Booking info
					var datejson = availJson[l].bydate[nlapiDateToString(tempdate)];
					
					var bookingCount = (datejson)?datejson.bookingcount:0;
					
					//Don't show if ONLY show No Coach is checked
					if (paramCoachNoDel=='T' && bookingCount >= 1)
					{
						continue;
					}
					
					var bookInfoText = '<table style="font-size: 11px; border: 1px solid #BBB7B7; border-collapse: collapse;" width="500px">';
					
					//MODIFY It to ONLY display for From date range
					if (datejson)
					{
						for (var bb in datejson.bookingdetail)
						{
							var bjson = availJson[l].bookingdetail[bb];
							bookInfoText += '<tr>'+
										    '<td width="140px" style="border: 1px solid #BBB7B7; padding: 5px">'+bjson.client+'</td>'+
										    '<td width="65px" style="border: 1px solid #BBB7B7; padding: 5px">'+bjson.jobtype+'</td>'+
										    '<td width="100px" style="border: 1px solid #BBB7B7; padding: 5px">'+bjson.datetime+'</td>'+
										    '<td width="135px" style="border: 1px solid #BBB7B7; padding: 5px">'+bjson.item+'</td>'+
										    '<td width="50px" style="border: 1px solid #BBB7B7; padding: 5px">'+bjson.duration+'</td>'+
										    '</tr>';
						}
						
						//Add in morning, afternoon and evening numbers
						//dayavailability
						linesl.setLineItemValue('avail_morning'+curcount, lineNumber, datejson.dayavailability.morning.toFixed(0));
						linesl.setLineItemValue('avail_afternoon'+curcount, lineNumber, datejson.dayavailability.afternoon.toFixed(0));
						linesl.setLineItemValue('avail_evening'+curcount, lineNumber, datejson.dayavailability.evening.toFixed(0));
						
					}
					else
					{
						//Add in morning, afternoon and evening numbers
						//dayavailability
						linesl.setLineItemValue('avail_morning'+curcount, lineNumber, '0');
						linesl.setLineItemValue('avail_afternoon'+curcount, lineNumber, '0');
						linesl.setLineItemValue('avail_evening'+curcount, lineNumber, '0');
					}
					
					bookInfoText += '</table>';
					
					var portalUrl = 'https://coach.themindgym.com/calendar?coach_id='+availJson[l].portalid+
									'&year='+tempdate.getFullYear()+
									'&month='+(tempdate.getMonth()+1)+
									'&day='+tempdate.getDate();
					
					var portalUrlHtml = '<a href="'+portalUrl+'" target="_blank">View Coach Calendar</a>';
					
					linesl.setLineItemValue('avail_country'+curcount, lineNumber, availJson[l].country);
					linesl.setLineItemValue('avail_coach'+curcount, lineNumber, availJson[l].name);
					linesl.setLineItemValue('avail_viewcoach'+curcount, lineNumber, portalUrlHtml);
					linesl.setLineItemValue('avail_language'+curcount, lineNumber, availJson[l].language);
					linesl.setLineItemValue('avail_count'+curcount, lineNumber, bookingCount.toFixed(0));
					
					var availStyle = 'width: 30px; height: 30px; border: 1px solid black;';
					if (bookingCount==0)
					{
						availStyle +='background-color: green;';
						//reset bookInfoText to empty if no booking
						bookInfoText = '';
					}
					else if (bookingCount > 0 && bookingCount < 4)
					{
						availStyle +='background-color: orange;';
					}
					else
					{
						availStyle +='background-color: red;';
					}
					
					var availCodeHtml = '<div style="'+availStyle+'"> </div>';
					linesl.setLineItemValue('avail_colorcode'+curcount, lineNumber, availCodeHtml);
					linesl.setLineItemValue('avail_bookdetail'+curcount, lineNumber, bookInfoText);
					
					lineNumber+=1;
				}
				
				tempdate = nlapiAddDays(tempdate, 1);
				curcount += 1;
			} //END of while loop from to TO date
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
	
	res.writePage(nsform);
	
}


//****************** Client Script *************************/

function availCheckPageInit()
{
	if (nlapiGetFieldValue('custpage_isiframeval') == 'T')
	{
		//alert(window.parent.location);
	}
}

function availCheckOnSave()
{

	//Need to make sure the date range is only 14 days
	if (nlapiGetFieldValue('custpage_fromdate') && nlapiGetFieldValue('custpage_todate'))
	{
		var fromDateTime = nlapiStringToDate(nlapiGetFieldValue('custpage_fromdate')).getTime();
		var toDateTime = nlapiStringToDate(nlapiGetFieldValue('custpage_todate')).getTime();
		
		if ( ((toDateTime - fromDateTime)/86400000) > 14 )
		{
			alert('Date range MUST be within 2 weeks or 14 Days');
			return false;
		}		
	}
	
	return true;
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
