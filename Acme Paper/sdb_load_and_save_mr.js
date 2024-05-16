/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/log"], function (search, record, log) {
    function getInputData() {
        try {
            // return [900673,901773,902573]
            return search.load({
                id: 'customsearch_sdb_inv_update_with_mr',
            })
        }
        catch (error) {
            log.error('getInputData() ERROR', error);
        }

    }

    function map(context) {
        try {
            var value = JSON.parse(context.value);
            var internalId = value.values["GROUP(internalid)"].value;
            // var internalId = value;
            context.write({
                key: internalId,
                value: internalId
            });
        }
        catch (error) {
            log.error('map() ERROR', error);
        }

    }

    function reduce(context) {
        try {
            var values = context.values;
            var internalId = values[0];

            var loadedRecord = record.load({
                type: 'invoice',
                id: internalId,
                isDynamic: true,
            });
            var customerNetworkNumber = loadedRecord.getValue('custbody_sps_st_addresslocationnumber');
            if(customerNetworkNumber.length < 7){
                loadedRecord.setValue('custbody_sps_st_addresslocationnumber', '');
            }
            editItemLineLevel(loadedRecord);
             loadedRecord.setValue({
                 fieldId: 'custbodyintegrationstatus',
                 value: 1,
             });
            var idSave = loadedRecord.save({
                ignoreMandatoryFields: true
            });
            log.debug('idSave', idSave)

        } catch (error) {
            log.error("reduce() ERROR", error);
        }

    }
    /**
     * Remove the SAP Prefix if any and fix rate and UoM for the FuelCharge item
     */
    function editItemLineLevel(loadedRecord) {
        try {
            var lineCount = loadedRecord.getLineCount({
                sublistId: 'item'
            });
            var entityId = loadedRecord.getValue("entity");
            var entityLookUpFields = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: entityId,
                columns: "entityid"
            });
            for (var i = 0; i < lineCount; i++) {
                loadedRecord.selectLine({
                    sublistId: 'item',
                    line: i
                });
                var editLine = false;
                var BPN = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sps_bpn',
                });
                var item = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                });
                var amount = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                });
                var prefVendorName = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_pref_vendor_name'
                });

                if (prefVendorName == entityLookUpFields["entityid"]) {
                    loadedRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sdb_pref_vendor_name',
                        value: '',
                    });
                }

                var pattern = /SAP/;
                if (pattern.test(BPN)) {
                    BPN = BPN.slice(3);
                    loadedRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sps_bpn',
                        value: BPN
                    });
                    editLine = true;
                }

                if (item == 101912) { //IF fuelcharge item
                    var UoM = loadedRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'units',
                    });
                    var itemRate = loadedRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                    });
                    if (!UoM || !itemRate) {
                        loadedRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'units',
                            value: 127
                        });
                        loadedRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: 1,
                        });
                        loadedRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: amount,
                        });
                        log.debug("editItemLineLevel() rate loaded is: ", loadedRecord.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate'
                        }));
                        editLine = true;
                    }
                }
                loadedRecord.commitLine({
                    sublistId: 'item',
                });
            }
        } catch (error) {
            log.error("editItemLineLevel() ERROR", error);
        }
    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
