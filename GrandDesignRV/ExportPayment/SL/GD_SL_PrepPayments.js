/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/task', 'N/ui/serverWidget', 'N/redirect', 'N/runtime', '../lib/GD_LIB_ExportData', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{task} task
     * @param{serverWidget} serverWidget
     * @param{redirect} redirect
     * @param{runtime} runtime
     * @param{ExportData} ExportData
     * @param SSLib_Task
     */
    (record, search, task, serverWidget, redirect, runtime, ExportData, SSLib_Task) => {

        const getMaxTranId = (isDealerRefund) => {
            const tranType = isDealerRefund ? 'CustRfnd' : 'VendPymt';
            const filters = [
                ["type","anyof","VendPymt","CustRfnd"],
                "AND",
                ["mainline","is","T"],
                "AND",
                ["numbertext","isnot","To Print"],
                "AND",
                ["datecreated","within","thisyear"]
            ];
            if(!isDealerRefund) {
                filters.push("AND");
                filters.push(["numbertext","isnotempty",""]);
            }
            const searchObj = search.create({
                type: 'transaction',
                filters: filters,
                columns:
                    [
                        search.createColumn({
                            name: "formulanumeric",
                            summary: "MAX",
                            formula: "TO_NUMBER({number})",
                            label: "Formula (Numeric)"
                        })
                    ]
            });
            let maxTranId = 0;
            searchObj.run().each(function(result){
                maxTranId = result.getValue(result.columns[0]);
                return false;
            });
            return Number(maxTranId);
        }
        const getMapReduceStatus = (taskId, stageForTotal) => {
            if (taskId) {
                // get the status of the running script
                let total = 1;
                let pending = 1;
                let percentageCompleted;
                const taskStatus = task.checkStatus(taskId);
                if (taskStatus.stage === 'GET_INFO') {
                    total = 1;
                    pending = 1;
                } else {
                    switch (taskStatus.stage) {
                        case 'MAP' :
                            total = taskStatus.getTotalMapCount();
                            pending = taskStatus.getPendingMapCount();
                            percentageCompleted = taskStatus.getPercentageCompleted();
                            break;
                        case 'REDUCE':
                            total = taskStatus.getTotalReduceCount();
                            pending = taskStatus.getPendingReduceCount();
                            percentageCompleted = taskStatus.getPercentageCompleted();
                            break;
                        case 'SUMMARIZE':
                            total = taskStatus.getTotalOutputCount();
                            pending = 0;
                            percentageCompleted = taskStatus.getPercentageCompleted();
                            if (stageForTotal) {
                                if (stageForTotal === 'MAP') {
                                    total = taskStatus.getTotalMapCount();
                                    percentageCompleted = taskStatus.getPercentageCompleted();
                                } else {
                                    total = taskStatus.getTotalReduceCount();
                                    percentageCompleted = taskStatus.getPercentageCompleted();
                                }
                            }
                            break;
                    }
                }
                const processed = total - pending;

                const status = {
                    taskId: taskId,
                    stage: taskStatus.stage,
                    status: taskStatus.status,
                    totalCount: total,
                    pendingCount: pending,
                    processed: processed,
                    percentComplete: ((processed / total) * 100).toFixed(2),
                    percentageCompleted: percentageCompleted
                };
                //log.audit('Status', status);
                return status;
            }
            return null;
        }
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {
                if (scriptContext.request.parameters.taskId) {
                    scriptContext.response.setHeader('Content-Type', 'application/json');
                    const mrStatus = getMapReduceStatus(scriptContext.request.parameters.taskId, 'MAP');
                    log.debug('STATUS', mrStatus);
                    return scriptContext.response.write(JSON.stringify(mrStatus));
                }

                let exportData = new ExportData();
                let paymentData;
                const isDealerRefund = runtime.getCurrentScript().getParameter({name: 'custscript_gd_sl_is_dealer_refund_prep'});
                paymentData = isDealerRefund ? exportData.getDealerRefundData(false) : exportData.getVendorPaymentData(false);

                const form = serverWidget.createForm({title: isDealerRefund ? 'Dealer Refund Export Prep' : 'Vendor Payment Export Prep'});
                form.clientScriptModulePath = 'SuiteScripts/ExportPayment/lib/GD_CS_PrepPayments.js';
                const fieldgroup1 = form.addFieldGroup({
                    id: 'fieldgroupcheck',
                    label: 'Check Numbers'
                });
                const processType = form.addField({
                    id: 'custpage_process_type',
                    label: 'Process Type',
                    type: serverWidget.FieldType.TEXT,
                    container: 'fieldgroupcheck'
                });
                processType.defaultValue = isDealerRefund;
                processType.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
                const checkNumField = form.addField({
                    id: 'custpage_checknumber',
                    label: 'Starting Check #',
                    type: serverWidget.FieldType.INTEGER,
                    container: 'fieldgroupcheck'
                });
                checkNumField.isMandatory = true;
                checkNumField.defaultValue = getMaxTranId(isDealerRefund) + 1;
                const checkEndField = form.addField({
                    id: 'custpage_checkend',
                    label: 'Ending Check #',
                    type: serverWidget.FieldType.INTEGER,
                    container: 'fieldgroupcheck'
                });
                checkEndField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
                checkEndField.isReadOnly = true;
                const fieldgroup2 = form.addFieldGroup({
                    id: 'fieldgroupcount',
                    label: 'Counts'
                });
                // Total Count Field
                const totalCountField = form.addField({
                    id: 'custpage_totalcount',
                    label: 'Payment Count',
                    type: serverWidget.FieldType.INTEGER,
                    container: 'fieldgroupcount'
                });
                totalCountField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
                totalCountField.defaultValue = paymentData.records.length;
                totalCountField.isReadOnly = true;
                // Current Selected Count Field
                const selectedCountField = form.addField({
                    id: 'custpage_selectedcount',
                    label: 'Selected Count',
                    type: serverWidget.FieldType.INTEGER,
                    container: 'fieldgroupcount'
                });
                selectedCountField.isReadOnly = true;
                selectedCountField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

                const sublist = form.addSublist({
                    id: 'custpage_batchprint',
                    label: 'Batch Process',
                    type: serverWidget.SublistType.LIST
                });
                sublist.addMarkAllButtons();
                const idField = sublist.addField({id: 'custpage_paymentid', label: 'internal ID', type: serverWidget.FieldType.TEXT});
                idField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
                sublist.addField({id: 'custpage_subprint', label: 'Process', type: serverWidget.FieldType.CHECKBOX}).defaultValue = 'F';
                sublist.addField({id: 'custpage_vendor', label: isDealerRefund ? 'Dealer' : 'Vendor', type: serverWidget.FieldType.TEXT});
                sublist.addField({id: 'custpage_tranid', label: 'Document #', type: serverWidget.FieldType.TEXT});
                sublist.addField({id: 'custpage_date', label: 'Date', type: serverWidget.FieldType.TEXT});
                sublist.addField({id: 'custpage_amount', label: 'Amount', type: serverWidget.FieldType.CURRENCY});
                for (let i = 0; i < paymentData.records.length; i++) {
                    const record = paymentData.records[i];
                    //log.debug('onRequest', record);
                    sublist.setSublistValue({id: 'custpage_paymentid', line: i, value: record.internalId});
                    sublist.setSublistValue({id: 'custpage_vendor', line: i, value: isDealerRefund ? record.dealerName : record.vendorName});
                    sublist.setSublistValue({id: 'custpage_tranid', line: i, value: record.tranId});
                    sublist.setSublistValue({id: 'custpage_date', line: i, value: record.tranDate});
                    sublist.setSublistValue({id: 'custpage_amount', line: i, value: record.grossAmount});
                }
                const submitButton = form.addButton({
                    id: 'custpage_process_payments',
                    label: isDealerRefund ? 'Process Refunds' : 'Process Payments',
                    functionName: 'processPayments'
                });
                //submitButton.isDisabled = true;
                form.addResetButton({
                    label: 'Reset'
                });
                scriptContext.response.writePage(form);
            } else {
                // POST
                const paymentInfo = JSON.parse(scriptContext.request.body);
                log.debug('paymentInfo', paymentInfo);
                const startingCheckNumber = paymentInfo.startingCheckNo;
                const paymentsToProcess = paymentInfo.paymentsToProcess;

                /*log.debug('onRequest', 'paymentCount: ' + paymentCount + ' startingCheckNumber: ' + startingCheckNumber)
                for(let i = 0; i < paymentCount; i++) {
                    const shouldProcess = scriptContext.request.getSublistValue({group: 'custpage_batchprint', name: 'custpage_subprint', line: i}) === 'T'; 
                    if (shouldProcess){
                        paymentsToProcess.push({
                            internalId: scriptContext.request.getSublistValue({group: 'custpage_batchprint', name: 'custpage_paymentid', line: i})
                        });
                    }
                }*/
                log.debug('paymentsToProcess', paymentsToProcess);
                if (paymentsToProcess.length) {
                    const isDealerRefund = runtime.getCurrentScript().getParameter({name: 'custscript_gd_sl_is_dealer_refund_prep'});
                    let batchPrintTask;
                    if(!isDealerRefund) {
                        batchPrintTask = SSLib_Task.startMapReduceScript('customscript_gd_mr_prep_payments', 'customdeploy_gd_mr_prep_payments', {
                            custscript_gd_paymentIds: JSON.stringify(paymentsToProcess),
                            custscript_gd_starting_check_no: startingCheckNumber,
                            custscript_gd_mr_is_dealer_refund_prep: false
                        });
                    } else {
                        //customdeploy_gd_mr_prep_payments_dr
                        batchPrintTask = SSLib_Task.startMapReduceScript('customscript_gd_mr_prep_payments', 'customdeploy_gd_mr_prep_payments_dr', {
                            custscript_gd_paymentIds: JSON.stringify(paymentsToProcess),
                            custscript_gd_starting_check_no: startingCheckNumber,
                            custscript_gd_mr_is_dealer_refund_prep: true
                        });
                    }
                    log.debug('batchPrintTask', batchPrintTask);
                    scriptContext.response.write({
                        output: JSON.stringify({taskId: batchPrintTask})
                    })
                    return;
                    /*redirect.toSuitelet({
                        scriptId: 'customscript_gd_sl_prep_payments',
                        deploymentId: 'customdeploy_gd_sl_prep_payments'
                    });*/
                }
            }
        }
        return {onRequest}

    });
