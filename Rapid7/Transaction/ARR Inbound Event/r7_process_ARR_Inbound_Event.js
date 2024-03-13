/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record', 'N/runtime', '/SuiteScripts/Transaction/ARR Inbound Event/r7_ARR_Common_Lib.js',
        '/SuiteScripts/Transaction/ARR Inbound Event/r7_ARR_Event_lib.js'
    ],
    function(error, record, runtime, commonLib, eventLib) {
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            log.debug('afterSubmit start');
            var currentRecord = scriptContext.newRecord;
            var eventId = currentRecord.id;
            var publishingStatus = currentRecord.getValue({
                fieldId: 'custrecord_r7_publishing_status'
            });
            if (publishingStatus == 2) { //'ARR Event Response Updated'
                try {
                    processArrEvent(currentRecord, eventId);
                } catch (ex) {
                    log.debug({
                        title: 'error in SO',
                        details: JSON.stringify(ex)
                    });
                    record.submitFields({
                        type: currentRecord.type,
                        id: eventId,
                        values: {
                            'custrecord_r7_publishing_status': 4, //'ARR Event Response Process Failed',
                            'custrecordr7_errormessage': JSON.stringify(ex)
                        }
                    });

                    commonLib.sendErrorEmail(ex, eventId);
                    return ex;
                }
            } else {
                log.debug('no need to process event, do nothing Yeah!');
            }
            log.debug('afterSubmit end');
        }

        function processArrEvent(eventRecord, eventId) {
            log.debug('processArrEvent start');
            // clear error message before begin
            record.submitFields({
                type: eventRecord.type,
                id: eventId,
                values: {
                    'custrecordr7_errormessage': ''
                }
            });

            var arrResponse = eventRecord.getValue({
                fieldId: 'custrecordr7_body2'
            });

            if (!arrResponse) {
                // No Workato response.  Reset this record and update lastModified, forcing Workato to pick this up again.
                resetEventRecord(eventRecord);
                return;
            }

            var request = validateRequest(arrResponse);

            var objectType = getObjectType(request);
            if (!commonLib.isNullOrEmpty(objectType)) {
                var response = {};
                response = eventLib.processEvent(request, eventId, objectType);
                if (response.id) {
                    if (response.JSONPayload) {
                        record.submitFields({
                            type: eventRecord.type,
                            id: eventId,
                            values: {
                                'custrecord_r7_publishing_status': 6, // 'ARR Event Response Processed'
                                'custrecordr7_final_arr_payload': JSON.stringify(response.JSONPayload)
                            }
                        });
                    } else {
                        record.submitFields({
                            type: eventRecord.type,
                            id: eventId,
                            values: {
                                'custrecord_r7_publishing_status': 3 // 'ARR Event Response Processed'
                            }
                        });
                    }
                    record.submitFields({
                        type: objectType,
                        id: request.id,
                        values: {
                            'custbody_r7_cash_arr_calc_status': 3 // 'Calculation Completed'
                        }
                    });
                } else {
                    record.submitFields({
                        type: objectType,
                        id: request.id,
                        values: {
                            'custbody_r7_cash_arr_calc_status': 4 // 'Error'
                        }
                    });

                    throw error.create({
                        name: 'NOT_PROCESSED',
                        message: 'Something went wrong. Quote or SO were not updated'
                    });
                }
            } else {
                log.error('Could not find library for the JSON data');
                throw error.create({
                    name: 'NO_LIB',
                    message: 'Could not find library for the JSON data'
                });
            }
            log.debug('processArrEvent end');
        }

        function getObjectType(requestBody) {

            var objectTypes = [];
            objectTypes.push({
                objectType: 'Sales_Order',
                internalType: record.Type.SALES_ORDER
            });
            objectTypes.push({
                objectType: 'Quote',
                internalType: record.Type.ESTIMATE
            });
            objectTypes.push({
                objectType: 'Credit_Memo',
                internalType: record.Type.CREDIT_MEMO
            });
            objectTypes.push({
                objectType: 'Cash_Refund',
                internalType: record.Type.CASH_REFUND
            });
          	objectTypes.push({
                objectType: 'Return_Authorization',
                internalType: record.Type.RETURN_AUTHORIZATION
            });

            var objectType = requestBody.object;
            var type = null;
            for (var i = 0; i < objectTypes.length; i++) {
                if (objectTypes[i].objectType.localeCompare(objectType) === 0) {
                    log.debug('objectTypes[i].internalType', objectTypes[i].internalType);
                    type = objectTypes[i].internalType;
                    break;
                }
            }
            return type;
        }

        /**
         * Check's if request body is not empty, if it is then the exception
         * is thrown
         *
         * @param request
         * @returns
         */
        function validateRequest(request) {
            log.debug('validateRequest start');
            try {
                var reqObj = JSON.parse(request);
                log.debug({
                    title: 'requestBody',
                    details: reqObj
                });

                if (JSON.stringify(reqObj) == '{}') {
                    throw error.create({
                        name: 'EMPTY_REQUEST',
                        message: 'There was an error with your request. The request body is empty'
                    });
                }
            } catch (ex) {
                log.debug('ex', ex);
                if (ex.name == 'EMPTY_REQUEST') {
                    throw error.create({
                        name: ex.name,
                        message: ex.message
                    });
                } else {
                    throw error.create({
                        name: 'INVALID_REQUEST',
                        message: 'There was an error with your request. The request body can not be parsed. Error Message :' + ex.message
                    });
                }
            }
            log.debug('validateRequest end', request);
            return JSON.parse(request);
        }

        /**
         * Put timestamp in comment field to force lastModified to be updated so Workato can pick this up.
         * The status may already be EVENT_CREATED, so just setting the status is not enough to update lastModified.
         * @param eventRecord
         */
        function resetEventRecord(eventRecord) {
            log.debug({ title: 'Resetting Event', details: 'Ressetting Event ' + eventRecord.id });
            var EVENT_CREATED = 1;
            var timestamp = new Date().toISOString();

            record.submitFields({
                type: eventRecord.type,
                id: eventRecord.id,
                values: {
                    'custrecord_r7_publishing_status': EVENT_CREATED,
                    'custrecord_r7_arr_comment': 'Reset event: ' + timestamp
                }
            });
        }

        return {
            afterSubmit: afterSubmit
        };

    }
);
