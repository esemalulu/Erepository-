/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/task'], function(record, search, runtime, task) {
    function execute(context) {
        var script = runtime.getCurrentScript();
        var lastProcessedItemId = script.getParameter({ name: 'custscript_last_processed_item_id' }) || 0;
        var maxRecordsPerCycle = 500; // Adjust this value as per your script's usage limits

        // Define search for items
        var itemSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['type', search.Operator.ANYOF, ['InvtPart']], // Filter for inventory items
                'AND',
                ['isinactive', search.Operator.IS, false], // Filter for active items only
                'AND',
                ['internalidnumber', 'greaterthan', lastProcessedItemId] // Process items with IDs greater than the last processed ID
            ],
            columns: [
                'internalid',
                'custitem_item_market_cost',
                'custitem_item_burden_percent',
                'custitem_extra_handling_cost',
                'custitem_extra_handling_cost_2'
            ]
        });

        var processedRecords = 0;
        itemSearch.run().each(function(result) {
            if (processedRecords >= maxRecordsPerCycle) {
                return false; // Exit the loop if max records per cycle reached
            }

            var itemId = result.getValue({ name: 'internalid' });
            var marketCost = parseFloat(result.getValue({ name: 'custitem_item_market_cost' })) || 0;
            var burdenPercent = parseFloat(result.getValue({ name: 'custitem_item_burden_percent' })) || 0;
            var extraHandling1 = parseFloat(result.getValue({ name: 'custitem_extra_handling_cost' })) || 0;
            var extraHandling2 = parseFloat(result.getValue({ name: 'custitem_extra_handling_cost_2' })) || 0;

            // Calculate and round the custom field value
            var customFieldValue = ((marketCost + (marketCost * (burdenPercent / 100))) + extraHandling1 + extraHandling2).toFixed(2);

            // Load and update the item record
            var itemRecord = record.load({
                type: record.Type.INVENTORY_ITEM,
                id: itemId
            });
            itemRecord.setValue({
                fieldId: 'custitem_ifd_price_level_cost',
                value: customFieldValue
            });
            itemRecord.save();

            // Update the last processed item ID
            lastProcessedItemId = itemId;
            processedRecords++;
            return true;
        });

        // Reschedule the script if there are more records to process
        if (processedRecords >= maxRecordsPerCycle) {
            rescheduleScript(lastProcessedItemId);
        }
    }

    // Function to reschedule the script
    function rescheduleScript(lastProcessedItemId) {
        var scriptTask = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: runtime.getCurrentScript().id,
            deploymentId: runtime.getCurrentScript().deploymentId,
            params: { 'custscript_last_processed_item_id': lastProcessedItemId }
        });
        var taskId = scriptTask.submit();
        log.audit({
            title: 'Script Rescheduled',
            details: 'Task ID: ' + taskId
        });
    }

    return {
        execute: execute
    };
});
