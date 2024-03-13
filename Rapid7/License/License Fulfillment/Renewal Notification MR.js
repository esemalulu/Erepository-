/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NAMDConfig  ./../LicenseConfig.json
 * @NScriptType MapReduceScript
 * @module License/License Fulfillment/Renewal Notification/Renewal Notification MR
 * @description Used to generate a renewal notification licensing event to update
 *              expiration date on platform so customers do not lose access.
 */
define(['N/runtime', 'N/search', 'LicenseFulfillmentLibrary', 'N/record', 'settings', 'N/email'], function(runtime, search, fulfillmentLib, record, settings, email) {
    /**
     * @function getInputData
     * @description Use search to return order that needs to be processed.
     *
     */
    function getInputData(inputContext) {
        const scriptRef = runtime.getCurrentScript();
        // const orderToProcess = scriptRef.getParameter({
        //     name: 'custscript_order_to_process'
        // });
        const renewalNotificationSearch = scriptRef.getParameter({
            name: 'custscript_renewal_notfcn_search'
        });
        const searchRef = search.load({
            id: renewalNotificationSearch
        });
        // const newFilter = search.createFilter({
        //     name: 'internalid',
        //     operator: 'anyof',
        //     values: orderToProcess,
        // });

        // searchRef.filters.push(newFilter);

        return searchRef;
    }
    /**
     * @function map
     * @description map function will gather all lines 
     * that require a renewal notification to be sent
     *
     */
    function map(mapContext) {
        const contextObj = JSON.parse(mapContext.value);
        const thisRecValues = contextObj.values;
        try{
            //load SO record
            const salesOrderId = thisRecValues['GROUP(internalid)'].value;
            const soRec = record.load({
                type: record.Type.SALES_ORDER,
                id: salesOrderId
            });
            const licensesToProcess = [];
            //find lines where renewal required = true & get license IDs
            for (var i = 0; i < soRec.getLineCount({ sublistId: "item" }); i++) {
                var lineRenewalNotificationReq = soRec.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_renewal_notification_req",
                    line: i,
                });
                const ACL = soRec.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcolr7transautocreatelicense",
                    line: i,
                });
                if (lineRenewalNotificationReq && ACL) {
                    var lineLicenseIdText = soRec.getSublistValue({
                        sublistId: "item",
                        fieldId: "custcolr7translicenseid",
                        line: i,
                    });
                    log.audit("this license ID Text", lineLicenseIdText);
                    var lineLicenseIdType = lineLicenseIdText.substring(0,3);
                    var lineLicenseInternalId = lineLicenseIdText.substring(3);
                    log.audit("this license type", lineLicenseIdType);
                    log.audit("this license id", lineLicenseInternalId);
                    var fulfillmentRec = soRec.getSublistValue({
                        sublistId: "item",
                        fieldId: "custcolr7onepricefulfillment",
                        line: i,
                    });
                    licensesToProcess.push({
                        licenseType : lineLicenseIdType,
                        licenseId : lineLicenseInternalId,
                        fulfillmentRec : fulfillmentRec,
                    });
                }
            }
            let renewalEventId = buildRenewalNotificationEvent(salesOrderId, licensesToProcess);
            if(renewalEventId){
                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: salesOrderId,
                    values: {
                        custbody_renewal_notification_event: renewalEventId
                    },
                });

                mapContext.write({
                    key: salesOrderId,
                    value: renewalEventId
                });
            }
        } catch (e) {
            log.debug({
                title: "Error occured during map stage",
                details: e
            });
        }
    }

    /**
     * @function summarize
     * @description description
     *
     */
    function summarize(summaryContext) {
        log.audit('Date Created:' + summaryContext.dateCreated + ' - Seconds:' + summaryContext.seconds,
            'Usage:' + summaryContext.usage + ' - Concurrency:' +    summaryContext.concurrency +' - Yields:' + summaryContext.yields)

        summaryContext.output.iterator().each(function(key, value) {
            log.audit({
                title: 'Created Licensing event for Sales Order ' + key,
                details: 'License Event Id: ' + value
            });
        });
        if (summaryContext.inputSummary.error)
            {
                const e = error.create({
                    name: 'INPUT_STAGE_FAILED',
                    message: inputSummary.error
                });
                log.error('Stage: ' + 'Input' + ' failed', e);
            }

        logErrors('Map', summaryContext.mapSummary.errors);
    }

    function logErrors(stage, errorSummary) {
        if(errorSummary) {
            errorSummary.iterator().each(function(key, value) {
                log.error({
                    title: stage + ' Error Key: ' + key,
                    details: JSON.parse(value).message });
            });
        }
    }

    function buildRenewalNotificationEvent(salesOrderId, licensesToProcess){
        var soRec = search.lookupFields({
            type: search.Type.SALES_ORDER,
            id: salesOrderId,
            columns: ["internalid", "number", "entity", "custbody_r7_sf_account"],
        });
        soRec.getLookupValue = getLookupValue;
        let JSONPayload = {};
        JSONPayload.subscription = {
            id: soRec.getLookupValue("internalid"),
            licensingEventId: null,
            number: soRec.getLookupValue("number"),
            source: "NETSUITE",
            object: "SALES_ORDER",
            customer: {
                id: soRec.getLookupValue("entity"),
                name: soRec.getLookupValue("entity", true),
                ipimsCustomerId: "",
                salesforceAccountId: soRec.getLookupValue("custbody_r7_sf_account"),
            },
            products: [],
        };
        log.debug("JSONPayload step1", JSON.stringify(JSONPayload));
        for(var i=0; i < licensesToProcess.length; i++){
            let thisLicense = licensesToProcess[i];
            if (thisLicense.licenseType == "NXL") {
                fulfillmentLib.getNexposeProductPayload(
                    salesOrderId,
                    thisLicense.licenseId,
                    JSONPayload.subscription.products,
                    thisLicense.fulfillmentRec,
                    true
                );
            }

            if (thisLicense.licenseType == "INP") {
                fulfillmentLib.getInsightProductPayload(
                    salesOrderId,
                    thisLicense.licenseId,
                    JSONPayload.subscription.products,
                    thisLicense.fulfillmentRec,
                    true
                );
            }

            if (thisLicense.licenseType == "MSL"){
                fulfillmentLib.getMetasploitProductPayload(
                    salesOrderId,
                    thisLicense.licenseId,
                    JSONPayload.subscription.products,
                    thisLicense.fulfillmentRec,
                    true
                );
            }
        }
        log.audit("JSONPayload products length", JSONPayload.subscription.products.length);
        if(JSONPayload.subscription.products.length > 0){
            const eventRec = record.create({
                type: "customrecordr7_licencing_event",
                isDynamic: false,
            });
            log.debug("saving payload for SO ", JSONPayload.subscription);
            eventRec.setValue({
                fieldId: "custrecordr7_request_payload",
                value: JSON.stringify(JSONPayload),
            });
            eventRec.setValue({
                fieldId: "custrecordr7_licensing_event_status",
                value: 1, //Ready for Fulfillment
            });
            eventRec.setValue({
                fieldId: "custrecordr7_renewal_event",
                value: true,
            });
            if(JSONPayload.subscription) {
                eventRec.setValue({
                    fieldId: "custrecordr7_licensing_sales_order",
                    value: JSONPayload.subscription.id,
                });
            }

            const eventRecId = eventRec.save();
            return eventRecId;
        } else {
            log.error("Could not create event for subscription: "+JSONPayload.subscription.id, "Products are not ready for fulfillment on this order.");
            const emailBody = "Products on this order are not ready for fulfillment. Please check Sales Order and linked licenses.";
            //send email to NS Admin
            email.send({
                author: 106223954,
                body: emailBody,
                recipients: 106223954,
                subject: "Could not create licensing event for subscription: "+JSONPayload.subscription.id,
                relatedRecords: {
                    transactionId: JSONPayload.subscription.id
                }
            });
        }
    }

    /*
     * Returns value or text from NS Lookup object. Some fields are represented as arrays, but some as values, only value is returned
     * @param fieldName - text - name of field to return
     * @param getText   - bool, default - false set to true, if need to return text, not value
     */
    function getLookupValue(fieldName, getText) {
        if (this[fieldName]) {
            return util.isArray(this[fieldName])
                ? this[fieldName][0][getText ? "text" : "value"]
                : this[fieldName];
        }
    }

    return {
        getInputData,
        map,
        summarize,
    };
});