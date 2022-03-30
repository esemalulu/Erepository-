// Begin Debug Variables ===========================================================================================
	// debugging variables for ordering execution logs and e-mail alerts
	var padToLen = 3;
	var n = 1;	
	// Flags
	var debugLog            = true;
	var debugStr            = null;
	var errorText           = null;
	var emailText		= null;
// End Debug Variables ==============================================================================================

var functionName;
var SEARCH_CRITERIA = 'customsearch_customers_in_maint_srch';
//var SEARCH_CRITERIA = 'customsearch_customers_in_maint_srch_2'; // not used any more
var sNetsuiteEmailId = 16921;

var jobInternalId=0;
var oldjobInternalId=-1;
var custCIR;

var sbillabletime=0;
var columns;
var columnlength;
var jobCount = 0;
var column;

var customerid;
var endcustomerid;
var renewalenddate;
var revrecenddate;
var oldcustomerid;
var usecustomerid;
var useendate;
var startrecord=0;

//retrieveSearchResults();

function updateCustomerEndDate(usecustomerid)
{
	var functionName = 'updateCustomerEndDate';
	
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Entering Function : ', padToLen), functionName );
	}

	try {
		if((useendate != '') && (useendate != null)){
			custCIR = nlapiLoadRecord('customer', usecustomerid);
			if(kana_IsNull(custCIR))
				return;
			var localicustenddate = custCIR.getFieldValue('enddate');

			var tmplocalicustenddate = new Date(localicustenddate);
			var tmpuseendate = new Date(useendate);

			if((tmplocalicustenddate < tmpuseendate ) && (tmpuseendate != null)){
				custCIR.setFieldValue('enddate', useendate );
				nlapiSubmitRecord(custCIR, true, false);
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Customer Updated : ', padToLen), usecustomerid);
			}
		}
	
	} catch(exception){
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: Updating Customer for End Date ' + '\n\n' +
						'Script Name : kana_ss_update_customer_end_date.js' + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Customer ID: ' + usecustomerid + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText, null, null);
			return;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: Updating Customer for End Date ' + '\n\n' +
						'Script Name: kana_ss_update_customer_end_date.js' + '\n' +
						'Customer ID: ' + usecustomerid + '\n' +
						'Error Details: ' + exception.toString();
           	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
           	nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'Error Message', errorText, null, null);
           	return;
		}
	}

	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Leaving Function : ', padToLen), functionName );
	}
	
}

function retrieveSearchResults()
{
	var functionName = 'retrieveSearchResults';
	
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Entering Function : ', padToLen), functionName );
	}

	try {
		custSearchResults = nlapiSearchRecord('transaction', SEARCH_CRITERIA, null, null);

		if(null != custSearchResults && custSearchResults.length > 0) {
			if(debugLog){
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'custSearchResults.length : ', padToLen),custSearchResults.length);
			}
			
			
			for(jobCount = startrecord; jobCount < custSearchResults.length; jobCount++){
				
				result = custSearchResults[jobCount];
				
				columns = result.getAllColumns();
				columnlength = columns.length;

				column = columns[0];
				customerid = result.getValue(column);
				
				column = columns[1];
				endcustomerid = result.getValue(column);

				column = columns[4];
				renewalenddate = result.getValue(column);

				column = columns[5];
				revrecenddate = result.getValue(column);

				if(debugLog){
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Customer ID : ', padToLen), customerid);
					nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'End Customer ID : ', padToLen), endcustomerid);
				}

				useendate = revrecenddate;
				
				var tmprevrecenddate = new Date(revrecenddate);
				var tmprenewalenddate = new Date(renewalenddate);
				
				if((revrecenddate == null) || (revrecenddate == '') || (tmprevrecenddate < tmprenewalenddate)){
					useendate = renewalenddate;
				}
				
				if(oldcustomerid != customerid){
					updateCustomerEndDate(customerid);
					if((endcustomerid != '') && (endcustomerid != null)){
						updateCustomerEndDate(endcustomerid);
					}
				}
				
				oldcustomerid = usecustomerid;
			
			}
		}
	} catch(exception){
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: Updating Customer for End Date ' + '\n\n' +
						'Script Name : kana_ss_update_customer_end_date.js' + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Customer ID: ' + customerid + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,'kana-app-notification@kana.com', 'Error Message', errorText, null, null);
			return;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: Updating Customer for End Date ' + '\n\n' +
						'Script Name: kana_ss_update_customer_end_date.js' + '\n' +
						'Customer ID: ' + customerid + '\n' +
						'Error Details: ' + exception.toString();
           	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
           	nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'Error Message', errorText, null, null);
           	return;
		}
	}

	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Leaving Function : ', padToLen), functionName );
	}
	
	
}

function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

function dateDiff(endDt,startDt) {
	date1 = new Date();
	date2 = new Date();
	diff  = new Date();
	
	date1temp = nlapiStringToDate(endDt);
	date1.setTime(date1temp.getTime());

    //alert('date1 '+date1);

	date2temp = nlapiStringToDate(startDt);
	date2.setTime(date2temp.getTime());

    //alert('date2 '+date2);

	var tempDiff = date1.getTime() - date2.getTime();
	if(tempDiff < 0)
	{
		return -1;
	}
	// sets difference date to difference of first date and second date

	diff.setTime(Math.abs(date1.getTime() - date2.getTime()));

	timediff = diff.getTime();

	days = Math.round(timediff / (1000 * 60 * 60 * 24));

	return days;
}

function nsc_AutoNum(n, suffix, padToLen)
{
	/*
		Return the integer n and suffix as a string of the following format:
	
	 		[0...0n] suffix
	 
		with (padToLen - n.length) leading zeros.  For example:
		 
			[0013] Debug Alert: Array initialization
	*/
	
	
	//
	// Initialize parameters
	//
	
	// if n is null, return an error
	if (n == null) return '[error] ';
	
	// convert n to a string
	n = n.toString();
	
	// make certain suffix is handled
	if (suffix == null) suffix = '';
	
	// make certain padToLen is a number
	if ( padToLen == null || isNaN(padToLen) )
	{
		padToLen = 5;
	};
	
	
	
	// 
	// LOCAL VARIABLES
	// 
	var zeros	 = '';
	var string = '';
	var i;
	
	
	
	// 
	// CODE BODY
	// 
	
	// determine number of leading zeros required
	numZeros = padToLen - n.length;
	
	// construct zeros string
	for (i=0; i<numZeros; i++)
	{
		zeros = zeros + '0';
	};
	
	// construct return string
	string = '[' + zeros + n + '] ' + suffix.toString();
	
	/* return autoNumString */
	return string;
	
}
// END AUTONUM =====================================================================================================

