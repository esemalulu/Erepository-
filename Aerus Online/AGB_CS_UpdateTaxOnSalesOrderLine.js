/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * -------------------------------------------------------------------
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Oct 2015     cmartinez		   Client script to update line tax codes based on AGB_Vendor_Tax_Rate custom record.
 *
 */

STATE_ID = {'AL' : '0', 'AK' : '1', 'AZ' : '2', 'AR' : '3', 'AA' : '53', 
           'AE' : '52', 'AP' : '54', 'CA' : '4', 'CO' : '5', 'CT' : '6',
           'DE' : '7', 'DC' : '8', 'FL' : '9', 'GA' : '10', 'HI' : '11',
           'ID' : '12', 'IL' : '13', 'IN' : '14', 'IA' : '15', 'KS' : '16',
           'KY' : '17', 'LA' : '18', 'ME' : '19', 'MD' : '20', 'MA' : '21',
           'MI' : '22', 'MN' : '23', 'MS' : '24', 'MO' : '25', 'MT' : '26',
           'NE' : '27', 'NV' : '28', 'NH' : '29', 'NJ' : '30', 'NM' : '31',
           'NY' : '32', 'NC' : '33', 'ND' : '34', 'OH' : '35', 'OK' : '36',
           'OR' : '37', 'PA' : '38', 'PR' : '39', 'RI' : '40', 'SC' : '41',
           'SD' : '42', 'TN' : '43', 'TX' : '44', 'UT' : '45', 'VT' : '46',
           'VA' : '47', 'WA' : '48', 'WV' : '49', 'WI' : '50', 'WY' : '51'};

var CONTEXT = nlapiGetContext();
var param_taxcode_nontaxable	= CONTEXT.getSetting('SCRIPT', 'custscript_cs_taxcode_nontaxable');


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function pageInit_updateTaxOnSOLine(type)
{
	try
	{
		nlapiSetFieldValue('custbody_script_use_shipping_address', nlapiGetFieldValue('shipstate'), false, false);
		nlapiSetFieldValue('custbody_script_use_customer', nlapiGetFieldValue('entity'), false, false);
	}
	catch (error)
    {
		if (error.getDetails != undefined)
		{
	        nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
	        throw error;
		}
		else
		{
		    nlapiLogExecution('ERROR','Unexpected Error', error.toString()); 
		    throw nlapiCreateError('99999', error.toString());
		}
    }
}



/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @returns {Void}
 */
