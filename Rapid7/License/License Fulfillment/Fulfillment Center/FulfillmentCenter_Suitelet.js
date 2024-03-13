/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NAMDConfig
 * @NScriptType Suitelet
 * Rapid 7
 * License/License Fulfillment/Fulfillment Center/FulfillmentCenter_Suitelet.js
 * @module
 * @description
 */
define(['N/ui/serverWidget', 'N/search', '/SuiteScripts/Toolbox/Check_Custom_Permissions_2.0'], (serverWidget, search, customPermissions) => {
    let START_DATE;

    /**
     * @function onRequest
     * @description description
     *
     * @public
     * @param  {Object} params description
     */
    function onRequest(scriptContext) {
        if (scriptContext.request.method === 'GET') {
            let form = serverWidget.createForm({
                title: 'One-Price Fulfillment Center - View = Last 7 days',
            });
            let hmtlField = form.addField({
                id: 'chartfield',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'html',
            });
            hmtlField.defaultValue =
                '<script>var tag = document.createElement("script");tag.src = "https://cdn.jsdelivr.net/npm/chart.js";document.getElementsByTagName("head")[0].appendChild(tag);</script>';

            form.clientScriptModulePath = 'SuiteScripts/License/License Fulfillment/Fulfillment Center/FulfillmentCenter_client.js';

            let chartField = form.addField({
                id: 'chartfield2',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'chart',
            });

            chartField.defaultValue = '<div><canvas id="itemFamilyChart"></canvas></div>';

            let chartField2 = form.addField({
                id: 'chartfield3',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'chart',
            });
            chartField2.layoutType = serverWidget.FieldLayoutType.NORMAL;
            chartField2.updateBreakType({
                breakType: serverWidget.FieldBreakType.STARTCOL,
            });

            chartField2.defaultValue = '<div"><canvas id="errorChart"></canvas></div>';

            let chartField3 = form.addField({
                id: 'chartfield4',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'chart',
            });

            chartField3.defaultValue = '<div"><canvas id="summaryChart"></canvas></div>';

            buildResultsTable(form);

            scriptContext.response.writePage(form);
        }
    }

    function buildResultsTable(form) {

        buildAffectedOrdersTab(form);

        var resultsTab = form.addTab({
            id: 'licensingeventtab',
            label: 'Licensing Events',
        });

        let sublist = form.addSublist({
            id: 'sublistevents',
            type: serverWidget.SublistType.EDITOR,
            label: 'Licensing Events',
            tab: 'licensingeventtab',
        });

        if(customPermissions.userHasPermission('edit_oneprice_licensing_event')) {
            const eventLink = sublist.addField({
                id: 'eventlink',
                type: serverWidget.FieldType.URL,
                label: 'Event',
            });
            eventLink.linkText = 'View Event';
        }
        sublist.addField({
            id: 'eventdate',
            type: serverWidget.FieldType.TEXT,
            label: 'License Event Date',
        });
        sublist.addField({
            id: 'tranid',
            type: serverWidget.FieldType.TEXT,
            label: 'Transaction ID',
        });
        sublist.addField({
            id: 'itemfamily',
            type: serverWidget.FieldType.TEXT,
            label: 'License ID',
        });
        sublist.addField({
            id: 'eventstatus',
            type: serverWidget.FieldType.TEXT,
            label: 'Event Status',
        });
        sublist.addField({
            id: 'errormessage',
            type: serverWidget.FieldType.TEXTAREA,
            label: 'Error',
        });
        const errorDescLink = sublist.addField({
            id: 'errordesclink',
            type: serverWidget.FieldType.TEXT,
            label: 'Error Description',
        });


        //populate page with chart data
        const dataField = form.addField({
            id: 'datafield',
            type: serverWidget.FieldType.LONGTEXT,
            label: 'data',
        });
        dataField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        dataField.defaultValue = JSON.stringify(getChartResults());

        const pieDataField = form.addField({
            id: 'piedatafield',
            type: serverWidget.FieldType.LONGTEXT,
            label: 'data',
        });
        pieDataField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        pieDataField.defaultValue = JSON.stringify(getSuccesResults());

        const errorDataField = form.addField({
            id: 'errordatafield',
            type: serverWidget.FieldType.LONGTEXT,
            label: 'data',
        });
        errorDataField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        errorDataField.defaultValue = JSON.stringify(getErrorResults());
    }

    function getColour(itemFamily) {
        const itemFamilyColours = {
            'Nexpose Subscription_1P': '#424E59',
            'One-MetasploitPro': '#8C545E',
            'One-InsightAppSec': '#F2D06B',
            'One-InsightVM': 'rgb(75, 192, 192)',
            'One-InsightConnect': '#D94A4A',
            'One-InsightIDR': '#049DD9',
        };

        return itemFamilyColours[itemFamily] || randomColourGenrator();
    }

    function buildAffectedOrdersTab(form) {
        var customrecord_onepricefulfillmentSearchObj = search.create({
            type: 'customrecord_onepricefulfillment',
            filters: [
                ['custrecordopflicensingevent.custrecordr7_licensing_event_status', 'anyof', '6', '5'],
                'AND',
                ['created', 'after', getStartingDate()],
                'AND',
                ['custrecordopfsalesorder.mainline', 'is', 'T'],
            ],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    join: 'CUSTRECORDOPFSALESORDER',
                    summary: 'GROUP',
                }),
                search.createColumn({
                    name: 'tranid',
                    join: 'CUSTRECORDOPFSALESORDER',
                    summary: 'GROUP',
                }),
                search.createColumn({
                    name: 'custrecordopffulfillmentstatus',
                    summary: 'GROUP',
                }),
                search.createColumn({
                    name: 'custrecordr7_licensing_event_status',
                    join: 'CUSTRECORDOPFLICENSINGEVENT',
                    summary: 'GROUP',
                }),
                search.createColumn({
                    name: 'formulatext',
                    summary: 'MAX',
                    formula: 'NS_CONCAT({custrecordopfinplicrec}) || NS_CONCAT({custrecordopfmetasploitlicrec}) || NS_CONCAT({custrecordopfnexposelicrec})',
                }),
                search.createColumn({
                    name: "internalid",
                    join: "CUSTRECORDOPFLICENSINGEVENT",
                    summary: "GROUP",
                    label: "Internal ID"
                })
            ],
        });
        var searchResultCount = customrecord_onepricefulfillmentSearchObj.runPaged().count;
        const columns = customrecord_onepricefulfillmentSearchObj.columns;
        form.addTab({
            id: 'orderstab',
            label: 'Affected Orders - <b><span style="color:#ff7700; font-size:16px;">' + searchResultCount + '</span></b>',
        });
        const ordersSublist = form.addSublist({
            id: 'subliste2vents',
            type: serverWidget.SublistType.STATICLIST,
            label: 'Orders',
            tab: 'orderstab',
        });

        const orderLink = ordersSublist.addField({
            id: 'salesorder',
            type: serverWidget.FieldType.TEXT,
            label: ' ',
        });
        //orderLink.linkText = 'View Order';

        ordersSublist.addField({
            id: 'docnumber',
            type: serverWidget.FieldType.TEXT,
            label: 'Sales Order',
        });
        ordersSublist.addField({
            id: 'licensingeventstatus',
            type: serverWidget.FieldType.TEXT,
            label: 'License Event Status',
        });
        ordersSublist.addField({
            id: 'affectedlicenses',
            type: serverWidget.FieldType.TEXT,
            label: 'Affected Licenses',
        });
        ordersSublist.addField({
            id: 'onepricefulfillmentstatus',
            type: serverWidget.FieldType.TEXT,
            label: 'OnePrice Fulfillment Status'
        });
        let counter = 0;
        const authorisedUser = customPermissions.userHasPermission('edit_oneprice_licensing_event');
        customrecord_onepricefulfillmentSearchObj.run().each(function (result) {
            let linkValue = '<a target="_blank" rel="noopener noreferrer" href="/app/accounting/transactions/salesord.nl?id=' + result.getValue(columns[0]) + '">View Order</a>';

            if(authorisedUser) {
                linkValue += '| <a target="_blank" rel="noopener noreferrer" href="/app/site/hosting/scriptlet.nl?script=2665&deploy=1&eventid=' + result.getValue(columns[5]) + '">View Event</a> '
            }
            ordersSublist.setSublistValue({
                id: 'salesorder',
                line: counter,
                value: linkValue
            });
            ordersSublist.setSublistValue({
                id: 'docnumber',
                line: counter,
                value: result.getValue(columns[1])
            });
            ordersSublist.setSublistValue({
                id: 'licensingeventstatus',
                line: counter,
                value: result.getText(columns[3])
            });
            ordersSublist.setSublistValue({
                id: 'affectedlicenses',
                line: counter,
                value: result.getValue(columns[4])
            });
            ordersSublist.setSublistValue({
                id: 'onepricefulfillmentstatus',
                line: counter,
                value: result.getText(columns[2])
            });

            counter++;
            return true;
        });
    }

    function randomColourGenrator() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    function getChartResults() {
        var customrecord_onepricefulfillmentSearchObj = search.create({
            type: 'customrecord_onepricefulfillment',
            filters: [
                ['created', 'after', getStartingDate()],
                'AND',
                ['custrecordopfsalesorder.mainline', 'is', 'T'],
                'AND',
                ['custrecordopflicensingevent.custrecordr7_exception_message', 'isnotempty', ''],
            ],
            columns: [
                search.createColumn({
                    name: 'formulatext',
                    summary: 'GROUP',
                    formula:
                        '{custrecordopfinplicrec.custrecordr7inplicenseitemfamily}||{custrecordopfmetasploitlicrec.custrecordr7mslicenseitemfamily}||{custrecordopfnexposelicrec.custrecordcustrecordr7nxlicenseitemfamil}',
                }),
                search.createColumn({
                    name: 'internalid',
                    summary: 'COUNT',
                }),
                search.createColumn({
                    name: 'formuladate',
                    summary: 'GROUP',
                    formula:
                        "CASE WHEN {created} is NULL THEN TO_DATE(TO_CHAR({custrecordopflicensingevent.created}, 'DD/MM/YYYY'), 'DD/MM/YYYY')  ELSE TO_DATE(TO_CHAR({created}, 'DD/MM/YYYY'), 'DD/MM/YYYY') END",
                    sort: search.Sort.ASC,
                }),
            ],
        });
        const data = {};
        const itemFamilies = [];
        const columns = customrecord_onepricefulfillmentSearchObj.columns;
        customrecord_onepricefulfillmentSearchObj.run().each(function (result) {
            const date = result.getValue(columns[2]);
            if (!data[date]) {
                data[date] = {};
            }
            const itemFamily = result.getValue(columns[0]);
            data[date][itemFamily] = result.getValue(columns[1]);

            if (itemFamilies.indexOf(itemFamily) === -1) {
                itemFamilies.push(itemFamily);
            }
            return true;
        });
        log.debug('data json', JSON.stringify(data));
        log.debug('itemFamilies', itemFamilies);

        const formattedData = {};
        const labels = [];

        for (let date in data) {
            labels.push(date);
            itemFamilies.forEach(function (itemFamily) {
                if (!formattedData[itemFamily]) {
                    formattedData[itemFamily] = {
                        label: itemFamily,
                        backgroundColor: getColour(itemFamily),
                        borderColor: getColour(itemFamily),
                        data: [],
                    };
                }
                formattedData[itemFamily].data.push(Number(data[date][itemFamily]) || 0);
            });
        }

        log.debug('formattedData', JSON.stringify(formattedData));
        return { formattedData, labels };
    }

    function getSuccesResults() {
        var customrecordr7_licencing_eventSearchObj = search.create({
            type: 'customrecordr7_licencing_event',
            filters: [['created', 'after', getStartingDate()], 'AND', ['custrecordr7_licensing_event_status', 'anyof', '3', '4', '6', '5']],
            columns: [
                search.createColumn({
                    name: 'custrecordr7_licensing_event_status',
                    summary: 'GROUP',
                }),
                search.createColumn({
                    name: 'internalid',
                    summary: 'COUNT',
                }),
            ],
        });
        const successIds = [3, 4];
        let success = 0;
        let failure = 0;
        const columns = customrecordr7_licencing_eventSearchObj.columns;
        customrecordr7_licencing_eventSearchObj.run().each(function (result) {
            log.debug('status' + result.getValue(columns[0]), 'count' + result.getValue(columns[1]));
            if (successIds.indexOf(Number(result.getValue(columns[0]))) !== -1) {
                success += Number(result.getValue(columns[1]));
            } else {
                failure += Number(result.getValue(columns[1]));
            }
            return true;
        });

        return [success, failure];
    }

    function getStartingDate() {
        if (!START_DATE) {
            let d = new Date();
            d.setDate(d.getDate() - 7);
            START_DATE = d.getMonth() + 1 + '/' + d.getDate() + '/' + d.getFullYear();
        }
        return START_DATE;
    }

    function getErrorResults() {
        var customrecordr7_licencing_eventSearchObj = search.create({
            type: 'customrecordr7_licencing_event',
            filters: [['created', 'after', getStartingDate()], 'AND', ['custrecordr7_exception_message', 'isnotempty', '']],
            columns: ['custrecordr7_exception_message'],
        });
        const errorMessages = {};
        const errorMessageData = getAllErrorDescriptions();
        customrecordr7_licencing_eventSearchObj.run().each(function (result) {
            const errorPayload = JSON.parse(result.getValue('custrecordr7_exception_message'));
            const errorObj = errorPayload.subscription.errorInformation;

            if (errorObj) {
                const errorData= matchErrorMessage(errorObj.errorDescription, errorMessageData);
                const cause = errorData ? errorData.cause : errorObj.errorDescription;
                if (!errorMessages[cause]) {
                    errorMessages[cause] = {
                        label: cause,
                        count: 0,
                        internalIds: [],
                    };
                }
                errorMessages[cause].internalIds.push(Number(result.id));
                errorMessages[cause].count += 1;
            }
            return true;
        });
        log.debug('errors', JSON.stringify(errorMessages));
        return errorMessages;
    }

    function matchErrorMessage(eventError, errorMessages) {
        log.debug('eventError', eventError);
        for(let i=0; i<errorMessages.length; i++) {
            const errorMessage = errorMessages[i];
            log.debug('regex', errorMessage.regex);
            if(eventError.match(errorMessage.regex)) {
                log.debug('match found', errorMessage.cause);
                return errorMessage;
            }
        };
    }

    function getAllErrorDescriptions() {
        var customrecord_platform_errors_helpSearchObj = search.create({
            type: "customrecord_platform_errors_help",
            filters:
                [
                    ["isinactive","is","F"]
                ],
            columns:
                [
                    search.createColumn({
                        name: "custrecord_platform_error_cause",
                        sort: search.Sort.ASC
                    }),
                    "custrecord_platform_error_description",
                    "custrecord_platform_error_next_steps",
                    "custrecord_platform_error_notes"
                ]
        });
        const columns = customrecord_platform_errors_helpSearchObj.columns;
        const errorData = [];
        customrecord_platform_errors_helpSearchObj.run().each(function(result){
            const cause = result.getValue(columns[0]);
            errorData.push({
                cause: cause,
                description: result.getValue(columns[1]),
                nextSteps: result.getValue(columns[2]),
                notes: result.getValue(columns[3]),
                regex: new RegExp(cause.replace(/{.*?}/g, '[a-zA-Z0-9].*'),"gi")
            })
            return true;
        });
        return errorData;
    }

    return /** @alias module: */ {
        onRequest: onRequest,
    };
});