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
var param_taxcode_nontaxable	= '-7';


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @returns {Void}
 */
function onValidateLine(type) 
{
	//return true;
	
	try
	{
		// Script will execute if item column in item sublist is changed
		if(type == 'item')
		{
			var stShipState		= nlapiGetFieldValue('shipstate');
			var stItem			= nlapiGetCurrentLineItemValue('item', 'item');
			// Exit if item is empty
			if(isEmpty(stItem))	return;
			//Modified 8/9/2016
			//	We are going to use Item Description or Sales Description to set
			//	Is Drop Ship and Vendor idnetifier.
			//	This is due to NetSuite Defect that some of the column values are not being show.
			//	We will use Description column to identify these two key components.
			//	It is important that these are set on the item level 
			//  format: [Is Drop Ship T or F sa value]-[Internal ID of the vendor]
			//	examp: T-384
			var lineDescVendorVal = nlapiGetCurrentLineItemValue('item','description');
			
			// Exit if State is empty, if item is not drop ship, or if preferred vendor is empty
			if(!stShipState)
			{
				nlapiSetCurrentLineItemValue('item', 'taxcode', param_taxcode_nontaxable);
				return true;
			}
            
			//5/15/2016 -Return out if ship State is VA
			//			 This will keep NS tax code added via native process
			
			if(stShipState == 'MA' || stShipState == 'VA')
			{
				return true;
			}
			
			if(!lineDescVendorVal)
			{
			    return true;
			}
            
			var stShipStateId	= stShipState == 'AL'? '0' : STATE_ID[stShipState];
			
			//Grab the value from stateTaxJson added as AGB_TAX_JSON.js attached as library file
			var agbTaxRate = stateTaxJson[lineDescVendorVal+'-'+stShipStateId];
			
			// Exit if vendor tax rate record is not found
			if(!agbTaxRate)
			{
				nlapiSetCurrentLineItemValue('item', 'taxcode', param_taxcode_nontaxable);
				return true;
			}
			
			// Set tax code on transaction line
			nlapiSetCurrentLineItemValue('item', 'taxcode', agbTaxRate);
			
		}
		
		return true;
	}
	catch (error)
    {
		if (error.getDetails != undefined)
		{
	        alert('Process Error '+ error.getCode() + ': ' + error.getDetails());
//	        throw error;
		}
		else
		{
		    alert('ERROR '+'Unexpected Error'+ error.toString()); 
//		    throw nlapiCreateError('99999', error.toString());
		}
		return false;
    }
}