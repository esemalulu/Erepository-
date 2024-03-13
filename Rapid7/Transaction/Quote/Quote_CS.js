/*
 * @author efagone
 */

var helperSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7_transaction_cs_helper', 'customdeployr7_transaction_cs_helper', false);
var objSalesRepLLCLocationMap = {};

//PAGE INIT
function r7_quote_cs_pageInit(type){
	if (type == 'create' || type == 'copy') {
		nlapiSetFieldValue('custbodyr7includeinsalesforecast', 'F');
	}

	if (type == 'create'){
		sourceLLCLocationFromSalesRep(nlapiGetFieldValue('salesrep'));
    }
    
    // APPS 2244 remove -Custom- value from select fields
    // if (type == 'edit' || type == 'create' || type == 'copy') {
    //     getDropdown(window.document.getElementsByName('inpt_billaddresslist')[0]).deleteOneOption('-2');
    //     getDropdown(window.document.getElementsByName('inpt_shipaddresslist')[0]).deleteOneOption('-2');
    // }
}

//FIELD CHANGED
function r7_quote_cs_fieldChanged(type, name, linenum){
	
	if (name == 'salesrep') {
		sourceLLCLocationFromSalesRep(nlapiGetFieldValue('salesrep'));
	}
}

//POST SOURCING
function r7_quote_cs_postSourcing(type, name, linenum){

	if (name == 'salesrep') {
		sourceLLCLocationFromSalesRep(nlapiGetFieldValue('salesrep'));
	}
	
	if (type == 'item' && name == 'item') {
		nlapiSetCurrentLineItemValue('item', 'location', getSalesRepLLCLocation(nlapiGetFieldValue('salesrep')), false);
	}
}

//LINE INIT
function r7_quote_cs_lineInit(type){

	if (type == 'item') {
		nlapiSetCurrentLineItemValue('item', 'location', getSalesRepLLCLocation(nlapiGetFieldValue('salesrep')), false);
	}
}

function sourceLLCLocationFromSalesRep(salesRepId){

	if (salesRepId) {
		var targetLocation = getSalesRepLLCLocation(salesRepId);
		
		if (targetLocation) {
			var currentBodyLocation = nlapiGetFieldValue('location');
			if (targetLocation !== currentBodyLocation) {
				nlapiSetFieldValue('location', targetLocation, false);
			}

			var lineCount = nlapiGetLineItemCount('item');
			if (lineCount == 0) {
				nlapiSelectLineItem('item', 1);
				nlapiSetCurrentLineItemValue('item', 'location', getSalesRepLLCLocation(nlapiGetFieldValue('salesrep')), false, true);
			}
			else {
				for (var i = 1; i <= lineCount; i++) {
					var currentLineLocation = nlapiGetLineItemValue('item', 'location', i);
					var isEndGroup = nlapiGetLineItemValue('item', 'itemtype', i) === 'EndGroup';

					if (!isEndGroup && currentLineLocation !== targetLocation) {
						nlapiSelectLineItem('item', i);
						nlapiSetCurrentLineItemValue('item', 'location', targetLocation, false, true);
						nlapiCommitLineItem('item');
					}
				}
			}
		}
	}
}

function getSalesRepLLCLocation(salesRepId){

	if (salesRepId) {
		
		if (objSalesRepLLCLocationMap && objSalesRepLLCLocationMap.hasOwnProperty(salesRepId)) {
			return objSalesRepLLCLocationMap[salesRepId];
		}
		
		var repSuiteletURL = helperSuiteletURL;
		repSuiteletURL += '&custparam_cmd=' + 'getSalesRepLLCLocation';
		repSuiteletURL += '&custparam_salesrepid=' + salesRepId;
		repSuiteletURL += '&time=' + Math.floor(Math.random() * 9999999);

		var helper_response = nlapiRequestURL(repSuiteletURL);
		if (helper_response) {
		
			var objResponse = JSON.parse(helper_response.getBody());
			
			if (objResponse.success) {
				objSalesRepLLCLocationMap[salesRepId] = objResponse.llcLocation;
				return objResponse.llcLocation;
			}
		}
	}
	return null;
}

function saveRecord() {
    /*
	R7-1000CP
	R7-1000CP4H
	R7-3000CP
	R7-3000CP4H
	R7-5000CP
	R7-5000CP4H
	R7-5000X-4H
	R7-5000X-CP
	*/
    var listOfApplianceItems = [5989, 5990, 5993, 5994, 5997, 5998, 6000, 6002];
    var lineItemCount = nlapiGetLineItemCount('item');
    var ignoreValidation = nlapiGetFieldValue('custbodyr7_ignore_quantity_valid');
	nlapiLogExecution('DEBUG','ignoreValidation',ignoreValidation);
	if(ignoreValidation != 'T'){
		for (var i = 1; i <= lineItemCount; i++) {
			var lineItem = Number(nlapiGetLineItemValue('item', 'item', i));
			nlapiLogExecution('DEBUG', 'listOfApplianceItems.indexOf(lineItem)', listOfApplianceItems.indexOf(lineItem))
			if (listOfApplianceItems.indexOf(lineItem) != -1) {
				var lineQuantity = Number(nlapiGetLineItemValue('item', 'quantity', i));
				nlapiLogExecution('DEBUG', '[1,4].indexOf(lineQuantity)', [3, 5].indexOf(lineQuantity))
				if ([3, 5].indexOf(lineQuantity) === -1) {
					alert("Warranty products for R7 appliances will only be available for 3 or 5 years.")
					return false;
				}
			}
		}
    }
        
    // APPS 2244 Validate the ship to and bill to addresses to not be -Custom- or empty.
    var CUSTOM_ADDRESS_ID = '-2';
    var EMPTY_ADDRESS = '';
    var shipaddressId = nlapiGetFieldValue('shipaddresslist');
    var billaddressId = nlapiGetFieldValue('billaddresslist');
    if (shipaddressId == CUSTOM_ADDRESS_ID || billaddressId == CUSTOM_ADDRESS_ID || 
        shipaddressId == EMPTY_ADDRESS || billaddressId == EMPTY_ADDRESS ) {
        alert('One or both addresses on this transaction are Empty or -Custom-. Please create a -New- Address on this transaction instead WITHOUT override checkbox checked off.');
        return false;
    }

    return true;
}
