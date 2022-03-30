/**
 * Replica of Pardot to NetSuite processor based on configuration.
 * Purpose of this script is to identify those contacts missing campaign responses that had any matching interaction.
 * Aug. 2014, NetSuite introduced a defect where Web Service integration user was throwing creation or processing of campaign response process.
 * This was same time when they introduced address sublist changes. It was throwing Zip code is required error.
 * 
 * Using this script we can identify which contacts were affected by 2014 NS bug and any potential misses in the future misses.
 * @param type
 */

var ctx = nlapiGetContext();
var pnsConfig = {};
var pnsDefaultConfig={};
var fireType = ['create','edit','xedit'];

var hasConfig = false;

//Primary entry function
function ruleProcessAudit(type)
{
	//load Default Configuration from Company Setup
	pnsDefaultConfig['defaultcamp'] = ctx.getSetting('SCRIPT','custscript_default_campaign');
	pnsDefaultConfig['pardotuser'] = ctx.getSetting('SCRIPT','custscript_pardot_user');
	pnsDefaultConfig['defaultupdparent'] = ctx.getSetting('SCRIPT','custscript_default_upd_parent');
	
	var paramLastProcConfigId = ctx.getSetting('SCRIPT','custscript_342_lastprocid');
	
	//load Variable/Override Configuration from PNS Config record
	//make sure it returns based on matching record type
	var configFlt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
	if (paramLastProcConfigId)
	{
		configFlt.push(new nlobjSearchFilter('internalidnumber', null,'lessthan', paramLastProcConfigId));
	}
	
	var configCol = [
	                 new nlobjSearchColumn('name'),
	                 new nlobjSearchColumn('internalid').setSort(true),
	                 new nlobjSearchColumn('custrecord_pns_action_fieldname'), //action field name
	                 new nlobjSearchColumn('custrecord_pns_fieldtype'), //action field type
	                 new nlobjSearchColumn('custrecord_pns_action_field_internalid'), //action field internal id
	                 new nlobjSearchColumn('custrecord_pns_action_trigger'), //action trigger
	                 new nlobjSearchColumn('custrecord_pns_act_on_value'), //action value to compare
	                 new nlobjSearchColumn('custrecord_pns_set_to_campaign'), //set to campaign override
	                 new nlobjSearchColumn('custrecord_pns_camp_res_type'), //camp. response type
	                 new nlobjSearchColumn('custrecord_pns_camp_res_note'), //camp response note
	                 new nlobjSearchColumn('custrecord_pns_upd_parent_override'), //create camp res rec for parent override
	                 ];
	
	var configRslt = nlapiSearchRecord('customrecord_pns_camp_act_config', null, configFlt, configCol);
	
	//Loop through each configuration elements
	/**
	 * It's important to note that since Scala config rules are all "Specific Value at Any Time" action trigger, 
	 * THIS Audit script ONLY CHECKS for that trigger type 
	 */
	
	var csvHeader = '"Rule Name","# Issue Contacts","Field Name","Field ID","Trigger Action","Trigger Value","Camp. Res. To Set"\n';
	var csvBody = '';
	
	for (var i=0; configRslt && i < configRslt.length; i++) {
		//Object note is created due to potential multi-line that messes with JSON value
		var txtNoteObj = new Object();
		txtNoteObj.note = configRslt[i].getValue('custrecord_pns_camp_res_note');
		
		var pnsConfig = {
			"name":configRslt[i].getValue('name'),
			"internalid":configRslt[i].getValue('internalid'),
			"fieldname":configRslt[i].getText('custrecord_pns_action_fieldname'),
			"fieldtype":configRslt[i].getText('custrecord_pns_fieldtype'),
			"fieldid":configRslt[i].getValue('custrecord_pns_action_field_internalid'), //.toLowerCase()
			"triggertxt":configRslt[i].getText('custrecord_pns_action_trigger'),
			"triggerid":configRslt[i].getValue('custrecord_pns_action_trigger'),
			"triggervalue":configRslt[i].getValue('custrecord_pns_act_on_value'),
			"campaignoverride":configRslt[i].getValue('custrecord_pns_set_to_campaign'),
			"updparentoverride":configRslt[i].getValue('custrecord_pns_upd_parent_override'),
			"camprestype":configRslt[i].getText('custrecord_pns_camp_res_type'),
			"campresnote":txtNoteObj
		};
		
		/**
		//Run Search with maptching campaign responses
		var acflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
		             new nlobjSearchFilter('field','systemnotes','anyof',[ pnsConfig['fieldid'] ]),
		             new nlobjSearchFilter('newvalue','systemnotes','is',strTrim(pnsConfig['triggervalue'])),
		             new nlobjSearchFilter('name','systemnotes','anyof', pnsDefaultConfig['pardotuser']),
		             new nlobjSearchFilter('context','systemnotes','anyof',['WSS'])];
		
		var accol = [new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('internalid','campaignResponse')];
		
		var acrsObj = nlapiCreateSearch('contact', acflt, accol);
		var acrss = acrsObj.runSearch();
	    //flag for while loop
	    var crscnt = 1000;
	    var cnextStartIndex = 0;
	    var cnextEndIndex = 1000;
	    
	    //JSON that keeps track Contacts with Matching Campaign Responses
	    var contactCampResJson = {};
	    while (crscnt==1000) {
	    	var acrs = acrss.getResults(cnextStartIndex, cnextEndIndex);
	    	
	    	for (var acri=0; acri < acrs.length; acri++) 
	    	{
	    		if (contactCampResJson[acrs[acri].getValue('internalid')]) {
	    			contactCampResJson[acrs[acri].getValue('internalid')] = [];
	    		}
	    		
	    		contactCampResJson[acrs[acri].getValue('internalid')].push(acrs[acri].getValue('internalid','campaignResponse')); 
	    	}
	    }
	    
		log('debug','contactCampResJson', JSON.stringify(contactCampResJson));
		*/
		
		//For each of the configuration, we are going to attempts to search contacts with matching rule but No Campaign Response
		//Search A definition: Returns ALL contacts that should be examined.
		//		IF campaignevent is null, MUST be marked as ISSUE
		//		IF campaignevent is NOT Null, add it to array 
		/**
		field::systemnotes anyof config fieldid
		newvalue::systemnotes is config triggervalue
		name:systemnotes is anyof parameter "pardotuser"
		context:systemnotes is anyof WSS
		
		Columns:
			contact internalid
			contact company
			date::systemNote
			context::systemNote
			campaignevent
		*/
		var aflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
		            new nlobjSearchFilter('field','systemnotes','anyof',[ pnsConfig['fieldid'] ]),
		            new nlobjSearchFilter('newvalue','systemnotes','is',strTrim(pnsConfig['triggervalue'])),
		            new nlobjSearchFilter('name','systemnotes','anyof', pnsDefaultConfig['pardotuser']),
		            new nlobjSearchFilter('context','systemnotes','anyof',['WSS']),
		            new nlobjSearchFilter('campaignevent', null, 'anyof', '@NONE@')];
		
		var acol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('company'),
		            new nlobjSearchColumn('date','systemNotes'),
		            new nlobjSearchColumn('campaignevent')];
		
		//NO Campaign Respones
		var arNoCampRes = [];
		//JSON objec tthat tracks the date of value set so we can create camp. res. based on that date
		var arNoCampResJson = {};		
		
		//Array used for tracking purposes only
		var arHasMatchingCampRes = [];
		
		//Need to Execute as LoadSearch To Grab every Contacts
		var arsObj = nlapiCreateSearch('contact', aflt, acol);
		var arss = arsObj.runSearch();
	    //flag for while loop
	    var rscnt = 1000;
	    var nextStartIndex = 0;
	    var nextEndIndex = 1000;
	    while (rscnt==1000) {
	    	var ars = arss.getResults(nextStartIndex, nextEndIndex);
	    	
	    	for (var ari=0; ari < ars.length; ari++) 
	    	{
	    		var cid = ars[ari].getValue('internalid');
	    		var systemDate = ars[ari].getValue('date','systemNotes'); 
	    		
	    		if (!ars[ari].getValue('campaignevent'))
	    		{
	    			//add to arNoCampRes; ONLY Unique
		    		if (arNoCampRes.indexOf(cid) < 0 )
		    		{
		    			arNoCampRes.push(cid);
		    		}
	    		}
	    		/**
	    		else
	    		{
	    			//NO Campaign Respones
	    			//		var arNoCampRes = [];
	    			//Has Campaigns but doesn't have Matching ones
	    			//		var arNoMatchingCampRes = [];
	    			//Has Matching Campaigns
	    			//		var arHasMatchingCampRes = [];
	    			
	    			//1. If Campaign ID matches campaignoverride,
	    			//		a. IF CID does NOT exists in arHasMatchingCampRes, ADD IT
	    			//		B. IF CID Exists in arNoMatchingCampRes, REMOVE IT
	    			
	    			//2. If Campaign ID does NOT match, 
	    			//		a. If it doesn't exists in arNoCampRes already AND it doesn't exists in arHasMatchingCampRes, ADD IT
    				 
	    			if (contactCampResJson[cid].contains(pnsConfig['campaignoverride']))
	    			{
	    				//If it doesn't exists in arHasMatchingCampRes already, ADD IT
	    				if (arHasMatchingCampRes.indexOf(cid) < 0)
	    				{
	    					arHasMatchingCampRes.push(cid);
	    				} 
	    				
	    				//If it exists in arNoCampRes, REMOVE IT
	    				if (arNoCampRes.indexOf(cid) >= 0) 
	    				{
	    					var indexId = arNoCampRes.indexOf(cid);
	    					arNoCampRes.splice(indexId, 0);
	    					
	    				}
	    			}
	    			else
	    			{
	    				if (arNoCampRes.indexOf(cid) <0 && arHasMatchingCampRes.indexOf(cid) < 0)
	    				{
	    					arNoCampRes.push(cid);
	    					//arNoCampResJson: Populate key as cid and sub elemetns of dates
	    					if (!arNoCampResJson[cid])
	    					{
	    						arNoCampResJson[cid]={
	    							"contactid":cid,
	    							"campaignid":pnsConfig['campaignoverride'],
	    							"dates":[]
	    						};
	    						arNoCampResJson[cid].dates.push(systemDate);
	    					}
	    				} 
	    			}
	    		}
	    		*/
	    	}
	    	
	    	rscnt = ars.length;
	    	nextStartIndex = nextEndIndex;
	    	nextEndIndex = nextEndIndex + 1000;
	    }
		
	    //PHASE 2: Need to loop through each arNoCampRes array and create campaign resposes for each date the value was set
	    
	    
	    log('debug','Config Name // fieldid // triggervalue', pnsConfig['name']+' // '+pnsConfig['fieldid']+' // '+pnsConfig['triggervalue']+
	    					' // arNoCampRes: '+arNoCampRes.length+' // arHasMatchingCampRes: '+arHasMatchingCampRes.length);
	    
	    //Phase 1: Generate Email with those with issue campaign responses 
	    csvBody += '"'+pnsConfig['name']+'",'+
				   '"'+arNoCampRes.length+'",'+
				   '"'+pnsConfig['fieldname']+'",'+
				   '"'+pnsConfig['fieldid']+'",'+
				   '"'+pnsConfig['triggertxt']+'",'+
				   '"'+pnsConfig['triggervalue']+'",'+
				   '"'+pnsConfig['campaignoverride']+'"\n';
	    
	    //--------- Need to add in REscheduled Logic here for each Config Rule Roop
	    
	}
	
	if (csvBody)
	{
		var csvFile = nlapiCreateFile('IssueContactReport.csv', 'CSV', csvHeader+csvBody);
	    
	    //send it over as email.
	    nlapiSendEmail(-5, 'joe.son@audaxium.com', 'Pardot/NetSuite Rule Audit Report', 'Report Attached', null, null, null, csvFile);
	}
	
}
