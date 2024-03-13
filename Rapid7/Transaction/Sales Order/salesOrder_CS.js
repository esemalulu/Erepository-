/*
 * @author efagone
 * 10.21.15 Sfiorentino- Added operation to disable Renewal Opp Created field on sales orders unless Admin role is editing
 */

function r7cus_pageInit(type){
	var role = nlapiGetRole();
	if ((type == 'edit' || type == 'create' || type == 'copy') && role != '3'){
		nlapiDisableField('custbodyr7renewaloppcreated');
	}
	if (type == 'create' || type == 'copy') {
		nlapiSetFieldValue('custbodyr7dateinternalreporting', nlapiDateToString(nlapiAddDays(new Date(), 0)));
    }
}

function r7cus_saveRecord(){
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
    // Removed by APPS-10390 https://issues.corp.rapid7.com/browse/APPS-10390
    // var CUSTOM_ADDRESS_ID = '-2';
    // var EMPTY_ADDRESS = '';
    // var shipaddressId = nlapiGetFieldValue('shipaddresslist');
    // var billaddressId = nlapiGetFieldValue('billaddresslist');
    // if (shipaddressId == CUSTOM_ADDRESS_ID || billaddressId == CUSTOM_ADDRESS_ID || 
    //     shipaddressId == EMPTY_ADDRESS || billaddressId == EMPTY_ADDRESS ) {
    //     alert('One or both addresses on this transaction are Empty or -Custom-. Please select an existing address or create a -New- Address on this transaction instead WITHOUT override checkbox checked off.');
    //     return false;
    // }

    return true;
}

function r7cus_validateLine(type){

	return true;
}

