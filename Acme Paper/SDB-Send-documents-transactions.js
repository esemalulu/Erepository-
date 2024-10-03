/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/log", "N/record", "N/search", "N/render", "N/runtime", "N/workflow", "N/email"],
    function (log, record, search, render, runtime, workflow, email) {

        function getInputData() {
            var customersSendStatement = [78708];
            var orderId = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_order_id_to_sent' });
            var isStatments = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_is_statment' });

            log.debug('STATE: ', { orderId, isStatments });
            if (isStatments && !isTodayFirstDayOfMonth()) {
                log.debug('STATEMENT ISSUE: ', { info: isTodayFirstDayOfMonth(), today: new Date() });
                return []
            };
            return !isStatments ?
                getOrderSearch(orderId) :
                search.create({
                    type: search.Type.CUSTOMER,
                    columns: ["altname", "entityid"],
                    filters: [["transaction.internalid", "noneof", "@NONE@"]]//, "AND", ["internalid", "anyof", customersSendStatement]]
                });
        }


        function isTodayFirstDayOfMonth() {
            try {
                var today = new Date();
                return today.getDate() === 1;
            } catch (error) {
                log.error('ERROR: isTodayFirstDayOfMonth', error);
            }
        }

        function map(context) {
            try {
                var contextResult = JSON.parse(context.value);
                if (contextResult.recordType == "customer") return sendStatement(context, contextResult)

                //SEND TRANSACTION EMAILS
                var types = {};
                types["salesorder"] = "Sales Order Acknowledgements";
                types["invoice"] = "Invoices";
                types["creditmemo"] = "Credit Memos";
                types["purchaseorder"] = "Purchase Orders";

                var salesOrderId = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_order_id_to_sent' })
                var entityOrder;
                var contactLineCount;
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
                log.debug('BEFORE SEND EMAIL:', { arrayEmails });
                if (arrayEmails.length) {
                    var fileNameTransaction = contextResult.values?.tranid;
                    const userTriggerId = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_current_user_id' });
                    if (!userTriggerId) return;
                    if (contextResult.recordType == "purchaseorder") {
                        var subject = `Acme Paper ${fileNameTransaction}`;
                        var content = `Attached is Acme Paper ${fileNameTransaction}`;
                        var transactionRecord = record.load({ type: "purchaseorder", id: contextResult.id })
                        createMessage(transactionRecord, subject, content, fileId, arrayEmails);
                    } else {
                        log.debug('SEND EMAIL: main', { transaction: salesOrderId, emails: arrayEmails.join(';') });
                        record.submitFields({
                            type: record.Type.SALES_ORDER,
                            id: parseInt(salesOrderId),
                            values: { custentity_sdb_emails_array: arrayEmails.join(';') },
                        });
                        workflow.initiate({
                            recordType: record.Type.SALES_ORDER,
                            recordId: parseInt(salesOrderId),
                            workflowId: 'customworkflow_sdb_send_po_emails'
                        });
                        workflow.trigger({
                            recordId: parseInt(salesOrderId),
                            recordType: record.Type.SALES_ORDER,
                            workflowId: 'customworkflow_sdb_send_po_emails',
                            actionId: 'workflowaction_send_email',
                        });
                    }

                }
            } catch (e) {
                log.error('ERROR: map', e);
                context.write({
                    key: 'ERROR',
                    value: 'item ' + fieldValuesArray[3] + ': ' + e.message
                });
            }
        }

        function summarize(context) {
            try {
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
            } catch (e) {
                log.error("ERROR: summarize: ", e);
            }
        }

        function getOrderSearch(orderId) {
            try {
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
                transactionSearchObj.run().each(function (result) {
                    orders.push(result);
                    return true;
                });

                return orders;
            } catch (error) {
                log.error('ERROR: getOrderSearch', error);
            }
        }

        function sendStatement(context) {
            try {
                var contextResult = JSON.parse(context.value);
                var customForm = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: context.key,
                    columns: ["custentity_sdb_acme_statement_w_o_credit"]
                });
                var date = new Date();
                date.setDate(date.getDate() - 1); // Set last day of the month
                var startDate = new Date();
                // startDate.setMonth(startDate.getMonth() - 1)
                // startDate.setDate(1);
                // startDate.setHours(0);
                // startDate.setMinutes(0);
                var transactionFile;
                if (customForm.custentity_sdb_acme_statement_w_o_credit) {
                    transactionFile = render.statement({
                        entityId: parseInt(context.key),
                        formId: 242, //ACME Statement W/O Credit
                        printMode: render.PrintMode.PDF,
                        statementDate: (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear(),
                        startDate: '',//(startDate.getMonth() + 1) + "/" + startDate.getDate() + "/" + startDate.getFullYear(),
                        consolidateStatements: false,
                        openTransactionsOnly: true
                    });
                }
                else {
                    transactionFile = render.statement({
                        entityId: parseInt(context.key),
                        formId: 320, //	ACME Statement W/ Credit
                        printMode: render.PrintMode.PDF,
                        statementDate: (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear(),
                        startDate: '', //(startDate.getMonth() + 1) + "/" + startDate.getDate() + "/" + startDate.getFullYear(),
                        consolidateStatements: false,
                        openTransactionsOnly: true
                    });
                }

                var arrayEmails = [];
                var contactLineCount = getInfoContacts(context.key, -99);
                for (var i = 0; i < contactLineCount.length; i++) {
                    var contactId = contactLineCount[i];
                    var toBeEmail = search.lookupFields({
                        type: search.Type.CONTACT,
                        id: contactId,
                        columns: ["custentity_to_be_emailed", "custentity_sdb_type_of_email", "email"]
                    });
                    var arrayFiltered = toBeEmail.custentity_sdb_type_of_email.filter(function (object) {
                        return object.text == "Monthly Statements";
                    })
                    if (toBeEmail && arrayFiltered.length) arrayEmails.push(toBeEmail.email);
                }
                log.debug('INIT INFO: sendStatement', { arrayEmails, customer: context.key, date, startDate });
                if (arrayEmails.length) {
                    log.debug('SEND EMAIL: sendStatement', { customer: context.key, emails: arrayEmails.join(';') });
                    email.send({
                        author: 96988, //noreply@acmepaper.com
                        recipients: arrayEmails,
                        subject: 'Acme Generated Statement',
                        body: 'Hi ' + contextResult.values["altname"] + " Attached is your report",
                        attachments: [transactionFile],
                    })

                    // record.submitFields({
                    //     type: record.Type.CUSTOMER,
                    //     id: parseInt(context.key),
                    //     values: { custentity_sdb_emails_array: arrayEmails.join(';') },
                    // });
                    // workflow.initiate({
                    //     recordType: record.Type.CUSTOMER,
                    //     recordId: parseInt(context.key),
                    //     workflowId: 'customworkflow_send_report_email'
                    // });
                    // workflow.trigger({
                    //     recordId: parseInt(context.key),
                    //     recordType: record.Type.CUSTOMER,
                    //     workflowId: 'customworkflow_send_report_email',
                    //     actionId: 'workflowaction_send_email',
                    // });
                }
            } catch (error) {
                log.error('ERROR: sendStatement', error);
            }
        }

        function createMessage(transactionRecord, subject, message, fileId, recordsToSend) {
            try {
                log.debug('SEND EMAIL: createMessage', { transaction: transactionRecord.id, emails: recordsToSend.join(';') });
                record.submitFields({
                    type: record.Type.PURCHASE_ORDER,
                    id: transactionRecord.id,
                    values: { custbody_sdb_emails_array: recordsToSend.join(';') },
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
                log.error("ERROR: createMessage: ", e);
            }

        }

        function getInfoContacts(customer, vendor) {
            try {
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
                contactSearchObj.run().each(function (result) {
                    resultContacts.push(result.id);
                    return true;
                });
                return resultContacts;
            } catch (error) {
                log.error("ERROR: getInfoContacts: ", error);
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };
    });