/**
 * Module Description
 * This script file contains functions needed to generate UI and Process
 * parent/child booking setting. This UI is used by CST team to go through set parent booking record.
 * Submitted data will be processed by Scheduled Script.
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Mar 2016     json
 *
 */

/**
 * UI will ask user to select client > Programme. Based on the selection,
 * it will generate list of bookings associated with the two filter values.
 * Each booking will contain drop down list of available parent booking records.
 * The following criteria is used to identify a Parent Booking:
 * 	-	Booking group relationship of related item = Parent + Both
	-	Client = Client on Booking record
	-	Programme = Programme on Booking record
		
 * The following criteria is used to identify a Child Booking:
	-	Booking group relationship of related item = Child + Both
	-	Parent Booking = empty
	-	Client = Client on Booking record
	-	Programme = Programme on Booking record

 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function srchSetParentChildBooking(req, res)
{
	var paramPrtChldUiTitle = nlapiGetContext().getSetting('SCRIPT','custscript_496_uititle'),
		nsform = nlapiCreateForm(paramPrtChldUiTitle, false);
	
	nsform.setScript('customscript_ax_cs_setprntchildbooking');
	var reqProcMsg = req.getParameter('custparam_msg'),
		reqClient = req.getParameter('custpage_client'),
		reqProgramme = req.getParameter('custpage_programme'),
		//9/21/2016
		//Add in Booking Set drop down
		reqBookingSet = req.getParameter('custpage_bookset');
	
	var msgFld = nsform.addField('custpage_msg', 'inlinehtml', '', null, null);
	msgFld.setLayoutType('outsideabove', null);
	msgFld.setDefaultValue(
		'<div style="font-weight:bold; font-size: 17px"><p>'+
		(reqProcMsg?reqProcMsg:'')+
		'</p></div>'
	);
	
	try
	{
		if (req.getMethod() == 'POST')
		{
			//Need to Build Strings:
			//1. [child ID]:[parent ID],...
			var strProc = '';
			for (var r=1; r <= req.getLineItemCount('custpage_linesl'); r+=1)
			{
				var lineSelected = req.getLineItemValue('custpage_linesl', 'linesl_process', r),
					lineParent = req.getLineItemValue('custpage_linesl', 'linesl_parentbooking', r),
					lineChild = req.getLineItemValue('custpage_linesl', 'linesl_bookingid', r);
				
				//In order to be considered as selected, parent must be set and can't be same as child
				//	WITH checkbox checked
				if (lineSelected == 'T' && lineParent && lineParent != lineChild)
				{
					strProc += lineChild+':'+lineParent+',';
				}
			}
			
			log('debug','before substring',strProc);
			
			strProc = strProc.substring(0, (strProc.length-1));
			
			log('debug','after substring',strProc);
			
			//Queue it up for processing
			
			var redirParam = {
					'custparam_msg':''
				},
				
				params = {
					'custscript_499_proctext':strProc,
					'custscript_499_user':nlapiGetContext().getUser()
				},
				queueStatus = '';
			
			try
			{
				queueStatus = nlapiScheduleScript(
							  	'customscript_ax_ss_setprntchildbooking', 
							  	'customdeploy_ax_ss_setprntchildbooking', 
							  	params
					  		  );
				
				if (queueStatus != 'QUEUED')
				{
					throw nlapiCreateError('QUEUE_ERR', 'Unable to queue up script. Returned status was '+queueStatus, false);
				}
				
				redirParam.custparam_msg = 'Successfully queued up for processing. You will get email notification when completed';
			}
			catch (scherr)
			{
				log('error','Error Scheduling script', getErrText(scherr));
				redirParam.custparam_msg = getErrText(scherr);
			}
			
			//DO Redirect
			nlapiSetRedirectURL(
				'SUITELET',
				nlapiGetContext().getScriptId(), 
				nlapiGetContext().getDeploymentId(), 
				'VIEW', 
				redirParam
			);
			
		}
		
		//------------------------ Search Options --------------------------------------------------------------------
		nsform.addFieldGroup('custpage_grpa', 'Search Options', null);
		//Client Account
		var clientFltFld = nsform.addField('custpage_client', 'select', 'Client Account', 'customer', 'custpage_grpa');
		clientFltFld.setBreakType('startcol');
		clientFltFld.setMandatory(true);
		clientFltFld.setDefaultValue(reqClient);
		
		//Training Programme
		var progFltFld = nsform.addField('custpage_programme','select','Training Programme',null,'custpage_grpa');
		progFltFld.setBreakType('startcol');
		progFltFld.addSelectOption('', '', true);
		if (reqClient)
		{
			progFltFld.setMandatory(true);
			
			//Search for list of ALL matching Training Programme by client.
			//	Build training programme field drop down
			var tplflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_tp_clientaccount', null, 'anyof', reqClient)],
				tplcol = [new nlobjSearchColumn('internalid').setSort(true),
				          new nlobjSearchColumn('name')],
				tplrs = nlapiSearchRecord('customrecord_trainingprogramme', null, tplflt, tplcol);
			
			for (var tpl=0; tplrs && tpl < tplrs.length; tpl+=1)
			{
				progFltFld.addSelectOption(
					tplrs[tpl].getValue('internalid'), 
					tplrs[tpl].getValue('name'), 
					false
				);
			}
		}
		progFltFld.setDefaultValue(
			reqProgramme
		);
		
		//9/21/2016
		//Booking Set
		//	These are booking set associated with selected Training Programme.
		var bookSetFld = nsform.addField('custpage_bookset', 'select', 'Booking Set', null, 'custpage_grpa');
		bookSetFld.setBreakType('startcol');
		bookSetFld.addSelectOption('', '', true);
		
		//Only look up related booking set if client and training programme is set
		if (reqProgramme && reqClient)
		{
			//Search for ALL matching Booking set by client + training programme
			var ctbflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_auxmg_bookingset_client', null, 'anyof', reqClient),
			              new nlobjSearchFilter('custrecord_auxmg_bookingset_programme', null, 'anyof', reqProgramme)],
				ctbcol = [new nlobjSearchColumn('internalid'),
				          new nlobjSearchColumn('name')],
				ctbrs = nlapiSearchRecord('customrecord_auxm_bookingset', null, ctbflt, ctbcol);
			
			for (var ctb=0; ctbrs && ctb < ctbrs.length; ctb+=1)
			{
				bookSetFld.addSelectOption(
					ctbrs[ctb].getValue('internalid'), 
					ctbrs[ctb].getValue('name'), 
					false
				);
			}
		}
		bookSetFld.setDefaultValue(reqBookingSet);
		
		//--------------------- List Matching Booking Records ------------------------
		if (reqClient && reqProgramme)
		{
			//********** Make sure there isn't one being processed right now. ONLY show submit when it is safe to run ******/
			//Run a search to find out current status of processor scheduled script
			var sctflt = [new nlobjSearchFilter('scriptid','script','is','customscript_ax_ss_setprntchildbooking')],
				sctcol = [new nlobjSearchColumn('datecreated').setSort(true),
				          new nlobjSearchColumn('status'),
				          new nlobjSearchColumn('percentcomplete')],
				sctrs = nlapiSearchRecord('scheduledscriptinstance', null, sctflt, sctcol),
				showSubmit = true,
				scriptStatusText = '';
			
			//This means something is running
			if (sctrs)
			{
				if (sctrs[0].getValue('status')!='Complete' && sctrs[0].getValue('status')!='Failed' )
				{
					showSubmit = false;
					scriptStatusText = '<div style="color:red; font-weight:bold; font-size: 17px"><p>'+
									   'Script is NOT Available for processing at this time<br/>'+
									   'It is currently in '+sctrs[0].getValue('status')+' with '+
									   sctrs[0].getValue('percentcomplete')+' Completed'+
									   '</p></div>';
				}
			}
			
			if (showSubmit)
			{
				nsform.addSubmitButton('Set Parent/Child Values');
				
			}
			
			msgFld.setDefaultValue(scriptStatusText);
			//********************************************************************/
			
			//Search ALL Booking that matches this Client/Programme Filter 
			//AND Item:Booking Group Relationship is Child or BOTH
			//	  Parent Booking is Empty
			
				//Ignore following Booking Status from being returned
				//@NONE@, 
				//37=Cancelled, 42=Completed, 36=Delivered, 50=Pending Eprompts, 
				//41=Pending Elapsed Feedback, 40=Pending Immediate Feedback
			var bookingStatusToIgnore = ['@NONE@', '37','42','36','50','41','40'],
				childBookGrpIds = ['2','3'], //Child, Both
				parentBookGrpIds = ['1','3'], //Parent, Both
				bklistflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			                 new nlobjSearchFilter('parent', null, 'anyof', reqClient),
			                 new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', reqProgramme),
			                 new nlobjSearchFilter('status', null, 'noneof', bookingStatusToIgnore),
			                 new nlobjSearchFilter('custentity_bookingset_parent', null, 'anyof','@NONE@'),
							 new nlobjSearchFilter('custitem_booking_group_relationship','custentity_bo_item','anyof',childBookGrpIds)],
			                 
				bklistcol = [new nlobjSearchColumn('internalid'),
				             new nlobjSearchColumn('entityid'),
				             new nlobjSearchColumn('customer'),
				             new nlobjSearchColumn('custentity_bo_trainingprogramme'),
				             new nlobjSearchColumn('custentity_bo_buyer'),
				             new nlobjSearchColumn('enddate').setSort(true),
				             //9/20/2016
				             // Request to add event time and be secondary sort
				             new nlobjSearchColumn('custentity_bo_eventtime').setSort(true),
				             //9/30/2016
				             //Ticket 13528 - Add Item Column
				             new nlobjSearchColumn('custentity_bo_item'),
				             new nlobjSearchColumn('status'),
				             new nlobjSearchColumn('custentity_bo_course'),
				             new nlobjSearchColumn('custentity_bo_eventcountry')];
			
			//9/21/2016
			//If reqBookingSet value is set, we need to further filter the list
			//	using custentity_ax_bookingset is reqBookingSet
			if (reqBookingSet)
			{
				bklistflt.push(new nlobjSearchFilter('custentity_ax_bookingset', null, 'anyof', reqBookingSet));
			}
			
			var	bklistrs = nlapiSearchRecord('job', null, bklistflt, bklistcol);
			
			//log('debug','Matching Booking List',(bklistrs?bklistrs.length:0));
			
			//Assume there could be more than 1000 results
			var linesl = nsform.addSubList('custpage_linesl', 'list', 'Possible Child Bookings List', null),
				lineNumber = 1;
			linesl.addField('linesl_process', 'checkbox', 'Process');
			linesl.addField('linesl_bookingid', 'text', 'Booking Internal ID').setDisplayType('hidden');
			linesl.addField('linesl_bookinglink','textarea','Booking').setDisplayType('inline');
			var prtBookFld = linesl.addField('linesl_parentbooking','select','Parent Booking');
			linesl.addField('linesl_clientid','text','Client').setDisplayType('hidden');
			linesl.addField('linesl_programmeid','text','Programme').setDisplayType('hidden');
			linesl.addField('linesl_buyer','text','Buyer').setDisplayType('inline');
			linesl.addField('linesl_date','date','Date').setDisplayType('inline');
			//9/20/2016
			//	Add time next to date
			linesl.addField('linesl_time', 'timeofday','Time').setDisplayType('inline');
			linesl.addField('linesl_status','text','Booking Status').setDisplayType('inline');
			//9/30/2016
			//Ticket 13528 - Add Item Column
			linesl.addField('linesl_item', 'text', 'Item').setDisplayType('inline');
			linesl.addField('linesl_course','text','Course').setDisplayType('inline');
			linesl.addField('linesl_country','text','Country').setDisplayType('inline');			
			
			for (var b=0; bklistrs && b < bklistrs.length; b+=1)
			{
				
				var bookingLinkText = '<a href="'+
									  nlapiResolveURL('RECORD', 'customer',bklistrs[b].getValue('internalid'), 'VIEW')+
									  '" target="_blank">'+
									  bklistrs[b].getValue('entityid')+
									  '</a>';
				linesl.setLineItemValue('linesl_bookingid', lineNumber, bklistrs[b].getValue('internalid'));
				linesl.setLineItemValue('linesl_bookinglink', lineNumber, bookingLinkText);
				linesl.setLineItemValue('linesl_clientid', lineNumber, bklistrs[b].getValue('customer'));
				linesl.setLineItemValue('linesl_programmeid', lineNumber, bklistrs[b].getValue('custentity_bo_trainingprogramme'));
				linesl.setLineItemValue('linesl_buyer', lineNumber, bklistrs[b].getText('custentity_bo_buyer'));
				linesl.setLineItemValue('linesl_date', lineNumber, bklistrs[b].getValue('enddate'));
				//9/20/2016
				//	Add teim value
				linesl.setLineItemValue('linesl_time', lineNumber, bklistrs[b].getValue('custentity_bo_eventtime'));
				linesl.setLineItemValue('linesl_status', lineNumber, bklistrs[b].getText('status'));
				//9/30/2016
				//Ticket 13528 - Add Item Column
				linesl.setLineItemValue('linesl_item', lineNumber, bklistrs[b].getText('custentity_bo_item'));
				linesl.setLineItemValue('linesl_course', lineNumber, bklistrs[b].getText('custentity_bo_course'));
				linesl.setLineItemValue('linesl_country', lineNumber, bklistrs[b].getText('custentity_bo_eventcountry'));
				
				lineNumber+=1;
			}
			
			//******** Grab list of possible Parent Booking records and add as possible option values***********
			var prtBookFlt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				              new nlobjSearchFilter('parent', null, 'anyof', reqClient),
				              new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', reqProgramme),
				              new nlobjSearchFilter('status', null, 'noneof', bookingStatusToIgnore),
							  new nlobjSearchFilter('custitem_booking_group_relationship','custentity_bo_item','anyof',parentBookGrpIds)],
				prtBookCol = [new nlobjSearchColumn('internalid'),
					          new nlobjSearchColumn('entityid'),
					          new nlobjSearchColumn('customer'),
					          new nlobjSearchColumn('custentity_bo_trainingprogramme')],
				prtBookRs = nlapiSearchRecord('job', null, prtBookFlt, prtBookCol);
		
			//Go through and populate bookTrainJson object.
			prtBookFld.addSelectOption('', '', true);
			
			for (var p=0; prtBookRs && p < prtBookRs.length; p+=1)
			{
				prtBookFld.addSelectOption(prtBookRs[p].getValue('internalid'), prtBookRs[p].getValue('entityid'), false);
			}
			
			//Add in Help with results
			linesl.setHelpText('<p style="padding: 10px; font-size: 13px">'+
					   ((bklistrs)?'It is recommended that ONLY <b>20 Records</b> are processed at a time.<br/><br/>':'')+
					   'Found '+((bklistrs)?bklistrs.length:0)+' possible child bookings'+
					   ' and '+((prtBookRs)?prtBookRs.length:0)+' possible parent bookings for Client/Programme Filter'+
					   '</p>');
			
		}
	}
	catch (uierr)
	{
		msgFld.setDefaultValue(
			'<div style="color:red; font-weight:bold; font-size: 17px"><p>'+
			getErrText(uierr)+
			'</p></div>'
		);
	}
	
	res.writePage(nsform);
	
}

