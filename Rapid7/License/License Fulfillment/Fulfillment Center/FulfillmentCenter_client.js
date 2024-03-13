/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 * @NAMDConfig
 * @NScriptType ClientScript
 * Rapid 7
 * License/License Fulfillment/Fulfillment Center/FulfillmentCenter_client.js
 * @module
 * @description
 */
define(['N/search', 'N/ui/dialog', '/SuiteScripts/License/License Fulfillment/Fulfillment Center/ErrorMatchingModule'], (search, dialog, errorMatching) => {

    const LICENSE_FAMILES = {
        "Nexpose Enterprise":1,
        "Nexpose Express Pro":2,
        "Nexpose Express":3,
        "Nexpose Community":4,
        "Metasploit Pro Machine":5,
        "Metasploit Pro User":6,
        "Metasploit Express":7,
        "Metasploit Community":8,
        "Nexpose Consultant":9,
        "Nexpose OEM":10,
        "Nexpose Cloud":11,
        "Nexpose MSSP":12,
        "Managed Service":13,
        "PSO/Consulting":14,
        "Training":15,
        "Other":16,
        "Mobilisafe":17,
        "Nexpose Express Perpetual":18,
        "ControlsInsight with Nexpose":19,
        "UserInsight":20,
        "Nexpose Ultimate":21,
        "Metasploit Component of Nexpose Ultimate":22,
        "ControlsInsight Component of Nexpose Ultimate":23,
        "Metasploit Express Perpetual":24,
        "AppSpider Pro":25,
        "AppSpider Enterprise":26,
        "AppSpider Express":27,
        "AppSpider Enterprise Term":28,
        "AppSpider Pro Term":29,
        "AppSpider OnDemand":30,
        "AppSpider Express Term":31,
        "Nexpose MVM":33,
        "Insight UBA":34,
        "Insight IDR":35,
        "Nexpose Enterprise Term":36,
        "InsightVM":37,
        "Metasploit Express Subscription":38,
        "Metasploit Pro Subscription":39,
        "InsightOps Enterprise":40,
        "InsightOps Standard":41,
        "InsightAppSec":42,
        "Managed Software":43,
        "InsightConnect":44,
        "TCell":45,
        "One-InsightVM":46,
        "One-InsightIDR":47,
        "One-InsightAppSec":48,
        "One-InsightConnect":49,
        "One-MetasploitPro":50,
        "SecOps Services":51,
        "Nexpose Subscription_1P":52
    };

    const errorDescriptions = {};
    const errorMessages = {};

    /**
     * @function pageInit
     * @description description
     *
     * @public
     * @param  {Object} context description
     */
    function pageInit(context) {
        jQuery(".inline_table_fields").hide();
        jQuery("#sublistevents_buttons").hide();

        const currentRecord = context.currentRecord;
        const dataField = JSON.parse(currentRecord.getValue('datafield'));
        const pieDataField = JSON.parse(currentRecord.getValue('piedatafield'));
        const errorData = JSON.parse(currentRecord.getValue('errordatafield'));


        const data = {
            labels: dataField.labels,
            datasets: Object.values(dataField.formattedData)
        };

        const myChart = new Chart(
            document.getElementById('itemFamilyChart'),
            {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Licensing Failures'
                            }
                        }
                    },
                    onClick(e) {
                        const activePoints = myChart.getElementsAtEventForMode(e, 'nearest', {
                            intersect: true
                        }, false);
                        const clickedData = [];
                        for(let activePoint of activePoints) {
                            clickedData.push({
                                label: data.datasets[activePoint.datasetIndex].label,
                                value: data.datasets[activePoint.datasetIndex].data[activePoint.index],
                                date: data.labels[activePoint.index]
                            });
                        }
                        myMethod(clickedData, currentRecord);
                        setTimeout(activateLinks, 200);
                        debugger;
                    }
                }
            }
        );

        const errorLabels = [];
        const errorChartData = [];
        for (const errorMessage in errorData) {
            errorLabels.push(errorData[errorMessage].label.replace(/{.*?}/g, 'X'));
            errorChartData.push(errorData[errorMessage].count);
        }

        const errorChart = new Chart(
            document.getElementById('errorChart'),
            {
                type: 'polarArea',
                data:  {
                    labels: errorLabels,
                    datasets: [{
                        label: 'Failure by error type',
                        data: errorChartData,
                        backgroundColor: [
                            'rgb(255, 99, 132)',
                            'rgb(75, 192, 192)',
                            'rgb(255, 205, 86)',
                            'rgb(84, 247, 212)',
                            'rgb(54, 162, 235)',
                            'rgb(247, 67, 179)',
                            'rgb(240, 161, 32)',
                            'rgb(153, 102, 255)',
                            'rgb(255, 159, 64)',
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    onClick(e) {
                        debugger;
                        const activePoints = errorChart.getElementsAtEventForMode(e, 'nearest', {
                            intersect: true
                        }, false);
                        const internalIds = errorData[Object.keys(errorData)[activePoints[0].index]].internalIds;
                        errorTypeResults(internalIds, currentRecord);
                        setTimeout(activateLinks, 200);
                    }
                }
            }
        );

        const summaryChart = new Chart(
            document.getElementById('summaryChart'),
            {
                type: 'doughnut',
                data: {
                    labels: [
                        'Success',
                        'Failures',
                    ],
                    datasets: [{
                        label: '',
                        data: pieDataField,
                        backgroundColor: [
                            'rgb(75, 192, 192)',
                            'rgb(255, 99, 132)'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    onClick(e) {
                        debugger;
                        const activePoints = summaryChart.getElementsAtEventForMode(e, 'nearest', {
                            intersect: true
                        }, false);

                        successResults(activePoints[0].index == 0, currentRecord);
                        setTimeout(activateLinks, 200);
                    }
                }
            });

    }

    function myMethod(data, currentRecord) {
        const itemFamily = [];
        data.forEach(function(dataPoint) {
            itemFamily.push(LICENSE_FAMILES[dataPoint.label])
        });
        if(itemFamily) {
            const date = data[0].date
            var customrecord_onepricefulfillmentSearchObj = search.create({
                type: "customrecord_onepricefulfillment",
                filters:
                    [
                        ["created","on", date],
                        "AND",
                        ["custrecordopfsalesorder.mainline","is","T"],
                        "AND",
                        ["custrecordopflicensingevent.custrecordr7_exception_message","isnotempty",""],
                        "AND",
                        [["custrecordopfinplicrec.custrecordr7inplicenseitemfamily","anyof",itemFamily],"OR",["custrecordopfmetasploitlicrec.custrecordr7mslicenseitemfamily","anyof",itemFamily],"OR",["custrecordopfnexposelicrec.custrecordcustrecordr7nxlicenseitemfamil","anyof",itemFamily]]

                    ],
                columns:
                    [
                        search.createColumn({
                            name: "tranid",
                            join: "CUSTRECORDOPFSALESORDER"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "{custrecordopfinplicrec}||{custrecordopfmetasploitlicrec}||{custrecordopfnexposelicrec}"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "{custrecordopfinplicrec.custrecordr7inplicenseitemfamily}||{custrecordopfmetasploitlicrec.custrecordr7mslicenseitemfamily}||{custrecordopfnexposelicrec.custrecordcustrecordr7nxlicenseitemfamil}"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN {custrecordopflicensingevent.custrecordr7_licensing_event_status} is NULL THEN {custrecordopffulfillmentstatus} ELSE {custrecordopflicensingevent.custrecordr7_licensing_event_status} END"
                        }),
                        search.createColumn({
                            name: "formuladatetime",
                            formula: "CASE WHEN {created} is NULL THEN {custrecordopflicensingevent.created} ELSE {created} END"
                        }),
                        search.createColumn({
                            name: "custrecordr7_exception_message",
                            join: "custrecordopflicensingevent"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "custrecordopflicensingevent"
                        })
                    ]
            });
            populateSubList(customrecord_onepricefulfillmentSearchObj, customrecord_onepricefulfillmentSearchObj.columns, currentRecord);
        }
    }

    function successResults(isSuccess, currentRecord) {
        let statuses = ['5', '6'];
        if(isSuccess) {
            statuses = ['3', '4'];
        }
        var customrecord_onepricefulfillmentSearchObj = search.create({
            type: "customrecord_onepricefulfillment",
            filters: [
                ["created","after","1/20/2022 11:59 pm"],
                "AND",
                ["custrecordopfsalesorder.mainline","is","T"],
                "AND",
                ["custrecordopflicensingevent.custrecordr7_licensing_event_status","anyof", statuses]
            ],
            columns:
                [
                    search.createColumn({
                        name: "tranid",
                        join: "CUSTRECORDOPFSALESORDER"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{custrecordopfinplicrec}||{custrecordopfmetasploitlicrec}||{custrecordopfnexposelicrec}"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{custrecordopfinplicrec.custrecordr7inplicenseitemfamily}||{custrecordopfmetasploitlicrec.custrecordr7mslicenseitemfamily}||{custrecordopfnexposelicrec.custrecordcustrecordr7nxlicenseitemfamil}"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "CASE WHEN {custrecordopflicensingevent.custrecordr7_licensing_event_status} is NULL THEN {custrecordopffulfillmentstatus} ELSE {custrecordopflicensingevent.custrecordr7_licensing_event_status} END"
                    }),
                    search.createColumn({
                        name: "formuladatetime",
                        formula: "CASE WHEN {created} is NULL THEN {custrecordopflicensingevent.created} ELSE {created} END"
                    }),
                    search.createColumn({
                        name: "custrecordr7_exception_message",
                        join: "custrecordopflicensingevent"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "custrecordopflicensingevent"
                    })
                ]
        });
        populateSubList(customrecord_onepricefulfillmentSearchObj, customrecord_onepricefulfillmentSearchObj.columns, currentRecord);
    }

    function errorTypeResults(internalIds, currentRecord) {
        var customrecord_onepricefulfillmentSearchObj = search.create({
            type: "customrecord_onepricefulfillment",
            filters: [
                ["custrecordopflicensingevent.internalid","anyof",internalIds],
                "AND",
                ["custrecordopfsalesorder.mainline","is","T"],
            ],
            columns:
                [
                    search.createColumn({
                        name: "tranid",
                        join: "CUSTRECORDOPFSALESORDER"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{custrecordopfinplicrec}||{custrecordopfmetasploitlicrec}||{custrecordopfnexposelicrec}"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{custrecordopfinplicrec.custrecordr7inplicenseitemfamily}||{custrecordopfmetasploitlicrec.custrecordr7mslicenseitemfamily}||{custrecordopfnexposelicrec.custrecordcustrecordr7nxlicenseitemfamil}"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "CASE WHEN {custrecordopflicensingevent.custrecordr7_licensing_event_status} is NULL THEN {custrecordopffulfillmentstatus} ELSE {custrecordopflicensingevent.custrecordr7_licensing_event_status} END"
                    }),
                    search.createColumn({
                        name: "formuladatetime",
                        formula: "CASE WHEN {created} is NULL THEN {custrecordopflicensingevent.created} ELSE {created} END"
                    }),
                    search.createColumn({
                        name: "custrecordr7_exception_message",
                        join: "custrecordopflicensingevent"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "custrecordopflicensingevent"
                    })
                ]
        });

        populateSubList(customrecord_onepricefulfillmentSearchObj, customrecord_onepricefulfillmentSearchObj.columns, currentRecord);
    }
    function clearSublist(currentRecord) {
        let numLines = currentRecord.getLineCount({
            sublistId: 'sublistevents'
        });
        while(numLines > 0) {
            currentRecord.removeLine({
                sublistId: 'sublistevents',
                line: 0,
                ignoreRecalc: true
            });
            numLines = currentRecord.getLineCount({
                sublistId: 'sublistevents'
            });
        }
    }

    function populateSubList(searchResultsObj, columns, currentRecord) {
        clearSublist(currentRecord);
        searchResultsObj.run().each(function(result){
            currentRecord.selectNewLine({
                sublistId: 'sublistevents'
            });
            currentRecord.setCurrentSublistValue({
                fieldId: 'eventdate',
                sublistId: 'sublistevents',
                value: result.getValue(columns[4])
            });
            currentRecord.setCurrentSublistValue({
                fieldId: 'tranid',
                sublistId: 'sublistevents',
                value: result.getValue(columns[0])
            });

            const itemFamily = result.getValue(columns[1]);
            currentRecord.setCurrentSublistValue({
                fieldId: 'itemfamily',
                sublistId: 'sublistevents',
                value: itemFamily
            });
            currentRecord.setCurrentSublistValue({
                fieldId: 'eventstatus',
                sublistId: 'sublistevents',
                value: result.getValue(columns[3])
            });

            const errorMessage = JSON.parse(result.getValue(columns[5])).subscription.errorInformation.errorDescription;
            currentRecord.setCurrentSublistValue({
                fieldId: 'errormessage',
                sublistId: 'sublistevents',
                value: errorMessage
            });

            errorMessages[result.getValue(columns[6])] = errorMessage;
            const errorDescription = errorMatching.matchErrorMessage(errorMessage);
            errorDescriptions[result.getValue(columns[6])] = errorDescription;
            currentRecord.setCurrentSublistValue({
                fieldId: 'errordesclink',
                sublistId: 'sublistevents',
                value: `${errorDescription ? errorDescription.description : ''}`
            });

            currentRecord.setCurrentSublistValue({
                fieldId: 'eventlink',
                sublistId: 'sublistevents',
                //value:' <a target="_blank" rel="noopener noreferrer" href="/app/site/hosting/scriptlet.nl?script=2665&deploy=1&eventid=' + result.getValue(columns[6]) + '">View Event</a>'
                value: `/app/site/hosting/scriptlet.nl?script=2665&deploy=1&eventid=${result.getValue(columns[6])}`
            });
            currentRecord.commitLine({
                sublistId: 'sublistevents'
            });
            return true;
        });
    }

    function activateLinks() {
        debugger;
        jQuery('#licensingeventtabtxt').click();
        let length = 1;
        let i=1;
        while(length > 0) {
            let results = jQuery('#sublistevents_row_'+i).find( ".listtext" );
            length = results.length;

            if(length == 0) {
                results = jQuery('#sublistevents_row_'+i).find( ".listtexthl" );
                length = results.length;
            }

            if(length > 0){
                const value = results.eq(0).text();
                results.eq(0).html('<a target="_blank" href="' + value + '">View Event</a>');
                jQuery('#sublistevents_row_'+i).click(function() {
                    activateLinks();
                    showErrorInfo(value.replace('/app/site/hosting/scriptlet.nl?script=2665&deploy=1&eventid=', ''));
                });
            }
            i+= 1;
        }
    }

    function showErrorInfo(eventId) {

        let message = `No information available on error, </br></br> <i>${errorMessages[eventId]}</i>`;

        if(errorDescriptions[eventId]) {
            const errorDescription = errorDescriptions[eventId];
            message = `<b>Error: </b><i>${errorMessages[eventId]}</i></br></br><b>Detail: </b>${errorDescription.description}</br></br><b>Next Steps:</b>${errorDescription.nextSteps}`;
        }

        let options = {
            title: 'Error Details',
            message
        };

        function success(result) {
            console.log('Success with value ' + result);
        }

        function failure(reason) {
            console.log('Failure: ' + reason);
        }

        dialog.alert(options).then(success).catch(failure);
    }

    return /** @alias module: */ {
        pageInit: pageInit,
        showErrorInfo: showErrorInfo
    };
});