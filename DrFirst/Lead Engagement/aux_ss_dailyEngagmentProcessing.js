/**
 * Daily Engagement Processing job that goes through list of ALL Active contacts who has campaign responses to log engagement
 */

var paramLastProcId = '';
var paramProcessType = '';
var paramDormantSearchId = '';
var paramExecOnContactId = '';
var paramNewCampSearchId = '';

//Static Values of Engagement Status
var paramNewEntityEngagedStatus = '1';
var paramKnownEntityActiveStatus = '2';
var paramKnownEntityPreviouslyDormantStatus = '3';
var paramDormantStatus= '4';

//Statis Values of Process Type
var paramProcAll = '1';
var paramSingleContact = '2';
var paramProcDormant = '3';
var paramNewCampaigns = '4';


function dailyEngagementProc() {

	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct102_lastprocid');
	paramProcessType = nlapiGetContext().getSetting('SCRIPT','custscript_sct102_proctype');
	paramDormantSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sct102_dormantsearchid');
	paramExecOnContactId = nlapiGetContext().getSetting('SCRIPT','custscript_sct102_exectid');
	paramNewCampSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sct102_newcampsearchid');

	var activeCategory = ['26','27','-11','28','2','-4','-15','29','-3','3','4','25','5','@NONE@'];
	
	//Flag to track if scheduled script is completed without being rescheduled
	var isRescheduled = false;
	
	//Search for matching contacts - Default to all
	var cflt = [new nlobjSearchFilter('category','campaignresponse','anyof',activeCategory),
	            new nlobjSearchFilter('isinactive', null,'is','F')];

	//Check for single contact execution.
	if (paramProcessType == paramSingleContact)
	{
		//Make sure it has proper value passed in
		if (!paramExecOnContactId) 
		{
			log('error','Requires Contact ID to process against passed in', 'Missing Contact ID to process against');
			throw nlapiCreateError('ENGAGE-ERROR', 'Required Contact ID to process against', false);
		}
		//log('debug','Running for CONTACT ONLY',paramExecOnContactId);
		cflt = [new nlobjSearchFilter('internalid', null, 'anyof', paramExecOnContactId)];
	}
	
	//Dormant or New Campaign processing
	if (paramProcessType == paramProcDormant || paramProcessType == paramNewCampaigns)
	{
		//Make sure it has proper value passed in
		if (paramProcessType == paramProcDormant && !paramDormantSearchId) 
		{
			log('error','Requires Dormant Search ID to process against passed in', 'Missing Dormant Search ID to process against');
			throw nlapiCreateError('ENGAGE-ERROR', 'Required Dormant Search ID to process against', false);
		}
		
		if (paramProcessType == paramNewCampaigns && !paramNewCampSearchId) 
		{
			log('error','Requires New Campaign Search ID to process against passed in', 'Missing New Campaign Search ID to process against');
			throw nlapiCreateError('ENGAGE-ERROR', 'Required New Campaign Search ID to process against', false);
		}
		
		cflt=[];
	}
	
	//Make sure Last Processed ID is taken into consideration
	if (paramLastProcId) 
	{
		cflt.push(new nlobjSearchFilter('internalidnumber',null,'lessthan',paramLastProcId));
	}
	
	var ccol = null;
	//ONLY pass in 
	if (paramProcessType != paramProcDormant && paramProcessType != paramNewCampaigns)
	{
		ccol = [new nlobjSearchColumn('internalid').setSort(true)];
	}
	
	
	//Search for All matching contacts
	var ecrs = null;
	//Dormant or New Campaign processing
	if (paramProcessType == paramProcDormant || paramProcessType == paramNewCampaigns)
	{
		if (paramProcessType == paramProcDormant)
		{
			ecrs = nlapiSearchRecord(null, paramDormantSearchId, cflt, ccol);
		}
		else
		{
			ecrs = nlapiSearchRecord(null, paramNewCampSearchId, cflt, ccol);
		}
	} 
	else
	{
		ecrs = nlapiSearchRecord('contact', null, cflt, ccol);
	}
	
	
	//loop through the result
	for (var e=0; ecrs && e < ecrs.length; e++) 
	{
		//log('debug','processing index '+e, ecrs[e].getValue('internalid'));
		var contactid = '';
		if (paramProcessType == paramProcDormant || paramProcessType == paramNewCampaigns) 
		{
			
			contactid = ecrs[e].getValue('internalid',null,'group');
			log('debug','Dormant (3)/New Camp (4) ['+paramProcessType+'] Contact ID',contactid);
		}
		else
		{
			contactid = ecrs[e].getId();
		}
		
		
		//THIS should be part of Contact Search to return out company
		var crec = nlapiLoadRecord('contact',contactid);
		//for each contact, we run two searches: 1) LSA change search sorted by added date 2) Campaign Response Date sorted by response date.
		//Starting from Contact created date, to current date, we attempt to build engaement process
		
		var lsaJson = {};
		var campJson = {};
		//Build Existing Engagement to ensure No Duplicates
		var engJson = {};
		
		//1. Search for ALL Campaigns
		//If NO campaign, we can skip back load process
		//	- Exclude Inactive Campaign
		//	- Exclude Purchase list category
		var campflt = [new nlobjSearchFilter('internalid', null, 'anyof', contactid),
		               new nlobjSearchFilter('isinactive','campaignresponse','is','F'),
		               new nlobjSearchFilter('category','campaignresponse','anyof',activeCategory)];
		
		var campcol = [new nlobjSearchColumn('internalid','campaignResponse',null),
		               new nlobjSearchColumn('responsedate','campaignResponse',null)];
		var camprs = nlapiSearchRecord('contact', null, campflt, campcol);
		
		//ONLY process when there is camp. to process
		if (camprs && camprs.length > 0) {
			//Loop through each Campaign and populate the values
			for (var c=0; camprs && c < camprs.length; c++) 
			{
				if (camprs[c].getValue('responsedate','campaignResponse',null)) {
					var campdate = nlapiDateToString(nlapiStringToDate(camprs[c].getValue('responsedate','campaignResponse',null)));
					campJson[campdate] = camprs[c].getValue('internalid','campaignResponse',null);
				}
			}
			
			//2. Search for ALL LSA changes
			var lsasysflt = [new nlobjSearchFilter('field','systemnotes','anyof',['CUSTENTITY_LINK_NAME_LSA']),
			                 new nlobjSearchFilter('internalid', null, 'anyof', contactid)];
			
			//result is sorted in ASC by system notes date field. 
			var lsasyscol = [new nlobjSearchColumn('date','systemNotes',null).setSort(),
			                 new nlobjSearchColumn('oldvalue','systemNotes',null),
			                 new nlobjSearchColumn('newvalue','systemNotes',null)];
			var lsasysrs = nlapiSearchRecord('contact', null, lsasysflt, lsasyscol);
			
			
			//3. Grab list of existing engagement so that no duplicate is created
			var engflt = [new nlobjSearchFilter('custrecord_engrec_contact_name', null, 'anyof', contactid)];
			
			var engcol = [new nlobjSearchColumn('custrecord_engrec_engage_status'),
			              new nlobjSearchColumn('custrecord_engrec_date_created'),
			              new nlobjSearchColumn('internalid'),
			              new nlobjSearchColumn('custrecord_engrec_last_engage_date')];
			var engrs = nlapiSearchRecord('customrecord_aux_engagment_record', null, engflt, engcol);
			//Build JSON object of Existing Engagement
			for (var g=0; engrs && g < engrs.length; g++) {
				engJson[engrs[g].getValue('custrecord_engrec_date_created')]={
					'status':engrs[g].getValue('custrecord_engrec_engage_status'),
					'id':engrs[g].getValue('internalid'),
					'lastengdate':engrs[g].getValue('custrecord_engrec_last_engage_date')
				};
			}
			
			//Loop through each LSA and populate the values
			for (var l=0; lsasysrs && l < lsasysrs.length; l++) 
			{
				if (l==0) 
				{
					//if result is very first one, check for old value AND new value.
					//this is because some record may NOT have original value logged
					if (lsasysrs[l].getValue('oldvalue','systemNotes',null)) 
					{
						lsaJson[getLsaDateFromName(lsasysrs[l].getValue('oldvalue','systemNotes',null))] = getLsaDateFromName(lsasysrs[l].getValue('oldvalue','systemNotes',null));
					}		
				}		
				//Always add in New Value
				lsaJson[getLsaDateFromName(lsasysrs[l].getValue('newvalue','systemNotes',null))] = getLsaDateFromName(lsasysrs[l].getValue('newvalue','systemNotes',null));
			}
			
			//Just in case LSA System yield no value, see if there is a value on the body field.
			if (!lsasysrs && crec.getFieldValue('custentity_link_name_lsa')) 
			{
				lsaJson[getLsaDateFromName(crec.getFieldValue('custentity_link_name_lsa'))] = getLsaDateFromName(crec.getFieldValue('custentity_link_name_lsa'));
			}
					
			//Loop through starting from created date to current
			var created = nlapiStringToDate(crec.getFieldValue('datecreated'));
			created = nlapiDateToString(created);
			created = nlapiStringToDate(created);
			
			var current = nlapiDateToString(new Date());
			current = nlapiStringToDate(current);
			
			var loopDate = created;
			
			//tracks last activity date either via LSA or Campaign
			var lastActivityDate = '';
			
			//Date of last engagment. This date is set After each time engagement is actually created.
			var lastEngagementDate = '';
			
			//Flag to indicate IF the ANY activity was logged.
			//Used to create dorman record ONLY when this is true.
			var engagementLogged = false;
			var dormantCreated = false;
			
			//alert('lsaJson: '+JSON.stringify(lsaJson));
			//alert('campJson: '+JSON.stringify(campJson));
			//alert('engJson: '+JSON.stringify(engJson));
			
			//------------- Loop through Each day and match it up
			while(loopDate <= current) 
			{
				var strDate = nlapiDateToString(loopDate);
				
				//Check to see if we have ANY activity on this Date
				if (!lsaJson[strDate] && !campJson[strDate]) 
				{
					//log('debug','Checking for Dormant '+strDate+' against LSA '+lastActivityDate, getDateDiff(strDate, lastActivityDate));
					if (engagementLogged && !dormantCreated && lastActivityDate && getDateDiff(strDate, lastActivityDate) > 90) 
					{
						if (!engJson[strDate] || (engJson[strDate] && engJson[strDate].status != paramDormantStatus)) 
						{
							//alert(strDate+' Create Dormant record - '+getDateDiff(strDate, lastActivityDate));
							createEngagementRecord(crec, strDate, paramDormantStatus, lastActivityDate,'',lastEngagementDate);
						} else {
							//if existing record doesn't have last engagement date, update the record
							if (engJson[strDate].id && !engJson[strDate].lastengdate && lastEngagementDate) {
								//log('audit', 'Last Engagment Logged Date: '+strDate, lastEngagementDate);
								nlapiSubmitField('customrecord_aux_engagment_record', engJson[strDate].id, 'custrecord_engrec_last_engage_date', lastEngagementDate, false);
							}
						}
						dormantCreated = true;
					}
					
					//increment one day and go too next
					loopDate = nlapiAddDays(loopDate, 1);
					continue;
				}
				
				//there is Some activity 
				if (lsaJson[strDate] || campJson[strDate]) 
				{
					var strCampId = '';
					if (campJson[strDate]) 
					{
						strCampId = campJson[strDate];
					}
					
					//We ONLY take engagement action IF it's campaign event
					if (campJson[strDate]) 
					{
						if (!lastActivityDate || (!engagementLogged && lastActivityDate)) 
						{
							//FIRST time any activity being occured
							//Mark it as First Time engagement if at the date of campaign response:
							//	lastActivityDate (LSA or Campaign) is EMPTY
							//	 OR
							//	Engagement Record was NEVER created AND lastActivityDate logged 
							var engActivityToLog = '';
							if (!lastActivityDate) {
								//Never had ANY activity. Mark it as new
								//log('debug','FIRST TIME Create as NEW Entity - Engaged',strDate+' Create NEW Entity Engaged');
								engActivityToLog = paramNewEntityEngagedStatus;
							} 
							else 
							{
								//It HAS Last Activity 
								if (getDateDiff(strDate, lastActivityDate) > 90) 
								{
									//If greater than 90, it's Previously Dormant
									//log('debug','FIRST TIME Create as Known Entity - Prev. Dormant',strDate+' Create Known Entity Prev Dormant');
									engActivityToLog = paramKnownEntityPreviouslyDormantStatus;
								}
								else 
								{
									//If Less, it's KNOWN Entity Active
									//log('debug','FIRST TIME Create as Known Entity - Active',strDate+' Create Known Entity Active');
									engActivityToLog = paramKnownEntityActiveStatus;
								}
							}
							
							//Check to make sure no duplicate is created
							//log('audit', 'Last Engagment Logged Date: '+strDate, lastEngagementDate);
							if (!engJson[strDate] || (engJson[strDate] && engJson[strDate].status != engActivityToLog)) 
							{
								createEngagementRecord(crec, strDate, engActivityToLog, lastActivityDate,strCampId,lastEngagementDate);
							} else {
								//if existing record doesn't have last engagement date, update the record
								if (engJson[strDate].id && !engJson[strDate].lastengdate && lastEngagementDate) {
									nlapiSubmitField('customrecord_aux_engagment_record', engJson[strDate].id, 'custrecord_engrec_last_engage_date', lastEngagementDate, false);
								}
							}
						}
						else 
						{
							//Has logged engagement before. 
							if (dormantCreated) 
							{
								//log('audit', 'Last Engagment Logged Date: '+strDate, lastEngagementDate);
								if (!engJson[strDate] || (engJson[strDate] && engJson[strDate].status != paramKnownEntityPreviouslyDormantStatus)) 
								{
									//If previous logged engage Dormant, create previoulsy dorman active status IF it's not a duplicate
									//log('debug','Create as Known Entity - Prev. Dormant',strDate+' Create Known Entity - Previously Dormant - '+getDateDiff(strDate, lastActivityDate));
									createEngagementRecord(crec, strDate, paramKnownEntityPreviouslyDormantStatus, lastActivityDate,strCampId,lastEngagementDate);
								} else {
									//if existing record doesn't have last engagement date, update the record
									if (engJson[strDate].id && !engJson[strDate].lastengdate && lastEngagementDate) {
										nlapiSubmitField('customrecord_aux_engagment_record', engJson[strDate].id, 'custrecord_engrec_last_engage_date', lastEngagementDate, false);
									}
								}
							} 
							else 
							{
								//log('audit', 'Last Engagment Logged Date: '+strDate, lastEngagementDate);
								//Create as Known Entity - Active as long as it's not a duplicate
								if (!engJson[strDate] || (engJson[strDate] && engJson[strDate].status != paramKnownEntityActiveStatus)) 
								{
									//log('debug','Create as Known Entity - Active',strDate+' Create Known Entity - Active - '+getDateDiff(strDate, lastActivityDate));
									createEngagementRecord(crec, strDate, paramKnownEntityActiveStatus, lastActivityDate,strCampId,lastEngagementDate);
								} else {
									//if existing record doesn't have last engagement date, update the record
									if (engJson[strDate].id && !engJson[strDate].lastengdate && lastEngagementDate) {
										nlapiSubmitField('customrecord_aux_engagment_record', engJson[strDate].id, 'custrecord_engrec_last_engage_date', lastEngagementDate, false);
									}
								}
							}
						}
						
						//Mark it as engatement record created
						engagementLogged = true;
						
						//ONly turn it off if engagement was logged.
						//This is to RESET the dormant creation timer
						dormantCreated = false;
						
						//Set the last Engagement Date here. 
						lastEngagementDate = strDate;
					}
					
					//Update last activity to current activity
					lastActivityDate = strDate;
				}
				//increment one day
				loopDate = nlapiAddDays(loopDate, 1);
			}
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((e+1) / ecrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		//log('debug','Processed id '+ecrs[e].getId(),'Remaining: '+nlapiGetContext().getRemainingUsage());
		if ((e+1)==1000 || ((e+1) < ecrs.length && nlapiGetContext().getRemainingUsage() < 1000)) {
			//reschedule
			isRescheduled = true;
			log('audit','Getting Rescheduled at', contactid);
			var rparam = new Object();
			rparam['custscript_sct102_lastprocid'] = contactid;
			rparam['custscript_sct102_proctype'] = paramProcessType;
			rparam['custscript_sct102_dormantsearchid'] = paramDormantSearchId;
			//NEVER pass in custscript_sct102_exectid since it should always END after processing one and NEVER use up all 10000 Gov. Limit
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
	
	
	//IF New Campaign Process was executed and process is complete, queue up Phone Call processing
	if (!isRescheduled && paramProcessType == paramNewCampaigns)
	{
		//Queue up Current Days' Phone Call Processing
		nlapiScheduleScript('customscript_aux_ss_engstatusonphonecall',null,null);
	}
}

/**
 * Function to create the engagement record
 */
function createEngagementRecord(_contactRec, _strDate, _engStatus, _lsaDate, _campId, _lastEngagementDate) 
{
	var egrecid = -1;
	
	var egrec = nlapiCreateRecord('customrecord_aux_engagment_record', {recordmode:'dynamic'});
	try {
		
		egrec.setFieldValue('custrecord_engrec_contact_name', _contactRec.getId());
		if (_contactRec.getFieldValue('company'))
		{
			egrec.setFieldValue('custrecord_engrec_company_name', _contactRec.getFieldValue('company'));
		}		
		egrec.setFieldValue('custrecord_engrec_engage_status', _engStatus);
		egrec.setFieldValue('custrecord_engrec_date_created', _strDate);
		egrec.setFieldValue('custrecord_engrec_lsa', _lsaDate);
		egrec.setFieldValue('custrecord_engrec_campaign_response', _campId);
		egrec.setFieldValue('custrecord_engrec_last_engage_date',_lastEngagementDate);
		
		egrecid = nlapiSubmitRecord(egrec, true, true);
		
	}
	catch (createerr) 
	{
		//log('error','Error Creating Engagement','Contact ID: '+_contactRec.getId()+' ERROR: '+getErrText(createerr));
		//try adding it again without company this is due to inactive company record
		egrec.setFieldValue('custrecord_engrec_company_name', '');
		try 
		{
			egrecid = nlapiSubmitRecord(egrec, true, true);
		} 
		catch (retryerr) 
		{
			log('error','Error Creating Engagement','Contact ID: '+_contactRec.getId()+' ERROR: '+getErrText(retryerr));
		}
		
	}
	
	return egrecid;
}

/**
 * Calculates the difference between two dates in Days
 */
function getDateDiff(currDate, activityDate) 
{
	var date1 = nlapiStringToDate(currDate).getTime();
	var date2 = nlapiStringToDate(activityDate).getTime();
	var diff = Math.ceil((date1 - date2)/(1000 * 3600 * 24));
	return diff;
}

/**
 * Function to separate out date from LSA link name
 * @param _val
 */
function getLsaDateFromName(_val) 
{
	var arval = _val.split(' ');
	return arval[0];
}