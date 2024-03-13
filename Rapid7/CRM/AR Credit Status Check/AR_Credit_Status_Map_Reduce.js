/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * script for https://issues.corp.rapid7.com/browse/APPS-12741 and https://issues.corp.rapid7.com/browse/APPS-12744
 */

/**
 * helper type
 * @typedef {Object} entityObj
 * @property {String} id
 * @property {String} type
 * @property {String} status
 */

define([
    "N/record",
    "N/search",
    "N/log",
    "N/format",
    "N/runtime",
    "N/email",
    "N/config",
    "N/url",
], function (record, search, log, format, runtime, email, config, url) {
    // scriptObject to provide parameters of saved searches IDs for the script
    var scriptObj = runtime.getCurrentScript();
    /**
     * This recieves a search of invoices to be processed.
     */
    function getInputData() {
        return {
            type: "search",
            id: scriptObj.getParameter({
                name: "custscript_r7_invoices_to_process_srch",
            }),
        };
    }

    function map(context) {
        if (!context.isRestarted) {
            var contextValue = JSON.parse(context.value);
            try {
                log.debug({
                    title: 'contextValue',
                    details: contextValue
                });

                // set the key to entity if partner exists => partner will be processed in reduce stage, otherwise the customer
                var entityKeyObj = {
                    id: null,
                    status: null,
                    type: null,
                };
                //If partner is present, update partner
                //else update customer
                if (!isEmpty(contextValue.values["internalid.partner"])) {
                    entityKeyObj.id =
                        contextValue.values["internalid.partner"]["value"];
                    entityKeyObj.status =
                        contextValue.values[
                            "custentityr7_ar_credit_status.partner"
                        ]["value"] || "-1";
                    entityKeyObj.type = record.Type.PARTNER;
                } else {
                    entityKeyObj.id =
                        contextValue.values["internalid.customerMain"]["value"];
                    entityKeyObj.status =
                        contextValue.values[
                            "custentityr7_ar_credit_status.customerMain"
                        ]["value"] || "-1";
                    entityKeyObj.type = record.Type.CUSTOMER;
                }

                var writeObj = {
                    tranId: contextValue.id,
                    daysOverDue: contextValue.values["daysoverdue"],
                    salesRep: contextValue.values["salesrep"]["value"],
                };
                log.debug('MAP| writeObj for transaction: '+writeObj.tranId, writeObj);
                log.debug('MAP| entityKeyObj for entity: '+entityKeyObj.type+' '+entityKeyObj.id, entityKeyObj);

                // exaple write obj
                //  {
                // 	    key: "{ 'id': '123123123', 'status': '1', 'type': 'customer' }"
                // 	    value: "{ 'tranId': '12345678', 'daysOverDue': '12', salesRep: '12345678' }"
                //  }
                context.write({
                    key: JSON.stringify(entityKeyObj),
                    value: writeObj,
                });
            } catch (e) {
                log.debug({
                    title: "error occured on map stage",
                    details: e
                });
            }
        }
    }

    function reduce(context) {
        try {
            log.debug({
                title: 'entityID - ' + JSON.parse(context.key).id + ' with current status ' + JSON.parse(context.key).status,
                details: 'invoices due days - ' + JSON.stringify(context.values)
            });

            var invoicesArr = context.values;
            var currentEntity = JSON.parse(context.key);
            var entityInvoices = {
                notOverDue: [],
                delinquent: [],
                severelyDelinquent: [],
            };

            invoicesArr.forEach(function (invoiceObjJSON) {
                var invoiceObj = JSON.parse(invoiceObjJSON);
                // log.debug({ title: 'invoiceObj', details: invoiceObj});
                // log.debug({ title: 'invoiceObj', details: invoiceObj['daysOverDue']});
                // log.debug({ title: 'invoiceObj', details: invoiceObj['tranId']});

                //CM - 9/11/20 APPS-14438: Remove logic to unset delinquent status
                /*if (parseInt(invoiceObj.daysOverDue) === 0) {
                    // entityInvoices.notOverDue.push(invoiceObj.tranId);
                    entityInvoices.notOverDue.push({
                        id: invoiceObj.tranId,
                        salesRep: invoiceObj.salesRep,
                    });
                } else
                */
                if (parseInt(invoiceObj.daysOverDue) > 0 && parseInt(invoiceObj.daysOverDue) < 60) {
                    entityInvoices.delinquent.push({
                        id: invoiceObj.tranId,
                        salesRep: invoiceObj.salesRep,
                    });
                } else if (parseInt(invoiceObj.daysOverDue) >= 60) {
                    entityInvoices.severelyDelinquent.push({
                        id: invoiceObj.tranId,
                        salesRep: invoiceObj.salesRep,
                    });
                }
            });

            if (entityInvoices.severelyDelinquent.length > 0) {
                // set status and send email
                if (currentEntity.status != "2" && currentEntity.status != "4") {
                    record.submitFields({
                        type: currentEntity.type,
                        id: currentEntity.id,
                        values: {
                            custentityr7_ar_credit_status: "4",
                        },
                    });
                    log.debug({
                        title: "entityID - " + JSON.parse(context.key).id,
                        details: JSON.parse(context.key).type +
                            " new status is set to SEVERELY DELINQUENT",
                    });
                    // log.debug({ title: 'entityID - ' + JSON.parse(context.key).id + ' with current status ' + JSON.parse(context.key).status, details: 'entityInvoices - ' + JSON.stringify(entityInvoices) });
                    if (scriptObj.getParameter({
                            name: "custscript_r7_enable_email_sending"
                        }) === true) {
                        if (currentEntity.type === record.Type.CUSTOMER) {
                            sendSeverelyDelinquentEmail(
                                currentEntity,
                                entityInvoices
                            );
                        }
                    }
                }
            } else if (entityInvoices.delinquent.length > 0) {
                // set status
                if (currentEntity.status != "2" && currentEntity.status != "1") {
                    record.submitFields({
                        type: currentEntity.type,
                        id: currentEntity.id,
                        values: {
                            custentityr7_ar_credit_status: "1",
                        },
                    });
                    log.debug({
                        title: "entityID - " + JSON.parse(context.key).id,
                        details: JSON.parse(context.key).type +
                            " new status is set to DELINQUENT",
                    });
                }
            }
            /*else {
                // set status
                if (currentEntity.status != "2" && currentEntity.status != "3") {
                    record.submitFields({
                        type: currentEntity.type,
                        id: currentEntity.id,
                        values: {
                            custentityr7_ar_credit_status: "3",
                        },
                    });
                    log.debug({
                        title: "entityID - " + JSON.parse(context.key).id,
                        details: JSON.parse(context.key).type +
                            " new status is set to OFF",
                    });
                }
            }*/
        } catch (e) {
            log.debug({
                title: "error occured on reduce stage",
                details: e
            });
        }
    }

    function summarize(context) {
        try {} catch (e) {
            log.debug({
                title: "error occured on summarize stage",
                details: e,
            });
        }
    }

    /**
     * An alert is sent to the Sales Rep & Customer Success Manager on the customer page and
     * Alissa Leger when the "AR Credit Status" is updated on the customer page to "Severely Delinquent.
     * @param {entityObj} entityObj - entityObj key from reduce stage
     * @param {entityInvoices} entityInvoices - entityInvoices object with arrays of invoices, sorted by days over due
     * @return {void}
     */
    function sendSeverelyDelinquentEmail(entityObj, entityInvoices) {
        var sendFrom = config
            .load({
                type: config.Type.COMPANY_PREFERENCES,
            })
            .getValue({
                fieldId: "custscriptr7_system_info_email_sender",
            });

        var customerLookup = search.lookupFields({
            type: entityObj.type,
            id: entityObj.id,
            columns: ["custentityr7accountmanager", "entityid"],
        });

        var mainAlertRecipient = scriptObj.getParameter({
            name: "custscript_sev_delinq_alert_recipient",
        });

        // send to CSM as well as to main recipient
        var sendTo = [
            mainAlertRecipient,
            customerLookup.custentityr7accountmanager[0].value,
        ];
        // send to Sales Reps of all new severely delinquent Invoices
        entityInvoices.severelyDelinquent.forEach(function (invoiceObj) {
            sendTo.push(invoiceObj.salesRep);
        });

        var customerRecordUrl = url.resolveRecord({
            recordType: record.Type.CUSTOMER,
            recordId: entityObj.id,
            isEditMode: false,
        });

        var customerLink =
            "<a href=" +
            customerRecordUrl +
            ">" +
            customerLookup.entityid +
            "</a>";

        log.debug("sendTo", sendTo);

        var emailBody = [
            "<h3>One or more Invoices of " +
            customerLink +
            " became severely delinquent.</h3>",
            "<br/>",
            "<br/>",
            "<table border='1' cellpadding='2'>",
            "<th colspan='4'>Customer invoices:</th>",
            // "<tr>",
            // "<td colspan='1'>",
            // "<strong>Not over due Invoices:</strong>",
            // "</td>",
            // "<td colspan='3'>",
            // getInvoiceInfoList(entityInvoices.notOverDue),
            // "</td>",
            // "</tr>",
            "<tr>",
            "<td colspan='1'>",
            "<strong>Delinquent Invoices:</strong>",
            "</td>",
            "<td colspan='3'>",
            getInvoiceInfoList(entityInvoices.delinquent),
            "</td>",
            "</tr>",
            "<tr>",
            "<td colspan='1'>",
            "<strong>Severely Delinquent Invoices:</strong>",
            "</td>",
            "<td colspan='3'>",
            getInvoiceInfoList(entityInvoices.severelyDelinquent),
            "</td>",
            "</tr>",
            "</table>",
        ].join("\n");
        //https://663271-sb5.app.netsuite.com/app/crm/common/663271-sb5.app.netsuite.com/app/accounting/transactions/custinvc.nl?id=1220945&compid=663271_SB5
        email.send({
            author: sendFrom,
            recipients: sendTo,
            subject: "ALERT - Customer Status updated to SEVERELY DELINQUENT",
            body: emailBody,
            relatedRecords: {
                entityId: entityObj.id,
            },
        });
    }

    function getInvoiceInfoList(invoiceObjArr) {
        var summaryHtml = "";
        invoiceObjArr.forEach(function (invoiceObj) {
            invoiceLookup = search.lookupFields({
                type: record.Type.INVOICE,
                id: invoiceObj.id,
                columns: ["tranid", "amountremaining", "amountpaid"],
            });
            var recordUrl = url.resolveRecord({
                recordType: record.Type.INVOICE,
                recordId: invoiceObj.id,
                isEditMode: false,
            });
            var link =
                "<a href=" + recordUrl + ">" + invoiceLookup.tranid + "</a>";
            var invoiceHtml =
                "<p>" +
                link +
                ", " +
                "Amount Paid: " +
                invoiceLookup.amountpaid +
                ", " +
                "Amount Remaining: " +
                invoiceLookup.amountremaining +
                " </p><br/>";
            summaryHtml += invoiceHtml;
        });
        return summaryHtml;
    }

    // function to evaluate if the parameter given is empty
    function isEmpty(value) {
        if (
            value === "" ||
            value === " " ||
            value === null ||
            value === undefined
        ) {
            return true;
        } else {
            return false;
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize,
    };
});