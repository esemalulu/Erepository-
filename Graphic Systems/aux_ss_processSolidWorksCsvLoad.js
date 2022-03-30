/**
 * Scheduled Script to run every 15 or 30 minutes to process loaded SolidWorks Leads Impors.
 * 	- Match Company name
 * 	- Match Contact
 * 	- Match ISP
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Aug 2014     joe.son@audaxium.com
 *
 */

var paramLastProcSwlId = nlapiGetContext().getSetting('SCRIPT', 'custscript_98_swlid');

var constMatch = '1';
var constReview = '2';
var constNew = '3';
var constPending = '4';
var constError = '5';
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function processPendingSolidWorksLeads(type) {

	try {
		
		//1. search for pending proc records
		var swlflt = [new nlobjSearchFilter('custrecord_axswls_procstatus', null, 'anyof',constPending), //Pending Process
		              new nlobjSearchFilter('isinactive', null, 'is','F')];
		if (paramLastProcSwlId) {
			swlflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcSwlId));
		}
		
		//order the result in Internal ID desc order.
		var swlcol = [new nlobjSearchColumn('internalid').setSort(true),
		              new nlobjSearchColumn('custrecord_axswls_leadid'), //Lead ID
		              new nlobjSearchColumn('custrecord_axswls_source'), //Source
		              new nlobjSearchColumn('custrecord_axswls_firstname'), //First name
		              new nlobjSearchColumn('custrecord_axswls_lastname'), //Lastname
		              new nlobjSearchColumn('custrecord_axswls_companyname'), //Company name
		              new nlobjSearchColumn('custrecord_axswls_isrloaded'), //ISR Loaded
		              new nlobjSearchColumn('custrecord_axswls_phone'), //Contact Phone
		              new nlobjSearchColumn('custrecord_axswls_email'), //Email
		              new nlobjSearchColumn('custrecord_axswls_leaddateloaded'), //Lead Date Loaded
		              new nlobjSearchColumn('custrecord_axswls_sentdateloaded'), //Send Date Loaded
		              ];
		
		//search for unprocessed records
		var swlrs = nlapiSearchRecord('customrecord_ax_solidworks_leadstage', null, swlflt, swlcol);
		
		//2. go through them and find match and set data
		for (var s=0; swlrs && s < swlrs.length; s++) {
			
			var procStatus = '';
			var procNotes = '';
			var leadDateTime = null;
			var sentDateTime = null;
			var lowerCompanyName = swlrs[s].getValue('custrecord_axswls_companyname')?swlrs[s].getValue('custrecord_axswls_companyname').toLowerCase():'';
			var companyId = '';
			var companyIds = new Array();
			var contactId = '';
			var contactIds = new Array();
			var isrEmpId = '';
			var recName = (swlrs[s].getValue('custrecord_axswls_leadid')?swlrs[s].getValue('custrecord_axswls_leadid'):'('+swlrs[s].getId()+') N/A')+
						  '-'+
						  (swlrs[s].getValue('custrecord_axswls_source')?swlrs[s].getValue('custrecord_axswls_source'):'N/A');
			var firstName = swlrs[s].getValue('custrecord_axswls_firstname');
			var lastName = swlrs[s].getValue('custrecord_axswls_lastname');
			var phoneNumber = swlrs[s].getValue('custrecord_axswls_phone');
			var emailAddress = swlrs[s].getValue('custrecord_axswls_email');
			
			
			//Make sure lookup search params are loaded
			if (!swlrs[s].getValue('custrecord_axswls_companyname') || !swlrs[s].getValue('custrecord_axswls_firstname') || !swlrs[s].getValue('custrecord_axswls_lastname')) {
				procStatus = constError;
				procNotes = 'One or more of required information is missing: Company, Contact First and Last names are required';
			}
			
			try {
				log('debug','Processing Uploads', swlrs[s].getId());
				//convert loaded lead date time into Date Time Object.
				//LeadDate seems to be in different format: YYYY/MM/DD. 
				if (swlrs[s].getValue('custrecord_axswls_leaddateloaded')) {	
					leadDateTime = nlapiStringToDate(swlrs[s].getValue('custrecord_axswls_leaddateloaded'), 'datetimetz');
					if (isNaN(leadDateTime)) {
						leadDateTime = new Date(swlrs[s].getValue('custrecord_axswls_leaddateloaded'));
					}
				}
				
				//convert loaded send date time into Date Time Object.
				if (swlrs[s].getValue('custrecord_axswls_sentdateloaded')) {
					sentDateTime = nlapiStringToDate(swlrs[s].getValue('custrecord_axswls_sentdateloaded'), 'datetimetz');
				}
				
				//-------------------------------- 1. Search for Matching Company ----------------------------------------------------------------------------
				// - remove .
				lowerCompanyName = strGlobalReplace(lowerCompanyName, '\\.', '');
				// - remove LLC
				lowerCompanyName = strGlobalReplace(lowerCompanyName, ' llc', '');
				// - remove Corp
				lowerCompanyName = strGlobalReplace(lowerCompanyName, ' corp', '');
				// - remove Inc
				lowerCompanyName = strGlobalReplace(lowerCompanyName, ' inc', '');
				// - remove Ltd
				lowerCompanyName = strGlobalReplace(lowerCompanyName, ' ltd', '');
				
				log('debug','Name // Formatting company name', recName+' // '+lowerCompanyName);
				
				//need to run 3 global searches: cust:, lead:, prospect:, 
				var custGlobalRs = nlapiSearchGlobal('cust:'+lowerCompanyName);
				for (var cg=0; custGlobalRs && cg < custGlobalRs.length; cg++) {
					//3/5/2015 Make sure it's the correct type
					if (custGlobalRs[cg].getRecordType() == 'customer') {
						companyIds.push(custGlobalRs[cg].getId());
					}
				}
				var leadGlobalRs = nlapiSearchGlobal('lead:'+lowerCompanyName);
				for (var lg=0; leadGlobalRs && lg < leadGlobalRs.length; lg++) {
					if (leadGlobalRs[lg].getRecordType() == 'lead') {
						companyIds.push(leadGlobalRs[lg].getId());
					}
					
				}
				var prosGlobalRs = nlapiSearchGlobal('prospect:'+lowerCompanyName);
				for (var pg=0; prosGlobalRs && pg < prosGlobalRs.length; pg++) {
					if (prosGlobalRs[pg].getRecordType() == 'lead') {
						companyIds.push(prosGlobalRs[pg].getId());
					}
				}
				
				log('debug','------ Company ID',companyIds);	
				//set companyId ONLy if the size of companyIds is 1
				if (companyIds.length == 1) {
					companyId = companyIds[0];
				}
				
				/** Run Secondary Process to attempt at Company Name **/
				if (!companyId && (lowerCompanyName.indexOf(' and ') > -1 || lowerCompanyName.indexOf(' mfg') > -1)) {
					
					lowerCompanyName = strGlobalReplace(lowerCompanyName, ' and ',' & ');
					lowerCompanyName = strGlobalReplace(lowerCompanyName, ' mfg',' manufacturing');
					
					//need to run 3 global searches: cust:, lead:, prospect:, 
					custGlobalRs = nlapiSearchGlobal('cust:'+lowerCompanyName);
					for (var cg=0; custGlobalRs && cg < custGlobalRs.length; cg++) {
						//make sure it doesn't already exist
						if (!companyIds.contains(custGlobalRs[cg].getId())) {
							companyIds.push(custGlobalRs[cg].getId());
						}
					}
					leadGlobalRs = nlapiSearchGlobal('lead:'+lowerCompanyName);
					for (var lg=0; leadGlobalRs && lg < leadGlobalRs.length; lg++) {
						//make sure it doesn't already exist
						if (!companyIds.contains(leadGlobalRs[lg].getId())) {
							companyIds.push(leadGlobalRs[lg].getId());
						}
					}
					prosGlobalRs = nlapiSearchGlobal('prospect:'+lowerCompanyName);
					for (var pg=0; prosGlobalRs && pg < prosGlobalRs.length; pg++) {
						//make sure it doesn't already exist
						if (!companyIds.contains(prosGlobalRs[pg].getId())) {
							companyIds.push(prosGlobalRs[pg].getId());
						}
					}
					
					//set companyId ONLy if the size of companyIds is 1
					if (companyIds.length == 1) {
						companyId = companyIds[0];
					}
				}
				
				//Find Matching Contact
				//--- Make sure firrst and last name of contact is filled in
				//---	contactIds
				if (firstName && lastName) {
					var contactFirstLastGlobalRs = nlapiSearchGlobal('contact:'+firstName+' '+lastName);
					for (var ct=0; contactFirstLastGlobalRs && ct < contactFirstLastGlobalRs.length; ct++) {
						contactIds.push(contactFirstLastGlobalRs[ct].getId());
					}
				}
				
				//					
				//Run another search if email address is NOT empty
				if (emailAddress) {
					var contactEmailGlobalRs = nlapiSearchGlobal('contact:'+emailAddress);
					for (var cte=0; contactEmailGlobalRs && cte < contactEmailGlobalRs.length; cte++) {
						//ONLY push it in if it does NOT exist in the array from first and last name search
						if (!contactIds.contains(contactEmailGlobalRs[cte].getId())) {
							contactIds.push(contactEmailGlobalRs[cte].getId());
						}
					}
				}
				
				log('debug','----- Contact ID', contactIds);
				if (contactIds.length==1) {
					contactId = contactIds[0];
					
					//Check to see if we are missing both companyId and no potential matches. If so, set the parent 
					if (!companyId && companyIds.length == 0) {
						companyId = nlapiLookupField('contact', contactId, 'company', false);
					}
					
				}
			} catch (pe) {
				procStatus = constError;
				procNotes = getErrText(pe);
			}
			
			//Update the record
			
			//1. Status Check:
			if (!companyId && !contactId && companyIds.length==0 && contactIds.length==0) {
				//--- UC1: Both companyId and contactId is not set AND not potential Matches are found for companyIds and contactIds
				procStatus = constNew;
				procNotes = 'No Potential Matches or Exact Match found. Considered as new';
			} else if (companyId && contactId) {
				//--- UC2: Both companyId and contactId is set = Exact Match. 
				procStatus = constMatch;
				procNotes = 'Found Exact Match for both Company and Contact';
			} else {
				//--- UC3: All other status will be set for Review.
				procStatus = constReview;
				procNotes = 'There maybe multiple match potentials for Company and/or Contact. Please review';
			}
			log('debug','Proc Status // Notes', procStatus+' // '+procNotes);
			//2 Update SolidWorks Import Record
			var updflds = ['name', //Update Name of the record
			               'custrecord_axswls_procstatus', //Process Status
			               'custrecord_axswls_procnotes', //Process Notes
			               'custrecord_axswls_searchcompanyval', //Search value used to look up matching company information
			               'custrecord_axswls_matchedclient',	//Matched Company 
			               'custrecord_axswls_potentialcompanymatch', //Potential Company Matches
			               'custrecord_axswls_matchedcontact', //Matched Contact
			               'custrecord_axswls_potentialcontactmatch', //Potential Contact Matches
			               'custrecord_axswls_leaddatedtvalue', //LeadDate converted Date/time value
			               'custrecord_axswls_sentdatedtvalue', //SendDate converted Date/Time value
			               ];
			
			var updvals =[recName,
			              procStatus,
			              procNotes,
			              lowerCompanyName,
			              companyId,
			              companyIds,
			              contactId,
			              contactIds,
			              (leadDateTime?nlapiDateToString(leadDateTime,'datetimetz'):''),
			              (sentDateTime?nlapiDateToString(sentDateTime,'datetimetz'):'')];
			
			nlapiSubmitField('customrecord_ax_solidworks_leadstage', swlrs[s].getId(), updflds, updvals, true);
			
			//Reschedule Logic
			//if (swlrs.length==1000 )
			if ( (swlrs.length == 1000 && (s+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 500 && (s+1) < swlrs.length) ) {
				var params = new Array();
				params['custscript_98_swlid'] = swlrs[s].getId();
				var schStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
				if (schStatus=='QUEUED') {
					break;
				}
			}	
		}
	} catch (e) {
		log('error','Script Terminating Error',getErrText(e));
		throw nlapiCreateError('SWLPROCERR', getErrText(e), false);
	}
	
}
