/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NAMDConfig  ./../LicenseConfig.json
 * @NScriptType MapReduceScript
 * Rapid 7
 * @module License/License Fulfillment/License Fulfillment MR
 * @description
 */

define(['N/runtime', 'N/record', 'N/search', 'LicenseFulfillmentLibrary', 'N/email'], function (runtime, record, search, fulfillmentLib, email)  {
    const LICENSE_UPDATES = {
        submitFields : function(licId, recType, fieldId, licType){
            if(licId){
                //netsuite validator gets cross if the below is shorthanded
                const values = {};
                values[fieldId] = 2;
                const updatedId = record.submitFields({
                    type: recType,
                    id: licId,
                    values: values
                });
                log.debug("updated " + licType + " license - sync up submitted ", updatedId);
            }
        },
        nexpose : function (nexposeLicId) {
            return this.submitFields(
                nexposeLicId,
                'customrecordr7nexposelicensing',
                'custrecordr7_sync_up_with_ipims',
                'nexpose'
            );
        },
        insight: function(insightLicId){
            return this.submitFields(
                insightLicId,
                'customrecordr7insightplatform',
                'custrecordr7inpsyncupwithipims',
                'insight'
            );
        },
        metasploit : function (metasploitLicId){
            return this.submitFields(
                metasploitLicId,
                'customrecordr7metasploitlicensing',
                'custrecordr7mslicensesyncupwithipims',
                'metasploit'
            );
        }
    };

    /**
     * @function getInputData
     * @description description
     *
     * @public
     * @return {type} Description
     * @param  {Object} inputContext description
     */
    function getInputData() {
        return {
            type: "search",
            id: runtime.getCurrentScript().getParameter({
                name: "custscriptr7_pending_fulfillments_mr",
            }),
        };
    }

    /**
     * @function map
     * @description description
     *
     * @public
     * @param  {Object} mapContext description
     */
    function map(mapContext) {
        const contextObj = JSON.parse(mapContext.value);
        try {
            const salesOrderId = contextObj.values['GROUP(internalid)'].value;
            const soRec = record.load({
                type: record.Type.SALES_ORDER,
                id: salesOrderId
            });

            //update search to have all then in a row.
            const onePriceFulfillmentsList = [];

            for (var i = 0; i < soRec.getLineCount({ sublistId: "item" }); i++) {
                var lineOnePriceFulfillment = soRec.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcolr7onepricefulfillment",
                    line: i,
                });
                if (lineOnePriceFulfillment) {
                    onePriceFulfillmentsList.push(lineOnePriceFulfillment);
                }
            }
            //evaluate if any licenses are ready for payload generation
            const licensesList = [];
            const readyLicencesList = [];
            for(var i=0; i< onePriceFulfillmentsList.length; i++) {
                var fulfillmentRec = record.load({
                    type: "customrecord_onepricefulfillment",
                    id: onePriceFulfillmentsList[i],
                });

                var licenseIdsObj = getLicenseObj(fulfillmentRec);

                log.debug("licenseIdsObj", JSON.stringify(licenseIdsObj));
                if(isLicenseReady(licenseIdsObj)) {
                    readyLicencesList.push(onePriceFulfillmentsList[i]);
                    licensesList.push(licenseIdsObj);
                }
            };
            //if a licenses is ready for payload generation
            if (readyLicencesList.length > 0) {
                const eventRecId = buildLicensingEvent(salesOrderId, onePriceFulfillmentsList, readyLicencesList);
                log.audit("sales order ready ", salesOrderId);
                log.debug("new event created ", eventRecId);
                //update licenses to 'sync up submitted' status
                licensesList.forEach(function (currentLicense) {
                    LICENSE_UPDATES.insight(currentLicense.insightLicId);
                    LICENSE_UPDATES.nexpose(currentLicense.nexposeLicId);
                    LICENSE_UPDATES.metasploit(currentLicense.metasploitLicId);
                });
                mapContext.write({
                    key: salesOrderId,
                    value: eventRecId
                });
            }
        } catch (e) {
            log.debug({
                title: "Error occured during map stage",
                details: e
            });
        }
    }

    function getLicenseObj(fulfillmentRec){
        return {
            nexposeLicId: fulfillmentRec.getValue("custrecordopfnexposelicrec"),
            insightLicId: fulfillmentRec.getValue("custrecordopfinplicrec"),
            metasploitLicId: fulfillmentRec.getValue("custrecordopfmetasploitlicrec")
        };
    }

    function reduce(reduceContext) {
        reduceContext.write({
            key: reduceContext.key,
            value: reduceContext.values
        });
    }

    /**
     * @function summarize
     * @description description
     *
     * @public
     * @param  {Object} summaryContext description
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

        logErrors('Input', summaryContext.inputSummary.error);
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

    function buildLicensingEvent(salesOrderId, onePriceFulfillmentsList){
        const JSONPayload = fulfillmentLib.buildLicensingEventPayload(
            salesOrderId,
            onePriceFulfillmentsList
        );
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
            if(JSONPayload.subscription) {
                eventRec.setValue({
                    fieldId: "custrecordr7_licensing_sales_order",
                    value: JSONPayload.subscription.id,
                });
            }

            const eventRecId = eventRec.save();

            //stamp licensing event on fulfillment records
            onePriceFulfillmentsList.forEach(function(onePriceFufilId) {
                var fulfilRec = record.load({
                    type: "customrecord_onepricefulfillment",
                    id: onePriceFufilId,
                });
                var licenseObj = getLicenseObj(fulfilRec);
                var licenseId;
                Object.keys(licenseObj).forEach(function(key){
                    licenseId = licenseObj[key] ? licenseObj[key] : licenseId;
                });
                
                if(JSON.stringify(JSONPayload).indexOf(licenseId) > -1){
                    const updatedId = record.submitFields({
                        type: "customrecord_onepricefulfillment",
                        id: onePriceFufilId,
                        values: {
                            custrecordopflicensingevent: eventRecId,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        },
                    });
                    log.debug("updated oneprice fulfillment rec ", updatedId);
                } else {
                    log.debug("license id was not in payload ", licenseId);
                }
            });

            return eventRecId;
        }
        else {
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

    function isLicenseReady(licenseIdsObj) {
        if (licenseIdsObj.nexposeLicId) {
            return fulfillmentLib.checkNexposeReady(licenseIdsObj.nexposeLicId);
        }

        if (licenseIdsObj.insightLicId) {
            return fulfillmentLib.checkInsightReady(licenseIdsObj.insightLicId);
        }

        if (licenseIdsObj.metasploitLicId) {
            return fulfillmentLib.checkMetasploitReady(licenseIdsObj.metasploitLicId);
        }

        return false;
    }

    return /** @alias module: License/License Fulfillment/License Fulfillment MR */ {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});