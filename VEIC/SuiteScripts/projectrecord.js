/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/record'], function (search, record) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var projectId = context.request.parameters.projectId; // Get project ID from query parameters

            try {
                var tasksData = fetchProjectTasks(projectId);
                context.response.write(JSON.stringify(tasksData));
            } catch (e) {
                context.response.write('Error: ' + e.message);
            }
        }
    }

    function fetchProjectTasks(projectId) {
        var tasksData = [];

        // Define filters for project tasks search
        var filters = [
            search.createFilter({
                name: 'company',
                operator: search.Operator.ANYOF,
                values: [30061]
            })
        ];

        // Define columns to retrieve from project tasks
        var columns = [
            search.createColumn({ name: 'title', label: 'Task Name' }),
        
        ];

        // Create search object for project tasks
        var taskSearch = search.create({
            type: 'projecttask',
            filters: filters,
            columns: columns
        });

        // Run the search and process each result
        taskSearch.run().each(function (result) {
            var taskName = result.getValue({
                name: 'title'
            });
           
            tasksData.push({
                taskName: taskName
               
            });

            return true; 
        });

        return tasksData; 
    }

    return {
        onRequest: onRequest
    };
});
