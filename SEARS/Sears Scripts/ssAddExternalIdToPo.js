/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record', 'N/search', 'N/task', 'N/runtime'],
/**
 * @param {error} error
 * @param {record} record
 * @param {search} search
 * @param {task} task
 */
function(error, record, search, task, runtime) {
	var debug = null;
	const params = {
		search: 'custscript_po_search',
		debugEnabled: 'custscript_debug_enabled_po',
	};
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	log.audit("***STATUS***", "STARTED");

		debug = runtime.getCurrentScript().getParameter(
				params.debugEnabled);
		updatePurchaseOrders();

		log.audit("***STATUS***", "FINISHED");
    }
    
    function updatePurchaseOrders() {
		try {
			var search = createSearch();
			var recordsArray, recordToUpdate, updatedRecordId;

			var pageData = search.runPaged({
				pageSize : 400
			});
			log.audit('***STATUS***', 'PERFORMING SEARCH...');

			if (pageData) {
				pageRanges = pageData.pageRanges;
			}

			if (pageRanges.length > 0) {
				pageRanges.forEach(function(pageRange) {
					var page = pageData.fetch({
						index : pageRange.index
					});

					recordsArray = page.data;

					if (recordsArray && recordsArray.length > 0) {
						recordsArray.forEach(function(rec) {
							if (debug) {
								log.debug('***RECORD***', 'Record: ' + JSON.stringify(rec));
							}
							recordToUpdate = record.load({
									type : record.Type.PURCHASE_ORDER,
									id : rec.id,
									isDynamin : false
								});
							updatedRecordId = updateRecord(recordToUpdate);
							log.audit('***STATUS***', 'Updated Record ID: ' + updatedRecordId);
						});
					}
				});
			}
		} catch (e) {
			log.error("***UPDATE PURCHASE ORDERS***", e);
			throw e.toString();
		}
	}
    
    function updateRecord(rec) {
		checkForReSchedule();
		var tranid = rec.getValue({
			fieldId: 'tranid'
		});
		if (debug) {
			log.debug('***TRAND ID***', 'Trand id: ' + tranid);
		}
		rec.setValue({
			fieldId : 'externalid',
			value : tranid,
			ignoreFieldChange : true
		});
		return rec.save();
	}
    
    function createSearch() {
		checkForReSchedule();

		var searchId = runtime.getCurrentScript().getParameter(
				params.search);

		if (!searchId) {
			throw 'MISSING_REQUIRED_PARAMETER: '
					+ params.search;
		}

		var savedSearch = search.load({
			id : searchId
		});

		return savedSearch;
	}
    
    function checkForReSchedule() {
		var remainingUsage = runtime.getCurrentScript()
				.getRemainingUsage();

		if (remainingUsage <= 100) {
			var scriptid = runtime.getCurrentScript().id;
			var deploymentid = runtime.getCurrentScript().deploymentId;

			var mrTask = task.create({
				taskType : task.TaskType.SCHEDULED_SCRIPT
			});
			mrTask.scriptId = scriptid;
			mrTask.deploymentId = deploymentid;
			var mrTaskId = mrTask.submit();

			log.audit("***STATUS***",
					"USAGE LIMIT REACED. RESCHEDULED: " + mrTaskId);
		}
	}

    return {
        execute: execute
    };
    
});
