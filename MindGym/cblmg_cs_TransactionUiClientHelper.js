//
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */

var origBuyerValue = '';
var origBuyerText = '';

//Ticket 5621: If booking type is value set on this parameter, make sure to ENABLE it and DO NOT default to 1
var paramQtyEnableOverrideBookingTypeIds = nlapiGetContext().getSetting('SCRIPT','custscript_191_qtyenablebtype');
if (paramQtyEnableOverrideBookingTypeIds)
{
	paramQtyEnableOverrideBookingTypeIds = paramQtyEnableOverrideBookingTypeIds.split(',');
}
else
{
	paramQtyEnableOverrideBookingTypeIds = [];
}

//Ticket 4439: Role IDs (comma separated) to inactive quantity column and default to 1
var paramQtyDefaultRoles = nlapiGetContext().getSetting('SCRIPT','custscript_191_qtydefroles');
if (paramQtyDefaultRoles)
{
	paramQtyDefaultRoles = paramQtyDefaultRoles.split(',');
} 
else
{
	paramQtyDefaultRoles = [];
}

function trxLineInit(type)
{
	//alert('triggered '+paramQtyDefaultRoles);
	disableQtyAndSetDefault();
}

function disableQtyAndSetDefault()
{
	//If Booking Type is in paramQtyEnableOverrideBookingTypeIds parameter, return out
	//Ticket 5621 Override and open up the field if booking type is one of identified override
	var bookingType = nlapiGetCurrentLineItemValue('item', 'custcol_col_jobtype');
	if (bookingType && paramQtyEnableOverrideBookingTypeIds.contains(bookingType))
	{
		return;
	}
	
	if (paramQtyDefaultRoles.contains(nlapiGetContext().getRole()))
	{
		
		//May 15th 2016
		//	Skip if item type is Description or Subtotal
		//	This is to remove constant alerts that pops up when ever client
		//	action is taken on the line item
		if (!nlapiGetCurrentLineItemValue('item','itemtype') == 'Description' &&
			!nlapiGetCurrentLineItemValue('item','itemtype') == 'Subtotal')
		{
			nlapiDisableLineItemField('item', 'quantity', true);
			nlapiSetCurrentLineItemValue('item', 'quantity', 1, true, true);
		}
	}
}


