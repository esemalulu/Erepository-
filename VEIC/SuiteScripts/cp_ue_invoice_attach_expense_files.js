/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*global define*/
define(['N/runtime', 'N/search', 'N/error', 'N/log', 'N/record'],
        function (runtime, search, error, log, record) {
    function afterSubmit(context) {
        try {
            var recordGet = context.newRecord;
            var rec = record.load({
                    type: 'invoice',
                    id: recordGet.id
                });
            if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
                // var billableExpenseCount = rec.getLineCount({
                //     sublistId: 'expcost'
                // });
                var chargeSearchObj = search.create({
                   type: "charge",
                   filters:
                   [
                      ["invoice.internalidnumber","equalto",recordGet.id]
                   ],
                   columns:
                   [
                      search.createColumn({name: "use", label: "Charge Use"}),
                      search.createColumn({name: "chargetype", label: "Charge Type"}),
                      search.createColumn({name: "id", label: "Charge ID"}),
                      search.createColumn({name: "billto", label: "Client:Project"}),
                      search.createColumn({name: "rate", label: "Rate"}),
                      search.createColumn({name: "quantity", label: "Quantity"}),
                      search.createColumn({name: "discountamount", label: "Discount Amount"}),
                      search.createColumn({name: "amount", label: "Amount"}),
                      search.createColumn({name: "chargedate", label: "Date"}),
                      search.createColumn({name: "billdate", label: "Bill Date"}),
                      search.createColumn({
                         name: "internalid",
                         join: "transaction",
                         label: "Internal ID"
                      })
                   ]
                }).run();
                var recordsArray = [];
                //for (var line = 0; line < billableExpenseCount; line++) {
                    //var getApply = rec.getSublistValue({sublistId: 'expcost', fieldId: 'apply', line: line});
                    //if (getApply == 'T' || getApply == true) {
                        //var getDoc = rec.getSublistValue({sublistId: 'expcost', fieldId: 'doc', line: line});
                        //recordsArray.push(getDoc);
                    //}
                //}
                var chargeSearch = chargeSearchObj.getRange(0, 1000);
                if ((chargeSearch !== null) && (chargeSearch.length > 0)) {
                    for (var a = 0; a < chargeSearch.length; a += 1) {
                        var billID = chargeSearch[a].getValue({name : 'internalid', join: 'transaction', summary: null });
                        if (billID){
                            recordsArray.push(billID);
                        }
                    }
                    log.debug('recordsArray', JSON.stringify(recordsArray))
                    var transactionSearchObj = search.create({
                       type: "transaction",
                       filters:
                       [
                          ["internalid", "anyof", recordsArray]
                       ],
                       columns:
                       [
                          search.createColumn({
                             name: "internalid",
                             join: "file",
                             summary: "GROUP",
                             label: "Internal ID",
                             sort : search.Sort.DESC
                          })
                       ]
                    }).run();

                    /*var transactionSearchObj = search.create({
                       type: "transaction",
                       filters:
                       [
                          ["internalid","anyof",recordsArray]
                       ],
                       columns:
                       [
                          search.createColumn({
                             name: "custcol_cp_attachfilelinelevel",
                             summary: "GROUP",
                             label: "Attach File Line Level"
                          })
                       ]
                    }).run();*/

                    var invoiceSearch = transactionSearchObj.getRange(0, 1000);
                    if ((invoiceSearch !== null) && (invoiceSearch.length > 0)) {
                        for (var a = 0; a < invoiceSearch.length; a += 1) {
                            var fileID = invoiceSearch[a].getValue({name : 'internalid', join: 'file', summary: "GROUP" });
                            //var fileID = invoiceSearch[a].getValue({name : 'custcol_cp_attachfilelinelevel', join: null, summary: "GROUP" });
                            if (fileID){
                                record.attach({
                                    record: {
                                        type: 'file',
                                        id: fileID
                                    },
                                    to: {
                                        type: 'invoice',
                                        id: rec.id
                                    }
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            var user = runtime.getCurrentUser();
            var logTitle = 'General error encountered on afterSubmit';
            var logUserDetails = ' | User ID: ' + user.id +
                    ' | Name: ' + user.name +
                    ' | Email: ' + user.email +
                    ' | Department: ' + user.department +
                    ' | Location: ' + user.location +
                    ' | Role: ' + user.role +
                    ' | Role ID: ' + user.roleId +
                    ' | Record ID: ' + context.newRecord.id;
            log.error(logTitle, 'Error: ' + e + ' | User Details: ' + logUserDetails);
        }
    }
    return {
        afterSubmit: afterSubmit
    };

});