/**
* @NApiVersion 2.x
* @NScriptType UserEventScript
*/
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {
    function afterSubmit(context) {
        if (context.type === context.UserEventType.CREATE ||
            context.type === context.UserEventType.EDIT ||
            context.type === context.UserEventType.PRINT) {
            try {
                var custrecordArray = [];
                var recid = context.newRecord.id;
                log.debug('Record ID', recid);
                var invoiceRecord = record.load({
                    type: record.Type.INVOICE,
                    id: recid
                });
                var projectId = invoiceRecord.getValue({
                    fieldId: 'job'
                });
                if (projectId) {
                    log.debug('Project ID', projectId);
                    // Create the search to get tasks and their parent details
                    var taskSearch = search.create({
                        type: 'projecttask',
                        filters: [
                            ['project', 'anyof', projectId]
                        ],
                        columns: [
                            search.createColumn({ name: 'title', label: 'Task Name' }),
                            search.createColumn({ name: 'custevent_cp_task_tcv', label: 'TCV' }),
                            search.createColumn({ name: 'custevent_cp_task_pct_complete', label: 'Percent Complete' }),
                            search.createColumn({ name: 'custevent_prev_bill_amount', label: 'Previous Billing' }),
                            search.createColumn({ name: 'custevent_current_fee', label: 'Current fee' }),
                            search.createColumn({ name: 'actualwork', label: 'Actual Work' }),
                            search.createColumn({ name: 'internalid', label: 'Internal ID' }),
                            search.createColumn({ name: 'parent', label: 'Parent Task' })
                        ]
                    });
                    var results = taskSearch.run().getRange({ start: 0, end: 1000 });
                    // Maps to store task information
                    var tasksById = {};
                    var childrenByParentId = {};
                    results.forEach(function(result) {
                        var fullTaskName = result.getValue({ name: 'title' }) || 'N/A';
                        var taskNames = fullTaskName.split(':');
                        var taskName = taskNames.length > 1 ? taskNames[1] : taskNames;
                        var tcv = result.getValue({ name: 'custevent_cp_task_tcv' }) || 'N/A';
                        var percentComplete = result.getValue({ name: 'custevent_cp_task_pct_complete' }) || 'N/A';
                        var prevBill = result.getValue({ name: 'custevent_prev_bill_amount' }) || '';
                        var currentfee = result.getValue({ name: 'custevent_current_fee' }) || '';
                        var actualWork = result.getValue({ name: 'actualwork' }) || 'N/A'; // Get actual work value
                        var internalId = result.getValue({ name: 'internalid' }) || 'N/A';
                        var parentId = result.getValue({ name: 'parent' }) || 'N/A';
                        var taskData = "TaskName:" + taskName +
                            "|TCV:" + tcv +
                            "|PercentComplete:" + percentComplete +
                            "|PreviousBilling:" + prevBill +
                            "|CurrentFee:" + currentfee +
                            "|ActualWork:" + actualWork +
                            "|ProjectTask:" + internalId;
                        tasksById[internalId] = taskData;
                        if (parentId === 'N/A') {
                            // Parent task
                            custrecordArray.push(taskData);
                        } else {
                            // Child task
                            if (!childrenByParentId[parentId]) {
                                childrenByParentId[parentId] = [];
                            }
                            // Change label for child tasks
                            var childTaskData = taskData.replace("TaskName:", "ChildTask:");
                            childrenByParentId[parentId].push(childTaskData);
                        }
                    });
                    // Add children after their respective parent tasks
                    var finalOrder = [];
                    results.forEach(function(result) {
                        var parentId = result.getValue({ name: 'parent' }) || 'N/A';
                        var internalId = result.getValue({ name: 'internalid' });
                        if (parentId === 'N/A' && tasksById[internalId]) {
                            finalOrder.push(tasksById[internalId]);
                            // Add child tasks if they exist
                            if (childrenByParentId[internalId]) {
                                childrenByParentId[internalId].forEach(function(childTaskData) {
                                    finalOrder.push(childTaskData);
                                });
                            }
                        }
                    });
                    var custrecordArrayString = finalOrder.join("; ");
                    log.debug('CustRecordArrayString', custrecordArrayString);
                    record.submitFields({
                        type: record.Type.INVOICE,
                        id: recid,
                        values: {
                            custbody_task_details: custrecordArrayString
                        }
                    });
                    log.debug('Submit', 'Invoice updated with task data');
                } else {
                    log.debug('No Project ID', 'No project ID found on the invoice record');
                }
            } catch (e) {
                log.error('Error', e.name + ': ' + e.message);
            }
        }
    }
    return {
        afterSubmit: afterSubmit
    };
});
 