function trxPageInit(type){
   
	origBuyerValue = nlapiGetFieldValue('custbody_buyer');
	if (origBuyerValue) {
		origBuyerText = '[Selected Buyer]-'+nlapiGetFieldText('custbody_buyer');
	}
	
	try {
			
		buildFilteredBuyerDropDown();
	} catch (initflterr) {
		alert('Error Initializing Buyers by Client Drop Down: '+getErrText(initflterr));
	}
	
	disableQtyAndSetDefault();
	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function trxSaveRecord(){
	
    // Tick revenue recognition commitment (if not ticked already)
    var revRecCommitment = nlapiGetFieldValue('revreconrevcommitment');
    if (revRecCommitment == 'F') {
      nlapiSetFieldValue('revreconrevcommitment', 'T');
    }	
    
    var status = nlapiGetFieldValue('entitystatus');
    if (status == '68') {
      nlapiSetFieldValue('custbody_document_status', '1');
    }	
	
    //Sept. 21 2015
    //Merged from Now deprecated and Deleted client script: AUX-CS-Mandatory State
    if (nlapiGetRecordType()=='estimate')
    {
    	for (var i=1; i <= nlapiGetLineItemCount('item'); i+=1)
    	{
    		var optionString = nlapiGetLineItemValue('item','options',i);
    		var arOptions = optionString.split(String.fromCharCode(4));
    		if (arOptions && arOptions.length > 0)
    		{
    			var hasState = false;
    			var hasUsCountry = false;
    			//Loop through each elements and make sure we have a value
    			for (var e=0; e < arOptions.length; e+=1)
    			{
    				var arOptionElements = arOptions[e].split(String.fromCharCode(3));
    				//0=field ID, 1=T/F, 2=Label, 3=Value of the field, 4=Text of the field
    				//ONLY validate to make sure state is there if country is US
    				//alert(arOptionElements[0]+' // '+arOptionElements[1]+' // '+arOptionElements[2]+' // '+arOptionElements[3]+' // '+arOptionElements[4]);
    				if (arOptionElements[0].toLowerCase() == 'custcol_bo_country' && ( arOptionElements[4]=='United States' || arOptionElements[4]=='229') )
    				{
    					hasUsCountry = true;
    				}
    				
    				if (arOptionElements[0].toLowerCase() == 'custcol_bo_state' && arOptionElements[3])
    				{
    					hasState = true;
    				}
    			}
    			
    			//Check to make sure we have valid state
    			if (hasUsCountry && !hasState)
    			{
    				alert('Line Item '+i+' is missing required State value for Country of United States. Please set State and try again');
    				return false;
    			}			
    		}
    	}
    }
    
    return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */



function trxFieldChanged(type, name, linenum){

	//Filtered buyer alteration
	try {
		if (name=='entity') {
			buildFilteredBuyerDropDown();
		}
			
		if (name=='custpage_ftbuyer') {
			//sync value to Buyer field
			nlapiSetFieldValue('custbody_buyer', nlapiGetFieldValue('custpage_ftbuyer'), true, true);
		}
			
		//incase some other process is setting Buyer field, try to sync back to custom filtered list.
		//However DO NOT fire field change action to prevent infinit firing
		if (name=='custbody_buyer') {
			//sync value to Buyer field
			nlapiSetFieldValue('custpage_ftbuyer', nlapiGetFieldValue('custbody_buyer'), false, true);
		}
			
	} catch (fcflterr) {
		alert('Error ReInitializing and/or Syncing Buyers by Client Drop Down: '+getErrText(fcflterr));
	}	
}


function buildFilteredBuyerDropDown() {
	var customerId = nlapiGetFieldValue('entity');
	
	if (!customerId) {
		
		//remove all elements
		nlapiRemoveSelectOption('custpage_ftbuyer', null);
		nlapiInsertSelectOption('custpage_ftbuyer', '', '', true);
		
		return;
		
	}
	
	var buyerListSlUrl = nlapiResolveURL('SUITELET', 'customscript_cbl_sl_getbuyersbycustomer', 'customdeploy_cbl_sl_getbuyersbycustomer', 'VIEW')+
					     '&customerid='+customerId;
	
	var retjson = eval('('+nlapiRequestURL(buyerListSlUrl).getBody()+')');
	if (!retjson.status) {
		alert('Error of '+retjson.err+'\n\n Try selecting different customer or refresh the page and try again');
		return;
	}
	
	//remove all elements
	nlapiRemoveSelectOption('custpage_ftbuyer', null);
	nlapiInsertSelectOption('custpage_ftbuyer', '', '', true);
	
	var hasBuyerMatch = false;
	for (var i=0; i < retjson.list.length; i++) {
		var selected = false;
		if (retjson.list[i].id == origBuyerValue) {
			selected = true;
			hasBuyerMatch = true;
		}
		nlapiInsertSelectOption('custpage_ftbuyer', retjson.list[i].id, retjson.list[i].text, selected);
	}
	
	//if original buyer selected doesn't match buyers by client, add it and have it selected
	if (origBuyerValue && !hasBuyerMatch) {
		nlapiInsertSelectOption('custpage_ftbuyer', origBuyerValue, origBuyerText, true);
	}
}

/**
 * Helper function to support feature added via Ticket 6824
 * User event script that adds the two custom button is defined in
 * AUX-UE Generic Quote Trigger (auxmg_ue_genericQuoteTriggers.js file)
 * 
 * This function will go through and set ALL existing lines 
 * depending on _type passed in
 * zero:
 * 	This will go through and set all amount to 0. 
 * 	In order to do this, script will set price level to custom and set rate to 0
 * 
 * baseprice:
 * 	This will go through and set all lines' price level to base price
 */
function lineValueAuto(_type)
{
	//Below are list of known item types that can NOT have amount or price level values
	var itemTypeToSkip = ['Description','Subtotal','EndGroup'],
		linecnt = nlapiGetLineItemCount('item'),
		errorLog = '',
		ipJson = {},
		iprs = null;
	
	if (_type == 'custprice')
	{
		var setEntityId = nlapiGetFieldValue('entity');
		if (!setEntityId)
		{
			alert('You must first set Client on the transaction');
			return;
		}
		
		try
		{
			//Look it up
			//itempricinglevel
			//itempricingunitprice
			
			//Mod July 5th 2016 
			//	It's not the default price level, it must be looked at per item under item pricing
			var ipflt = [new nlobjSearchFilter('internalid', null, 'anyof', setEntityId)],
				ipcol = [new nlobjSearchColumn('pricingitem'),
				         new nlobjSearchColumn('itempricinglevel'),
				         new nlobjSearchColumn('itempricingunitprice')];
			
			iprs = nlapiSearchRecord('customer', null, ipflt, ipcol);
			
			//If Customer does NOT have item pricing set, return out
			if (!iprs)
			{
				alert('Customer does NOT have item pricing');
				return;
			}
			
			//Loop through and build ipJson
			for (var ip=0; ip < iprs.length; ip+=1)
			{
				ipJson[iprs[ip].getValue('pricingitem')] = {
					'pricelevel':iprs[ip].getValue('itempricinglevel'),
					'unitprice':iprs[ip].getValue('itempricingunitprice')
				};
			}
			
		}
		catch(luerr)
		{
			alert(
				'Unable to dynamically look up customer item pricing\n\n'+
				getErrText(luerr)
			);
			
			return;
		}
		
	}
	
	for (var i=1; i <= linecnt; i+=1)
	{
		if (itemTypeToSkip.contains(nlapiGetLineItemValue('item','itemtype',i)))
		{
			continue;
		}
		
		nlapiSelectLineItem('item', i);
		
		if (_type == 'zero')
		{
			//-1 is value of custom price
			nlapiSetCurrentLineItemValue('item','price','-1',true,true);
			nlapiSetCurrentLineItemValue('item','rate',0.0,true,true);
			nlapiCommitLineItem('item');
		}
		else if (_type == 'baseprice')
		{
			//Grab original values so that it can be reset if it fails
			var oQty = nlapiGetCurrentLineItemValue('item','quantity'),
				oRate = nlapiGetCurrentLineItemValue('item','rate'),
				oAmount = nlapiGetCurrentLineItemValue('item','amount'),
				oPrice = nlapiGetCurrentLineItemValue('item','price');
			
			//1 is value of baseprice
			nlapiSetCurrentLineItemValue('item','price','1',true,true);
			
			//There are some items that does NOT have option to set baseline.
			//For these, notify the user
			if (nlapiGetCurrentLineItemValue('item','price') != '1')
			{
				errorLog += 'Line '+i+' does not have Baseprice option.\n';
				
				//Revert back to original
				nlapiSetCurrentLineItemValue('item','quantity',oQty,true,true);
				nlapiSetCurrentLineItemValue('item','price',oPrice,true,true);
				nlapiSetCurrentLineItemValue('item','rate',oRate,true,true);
				nlapiSetCurrentLineItemValue('item','amount',oAmount,true,true);
			}
			else
			{
				nlapiCommitLineItem('item');
			}
			
		}
		//Ticket 11127 - Request to add Customer Price Level button
		else if (_type == 'custprice')
		{
			//pricelevel
			//Grab original values so that it can be reset if it fails
			var ocQty = nlapiGetCurrentLineItemValue('item','quantity'),
				ocRate = nlapiGetCurrentLineItemValue('item','rate'),
				ocAmount = nlapiGetCurrentLineItemValue('item','amount'),
				ocPrice = nlapiGetCurrentLineItemValue('item','price'),
				ocItemText = nlapiGetCurrentLineItemText('item','item');
			
			//ipJson
			//If ipJson contains the Item, change the price level and rate
			if (ipJson[ocItemText])
			{
				nlapiSetCurrentLineItemText('item','price',ipJson[ocItemText].pricelevel,true, true);
				nlapiSetCurrentLineItemValue('item','rate', ipJson[ocItemText].unitprice, true, true);
				nlapiCommitLineItem('item');
			}
			
			//custPriceLevel
			/**
			nlapiSetCurrentLineItemValue('item','price',custPriceLevel,true,true);
			
			//There are some items that does NOT have option to set price level.
			//For these, notify the user
			if (nlapiGetCurrentLineItemValue('item','price') != custPriceLevel)
			{
				errorLog += 'Line '+i+' does not have customer price level option.\n';
				
				//Revert back to original
				nlapiSetCurrentLineItemValue('item','quantity',ocQty,true,true);
				nlapiSetCurrentLineItemValue('item','price',ocPrice,true,true);
				nlapiSetCurrentLineItemValue('item','rate',ocRate,true,true);
				nlapiSetCurrentLineItemValue('item','amount',ocAmount,true,true);
			}
			else
			{
				nlapiCommitLineItem('item');
			}
			*/
		}
	}
	
	if (errorLog)
	{
		alert(
			'One or more line failed to process:\n'+
			errorLog
		);
	}
}

