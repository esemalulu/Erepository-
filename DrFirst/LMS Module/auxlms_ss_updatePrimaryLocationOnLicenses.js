/**
 * This function is to 
 * 1) Based on Search - go through list of all licenses that are missing primary location based on saved search
 * OR
 * 2) Based on Search - Handled previous day updates and modify primary location
 * OR
 * 3) Based on Search - Process ALL Licenses in the system again
 * Either case, the saved search MUST have following fixed columns:
 * [0] Internal ID (Minimum) 
 * [1] Formula Text (Group) Same license Identifyer SQL of UserID-ContractLink-PracticeLink
 * [2] License External ID (Count) Count of unique licenses that falls into this group
 * [3] Formula Numeric (SUM) If greater than 1, it means it has primary location. 
 * [4] User ID (Group) Used for specific license group search
 * [5] LMS Contract Link (Group) Used for specific license group search
 * [6] LMS Practice Link (Group) Used for specific license group search
 * 
 * BOTH Search MUST be sorted by Internal ID Minimum in DESC order
 */
function updPrimeLocOnLicBySearch()
{
	var paramSsid = nlapiGetContext().getSetting('SCRIPT', 'custscript_155_procssid'),
		paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_155_lastprocid');
	
	var flt = null;
	if (paramLastProcId)
	{
		flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
	}
	
	var plrs = nlapiSearchRecord(null, paramSsid, flt, null);
	
	if (plrs && plrs.length > 0)
	{
		var allCols = plrs[0].getAllColumns();
		//Go through ALL and execute Update
		for (var i=0; plrs && i < plrs.length; i+=1)
		{
			var minInternalId = plrs[i].getValue(allCols[0]),
				minInternalIdForUpdate = '',
				userId = plrs[i].getValue(allCols[4]),
				contractId = plrs[i].getValue(allCols[5]),
				contractText = plrs[i].getText(allCols[5]),
				practiceId = plrs[i].getValue(allCols[6]),
				practiceText = plrs[i].getText(allCols[6]);
			
			//1. Search for ALL licenses in this group.
			var ulicflt = [new nlobjSearchFilter('custrecord_lmslc_userid', null, 'is', userId),
			               new nlobjSearchFilter('custrecord_lmslc_contract', null, 'anyof', contractId),
			               new nlobjSearchFilter('custrecord_lmslc_practice', null, 'anyof', practiceId)];
			
			var uliccol = [new nlobjSearchColumn('internalid').setSort(),
			               new nlobjSearchColumn('custrecord_lmslc_isdeleted'),
			               new nlobjSearchColumn('isinactive'),
			               new nlobjSearchColumn('custrecord_lmslc_primarylocation')];
			//Use Create Search and have it grab ALL 
			//ASSUMPTION-NO WAY A user license can belong to more than 1000 locations
			var ulicrs = nlapiSearchRecord('customrecord_lmslic', null,ulicflt, uliccol);
			
			//Loop through all existing and turn off primary flag if it is turned on.
			for (var u=0; u < ulicrs.length; u+=1)
			{
				var isInactive = (ulicrs[u].getValue('isinactive') == 'T')?true:false,
					isDeleted = (ulicrs[u].getValue('custrecord_lmslc_isdeleted') == 'T')?true:false;
				
				if (!minInternalIdForUpdate && !isDeleted && !isInactive)
				{
					minInternalIdForUpdate = ulicrs[u].getId();
				}
				
				if (ulicrs[u].getValue('custrecord_lmslc_primarylocation') == 'T')
				{
					log('debug','Updating '+ulicrs[u].getId(),'To Value of F for Primary');
					nlapiSubmitField('customrecord_lmslic', ulicrs[u].getId(), 'custrecord_lmslc_primarylocation', 'F', false);
				}
			}
			
			if (minInternalIdForUpdate)
			{
				//Update minInternalId as primary
				nlapiSubmitField('customrecord_lmslic', minInternalIdForUpdate, 'custrecord_lmslc_primarylocation', 'T', false);
				
				log('debug','Internal ID', minInternalId+'- '+minInternalIdForUpdate+' updated to Primary // Left over usage '+nlapiGetContext().getRemainingUsage());
				
			}
			else
			{
				log('error','For Following UserID/ContractId/PracticeId, NO active/undeleted license exists',userId+'-'+contractText+'-'+practiceText);
			}
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / plrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//reschedule if gov is running low or legnth is 1000
			if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 1000)) {
				var rparam = {
					'custscript_155_lastprocid':minInternalId
				};
				
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				
				log('audit','Rescheduled',JSON.stringify(rparam));
			}
		}
	}
	
}


//DEPRECATED as of 1/7/2016
//replaced by Version 2 function Above
/**
 * Scheduled script to go through all recently modified user/license records and identify the primary location.
 * Logic is to identify the lowest Internal ID from a group of license where ONLY difference is the location.
 * and set that as Primary Location. 
 * If during processing it encounters "Is Deleted == 'T'" Update that record to be inactive
 */
