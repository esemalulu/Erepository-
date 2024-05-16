/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/log", "N/record", "N/search", "N/file", "N/render", "N/runtime", "N/email", "N/workflow"],
    function (log, record, search, file, render, runtime, email, workflow) {
        function getInputData(context) {
            var orderId = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_order_id_to_sent' });
            log.debug("orderId", orderId);
            var isStatments = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_is_statment' });

            if (!isStatments) {
                // return search.load({ id: "customsearch_sdb_transactions_documents" });
                const orders = getOrderSearch(orderId);
                return orders;
            }
            else {
                return search.create({
                    type: search.Type.CUSTOMER,
                    columns: ["altname", "entityid"],
                    filters: search.createFilter({
                        name: 'internalid',
                        join: "transaction",
                        operator: search.Operator.NONEOF,
                        values: ["@NONE@"]
                    })
                })
            }
        }//End getInputData

        function map(context) {
            try {
                log.debug("context value: ", context.value);

                var contextResult = JSON.parse(context.value);
                if (contextResult.recordType == "customer") {
                    var customerId = contextResult.values["entityid"];
                    var customForm = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: context.key,
                        columns: ["custentity_sdb_acme_statement_w_o_credit"]
                    });
                    log.debug("customForm: ", customForm);
                    var date = new Date();
                    if (customForm.custentity_sdb_acme_statement_w_o_credit) {
                        var transactionFile = render.statement({
                            entityId: parseInt(context.key),
                            formId: 242,
                            printMode: render.PrintMode.PDF,
                            statementDate: (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear()
                        });
                    }
                    else {
                        var transactionFile = render.statement({
                            entityId: parseInt(context.key),
                            printMode: render.PrintMode.PDF,
                            statementDate: (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear()
                        });
                    }

                    var customer = record.load({
                        type: search.Type.CUSTOMER,
                        id: parseInt(context.key)
                    })
                    var contacts = customer.getLineCount("contactroles");
                    var arrayEmails = [];
                    for (var i = 0; i < contacts; i++) {
                        var contactId = customer.getSublistValue({
                            fieldId: "contact",
                            sublistId: "contactroles",
                            line: i
                        })
                        var toBeEmail = search.lookupFields({
                            type: search.Type.CONTACT,
                            id: contactId,
                            columns: ["custentity_to_be_emailed", "custentity_sdb_type_of_email"]
                        });
                        log.debug("To Be Email ", toBeEmail);
                        var arrayFiltered = toBeEmail.custentity_sdb_type_of_email.filter(function (object) {
                            return object.text == "Monthly Statements";
                        })
                        if (toBeEmail && arrayFiltered.length) {
                            arrayEmails.push(contactId)
                        }
                    }
                    if (arrayEmails.length) {
                        // email.send({
                        //     author: -5,
                        //     recipients: arrayEmails,//[parseInt(context.key)],
                        //     subject: 'Acme Generated Statement',
                        //     body: 'Hi ' + contextResult.values["altname"] + " Attached is your report",
                        //     attachments: [transactionFile],
                        // })
                        
                        record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: parseInt(context.key),
                            values: {custentity_sdb_emails_array : arrayEmails.join(';')},   
                        });
                        workflow.initiate({
                            recordType: record.Type.CUSTOMER,
                            recordId: parseInt(context.key),
                            workflowId: 'customworkflow_send_report_email'
                        });
                        workflow.trigger({
                            recordId  : parseInt(context.key),
                            recordType: record.Type.CUSTOMER,
                            workflowId: 'customworkflow_send_report_email',
                            actionId  : 'workflowaction_send_email',
                        });
                    }

                    return;
                }

                var types = {};
                types["salesorder"] = "Sales Order Acknowledgements";
                types["invoice"] = "Invoices";
                types["creditmemo"] = "Credit Memos";
                types["purchaseorder"] = "Purchase Orders";

                var salesOrderId = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_order_id_to_sent' })
                log.debug("salesOrderId", salesOrderId);
                var entityOrder;
                var contactLineCount;

                //Defining entity type depending on order type
                if (contextResult.recordType == "purchaseorder") {
                    const vendorId = contextResult.values["internalid.vendor"]?.value || contextResult.values["vendor.internalid"][0]?.value;

                    entityOrder = record.load({
                        type: search.Type.VENDOR,
                        id: vendorId
                    });

                    contactLineCount = getInfoContacts(-99, entityOrder.id);
                }
                else {
                    entityOrder = record.load({
                        type: search.Type.CUSTOMER,
                        id: contextResult.values["internalid.customer"].value
                    });

                    contactLineCount = getInfoContacts(entityOrder.id, -99);
                }

                if (!entityOrder || !contactLineCount.length) return;

                log.debug('contactCount', contactLineCount);

                var arrayEmails = [];
                for (var i = 0; i < contactLineCount.length; i++) {
                    var contactId = contactLineCount[i];

                    var toBeEmail = search.lookupFields({
                        type: search.Type.CONTACT,
                        id: contactId,
                        columns: ["custentity_to_be_emailed", "custentity_sdb_type_of_email"]
                    });

                    var arrayFiltered = toBeEmail.custentity_sdb_type_of_email.filter(function (object) {
                        return object.text == types[contextResult.recordType];
                    });

                    if (toBeEmail && arrayFiltered.length) {
                        arrayEmails.push(contactId)
                    }
                }

                var transactionFile = render.transaction({
                    entityId: parseInt(salesOrderId),
                    printMode: render.PrintMode.PDF
                });
                transactionFile.folder = -11;
                var fileId = transactionFile.save();
                log.debug("transactionFile: ", transactionFile);
                log.debug('recipients', arrayEmails);

                if (arrayEmails.length) {
                    var fileNameTransaction = contextResult.values?.tranid;
                    const userTriggerId = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_current_user_id' });
                    if (!userTriggerId) return;

                    log.debug("userTriggerId", userTriggerId);
                    if (contextResult.recordType == "purchaseorder") {
                        log.debug("userTriggerId", userTriggerId);
                        var subject = `Acme Paper ${fileNameTransaction}`;
                        var content = `Attached is Acme Paper ${fileNameTransaction}`;
                        log.debug("arrayEmails: ", arrayEmails)
                        var transactionRecord = record.load({ type: "purchaseorder", id: contextResult.id })
                        createMessage(transactionRecord, subject, content, fileId, arrayEmails);
                    }else{
                    //    email.send({
                    //     author: userTriggerId,
                    //     recipients: arrayEmails,
                    //     subject: `Acme Paper ${fileNameTransaction}`,
                    //     body: `Attached is Acme Paper ${fileNameTransaction}`,
                    //     attachments: [transactionFile],
                    // });
                        
                        record.submitFields({
                            type  : record.Type.SALES_ORDER,
                            id    : parseInt(salesOrderId),
                            values: {custentity_sdb_emails_array : arrayEmails.join(';')},   
                        });
                        workflow.initiate({
                            recordType: record.Type.SALES_ORDER,
                            recordId: parseInt(salesOrderId),
                            workflowId: 'customworkflow_sdb_send_po_emails'
                        });
                        workflow.trigger({
                            recordId  : parseInt(salesOrderId),
                            recordType: record.Type.SALES_ORDER,
                            workflowId: 'customworkflow_sdb_send_po_emails',
                            actionId  : 'workflowaction_send_email',
                        });
                    }
                   
                }

                // record.submitFields({
                //     type: record.Type.SALES_ORDER,
                //     id:salesOrderId,
                //     values:{custbody_sdb_sent_document:true}
                // })
                //custbody_sdb_sent_document

                log.debug("Process Id: ", salesOrderId);

            } catch (e) {
                log.debug('error at map', e);
                context.write({
                    key: 'ERROR',
                    value: 'item ' + fieldValuesArray[3] + ': ' + e.message
                });
            }
        }//End Map
