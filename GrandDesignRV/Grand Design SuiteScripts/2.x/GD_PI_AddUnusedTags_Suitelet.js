/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/currentRecord', 'N/log', 'N/query', 'N/record', 'N/recordContext', 'N/redirect', 'N/ui/dialog', 'N/ui/message', 'N/url', 'N/ui/serverWidget'],
    /**
     * @param{currentRecord} currentRecord
     * @param{log} log
     * @param{query} query
     * @param{record} record
     * @param{recordContext} recordContext
     * @param{redirect} redirect
     * @param{dialog} dialog
     * @param{message} message
     * @param{url} url
     */
    (currentRecord, log, query, record, recordContext, redirect, dialog, message, url, serverWidget) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method == 'GET') {
                var form = serverWidget.createForm({
                    title: 'Add Unused Tags to Inventory Worksheet'
                });
                if (scriptContext.request.parameters['custpage_step'] == '1' || !scriptContext.request.parameters['custpage_step']) {
                    stepOne(scriptContext, form);
                } else if (scriptContext.request.parameters['custpage_step'] == '2') {
                    stepTwo(scriptContext, form);
                }

                scriptContext.response.writePage(form);
            } else {
                if (scriptContext.request.parameters['custpage_step'] == '1') {

                    var suiteletParams = {
                        custpage_step: '2',
                        custpage_selectworksheet: scriptContext.request.parameters['custpage_selectworksheet'],
                        custpage_starttag: scriptContext.request.parameters['custpage_starttag'],
                        custpage_endtag: scriptContext.request.parameters['custpage_endtag'],
                    };
                    // Proceed to step 2
                    redirect.toSuitelet({
                        scriptId: 'customscriptgd_pi_unusedtags_suitelet',
                        deploymentId: 'customdeploygd_pi_unusedtags_suitelet',
                        parameters: suiteletParams
                    });
                } else { // Refresh
                    var suiteletParams = {
                        custpage_step: '1',
                        custpage_selectworksheet: scriptContext.request.parameters['custpage_worksheet'],
                    };
                    // Proceed to step
                    redirect.toSuitelet({
                        scriptId: 'customscriptgd_pi_unusedtags_suitelet',
                        deploymentId: 'customdeploygd_pi_unusedtags_suitelet',
                        parameters: suiteletParams
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
        const addStepField = (form, step) => {
            var stepField = form.addField({
                id: 'custpage_step',
                type: serverWidget.FieldType.TEXT,
                label: 'Step'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            stepField.defaultValue = step;

            return step;
        }

        /**
         * Helper Function to generate the page for the first step of the Suitelet
         * 
         * @param {serverWidget.form} form
         */
        const stepOne = (scriptContext, form) => {

            form.addSubmitButton({
                label: 'Submit'
            });
            addStepField(form, '1');

            form.addButton({
                id: 'custpage_returntoworksheet',
                label: 'Return to Worksheet',
                functionName: "window.location = '/app/common/custom/custrecordentry.nl?rectype=397&id=" + scriptContext.request.parameters['custpage_selectworksheet'] + "';a"
            });

            var selectWorkSheetField = form.addField({
                id: 'custpage_selectworksheet',
                type: serverWidget.FieldType.SELECT,
                label: 'Select Inventory Worksheet',
                source: 'customrecordgd_physicalinventoryworkshee'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            selectWorkSheetField.isMandatory = true;

            if (scriptContext.request.parameters['custpage_selectworksheet']) {
                selectWorkSheetField.defaultValue = scriptContext.request.parameters['custpage_selectworksheet'];
            }

            var startTagField = form.addField({
                id: 'custpage_starttag',
                label: 'Start Tag Number',
                type: serverWidget.FieldType.TEXT
            });
            startTagField.isMandatory = true;

            var endTagField = form.addField({
                id: 'custpage_endtag',
                label: 'End Tag Number',
                type: serverWidget.FieldType.TEXT
            });
            endTagField.isMandatory = true;
        }

        /**
         * Helper Function to generate the page for the second step of the Suitelet
         * Adds the Tag number to the worksheet
         * 
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @param {serverWidget.form} form
         */
        const stepTwo = (scriptContext, form) => {
            try {
                var worksheetRec = record.load({
                    type: 'customrecordgd_physicalinventoryworkshee',
                    id: scriptContext.request.parameters['custpage_selectworksheet'],
                    isDynamic: true,
                });

                var startTag = scriptContext.request.parameters['custpage_starttag'];
                var endTag = scriptContext.request.parameters['custpage_endtag'];

                var worksheetStartTag = worksheetRec.getValue({
                    fieldId: 'custrecordgd_physinvtwrksht_starttagnum'
                });

                var worksheetEndTag = worksheetRec.getValue({
                    fieldId: 'custrecordgd_physinvtwrksht_endtagnum'
                });

                if (startTag >= worksheetStartTag && startTag < worksheetEndTag) {
                    if (endTag > worksheetStartTag && endTag <= worksheetEndTag) {
                        for (let currentTag = startTag; currentTag <= endTag; currentTag++) {
                            worksheetRec.selectNewLine({
                                sublistId: 'recmachcustrecordgd_physinvttagline_parent'
                            });
                            worksheetRec.setCurrentSublistValue({
                                sublistId: 'recmachcustrecordgd_physinvttagline_parent',
                                fieldId: 'custrecordgd_physinvttagline_tagnum',
                                value: currentTag
                            });
                            worksheetRec.setCurrentSublistValue({
                                sublistId: 'recmachcustrecordgd_physinvttagline_parent',
                                fieldId: 'custrecordgd_physinvttagline_item',
                                value: 66116
                            });
                            worksheetRec.setCurrentSublistValue({
                                sublistId: 'recmachcustrecordgd_physinvttagline_parent',
                                fieldId: 'custrecordgd_physinvttagline_quantity',
                                value: 0
                            });
                            worksheetRec.commitLine({
                                sublistId: 'recmachcustrecordgd_physinvttagline_parent'
                            });
                        }

                        worksheetRec.save();

                        //return to the Worksheet once completed successfully
                        redirect.toRecord({
                            type: 'customrecordgd_physicalinventoryworkshee',
                            id: scriptContext.request.parameters['custpage_selectworksheet'],
                        });
                    } else {
                        //Display error for End tag and return to the start of the Suitelet
                        form.addSubmitButton('Refresh');
                        addStepField(form, '2');
                        var selectWorksheetField = form.addField({
                            id: 'custpage_worksheet',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Worksheet'
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                        selectWorksheetField.defaultValue = scriptContext.request.parameters['custpage_selectworksheet'];
                        form.addField({
                            id: 'custpage_message',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Error Message'
                        }).defaultValue = 'The End Tag you entered was not in the Tag Sequnce of the Seleted Inventory Worksheet';
                    }
                } else {
                    //Display error for Start tag and return to the start of the Suitelet
                    form.addSubmitButton('Refresh');
                    addStepField(form, '2');
                    var selectWorksheetField = form.addField({
                        id: 'custpage_worksheet',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Worksheet'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    selectWorksheetField.defaultValue = scriptContext.request.parameters['custpage_selectworksheet'];
                    form.addField({
                        id: 'custpage_message',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Error Message'
                    }).defaultValue = 'The Starting Tag you entered was not in the Tag Sequnce of the Seleted Inventory Worksheet';
                }


            } catch (e) {
                log.debug('Catch e', e);
                form.addSubmitButton('Refresh');
                addStepField(form, '2');
                form.addField({
                    id: 'custpage_message',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Error Message'
                }).defaultValue = e;
            }
        }

        const returnToWorksheet = (worksheetID) => {
            document.location = url.resolveRecord({
                recordType: 'customrecordgd_physicalinventoryworkshee',
                recordId: worksheetID,
                isEditMode: false
            });
            // redirect.toRecord({
            //     type: 'customrecordgd_physicalinventoryworkshee',
            //     id: worksheetID,
            // });
        }

        return {
            onRequest
        }

    });