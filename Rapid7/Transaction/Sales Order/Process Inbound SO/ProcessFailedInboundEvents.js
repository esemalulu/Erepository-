/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/task', 'N/error', 'N/record', 'N/search', 'N/format', 'N/runtime', 'N/email', 'N/url', 'N/https', '/SuiteScripts/Transaction/Sales Order/Process Inbound SO/JSONLib.js', 'N/file'],

    function (task, error, record, search, format, runtime, email, url, https, JSONLib, file) {

        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         * @Since 2015.2
         */
        function execute(scriptContext) {
            var searchId = runtime.getCurrentScript().getParameter("custscript_eventsearchid");
            search.load({id: searchId})
                .run()
                .each(
                    function (result) {
                        var eventRecord = null;
                        try {
                            log.debug({details: 'Processing Event :' + result.id + ' start'});
                            eventRecord = record.load({
                                type: 'customrecordinbound_event',
                                id: result.id
                            });
                            if (eventRecord !== null) {
                                var requestBody = JSONLib.processJSON(eventRecord.getValue({fieldId: 'custrecordbody'}), eventRecord.id);
                                var salesOrderId = createSO(requestBody);
                                if (!JSONLib.isNullOrEmpty(salesOrderId)) {
                                    record.submitFields({
                                        type: eventRecord.type,
                                        id: eventRecord.id,
                                        values: {
                                            'custrecordjob_status': 'Success',// success
                                            'custrecordtarget_id': salesOrderId
                                        }
                                    });
                                }
                                log.debug({
                                    title: 'So is ',
                                    details: salesOrderId
                                });
                            } else {
                                log.error({
                                    title: 'Event record ID: ' + result.id,
                                    details: 'Unable to load record from database.'
                                });
                            }
                        } catch (ex) {
                            log.debug({
                                title: 'error in SO',
                                details: JSON.stringify(ex)
                            });
                            if (eventRecord !== null) {
                                record.submitFields({
                                    type: eventRecord.type,
                                    id: eventRecord.id,
                                    values: {
                                        'custrecordjob_status': 'Error',
                                        'custrecorderror_message': JSON.stringify(ex)
                                    }
                                });
                                JSONLib.sendErrorEmail(ex, eventRecord.id);
                            }
                        }
                        log.debug("Remaining governance units: " + runtime.getCurrentScript().getRemainingUsage());
                        if (unitsLeft()) {
                            log.debug('Rescheduling script (script/deploy id)', runtime.getCurrentScript() + ' : ' + runtime.getCurrentScript().deploymentId);
                            var scheduleScriptTaskObj = task.create({
                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                scriptId: runtime.getCurrentScript().id,
                                deploymentId: runtime.getCurrentScript().deploymentId
                            });
                            log.debug('Schedule Object', scheduleScriptTaskObj);
                            var taskSubmitId = scheduleScriptTaskObj.submit();
                            log.debug('New task ' + taskSubmitId + ' is submitted.', 'Thank you! Come again!');
                            return false;
                        }
                        return true;
                    }
                );
        }

        function createSO(requestBody) {
            var salesOrder = record.create({
                type: record.Type.SALES_ORDER,
                isDynamic: true
            });
            JSONLib.createSOHeader(requestBody, salesOrder, ['entity', 'subsidiary', 'location', 'department']);
            JSONLib.createSOLines(requestBody, salesOrder);
            JSONLib.createBillingAndShippingObjects(requestBody, salesOrder);
            var salesOrderId = salesOrder.save();
            record.submitFields({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                values: {
                    'customform': '101'
                }
            });
            log.debug({title: 'So is ', details: salesOrderId});
            log.debug("Remaining governance units: " + runtime.getCurrentScript().getRemainingUsage());
            return salesOrderId;
        }

        function unitsLeft() {
            var unitsLeft = runtime.getCurrentScript().getRemainingUsage();
            if (unitsLeft <= 2000) {
                log.debug('Ran out of units', 'yup');
                return true;
            }
            return false;
        }

        return {
            execute: execute
        };

    }
);