function createMessage(transactionRecord, subject, message, fileId, recordsToSend) {
        try {
            // let messageRecord = record.create({
            //     type: "message",
            //     isDynamic: true
            // });

            // messageRecord.setValue({
            //     fieldId: 'transaction',
            //     value: transactionRecord.id
            // });
            // messageRecord.setValue({
            //     fieldId: "entity",
            //     value: transactionRecord.getValue('entity')
            // });
            // messageRecord.setValue({
            //     fieldId: 'subject',
            //     value: subject
            // });
            // messageRecord.setValue({
            //     fieldId: 'message',
            //     value: message
            // });
            // messageRecord.setValue({
            //     fieldId: 'recipient',
            //     value: Number(recordsToSend[0])
            // });

            // // Add attachment
            // messageRecord.insertLine({
            //     sublistId: "mediaitem",
            //     line: 0
            // });
            // messageRecord.setCurrentSublistValue({
            //     sublistId: "mediaitem",
            //     fieldId: "mediaitem",
            //     value: fileId,
            // });
            // messageRecord.commitLine({
            //     sublistId: "mediaitem",
            // });

            // var messageId = messageRecord.save({
            //     enableSourcing: false,
            //     ignoreMandatoryFields: true
            // });
            
            // log.debug("in message id: ", messageId);
            record.submitFields({
                type: record.Type.PURCHASE_ORDER,
                id: transactionRecord.id,
                values: {custbody_sdb_emails_array : recordsToSend.join(';')},   
            });
            workflow.initiate({
                recordType: record.Type.PURCHASE_ORDER,
                recordId: transactionRecord.id,
                workflowId: 'customworkflow_sdb_send_po_emails'
            });
            workflow.trigger({
                recordId: transactionRecord.id,
                recordType: record.Type.PURCHASE_ORDER,
                workflowId: 'customworkflow_sdb_send_po_emails',
                actionId: 'workflowaction_send_email',
            });
        } catch (e) {
            log.error("ERROR in createMessage: ", e);
        }

    }
        function summarize(context) {
            var thereAreErrors = false;
            var errorMsgText = "The following error(s) happened while attempting to create/update items in Netsuite:<br/> ";
            context.output.iterator().each(function (key, value) {
                if (key === 'ERROR') {
                    thereAreErrors = true;
                    var errorMsgLine = '- ' + value + '<br/>';
                    errorMsgText = errorMsgText + errorMsgLine;
                };
                return true;
            });
        }//End summarize



        function getInfoContacts(customer, vendor) {
            // log.debug('customer', customer);
            // log.debug('vendor', vendor);

            var resultContacts = [];

            var contactSearchObj = search.create({
                type: "contact",
                filters:
                    [
                        ["vendor.internalid", "anyof", vendor],
                        "OR",
                        ["customer.internalid", "anyof", customer]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            var searchResultCount = contactSearchObj.runPaged().count;
            contactSearchObj.run().each(function (result) {
                resultContacts.push(result.id);
                return true;
            });

            return resultContacts;
        }//End getInfoContacts

        function getOrderSearch(orderId) {
            var orders = [];
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["type", "anyof", "SalesOrd", "CustInvc", "CustCred", "PurchOrd"],
                        "AND",
                        ["mainline", "is", "T"],
                        "AND",
                        ["custbody_sdb_sent_document", "is", "F"],
                        "AND",
                        ["internalid", "anyof", orderId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "customer",
                            label: "Internal ID"
                        }),
                        search.createColumn({ name: "type", label: "Type" }),
                        search.createColumn({
                            name: "internalid",
                            join: "vendor",
                            label: "Internal ID"
                        }),
                        search.createColumn({ name: "tranid", label: "Transaction name" })
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count", searchResultCount);
            transactionSearchObj.run().each(function (result) {
                orders.push(result);
                return true;
            });

            return orders;
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };


    });