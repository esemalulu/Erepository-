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
 * 1.00       16 Oct 2015     cmartinez		   User-event script to update line tax codes based on AGB_Vendor_Tax_Rate custom record.
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
var param_taxcode_nontaxable	= CONTEXT.getSetting('SCRIPT', 'custscript_ue_taxcode_nontaxable');

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmit_updateTaxOnSalesOrderLine(type)
{
	try
	{
		if(type.toString() !== 'create' && type.toString() !== 'edit' && type.toString() !== 'xedit') return;
		
		if(nlapiGetContext().getExecutionContext() != 'webservices' && nlapiGetContext().getExecutionContext() != 'userinterface' && nlapiGetContext().getExecutionContext() != 'csvimport') return;
		
		//4/14/2016 - Frank request to NOT execute the script if custbody30 field is checked
		if (nlapiGetFieldValue('custbody31') != 'T')
		{
			return;
		}
		
		if(isEmpty(param_taxcode_nontaxable)) nlapiCreateError('99999', 'Missing script parameter: Tax Code - Non Taxable');
		
		var stLogTitle = 'beforeSubmit_updateTaxOnSalesOrderLine';
                var prefVendor;
		
		log(stLogTitle, '======================== Entering Script ========================');
		
		var stShipState		= nlapiGetFieldValue('shipstate');
		var boolTaxCharged	= false;
		var intCount		= nlapiGetLineItemCount('item');

		
		if(intCount <= 0) return;

		items: for(var i = 1; i <= intCount; i++)
		{
			nlapiSelectLineItem('item', i);
			
			var intIndex		= nlapiGetCurrentLineItemIndex('item');
			var stItem			= nlapiGetCurrentLineItemValue('item', 'item');

			// Skip line if item is empty
			if(isEmpty(stItem))
			{
				nlapiCommitLineItem('item'); 
				continue items;
			}
			

			log(stLogTitle, 'Line = ' + intIndex + ' | Will update tax on SO line');
			var arrItemValues	= nlapiLookupField('item', stItem, ['isdropshipitem', 'vendor', 'type','custitem_kit_preferred_vendor']);
			
			log(stLogTitle, '--- stShipState = ' + stShipState 
					+ ' | stItem = ' + stItem
					+ ' | Is Drop Ship = ' + arrItemValues.isdropshipitem
					+ ' | Preferred Vendor = ' + arrItemValues.vendor
                                        + ' | Type =' + arrItemValues.type
                                        + ' | Kit Vendor =' + arrItemValues.custitem_kit_preferred_vendor);
			
			// Skip to next line if state is empty, if not drop ship  or if preferred vendor is empty
			if(isEmpty(stShipState))
			{
				nlapiSetCurrentLineItemValue('item', 'taxcode', param_taxcode_nontaxable, true, true);
				nlapiSetCurrentLineItemValue('item', 'custcol_agb_pref_vendor', '', true, true);
				nlapiCommitLineItem('item');
				continue items;
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

			if(isEmpty(prefVendor))
			{
				nlapiCommitLineItem('item');
				continue items;
			}
			
			var stShipStateId	= stShipState == 'AL'? '0' : STATE_ID[stShipState];
			
			log(stLogTitle, '--- stShipStateId = ' + stShipStateId);5
			
			// Get vendor tax rate record
			var arrAGBVendorTaxFilters	= [new nlobjSearchFilter('custrecord_vendor', null, 'is', prefVendor),
			                          	   new nlobjSearchFilter('custrecord_state', null, 'is', stShipStateId),
			                          	   new nlobjSearchFilter('custrecord_agb_tax_state', null, 'noneof', ["@NONE@"])];
			var arrAGBVendorTaxColumns	= [new nlobjSearchColumn('custrecord_tax_code')];
			var arrAGBVendorTaxResults	= searchAllRecord('customrecord_vendor_tax_rate', null, arrAGBVendorTaxFilters, arrAGBVendorTaxColumns);
			
			// Exit if no vendor tax rate record was found
			if(isEmpty(arrAGBVendorTaxResults))
			{
				log(stLogTitle, 'No AGB Vendor Tax record found.');
				nlapiSetCurrentLineItemValue('item', 'taxcode', param_taxcode_nontaxable, true, true);
				nlapiSetCurrentLineItemValue('item', 'custcol_agb_pref_vendor', '', true, true);
				nlapiCommitLineItem('item');
				continue items;
			}
			
			var stAGBTaxCode	= arrAGBVendorTaxResults[0].getValue('custrecord_tax_code');
			
			log(stLogTitle, '--- AGB Tax Code from custom record = ' + stAGBTaxCode);
			
			// set tax code on transaction line
			nlapiSetCurrentLineItemValue('item', 'taxcode', stAGBTaxCode, true, true);
			nlapiSetCurrentLineItemValue('item', 'custcol_agb_pref_vendor', prefVendor, true, true);
			boolTaxCharged = true;
			nlapiCommitLineItem('item');
		}
		
		// Set tax charged to true if a line tax code was changed, otherwise set to false
		if(boolTaxCharged == true)
		{
			nlapiSetFieldValue('custbody_agb_tax_charged', 'T');
		}
		else
		{
			nlapiSetFieldValue('custbody_agb_tax_charged', 'F');
		}
		
		log(stLogTitle, '======================== Exiting Script =========================');
	}
	catch (error) 
	{
	     if (error.getDetails != undefined) 
	     {
           	  	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
	     } 
	     else 
	     {
	    	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());    
	     }
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
