/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 * @module 
 * @description 
 */
define(['N/record', 'N/format', 'N/search'], function (record, format, search) {

    function getInputData(inputContext) {
        log.debug("Getting Input Data");
        try {
            return search.load({
                id: 'customsearch_script_inp_autoprov_enhance'
            });
        } catch (e) {
            log.error({
                title: 'getInputData e',
                details: JSON.stringify(e)
            });
        }
    }

    function map(mapContext) {
        try {
            let resultValues = JSON.parse(mapContext.value).values;
            log.debug("Result Values", JSON.stringify(resultValues));
            let insightPlatObj = {};

            // Get Header Information
            insightPlatObj.salesOrder = {};
            insightPlatObj.salesOrder.id = resultValues['MAX(internalid.CUSTRECORDR7INPLICENSESALESORDER)']; //result.getValue({ name: 'internalid', join: 'CUSTRECORDR7INPLICENSESALESORDER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.salesOrderNumber = resultValues['MAX(custrecordr7inplicensesalesorder)']; //result.getValue({ name: 'custrecordr7inplicensesalesorder', summary: search.Summary.MAX }).replace(/Sales Order #/g, '');
            insightPlatObj.salesOrder.product = [];
            insightPlatObj.salesOrder.customer = {};
            insightPlatObj.salesOrder.customer.id = resultValues['MAX(internalid.CUSTRECORDR7INPLICENSECUSTOMER)']; //result.getValue({ name: 'internalid', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.name = resultValues['MAX(entityid.CUSTRECORDR7INPLICENSECUSTOMER)']; //result.getValue({ name: 'entityid', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.contactNumber = resultValues['MAX(phone.CUSTRECORDR7INPLICENSECUSTOMER)']; //result.getValue({ name: 'phone', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.hostingRegion = resultValues['MAX(custentityr7region.CUSTRECORDR7INPLICENSECUSTOMER)']; //result.getValue({ name: 'custentityr7region', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.countryCode = resultValues['MAX(shipcountrycode.CUSTRECORDR7INPLICENSECUSTOMER)']; //result.getValue({ name: 'shipcountrycode', join: 'CUSTRECORDR7INPLICENSECUSTOMER', summary: search.Summary.MAX });
            insightPlatObj.salesOrder.customer.customerId = '';
            insightPlatObj.salesOrder.customer.orgId = '';

            // Get Product Information
            let product = {};
            let productFamilyMap = {
                'Insight UBA': 'InsightUBA',
                'Insight IDR': 'InsightIDR',
                InsightOps: 'InsightOps',
                InsightAppSec: 'InsightAppSec',
                InsightConnect: 'InsightConnect',
                TCell: 'TCell'
            };

            // product.managed = false;
            product.managed = resultValues['MAX(custrecordcustrecordr7inpismanaged)'] == "T";
            product.productFamily = productFamilyMap[resultValues['MAX(custrecordr7inplicenseordertype)']];
            product.expirationDate = format.parse(resultValues['MAX(custrecordr7inplicenseexpirationdate)'], format.Type.DATE).getTime();
            product.licensedAssets = resultValues['MAX(custrecordr7inplicenselicensedassets)'];
            product.monthlyDataLimit = resultValues['MAX(custrecordr7inplicensemonthlydatalimit)'];
            product.numberOfScans = resultValues['MAX(custrecordr7inplicensenumberofscans)'];
            product.numberofApplications = resultValues['MAX(custrecordr7inplicensenumberofapps)'];
            product.totalDataRetentionDays = resultValues['MAX(custrecordr7inptotaldataretention)'];
            product.id = resultValues['MAX(name)'];
            product.numberOfWorkflow = resultValues['MAX(custrecordr7inplicensenumofworkflows)'];
            product.enhancedNetworkTrafficMonitoring = resultValues['MAX(custrecordr7inpnetfort)'] == "T";
            product.mngav = resultValues['MAX(custrecord_r7_mngav)'] == "T";
            product.enhancedEndpointTelemetry = resultValues['MAX(custrecordr7inptelemetry)'] == "T";
            product.licenseContact = {};
            product.licenseContact.id = resultValues['MAX(internalid.CUSTRECORDR7INPLICENSECONTACT)'];
            //if no first name - use last name
            product.licenseContact.firstName = resultValues['MAX(firstname.CUSTRECORDR7INPLICENSECONTACT)'] ?? '-';
            //if no last name - use first name
            product.licenseContact.lastName = resultValues['MAX(lastname.CUSTRECORDR7INPLICENSECONTACT)'] ?? '-';
            product.licenseContact.email = resultValues['MAX(email.CUSTRECORDR7INPLICENSECONTACT)'];
            let dataRetentionDaysVal = resultValues['MAX(custrecordr7inplicensedataretentiondays)'];
            product.dataRetentionDays = dataRetentionDaysVal || null;
            //Data Center Location
            let datacenterlocationfromlicense = resultValues['MAX(custrecordr7inplicensedatacenterlocation)'];
            //Use License Field Value If Present, else default to search result value
            const datacenterMap = {
                'United States': 'us',
                'Europe': 'eu',
                'Australia': 'au',
                'Canada': 'ca',
                'Asia Pacific (Japan)': 'ap'
            };
            product.datacenterLocation = datacenterMap[datacenterlocationfromlicense] || resultValues['MAX(formulatext)'];

            insightPlatObj.salesOrder.product.push(product);

            log.debug('created JSON', insightPlatObj);
            //create InsightPlatform Outbound Event record
            if (insightPlatObj && insightPlatObj.salesOrder.id) {
                let insightPlatEventObj = record.create({
                    type: 'customrecordr7_insight_platform_outbound'
                });
                insightPlatEventObj.setValue({
                    fieldId: 'name',
                    value: 'insightPlatObj for ' + insightPlatObj.salesOrder.id
                });
                insightPlatEventObj.setValue({
                    fieldId: 'custrecordr7_insight_body',
                    value: JSON.stringify(insightPlatObj)
                });
                insightPlatEventObj.setValue({
                    fieldId: 'custrecordr7_insight_publishing_status',
                    value: 'Pending'
                });
                let objId = insightPlatEventObj.save();
                log.audit('Created OE Record', objId);
                if (objId) {
                    record.submitFields({
                        type: record.Type.SALES_ORDER,
                        id: resultValues['MAX(internalid.CUSTRECORDR7INPLICENSESALESORDER)'],
                        values: {
                            custbodyr7_insight_out_event_created: true
                        }
                    });
                    log.audit('Updated Sales Order OE Created Checkbox', 'SO Internal ID: ' + resultValues['MAX(internalid.CUSTRECORDR7INPLICENSESALESORDER)']);
                }
            }
        } catch (e) {
            log.error({
                title: 'map e',
                details: JSON.stringify(e)
            });
        }

    }

    function summarize(summaryContext) {
        try {
            log.audit({
                title: 'summary',
                details: JSON.stringify(summaryContext),
            });
        } catch (e) {
            log.error({
                title: 'error occured on summarize stage',
                details: e
            });
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});