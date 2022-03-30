backLoadEngagement();

function backLoadEngagement() {
	
	//Take this OUT as Script Parameter
	var paramNewEntityEngagedStatus = '1';
	var paramKnownEntityActiveStatus = '2';
	var paramKnownEntityPreviouslyDormantStatus = '3';
	
	var paramDormantStatus= '4';
	
	var contactid = '2838491';
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
	               new nlobjSearchFilter('category','campaignresponse','noneof',['-2','10','-12'])];
	var campcol = [new nlobjSearchColumn('title','campaignResponse',null),
	               new nlobjSearchColumn('internalid','campaignResponse',null),
	               new nlobjSearchColumn('responsedate','campaignResponse',null)];
	var camprs = nlapiSearchRecord('contact', null, campflt, campcol);
	
	if (!camprs) {
		alert('No Marketing Campaign Responses Found, EXIT');
		return;
	}
	
	//Loop through each Campaign and populate the values
	for (var c=0; camprs && c < camprs.length; c++) {
		if (camprs[c].getValue('responsedate','campaignResponse',null)) {
			var campdate = nlapiDateToString(nlapiStringToDate(camprs[c].getValue('responsedate','campaignResponse',null)));
			campJson[campdate] = {
				'title':camprs[c].getValue('title','campaignResponse',null),
				'id':camprs[c].getValue('internalid','campaignResponse',null)
			};
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
	var engflt = [new nlobjSearchFilter('custrecord_engrec_contact_name', null, 'anyof', contactid),
	              new nlobjSearchFilter('custrecord_engrec_company_name', null, 'anyof', crec.getFieldValue('company'))];
	var engcol = [new nlobjSearchColumn('custrecord_engrec_engage_status'),
	              new nlobjSearchColumn('custrecord_engrec_date_created')];
	var engrs = nlapiSearchRecord('customrecord_aux_engagment_record', null, engflt, engcol);
	//Build JSON object of Existing Engagement
	for (var e=0; engrs && e < engrs.length; e++) {
		engJson[engrs[e].getValue('custrecord_engrec_date_created')]=engrs[e].getValue('custrecord_engrec_engage_status')
	}
	
	//Loop through each LSA and populate the values
	for (var l=0; lsasysrs && l < lsasysrs.length; l++) {
		
		if (l==0) {
			//if result is very first one, check for old value AND new value.
			//this is because some record may NOT have original value logged
			if (lsasysrs[l].getValue('oldvalue','systemNotes',null)) {
				lsaJson[getLsaDateFromName(lsasysrs[l].getValue('oldvalue','systemNotes',null))] = getLsaDateFromName(lsasysrs[l].getValue('oldvalue','systemNotes',null));
			}		
		}		
		//Always add in New Value
		lsaJson[getLsaDateFromName(lsasysrs[l].getValue('newvalue','systemNotes',null))] = getLsaDateFromName(lsasysrs[l].getValue('newvalue','systemNotes',null));
	}
	
	//Just in case LSA System yield no value, see if there is a value on the body field.
	if (!lsasysrs && crec.getFieldValue('custentity_link_name_lsa')) {
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
		
	//Flag to indicate IF the ANY activity was logged.
	//Used to create dorman record ONLY when this is true.
	var engagementLogged = false;
	
	var dormantCreated = false;
	
	alert('lsaJson: '+JSON.stringify(lsaJson));
	alert('campJson: '+JSON.stringify(campJson));
	alert('engJson: '+JSON.stringify(engJson));
	
	//Use to set it along with engagement record. This ONLY indicates last logged LSA date
	var lastLoggedLsaDate = '';
	
	//------------- Loop through Each day and match it up
	while(loopDate <= current) {
		
		var strDate = nlapiDateToString(loopDate);
		
		//Check to see if we have ANY activity on this Date
		if (!lsaJson[strDate] && !campJson[strDate]) {
			
			if (engagementLogged && !dormantCreated && lastActivityDate && getDateDiff(strDate, lastActivityDate) > 90) {
				
				if (!engJson[strDate] || (engJson[strDate] && engJson[strDate] != paramDormantStatus)) {
					alert(strDate+' Create Dormant record - '+getDateDiff(strDate, lastActivityDate));
					createEngagementRecord(crec, strDate, paramDormantStatus, lastLoggedLsaDate,'');
				}
				
				dormantCreated = true;
			}
			
			//increment one day and go too next
			loopDate = nlapiAddDays(loopDate, 1);
			continue;
		}
		
		//Do something
		if (lsaJson[strDate] || campJson[strDate]) {
			
			var strLsaDate = lsaJson[strDate] || '';
			var strCampId = '';
			var strCampTitle = '';
			if (campJson[strDate]) {
				strCampId = campJson[strDate].id;
				strCampTitle = campJson[strDate].title;
			}
			
			//We ONLY take engagement action IF it's campaign event
			if (campJson[strDate]) {
				
				//FIRST time any activity being occured
				if (!lastActivityDate || (!engagementLogged && lastActivityDate)) {
					
					//Mark it as First Time engagement if at the date of campaign response:
					//	lastActivityDate (LSA or Campaign) is EMPTY
					//	 OR
					//	Engagement Record was NEVER created AND lastActivityDate logged 
					//					
					var engActivityToLog = '';
					if (!lastActivityDate) {
						//Never had ANY activity. Mark it as new
						engActivityToLog = paramNewEntityEngagedStatus;
					} else {
						//It HAS Last Activity 
						if (getDateDiff(strDate, lastActivityDate) > 90) {
							//If greater than 90, it's Previously Dormant
							engActivityToLog = paramKnownEntityPreviouslyDormantStatus;
						} else {
							//If Less, it's KNOWN Entity Active
							engActivityToLog = paramKnownEntityActiveStatus;
						}
					}
					
					if (!engJson[strDate] || (engJson[strDate] && engJson[strDate] != engActivityToLog)) {
						alert(strDate+' Create '+engActivityToLog+' with Campaign Activity');
						createEngagementRecord(crec, strDate, engActivityToLog, lastLoggedLsaDate,strCampId);
					}
					
				} else {
					
					if (dormantCreated) {
						//If previous logged engage Dormant, create previoulsy dorman active status
						if (!engJson[strDate] || (engJson[strDate] && engJson[strDate] != paramKnownEntityPreviouslyDormantStatus)) {
							alert(strDate+' Create Known Entity - Previously Dormant - '+getDateDiff(strDate, lastActivityDate));
							createEngagementRecord(crec, strDate, paramKnownEntityPreviouslyDormantStatus, lastLoggedLsaDate,strCampId);
						}
					} else {
						//Last Activity Date is Set. 
						if (!engJson[strDate] || (engJson[strDate] && engJson[strDate] != paramKnownEntityActiveStatus)) {
							alert(strDate+' Create Known Entity - Active - '+getDateDiff(strDate, lastActivityDate));
							createEngagementRecord(crec, strDate, paramKnownEntityActiveStatus, lastLoggedLsaDate,strCampId);
						}
					}
				}
				
				//Mark it as engatement record created
				engagementLogged = true;
				
				//ONly turn it off if engagement was logged
				dormantCreated = false;
			}
			
			//Update last activity to current activity
			lastActivityDate = strDate;
			
			if (lsaJson[strDate]) {
				lastLoggedLsaDate = strLsaDate;
			}
		}
		
		loopDate = nlapiAddDays(loopDate, 1);
		
	}
	
	alert(loopDate);
}

/**
 * Function to create the engagement record
 */
function createEngagementRecord(_contactRec, _strDate, _engStatus, _lsaDate, _campId) {
	var egrecid = -1;
	
	var egrec = nlapiCreateRecord('customrecord_aux_engagment_record', {recordmode:'dynamic'});
	try {
		
		egrec.setFieldValue('custrecord_engrec_contact_name', _contactRec.getId());
		egrec.setFieldValue('custrecord_engrec_company_name', _contactRec.getFieldValue('company'));
		egrec.setFieldValue('custrecord_engrec_engage_status', _engStatus);
		egrec.setFieldValue('custrecord_engrec_date_created', _strDate);
		egrec.setFieldValue('custrecord_engrec_lsa', _lsaDate);
		egrec.setFieldValue('custrecord_engrec_campaign_response', _campId);
		
		egrecid = nlapiSubmitRecord(egrec, true, true);
		
	} catch (createerr) {
		alert('ERROR: '+createerr.getDetails());
	}
	
	return egrecid;
}

/**
 * Calculates the difference between two dates in Days
 */
function getDateDiff(currDate, activityDate) {
	var date1 = nlapiStringToDate(currDate).getTime();
	var date2 = nlapiStringToDate(activityDate).getTime();
	var diff = Math.ceil((date1 - date2)/(1000 * 3600 * 25));
	return diff;
}

/**
 * Function to separate out date from LSA link name
 * @param _val
 */
function getLsaDateFromName(_val) {
	var arval = _val.split(' ');
	return arval[0];
}