/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/file', 'N/runtime', 'N/redirect', 'N/task', 'N/url', 'N/ui/serverWidget', './GD_PDR_HelperChecks.js', './GD_PDR_HelperVouchers.js', '../2.x/GD_Constants.js', 'SuiteScripts/SSLib/2.x/SSLib_Task'],

function(search, record, file, runtime, redirect, task, url, serverWidget, checksHelper, vouchersHelper, GD_Constants, SSLib_Task) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        if (context.request.method == 'GET') {
            var form = serverWidget.createForm({title: 'Print Dealer Refunds'});
            if (context.request.parameters['custpage_step'] == '1' || !context.request.parameters['custpage_step']) {
                stepOne(form);
            } else if (context.request.parameters['custpage_step'] == '2') {
                stepTwo(context, form);
            } else if (context.request.parameters['custpage_step'] == '3') {
                stepThree(context, form);
            } else {
                pdfFile = stepFour(context);
                if (pdfFile != null){
                    context.response.writeFile(pdfFile);
                    return;
                } else {
                    form.addField({
                        id : 'custpage_error',
                        type : serverWidget.FieldType.INLINEHTML,
                        label : 'Error'
                    }).defaultValue = '<span style="font-size: 16px; color: red;"> An Error Occurred, and your PDF could not be printed.'
                    + ' Please check the error logs on the following script record for more information:<br />'
                    + 'GD Print Dealer Refunds Batch Suitelet</span>';
                }
            }

            context.response.writePage(form);
        } else {
            if (context.request.parameters['custpage_step'] == '1') {
                var checkNum = context.request.parameters['custpage_checknum'];

                var selectedRefunds = [];
                for (var i = 0; i < context.request.getLineCount('custpage_dealerrefundsublist'); i++) {
                    var selected = context.request.getSublistValue({
                        group: 'custpage_dealerrefundsublist',
                        name: 'custpage_sublist_select',
                        line: i
                    }) == "T";
                    if (selected) {
                        selectedRefunds.push(context.request.getSublistValue({
                            group: 'custpage_dealerrefundsublist',
                            name: 'custpage_sublist_refundid',
                            line: i
                        }));
                    }
                }
                var procRec = record.create({
                    type: 'customrecordgd_printdealerrefunds_proc',
                    isDynamic: true
                });
                var now = new Date();
                procRec.setValue({
                    fieldId: 'name',
                    value: runtime.getCurrentUser().name + ': ' + now.toLocaleString('en-US', {dateStyle: "short", timeStyle: "medium"})
                });
                procRec.setValue({
                    fieldId: 'custrecordgd_dealerrefundsproc_startnum',
                    value: checkNum
                });
                procRec.setValue({
                    fieldId: 'custrecordgd_dealerrefundsproc_refunds',
                    value: selectedRefunds
                });
                procRec.setValue({
                    fieldId: 'custrecordgd_dealerrefundsproc_status',
                    value: GD_Constants.GD_PRINTDEALERREFUNDS_OPEN
                });
                var procRecId = procRec.save();

                var taskId = '';
                try {
                    taskId = SSLib_Task.startMapReduceScript('customscriptgd_pdr_mapreduce', null, {custscriptgd_pdr_procrecid: procRecId}, '1', '5', '60');
                } catch (err) {
                    log.error('error attempting to kick off the map reduce.', err);
                }

                var suiteletParams = {
                    custpage_taskid: taskId,
                    custpage_step: '2',
                    custpage_procrecid: procRecId
                };
                // Proceed to step 2
                redirect.toSuitelet({
                    scriptId : 'customscriptgd_pdr_batch_suitelet',
                    deploymentId : 'customdeploygd_pdr_batch_suitelet',
                    parameters : suiteletParams
                });
            } else { // Refresh
               var suiteletParams = {
                    custpage_taskid: context.request.parameters['custpage_taskid'],
                    custpage_step: '2',
                    custpage_procrecid: context.request.parameters['custpage_procrecid']
                };
                // Proceed to step 2
                redirect.toSuitelet({
                    scriptId : 'customscriptgd_pdr_batch_suitelet',
                    deploymentId : 'customdeploygd_pdr_batch_suitelet',
                    parameters : suiteletParams
                }); 
            }
        }
    }

    /**
     * Helper function to add the step field to the form
     * 
     * @param {serverWidget.form} form
     * @param {string} step
     * @returns {string}
     */
    function addStepField(form, step) {
        var stepField = form.addField({
            id : 'custpage_step',
            type : serverWidget.FieldType.TEXT,
            label : 'Step'
        }).updateDisplayType({
            displayType : serverWidget.FieldDisplayType.HIDDEN
        });

        stepField.defaultValue = step;

        return step;
    }

    /**
     * Helper Function to generate the page for the first step of the Suitelet
     * 
     * @param {serverWidget.form} form
     */
    function stepOne(form) {
        
        form.addSubmitButton({label: 'Submit'});
        addStepField(form, '1');

        var checkNumField = form.addField({
            id: 'custpage_checknum',
            label: 'Starting Check #',
            type: serverWidget.FieldType.INTEGER
        });
        checkNumField.isMandatory = true;

        var sublist = form.addSublist({
            id : 'custpage_dealerrefundsublist',
            label : 'Dealer Refunds',
            type : serverWidget.SublistType.LIST
        });
        sublist.addMarkAllButtons();

        var selectField = sublist.addField({
            id : 'custpage_sublist_select',
            label : 'Select',
            type : serverWidget.FieldType.CHECKBOX
        });
        selectField.updateDisplayType({
            displayType : serverWidget.FieldDisplayType.ENTRY
        });

        sublist.addField({
            id : 'custpage_sublist_refundid',
            label : 'Refund Internal ID',
            type : serverWidget.FieldType.TEXT
        }).updateDisplayType({
            displayType : serverWidget.FieldDisplayType.HIDDEN
        });

        sublist.addField({
            id: 'custpage_sublist_date',
            label: 'Date',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_sublist_dealer',
            label: 'Dealer',
            type: serverWidget.FieldType.TEXT
        });
        sublist.addField({
            id: 'custpage_sublist_amount',
            label: 'Total Amount',
            type: serverWidget.FieldType.CURRENCY
        });

        var results = search.load({
            type: search.Type.CREDIT_MEMO,
            id: 'customsearchdealerrefundcheckstoprintg_2'
        }).runPaged({pageSize : 1000});

        var i = 0;
        results.pageRanges.forEach(function(pageRange) {
            results.fetch({
                index : pageRange.index
            }).data.forEach(function(result) {
                var dealerRefundNumber = result.getText({name: 'appliedToTransaction', summary: search.Summary.GROUP});
                var dealerRefundId = result.getValue({name: 'internalid', join: 'appliedToTransaction', summary: search.Summary.GROUP});
                var dealerId = result.getValue({name: 'entity', join: 'appliedToTransaction', summary: search.Summary.GROUP});
                var dealerName = result.getText({name: 'entity', join: 'appliedToTransaction', summary: search.Summary.GROUP});
                var date = result.getValue({name: 'trandate', join: 'appliedToTransaction', summary: search.Summary.GROUP});
                var amount = result.getValue({name: 'amount', join: 'appliedToTransaction', summary: search.Summary.GROUP});

                var dealerUrl = url.resolveRecord({
                    recordType: search.Type.CUSTOMER,
                    recordId: dealerId,
                    isEditMode: false
                });

                sublist.setSublistValue({
                    id: 'custpage_sublist_dealer',
                    line: i,
                    value: '<a target="_blank" href="' + dealerUrl + '">' + dealerName + '</a>'
                });

                sublist.setSublistValue({
                    id: 'custpage_sublist_amount',
                    line: i,
                    value: amount
                });

                sublist.setSublistValue({
                    id: 'custpage_sublist_refundid',
                    line: i,
                    value: result.getValue({name: 'internalid', join: 'appliedToTransaction', summary: search.Summary.GROUP})
                });

                var refundUrl = url.resolveRecord({
                    recordType: search.Type.CUSTOMER_REFUND,
                    recordId: dealerRefundId,
                    isEditMode: false
                });

                sublist.setSublistValue({
                    id: 'custpage_sublist_date',
                    line: i,
                    value: '<a target="_blank" href="' + refundUrl + '">' + date + '</a>'
                });
                i++;
            });
        });
    }

    /**
     * Helper Function to generate the page for the second step of the Suitelet
     * 
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @param {serverWidget.form} form
     */
    function stepTwo(context, form) {
        form.addSubmitButton('Refresh');
        addStepField(form, '2');

        if (context.request.parameters['custpage_taskid'] == 'ERROR') {
            // There was an error in launching the Map/Reduce script. 
            // display an error message.
            form.addField({
                id : 'custpage_error',
                type : serverWidget.FieldType.INLINEHTML,
                label : 'Status'
            }).defaultValue = '<span style="font-size: 16px;"> There was an error launching the Map/Reduce.</span>';
        } else {
            // Field to store the ID of the Map/Reduce task
            var taskField = form.addField({
                id : 'custpage_taskid',
                type : serverWidget.FieldType.TEXT,
                label : 'Task ID'
            }).updateDisplayType({
                displayType : serverWidget.FieldDisplayType.HIDDEN
            });
            taskField.defaultValue = context.request.parameters['custpage_taskid'];

            // Field to store the ID of the Map/Reduce task
            var taskField = form.addField({
                id : 'custpage_procrecid',
                type : serverWidget.FieldType.TEXT,
                label : 'Processing Record Id'
            }).updateDisplayType({
                displayType : serverWidget.FieldDisplayType.HIDDEN
            });
            taskField.defaultValue = context.request.parameters['custpage_procrecid'];

            // Retrieving the current status of the Map/Reduce task
            var taskStatus = task.checkStatus({
                taskId : context.request.parameters['custpage_taskid']
            });

            var color = 'black';
            if (taskStatus.status == 'PENDING')
                color = 'purple';
            else if (taskStatus.status == 'PROCESSING')
                color = 'blue';
            else if (taskStatus.status == 'COMPLETE') {
                var suiteletParams = {
                    custpage_step: '3',
                    custpage_procrecid: context.request.parameters['custpage_procrecid']
                };
                // Proceed to step 2
                redirect.toSuitelet({
                    scriptId : 'customscriptgd_pdr_batch_suitelet',
                    deploymentId : 'customdeploygd_pdr_batch_suitelet',
                    parameters : suiteletParams
                });
            }
            var statusMessage = '<span style="font-size: 16px; color:'+ color + '">' + 
                                'Status: <b>' + taskStatus.status +'</b>' + '</span>';

            // Field to display the current status of the Map/Reduce task
            var htmlMessage = '<br/><span style="font-size: 16px;">'
                            + 'Please wait while the Refunds are being processed.'
                            + ' Once processing is complete, download links will be generated.<br/>'
                            + statusMessage;

            form.addField({
                id : 'custpage_message',
                type : serverWidget.FieldType.INLINEHTML,
                label : 'Message'
            }).defaultValue = htmlMessage;
        }
    }

    /**
     * Helper Function to generate the page for the third step of the Suitelet
     * 
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @param {serverWidget.form} form
     */
    function stepThree(context, form) {
        var procRecId = context.request.parameters['custpage_procrecid'];
        var htmlMessage = '<span style="font-size: 16px;">'
                        + 'Your Refunds are ready to be printed. '
                        + 'Use the Links below to download the PDFs. '
                        + 'Clicking the Return To Selection Page link will '
                        + 'return you to the selection page, and you will no '
                        + 'longer have access these download links.';
        var suiteletParams = {
            custpage_operation: 'Checks',
            custpage_procrecid: procRecId,
            custpage_step: '4'
        };
        var printChecksUrl = url.resolveScript({
            scriptId: 'customscriptgd_pdr_batch_suitelet',
            deploymentId: 'customdeploygd_pdr_batch_suitelet',
            params: suiteletParams
        });
        var checkLink = '<a href="' + printChecksUrl + '" target="_blank"'
                      + ' rel="noopener noreferrer" style="color:blue;">Print Checks</a>';

        suiteletParams['custpage_operation'] = 'Vouchers';
        var printVouchersUrl = url.resolveScript({
            scriptId: 'customscriptgd_pdr_batch_suitelet',
            deploymentId: 'customdeploygd_pdr_batch_suitelet',
            params: suiteletParams
        });
        var voucherLink = '<a href="' + printVouchersUrl + '" target="_blank"'
                        + ' rel="noopener noreferrer" style="color:blue;">Print Vouchers</a>';

        var restartUrl = url.resolveScript({
            scriptId: 'customscriptgd_pdr_batch_suitelet',
            deploymentId: 'customdeploygd_pdr_batch_suitelet'
        });
        restartLink = '<a href="' + restartUrl + '" style="color:blue;">'
                    + 'Return To Selection Page</a>';

        htmlMessage += '<br />' + checkLink + '<br />' + voucherLink + '<br />' + restartLink + '</span>';
        form.addField({
            id : 'custpage_message',
            type : serverWidget.FieldType.INLINEHTML,
            label : 'Message'
        }).defaultValue = htmlMessage;
    }

    /**
     * Helper Function to call the appropriate helper function to get the file to download.
     * 
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     */
    function stepFour(context) {
        var procRec = record.load({
            type: 'customrecordgd_printdealerrefunds_proc',
            id: context.request.parameters['custpage_procrecid'],
            isDynamic: true
        });
        var operation = context.request.parameters['custpage_operation'];
        var pdfFile = null;
        try {
            if (operation == "Vouchers") {
                pdfFile = vouchersHelper.getPdf(context.request.parameters['custpage_procrecid'], true);
            } else if (operation == "Checks") {
                pdfFile = checksHelper.getPdf(context.request.parameters['custpage_procrecid'], true);
            }
        } catch (err) {
            log.error('Error printing PDF', err);
        }
        if (pdfFile != null) {
            var fileName = procRec.getValue({fieldId: 'name'});
            fileName = fileName.replace(/[^A-Za-z0-9]/g, '_');
            fileName = fileName + '_' + operation + '.pdf';
            pdfFile.name = fileName;
        }
        return pdfFile;
    }

    return {
        onRequest: onRequest
    };
    
});
