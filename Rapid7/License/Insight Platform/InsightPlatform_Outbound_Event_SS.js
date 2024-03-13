/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record', 'N/format', 'N/search', 'N/runtime', 'N/task'], function (error, record, format, search, runtime, task) {
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
        var soSearchId = runtime.getCurrentScript().getParameter('custscript_sosearchid');
        var soSearchResults = search
            .load({
                id: soSearchId
            })
            .run();
        var step = 50;
        var searchId = 0;
        var resultSlice;
        do {
            resultSlice = soSearchResults.getRange({
                start: searchId,
                end: searchId + step
            });
            log.debug('starting new loop, number of results ', resultSlice.length);
            searchId = searchId + step;
            if (resultSlice && resultSlice.length > 0) {
                for (var i = 0; i < resultSlice.length; i++) {
                    try {
                        var processedOrder = processPlatformRecord(resultSlice[i].id);
                        if (processedOrder) {
                            record.submitFields({
                                type: record.Type.SALES_ORDER,
                                id: resultSlice[i].id,
                                values: { custbodyr7_insight_out_event_created: true }
                            });
                        }
                    } catch (ex) {
                        log.error('ERROR_IN_EXECUTE', ex);
                    }
                }
            }
        } while (!unitsLeft(runtime) && resultSlice.length > 0);
        log.audit('ended loop check for units');
        if (unitsLeft(runtime)) {
            restartScript(runtime.getCurrentScript().id, runtime.getCurrentScript().deploymentId);
        }
    }

    function restartScript(scriptId, deploymentId) {
        log.debug('Rescheduling script');
        var scheduleScriptTaskObj = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: scriptId,
            deploymentId: deploymentId,
        })
        var taskSubmitId = scheduleScriptTaskObj.submit();
        log.debug('New task is submitted.', taskSubmitId)
    };

    function processPlatformRecord(soId) {
        var insightPlatSearch = search.load({ id: runtime.getCurrentScript().getParameter({ name: 'custscriptr7_inplat_search' }) });
        var tranSearch = search.load({ id: runtime.getCurrentScript().getParameter({ name: 'custscriptr7_transact_search' }) });
        updateSearch(soId, insightPlatSearch, 'INP');
        updateSearch(soId, tranSearch, 'SO');
        //log.debug('insightPlatSearch', insightPlatSearch.columns);
        log.debug('processing sales order', soId);
        var insightPlatObj = {};
        var orderFound = false;
        // TODO
        insightPlatSearch.run().each(function (result) {

            log.debug('Check enter', 'License records not ready for processing'+result.id);
            log.debug('Check enter result for license: '+result.id, result.getValue({ name: 'formulanumeric', summary: search.Summary.MAX }))
            // https://issues.corp.rapid7.com/browse/APPS-10222
            // check if all of the resulted License records are ready to be processed
            if (result.getValue({ name: 'formulanumeric', summary: search.Summary.MAX }) != 1) {
                // throw error (not all records are processed yet)
                log.debug('License records not ready for processing', 'yep')
                throw error.create({
                    name: 'LICENCE_RECORDS_NOT_READY',
                    message: 'License '+result.id+' records are not ready for processing yet, because not all of FMRs are processed on the license',
                    notifyOff: false
                })
            }
            return true
        });
        //first loop for header (does not return bool, so runs 1 time)
        insightPlatSearch.run().each(function (result) {
            orderFound = true;
            insightPlatObj.salesOrder = {};
            insightPlatObj.salesOrder.id = result.getValue({ name: 'internalid', join: 'CUSTRECORDR7INPLICENSESALESORDER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.salesOrderNumber = result.getValue({ name: 'custrecordr7inplicensesalesorder', summary: search.Summary.MAX }).replace(/Sales Order #/g, '');
            insightPlatObj.salesOrder.product = [];
            insightPlatObj.salesOrder.customer = {};
            insightPlatObj.salesOrder.customer.id = result.getValue({ name: 'internalid', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.name = result.getValue({ name: 'entityid', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.contactNumber = result.getValue({ name: 'phone', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.hostingRegion = result.getValue({ name: 'custentityr7region', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.countryCode = result.getValue({ name: 'shipcountrycode', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.customerId = '';
            insightPlatObj.salesOrder.customer.orgId = '';
        });
        //if search does not return any results for the order, we should not process it
        if (!orderFound) {
            log.debug('search did not return SO, skipping this SO', soId);
            return false;
        } else {
            //second loop to fill in products
            insightPlatSearch.run().each(function (result) {

                log.debug('second loop - result', JSON.stringify(result));

                var product = {};
                var productFamilyMap = {
                    'Insight UBA': 'InsightUBA',
                    'Insight IDR': 'InsightIDR',
                    InsightOps: 'InsightOps',
                    InsightAppSec: 'InsightAppSec',
                    InsightConnect: 'InsightConnect',
                    TCell: 'TCell'
                };

                // product.managed = false;
                product.managed = result.getValue({ name: 'custrecordcustrecordr7inpismanaged', summary: search.Summary.MAX });
                product.productFamily = productFamilyMap[result.getValue({ name: 'custrecordr7inplicenseordertype', summary: search.Summary.MAX })];
                product.expirationDate = format.parse(result.getValue({ name: 'custrecordr7inplicenseexpirationdate', summary: search.Summary.MAX }), format.Type.DATE).getTime();
                product.licensedAssets = result.getValue({ name: 'custrecordr7inplicenselicensedassets', summary: search.Summary.MAX });
                product.monthlyDataLimit = result.getValue({ name: 'custrecordr7inplicensemonthlydatalimit', summary: search.Summary.MAX });
                product.numberOfScans = result.getValue({ name: 'custrecordr7inplicensenumberofscans', summary: search.Summary.MAX });
                product.numberofApplications = result.getValue({ name: 'custrecordr7inplicensenumberofapps', summary: search.Summary.MAX });
                product.totalDataRetentionDays = result.getValue({ name: 'custrecordr7inptotaldataretention', summary: search.Summary.MAX });
                product.id = result.getValue({ name: 'name', summary: search.Summary.MAX });
                product.numberOfWorkflow = result.getValue({ name: 'custrecordr7inplicensenumofworkflows', summary: search.Summary.MAX });
                product.enhancedNetworkTrafficMonitoring = result.getValue({ name: 'custrecordr7inpnetfort', summary: search.Summary.MAX });
                product.mngav = result.getValue({ name: 'custrecord_r7_mngav', summary: search.Summary.MAX });
                product.enhancedEndpointTelemetry = result.getValue({name: 'custrecordr7inptelemetry', summary: search.Summary.MAX});
                product.licenseContact = {};
                product.licenseContact.id = result.getValue({ name: 'internalid', join: 'CUSTRECORDR7INPLICENSECONTACT', summary: search.Summary.MAX });
                //if no first name - use last name
                product.licenseContact.firstName = result.getValue({ name: 'firstname', join: 'CUSTRECORDR7INPLICENSECONTACT', summary: search.Summary.MAX })
                    ? result.getValue({ name: 'firstname', join: 'CUSTRECORDR7INPLICENSECONTACT', summary: search.Summary.MAX })
                    : '-';
                //if no last name - use first name
                product.licenseContact.lastName = result.getValue({ name: 'lastname', join: 'CUSTRECORDR7INPLICENSECONTACT', summary: search.Summary.MAX })
                    ? result.getValue({ name: 'lastname', join: 'CUSTRECORDR7INPLICENSECONTACT', summary: search.Summary.MAX })
                    : '-';
                product.licenseContact.email = result.getValue({ name: 'email', join: 'CUSTRECORDR7INPLICENSECONTACT', summary: search.Summary.MAX });
                var dataRetentionDaysVal = result.getValue({ name: 'custrecordr7inplicensedataretentiondays', summary: search.Summary.MAX });
                product.dataRetentionDays = dataRetentionDaysVal ? dataRetentionDaysVal : null;
                //Data Center Location
                var datacenterlocationfromlicense = result.getValue({ name: 'custrecordr7inplicensedatacenterlocation', summary: search.Summary.MAX });
                if (datacenterlocationfromlicense == '') { //Use Formula If Blank
                    product.datacenterLocation = result.getValue({ name: 'formulatext', summary: search.Summary.MAX });
                }
                else { //Use License Field Value If Present
                    switch (datacenterlocationfromlicense) {
                        case 'United States': product.datacenterLocation = 'us'; break;
                        case 'Europe': product.datacenterLocation = 'eu'; break;
                        case 'Australia': product.datacenterLocation = 'au'; break;
                        case 'Canada': product.datacenterLocation = 'ca'; break;
                        case 'Asia Pacific (Japan)': product.datacenterLocation = 'ap'; break;
                    }
                }

                insightPlatObj.salesOrder.product.push(product);

                return true;
            });

            log.debug('created JSON', insightPlatObj);
            if (insightPlatObj && insightPlatObj.salesOrder.id) {
                var insightPlatEventObj = record.create({
                    type: 'customrecordr7_insight_platform_outbound'
                });
                insightPlatEventObj.setValue({ fieldId: 'name', value: 'insightPlatObj for ' + insightPlatObj.salesOrder.id });
                insightPlatEventObj.setValue({ fieldId: 'custrecordr7_insight_body', value: JSON.stringify(insightPlatObj) });
                insightPlatEventObj.setValue({ fieldId: 'custrecordr7_insight_publishing_status', value: 'Pending' });
                var objId = insightPlatEventObj.save();
                log.debug('created record', objId);
            }
            return true;
        }
    }

    function updateSearch(soID, searchObj, object) {
        //based on object we decide what field to use as id in the search
        var name = object == 'INP' ? 'custrecordr7inplicensesalesorder' : 'internalid';
        var idFilter = search.createFilter({
            name: name,
            operator: search.Operator.IS,
            values: soID
        });
        searchObj.filters.push(idFilter);
    }

    function unitsLeft() {
        var unitsLeft = runtime.getCurrentScript().getRemainingUsage();
        if (unitsLeft <= 1500) {
            log.debug('Ran out of units', 'yup');
            return true;
        }
        return false;
    }

    return {
        execute: execute
    };
});
