/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Feb 2016     sfiorentino
 *
 * MB: 7/18/16 - This script is NOT finished.  It will create a Customer Status Trending record for all customers in the search: SCRIPT - Customer Status Trending Category Lifetime.
 * 		When the script hits a governance limit it will reschedule the script to run from the most recent Customer internalid (via setting a script parameter custscript_last_id).
 * 		
 * 		This presents a problem for error handling.  If a record is not processed due to an error right now it will either hard stop the script (and NOT set the last ID param) or it will just keep going and some records might be skipped.
 *  	Need to find a way to make sure that nothing goes unprocessed
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function createCustTrend_sched(lastId) {
	nlapiLogExecution('DEBUG', 'scheduled', 'Script Execution Begin');
	var startTime = new Date().getTime();
	var maxTime = 15;
	var context = nlapiGetContext();
	var lastId = context.getSetting('SCRIPT', 'custscript_last_id');
	if(lastId == '' || lastId == null){lastId = 0;}
	nlapiLogExecution('DEBUG', 'scheduled', 'Last ID = ' + lastId);
	var filters = new Array()
	filters[0] = new nlobjSearchFilter('formulanumeric', null, 'equalto', '1');
	filters[0].setFormula('CASE WHEN {internalid} >' + lastId + 'THEN 1 ELSE 0 END');
	searchResults = nlapiSearchRecord('customer', 'customsearch_r7_category_lifetime', filters); //SCRIPT - Customer Status Trending Category Lifetime
	nlapiLogExecution('DEBUG', 'scheduled', searchResults.length);
	for(var x = 0; x < searchResults.length; x++)
		{
		var currentTime = new Date().getTime();
		var totTime = currentTime - startTime;
		nlapiLogExecution('DEBUG', 'Usage', context.getRemainingUsage() + '/' + x + '/' + totTime);
		if(context.getRemainingUsage() < '2000' || x == 999 || totTime > (maxTime * 60 * 1000))
			{reschduleScript(customer);
			return;}
		// Get fields from Customer record and set corresponding fields on new Customer Status Trending record
		var customer = searchResults[x].getValue('internalid');
		var currStatus = searchResults[x].getValue('entitystatus');
		var lastStatus = !searchResults[x].getValue('custentity_r7_status_last_snapshot') ? currStatus: searchResults[x].getValue('custentity_r7_status_last_snapshot');  // if blank then set to current status ** check if the ternary op works
		var categoryLife = searchResults[x].getValue('custentityr7categorylifetime').split(',');
		var categoryActive = searchResults[x].getValue('custentityr7categoryactive').split(',');
		var categoryInactive = searchResults[x].getValue('custentityr7categoryinactive').split(',');
		var salesRep = searchResults[x].getValue('salesrep');
		var reportingDivision = searchResults[x].getValue('custentityr7reportingdivision');
		var dirLevelTeam = searchResults[x].getValue('custentityr7directorlevelteam');
		var mgrLevelTeam = searchResults[x].getValue('custentityr7managerlevelteam');
		var corporateCountry = searchResults[x].getValue('custentityr7corporatecountry'); // Corporate Country (HDB/UI)
		var corporateState = searchResults[x].getValue('custentityr7corporatestate');
		var segment = searchResults[x].getValue('custentityr7customersegment');
		var r7Industry = searchResults[x].getValue('custentityr7rapid7industry');
		var r7Subindustry = searchResults[x].getValue('custentityr7rapid7subindustry'); 
		var customerSuccessManager = searchResults[x].getValue('custentityr7accountmanager');
		
		var newRec = nlapiCreateRecord('customrecord_r7_customer_status_trending');
		newRec.setFieldValue('custrecord_r7_cst_customer', customer);
		newRec.setFieldValue('custrecordr7_cst_customer_id', customer);
		newRec.setFieldValues('custrecord_r7_cst_category_active', categoryActive);
		newRec.setFieldValues('custrecord_r7_cst_category_inactive', categoryInactive);
		newRec.setFieldValues('custrecord_r7_cst_category_lifetime', categoryLife);	
		newRec.setFieldValue('custrecord_r7_cst_sales_rep', salesRep);
		newRec.setFieldValue('custrecord_r7_cst_reporting_division', reportingDivision);
		newRec.setFieldValue('custrecord_r7_cst_dir_level_team', dirLevelTeam);
		newRec.setFieldValue('custrecord_r7_cst_mng_level_team', mgrLevelTeam);
		newRec.setFieldValue('custrecord_r7_cst_country', corporateCountry);
		newRec.setFieldValue('custrecord_r7_cst_state', corporateState);
		newRec.setFieldValue('custrecord_r7_cst_segment', segment);
		newRec.setFieldValue('custrecord_r7_cst_industry', r7Industry);
		newRec.setFieldValue('custrecord_r7_cst_sub_industry', r7Subindustry);
		newRec.setFieldValue('custrecord_r7_cst_csm', customerSuccessManager);
		newRec.setFieldValue('custrecord_r7_cst_date',new Date()); // Set Snapshot date to today
		// Error handling?  How to make sure that nothing goes unprocessed
		// If this doesn't submit, should the script hard stop?  It only processes based off last ID
		try{
			var id = nlapiSubmitRecord(newRec);
		}
		catch(e){
			
		}
		
		nlapiSubmitField('customer', customer, 'custentity_r7_status_last_snapshot', currStatus)

	}
nlapiLogExecution('DEBUG', 'Script Completed', 'End of Script');
}

function reschduleScript(customer)
{	nlapiLogExecution('DEBUG', 'reschduleScript', 'Rescheduling Script begining with customer ' + customer);
	var params = [];
	params['custscript_last_id'] = customer;
	nlapiScheduleScript('customscript_r7_customer_status_trending', null, params);
}