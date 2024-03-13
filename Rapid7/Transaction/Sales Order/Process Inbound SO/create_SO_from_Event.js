/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record', 'N/search', 'N/format', 'N/runtime', 'N/email', 'N/url', 'N/https', '/SuiteScripts/Transaction/Sales Order/Process Inbound SO/JSONLib.js', 'N/file', 'N/task'],
    function (error, record, search, format, runtime, email, url, https, JSONLib, file, task) {
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
            var currentRecord = scriptContext.newRecord;
            if (currentRecord.getValue({ fieldId: 'custrecordaction' }) === 'PUBLISHED' && // pending
                JSONLib.isNullOrEmpty(currentRecord.getValue({ fieldId: 'custrecordtarget_id' }))) {
                try { // clear error message before begin
                    record.submitFields({
                        type: currentRecord.type,
                        id: currentRecord.id,
                        values: {
                            'custrecorderror_message': ''
                        }
                    });
                    var requestBody = JSONLib.processJSON(currentRecord.getValue({fieldId: 'custrecordbody'}), currentRecord.id);
                    var salesOrderId = createSO(requestBody, currentRecord.id);
                    if (!JSONLib.isNullOrEmpty(salesOrderId)) {
                        record.submitFields({
                            type: currentRecord.type,
                            id: currentRecord.id,
                            values: {
                                'custrecordjob_status': 'Success', //success
                                'custrecordtarget_id': salesOrderId
                            }
                        });
                        log.debug("Remaining governance units: " + runtime.getCurrentScript().getRemainingUsage());
                    }
                } catch (ex) {
                    var errorMessage = JSON.stringify(ex);
                    var errorTitle = 'Error in SO';

                    if (ex.name === 'SSS_USAGE_LIMIT_EXCEEDED' || ex.message === 'Script Execution Usage Limit Exceeded') {
                        // errorTitle = ex.name || ex.message;
                        errorMessage = 'Order is too large for processing upon save. Must be processed via Scheduled Script.';

                        record.submitFields({
                            type: currentRecord.type,
                            id: currentRecord.id,
                            values: {
                                'custrecordjob_status': 'Error',
                                'custrecorderror_message': errorMessage
                            }
                        });

                        var taskToSubmit = task.create({
                            taskType: task.TaskType.SCHEDULED_SCRIPT,
                            scriptId: 'customscript1852',
                            deployId: 'customdeploy1'
                        });

                        taskToSubmit.submit();
                    } else {
                        record.submitFields({
                            type: currentRecord.type,
                            id: currentRecord.id,
                            values: {
                                'custrecordjob_status': 'Error',
                                'custrecorderror_message': errorMessage
                            }
                        });

                        errorMessage = 'Inbound Event ID: ' + currentRecord.id + '\n\n' + errorMessage;

                        log.debug({
                            title: errorTitle,
                            details: errorMessage
                        });

                        JSONLib.sendErrorEmail(ex, currentRecord.id);

                        return ex;
                    }
                }
            } else {
                log.debug('no need to process order, do nothing Yeah!');
            }
        }

        function createSO(requestBody, inboundEventId) {
            var salesOrder = record.create({
                type: record.Type.SALES_ORDER,
                isDynamic: true
            });

            updateEmployeeToSalesRep(requestBody);
            JSONLib.createSOHeader(requestBody, salesOrder, ['entity', 'subsidiary']);
            JSONLib.createSOLines(requestBody, salesOrder, inboundEventId);
            JSONLib.createBillingAndShippingObjects(requestBody, salesOrder);

            // hotfix APPS-20073
            var currentLocation = salesOrder.getValue({
                fieldId: 'location'
            })
            var currentDepartment = salesOrder.getValue({
                fieldId: 'department'
            })
            
            log.audit({ title: 'currentLocation is ', details: currentLocation });
          	log.audit({ title: 'currentDepartment is ', details: currentDepartment });
         	log.audit({ title: 'requestBody entity ', details: requestBody.Header['entity'] });
         	log.audit({ title: 'requestBody subsidiary', details: requestBody.Header['subsidiary'] });
          
            if (!currentLocation || !currentDepartment) {
              log.audit({ title: 'reset loc and sub', details: ''});
                JSONLib.createSOHeader(requestBody, salesOrder, ['entity', 'subsidiary']);
                JSONLib.createSOLines(requestBody, salesOrder);
            }

            var salesOrderId = salesOrder.save();
            record.submitFields({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                values: {
                    'customform': '101'
                }
            });
            var newSO = record.load({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                isDynamic: true
            });
            JSONLib.createPartnerObjects(requestBody, newSO);
            newSO.save();
            scheduleProjectAssignment(salesOrderId);
            log.debug({ title: 'So is ', details: salesOrderId });
            return salesOrderId;
        }

        function scheduleProjectAssignment(salesOrderId) {
            try {
                log.debug({
                    title: 'scheduleProjectAssignment method initiated',
                    details: 'Scheduling Project assignment for Sales Order ' + salesOrderId,
                });
                
                var scheduleMapReduce = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_r7_project_assignment_mr',
                    deploymentId: 'customdeploy_r7_project_assignment_mr_' + String(salesOrderId).substr(-1), // split across 10 deployments - APPS-19914
                    params: {
                        custscript_salesorder_id: salesOrderId,
                    },
                });
                var scheduledMapReduceId = scheduleMapReduce.submit();
            } catch (error) {
                log.error({
                    title: 'scheduleProjectAssignment method error',
                    details: error,
                });
            }
        }

        /**
         * @governance
         * @param requestBody
         */
        function updateEmployeeToSalesRep(requestBody) {
            var salesRepId = requestBody['Header']['salesrep'];

            if (!salesRepId) {
                return;
            }

            var isSalesRep = search.lookupFields({
                type: record.Type.EMPLOYEE,
                id: salesRepId,
                columns: 'issalesrep'
            })['issalesrep'];

            if (isSalesRep) {
                log.debug({ title: 'update employee', details: 'employee is already a sales rep' });
                return;
            }

            log.debug({ title: 'update employee', details: 'updating employee to be a sales rep' });
            record.submitFields({
                type: record.Type.EMPLOYEE,
                id: salesRepId,
                values: { issalesrep: true }
            });
        }

        return {
            afterSubmit: afterSubmit
        };
    });
