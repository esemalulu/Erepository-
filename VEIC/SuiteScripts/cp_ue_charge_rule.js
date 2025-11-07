/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/error'], function (record, error) {
    function beforeSubmit(context) {
        try {

            var newRec = context.newRecord
            var chargeType = newRec.getValue({
                fieldId: "chargeruletype"
            })
            log.debug('chargeType', chargeType);
          
            var throwError = true

            if (chargeType == 'TIMEBASED') {
                var lineCount = newRec.getLineCount({
                    sublistId: "filters"
                })

                for(var i =0;i<lineCount;i++){

                    var postedLine = newRec.getSublistValue({
                        sublistId: "filters",
                        fieldId: "filterfilter",
                        line: i
                    })
                    var filterValue = newRec.getSublistValue({
                        sublistId: "filters",
                        fieldId: "filterdescr",
                        line: i
                    })

                    log.debug('postedLine', postedLine);
                    if (postedLine == 'Time_POSTED'&&filterValue=='is true'){
                        throwError = false
                    }
                    log.debug(throwError)
                }
                   

            }
            if (throwError == true && chargeType == 'TIMEBASED') {
                var custom_error = error.create({
                    name: 'POSTED_FILTER_NOT_SET',
                    message: 'You have not set the Posted Filter to True. Please Set the Posted filter to True in the "Filters" Sublist and try again.',
                    notifyOff: false
                });
                throw custom_error.message
            }




        } catch (e) {
            var custom_error = error.create({
                name: 'POSTED_FILTER_NOT_SET',
                message: 'You have not set the Posted Filter to True. Please Set the Posted filter to True in the "Filters" Sublist and try again.',
                notifyOff: false
            });
            throw custom_error.message
       
        }
    }




    return {
        beforeSubmit: beforeSubmit
    }
});