/*************** Scheduled Script ***********************/
//Unscheduled dynamic script to process and handle updating and setting of 
//Parent/Child Booking records.
//This scheduled script is NOT mean to be rescheduled.
//	We are starting with ONLY allowing up to 20 records to be processed at a time.
//	WE can allowing up to 100 but this may not work from usability stand point.
//	People will forget what they were working on.

//Apr. 12/2016 - Added ability to go through and remove parent bookin value based on
//			  comma separated list of internal IDs of child booking.
//			  Each value passed into parameter will contain 30 IDs.
//			  when cblmg_ue_setTimezoneInfoOnBooking.js triggers this script
//			  to remove, it will break up each TO BE removed IDs into 30 
//			  and queue it up for processing.
//			  THIS is because Script Parameters does not support MultiSelect Field
//			  THIS version will NOT reschedule since it will use 30 per record to update.
//				30 * 30 = 900 Gov. Unit Max

//Apr. 14/2016 - Added ability to selectively override Coach value of child from Parent
//				 When Selective Coach Override (custscript_499_selectivecoachoverride) parameter
//				 is passed in, script will ONLY override coach value from parent for Child Booking IDs 
//				 passed in. IF NOTHING is provided, it will override for ALL Children

var overwriteFromPrt = ['custentity_bo_overduecomments', //Overdue Comments
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
                        'custentity_cbl_shipadr_lng']; //Lng
                        
