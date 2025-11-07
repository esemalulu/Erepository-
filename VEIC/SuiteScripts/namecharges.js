/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/log', 'N/search'], function(currentRecord, log, search) {
 
    function saveRecord(context) {
        var invoiceRecord = currentRecord.get();
        var lineCount = invoiceRecord.getLineCount({
            sublistId: 'item'
        });
 
        log.debug('Save Record', 'Script started for record ID: ' + invoiceRecord.id);
 
        var chargesByTask = {};
 
        for (var i = 0; i < lineCount; i++) {
            var charges = invoiceRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'charges',
                line: i
            });
 
            if (charges) {
                var chargeIds = charges.split(String.fromCharCode(5));
 
                log.debug('Charge IDs', 'Charge IDs for line ' + i + ': ' + chargeIds.join(', '));
 
                chargeIds.forEach(function(charge) {
                    charge = charge.trim();
 
                    if (charge) {
                        try {
                            var chargeLookup = search.lookupFields({
                                type: search.Type.CHARGE, // Replace with your charge record type
                                id: charge,
                                columns: ['quantity', 'amount', 'rate', 'custrecord_cp_project_task_billing', 'chargeemployee', 'chargedate', 'memo'] // Use appropriate field IDs
                            });
                            log.debug('Charge Lookup Response', JSON.stringify(chargeLookup));
 
                            var quantity = chargeLookup.quantity || 'N/A';
                            var rate = chargeLookup.rate || 'N/A';
                            var amount = chargeLookup.amount || 'N/A';
                            var parentTaskArray = chargeLookup.custrecord_cp_project_task_billing;
                            var parentTaskText = 'N/A';
                            if (Array.isArray(parentTaskArray) && parentTaskArray.length > 0) {
                                parentTaskText = parentTaskArray[0].text;
                            }
                            var employeeName = chargeLookup.chargeemployee || 'N/A';
                            var chargeDate = chargeLookup.chargedate ? new Date(chargeLookup.chargedate).toLocaleDateString() : 'N/A';
                            var memo = chargeLookup.memo || 'N/A';
 
                            var chargeDetail = 'Charge ID: ' + charge + ' | Parent Task: ' + parentTaskText + ' | Quantity: ' + quantity + ' | Rate: ' + rate + ' | Amount: ' + amount + ' | Employee: ' + employeeName + ' | Charge Date: ' + chargeDate + ' | Memo: ' + memo;
 
                            if (!chargesByTask[parentTaskText]) {
                                chargesByTask[parentTaskText] = [];
                            }
                            chargesByTask[parentTaskText].push(chargeDetail);
 
                            log.debug('Charge Details for Charge ID ' + charge, chargeDetail);
 
                        } catch (e) {
                            log.error('Error Loading Charge Record', 'Error loading charge record with ID: ' + charge + ' - ' + e.message);
                        }
                    }
                });
 
            } else {
                log.debug('No Charges', 'No charge IDs found for line ' + i);
            }
 
            log.debug('Invoice Item ' + (i + 1), 'Charges: ' + charges);
        }
        var chargeDetailsText = Object.keys(chargesByTask).map(function(parentTask) {
            var charges = chargesByTask[parentTask];
            return parentTask + '-' + charges.join('; ');
        }).join(', ');
 
        invoiceRecord.setValue({
            fieldId: 'custbody_test_field',
            value: chargeDetailsText
        });
        return true;
    }
 
    return {
        saveRecord: saveRecord
    };
});