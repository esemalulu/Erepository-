/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/record', 'N/email', 'N/config', 'N/log', 'N/runtime', 'N/url', 'N/search'], function (
    record,
    email,
    config,
    log,
    runtime,
    url,
    search
) {
        function afterSubmit(context) {
                const {ContextType, executionContext} = runtime;
                const {USER_INTERFACE} = ContextType;
                const {newRecord, UserEventType, type} = context;
                const {EDIT, CREATE, COPY} = UserEventType;
                if (executionContext === USER_INTERFACE) {
                        if (type === CREATE || type === EDIT || type === COPY) {
                                if (newRecord.type === record.Type.INVOICE || newRecord.type === record.Type.SALES_ORDER) {
                                        try {
                                                alertIfAddressIsEmpty(context);
                                                calculateVAT(context);
                                        } catch (error) {
                                                log.error({
                                                        title: 'UserEvent ERROR:',
                                                        details: JSON.stringify(error),
                                                });
                                        }
                                }
                        }
                }
        }

        function alertIfAddressIsEmpty(context) {
                let shipToAddress = context.newRecord.getValue({
                        fieldId: 'shipaddresslist',
                });
                let billToAddress = context.newRecord.getValue({
                        fieldId: 'billaddresslist',
                });

                if (isEmpty(shipToAddress) || isEmpty(billToAddress)) {
                        log.debug({
                                title: 'empty address found',
                                details:
                                    'rec id: ' + context.newRecord.id + '  ---  shipToAddress: ' + shipToAddress + ' ---  billToAddress: ' + billToAddress,
                        });
                        // noinspection JSCheckFunctionSignatures
                        let sendFrom = config.load({
                                    type: config.Type.COMPANY_PREFERENCES,
                            }).getValue({
                                    fieldId: 'custscriptr7_system_info_email_sender',
                            });

                        let sendTo = [];

                        sendTo.push(
                            runtime.getCurrentScript().getParameter({
                                    name: 'custscript_r7_emp_notify_empty_addr'
                            })
                        );

                        let recordCreatedBy = null;
                        // let recordCreatedBy = context.newRecord.getValue({
                        //     fieldId: "recordcreatedby",
                        // });

                        // we can get the actual person, which created the SO only from system notes 'Set by' value of the 'create' type...
                        // there are no reference to thes person on the record level whatsoever...
                        let salesorderSearchObj = search.create({
                                type: search.Type.SALES_ORDER,
                                filters: [['internalid', 'anyof', context.newRecord.id], 'AND', ['systemnotes.type', 'is', 'T']],
                                columns: [
                                        search.createColumn({
                                                name: 'name',
                                                join: 'systemNotes',
                                                label: 'Set by',
                                        }),
                                ],
                        });
                        salesorderSearchObj.run().each(function (result) {
                                recordCreatedBy = result.getValue({
                                        name: 'name',
                                        join: 'systemNotes',
                                });
                                return false;
                        });

                        // check for system created transactions
                        if (recordCreatedBy !== '-4' && recordCreatedBy !== null) {
                                sendTo.push(recordCreatedBy);
                        }

                        // noinspection JSCheckFunctionSignatures
                        let recordUrl = url.resolveRecord({
                                recordType: context.newRecord.type,
                                recordId: context.newRecord.id,
                                isEditMode: false,
                        });

                        let emailBody =
                            '<table>' +
                            '<tr>' +
                            '<td>' +
                            '<strong>Date Created</strong>' +
                            '</td>' +
                            '<td>' +
                            context.newRecord.getValue({
                                    fieldId: 'recordcreateddate',
                            }) +
                            '</td>' +
                            '</tr>' +
                            '<tr>' +
                            '<td>' +
                            '<strong>Created By</strong>' +
                            '</td>' +
                            '<td>' +
                            context.newRecord.getValue({
                                    fieldId: 'recordcreatedby',
                            }) +
                            '</td>' +
                            '</tr>' +
                            '<tr>' +
                            '<td>' +
                            '<strong>Internal ID</strong>' +
                            '</td>' +
                            '<td>' +
                            context.newRecord.id +
                            '</td>' +
                            '</tr>' +
                            '<tr>' +
                            '<td>' +
                            '<strong>Transaction ID</strong>' +
                            '</td>' +
                            '<td>' +
                            '<a href=' +
                            recordUrl +
                            '>' +
                            context.newRecord.getValue({
                                    fieldId: 'tranid',
                            }) +
                            '</a>' +
                            '</td>' +
                            '</tr>' +
                            '<tr>' +
                            '<td>' +
                            '<strong>Customer</strong>' +
                            '</td>' +
                            '<td>' +
                            context.newRecord.getValue({ fieldId: 'entityname' }) +
                            '</td>' +
                            '</tr>' +
                            '</table>';

                        email.send({
                                author: sendFrom,
                                recipients: sendTo,
                                subject: 'ALERT - empty adress on transaction',
                                body: emailBody,
                                relatedRecords: {
                                        transactionId: context.newRecord.id,
                                },
                        });
                }
        }

        // PoC https://issues.corp.rapid7.com/browse/APPS-17459 calculate VAT depending on bill to country
        function calculateVAT(context) {
                let currentVat = context.newRecord.getValue({
                        fieldId: 'custbody_r7_calculated_vat',
                });

                // only run once per transaction (if the is no corresponding vat records, the field will be populated with '- Empty -')
                if (isEmpty(currentVat)) {
                        // search on the current transaction, since there is no proper way of getting into a transaction address subrecord
                        let transactionSearch = search.create({
                                type: 'transaction',
                                filters: [['internalid', 'anyof', context.newRecord.id], 'AND', ['mainline', 'is', 'T']],
                                columns: [
                                        search.createColumn({
                                                name: 'country',
                                                join: 'billingAddress',
                                        }),
                                ],
                        });

                        // only one result expected
                        transactionSearch.run().each(function (result) {
                                let billAddressCountry = result.getValue({
                                        name: 'country',
                                        join: 'billingAddress',
                                });

                                let billingResponsibleParty = context.newRecord.getValue({
                                        fieldId: 'custbodyr7billingresponsibleparty',
                                });

                                let entityId = null;
                                if (billingResponsibleParty === '1') {
                                        // Customer/Self
                                        entityId = context.newRecord.getValue({
                                                fieldId: 'entity',
                                        });
                                } else if (billingResponsibleParty === '3') {
                                        // Partner/Reseller
                                        entityId = context.newRecord.getValue({
                                                fieldId: 'partner',
                                        });
                                }

                                if (entityId != null) {
                                        let vatSearch = search.create({
                                                type: 'customrecord_r7_entity_vat_number',
                                                filters: [['custrecord_r7_vat_entity.internalid', 'anyof', entityId]],
                                                // deprecated Default concept to avoid confusion
                                                // columns: ['custrecord_r7_vat_country', 'custrecord_r7_vat_number', 'custrecord_r7_vat_default'],
                                                columns: ['custrecord_r7_vat_country', 'custrecord_r7_vat_number'],
                                        });
                                        let calculatedVat = null;
                                        // deprecated Default concept to avoid confusion
                                        // let vat = {
                                        //     calculated: null,
                                        //     default: null,
                                        // };
                                        vatSearch.run().each(function (result) {
                                                let vatCountry = result.getText({
                                                        name: 'custrecord_r7_vat_country',
                                                });
                                                let vatNumber = result.getValue({
                                                        name: 'custrecord_r7_vat_number',
                                                });
                                                // deprecated Default concept to avoid confusion
                                                // let vatDefault = result.getValue({
                                                //     name: 'custrecord_r7_vat_default',
                                                // });

                                                if (vatCountry === billAddressCountry) {
                                                        calculatedVat = vatNumber;
                                                        return false; // no need to run further, match found
                                                }
                                                return true;
                                        });

                                        // submit vat with priority calculated > default > '- Empty -'
                                        record.submitFields({
                                                type: context.newRecord.type,
                                                id: context.newRecord.id,
                                                values: {
                                                        custbody_r7_calculated_vat: calculatedVat ? calculatedVat : '- Empty -'
                                                }
                                        });
                                }

                                // expecting only one result
                                return false;
                        });
                }
        }

        function isEmpty(str) {
                if (str != null && str !== '') {
                        str = str.replace(/\s/g, '');
                }
                return str == null || str === '' || str.length < 1;
        }

        return {
                afterSubmit: afterSubmit,
        };
});