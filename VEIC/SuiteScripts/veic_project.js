/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/record', 'N/log'], function(serverWidget, record, log) {

    function onRequest(context) {
        var projectId = 30061; // Replace with actual Project internal ID

        // Load the Project record
        var projectRecord = record.load({
            type: record.Type.JOB,
            id: projectId,
            isDynamic: true
        });

        // Get count of lines in the projecttask sublist
        var lineCount = projectRecord.getLineCount({
            sublistId: 'projecttask'
        });

        // Log the number of lines in the projecttask sublist
        log.debug('Line Count', 'Number of lines in projecttask sublist: ' + lineCount);

        // Loop through each line and fetch details
        for (var i = 0; i < lineCount; i++) {
            var lineNumber = projectRecord.getSublistValue({
                sublistId: 'projecttask',
                fieldId: 'linesequencenumber',
                line: i
            });

            var taskName = projectRecord.getSublistValue({
                sublistId: 'projecttask',
                fieldId: 'title',
                line: i
            });

            var startDate = projectRecord.getSublistValue({
                sublistId: 'projecttask',
                fieldId: 'startdate',
                line: i
            });

            var endDate = projectRecord.getSublistValue({
                sublistId: 'projecttask',
                fieldId: 'enddate',
                line: i
            });

            // Log each fetched detail
            log.debug('Project Task Line ' + lineNumber, 'Task Name: ' + taskName + ', Start Date: ' + startDate + ', End Date: ' + endDate);
        }

        context.response.write('Project tasks details logged successfully.');
    }

    return {
        onRequest: onRequest
    };

});