function procPrtChildBooking()
{
	var paramToProcText = nlapiGetContext().getSetting('SCRIPT','custscript_499_proctext'),
		paramUser = nlapiGetContext().getSetting('SCRIPT', 'custscript_499_user'),
		procList = [],
		
		paramToRemoveParentText = nlapiGetContext().getSetting('SCRIPT','custscript_499_delprttext'),
		delPrtList = [],
		
		paramSelCoachOrText = nlapiGetContext().getSetting('SCRIPT','custscript_499_selectivecoachoverride'),
		selCoachOrList = [];
	
	log('debug','paramToRemoveParentText',paramToRemoveParentText);
	
	if (paramToRemoveParentText && paramToRemoveParentText.length > 0)
	{
		log('debug','paramToRemoveParentText','Remove Parent from Child Mode: '+paramToRemoveParentText);
		delPrtList = paramToRemoveParentText.split(',');
		
		//loop through each and clear out parent field
		for (var del=0; del < delPrtList.length; del+=1)
		{
			try
			{
				//Due to parent booking field being disabled, NS will use 30 gov points (Load, set, save)
				nlapiSubmitField('job', delPrtList[del], 'custentity_bookingset_parent', '', true);
			}
			catch (delErr)
			{
				throw nlapiCreateError(
					'CLEAR_PARENT_ERR', 
					'Unable to clear parent booking for Child booking ID '+delPrtList[del]+'. All Child IDs are '+delPrtList, 
					false
				);
			}
			
		}
		
	}
	else
	{
		if (!paramToProcText || !paramUser)
		{
			throw nlapiCreateError(
				'PRTCHILD_SET_ERR', 
				'Unable to process due to missing Child to Parent Mapping, Parent to ALL child mapping and/or User who triggered it', 
				false
			);
		}
		
		log('debug','To Process Text',paramToProcText);
		
		log('debug','paramSelCoachOrText', paramSelCoachOrText);
		
		//Split it by comma 
		procList = paramToProcText.split(',');
		
		//Split up Selective Coach Override child booking IDs
		if (paramSelCoachOrText)
		{
			selCoachOrList = paramSelCoachOrText.split(',');
		}
		
		//JSON Object to track list of children per Parent.
		//	THIS JSON is used at the end of processing to update the parent with Child.
		var childByParent={},
			childProcLog = '',
			parentProcLog = '';
		for (var i=0; procList && i < procList.length; i+=1)
		{
			try
			{
				//each child to parent is in format of child:parent
				var chldprt = procList[i].split(':'),
					childId = chldprt[0],
					parentId = chldprt[1];
				
				log('debug','index '+i, chldprt);
				
				//1. Populate childByParent object
				if (!childByParent[parentId])
				{
					childByParent[parentId] = [];
				}
				
				childByParent[parentId].push(childId);
				
				//2. Load the Parent and child records so that we can run inheritence 
				var prtrec = nlapiLoadRecord('job', parentId),
					chdrec = nlapiLoadRecord('job', childId);
					
				//3. Set necessary fields on child records
				chdrec.setFieldValue('custentity_bookingset_parent', parentId);					
				//-----------------------------------------------------------------------------------------
				//Eli - Nov 9, 2016 - Ticket 13520 - Correct Issue with Booking Set being cleared on Child Booking
				var parentBookSet = prtrec.getFieldValue('custentity_ax_bookingset');   	
				if(parentBookSet){
					chdrec.setFieldValue('custentity_ax_bookingset', parentBookSet);  					
				}
				//-----------------------------------------------------------------------------------------					
								
				for (var ow=0; ow < overwriteFromPrt.length; ow+=1)
				{
					var runOverride = true;
					//apr. 14 2016
					//- Logic for selective coach override
					if (overwriteFromPrt[ow] == 'custentity_bo_coach')
					{
						//IF childId is not in the list of selCoachOrList and override list IS passed in
						if (selCoachOrList.length > 0 && !selCoachOrList.contains(childId))
						{
							log('debug','DO NOT sync Coach',childId+' is not in '+selCoachOrList);
							runOverride = false;
						}
					}
					
					//ONLY override if runOverride is true
					if (runOverride)
					{
						chdrec.setFieldValue(
							overwriteFromPrt[ow],
							prtrec.getFieldValue(overwriteFromPrt[ow])
						);
					}
					
				}
				
				//4. Save the Child Record
				nlapiSubmitRecord(chdrec, true, true);
				
				childProcLog += '<li>SUCCESS processing child booking ID '+procList[i]+'</li>';
				
				//4A. Logic to reschedule if we need to 
				
			}
			catch(procerr)
			{
				childProcLog += '<li>ERROR Processing child booking ID '+procList[i]+' <br/>'+
						  		getErrText(procerr)+
						  		'</li>';
				
				log('error','Error Processing '+procList[i], getErrText(procerr));
			}
		}
		childProcLog = '<b>Child Booking Process Log</b>'+
					   '<ul>'+childProcLog+'</ul>';
		
		log('debug','childByParent',JSON.stringify(childByParent));
		//5. Go through and update the parent with children (parentProcLog)
		for (var pt in childByParent)
		{
			//6. Load parent record to update
			try
			{
				var prtrec = nlapiLoadRecord('job', pt);
				
				//Need to grab list of current childrent and merge it
				var currChild = prtrec.getFieldValues('custentity_bookingset_child');
				
				//If NOTHING is currently set, simply set it
				if (currChild && currChild.length > 0)
				{
					//Loop through each currChild. If not in childByParent[pt] array, add it
					for (var cc=0; cc < currChild.length; cc+=1)
					{
						if (!childByParent[pt].contains(currChild[cc]))
						{
							childByParent[pt].push(currChild[cc]);
						}
					}
				}
				
				//Add new value
				prtrec.setFieldValues('custentity_bookingset_child', childByParent[pt]);
				
				nlapiSubmitRecord(prtrec, true, true);
				
				parentProcLog += '<li>SUCCESS processing parent booking ID '+
								 pt+' with following children '+
								 childByParent[pt].toString()+'</li>';
			}
			catch (prterr)
			{
				parentProcLog += '<li>ERROR processing parent booking ID '+
				 				 pt+' with following children '+
				 				 childByParent[pt].toString()+' <br/>'+
				 				 getErrText(prterr)+'</li>';
			}
			
		}
		parentProcLog = '<b>Parent Booking Process Log</b>'+
						'<ul>'+parentProcLog+'</ul>';
		
		//7. Send Notification to triggering user
		nlapiSendEmail(
			-5, 
			paramUser, 
			'Set Parent Booking Process Log '+nlapiDateToString(new Date()), 
			childProcLog + parentProcLog, 
			null, 
			null, 
			null, 
			null, 
			true
		);
	} // End Check for paramToRemoveParentText mode
	
}

