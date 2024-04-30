/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 * 
 * 
 * Version    Date				Author				Remarks
 * 1.00       18 Aug 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla			Initial version (working copy)
 *
 */

//'use strict';
var FLD_AVE_COST_PPU = 'custitem_jf_cw_ave_cost_pricing_unit';
var FLD_AVE_COST_PRICING_UNIT = 'custitem_jf_cw_pricing_unit';

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function getAvePPUBeforeLoad(type, form, request)
{
	try
	{
		var stLoggerTitle = 'getAvePPUBeforeLoad';
		nlapiLogExecution('DEBUG', stLoggerTitle, '**** START: Script entry point function.****' + ' | Operation Type: ' + type);

		if (!(type == 'view' || type == 'edit'))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Unsupported operation type. | **** END: Script entry point function.****');
			return;
		}

		var stItemId = nlapiGetRecordId();
		var flAveCost = NSUtil.forceFloat(nlapiGetFieldValue('averagecost'));
		var stStockUnitAveCost = nlapiGetFieldText('stockunit');
		var stStockUnitPPU = nlapiGetFieldText(FLD_AVE_COST_PRICING_UNIT);
		var flConversionRateAveCost = getPluralNameConversionRate(stStockUnitAveCost);
		var flConverstionRatePPU = getPluralNameConversionRate(stStockUnitPPU);

		if (!NSUtil.isEmpty(flConversionRateAveCost) && !NSUtil.isEmpty(flConverstionRatePPU))
		{
			flAveCost = (flAveCost / NSUtil.forceFloat(flConversionRateAveCost)) * NSUtil.forceFloat(flConverstionRatePPU);
		}

		flAveCost = isNaN(flAveCost) ? '' : flAveCost;
		nlapiSetFieldValue(FLD_AVE_COST_PPU, flAveCost);

		nlapiLogExecution('DEBUG', stLoggerTitle, '**** END: Script entry point function.****');
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

/**
 * Fetch UOM converstion rate via Plural name
 * 
 * @param stUnitName
 * @returns {String}
 */
function getPluralNameConversionRate(stUnitName)
{
	var arrSearchFilters = new Array();
	arrSearchFilters.push(new nlobjSearchFilter('pluralname', null, 'is', stUnitName));

	var arrColumns = new Array();
	arrColumns.push(new nlobjSearchColumn('conversionrate'));

	var arrSearchResults = nlapiSearchRecord('unitstype', null, arrSearchFilters, arrColumns);

	if (!NSUtil.isEmpty(arrSearchResults))
	{
		return arrSearchResults[0].getValue(new nlobjSearchColumn('conversionrate', null, null));
	}

	return null;
}

//Library//

var NSUtil =
	{
	    /**
	     * Evaluate if the given string or object value is empty, null or undefined.
	     * @param {String} stValue - string or object to evaluate
	     * @returns {Boolean} - true if empty/null/undefined, false if not
	     * @author mmeremilla
	     */
	    isEmpty : function(stValue)
	    {
		    if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
		            || (stValue == null) || (stValue == undefined))
		    {
			    return true;
		    }
		    else
		    {
			    if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			    {
				    if (stValue.length == 0)
				    {
					    return true;
				    }
			    }
			    else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			    {
				    for ( var stKey in stValue)
				    {
					    return false;
				    }
				    return true;
			    }

			    return false;
		    }
	    },
	    /**
	     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	     * @param {String} stValue - any string
	     * @returns {Number} - a floating point number
	     * @author jsalcedo
	     */
	    forceFloat : function(stValue)
	    {
		    var flValue = parseFloat(stValue);

		    if (isNaN(flValue) || (stValue == Infinity))
		    {
			    return 0.00;
		    }

		    return flValue;
	    }
	};