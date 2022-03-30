/*
 * This is used to assign the correct return location for all the items in the open returns 
 *
 *
 */
recordType = 'returnauthorization';
dateReturnField = 'trandate';
dateStart = '2016-12-05';
//dateEnd = (new Date()).format('Y-m-d');//current Date change the date as per the need
dateEnd = '2016-12-31';

function fixReturnsLocation(dataIn) { 
  nlapiLogExecution('DEBUG', "starting"," schedule started");
  return processReturns(getAllReturns());
}

//processReturns(getAllReturns());

function processReturns(returnIds) {
    flag = false;
    for(index in returnIds) {
        var returnId = returnIds[index];
        var returnObject = nlapiLoadRecord(recordType,returnId); 
        for (var i = 1; i <= returnObject.getLineItemCount('item'); i++) {
            if (returnObject.getLineItemValue('item', 'itemtype',i) == 'InvtPart') {
                nlapiLogExecution('DEBUG', "Existing location Name:", (returnObject.getLineItemValue('item', 'location',i)));
                //console.log("Existing location Name:"+(returnObject.getLineItemValue('item', 'location', i)));
                var loc = getLocationName(returnObject.getLineItemValue('item', 'location',i));
                nlapiLogExecution('DEBUG', "Existing Location Id:",loc);
                //console.log("Existing Location Id:"+loc);
                if(loc) {
                    var positionReturns = parseInt(loc.indexOf(': Receiving Area'));
                    if(positionReturns<0) {
                        if(parseInt(loc.indexOf(':'))>0) {
                            loc = loc.substring(0, loc.indexOf(':'));
                            loc = loc + ": Receiving Area";
                        }
                        else {
                            loc = loc + " : Receiving Area";
                        }

                        nlapiLogExecution('DEBUG', "New location Name:",loc);
                        //console.log("New location Name:"+loc);
                        loc = getLocationId(loc);
                        if (loc) {
                            nlapiLogExecution('DEBUG', "New location Id:",loc);
                            //console.log("New location Name:"+loc);
                            returnObject.setLineItemValue('item', 'location', i, loc);
                            nlapiLogExecution('DEBUG', "after set location Name:",(returnObject.getLineItemValue('item', 'location', i))); 
                            //console.log("after set location Name:"+(returnObject.getLineItemValue('item', 'location', i)));
                            returnObject.commitLineItem('item');
                            nlapiLogExecution('DEBUG', "after commit set location Name:",(returnObject.getLineItemValue('item', 'location', i)));
                            nlapiSubmitRecord(returnObject,true);
                            var returnObject = nlapiLoadRecord(recordType,returnId); 
                            //console.log("final:"+returnObject.getLineItemValue('item', 'location', i));
                            nlapiLogExecution('DEBUG', "final:"+returnObject.getLineItemValue('item', 'location', i));
                            flag = true;
                        }
                    }                                    
                }
            }
        }
    }
    nlapiLogExecution('DEBUG', "End:","Done");
    return 'success';
}

function getAllReturns() {
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
    var searchResults = nlapiSearchRecord(recordType, null, filters, columns );
    for( var index = 0; searchResults != null && index < searchResults.length; index++ ) 
    { 
        var searchResult = (searchResults[index]);
        var ResultId = searchResult.getValue('internalId');
        if(ResultId&&(results.indexOf(ResultId)<0)) {
            results.push(ResultId);
        }
    }
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