function updatePrimaryLocationOnLicense() {
	
	//ONLY set if we have to run adhoc to go through ALL License record
	var paramProcessAll = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb142_processall');
	//Last processed Id
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb142_lastprocid');
	
	//Search for list of matching licenses to update
	//By default, ONLY grab list of users that got updated TODAY
	var licflt = [new nlobjSearchFilter('lastmodified', null, 'on', 'yesterday')];
	if (paramProcessAll == 'T')
	{
		//Have it go through EVERYTHING
		licflt = null;
	}
	
	//Search column will be used to group and count total # of duplicates
	var liccol = [new nlobjSearchColumn('internalid',null,'min').setSort(true), //0 used to pass in as reschedule index
	              new nlobjSearchColumn('custrecord_lmslc_userid', null, 'group').setSort(true), //1
	              new nlobjSearchColumn('custrecord_lmslc_contract', null, 'group'), //2
	              new nlobjSearchColumn('custrecord_lmslc_practice', null, 'group')];
	
	if (paramLastProcId)
	{
		//if licflt is null, instantiate it now
		if (!licflt)
		{
			licflt = [];
		}
		
		licflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	var licrs = nlapiSearchRecord('customrecord_lmslic', null, licflt, liccol);
	
	if (licrs && licrs.length > 0)
	{
		//This is used to grab the values out because 
		//internalid is being used multiple times in summary search
		var allcols = licrs[0].getAllColumns();
		
		//loop thorugh and delete the records
		for (var i=0; i < licrs.length; i++) {
			
			var minInternalId = licrs[i].getValue(allcols[0]),
				userId = licrs[i].getValue(allcols[1]),
				contractId = licrs[i].getValue(allcols[2]),
				practiceId = licrs[i].getValue(allcols[3]);
			
			if (!userId || !contractId || !practiceId)
			{
				continue;
			}
			
			//Run a test to grab list of ALL matching license records.
			//This Result set will be used to actually execute update
			//SORT it be Location Standalone ID ASC order. 
			var ulicflt = [new nlobjSearchFilter('custrecord_lmslc_userid', null, 'is', userId),
			               new nlobjSearchFilter('custrecord_lmslc_contract', null, 'anyof', contractId),
			               new nlobjSearchFilter('custrecord_lmslc_practice', null, 'anyof', practiceId)];
			
			var numericLocationIdCol = new nlobjSearchColumn('formulanumeric', null, null);
			numericLocationIdCol.setFormula('TO_NUMBER({custrecord_lmslc_locationstaid})');
			
			var uliccol = [new nlobjSearchColumn('internalid'),
			               numericLocationIdCol.setSort(), //Sort it by lowest location ID first
			               new nlobjSearchColumn('custrecord_lmslc_isdeleted'),
			               new nlobjSearchColumn('isinactive'),
			               new nlobjSearchColumn('custrecord_lmslc_primarylocation')];
			//Use Create Search and have it grab ALL 
			//ASSUMPTION-NO WAY A user license can belong to more than 1000 locations
			var ulicrs = nlapiSearchRecord('customrecord_lmslic', null,ulicflt, uliccol);
			
			//This flag tracks if the loop has identified the primary location.
			//	Even with lowest number location number, it doesn't mean first one
			//	is the primary location.  It's possible that first one is marked to be deleted
			//	As soon as primay is marked, set this flag to true
			var hasPrimarySet = false;
			for (var u=0; u < ulicrs.length; u+=1)
			{
				//Before checking for and updating new primary flag. Unset and/or inactive to be deleted record
				if (ulicrs[u].getValue('custrecord_lmslc_primarylocation') == 'T')  
				{
					var preupdflds = [];
					var preupdvals = [];
					
					//if primary is already set, turn it off
					if (ulicrs[u].getValue('custrecord_lmslc_primarylocation') == 'T')
					{
						preupdflds.push('custrecord_lmslc_primarylocation');
						preupdvals.push('F');
					}
					
					//if is deleted is makred than inactive the record
					/**
					 * Logic taken out due to issue where duplicate record error is fired
					if (ulicrs[u].getValue('custrecord_lmslc_isdeleted') == 'T')
					{
						preupdflds.push('isinactive');
						preupdvals.push('T');
					} 
					*/
					
					nlapiSubmitField(
						'customrecord_lmslic', 
						ulicrs[u].getValue('internalid'), 
						preupdflds,
						preupdvals, 
						false
					);
					
					log(
						'debug',
						'Processing '+minInternalId+' group preset',
						'Updated '+ulicrs[u].getValue('internalid')
					);
				}
				
				if (!hasPrimarySet) 
				{
					//as long as the record is NOT marked to be deleted, mark this as primary.
					if (ulicrs[u].getValue('custrecord_lmslc_isdeleted') != 'T' && 
						ulicrs[u].getValue('isinactive') != 'T')
					{
						nlapiSubmitField(
							'customrecord_lmslic', 
							ulicrs[u].getValue('internalid'), 
							'custrecord_lmslc_primarylocation', 
							'T', 
							false
						);
						
						//set the value to TRUE
						hasPrimarySet = true;
					}
				}
				
				log(
					'debug',
					'Processing '+minInternalId+' group',
					'After processing '+ulicrs[u].getValue('internalid')+' // Remaining Usage: '+nlapiGetContext().getRemainingUsage()
				);
			}
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / licrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//reschedule if gov is running low or legnth is 1000
			if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 2000)) {
				var rparam = {
					'custscript_sb142_processall':paramProcessAll,
					'custscript_sb142_lastprocid':minInternalId
				};
				
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				
				log('audit','Rescheduled',JSON.stringify(rparam));
			}
			
		}
	}
	
}