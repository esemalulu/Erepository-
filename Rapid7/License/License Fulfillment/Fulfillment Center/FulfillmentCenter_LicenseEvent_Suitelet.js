/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NAMDConfig
 * @NScriptType Suitelet
 * Rapid 7
 * License/License Fulfillment/Fulfillment Center/FulfillmentCenter_LicenseEvent_Suitelet.js
 * @module
 * @description
 */
define(['N/ui/serverWidget', 'N/record', 'N/redirect', 'N/search', '/SuiteScripts/Toolbox/Check_Custom_Permissions_2.0'], (serverWidget, record, redirect, search, customPermissions) => {
    /**
     * @function onRequest
     * @description description
     *
     * @public
     * @param  {Object} params description
     */
    function onRequest(scriptContext) {
        if(!customPermissions.userHasPermission('edit_oneprice_licensing_event')) {
            throw "Unauthorised. You do not have permission to edit licensing events.";
        }

        if (scriptContext.request.method === 'GET') {
            let licensingEventId = scriptContext.request.parameters.eventid;

            if (licensingEventId) {
                let form = serverWidget.createForm({
                    title: 'Replay License Event'
                });

                let eventIdField = form.addField({
                    id: 'eventidfield',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Event ID'
                });
                eventIdField.defaultValue = licensingEventId;
                eventIdField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });

                form.clientScriptModulePath = "SuiteScripts/License/License Fulfillment/Fulfillment Center/FulfillmentCenter_LicenseEvent_client.js";

                let responseTitleField = form.addField({
                    id: 'responsetitlefield',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Response Title'
                });
                responseTitleField.defaultValue = '<h1>Platform Response</h1>';

                let responseEditorField = form.addField({
                    id: 'responseeditorfield',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'JSONEditor1'
                });
                responseEditorField.defaultValue = '<div id="jsoneditorresponse" style="width: 600px; height: 1000px;"></div>';

                let errorTextField = form.addField({
                    id: 'errortext',
                    type: serverWidget.FieldType.TEXTAREA,
                    label: 'Error Text'
                });
                errorTextField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });
                errorTextField.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                let errorDescriptionField = form.addField({
                    id: 'errordescription',
                    type: serverWidget.FieldType.TEXTAREA,
                    label: 'Error Description'
                });
                errorDescriptionField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });
                const eventJSON = search.lookupFields({
                    type: 'customrecordr7_licencing_event',
                    id: licensingEventId,
                    columns: [
                        'custrecordr7_response_payload'
                    ]
                });
                if(eventJSON && eventJSON.custrecordr7_response_payload) {
                    const responseJSON = JSON.parse(eventJSON.custrecordr7_response_payload);
                    if (responseJSON.subscription.status == 'FAILURE') {
                        const errorText = responseJSON.subscription.errorInformation.errorDescription;
                        errorTextField.defaultValue = errorText;
                        const errorObj = matchErrorMessage(errorText);
                        if(errorObj) {
                            errorDescriptionField.defaultValue = errorObj.description + '<br/><br/><b>Next Steps:</b><br/>' + errorObj.nextSteps;
                        }
                    }
                }


                let requestTitleField = form.addField({
                    id: 'requesttitlefield',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Response Title'
                });
                requestTitleField.defaultValue = '<h1>Fulfillment Request</h1>';
                requestTitleField.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                let requestEditorField = form.addField({
                    id: 'requesteditorfield',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'JSONEditor1'
                });
                requestEditorField.defaultValue = '<div id="jsoneditorrequest" style="width: 600px; height: 1000px;"></div>';

                let hmtlField = form.addField({
                    id: 'editorsetupfield',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'html'
                });

                hmtlField.defaultValue = '<script>var tag = document.createElement("script");tag.src = "https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.6.0/jsoneditor.min.js";document.getElementsByTagName("head")[0].appendChild(tag);var tag = document.createElement("link");tag.href = "https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.6.0/jsoneditor.min.css"; tag.rel = "stylesheet";tag.type = "text/css";document.getElementsByTagName("head")[0].appendChild(tag);</script>';

                form.addField({
                    id: 'jsonpayloadfield',
                    type: serverWidget.FieldType.LONGTEXT,
                    label: ' '
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

                form.addSubmitButton({
                    label: 'Replay Event'
                });


                scriptContext.response.writePage(form);
            } else {
                throw "Error. Licensing Event ID not provided.";
            }
        } else {
            const jsonPayload = scriptContext.request.parameters.jsonpayloadfield
            const eventId = scriptContext.request.parameters.eventidfield;
            log.debug('jsonPayload', jsonPayload);
            log.debug('eventId', eventId);
            record.submitFields({
                type: 'customrecordr7_licencing_event',
                id: eventId,
                values: {
                    custrecordr7_response_payload: '',
                    custrecordr7_exception_message: '',
                    custrecordr7_request_payload: jsonPayload,
                    custrecordr7_licensing_event_status: '1'
                }
            });
            redirect.toRecord({
                type: 'customrecordr7_licencing_event',
                id: eventId
            });
        }
    }

    function matchErrorMessage(eventError) {
        const errorMessages = getAllErrorDescriptions();

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
        onRequest: onRequest
    };
});