function exportData(type) {
    var context = nlapiGetContext();
    var recType = context.getSetting('script', 'custscript_export_rec_type');

    if (!recType) return null;

    var search = null;
    var loadRecType = recType;
    if (recType == 'model') {
        search = nlapiLoadSearch(null, 'customsearch572');
        loadRecType = 'assemblyitem';
    } else if (recType == 'decor') {
        search = nlapiLoadSearch(null, 'customsearch571_2');
        loadRecType = 'noninventoryitem'
    } else if (recType == 'dealer') {
        search = nlapiLoadSearch(null, 'customsearch216');
        loadRecType = 'customer'
    } else if (recType == 'dealer_contact') {
        search = nlapiLoadSearch(null, 'customsearch_contact_json_export_search');
        search.addFilter(new nlobjSearchFilter('type', 'company', 'anyof', 'CustJob'));
        loadRecType = 'contact'
    } else if (recType == 'vendor_contact') {
        search = nlapiLoadSearch(null, 'customsearch_contact_json_export_search');
        search.addFilter(new nlobjSearchFilter('type', 'company', 'anyof', 'Vendor'));
        loadRecType = 'contact'
    } else {
        search = nlapiCreateSearch(recType, null, [new nlobjSearchColumn('internalid')]);
        // if (recType == 'customrecordrvsunit') {
        //     search.addFilter(new nlobjSearchFilter('internalid', null, 'anyof', '1995425'));
        // }
    }

    var index = 0;
    var resultSets = search.runSearch();
    var results = null;

    var data = [];
    var fileIndex = 1;

    var totalCount = 0;

    var breakIds = ['customrecordrvspreauthorization'];
    do {
        results = resultSets.getResults(index, index + 1000);
        index += 1000;
        for (var idx = 0; results && idx < results.length; idx++) {
            checkGovernance();
            
            var recId = results[idx].getId();
            nlapiLogExecution('debug', '=======Start=======', recType + " / " + recId)
            var record = null;
            try {
                record = nlapiLoadRecord(loadRecType, recId); 
            } catch (e) {
                nlapiLogExecution('error', 'Error', 'Record Internal ID is incorrect.');
                continue;
            }

            var json = {};
            try {
                var fieldIds = JSON_FIELD_IDS[recType];
                
                for (var i = 0; i < fieldIds.length; i++) {
                    try {
                        if (fieldIds[i] == 'recordid') {
                            json[fieldIds[i]] = recId;
                        } else {
                            var value = '';
                            try {
                                value = getFieldValue(record, fieldIds[i], record.getField(fieldIds[i]));;
                            } catch (e) {
                                nlapiLogExecution('error', 'Error Field', fieldIds[i]);
                                value = record.getFieldValue(fieldIds[i]);
                            }
                            
                            json[fieldIds[i]] = value;
                        }
                    } catch (e) {
                        nlapiLogExecution('error', 'Get Field(' + fieldIds[i] + ') Value Error', e)
                        continue;
                    }
                }

                if (['model', 'decor', 'dealer', 'dealer_contact', 'vendor', 'vendor_contact'].indexOf(recType) < 0) {
                    var dateValues = nlapiLookupField(loadRecType, recId, ['created','lastmodified']);
                    json['created'] = dateValues.created;
                    json['lastmodified'] = dateValues.lastmodified;
                }
            } catch (e) {
                nlapiLogExecution('error', 'Error', e);
                continue;
            }

            if (Object.keys(json).length) {
                data.push(json);
            }
            
            var content = JSON.stringify(data);
            // nlapiLogExecution('debug', 'Data', content);
            // if (content.length > 1024) { //
            if (content.length > 9437184) { //
                var fileName = recType + "_" + fileIndex;
                var fileId = createFile(fileName, content);
                nlapiLogExecution('audit', recType + ' Created File', fileId + " : " + fileName);
                nlapiLogExecution('audit', '=======End=======', recType + ' Total Size : ' + totalCount)
                totalCount += data.length;
                data = [];
                fileIndex++;
            }
            // nlapiLogExecution('debug', recType + ' Current memory size', content.length);
            nlapiLogExecution('debug', recType + ' Current Size', recType + ' Size : ' + data.length)
            nlapiLogExecution('debug', '=======End=======', recType + ' Total Size : ' + totalCount)

            if (breakIds.indexOf(recType) >= 0 && idx == 1) {
                nlapiLogExecution('debug', 'Break Json for ' + recType, JSON.stringify(data));
                break;
            }
        }
        if (breakIds.indexOf(recType) >= 0) {
            break;
        }
    } while(results && results.length);

    if (data.length) {
        var content = JSON.stringify(data);
        var fileName = recType + "_" + fileIndex;
        createFile(fileName, content);
        data = [];
        fileIndex++;
    }
}

function createFile(fileName, content) {
    // Create file
    var file = nlapiCreateFile(fileName + ".json", 'JSON', content);
    file.setFolder('48628870');
    var fileId = nlapiSubmitFile(file);
    return fileId;
}

function getFieldValue(record, fieldId, fieldType) {
    var value = '';
    if (!fieldType) return record.getFieldValue(fieldId);
    // nlapiLogExecution('debug', 'Field Type/Id', fieldType.getType() + " / " + fieldId);

    switch (fieldType.getType()) {
        case 'currency':
            value = Parse.forceFloat(record.getFieldValue(fieldId));
            break;
        case 'text':
        case 'identifier':
            value = record.getFieldValue(fieldId);
            break;
        case 'select':
            var id = record.getFieldValue(fieldId);
            if (!id) {
                value = null;
            } else {
                value = {
                    'id': id,
                    'text': record.getFieldText(fieldId)
                };
            }
            
            break;
        case 'date':
        case 'datetime':
            value = record.getFieldValue(fieldId);
            break;
        case 'checkbox':
            value = record.getFieldValue(fieldId);
            if (value == 'T') value = 'Yes';
            if (value == 'F') value = 'No';
            break;
        case 'integer':
            value = Parse.forceInt(record.getFieldValue(fieldId));
            break;
        default:
            value = record.getFieldValue(fieldId);
            break
    }
    return value;
}

var Parse = {
    forceFloat: function (stValue) {
        var flValue = parseFloat(stValue);

        if (isNaN(flValue)) {
            return 0.00;
        }

        return parseFloat(flValue.toFixed(2));
    },
    forceInt: function (stValue) {
        var intValue = parseInt(stValue);

        if (isNaN(intValue) || (stValue == Infinity)) {
            return 0;
        }

        return intValue;
    },
};

// Governance Check
function checkGovernance()
{
    var context = nlapiGetContext();

    if( context.getRemainingUsage() < 1000 ) {
        var state = nlapiYieldScript();
        if( state.status == 'FAILURE') {
            nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
            throw "Failed to yield script";
        } else if ( state.status == 'RESUME' )
        {
                nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason+".  Size = "+ state.size);
        }
        // state.status will never be SUCCESS because a success would imply a yield has occurred.  The equivalent response would be yield
    }
}