/**
* @NApiVersion 2.x
* @NScriptType ClientScript
*/
define(['N/search', 'N/log'],
    function(search, log) {
        function pageInit(context) {
            var currentRecord = context.currentRecord;
            var projectId = currentRecord.id; // Unique ID of the project task
            var jobId = currentRecord.getValue({ fieldId: 'company' }); // Field ID for the job
            log.debug('Project Task Record ID', projectId);
            log.debug('Jobjaja ID', jobId);
            if (jobId) {
                // Step 1: Fetch the most recent invoice creation date for the job
                var recentInvoiceSearch = search.create({
                    type: "invoice",
                    filters: [
                        ["job.internalid", "anyof", jobId]
                    ],
                    columns: [
                        search.createColumn({
                            name: "trandate",
                            sort: search.Sort.DESC,
                            label: "Invoice Date"
                        }),
                        search.createColumn({
                            name: "tranid",
                          sort: search.Sort.DESC,
                            label: "Invoice Number"
                        })
                    ]
                });
                var recentInvoiceResult = recentInvoiceSearch.run().getRange({ start: 0, end: 1 });
                if (recentInvoiceResult.length === 0) {
                    log.error('No Invoices Found', 'No invoices found for project ID: ' + jobId);
                    return;
                }
                var recentInvoiceDate = recentInvoiceResult[0].getValue({ name: 'trandate' });
                var currentInvoiceID = recentInvoiceResult[0].getValue({ name: 'tranid' });
                log.debug('Most Recent Invoice Date', recentInvoiceDate);
                log.debug('Current Invoice Number', currentInvoiceID);

                if (recentInvoiceDate) {
                    // Step 2: Fetch amounts for invoices created before the most recent invoice
                    var chargeSearchObj = search.create({
                        type: "charge",
                        filters: [
                            ["custrecord_cp_project_task_billing.title", "isnotempty", ""],
                            "AND",
                            ["job.internalid", "anyof", jobId],
                            "AND",
                            ["invoice.tranid", "is", currentInvoiceID] // Filter invoices created before the most recent invoice
                        ],
                        columns: [
                            search.createColumn({
                                name: "custrecord_cp_project_task_billing",
                                summary: "GROUP",
                                label: "Project Task"
                            }),
                            search.createColumn({
                                name: "amount",
                                summary: "SUM",
                                label: "Amount"
                            }),
                            search.createColumn({
                                name: "invoicenum",
                                join: "invoice",
                                summary: "GROUP",
                                label: "Invoice Number"
                            })
                        ]
                    });
                    var amountMap = {};
                    chargeSearchObj.runPaged().pageRanges.forEach(function(pageRange) {
                        var page = chargeSearchObj.runPaged().fetch({ index: pageRange.index });
                        page.data.forEach(function(result) {
                            try {
                                var projectTask = result.getValue({ name: 'custrecord_cp_project_task_billing', summary: 'GROUP' });
                                var amount = result.getValue({ name: 'amount', summary: 'SUM' });
                                var invoiceNum = result.getValue({ name: 'invoicenum', summary: 'GROUP' });
                                log.debug('Invoice Number Retrieved in Charge Search', invoiceNum);
                                if (projectTask) {
                                    amount = parseFloat(amount) || 0;
                                    if (!amountMap[projectTask]) {
                                        amountMap[projectTask] = 0;
                                    }
                                    amountMap[projectTask] += amount;
                                }
                            } catch (e) {
                                log.error('Processing Error', 'Error processing result: ' + e.message);
                            }
                        });
                    });
                    // Compute and set the amount for the current project task
                    var currBillAmount = amountMap[projectId] || 0;
                    log.debug('Current Invoice Amount', 'Project Task ID: ' + projectId + ', Current Amount: ' + currBillAmount);
                    currentRecord.setValue({
                        fieldId: 'custevent_prev_bill_amount',
                        value: currBillAmount
                    });
                } else {
                    log.debug('Recent Invoice Date Missing', 'Could not determine the most recent invoice date.');
                }
            } else {
                log.debug('Job ID Missing', 'Job ID value is missing.');
            }
        }
        return {
            pageInit: pageInit
        };
    });