/**
 * Copyright (c) 1998-2008 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * This script triggers a field change. Checks the base currency as default.
 * 
 * @param (string) stMachineName 
 * @param (string) stFieldName 
 * @author Roberto R. Palacios
 * @version 1.0
 *
 * 7/6/2011 Cathy Krumske for Keystone Business Services
 * 					Automatically populate GPM% on line item, sourced from customer
 *					Fix GMP calculation logic to support group items
 */

/**
 * This script computes the Gross Profit Margin.
 * 
 * @param (string)
 *            stMachineName
 * @param (string)
 *            stFieldName
 * @author Roberto R. Palacios
 * @version 1.0
 */

var curr_line = '';

function fieldChanged_ComputeGMP(stMachineName, stFieldName) {
	try {
		var MSG_TITLE = 'Compute Gross Profit Margin';
		if (stMachineName == 'item') {
			var currClass = nlapiGetCurrentLineItemValue('item','custcol_itemclass');
			if (currClass == '44' || currClass == '45' || currClass == '46'
					|| currClass == '48' || currClass == '50'
					|| currClass == '80') {
				var currGPM = nlapiGetCurrentLineItemValue('item',	'custcol_gpm');
				if (currGPM != '')
					nlapiSetCurrentLineItemValue('item', 'custcol_gpm', '');
			}

			computeGMP(stFieldName, 'fc');

		} // End If stMachineName == 'item'
	} catch (error) {
		if (error.getDetails != undefined) {
			alert('Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		} else {
			alert('Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

function postSourcing_ComputeGMP(type, name) {
	if (type == 'item' && name == 'item') {
		// 7/6/2011 Following added by Cathy Krumske for Keystone Business
		// Services
		// to populate GPM% on line items and default currency, sourced from
		// customer record

		// Default line item currency to what's in body field
		var customform = nlapiGetFieldValue('customform');
		if (parseInt(customform) >= 123) { // using new opportunity/quote form
			var stcurrency = nlapiGetFieldValue('currency');
			var stlinecurrency = nlapiGetCurrentLineItemValue('item','custcol_currency');
			if (stlinecurrency == null || stlinecurrency == '')
				nlapiSetCurrentLineItemValue('item', 'custcol_currency',stcurrency);
		}

		// Populate current line GPM%
		curr_line = nlapiGetCurrentLineItemIndex('item');
		var currClass = nlapiGetCurrentLineItemValue('item','custcol_itemclass');
		if (currClass == '44' || currClass == '45' || currClass == '46'
				|| currClass == '48' || currClass == '50' || currClass == '80') {
			nlapiSetCurrentLineItemValue('item', 'custcol_gpm', '');
		} else {
			var custid = nlapiGetFieldValue('entity');
			if (custid != null && custid != '') {
				var custgpm = nlapiLookupField('customer', custid,'custentity_custgpm');
				if (custgpm == null || custgpm == '')
					custgpm = '30.0%';
				nlapiSetCurrentLineItemValue('item', 'custcol_gpm', custgpm);
			}
		}
	}
}

// Following added by Cathy Krumske for Keystone Business Services
// to populate GPM% and calculate margin for group items
function recalc_ComputeGMP(type) {
	// Populate GPM% for members of group item
	var custid = nlapiGetFieldValue('entity');
	if (custid == null || custid == '')
		return;
	if (curr_line == '')
		return;
	var custgpm = nlapiLookupField('customer', custid, 'custentity_custgpm');
	if (custgpm == null || custgpm == '')
		custgpm = '30.0%';

	nbrlines = nlapiGetLineItemCount('item');
	for (var i = curr_line; i <= nbrlines; i++) {
		if (i == curr_line)
			continue;
		
		var gpm = nlapiGetLineItemValue('item', 'custcol_gpm', i);
		var curr_gpm = nlapiGetLineItemValue('item', 'custcol_gpm', i, custgpm);
		var curr_rate = nlapiGetLineItemValue('item', 'rate', i, custgpm);
		if (isNaN(parseFloat(curr_rate)))
			curr_rate = 0;
		if (curr_gpm == '' || curr_rate == 0) {
			if (curr_gpm != custgpm)
				nlapiSetLineItemValue('item', 'custcol_gpm', i, custgpm);
			computeGMP('custcol_gpm', i);
		}
	}
}

/**
 * This function computes the Gross Profit Margin.
 * 
 * @param (string)
 *            stFieldName
 * @author Roberto R. Palacios
 * @version 1.0
 */
function computeGMP(stFieldName, linenbr) {
	if (stFieldName == 'custcol_base_currency_cost'
			|| stFieldName == 'custcol_currency'
			|| stFieldName == 'custcol_gpm'
			|| stFieldName == 'custcol_kit_cost') {
		// Added to support group items
		if (linenbr != 'fc')
			nlapiSelectLineItem('item', linenbr);

		var currClass = nlapiGetCurrentLineItemValue('item','custcol_itemclass');
		if (currClass == '44' || currClass == '45' || currClass == '46'
				|| currClass == '48' || currClass == '50' || currClass == '80') {
			if (linenbr != 'fc')
				nlapiCancelLineItem('item');
			return;
		}
		var stCustID = nlapiGetFieldValue('entity');
		var customform = nlapiGetFieldValue('customform');
		if (parseInt(customform) < 123) { // using old opportunity/quote form
			var blnISCurrency = nlapiGetCurrentLineItemValue('item','custcol_base_currency_cost');
			var stCurrencyInternalID = nlapiGetFieldValue('currency'); // Default
																		// Currency
		} else {
			// new Guatemala form
			var stCustomerCurrency = nlapiGetFieldValue('currency');
			var stCurrencyInternalID = nlapiGetCurrentLineItemValue('item','custcol_currency');
		}
		var flKitCost = ifEmpty(nlapiGetCurrentLineItemValue('item','custcol_kit_cost'), 0.00);
		var pctGPM = ifEmpty(nlapiGetCurrentLineItemValue('item', 'custcol_gpm'), '0%');
		var flRate = 0.00;
		var flCost = 0.00;

		if (parseInt(customform) < 123) { // using old opportunity/quote form
			if (blnISCurrency == 'F') {
				switch (stCurrencyInternalID) {
				case '1':
					stCurrencyInternalID = '3';
					break;
				case '3':
					stCurrencyInternalID = '1';
					break;
				default:
					break;
				}
			}

			switch (stCurrencyInternalID) { // 1 US and 3 CND
			case '1':
				flCost = ifEmpty(nlapiGetCurrentLineItemValue('item','custcol_us_cost_sourced'), 0.00);
				// This is the default sourcing no need to set.
				break;
			case '3':
				flCost = ifEmpty(nlapiGetCurrentLineItemValue('item','custcol_ca_cost_sourced'), 0.00);
				nlapiSetCurrentLineItemValue('item', 'custcol_us_cost', flCost);
				// Set's the sourcing if Canada.
				break;
			default:
				flCost = 0.00;
				nlapiSetCurrentLineItemValue('item', 'custcol_us_cost', flCost);
				break;
			}
		}

		if (parseInt(customform) >= 123) { // using new opportunity/quote form
			var item_id = nlapiGetCurrentLineItemValue('item', 'item');
			if (item_id != null && item_id != '') {
				// new form for Guatemala
				switch (stCurrencyInternalID) { // item level currency: 1 US and
												// 3 CND and 5 GTQ
					case '1':
						flCost = 0.00;
						var item_unitpricebase = 0.00;
						var item_unitpricealt1 = 0.00;
	
						var filters = new Array();
						filters[0] = new nlobjSearchFilter('internalid', null,'anyof', item_id);
						filters[1] = new nlobjSearchFilter('currency', 'pricing','is', [ 1, 5 ]);
						filters[2] = new nlobjSearchFilter('pricelevel', 'pricing','anyof', [ 1, 2 ]);
						var columns = new Array();
						columns[0] = new nlobjSearchColumn('pricelevel', 'pricing');
						columns[1] = new nlobjSearchColumn('unitprice', 'pricing');
						var item_record = nlapiSearchRecord('item','customsearch_computegpmitemsearch', filters,columns);
	
						for (var p = 0; item_record != null
								&& p < item_record.length; p++) {
							var item_pricelevel = item_record[p].getValue('pricelevel', 'pricing');
							var item_currency = item_record[p].getValue('currency','pricing');
							if (item_currency != stCustomerCurrency)
								continue;
							if (item_pricelevel == 1)
								item_unitpricebase = item_record[p].getValue('unitprice', 'pricing');
							else if (item_pricelevel == 2) {
								item_unitpricealt1 = item_record[p].getValue('unitprice', 'pricing');
							}
						}
	
						if (stCustomerCurrency == 5) // Guatemala
							flCost = item_unitpricealt1;
						else {
							if (item_unitpricebase == null || item_unitpricebase == '' || item_unitpricebase == 0)
								flCost = ifEmpty(nlapiGetCurrentLineItemValue('item','custcol_us_cost_sourced'), 0.00);
							else
								flCost = item_unitpricebase;
						}
						nlapiSetCurrentLineItemValue('item', 'custcol_us_cost', flCost);
						// Set's the sourcing if US.
						break;
					case '3':
						flCost = setUSCostColumn(item_id, 3, false);
						// Set's the sourcing if Canada.
						break;
					case '5':
						flCost = setUSCostColumn(item_id, 5, true);
						// Set's the sourcing if Guatemala.
						break;
					case '4':
						flCost = setUSCostColumn(item_id, 4, false);
						// Set's the sourcing if EUR.
						break;
					case '6':
						flCost = setUSCostColumn(item_id, 6, false);
						// Set's the sourcing if PLN.
						break;
					case '2':
						flCost = setUSCostColumn(item_id, 2, false);
						// Set's the sourcing if GBP.
						break;
					default:
						flCost = 0.00;
						nlapiSetCurrentLineItemValue('item', 'custcol_us_cost', flCost);
						break;
				}
			}
	
			flCost = currencyValue(flCost);
			flKitCost = currencyValue(flKitCost);
			pctGPM = pctGPM.replace('%', '');
			pctGPM = currencyValue(pctGPM);
			flRate = ((flCost * 100) / (100 - pctGPM)) + flKitCost;
			flRate = currencyValue(flRate);
			if (flRate > 0) {
				curr_rate = nlapiGetCurrentLineItemValue('item', 'rate');
				if (parseFloat(curr_rate) != parseFloat(flRate)) {
					nlapiSetCurrentLineItemText('item', 'price', 'Custom');
					nlapiSetCurrentLineItemValue('item', 'rate', flRate);
	
					// Added to support group items
					if (linenbr != 'fc')
						nlapiCommitLineItem('item');
				}
			}
		}
	}
}

/*
 * Set the US cost column
 * 
 * (Repurposed code created from NetSuite Developer)
 */
function setUSCostColumn(item_id, currencyid, useUS){
	var flCost = 0.00;
	var item_unitpricebase = 0.00;
	var item_unitpricealt1 = 0.00;
	
	var currArray = [currencyid];
	if(useUS){
		currArray.push(1); // Add the US currency id
	}

	var filters = new Array();
	filters[0] = new nlobjSearchFilter('internalid', null, 'anyof',	item_id);
	filters[1] = new nlobjSearchFilter('currency', 'pricing', 'is',	currArray);
	filters[2] = new nlobjSearchFilter('pricelevel', 'pricing',	'anyof', [ 1, 2 ]);
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('pricelevel', 'pricing');
	columns[1] = new nlobjSearchColumn('unitprice', 'pricing');
	var item_record = nlapiSearchRecord('item',	'customsearch_computegpmitemsearch', filters, columns);

	for (var p = 0; item_record != null && p < item_record.length; p++) {
		var item_pricelevel = item_record[p].getValue('pricelevel',	'pricing');
		if (item_pricelevel == 1)
			item_unitpricebase = item_record[p].getValue('unitprice', 'pricing');
	}

	flCost = item_unitpricebase;
	nlapiSetCurrentLineItemValue('item', 'custcol_us_cost', flCost);
	
	return flCost;
}

/**
 * If the value of the first parameter is an empty string, null or undefined
 * then the second parameter is returned. Otherwise, the first parameter is
 * returned.
 * 
 * @author Robbi Palacios
 * @version 1.0
 */
function ifEmpty(stSource, stDestination) {
	if (stSource != null && stSource != undefined && stSource != '') {
		return stSource;
	} else {
		return stDestination;
	}
}

/**
 * 
 * Formats value of float to currency format without losing precision.
 * 
 * @param (string)
 *            stValue Type of operation submitted
 * @author Roberto R. Palacios
 * @version 1.0
 */
function currencyValue(stValue) {
	var flValue = parseFloat(stValue);
	if (isNaN(flValue)) {
		return 0.00;
	}
	return Math.round(flValue * 100) / 100;
}
