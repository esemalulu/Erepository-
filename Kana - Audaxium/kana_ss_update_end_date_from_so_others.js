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
var SEARCH_CRITERIA = 'customsearch_yesterday_so_approvals_6';
var sNetsuiteEmailId = 8;

var custCIR;

var columns;
var columnlength;
var jobCount = 0;
var column;

var startrecord=0;

var dtUseEndDate;
var dtRenewalOrRevRecDate;
var dtTransactionEndDate;
var dtRevRecEndDate;
var iCustomerId;
var iEndCustomerId;


var iCustomerIdIndex=11;
var iEndCustomerIndex=12;
var iEndDateIndex=10;

var soInternalId=0;
var oldsoInternalId=0;
var scustomername='';

//process_approved_sales_orders();

function process_approved_sales_orders()
{
	var functionName = 'process_approved_sales_orders';
	
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Entering Function : ', padToLen), functionName );
	}

	try {
		custSearchResults = nlapiSearchRecord('salesorder', SEARCH_CRITERIA, null, null);

		if(null != custSearchResults && custSearchResults.length > 0){
			if(debugLog){
				nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'custSearchResults.length : ', padToLen),custSearchResults.length);
			}

			for(soCount = 0; soCount < custSearchResults.length; soCount++){
                                
                soInternalId = custSearchResults[soCount].getId()
				result = custSearchResults[soCount];
				columns = result.getAllColumns();
				columnlength = columns.length;
				
				if((oldsoInternalId != soInternalId) && (soCount > 0)){
					updateCustomerRecord(iCustomerId);
					if((iEndCustomerId != '') && (iEndCustomerId != null)){
						updateCustomerRecord(iEndCustomerId);
					}
					dtUseEndDate = null;
				}
				
				column = columns[1];
				scustomername = result.getValue(column);

				column = columns[iCustomerIdIndex];
				iCustomerId = result.getValue(column);

				column = columns[iEndCustomerIndex];
				iEndCustomerId = result.getValue(column);

				column = columns[iEndDateIndex];
				dtTransactionEndDate = result.getValue(column);
				dtUseEndDate = dtTransactionEndDate;

				var tmpdtTransactionEndDate = new Date(dtTransactionEndDate);

				oldsoInternalId = soInternalId;
				
	           	nlapiLogExecution('DEBUG', nsc_AutoNum(n++, 'New Date', padToLen), tmpdtTransactionEndDate);
			}
			
			//process the last record
			if(soCount > 0){
				updateCustomerRecord(iCustomerId);
				if((iEndCustomerId != '') && (iEndCustomerId != null)){
					updateCustomerRecord(iEndCustomerId);
				}
			}
		}
	} catch(exception){
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: Updating Customer Date from SO ' + '\n\n' +
						'Script Name : kana_ss_update_end_date_from_so.js' + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,'vasu@kana.com', 'Error Message', errorText, null, null);
			return;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: Updating Customer Date from SO ' + '\n\n' +
						'Script Name : kana_ss_update_end_date_from_so.js' + '\n' +
						'Error Details: ' + exception.toString();
           	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
           	nlapiSendEmail(sNetsuiteEmailId, 'vasu@kana.com', 'Error Message', errorText, null, null);
           	return;
		}
	}

	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Leaving Function : ', padToLen), functionName );
	}
	
	
}

function updateCustomerRecord(ilocalcustid)
{
	var functionName = 'updateCustomerRecord';
	
	if(debugLog) {
		nlapiLogExecution ('DEBUG', nsc_AutoNum(n++, 'Entering Function : ', padToLen), functionName );
	}
	
	var icustendate;
	
	try {
		custCIR = nlapiLoadRecord('customer', ilocalcustid);
		icustenddate = custCIR.getFieldValue('enddate');
		
		var tmpicustenddate = new Date(icustenddate);
		var tmpdtUseEndDate = new Date(dtUseEndDate);
		
		//if(icustenddate < dtUseEndDate){
		if((tmpicustenddate < tmpdtUseEndDate ) && (tmpdtUseEndDate != null)){
			custCIR.setFieldValue('enddate', dtUseEndDate);
			nlapiSubmitRecord(custCIR, true, false);
           	nlapiLogExecution('DEBUG', nsc_AutoNum(n++, 'End Date', padToLen), dtUseEndDate);
           	nlapiLogExecution('DEBUG', nsc_AutoNum(n++, 'Customer', padToLen), scustomername);
		}
	} catch(exception){
		if (exception instanceof nlobjError) {
			errorText = 'UNEXPECTED ERROR: Updating Customer Date from SO ' + '\n\n' +
						'Script Name : kana_ss_update_end_date_from_so.js' + '\n' +
						'Event Called : ' + exception.getUserEvent() + '\n' +
						'Error Code: ' + exception.getCode() + '\n' +
						'Error Details: ' + exception.getDetails() + '\n\n' +
						'Stack Trace: ' + exception.getStackTrace();
			nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
			nlapiSendEmail(sNetsuiteEmailId,'vasu@kana.com', 'Error Message', errorText, null, null);
			return;
		} else { 
			// catch error if any other exception occurs
			errorText = 'UNEXPECTED ERROR: Updating Customer Date from SO ' + '\n\n' +
						'Script Name : kana_ss_update_end_date_from_so.js' + '\n' +
						'Error Details: ' + exception.toString();
           	nlapiLogExecution('ERROR', nsc_AutoNum(n++, 'Unexpected Error ', padToLen), errorText);
           	nlapiSendEmail(sNetsuiteEmailId, 'vasu@kana.com', 'Error Message', errorText, null, null);
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
