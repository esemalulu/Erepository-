/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2014     AnJoe
 *
 */

//2/26/2016 
// Script modified to use saved search that ONLY returns list of Customers that had
//	Campaign Response added previous day.
//	This Saved search will use Summary Filter. This will Significantly reduce the number of records to process
var paramCampSavedSearch = nlapiGetContext().getSetting('SCRIPT','custscript_nsax50_ssid');

//Script level parameter
//	- Used by scheduled script in case of rescheduling to pass in Internal ID of customer last processed
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsax50_custid');
//one or more comma separated email address(es)
var paramErrorEmails = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsax50_erremails');

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function syncLastCampaignTouch(type) {
	try {
		//search through customer record who are NOT inactive
		/** Modified to execute against Saved Search
		 * Saved search MUST have same return values
		var cflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		
		if (paramLastProcId) {
			cflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var ccol = [new nlobjSearchColumn('internalid',null,'group').setSort(true),
		            new nlobjSearchColumn('responsedate','campaignResponse','max')];
		var crs = nlapiSearchRecord('customer', null, cflt, ccol);
		*/
		
		var cflt = null;
		if (paramLastProcId) {
			cflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var crs = nlapiSearchRecord(null,paramCampSavedSearch,cflt, null);
		
		//Loop through each customer result
		for (var c=0; crs && c < crs.length; c++) {
			
			var customerId = crs[c].getValue('internalid', null, 'group');
			
			try {
				//1 look up campaign response title
				//	Run secondary search to grab title of Latest campaign response date for this customer
				//	Order the result by response date in desc 
				var crflt = [new nlobjSearchFilter('internalid',null, 'anyof',customerId)];
				var crcol = [new nlobjSearchColumn('title','campaignResponse','group'),
				             new nlobjSearchColumn('responsedate','campaignResponse','max').setSort(true)];
				var crrs = nlapiSearchRecord('customer', null, crflt,crcol);
				
				var campResTitle = (crrs && crrs.length > 0)?crrs[0].getValue('title','campaignResponse','group'):'';
				var campResDate = (crrs && crrs.length > 0)?crrs[0].getValue('responsedate','campaignResponse','max'):'';
				
				log('debug','customer // campResTitle // camp date',customerId+' // '+campResTitle+' // '+campResDate);
				
				//2. update customer record with title of last campaign response
				if (campResTitle) {
					nlapiSubmitField('customer', customerId, 'custentity_ax_lastcamptouch', campResTitle+' ('+campResDate+')', false);
				}
				
				//Each Update consumes 10 Gov. Points
				//Remaining Log
				//log('debug','Remainer',nlapiGetContext().getRemainingUsage());
				
			} catch (custsyncerr) {
				log('error', 'Error syncing last campaign touch', 'Customer ID: '+customerId+' sync failed: '+getErrText(custsyncerr));
				//notify admin of update failure
				nlapiSendEmail(-5,paramErrorEmails,
							   'Error Syncing Customer ID '+customerId, 
							   'Error syncing customer ID '+customerId+' with title of campaign response <br/><br/>'+getErrText(custsyncerr));
			}
			
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((c+1) / crs.length) * 100);
			
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//If result count is 1000 annd it's at last index OR we only have 100 or less governance points, reschedule the script
			if ((c+1)==1000 || (c < (c+1) && nlapiGetContext().getRemainingUsage() < 100)) {
				//reschedule
				var param = new Object();
				param['custscript_nsax50_custid'] = customerId;
				param['custscript_nsax50_erremails'] = paramErrorEmails;
				
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus == 'QUEUED') {
					log('debug','Rescheduled',customerId);
					break;
				}
			}
		}
		
		
	} catch (gensyncerr) {
		log('error','Scheduled Last Campaign Touch Error', getErrText(gensyncerr));
		nlapiSendEmail(-5,paramErrorEmails,
				   	   'Unexpected Script Terminating Error for Campaign Title Sync on Customer', 
				   	   getErrText(gensyncerr));
	}
	
}
