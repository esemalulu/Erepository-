/*
 * This is used to assign the correct return location for all the items in the open returns 
 * Update On: 21-Dec-2016
 */
var REQUEST_RECORD_TYPE = null;
dateReturnField = 'trandate';
dateStart = '2016-12-05';
dateEnd = '2016-12-31';
//dateEnd = (new Date()).format('Y-m-d');//current Date change the date as per the need

/* restlet main call*/
function fixReturnsLocation(dataIn) {
    nlapiLogExecution('DEBUG', '-------Start-------', 'Usage: ' + nlapiGetContext().getRemainingUsage());
    REQUEST_RECORD_TYPE = nlapiGetContext().getSetting('SCRIPT', 'custscript_processing_record_type');

    return processReturns(getAllRecords());
}

/* Process all return authorization records*/
function processReturns(returnIds) {
    nlapiLogExecution('DEBUG', 'processReturns()', returnIds);
    var flag = false;
    var result = new Object({'status': null,
                            'count': 0});
    try{
        for(index in returnIds) {
            var returnId = returnIds[index];
            var returnObject = nlapiLoadRecord(REQUEST_RECORD_TYPE, returnId);
            //nlapiLogExecution('DEBUG', 'processReturns', returnId + ' loaded'); 
            for (var i = 1; i <= returnObject.getLineItemCount('item'); i++) {
                if (returnObject.getLineItemValue('item', 'itemtype',i) == 'InvtPart') {
                    var loc = getLocationNameV2(returnObject.getLineItemValue('item', 'location', i));

                    if(loc) {
                        var positionReturns = parseInt(loc.indexOf(': Returns'));

                        if(positionReturns<0) {
                            if(parseInt(loc.indexOf(':'))>0) {
                                loc = loc.substring(0, loc.indexOf(':'));
                                loc = loc + ": Returns";
                            }
                            else {
                                loc = loc + " : Returns";
                            }
                            loc = getLocationId(loc);

                            if (loc) {
                                returnObject.setLineItemValue('item', 'location', i, loc);
                                returnObject.commitLineItem('item', true);
                                nlapiLogExecution('DEBUG', "Processing RA: " + returnId, 'Item ' + returnObject.getLineItemValue('item', 'item',i) + ' - Commited');
                                result['status'] = 'success';
                                result['count'] += 1;
                                flag = true;
                            }
                        }
                    }
                }
            }
            if(flag){
                nlapiSubmitRecord(returnObject);
                nlapiLogExecution('DEBUG', "Processing RA: " + returnId, 'Record Saved');
                flag = false;
            }
        }
        nlapiLogExecution('DEBUG', 'result', JSON.stringify(result));
    }catch(err){
        if(err instanceof nlobjError){
            nlapiLogExecution('DEBUG', 'Error', err.getDetails());
        }else{
            nlapiLogExecution('DEBUG', 'Error', err.toString());
        }
    }
    nlapiLogExecution('DEBUG', '-------Completed-------', 'Usage: ' + nlapiGetContext().getRemainingUsage());
    return JSON.stringify(result);
}

/* get all return authorization ids*/
function getAllRecords() {
    var filters = [
        ['trandate','onorafter',dateStart],
        'AND',
        ['trandate','onorbefore',dateEnd],
        'AND',
        ['mainline','is','T']
    ];
    var results = [];
    var columns = new Array(); 
    columns[0] = new nlobjSearchColumn( 'tranid' );
    columns[1] = new nlobjSearchColumn( 'internalId' );
    var searchResults = nlapiSearchRecord(REQUEST_RECORD_TYPE, null, filters, columns );

    for( var index = 0; searchResults != null && index < searchResults.length; index++ ) 
    { 
        var searchResult = (searchResults[index]);
        var ResultId = searchResult.getValue('internalId');
        if(ResultId&&(results.indexOf(ResultId)<0)) {
            results.push(ResultId);
        }
    }
    nlapiLogExecution('DEBUG', '-------getAllRecords-------', 'Usage: ' + nlapiGetContext().getRemainingUsage());
    return results;
}

/* Get location id from location name*/
function getLocationId(locationName) {
    var filters = Array();
    filters[0] = new nlobjSearchFilter('name', null, 'is', locationName);
    var result = nlapiSearchRecord('location', null, filters, null);
    if (result !== null) {
        return result[0].getId();
    }

    return false;
}

/* Get location id from location name*/
function getLocationName(locationId) {
    var filters = Array();
    filters[0] = new nlobjSearchFilter('internalId', null, 'is', locationId);
    var columns = new Array(); 
    columns[0] = new nlobjSearchColumn( 'name' );
    var result = nlapiSearchRecord('location', null, filters, columns);
    if (result !== null) {
        return result[0].getValue('name');
    }
    return false;
}

/* Get location id from location name*/
function getLocationNameV2(locationId) {
    var locationName = false;

    if(locationId !== '' && locationId  !== null && locationId !== undefined){
        locationName = nlapiLookupField('location', locationId, 'name');
    }

    return locationName;
}