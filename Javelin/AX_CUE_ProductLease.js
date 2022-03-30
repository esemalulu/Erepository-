/*
***********************************************************************
*
***********************************************************************/

var RECORD_TYPE_LEASE_FACTOR = 'customrecordleasefactor';
var FIELD_LEASE_MIN_AMOUNT = 'custrecordminamount';
var FIELD_LEASE_MAX_AMOUNT = 'custrecordmaxamount';
var FIELD_LEASE_TERM = 'custrecordterm';
var FIELD_LEASE_FACTOR = 'custrecordleasefactor';
var FIELD_LEASE_PROMO = 'custrecord_promolease';

var FIELD_QUOTE_TYPE = 'customform';
var CUSTOM_FORM_TESTGPQUOTEFORM = 133;

var FIELD_CHECK_FOR_PROMO = 'custbody_discountlease';
var FIELD_AMOUNT_VALUE = 'custbody_pretax_total';
var FIELD_AMOUNT_TWELVE = 'custbody_one_year_lease_amount';
var FIELD_AMOUNT_TWENTYFOUR = 'custbody_two_year_lease_amount';
var FIELD_AMOUNT_THIRTYSIX = 'custbody_three_year_lease_amount';

var ERROR_MESSAGE_PARTIAL = 'The subtotal doesn\'t allow all financing terms';
var ERROR_MESSAGE_TOO_LOW = 'The subtotal is less than the minimum required for financing and can\'t be calculated';
var ERROR_MESSAGE_TOO_HIGH = 'The subtotal is over the maximum required for financing and can\'t be calculated';
var ERROR_MESSAGE_BETWEEN = 'The subtotal is in between valid financing options and can\'t be calculated';
var ERROR_MESSAGE_OVERLAP = 'Found conflicting values of financing for this subtotal, financing amounts may not be as expected. Please verify with administrator';

var NUMBER_OF_TERMS = 3;

var DISPLAY_FIELD_LEASE_YEAR_ONE = 'custbody_1year';
var DISPLAY_FIELD_LEASE_YEAR_TWO = 'custbody_2year';
var DISPLAY_FIELD_LEASE_YEAR_THREE = 'custbody_3year';

function onPageInit() {
	calculateLeaseMatrices();
}

function onLineAdd() {
	calculateLeaseMatrices();
}

function onFieldChange(type, name) {
	if (name == FIELD_CHECK_FOR_PROMO ||
		name == DISPLAY_FIELD_LEASE_YEAR_ONE ||
		name == DISPLAY_FIELD_LEASE_YEAR_TWO ||
		name == DISPLAY_FIELD_LEASE_YEAR_THREE) {
		calculateLeaseMatrices();
	}
}

/**
* This function validates the form type
* @author 
* @return if the form requires leasing or not
**/
function isValidForm() {
	
	var formType = nlapiGetFieldValue(FIELD_QUOTE_TYPE);
	//Mod Req: 11/14/2013
	//Add Javeline Renewal Invoice and ADS Renewal Invoice Forms
	return ( formType == 133 || formType == 109 || formType == 101 || formType == 135 || formType == 102|| formType==158);
}

/**
* This function's only purpose is to display the error messages when required
* Error messages include overlapping or out of bound ranges or validity for certain terms only 
* Currently always returns true so as to never prevent the quote to be saved regardless of whether there is a valid
* lease factor or not
* @author 
* @return if the record should be saved
**/

function onSave() {

	if ( !isValidForm() ) {
		return true;
	}

	var nbrOfValidFields = 0;
	var hasOverlap = false;
	
	var totalAmount = nlapiGetFieldValue(FIELD_AMOUNT_VALUE);
	
	var searchFilters = new Array();
		
	searchFilters[0] = new nlobjSearchFilter(FIELD_LEASE_MIN_AMOUNT, null, 'lessthanorequalto', totalAmount, null);
	searchFilters[1] = new nlobjSearchFilter(FIELD_LEASE_MAX_AMOUNT, null, 'greaterthanorequalto', totalAmount, null);
	searchFilters[2] = new nlobjSearchFilter(FIELD_LEASE_PROMO, null, 'is', nlapiGetFieldValue(FIELD_CHECK_FOR_PROMO), null);
	
	// this loop counts number of valid fields and checks for overlaps
	for (var i = 0; i < NUMBER_OF_TERMS; i++) { // for all term types
		
		searchFilters[3] = new nlobjSearchFilter(FIELD_LEASE_TERM, null, 'is', i+1, null);
		var results = nlapiSearchRecord(RECORD_TYPE_LEASE_FACTOR, null, searchFilters, null);
		
		if ( results != null && results.length != 0 ) {
			if ( results.length > 1 ) {
				hasOverlap = true;
			} else if ( results.length == 1 ) {
				nbrOfValidFields++;
			}
		}
	}
	
	if ( nbrOfValidFields == 0 ) {
		var sFilters = new Array();
		
		sFilters[0] = searchFilters[2]; // promotional checkbox
		sFilters[1] = new nlobjSearchFilter(FIELD_LEASE_MIN_AMOUNT, null, 'greaterthan', totalAmount, null);
		var results_low = nlapiSearchRecord(RECORD_TYPE_LEASE_FACTOR, null, sFilters, null);

		sFilters[1] = new nlobjSearchFilter(FIELD_LEASE_MIN_AMOUNT, null, 'lessthan', totalAmount, null);
		var results_high = nlapiSearchRecord(RECORD_TYPE_LEASE_FACTOR, null, sFilters, null);
		
		if ( results_low == null ) {
			alert(ERROR_MESSAGE_TOO_HIGH);
		} else if ( results_high == null) {
			alert(ERROR_MESSAGE_TOO_LOW);
		} else {
			alert(ERROR_MESSAGE_BETWEEN);
		}
	} else if ( nbrOfValidFields < NUMBER_OF_TERMS ) {
		alert(ERROR_MESSAGE_PARTIAL);
	}
	
	if ( hasOverlap ) {
		alert(ERROR_MESSAGE_OVERLAP);
	}

	return true;
}

