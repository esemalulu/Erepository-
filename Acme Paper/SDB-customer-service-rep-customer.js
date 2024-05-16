/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(["N/log", "N/record", "N/ui/serverWidget", "N/search", "N/runtime"], function (log, record, serverWidget, search, runtime) {

    //Create list/record in order for the user to select one
    function beforeLoad(context) {
        if (context.type != context.UserEventType.EDIT && context.type != context.UserEventType.CREATE) return;

        var form = context.form;
        if (!form) return;

        var field = form.addField({
            id: 'custpage_customer_service_rep',
            label: 'Customer Service Rep',
            type: serverWidget.FieldType.SELECT
        });
        if (!field) return;

        var fieldOriginal = form.getField({
            id: 'custentity_sdb_csr_customers'
        });
        if (fieldOriginal == null || !fieldOriginal) return;

        if (fieldOriginal.defaultValue != "") {
            field.defaultValue = fieldOriginal.defaultValue;
        }

        //Hide original btn
        fieldOriginal.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        setValuesField(field);
    }

    //Creates a Saved Search in order to find only the employees that meet the requirements for roles
    //then those customers are going to be saved in a SELECT field
    function setValuesField(field) {

        var employeeSearchObj = search.create({
            type: "employee",
            filters:
                [
                    ["role", "anyof", "1052", "1050", "1041", "1049"]
                ],
            columns:
                [
                    search.createColumn({
                        name: "internalid",
                        summary: "GROUP",
                        label: "Internal ID"
                    }),
                    search.createColumn({
                        name: "entityid",
                        summary: "GROUP",
                        sort: search.Sort.ASC,
                        label: "Name"
                    })
                ]
        });
        var searchResultCount = employeeSearchObj.runPaged().count;
        log.debug("employeeSearchObj result count", searchResultCount);
        employeeSearchObj.run().each(function (result) {
            var idEmployee = result.getValue({
                name: 'internalid',
                summary: 'GROUP',
            });

            var nameEmployee = result.getValue({
                name: 'entityid',
                summary: 'GROUP',
            });

            if (idEmployee && nameEmployee) {
                field.addSelectOption({
                    value: idEmployee,
                    text: nameEmployee,
                });
            }

            return true;
        });

    }//End

    function afterSubmit(context) {
        try {
            if (context.type != context.UserEventType.EDIT && context.type != context.UserEventType.CREATE) return;
            //if (runtime.executionContext != runtime.ContextType.USER_INTERFACE) return;
            var recid = context.newRecord.id;
            var type = context.newRecord.type;
            var rec = record.load({
                type: type,
                id: recid,
                isDynamic: true,
            })
            log.debug('recid', recid)
            log.debug('type', type)
            var lines = rec.getLineCount({
                sublistId: 'addressbook'
            })
            //Scrolls through the list of addresses and if the OMNITRACS LOCATION ID field is empty in the subrecord, the address id is entered in this field
            for (var t = 0; t < lines; t++) {
                rec.selectLine({
                    sublistId: 'addressbook',
                    line: t
                })
                var id = rec.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'addressid'
                })
                var subrec = rec.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                });

                var locationId = subrec.getValue({
                    fieldId: 'custrecord_acc_omnitracs_location_id'
                })
                log.debug('locationId', locationId)
                if (!locationId) {
                    log.debug('customerId_1', id)
                    subrec.setValue({ fieldId: 'custrecord_acc_omnitracs_location_id', value: id })
                }

                rec.commitLine({
                    sublistId: 'addressbook',
                    ignoreRecalc: true
                })
            }

            var customerId = rec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            })
            log.debug('customerId', customerId)
        } catch (e) {
            log.error({
                title: 'ERROR AfterSubmit',
                details: e
            })
        }
    }

    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    }
});
