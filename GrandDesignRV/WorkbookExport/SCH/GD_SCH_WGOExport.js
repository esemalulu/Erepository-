/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/task', 'N/runtime', 'N/format', '../lib/GD_LIB_Constants'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{task} task
     * @param{runtime} runtime
     * @param Constants
     */
    (record, search, task, runtime, format, Constants) => {

        const getSearchInternalId = (savedSearchId) => {
            if(!savedSearchId) {
                return 0;
            }
            const searchObj = search.create({
                type: 'savedsearch',
                filters:
                    [
                        ['id', 'is', savedSearchId]
                    ],
                columns:
                    [
                        search.createColumn({name: 'title', label: 'Title'}),
                        search.createColumn({name: 'id', label: 'ID'}),
                        search.createColumn({name: 'recordtype', label: 'Type'}),
                        search.createColumn({name: 'owner', label: 'Owner'}),
                    ]
            });
           const results = searchObj.run().getRange({start: 0, end: 1});
           if(results.length > 0) {
               return results[0].id;
           }            
           return 0;
        }
        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            // Get which deployment is running
            try {
                const deploymentId = runtime.getCurrentScript().deploymentId;
                log.debug('DEPLOYMENT ID', deploymentId);
                let uploadDeploymentId, savedSearchId, searchInternalId, folderPath, filename;
                const scheduledScript = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT
                });
                scheduledScript.scriptId = Constants.WGO_SCH_UPLOAD.scriptId;
                const todaysDate = format.format({
                    value: new Date(),
                    type: format.Type.DATE
                }).replaceAll('/', '.');
                log.debug('TODAYS DATE', todaysDate);
                switch (deploymentId) {
                    case Constants.WGO_SCH_EXPORT_DEPLOYMENTS.vendorMaster:
                        uploadDeploymentId = Constants.WGO_SCH_UPLOAD.vendorMaster;
                        savedSearchId = Constants.WGO_SEARCHES.VENDOR_MASTER_SEARCH;
                        folderPath = '/WGO Exports/Vendor Master/';
                        filename = `WGO Vendor Master ${todaysDate}.csv`;
                        break;
                    case Constants.WGO_SCH_EXPORT_DEPLOYMENTS.itemMaster:
                        uploadDeploymentId = Constants.WGO_SCH_UPLOAD.itemMaster;
                        savedSearchId = Constants.WGO_SEARCHES.ITEM_MASTER_SEARCH;
                        folderPath = '/WGO Exports/Item Master/';
                        filename = `WGO Item Master ${todaysDate}.csv`;
                        break;
                    case Constants.WGO_SCH_EXPORT_DEPLOYMENTS.itemReceipt:
                        uploadDeploymentId = Constants.WGO_SCH_UPLOAD.itemReceipt;
                        savedSearchId = Constants.WGO_SEARCHES.ITEM_RECEIPT_SEARCH;
                        folderPath = '/WGO Exports/Item Receipt/';
                        filename = `WGO Item Receipt ${todaysDate}.csv`;
                        break;
                }
                scheduledScript.deploymentId = uploadDeploymentId;
                log.debug('UPLOAD DEPLOYMENT ID', uploadDeploymentId);
                log.debug('SAVED SEARCH ID', savedSearchId);
                log.debug('FOLDER PATH', folderPath);
                searchInternalId = getSearchInternalId(savedSearchId);
                log.debug('SEARCH INTERNAL ID', searchInternalId);
                if (searchInternalId) {
                    const searchTask = task.create({
                        taskType: task.TaskType.SEARCH
                    });
                    searchTask.addInboundDependency(scheduledScript);
                    searchTask.savedSearchId = Number(searchInternalId);
                    searchTask.filePath = folderPath + filename;
                    const taskId = searchTask.submit();
                    log.debug('TASK ID', taskId);
                }
            } catch (e) {
                log.error('ERROR', e.message);
            }
        }

        return {execute}

    });
