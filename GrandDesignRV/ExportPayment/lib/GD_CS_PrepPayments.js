/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url', 'N/https', 'N/ui/message', 'N/search', 'N/runtime', '../lib/sweetalert2.all.min'],
    /**
     * @param {currentRecord} currentRecord
     * @param {url} url
     * @param {https} https
     * @param {message} message
     * @param {search} search
     * @param {runtime} runtime
     * @param {Swal} Swal
     * @returns {{pageInit: pageInit, fieldChanged: fieldChanged}}
     */
    function (currentRecord, url, https, message, search, runtime, Swal) {

        var confirmationMessage, informationMessage, toast, waitToast;
        var selectedCount = 0;
        var validatedStartingCheckNumber = 0;
        var isDealerRefundProcess = currentRecord.get().getValue('custpage_process_type') === 'true';
        function clearInfoMessage() {
            if (informationMessage) {
                informationMessage.hide();
                informationMessage = null;
            }
        }

        function toggleButton(enabled) {
            const rec = currentRecord.get();
            rec.getField('custpage_process_payments').isDisabled = !enabled;
        }

        function updateSelectedCount(isSelected) {
            console.log('updateSelectedCount', isSelected);
            const SUBLIST = 'custpage_batchprint';
            const rec = currentRecord.get();
            selectedCount = isSelected ? rec.getLineCount({sublistId: SUBLIST}) : 0;
            rec.setValue({fieldId: 'custpage_selectedcount', value: isSelected ? rec.getLineCount({sublistId: SUBLIST}) : 0});
            updateCheckEndNumber(rec);
        }

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            jQuery('#custpage_batchprintmarkall').click((e) => updateSelectedCount(true));
            jQuery('#custpage_batchprintunmarkall').click((e) => updateSelectedCount(false));
            toggleButton(false);
        }

        function logExecutionTime(start, end, message) {
            console.log(`%c ${message} Duration: ${Number(end) - Number(start)} milliseconds.`, 'background: black; color: orange');
        }
        function performCheckNumberValidation(startingCheckNumber, endingCheckNumber) {
            var markA = performance.now();
            if(validatedStartingCheckNumber !== startingCheckNumber) {
                if (startingCheckNumber && endingCheckNumber) {
                    const customerrefundSearchObj = search.create({
                        type: 'transaction',
                        filters:
                            [
                                ["type","anyof","VendPymt","CustRfnd"],
                                'AND',
                                ['mainline', 'is', 'T'],
                                'AND',
                                ['datecreated', 'onorafter', 'lastyear'],
                                'AND',
                                [[['number', 'equalto', startingCheckNumber.toString()]], 'OR', [['number', 'greaterthan', startingCheckNumber.toString()], 'AND', ['number', 'lessthan', (endingCheckNumber + 1).toString()]]]
                            ],
                        columns:
                            [
                                search.createColumn({name: 'tranid', label: 'Document Number'})
                            ]
                    });
                    const searchResultCount = customerrefundSearchObj.runPaged().count;
                    if (searchResultCount) {
                        const checkNumbersInUse = customerrefundSearchObj.runPaged().fetch({index: 0}).data.map((r) => r.getValue({name: 'tranid'}));
                        let html = `There are one or more check numbers in use. Please use a different starting check number.<br/>`;
                        if (checkNumbersInUse.length < 6)
                            html = `The following check numbers are already in use: <br/>${checkNumbersInUse.join('<br/>')}`
                        Swal.fire({
                            title: 'Check Number Validation',
                            html: html,
                            type: 'error',
                            confirmButtonText: 'OK'
                        });
                        logExecutionTime(markA, performance.now(), 'performCheckNumberValidation');
                        return false;
                    }
                    validatedStartingCheckNumber = startingCheckNumber;
                }
            }
            return true;
        }

        function updateCheckEndNumber(rec) {
            const startingCheckNumber = Number(rec.getValue({fieldId: 'custpage_checknumber'})) || 0;
            if (startingCheckNumber && selectedCount) {
                const endingCheckNumber = startingCheckNumber + selectedCount - 1;
                rec.setValue({fieldId: 'custpage_checkend', value: endingCheckNumber});
                toggleButton(performCheckNumberValidation(startingCheckNumber, endingCheckNumber));
            } else {
                rec.setValue({fieldId: 'custpage_checkend', value: ''});
            }
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            const SUBLIST = 'custpage_batchprint';
            if (scriptContext.fieldId === 'custpage_checknumber') {
                updateCheckEndNumber(currentRecord.get());
                return;
            }
            if (scriptContext.sublistId === SUBLIST && scriptContext.fieldId === 'custpage_subprint') {
                const rec = currentRecord.get();
                const lineCount = rec.getLineCount({sublistId: SUBLIST});
                let checked = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_subprint', line: scriptContext.line});
                selectedCount = checked ? selectedCount + 1 : selectedCount - 1;
                rec.setValue({fieldId: 'custpage_selectedcount', value: selectedCount});
                updateCheckEndNumber(rec);
            }

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {
            return true;
        }

        function getDeploymentId() {
            var deploymentId = 'customdeploy_gd_sl_prep_payments';
            var searchParams = new URLSearchParams(window.location.search);
            if (searchParams.has('deploy') && searchParams.get('deploy') === '2') {
                deploymentId = 'customdeploy_gd_sl_prep_payments_dr';
            }
            return deploymentId;
        }

        /**
         * Returns the appropriate url for the suitelet.
         */
        function getPrepPaymentsUrl(taskId) {
            var deploymentId = getDeploymentId();
            var urlToOpen = url.resolveScript({
                scriptId: 'customscript_gd_sl_prep_payments',
                deploymentId: deploymentId,
                returnExternalUrl: false
            });

            if (taskId)
                urlToOpen += '&taskId=' + taskId;
            return urlToOpen;
        }

        function clearConfirmationMessage() {
            if (confirmationMessage) {
                confirmationMessage.hide();
                confirmationMessage = null;
            }
            if (waitToast)
                waitToast.close();

            if (toast)
                toast.close();

            informationMessage = message.create({
                title: 'Records Processed',
                message: 'The records have been processed.',
                type: message.Type.CONFIRMATION
            });
            informationMessage.show(2000);

            toggleButton(true);
            setTimeout(function () {
                location.href = location;
            }, 2500);
        }

        function isProcessComplete(taskId) {
            //console.log('isProcessComplete called.');
            var urlToOpen = getPrepPaymentsUrl(taskId);
            var taskInfo;
            https.get.promise({
                url: urlToOpen
            })
                .then(function (response) {
                    taskInfo = JSON.parse(response.body);
                    console.log(taskInfo);
                    log.debug({
                        title: 'Response',
                        details: response
                    });
                    if (!taskInfo || taskInfo.status === 'COMPLETE') {
                        clearConfirmationMessage();
                    } else {
                        //console.log('isProcessComplete called again');
                        if (toast) {
                            if (!isNaN(taskInfo.percentComplete))
                                toast.getContent().textContent = 'Processed ' + taskInfo.processed + ' of ' + taskInfo.totalCount + ' (' + taskInfo.percentComplete + '%)';
                        } else {
                            createAndFireToast();
                        }
                        setTimeout(function () {
                            isProcessComplete(taskId);
                        }, 15000);
                    }
                })
                .catch(function onRejected(reason) {
                    console.log(reason);
                    log.debug({
                        title: 'Invalid Get Request: ',
                        details: reason
                    });
                });
        }

        function createAndFireToast() {

            if (waitToast)
                waitToast.close();

            toast = Swal.mixin({
                title: 'Processing Records',
                text: 'May take a few minutes. Please do not close this window.',
                type: 'info',
                allowOutsideClick: false,
                allowEscapeKey: false,
                onBeforeOpen: function (m) {
                    Swal.showLoading();
                }
            });
            toast.fire({
                type: 'info'
            });
        }

        function processPayments() {
            // get the current record. This is the Suitelet.
            const rec = currentRecord.get();
            const SUBLIST = 'custpage_batchprint';
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            const startingCheckNo = rec.getValue('custpage_checknumber');
            if (!startingCheckNo) {
                Swal.fire({
                    title: 'Please enter a starting check number.',
                    type: 'error'
                });
                return;
            }
            const paymentsToProcess = [];
            for (let i = 0; i < lineCount; i++) {
                const isChecked = rec.getSublistValue({
                    sublistId: SUBLIST,
                    fieldId: 'custpage_subprint',
                    line: i
                });
                // if it's checked add it to the array to send.
                if (isChecked) {
                    paymentsToProcess.push({
                        internalId: rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_paymentid', line: i})
                    });
                }
            }

            if (paymentsToProcess.length > 0) {
                clearInfoMessage();
                // Prevent the execution until we allow it again.
                toggleButton(false);
                var deploymentId = getDeploymentId();
                const slUrl = url.resolveScript({
                    scriptId: 'customscript_gd_sl_prep_payments',
                    deploymentId: deploymentId,
                    returnExternalUrl: false
                });

                if (slUrl) {

                    const reqBody = {
                        'startingCheckNo': rec.getValue('custpage_checknumber'),
                        'paymentsToProcess': paymentsToProcess
                    };

                    var header = [];
                    header['Content-Type'] = 'application/json';
                    try {
                        https.post.promise({
                            url: slUrl,
                            body: JSON.stringify(reqBody),
                            headers: header
                        })
                            .then(function (response) {
                                if (response && response.body) {
                                    console.log(response);
                                    const resObj = JSON.parse(response.body);
                                    const taskId = resObj.taskId;
                                    if (taskId) {
                                        confirmationMessage = message.create({
                                            title: 'Confirmation',
                                            message: 'Please wait while the payments are being prepared for export.',
                                            type: message.Type.INFORMATION
                                        });
                                        confirmationMessage.show();
                                        createAndFireToast();
                                        setTimeout(function () {
                                            isProcessComplete(taskId);
                                        }, 2000);
                                    }
                                }
                            })
                            .catch(function (reason) {
                                log.error('POST ERROR', reason);
                            });
                    } catch (e) {
                        log.error('POST ERROR', e);
                    }
                }
            } else {
                Swal.fire({
                    title: 'Please select at least one record to process.',
                    type: 'error'
                });
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            processPayments: processPayments,
            //validateField: validateField
        };

    });