/*************** Client Script Helper *******************/
function setBkOnSave()
{
	//Go Through EACH line on the list
	var hasSel = false,
		selectedCnt = 0,
		MAX_ALLOWED = 20;
	
	for (var l=1; l <= nlapiGetLineItemCount('custpage_linesl'); l+=1)
	{
		var lineSelected = nlapiGetLineItemValue('custpage_linesl', 'linesl_process', l),
			lineParent = nlapiGetLineItemValue('custpage_linesl', 'linesl_parentbooking', l),
			lineChild = nlapiGetLineItemValue('custpage_linesl', 'linesl_bookingid', l);
		
		//alert(lineParent);
		
		//In order to be considered as selected, parent must be set and can't be same as child
		//	WITH checkbox checked
		if (lineSelected == 'T' && lineParent && lineParent != lineChild)
		{
			hasSel = true;
			selectedCnt += 1;
		}
		
		//Need to make sure user did NOT select itself as parent
		if (lineSelected == 'T' && lineParent == lineChild)
		{
			alert('For Line '+l+' a child booking can not be parent at the same time');
			return false;
		}
	}
	
	if (!hasSel)
	{
		alert('You must select and provide parent for atleast ONE Child Booking');
		return false;
	}
	
	//Need to make sure user has NOT selected more than 20 records to process
	if (selectedCnt > MAX_ALLOWED)
	{
		alert('It is recommended to ONLY process 20 booking records at a time. You current have '+selectedCnt+' set to process');
		return false;
	}
	
	
	return true;
}

