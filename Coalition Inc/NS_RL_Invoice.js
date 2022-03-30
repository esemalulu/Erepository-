/**
 * Copyright (c) 1998-2020 NetSuite, Inc. 2955 Campus Drive, Suite 100,
 * San Mateo, CA, USA 94403-2511 All Rights Reserved.
 *
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 *
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(function (require) {
    //load modules
    var runtime = require("N/runtime");
    var record = require("N/record");
    var render = require("N/render");
    var error = require("N/error");

    //global variables
    var SCRIPT_LOGS = {};
    var SCRIPT_PARAMETERS = {};
    var SCRIPT_PARAMETER_NAMES = {
        transactionSavedSearch: { optional: false, id: "custscript_ir_ss_ir" },
        pdfInvoice: {
            optional: false,
            id: "custscript_ir_pdftemplate_invoice",
        },
        pdfCreditMemo: {
            optional: false,
            id: "custscript_ir_pdftemplate_creditmemo",
        },
    };

    function methodGet(requestBody) {
        var stLogTitle = "methodGet";

        try {
            SCRIPT_LOGS.start = "-- Start --";
            SCRIPT_LOGS.request_body = JSON.stringify(requestBody);

            if (
                NSUtil.isEmpty(requestBody.recid) ||
                NSUtil.isEmpty(requestBody.rectype)
            ) {
                throwErr(
                    "MISSING_PARAMETERS",
                    "rectype and recid are required"
                );
            }
            SCRIPT_PARAMETERS = NSUtil.getScriptParameters();
            var objData = {};
            objData.pdfContents = getPdf(requestBody);
            log.debug("Return Data", objData);
            return JSON.stringify(objData);
        } catch (ex) {
            log.error(stLogTitle, ex);
            throw ex;
        } finally {
            SCRIPT_LOGS.end = "-- End --";
            log.debug("Script Logs", SCRIPT_LOGS);
        }
    }

    function throwErr(stName, stMsg) {
        throw error.create({
            name: stName,
            message: stMsg,
            notifyOff: false,
        });
    }

    function getPdf(requestBody) {
        var stTemplateId = requestBody.templateScriptId || getDefaultTemplateId(requestBody)

        // get the pdf and grab the base64 string from file object
        var objRenderer = render.create();
        objRenderer.setTemplateByScriptId(stTemplateId);
        objRenderer.addRecord(
            "record",
            record.load({
                type: requestBody.rectype,
                id: requestBody.recid,
            })
        );
        var objFilePdf = objRenderer.renderAsPdf();
        var stBaseString = objFilePdf.getContents();
        log.debug("stBaseString", stBaseString);
        return stBaseString;
    }

    function getDefaultTemplateId(requestBody) {
        var stTemplateId = "";

        //get template id based on record type
        switch (requestBody.rectype) {
            case "policy":
            case "invoice":
                stTemplateId = SCRIPT_PARAMETERS.pdfInvoice;
                break;
            case "creditmemo":
                stTemplateId = SCRIPT_PARAMETERS.pdfCreditMemo;
                break;
            default:
                throwErr(
                    "INVALID_RECORD_TYPE",
                    "Record type: " + requestBody.rectype + " is invalid"
                );
                break;
        }

        return stTemplateId
    }

    /** ===========================
	 * Utility Functions
	=========================== */
    var NSUtil = {
        isEmpty: function (stValue) {
            if (stValue === "" || stValue == null || stValue == undefined) {
                return true;
            } else {
                if (stValue.constructor === Array) {
                    // Strict checking for this part
                    if (stValue.length == 0) {
                        return true;
                    }
                } else if (stValue.constructor === Object) {
                    // Strict checking for
                    // this part to properly
                    // evaluate constructor
                    // type.
                    for (var stKey in stValue) {
                        return false;
                    }
                    return true;
                }

                return false;
            }
        },
        forceFloat: function (stValue) {
            var flValue = parseFloat(stValue);

            if (
                isNaN(flValue) ||
                stValue == Infinity ||
                stValue == "Infinity"
            ) {
                return 0.0;
            }

            return flValue;
        },
        getScriptParameters: function () {
            var stLogTitle = "getScriptParameters";
            var parametersMap = {};
            if (typeof runtime == "undefined" || !runtime) {
                runtime = require("N/runtime");
            }
            if (typeof error == "undefined" || !error) {
                error = require("N/error");
            }
            var scriptContext = runtime.getCurrentScript();
            var obj;
            var value;
            var optional;
            var id;
            var arrMissingParams = [];

            for (var key in SCRIPT_PARAMETER_NAMES) {
                if (SCRIPT_PARAMETER_NAMES.hasOwnProperty(key)) {
                    obj = SCRIPT_PARAMETER_NAMES[key];
                    if (typeof obj === "string") {
                        value = scriptContext.getParameter(obj);
                    } else {
                        id = obj.id;
                        optional = obj.optional;
                        value = scriptContext.getParameter(id);
                    }
                    if (value || value === false || value === 0) {
                        parametersMap[key] = value;
                    } else if (!optional) {
                        arrMissingParams.push(key + "[" + id + "]");
                    }
                }
            }

            if (arrMissingParams && arrMissingParams.length) {
                var objError = {};
                objError.name = "Missing Script Parameter Values";
                objError.message =
                    "The following script parameters are empty: " +
                    arrMissingParams.join(", ");
                objError = error.create(objError);
                for (var key in parametersMap) {
                    if (parametersMap.hasOwnProperty(key)) {
                        objError[key] = parametersMap[key];
                    }
                }
                throw objError;
            }
            log.audit(stLogTitle, parametersMap);
            return parametersMap;
        },
    };

    return { get: methodGet };
});