function postSourcing_updateTaxOnSOLine(type, name) 
{
	try
	{
		//4/14/2016 - Frank request to NOT execute the script if custbody30 field is checked
		if (nlapiGetFieldValue('custbody31') != 'T')
		{
			return;
		}
		
		var stLogTitle = 'postSourcing_UpdateTaxOnSOLine';
                var prefVendor;
		
		// Script will execute if item column in item sublist is changed
		if(type == 'item' && name == 'item')
		{	
			if(isEmpty(param_taxcode_nontaxable)) nlapiCreateError('99999', 'Missing script parameter: Tax Code - Non Taxable');
			
			var intIndex		= nlapiGetCurrentLineItemIndex('item');
			
			var stShipState		= nlapiGetFieldValue('shipstate');
			var stItem			= nlapiGetCurrentLineItemValue('item', 'item');
			
			// Exit if item is empty
			if(isEmpty(stItem))	return;
			log(stLogTitle, 'stItem = ' + stItem);
			log(stLogTitle, 'Line = ' + intIndex + ' | Will update tax on SO line');
			
			var arrItemValues	= nlapiLookupField('item', stItem, ['isdropshipitem', 'vendor', 'type','custitem_kit_preferred_vendor']);

			
			log(stLogTitle, '--- stShipState = ' + stShipState 
					+ ' | stItem = ' + stItem
					+ ' | Is Drop Ship = ' + arrItemValues.isdropshipitem
					+ ' | Preferred Vendor = ' + arrItemValues.vendor
                                        + ' | Type =' + arrItemValues.type
                                        + ' | Kit Vendor =' + arrItemValues.custitem_kit_preferred_vendor);
			
			// Exit if State is empty, if item is not drop ship, or if preferred vendor is empty
			if(isEmpty(stShipState))
			{
				nlapiSetCurrentLineItemValue('item', 'taxcode', param_taxcode_nontaxable);
				return;
			}
            
			//5/15/2016 -Return out if ship State is VA
			//			 This will keep NS tax code added via native process
			
			if(stShipState == 'MA' || stShipState == 'VA')
			{
				return;
			}
			
			if (arrItemValues.type != 'Kit' && arrItemValues.isdropshipitem == 'T')
                        {
                                prefVendor = arrItemValues.vendor;
                        }
                        else
                        {
                               prefVendor = arrItemValues.custitem_kit_preferred_vendor;
                        }

                        log(stLogTitle, '--- preferred Vendor = ' + prefVendor);
                        if(isEmpty(prefVendor))
			{
			       return;
			}
                        
			
			var stShipStateId	= stShipState == 'AL'? '0' : STATE_ID[stShipState];
			
			log(stLogTitle, '--- stShipStateId = ' + stShipStateId);
			
			// Get vendor tax rate record
			var arrAGBVendorTaxFilters	= [new nlobjSearchFilter('custrecord_vendor', null, 'is', prefVendor),
			                          	   new nlobjSearchFilter('custrecord_state', null, 'is', stShipStateId),
			                          	   new nlobjSearchFilter('custrecord_agb_tax_state', null, 'noneof', ["@NONE@"])];
			var arrAGBVendorTaxColumns	= [new nlobjSearchColumn('custrecord_tax_code')];
			var arrAGBVendorTaxResults	= searchAllRecord('customrecord_vendor_tax_rate', null, arrAGBVendorTaxFilters, arrAGBVendorTaxColumns);
			
			// Exit if vendor tax rate record is not found
			if(isEmpty(arrAGBVendorTaxResults))
			{
				nlapiSetCurrentLineItemValue('item', 'taxcode', param_taxcode_nontaxable);
				log(stLogTitle, 'No AGB Vendor Tax record found.');
				return;
			}
			
			var stAGBTaxCode	= arrAGBVendorTaxResults[0].getValue('custrecord_tax_code');
			log(stLogTitle, '--- AGB Tax Code from custom record = ' + stAGBTaxCode);
			
			// Set tax code on transaction line
			nlapiSetCurrentLineItemValue('item', 'taxcode', stAGBTaxCode);
			nlapiSetCurrentLineItemValue('item', 'custcol_agb_pref_vendor', prefVendor);
			nlapiSetFieldValue('custbody_agb_tax_charged', 'T');
		}
		
//		if(name == 'shipaddress')
//		{
//			var stPrevShipAddressState	= nlapiGetFieldValue('custbody_script_use_shipping_address');
//			var stNewShipAddressState	= nlapiGetFieldValue('shipstate');
//			var stPrevCustomer	= nlapiGetFieldValue('custbody_script_use_customer');
//			var stNewCustomer	= nlapiGetFieldValue('entity');
//			log(stLogTitle, '1');
//			if(stNewShipAddressState != stPrevShipAddressState && stPrevCustomer == stNewCustomer)
//			{
//				nlapiSetFieldValue('custbody_script_customer', nlapiGetFieldValue('entity'), false, false);
//				nlapiSetFieldValue('custbody_script_use_shipping_address', stNewShipAddressState, false, false);
//				alert(	"Ship state changed. Items' tax codes will be updated upon submission of the record.");
//			}
//			nlapiSetFieldValue('custbody_script_customer', nlapiGetFieldValue('entity'), true, true);
//			nlapiSetFieldValue('custbody_script_use_shipping_address', stNewShipAddressState, true, true);
//			log(stLogTitle, '2');
//		}
		
		if(name == 'entity')
		{
			nlapiSetFieldValue('custbody_script_use_shipping_address', nlapiGetFieldValue('shipstate'), false, false);
			nlapiSetFieldValue('custbody_script_use_customer', nlapiGetFieldValue('entity'), true, true);
			return;
		}
		
		if(name == 'shipaddress')
		{
			var stPrevShipAddressState	= nlapiGetFieldValue('custbody_script_use_shipping_address');
			var stNewShipAddressState	= nlapiGetFieldValue('shipstate');
			var stPrevCustomer	= nlapiGetFieldValue('custbody_script_use_customer');
			var stNewCustomer	= nlapiGetFieldValue('entity');
			if(stNewShipAddressState != stPrevShipAddressState && stPrevCustomer == stNewCustomer)
			{
				alert(	"Ship state changed. Items' tax codes will be updated upon submission of the record.");
			}
			nlapiSetFieldValue('custbody_script_use_shipping_address', stNewShipAddressState, true, true);
		}
		
		
	}
	catch (error)
    {
		if (error.getDetails != undefined)
		{
	        nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
//	        throw error;
		}
		else
		{
		    nlapiLogExecution('ERROR','Unexpected Error', error.toString()); 
//		    throw nlapiCreateError('99999', error.toString());
		}
		return;
    }
}



/*
 * ==============================
 * 		Utility Functions		|
 * ==============================
 */
function log(stLogTitle, stDetails)
{
	nlapiLogExecution('DEBUG', stLogTitle, stDetails);
}

function isEmpty(stValue)
{
	var boolIsEmpty = false;
	if ((stValue == '') || (stValue == null) ||(stValue == undefined))
    {
        boolIsEmpty = true;
    }
    return boolIsEmpty;
}

function forceParseFloat(stValue)
{
	return (isNaN(parseFloat(stValue)) ? 0.00 : parseFloat(stValue));
}

function forceParseInt(stValue) 
{
	return (isNaN(parseInt(stValue, 10)) ? 0 : parseInt(stValue, 10));
}

function searchAllRecord(recordType, searchId, searchFilter, searchColumns) 
{
    var arrSearchResults = [];

    if (searchId) 
    {
        var savedSearch = nlapiLoadSearch(recordType, searchId);
        if (searchFilter) 
        {
            savedSearch.addFilters(searchFilter);
        }
           
        if (searchColumns) 
        {
            savedSearch.addColumns(searchColumns);
        }   
    }
    else 
    {
        var savedSearch = nlapiCreateSearch(recordType, searchFilter, searchColumns);
    }

    var resultset = savedSearch.runSearch();
    var searchid = 0;
   
    var resultslice = resultset.getResults(searchid, searchid + 1000);
    if (resultslice != null) 
    {
        do 
        {  
        	var resultslice = resultset.getResults(searchid, searchid + 1000);
        	
            for (var rs in resultslice) 
            {
               arrSearchResults.push(resultslice[rs]);
               searchid++;
            }       
        } while (resultslice.length >= 1000);
    }
   
    return arrSearchResults;
}