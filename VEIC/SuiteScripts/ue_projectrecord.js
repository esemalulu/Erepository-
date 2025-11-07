/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/search', 'N/ui/message', 'N/log'], function(currentRecord, search, message, log) {

    function pageInit(context) {
        if (context.mode === 'edit' || context.mode === 'view') { // Ensure we are in edit or view mode to fetch and update data
            var projectId = getProjectId(); // Retrieve the project ID dynamically
            
            if (projectId) {
                log.debug('Page Init', 'Mode: ' + context.mode + ', Project ID: ' + projectId);
                fetchProjectTasksAndDetails(projectId);
            } else {
                log.debug('Page Init', 'No Project ID found on the record.');
            }
        }
    }

    function getProjectId() {
        var invoiceRecord = currentRecord.get();
        // Replace 'custbody_project_id' with the actual field ID where the project ID is stored
        return invoiceRecord.getValue({
            fieldId: 'job' // Example field ID
        });
    }

    function fetchProjectTasksAndDetails(projectId) {
        log.debug('Fetch Project Tasks', 'Starting to fetch tasks for Project ID: ' + projectId);
        var tasksData = [];

        // Define filters for project tasks search
        var filters = [
            search.createFilter({
                name: 'project',
                operator: search.Operator.ANYOF,
                values: [projectId]
            })
        ];

        // Define columns to retrieve from project tasks
        var columns = [
            search.createColumn({ name: 'internalid', label: 'Internal ID' }), // Internal ID for lookup
            search.createColumn({ name: 'title', label: 'Task Name' }),
            search.createColumn({ name: 'custevent_cp_task_tcv', label: 'TCV' }), // Custom field TCV
            search.createColumn({ name: 'custevent_cp_task_pct_complete', label: 'Percent Complete' }) // Custom field Percent Complete
        ];

        // Create search object for project tasks
        var taskSearch = search.create({
            type: 'projecttask',
            filters: filters,
            columns: columns
        });

        // Run the search and process each result
        taskSearch.run().each(function(result) {
            var taskId = result.getValue({ name: 'internalid' });
            var taskName = result.getValue({ name: 'title' });
            var tcv = result.getValue({ name: 'custevent_cp_task_tcv' });
            var percentComplete = result.getValue({ name: 'custevent_cp_task_pct_complete' });

            log.debug('Task Found', 'Task ID: ' + taskId + ', Task Name: ' + taskName + ', TCV: ' + tcv + ', Percent Complete: ' + percentComplete);

            tasksData.push({
                taskName: taskName,
                tcv: tcv || 'N/A', // Default to 'N/A' if no value
                percentComplete: percentComplete || 'N/A' // Default to 'N/A' if no value
            });

            return true; // Continue to the next result
        });

        // Update custom field on the invoice record
        updateCustomField(tasksData);
    }

    function updateCustomField(tasksData) {
        var invoiceRecord = currentRecord.get();

        // Use the custom field ID custbody3
        var fieldId = 'custbody3';
      //  var tasksString = tasksData.map(function(task) {
          //  return 'Task: ' + task.taskName + ', TCV: ' + task.tcv + ', Percent Complete: ' + task.percentComplete;
       // }).join('; '); // Concatenate task details into a string

     // var tasksString = JSON.stringify(tasksData);

        log.debug('Update Custom Field', 'Setting value for custom field ' + fieldId + ': ' + tasksString);
var tasks = JSON.parse(tasksString);
                    record.setValue('custbody3', tasks);
                    record.save();
        // Set the custom field value
        invoiceRecord.setValue({
            fieldId: fieldId,
            value: tasks
        });

        // Optionally, show a message indicating success
        message.create({
            title: 'Success',
            message: 'Project tasks have been updated successfully.',
            type: message.Type.CONFIRMATION
        }).show();
    }

    return {
        pageInit: pageInit
    };
});
