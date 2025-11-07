/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function(record, log) {

    function afterSubmit(context) {
        if (context.type === context.UserEventType.CREATE ||
            context.type === context.UserEventType.EDIT ||
            context.type === context.UserEventType.PRINT) {

            try {
                var invoiceId = context.newRecord.id;
                log.debug('Invoice ID', invoiceId);

                // Load the Invoice Record
                var invoiceRecord = record.load({
                    type: record.Type.INVOICE,
                    id: invoiceId
                });
                log.debug('Loaded Invoice Record', 'Record loaded successfully');

                
                var chargeData = [];

                // Get the count of lines in the 'charge' sublist
                var chargeCount = invoiceRecord.getLineCount({
                    sublistId: 'charge_display' // Ensure this is the correct ID for the charge sublist
                });
                log.debug('Charge Count', chargeCount);

                for (var i = 0; i < chargeCount; i++) {
                    // Get the charge ID for each line in the 'charge' sublist
                    var chargeId = invoiceRecord.getSublistValue({
                        sublistId: 'charges_display', // Sublist ID for charges
                        fieldId: 'charge', // Replace with the field ID for charge ID on the invoice record
                        line: i
                    });

                    log.debug('Charge ID (line ' + i + ')', chargeId);

                    if (chargeId) {
                        // Load the Charge Record
                        var chargeRecord = record.load({
                            type: 'CHARGRES', // Replace with the actual type of charge record
                            id: chargeId
                        });
                        log.debug('Loaded Charge Record', 'Charge record loaded successfully for Charge ID: ' + chargeId);

                        // Extract values from the charge record
                        var taskName = chargeRecord.getValue({
                            fieldId: 'billto' // Replace with actual field ID
                        });
                        var employeeName = chargeRecord.getValue({
                            fieldId: 'chargeemployee' // Replace with actual field ID
                        });
                        var rate = chargeRecord.getValue({
                            fieldId: 'rate'
                        });
                        var amount = chargeRecord.getValue({
                            fieldId: 'amount'
                        });

                        // Log the extracted data
                        log.debug('Charge Data (line ' + i + ')', {
                            TaskName: taskName,
                            EmployeeName: employeeName,
                            Rate: rate,
                            Amount: amount
                        });

                        // Optionally, push the extracted data into an array for further processing
                        chargeData.push({
                            taskName: taskName,
                            employeeName: employeeName,
                            rate: rate,
                            amount: amount
                        });
                    } else {
                        log.debug('Charge ID Missing (line ' + i + ')', 'No Charge ID found for this line');
                    }
                }

                // Log the entire charge data array
                log.debug('All Charge Data', chargeData);

            } catch (e) {
                log.error('Error', e.message);
            }
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