/**
* This function calculates the lease matrice for leasing 
* @author 
* @return nothing
**/

function calculateLeaseMatrices() {
	
	if ( !isValidForm() ) {
		return;
	}
	
	var totalAmount = 0.00;

	// 0 = 12 Month, 1 = 24 Months, 2 = 36 Months	
	var factors = [0.00, 0.00, 0.00];
	var amounts = [0.0, 0.0, 0.0];
	var fields = [FIELD_AMOUNT_TWELVE, FIELD_AMOUNT_TWENTYFOUR, FIELD_AMOUNT_THIRTYSIX];
	var userID = nlapiGetUser();
	// this loop calculates the total amount based on the line items
	for ( var i = 1; i <= nlapiGetLineItemCount('item'); i++) {
		var itemValue = parseFloat(nlapiGetLineItemValue('item', 'amount', i));
		var itemQty = parseFloat(nlapiGetLineItemValue('item','quantity', i));  // adding this to take into account items with an amount but null quantity (group subtotals)
		if ( isNaN(itemValue)  || isNaN(itemQty)  ) {  // adding || isNaN(itemQty)  to provide another condition not to update the total
			itemValue = 0.0;
		}
		totalAmount += itemValue;

		///if (userID == '105') {
			
		///	alert('itemValue = ' + itemValue);
		//	alert('Total Amount = ' + totalAmount);
		//}
	}

	alert(totalAmount+' Calculated');
	
	nlapiSetFieldValue(FIELD_AMOUNT_VALUE, nlapiFormatCurrency(totalAmount));
	
	alert('Set Field amt value: '+nlapiGetFieldValue(FIELD_AMOUNT_VALUE));
	
	if ( totalAmount == 0.00 ) {
		// display all zero amounts
		for ( var j = 0; j < 3; j++ ) {
			nlapiSetFieldValue(fields[j], '');
		}
		return; // no amount, do not search and do calculations for naught
	}
	
	var searchFilters = new Array();
	var searchColumns = new Array();
		
	searchFilters[0] = new nlobjSearchFilter(FIELD_LEASE_MIN_AMOUNT, null, 'lessthanorequalto', totalAmount, null);
	searchFilters[1] = new nlobjSearchFilter(FIELD_LEASE_MAX_AMOUNT, null, 'greaterthanorequalto', totalAmount, null);
	searchFilters[2] = new nlobjSearchFilter(FIELD_LEASE_PROMO, null, 'is', nlapiGetFieldValue(FIELD_CHECK_FOR_PROMO), null);
	
	searchColumns[0] = new nlobjSearchColumn(FIELD_LEASE_FACTOR,null);
	
	// Search and set lease factors
	for (var i = 0; i < 3; i++) {
		// indexes start at zero, but terms do not, thus the i+1
		// for all term types '1' = 12months, '2' = 24 months and '3' = 36 months

		searchFilters[3] = new nlobjSearchFilter(FIELD_LEASE_TERM, null, 'is', i+1, null);
		var results = nlapiSearchRecord(RECORD_TYPE_LEASE_FACTOR, null, searchFilters, searchColumns);
	
		if ( results != null && results.length == 1 ) {
			factors[i] = results[0].getValue(FIELD_LEASE_FACTOR); // takes the only result
			//if (userID == '105') {
			//	alert('Lease Factor[' + i + '] = ' + factors[i]);
			//}	
		}
	}
	
	var displayFields = [	DISPLAY_FIELD_LEASE_YEAR_ONE,
							DISPLAY_FIELD_LEASE_YEAR_TWO,
							DISPLAY_FIELD_LEASE_YEAR_THREE]; 
	
	// display amounts as being the total amount * factors
	for ( var j = 0; j < 3; j++ ) {
		amounts[j] = totalAmount * factors[j];
		alert(j+' // '+nlapiGetFieldValue(displayFields[j]));
		if ( nlapiGetFieldValue(displayFields[j]) == 'T' && amounts[j] != 0 )
		{
			nlapiSetFieldValue(fields[j], nlapiFormatCurrency(amounts[j]));
		}
		else // false, do not display
		{
			nlapiSetFieldValue(fields[j], '');
		}
	}
}