function setBkFldChanged(type, name, linenum)
{
	//Reload the Suitelet page with parameter
	if (name == 'custpage_client' || name == 'custpage_programme' || name == 'custpage_bookset')
	{
		
		var slUrl = nlapiResolveURL(
				'SUITELET', 
				'customscript_ax_sl_setprntchildbooking', 
				'customdeploy_ax_sl_setprntchildbooking',
				'VIEW'),
			clientId = nlapiGetFieldValue('custpage_client'),
			programmeId = nlapiGetFieldValue('custpage_programme'),
			//9/21/2016
			//Add bookingset paramter: custpage_bookset
			bookSetId = nlapiGetFieldValue('custpage_bookset');
		
		//When either clientId or programmeId is set to empty, we set bookSetId to empty.
		//	This is because we can't have booking set list without client or programme to match to
		if (!clientId || !programmeId || !bookSetId)
		{
			bookSetId = '';
		}
		
		if (!clientId)
		{
			clientId = '';
		}
		
		if (!programmeId)
		{
			programmeId = '';
		}
		//Add in Parameters
		slUrl += '&custpage_client='+clientId+
				 '&custpage_programme='+programmeId+
				 '&custpage_bookset='+bookSetId;
		
		
		window.ischanged = false;
		window.location.href=slUrl;
		
		
	}
}
