/**
 * @NApiVersion 2.x
 * @NAMDConfig  ./../LicenseConfig.json
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(["N/search", "N/record", "N/runtime", "N/util", "N/format", "settings", "./Common/moment.js"], function (
    search,
    record,
    runtime,
    util,
    format,
    settings,
    moment
) {
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
        //query orders with pending 1price fulfillments
        var searchId = runtime
            .getCurrentScript()
            .getParameter("custscriptr7_pending_fulfillments");
        var searchOrders = search.load({ id: searchId });
        var ordersList = [];
        searchOrders.run().each(function (result) {
            ordersList.push(result.getValue(result.columns[0]));
            return true;
        });

        //collect oneprice fulfillments
        for (var i = 0; i < ordersList.length; i++) {
            log.debug("order", ordersList[i]);

            var onePriceFulfillmentsList = [];

            var soRec = record.load({
                type: record.Type.SALES_ORDER,
                id: ordersList[i],
            });
            for (var j = 0; j < soRec.getLineCount({ sublistId: "item" }); j++) {
                var lineOnePriceFulfillment = soRec.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcolr7onepricefulfillment",
                    line: j,
                });
                if (lineOnePriceFulfillment != "" && lineOnePriceFulfillment != null) {
                    onePriceFulfillmentsList.push(lineOnePriceFulfillment);
                }
            }

            var licensesList = [];
            var readyLicencesList = new Array();

            //evaluate if all licenses are ready for payload generation
            for (var j = 0; j < onePriceFulfillmentsList.length; j++) {
                var fulfillmentRec = record.load({
                    type: "customrecord_onepricefulfillment",
                    id: onePriceFulfillmentsList[j],
                });

                var nexposeLicId = fulfillmentRec.getValue({
                    fieldId: "custrecordopfnexposelicrec",
                });

                var insightLicId = fulfillmentRec.getValue({
                    fieldId: "custrecordopfinplicrec",
                });

                var metasploitLicId = fulfillmentRec.getValue({
                    fieldId: "custrecordopfmetasploitlicrec",
                });

                var licenceEventId = fulfillmentRec.getValue({
                    fieldId: "custrecordopflicensingevent",
                });

                if(!licenceEventId) {
                    var licenceReady = true;

                    log.debug(
                        "fulfillmentRec " + fulfillmentRec.id,
                        JSON.stringify({
                            nexposeLicId: nexposeLicId,
                            insightLicId: insightLicId,
                            metasploitLicId: metasploitLicId
                        })
                    );

                    if (nexposeLicId != "") {
                        licenceReady = checkNexposeReady(nexposeLicId);
                    }

                    if (insightLicId != "") {
                        licenceReady = checkInsightReady(insightLicId);
                    }

                    if (metasploitLicId != "") {
                        licenceReady = checkMetasploitReady(metasploitLicId);
                    }

                    if (insightLicId == "" && nexposeLicId == "" && metasploitLicId == "") {
                        licenceReady = false;
                    }

                    if(licenceReady) {
                        readyLicencesList.push(onePriceFulfillmentsList[j]);
                        licensesList.push({
                            nexposeLicId: nexposeLicId,
                            insightLicId: insightLicId,
                            metasploitLicId: metasploitLicId
                        });
                    }
                }
            }


            //all licenses ready for payload generation
            if (readyLicencesList.length > 0) {
                var JSONPayload = buildLicensingEventPayload(
                    ordersList[i],
                    onePriceFulfillmentsList,
                    readyLicencesList
                );
                var eventRec = record.create({
                    type: "customrecordr7_licencing_event",
                    isDynamic: false,
                });
                log.debug("saving payload for SO ", JSONPayload.subscription.id);
                eventRec.setValue({
                    fieldId: "custrecordr7_request_payload",
                    value: JSON.stringify(JSONPayload),
                });
                eventRec.setValue({
                    fieldId: "custrecordr7_licensing_event_status",
                    value: 1, //Ready for Fulfillment
                });
                eventRec.setValue({
                    fieldId: "custrecordr7_licensing_sales_order",
                    value: JSONPayload.subscription.id,
                });

                var eventRecId = eventRec.save();
                log.debug("new event created ", eventRecId);

                //stamp licensing event on fulfillment records
                for (var k = 0; k < onePriceFulfillmentsList.length; k++) {
                    if (readyLicencesList.indexOf(onePriceFulfillmentsList[k]) > -1) {
                        var updatedId = record.submitFields({
                            type: "customrecord_onepricefulfillment",
                            id: onePriceFulfillmentsList[k],
                            values: {
                                custrecordopflicensingevent: eventRecId,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                            },
                        });
                        log.debug("updated oneprice fulfillment rec ", updatedId);
                    }
                }

                //update licenses to 'sync up submitted' status
                for (var l = 0; l < licensesList.length; l++) {
                    var currentLicense = licensesList[l];
                    if (currentLicense.nexposeLicId != "") {
                        var nexposeLicRec = record.load({
                            type: "customrecordr7nexposelicensing",
                            id: currentLicense.nexposeLicId,
                        });
                        nexposeLicRec.setValue({
                            fieldId: "custrecordr7_sync_up_with_ipims",
                            value: 2,
                        });
                        var updatedId = nexposeLicRec.save();
                        log.debug(
                            "updated nexpose license - sync up submitted ",
                            updatedId
                        );
                    }
                    if (currentLicense.insightLicId != "") {
                        var insightLicRec = record.load({
                            type: "customrecordr7insightplatform",
                            id: currentLicense.insightLicId,
                        });
                        insightLicRec.setValue({
                            fieldId: "custrecordr7inpsyncupwithipims",
                            value: 2,
                        });
                        var updatedId = insightLicRec.save();
                        log.debug(
                            "updated insight license - sync up submitted ",
                            updatedId
                        );
                    }
                    if (currentLicense.metasploitLicId != "") {
                        var metasploitLicRec = record.load({
                            type: "customrecordr7metasploitlicensing",
                            id: currentLicense.metasploitLicId,
                        });
                        metasploitLicRec.setValue({
                            fieldId: "custrecordr7mslicensesyncupwithipims",
                            value: 2,
                        });
                        var updatedId = metasploitLicRec.save();
                        log.debug(
                            "updated metasploit license - sync up submitted ",
                            updatedId
                        );
                    }
                }
            }
        }

        return true;
    }

    //buildLicensingEventPayload - builds the JSON payload for all 1P licenses on a sales order
    function buildLicensingEventPayload(soId, onePriceFulfillmentsList, readyLicencesList) {
        //check if OldPrice Fulfilment at Scale is enabled
        var script = runtime.getCurrentScript();
        var oldPriceFaSEnabled = script.getParameter({
            name: 'custscript_enable_oldp_fulfil_at_scale'
        });
        var soRecord = record.load({
            type: record.Type.SALES_ORDER,
            id: soId
        });
        var soRec = search.lookupFields({
            type: search.Type.SALES_ORDER,
            id: soId,
            columns: ["internalid", "number", "entity", "custbody_r7_sf_account"],
        });
        soRec.getLookupValue = getLookupValue;
        var oldPriceFulfilAtScale = soRecord.findSublistLineWithValue({
            sublistId: 'item',
            fieldId: 'custcol_requires_fulfil_at_scale',
            value: true
        }) != -1 && oldPriceFaSEnabled;
        log.audit("Order Requires OldPrice Fulfil at Scale", soRecord.findSublistLineWithValue({
            sublistId: 'item',
            fieldId: 'custcol_requires_fulfil_at_scale',
            value: true
        }) != -1);
        log.audit("oldPriceFaSEnabled", oldPriceFaSEnabled);
        log.audit("Build Event using oldPriceFulfilAtScale", oldPriceFulfilAtScale);
        var JSONPayload = {};
        JSONPayload.subscription = {
            id: soRec.getLookupValue("internalid"),
            licensingEventId: null,
            number: soRec.getLookupValue("number"),
            source: "NETSUITE",
            object: "SALES_ORDER",
            blockResponse: oldPriceFulfilAtScale,
            customer: {
                id: soRec.getLookupValue("entity"),
                name: soRec.getLookupValue("entity", true),
                ipimsCustomerId: "",
                salesforceAccountId: soRec.getLookupValue("custbody_r7_sf_account"),
            },
            products: [],
        };
        log.debug("JSONPayload step1", JSON.stringify(JSONPayload));

        for (var k = 0; k < onePriceFulfillmentsList.length; k++) {
            if (!readyLicencesList || readyLicencesList.indexOf(onePriceFulfillmentsList[k]) > -1) {
                var fulfillmentRec = record.load({
                    type: "customrecord_onepricefulfillment",
                    id: onePriceFulfillmentsList[k],
                });

                var nexposeLicId = fulfillmentRec.getValue({
                    fieldId: "custrecordopfnexposelicrec",
                });

                var insightLicId = fulfillmentRec.getValue({
                    fieldId: "custrecordopfinplicrec",
                });

                var metasploitLicId = fulfillmentRec.getValue({
                    fieldId: "custrecordopfmetasploitlicrec",
                });

                if (nexposeLicId != "") {
                    getNexposeProductPayload(
                        soId,
                        nexposeLicId,
                        JSONPayload.subscription.products,
                        onePriceFulfillmentsList[k],
                        false,
                        oldPriceFulfilAtScale
                    );
                }

                if (insightLicId != "") {
                  log.debug("Build INP license", insightLicId);
                    getInsightProductPayload(
                        soId,
                        insightLicId,
                        JSONPayload.subscription.products,
                        onePriceFulfillmentsList[k],
                        false,
                        oldPriceFulfilAtScale
                    );
                }

                if (metasploitLicId != ""){
                    getMetasploitProductPayload(
                        soId,
                        metasploitLicId,
                        JSONPayload.subscription.products,
                        onePriceFulfillmentsList[k],
                        false,
                        oldPriceFulfilAtScale
                    );
                }
            }
        }

        log.debug("JSONPayload step2", JSON.stringify(JSONPayload));
        return JSONPayload;
    }

    //checkNexposeReady - checks if nexpose license record is ready for payload generation
    function checkNexposeReady(nexposeLicId) {
        return checkLicenseReady({
            licType: "nexpose",
            type: "customrecordr7nexposelicensing",
            filters: [
                {
                    name: "custrecordr7_sync_up_with_ipims",
                    operator: "ANYOF",
                    values: ["1"],
                },
                {
                    name: "custrecordcustrecordr7nxlicenseitemfamil",
                    operator: "ANYOF",
                    values: ["46", "52"]
                },
                {
                    name: "internalid",
                    operator: "IS",
                    values: nexposeLicId,
                },
            ],
            LFMStatusColumn: "custrecordr7licfmnexposelicense.custrecordr7licfmstatus"
        });
    }

    //checkInsightReady - checks if insight platform license record is ready for payload generation
    function checkInsightReady(insightLicId) {
        return checkLicenseReady({
            licType: "insight",
            type: "customrecordr7insightplatform",
            filters: [
                {
                    name: "custrecordr7inpsyncupwithipims",
                    operator: "ANYOF",
                    values: ["1"],
                },
                {
                    name: "custrecordr7inplicenseitemfamily",
                    operator: "ANYOF",
                    values: ["47", "48", "49", "53", "54"],
                },
                {
                    name: "internalid",
                    operator: "IS",
                    values: insightLicId,
                },
            ],
            LFMStatusColumn: "custrecordr7licfmuserinsightplatlicrec.custrecordr7licfmstatus"
        });
    }

    //checkMetasploitReady
    function checkMetasploitReady(metasploitLicId) {
        return checkLicenseReady({
            licType: "metasploit",
            type: "customrecordr7metasploitlicensing",
            filters: [
                {
                    name: "custrecordr7mslicensesyncupwithipims",
                    operator: "ANYOF",
                    values: ["1"],
                },
                {
                    name: "custrecordr7mslicenseitemfamily",
                    operator: "ANYOF",
                    values: ["50"],
                },
                {
                    name: "internalid",
                    operator: "IS",
                    values: metasploitLicId,
                },
            ],
            LFMStatusColumn: "custrecordr7licfmmetasploitlicenserec.custrecordr7licfmstatus"
        });
    }

    function checkLicenseReady(params) {
        var isReady = false;
        var searchLicenses = search.create({
            type: params.type,
            filters: params.filters,
            columns: [
                {
                    name: "formulatext",
                    summary: "MIN",
                    type: "text",
                    label: "LFMStatus",
                    formula:
                        "CASE WHEN {" + params.LFMStatusColumn + "} IN ('Scheduled','In Queue','Failed') THEN '0' ELSE  '1'  END",
                },
                {
                    name: "internalid",
                    summary: "GROUP",
                    type: "select",
                    label: "Internal ID",
                },
            ],
        });
        searchLicenses.run().each(function (result) {
            log.debug("result " +params.licType, JSON.stringify(result));
            var LFMStatus = "0";
            var cols = result.columns;
            cols.forEach(function (col) {
                switch (col.label) {
                    case "LFMStatus":
                        LFMStatus = result.getValue(col);
                        break;
                }
            });
            log.debug("LFMStatus " +params.licType, LFMStatus);
            if (LFMStatus == "1") {
                isReady = true;
            } else {
                log.debug("Not all LFMs are active yet, skipping for now", result.id);
            }
            return true;
        });

        return isReady;
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

    function getNodeTotalOwnershipFromSalesOrder(soId , nexposeLicId) {
        var totalNodeOwnership = null;

        var transactionSearchObj = search.create({
            type: "transaction",
            filters:
            [
               ["internalid", "anyof", soId], 
               "AND", 
               ["custcolr7translicenseid","is", "NXL" + nexposeLicId], 
               "AND", 
               [["custcolr7transautocreatelicense","is","T"],"OR",["item.custitemr7itemautocreatelicense","is","T"]]
            ],
            columns:
            [
               "custcolr7totalownership"
            ]
         });

         transactionSearchObj.run().each(function(result){
            totalNodeOwnership =result.getValue('custcolr7totalownership');
            return false;
         });
        return totalNodeOwnership;
    }

    function checkForUnlimitedLfm(nexposeLicId) {
        var lfmSearchObj = search.create({
            type: "customrecordr7licensefeaturemanagement",
            filters:
            [
                ["custrecordr7licfmnexposelicense","anyof",nexposeLicId], 
                "AND", 
                ["custrecordr7licfmstatus","anyof","3"], 
                "AND", 
                ["custrecordr7licfmfeildid","is","custrecordr7nxlicensenumberips"],
                "AND", 
                ["custrecordr7licfmvalue","is","999999"]
             ]
         });

        return lfmSearchObj.runPaged().count > 0;
    }

    function getPreviousTotalOwnership(soId, nexposeLicId){
        var prevTotalOwnership = 0;
        //search license for Number of IPs LFM that is not associated to this SO
        //is not an adjustment LFM and get the total ownership based on
        //total number of assets across all no. of IPs LFMs that are currently active.
        var lfmSearchObj = search.create({
            type: "customrecordr7licensefeaturemanagement",
            filters:
            [
                ["custrecordr7licfmnexposelicense","anyof",nexposeLicId], 
                "AND", 
                ["custrecordr7licfmstatus","anyof","3"],
                "AND",
                ["custrecordr7licfmsalesorder","noneof",soId],
                "AND", 
                ["custrecordr7licfmfeildid","is","custrecordr7nxlicensenumberips"],
                "AND", 
                ["custrecordr7licfeature_adjustment","is","F"],
                "AND",
                ["custrecordr7licfmvalue","doesnotstartwith","-"]
             ],
             columns:
             [
                "custrecordr7licfmvalue"
             ]
         });

         lfmSearchObj.run().each(function(result){
            if(result.getValue('custrecordr7licfmvalue') == "999999"){
                prevTotalOwnership = 999999;
                return false;
            } else {
                prevTotalOwnership += Number(result.getValue('custrecordr7licfmvalue'));
            }
         });
        return prevTotalOwnership;         
    }

    function getNexposeProductPayload(soId, nexposeLicId, productArray, fulfillRecId, isRenewalEvent, oldPriceFulfilAtScale) {
        //if oldPriceFulfilAtScale is required, use search that contains oldPrice, otherwise continue as normal
        if(oldPriceFulfilAtScale) {
            var licenceSearch = 'customsearch_nx_payload_with_old_price';
        } else {
            var licenceSearch = runtime
            .getCurrentScript()
            .getParameter("custscriptr7_nexpose_search") || 37984;
        }

        var soSearch = search.load({
            id: licenceSearch,
        });
        var idFilter = search.createFilter({
            name: "internalid",
            operator: search.Operator.IS,
            values: nexposeLicId,
        });
        var fulfillmentLineFilter = search.createFilter({
            name: "custcolr7onepricefulfillment",
            join: "custrecordr7nxlicensesalesorder",
            operator: search.Operator.ANYOF,
            values: fulfillRecId,
        });
        soSearch.filters.push(fulfillmentLineFilter);
        var soRec = record.load({ type: record.Type.SALES_ORDER, id: soId });
        soSearch.filters.push(idFilter);
        soSearch.run().each(function (result) {
            log.debug("result", JSON.stringify(result));
            var productFamily = result.getText(
                "custrecordcustrecordr7nxlicenseitemfamil"
            );
            var pkey = result.getValue("custrecordr7nxproductkey");
            log.debug("pkey", pkey);
            log.debug("pkey.substring(0, 4)", pkey.substring(0, 4));
            var lineNum = parseInt(
                result.getValue({
                    name: "linesequencenumber",
                    join: "CUSTRECORDR7NXLICENSESALESORDER",
                })
            ) -1;

            var oneItemFlow = soRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcolr7_one_item_flow",
                line: lineNum
            });

            var startDate = soRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcolr7startdate",
                line: lineNum,
            });
            var isNewSale = oneItemFlow == 1;

            //use moment for expiration date formatting
            var currentExpDate = result.getValue({ name: "custrecordr7nxlicenseexpirationdate" });
            var momentFormattedExpDate = moment(currentExpDate, "MM-DD-YYYY");
            var momentEndOfExpDate = moment(momentFormattedExpDate).endOf('day');
            var expDateMs = momentEndOfExpDate.valueOf();

            var momentStartDate = moment(startDate, "MM-DD-YYYY").utc().startOf('day');
            var startDate = isNewSale ? momentStartDate.valueOf() : null;

            var productObj = {
                type: "PURCHASED",
                licenseId: result.getValue("name"),
                id: result.id,
                package: getPackageLicenseInfo(result, 'NXL', isRenewalEvent),
                productKey:
                    pkey.substring(0, 4) != "PEND"
                        ? result.getValue("custrecordr7nxproductkey")
                        : null,
                productToken:
                    result.getValue("custrecordr7nxproducttoken") != "" &&
                    result.getValue("custrecordr7nxproducttoken") != null
                        ? result.getValue("custrecordr7nxproducttoken")
                        : null,
                productSerialNumber:
                    pkey.substring(0, 4) !== "PEND"
                        ? result.getValue("custrecordr7nxproductserialnumber")
                        : null,
                startDate: startDate,
                expirationDate: expDateMs,
                lineSequenceId: result.getValue({
                    name: "custrecordr7createdfromlinehash",
                }),
                productFamily: "Nexpose",
                attributes: {
                    numberOfHostedNodes: result.getValue(
                        "custrecordr7nxlicensenumberhostedips"
                    ),
                    scanEngineCount: result.getValue("custrecordr7nxnumberengines"),
                    assetBuffer: result.getValue("custrecordr7nxlicenselivelicenselimit"),
                    licenseModel:
                        result.getText("custrecordr7nxlicensemodel") == "Node limited"
                            ? "GENLIC"
                            : "GENFIXEDIPLIC",
                    adaptiveSecurity: result.getValue(
                        "custrecordr7nxlicenseadaptivesecurity"
                    ),
                    agents: result.getValue("custrecordr7nxlicenseagents"),
                    centrics: result.getValue("custrecordr7nxlicense_centrics"),
                    cis: result.getValue("custrecordr7nxlicensecis"),
                    cloud: result.getValue("custrecordr7nxcloud"),
                    community: result.getValue("custrecordr7nxcommunitylicense"),
                    customreporting: result.getValue("custrecordr7nxdisa"),
                    disastigs: result.getValue("custrecordr7nxlicenseadaptivesecurity"),
                    discovery: result.getValue("custrecordr7nxlicensediscoverylicense"),
                    earlyAccess: result.getValue("custrecordr7nxlicenseearlyaccess"),
                    editor: result.getValue("custrecordr7nxlicensepolicyeditor"),
                    enginePool: result.getValue("custrecordr7nxlicenseenginepool"),
                    exposureAnalytics: result.getValue(
                        "custrecordr7nxlicenseexposureanalytics"
                    ),
                    express: result.getValue("custrecordr7nxexpress"),
                    fdcc: result.getValue("custrecordr7nxlicensefdcc"),
                    liveNode: result.getValue("custrecordr7nxlicenselivelicense"),
                    mobile: result.getValue("custrecordr7nxlicensing_mobileoption"),
                    msspDiscovery: result.getValue("custrecordr7nxmsspdiscovery"),
                    multitenancy: result.getValue("custrecordr7nxlicensemultitenancy"),
                    pci: result.getValue("custrecordr7nxlicensepcitemplate"),
                    policyScan: result.getValue("custrecordr7nxpolicy"),
                    remediationAnalytics: result.getValue(
                        "custrecordr7nxlicenseremedanalytics"
                    ),
                    richDataExport: result.getValue(
                        "custrecordr7nxlicensecsvrichdataexport"
                    ),
                    scada: result.getValue("custrecordr7nxscada"),
                    usgcb: result.getValue("custrecordr7nxlicenseusgcb"),
                    webScan: result.getValue("custrecordr7nxwebscan"),
                    virtualization: result.getValue(
                        "custrecordr7nxlicensevirtualization"
                    ),
                    enterprise: true,
                    insightVM: result.getValue("custrecordr7nxlicenseinsightvm"),
                    virtualScanning: result.getValue("custrecordr7nxlicensevassetscan"),
                    apeCustomPol: result.getValue("custrecordr7nxlicensecustompolicies"),
                    policyEngineV2: result.getValue(
                        "custrecordr7nxlicenseadvancedpolicyeng"
                    ),
                },
                contact: {
                    email: result.getValue({
                        name: "email",
                        join: "CUSTRECORDR7NXLICENSECONTACT",
                    }),
                    firstName: result.getValue({
                        name: "firstname",
                        join: "CUSTRECORDR7NXLICENSECONTACT",
                    }),
                    id: result.getValue({
                        name: "internalid",
                        join: "CUSTRECORDR7NXLICENSECONTACT",
                    }),
                    lastName: result.getValue({
                        name: "lastname",
                        join: "CUSTRECORDR7NXLICENSECONTACT",
                    }),
                },
            };
            
            var externalScanEngines = result.getValue("custrecordr7nxdedhostedengines");
            if(externalScanEngines && externalScanEngines != '') {
                productObj.attributes.externalScanEngines = externalScanEngines;
            }

            var cols = result.columns;
            var attributes = productObj.attributes;
            cols.forEach(function (col) {
                switch (col.label) {
                    case "product: orderType":
                        productObj.orderType = result.getValue(col);
                        break;
                    case "product: numberOfNodes":
                        if(isRenewalEvent){
                            var prevTermAssets = getPreviousTotalOwnership(soId, nexposeLicId);
                            attributes.numberOfNodes = prevTermAssets;
                        }
                        else if(checkForUnlimitedLfm(nexposeLicId)){
                            attributes.numberOfNodes = "999999";
                        }
                        else {
                            var totalNodeOwnership = getNodeTotalOwnershipFromSalesOrder(soId , nexposeLicId);
                            attributes.numberOfNodes = totalNodeOwnership ? totalNodeOwnership : result.getValue(col);
                        }
                        break;
                }
            });
            productArray.push(productObj);
            if (productFamily === "InsightVM" || productFamily === "One-InsightVM") {
                var oneItemFlow = soRec.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcolr7_one_item_flow",
                    line: parseInt(
                        result.getValue({
                            name: "linesequencenumber",
                            join: "CUSTRECORDR7NXLICENSESALESORDER",
                        })
                    ),
                });

                var productObj = {
                    ipimsOrgId: "",
                    type: "PURCHASED", //how to get non-PURCHASED?
                    licenseId: result.getValue("name"),
                    id: result.id,
                    package: getPackageLicenseInfo(result, 'NXL', isRenewalEvent),
                    productToken:
                        result.getValue("custrecordr7nxproducttoken") != "" &&
                        result.getValue("custrecordr7nxproducttoken") != null
                            ? result.getValue("custrecordr7nxproducttoken")
                            : null,
                    startDate: startDate,
                    expirationDate: expDateMs,
                    lineSequenceId: result.getValue({
                        name: "custrecordr7createdfromlinehash",
                    }),
                    productFamily: "InsightVM",
                    managed: result.getValue("custrecordr7nxlicenseismanaged"), //added by cmcaneney - APPS-17780
                    contact: {
                        email: result.getValue({
                            name: "email",
                            join: "CUSTRECORDR7NXLICENSECONTACT",
                        }),
                        firstName: result.getValue({
                            name: "firstname",
                            join: "CUSTRECORDR7NXLICENSECONTACT",
                        }),
                        id: result.getValue({
                            name: "internalid",
                            join: "CUSTRECORDR7NXLICENSECONTACT",
                        }),
                        lastName: result.getValue({
                            name: "lastname",
                            join: "CUSTRECORDR7NXLICENSECONTACT",
                        }),
                    },
                };
                var cols = result.columns;

                cols.forEach(function (col) {
                    switch (col.label) {
                        case "product: orderType":
                            productObj.orderType = result.getValue(col);
                            break;
                        // case "DataCenter Location":
                        //   productObj.datacenterLocation = result.getValue(col);
                        //   break;
                    }
                });
                //Data Center Location
                var dataCenterLocationFromLicense = result.getValue({
                    name: "custrecordr7nxlicensedatacenterlocation"
                });
                var dataCenterLocation = "";
                if(dataCenterLocationFromLicense == ""){
                    //Use formula from search if Blank
                    cols.forEach(function (col) {
                        switch (col.label) {
                            case "DataCenter Location":
                                productObj.datacenterLocation = result.getValue(col);
                                break;
                        }
                    });
                } else {
                    //Use provided value if present
                    switch (dataCenterLocationFromLicense) {
                        case "1":
                            dataCenterLocation = "us";
                            break;
                        case "2":
                            dataCenterLocation = "eu";
                            break;
                        case "3":
                            dataCenterLocation = "au";
                            break;
                        case "4":
                            dataCenterLocation = "ca";
                            break;
                        case "5":
                            dataCenterLocation = "ap";
                            break;
                    }
                    productObj.datacenterLocation = dataCenterLocation;
                }
                productArray.push(productObj);
            }
            return true;
        });
    }

    function getInsightProductPayload(soId, insightLicId, productArray, fulfillRecId, isRenewalEvent, oldPriceFulfilAtScale) {
        //if oldPriceFulfilAtScale is required, use search that contains oldPrice, otherwise continue as normal
        if(oldPriceFulfilAtScale) {
            var licenceSearch = 'customsearch_inp_payload_with_old_price';
        } else {
            var licenceSearch = runtime
            .getCurrentScript()
            .getParameter("custscriptr7_insight_search") || 38522;
        }
        var soSearch = search.load({
            id: licenceSearch,
        });
        var idFilter = search.createFilter({
            name: "internalid",
            operator: search.Operator.IS,
            values: insightLicId,
        });
        var fulfillmentLineFilter = search.createFilter({
            name: "custcolr7onepricefulfillment",
            join: "custrecordr7inplicensesalesorder",
            operator: search.Operator.ANYOF,
            values: fulfillRecId,
            });

        soSearch.filters.push(fulfillmentLineFilter);
        var soRec = record.load({ type: record.Type.SALES_ORDER, id: soId });
        soSearch.filters.push(idFilter);
        soSearch.run().each(function (result) {
            log.debug("result", JSON.stringify(result));
            var lineNum = parseInt(
                result.getValue({
                    name: "linesequencenumber",
                    join: "custrecordr7inplicensesalesorder",
                })
            ) -1;
            var oneItemFlow = soRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcolr7_one_item_flow",
                line: lineNum,
            });
            var startDate = soRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcolr7startdate",
                line: lineNum,
            });
            var isNewSale = oneItemFlow == 1;

            var itemName = soRec.getSublistValue({
                sublistId: "item",
                fieldId: "item_display",
                line: lineNum,
            });
            var ipimsOrgId = "";
            var type = "PURCHASED";
            var licenseId = "INP" + result.id;
            var id = result.id;
            var productKey = result.getValue("custrecordr7inplicenseprodcutkey");
            var productToken = result.getValue("custrecordr7inpproducttoken");
            var momentStartDate = moment(startDate, "MM-DD-YYYY").utc().startOf('day');
            var startDate = isNewSale
                ? momentStartDate.valueOf()
                : null;

            //use moment for expiration date formatting
            var currentExpDate = result.getValue({ name: "custrecordr7inplicenseexpirationdate" });
            var momentFormattedExpDate = moment(currentExpDate, "MM-DD-YYYY");
            var momentEndOfExpDate = moment(momentFormattedExpDate).endOf('day');
            var expirationDate = momentEndOfExpDate.valueOf();

            var lineSequenceId = result.getValue(
                "custrecordr7inpcreatedfromlinehash"
            );
            var productFamily = result
                .getText("custrecordr7inplicenseordertype")
                .replace(" ", "");
            //Data Center Location
            var datacenterlocationfromlicense = result.getValue(
                "custrecordr7inplicensedatacenterlocation"
            );
            var datacenterLocation = "";
            if (datacenterlocationfromlicense == "") {
                //Use Formula If Blank
                var cols = result.columns;
                cols.forEach(function (col) {
                    switch (col.label) {
                        case "DataCenter Location":
                            datacenterLocation = result.getValue(col);
                            break;
                    }
                });
            } else {
                //Use Provided Value If Present
                switch (datacenterlocationfromlicense) {
                    case "1":
                        datacenterLocation = "us";
                        break;
                    case "2":
                        datacenterLocation = "eu";
                        break;
                    case "3":
                        datacenterLocation = "au";
                        break;
                    case "4":
                        datacenterLocation = "ca";
                        break;
                    case "5":
                        datacenterLocation = "ap";
                        break;
                }
            }

            //Deployment Type
            var deploymentTypeTxt = result.getText(
                "custrecordr7inplicensedeploytype"
            );
            

            var orderType = "paid";
            var managed = result.getValue("custrecordcustrecordr7inpismanaged");
            //Attributes
            var licensedAssets = result.getValue(
                "custrecordr7inplicenselicensedassets"
            );
            var managedNextGenAntiVirus = result.getValue(
                "custrecord_r7_mngav"
            );

            var monthlyDataLimit = result.getValue(
                "custrecordr7inplicensemonthlydatalimit"
            );
            var dataRetentionDays = result.getValue(
                "custrecordr7inplicensedataretentiondays"
            );
            var enhancedNetworkTrafficMonitoring = result.getValue(
                "custrecordr7inpnetfort"
            );
            var enhancedEndpointTelemetry = result.getValue(
                "custrecordr7inptelemetry"
            );
            var totalDataRetentionDays = result.getValue(
                "custrecordr7inptotaldataretention"
            );
            var numberofApplications = result.getValue(
                "custrecordr7inplicensenumberofapps"
            );
            var numberOfWorkflow = result.getValue(
                "custrecordr7inplicensenumofworkflows"
            );
            var maxScansOfTier = result.getValue(
                "custrecord_r7_max_scans_in_tier"
            );
            var icsLicenseId = result.getValue(
                "custrecord_r7_ics_license_id"
            );

            var hostedVelociraptor = result.getValue(
                "custrecordr7inpvelociraptor"
            );

            //contact
            var email = result.getValue({
                name: "email",
                join: "custrecordr7inplicensecontact",
            });
            var firstName = result.getValue({
                name: "firstname",
                join: "custrecordr7inplicensecontact",
            });
            var contactid = result.getValue({
                name: "internalid",
                join: "custrecordr7inplicensecontact",
            });
            var lastName = result.getValue({
                name: "lastname",
                join: "custrecordr7inplicensecontact",
            });

            var package = getPackageLicenseInfo(result, 'INP', isRenewalEvent, itemName);

            //for CODELMDR package, need to send data retention as per SF Quote
            if(package && package['packageName'].indexOf("CODELMDR") != -1){
                totalDataRetentionDays = dataRetentionDays;
            }

            var industry = "";

            var productObj = {
                ipimsOrgId: ipimsOrgId,
                type: type,
                licenseId: licenseId,
                id: id,
                package: package,
                productKey: productKey,
                productToken: productToken,
                startDate: startDate,
                expirationDate: expirationDate,
                lineSequenceId: lineSequenceId,
                productFamily: productFamily,
                datacenterLocation: datacenterLocation,
                orderType: orderType,
                managed: managed,
                attributes: {
                    icsLicenseId: icsLicenseId,
                    deploymentType: deploymentTypeTxt,
                    licensedAssets: licensedAssets,
                    monthlyDataLimit: monthlyDataLimit,
                    dataRetentionDays: dataRetentionDays,
                    enhancedNetworkTrafficMonitoring: enhancedNetworkTrafficMonitoring,
                    mngav: managedNextGenAntiVirus,
                    enhancedEndpointTelemetry: enhancedEndpointTelemetry,
                    totalDataRetentionDays: totalDataRetentionDays,
                    numberofApplications: numberofApplications,
                    numberOfWorkflow: numberOfWorkflow,
                    maxScansOfTier: maxScansOfTier,
                    industry: industry,
                    hostedVelociraptor: hostedVelociraptor,
                },
                contact: {
                    email: email,
                    firstName: firstName,
                    id: contactid,
                    lastName: lastName,
                },
            };

            log.debug("insight productObj", JSON.stringify(productObj));

            productArray.push(productObj);
            return true;
        });
    }

    function getMetasploitProductPayload(soId, metasploitLicId, productArray, fulfillRecId, isRenewalEvent, oldPriceFulfilAtScale) {
        //if oldPriceFulfilAtScale is required, use search that contains oldPrice, otherwise continue as normal
        if(oldPriceFulfilAtScale) {
            var licenseSearch = 'customsearch_ms_payload_with_old_price';
        } else {
            var licenseSearch = runtime
            .getCurrentScript()
            .getParameter("custscriptr7_metasploit_search") || 39388;
        }
        var soSearch = search.load({
            id: licenseSearch,
        });
        var idFilter = search.createFilter({
            name: "internalid",
            operator: search.Operator.IS,
            values: metasploitLicId,
        });
        var fulfillmentLineFilter = search.createFilter({
            name: "custcolr7onepricefulfillment",
            join: "custrecordr7mslicensesalesorder",
            operator: search.Operator.ANYOF,
            values: fulfillRecId,
        });
        soSearch.filters.push(fulfillmentLineFilter);
        var soRec = record.load({ type: record.Type.SALES_ORDER, id: soId });

        soSearch.filters.push(idFilter);
        soSearch.run().each(function (result) {
            log.debug("result", JSON.stringify(result));
            var lineNum = parseInt(
                result.getValue({
                    name: "linesequencenumber",
                    join: "custrecordr7mslicensesalesorder",
                })
            ) -1;
            var oneItemFlow = soRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcolr7_one_item_flow",
                line: lineNum
            });

            var startDate = soRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcolr7startdate",
                line: lineNum,
            });
            var isNewSale = oneItemFlow == 1;

            var ipimsOrgId = "";
            var type = "PURCHASED";
            var licenseId = "MSL" + result.id;
            var id = result.id;
            var productKey = isNewSale ? "" : result.getValue("custrecordr7msproductkey");
            var productToken = result.getValue("custrecordr7msproducttoken");
            var momentStartDate = moment(startDate, "MM-DD-YYYY").utc().startOf('day');
            var startDate = isNewSale
                ? momentStartDate.valueOf()
                : null;
            //use moment for expiration date formatting
            var currentExpDate = result.getValue({ name: "custrecordr7mslicenseexpirationdate" });
            var momentFormattedExpDate = moment(currentExpDate, "MM-DD-YYYY");
            var momentEndOfExpDate = moment(momentFormattedExpDate).endOf('day');
            var expirationDate = momentEndOfExpDate.valueOf();
            
            var lineSequenceId = result.getValue(
                "custrecordr7mslicensecreatedfromlinehash"
            );
            //var productFamily = result.getText("custrecordr7mslicenseitemfamily");
            var orderType = result.getValue("custrecordr7msordertype");

            orderType = parseInt(orderType);
            switch (orderType) {
                case 1:
                    orderType = 'EXPRESS';
                    break;
                case 2:
                case 5:
                    orderType = 'PRO';
                    break;
                case 3:
                    orderType = 'COMMUNITY';
                    break;
                case 4:
                    orderType = 'NX_ULTIMATE';
                    break;
                default:
                    orderType = 'NOT VALID';
            }

            //Attributes
            var userCount = result.getValue("custrecordr7msprousercount");
            var internal = result.getValue("custrecordr7msinternal");
            var hardwareLicense = result.getValue("custrecordr7mslicensehardware");
            var perpetual = result.getValue("custrecordr7mslicense_perpetuallicense");
            //contact
            var email = result.getValue({
                name: "email",
                join: "custrecordr7mslicensecontact",
            });
            var firstName = result.getValue({
                name: "firstname",
                join: "custrecordr7mslicensecontact",
            });
            var contactid = result.getValue({
                name: "internalid",
                join: "custrecordr7mslicensecontact",
            });
            var lastName = result.getValue({
                name: "lastname",
                join: "custrecordr7mslicensecontact",
            });

            var productObj = {
                ipimsOrgId: ipimsOrgId,
                type: type,
                licenseId: licenseId,
                id: id,
                productKey: productKey,
                productToken: productToken,
                startDate: startDate,
                expirationDate: expirationDate,
                lineSequenceId: lineSequenceId,
                orderType: orderType,
                productFamily: "Metasploit",
                userCount: userCount,
                internal: internal,
                hardwareLicense: hardwareLicense,
                perpetual: perpetual,
                contact: {
                    email: email,
                    firstName: firstName,
                    id: contactid,
                    lastName: lastName,
                }
            };

            log.debug("metasploit productObj", JSON.stringify(productObj));

            productArray.push(productObj);

            return true;
        });
    }

    function getPackageLicenseInfo(searchResult, licenseType, isRenewalEvent, itemName) {
        var packageIdentifier = null;
        var packageName = null;
        var packageLevel = null;
        var packageLicenseRecordId = licenseType === 'NXL' ? searchResult.getValue('custrecordr7nxlicensepackagelicense') : licenseType === 'INP' ? searchResult.getValue('custrecordr7inplicensepackagelicense') : null;
        var getFulfilAsPackageId = licenseType === 'INP' ? searchResult.getValue('custrecord_r7_inp_fulfil_as_pkg_id') : null;
        if (packageLicenseRecordId && packageLicenseRecordId != '') {
            packageLicenseLookup = search.lookupFields({
                type: 'customrecord_r7_pck_license',
                id: packageLicenseRecordId,
                columns: ['custrecord_r7_pl_package_id', 'custrecord_r7_pl_current_level', 'custrecord_r7_pl_package_template', 'custrecord_r7_pl_level_update']
            });
            packageLicenseLookup.getLookupValue = getLookupValue;
            var isRenewalLevelUpdate = packageLicenseLookup.getLookupValue('custrecord_r7_pl_level_update');

            if(isRenewalEvent && isRenewalLevelUpdate){
                //if renewal notification is being sent, and package level has been updated,
                //get previous package level from sys notes
                var currentLevel = packageLicenseLookup.getLookupValue('custrecord_r7_pl_current_level', true);
                var currentTemplate = packageLicenseLookup.getLookupValue('custrecord_r7_pl_package_template', true);
                var packageLevelName = null;
                var packageTemplateName = null;
                
                var customrecord_r7_pck_licenseSearchObj = search.create({
                    type: "customrecord_r7_pck_license",
                    filters: [
                        ["internalid", "anyof", packageLicenseRecordId],
                        "AND",
                        ["systemnotes.field","anyof","CUSTRECORD_R7_PL_CURRENT_LEVEL","CUSTRECORD_R7_PL_PACKAGE_TEMPLATE"],
                        "AND",
                        ["custrecord_r7_pl_level_update", "is", "T"],
                        "AND",
                        ["systemnotes.oldvalue", "isnotempty", ""]
                    ],
                    columns: [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC
                        }),
                        "scriptid",
                        "custrecord_r7_pl_package_id",
                        "custrecord_r7_pl_package_template",
                        "custrecord_r7_pl_item",
                        "custrecord_r7_pl_inbound_events",
                        "custrecord_r7_pl_current_collection",
                        "custrecord_r7_pl_current_level",
                        search.createColumn({
                            name: "field",
                            join: "systemNotes"
                        }),
                        search.createColumn({
                            name: "oldvalue",
                            join: "systemNotes"
                        }),
                        search.createColumn({
                            name: "newvalue",
                            join: "systemNotes"
                        })
                    ]
                });
                customrecord_r7_pck_licenseSearchObj.run().each(function (result) {
                    //if field is current level, then compare & return level
                    var resultField = result.getText({
                        name: "field",
                        join: "systemNotes"
                    });
                    if(resultField == "Current Level"){
                        var resultLevel = result.getValue({
                            name: "newvalue",
                            join: "systemNotes"
                        });
                        var resultOldLevel = result.getValue({
                            name: "oldvalue",
                            join: "systemNotes"
                        });
                        if (resultLevel == currentLevel && resultOldLevel != currentLevel) {
                            //return resultOldLevel as level to be included in fulfillment
                            //get internal ID of old Package Level by text
                            packageLevelName = resultOldLevel;
                        }
                    }
                    else if(resultField == "Package Template"){
                        var resultPkgTemp = result.getValue({
                            name: "newvalue",
                            join: "systemNotes"
                        });
                        var resultOldPkgTemp = result.getValue({
                            name: "oldvalue",
                            join: "systemNotes"
                        });
                        if (resultPkgTemp == currentTemplate && resultOldPkgTemp != currentTemplate) {
                            //in the case of a package upgrade from e.g. IDR-ADV to THRTCMPLT-ADV
                            //return resultOldLevel as level to be included in fulfillment
                            //get internal ID of old Package Level by text
                            
                            packageTemplateName = resultOldPkgTemp;
                        }
                    }
                    
                    return true;
                });
                var packageLevels = getAllPackageLevels();
                for(var i = 0; i < packageLevels.length; i++){
                    var levelObj = packageLevels[i];
                    if(packageLevelName == levelObj.name){
                        packageLevel = levelObj.id;
                    }
                }
                packageIdentifier = packageLicenseLookup.getLookupValue('custrecord_r7_pl_package_id');
                
                packageLevelLookup = search.lookupFields({
                    type: 'customrecord_r7_pck_level',
                    id: packageLevel,
                    columns: ['custrecord_r7_pl_code']
                });
                packageLevelLookup.getLookupValue = getLookupValue;
                // example: IDR-PACKAGE-SUB => IDR-ULT-SUB
                //check to see if packageTemplateName is present from search
                //if not, use current template. This will happen when it is an upgrade
                //within the same "Family", i.e. IDR ESS>ADV>ULT
                packageTemplateName = packageTemplateName ? packageTemplateName : currentTemplate;
                packageName = packageTemplateName.replace('PACKAGE', packageLevelLookup.getLookupValue('custrecord_r7_pl_code'));
            }
            else if(isRenewalEvent && !isRenewalLevelUpdate) {
                //if is renewal even trigger & level has not been updated,
                //2 possible routes;
                //  1: upgrade into package, no package info should be sent
                //  2: renewal of same package, current pacakge info should be sent
                //if package license is created within previous week, we can assume that this is an upgrade into a new package
                //if package license is created > 1 week ago, then assume existing package being renewed
                var customrecord_r7_pck_licenseSearchObj = search.create({
                    type: "customrecord_r7_pck_license",
                    filters: [
                        ["internalid", "anyof", packageLicenseRecordId],
                        "AND",
                        ["created", "within", "weeksago1"]
                    ],
                    columns: [
                        "internalid"
                    ]
                });
                var searchResultCount = customrecord_r7_pck_licenseSearchObj.runPaged().count;
                log.debug("customrecord_r7_pck_licenseSearchObj result count", searchResultCount);
                if (searchResultCount > 0) {
                    //package license created within last week
                    // return no package information
                    return null;
                } else {
                    //return normal package info
                    packageIdentifier = packageLicenseLookup.getLookupValue('custrecord_r7_pl_package_id');
                    packageLevel = packageLicenseLookup.getLookupValue('custrecord_r7_pl_current_level');
                    packageLevelLookup = search.lookupFields({
                        type: 'customrecord_r7_pck_level',
                        id: packageLevel,
                        columns: ['custrecord_r7_pl_code']
                    });
                    packageLevelLookup.getLookupValue = getLookupValue;
                    // example: IDR-PACKAGE-SUB => IDR-ULT-SUB
                    packageName = packageLicenseLookup.getLookupValue('custrecord_r7_pl_package_template', true).replace('PACKAGE', packageLevelLookup.getLookupValue('custrecord_r7_pl_code'));
                }
            }
            else{
                packageIdentifier = packageLicenseLookup.getLookupValue('custrecord_r7_pl_package_id');
                packageLevel = packageLicenseLookup.getLookupValue('custrecord_r7_pl_current_level');
                packageLevelLookup = search.lookupFields({
                    type: 'customrecord_r7_pck_level',
                    id: packageLevel,
                    columns: ['custrecord_r7_pl_code']
                });
                packageLevelLookup.getLookupValue = getLookupValue;
                // example: IDR-PACKAGE-SUB => IDR-ULT-SUB
                packageName = packageLicenseLookup.getLookupValue('custrecord_r7_pl_package_template', true).replace('PACKAGE', packageLevelLookup.getLookupValue('custrecord_r7_pl_code'));
            }
            var oldPricePackageNames = ["RSK-RSKCMPLT", "CRC--ESS", "CRC--ADV", "MTC--ULT"];
            if(oldPricePackageNames.indexOf(packageName) >=0) {
                switch (packageName) {
                    case "CRC--ESS" :
                        packageName = "CRC-ESS-SUB";
                        break;
                    case "CRC--ADV":
                    case "RSK-RSKCMPLT" :
                        packageName = "CRC-ADV-SUB";
                        break;
                    case "MTC--ULT" :
                        packageName = "MTC-ULT-SUB";
                        break;
                }
            }
            return {
                packageId: packageIdentifier,
                packageName: packageName
            }
        } else if (getFulfilAsPackageId && getFulfilAsPackageId != '') {
            var packageName = itemName.split('-').length > 1 ? itemName : itemName + '-SUB';
            return {
                packageId: getFulfilAsPackageId,
                packageName: packageName
            }
        } else {
            return null;
        }
    }

    function getAllPackageLevels() {
        var packageLevels = [];
        var packageLevelSearch = search.create({
            type: 'customrecord_r7_pck_level',
            filters: [],
            columns: ['internalid', 'name', 'custrecord_r7_pl_code'],
        });
        packageLevelSearch.run().each(function (result) {
            var packageLevel = {
                id: result.getValue({ name: 'internalid' }),
                name: result.getValue({ name: 'name' }),
                levelSuffix: '-' + result.getValue({ name: 'custrecord_r7_pl_code' }) + '-',
                levelCode: result.getValue({ name: 'custrecord_r7_pl_code' }),
            };
            packageLevels.push(packageLevel);
            return true;
        });
        return packageLevels;
    }

    return {
        execute: execute,
        buildLicensingEventPayload: buildLicensingEventPayload,
        checkNexposeReady: checkNexposeReady,
        checkInsightReady: checkInsightReady,
        checkMetasploitReady: checkMetasploitReady,
        getNexposeProductPayload: getNexposeProductPayload,
        getInsightProductPayload: getInsightProductPayload,
        getMetasploitProductPayload: getMetasploitProductPayload,
    };
})
