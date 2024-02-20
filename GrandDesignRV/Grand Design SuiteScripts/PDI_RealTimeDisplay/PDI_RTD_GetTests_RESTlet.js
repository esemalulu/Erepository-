/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Feb 2017     brians
 *
 */

var QATEST_STATUS_INPROCESS = 1;
var QATEST_STATUS_COMPLETE = 2;
var QATEST_STATUS_RECHECK = 3;

var QATEST_TYPE_ONLINE = 1;
var QATEST_TYPE_OFFLINE = 2;

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function getQATestsRESTlet(dataIn) {
	
	var data = dataIn;
	
	var dateObj = new Date();
	var today = nlapiDateToString(dateObj, 'date');
	
	var testId = data.testId;
	var location = data.location;
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter ('custrecordqatest_testtype', null, 'anyof', QATEST_TYPE_ONLINE));	//Only show 'Online' test types
	if(testId)
		filters.push(new nlobjSearchFilter ('internalid', null, 'is', testId));
	else
	{
		filters.push(new nlobjSearchFilter('custrecordqatest_date', null, 'on', today));
		filters.push(new nlobjSearchFilter('custrecordqatest_status', null, 'noneof', ['@NONE@']));
		if(location)
			filters.push(new nlobjSearchFilter('custrecordunit_location', 'custrecordqatest_unit', 'anyof', location));
	}
	// Define search columns
	var columns = new Array();
	columns.push(new nlobjSearchColumn('custrecordqatest_date'));
	columns.push(new nlobjSearchColumn('custrecordqatest_user'));
	columns.push(new nlobjSearchColumn('custrecordqatest_unit'));
	columns.push(new nlobjSearchColumn('custrecordunit_model', 'custrecordqatest_unit'));
	columns.push(new nlobjSearchColumn('internalid').setSort(true));
	
	columns.push(new nlobjSearchColumn('custrecordqatestline_value', 'custrecordqatestline_qatest'));
	columns.push(new nlobjSearchColumn('custrecordqatestline_fixed', 'custrecordqatestline_qatest'));
	var searchResults = nlapiSearchRecord('customrecordrvsqatest', null, filters, columns);
	
	var returnObj = {};
	returnObj.qaTests = {};
	
	if(searchResults != null && searchResults.length > 0)
	{
		var testObj, testId, qaLineObj;
		for(var i = 0; i < searchResults.length; i++)
		{
			testId = searchResults[i].getId();
			//If that index in our dictionary is empty, then create a new test object at that index location
			if(returnObj.qaTests[testId] == null)
			{
				testObj = new Object();
				testObj.id = searchResults[i].getId();
				testObj.unitId = searchResults[i].getValue('custrecordqatest_unit');
				testObj.vin = searchResults[i].getText('custrecordqatest_unit').slice(-6);
				testObj.model = searchResults[i].getText('custrecordunit_model', 'custrecordqatest_unit');
				testObj.user = searchResults[i].getText('custrecordqatest_user');
				testObj.qaLines = [];
				testObj.failures = 0;
				
				qaLineObj = {};
				qaLineObj.value = searchResults[i].getValue('custrecordqatestline_value', 'custrecordqatestline_qatest') == 'F' ? false : true;
				qaLineObj.fixed = searchResults[i].getValue('custrecordqatestline_fixed', 'custrecordqatestline_qatest' ) == 'F' ? false : true;
				
				//If this line was marked a failed and has not been fixed, add it to our failures array
				if(qaLineObj.value == false && qaLineObj.fixed == false)
					testObj.failures = 1;
				
				testObj.qaLines.push(qaLineObj);
				
				returnObj.qaTests[testId] = testObj;
			}
			else	//Add this QA Line to our existing QA Test object
			{
				testObj =  returnObj.qaTests[testId];
				
				qaLineObj = {};
				qaLineObj.value = searchResults[i].getValue('custrecordqatestline_value', 'custrecordqatestline_qatest') == 'F' ? false : true;
				qaLineObj.fixed = searchResults[i].getValue('custrecordqatestline_fixed', 'custrecordqatestline_qatest' ) == 'F' ? false : true;
				
				//If this line was marked as failed and has not been fixed, add it to our failures array
				if(qaLineObj.value == false && qaLineObj.fixed == false)
					testObj.failures = testObj.failures + 1;
				
				testObj.qaLines.push(qaLineObj);
				
				returnObj.qaTests[testId] = testObj;
			}
		}
	}
	return JSON.stringify(returnObj);
}

function postErrorEmailsRESTlet(dataIn) {
	
	var data = dataIn;
	var location = data.selectedLocation;
	var user = data.loggedInUser;
	
	if(location)
		location = location.name;
	
	nlapiLogExecution('error', 'App Failed to Update at', location + ' - user: ' + user.name);
	
	//The RESTlet failed too many times, so try to send an email notification
	var emailBody = "The PDI Display app showing <b>" + location + "</b> has failed to update 5 times in a row." + 
					"The device running this application was authenticated with your NetSuite credentials.  Please check this device's internet connection." + 
					"If there is no connection issue and the problem persists, please contact Solution Source at 574-533-2659.";
	
	var returnObj = {};
	
	if(user)
	{
		try {
			nlapiSendEmail(user.id, 'dev@solution-source.net', 'PDI Display Failure', emailBody, null, null, null, null, true, true, null);
			returnObj.success = true;
		}
		catch (err) {
			nlapiLogExecution('error', err.getCode(), err.getDetails());
			returnObj.success = false;
		}
	}
	else
		nlapiLogExecution('error', 'Error Sending Email', 'No Logged-In User');

	return JSON.stringify(returnObj);
}