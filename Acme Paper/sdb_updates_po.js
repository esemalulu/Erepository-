/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log", "N/runtime"],
    /**
   * @param{record} record
   * @param{search} search
   */
    (record, search, log, runtime) => {
        const getInputData = () => {
            try {
                var scriptObj = runtime.getCurrentScript();
                var ids = scriptObj.getParameter({ name: 'custscript_sdb_arr_ids' });
                if (!ids) return [];
                ids = JSON.parse(ids);
                log.debug("POs to update: ", ids.length);
                var count = 0;
                var totalUpdates = 0;
                var totalFailes = 0;
                var noChanges = 0;
                var errorIds = [];
                ids.forEach(function (id) {
                    try {
                        var hasUpdate = false;
                        var transaction = record.load({ type: "purchaseorder", id: id, isDynamic: true });
                        var actualLocation = transaction.getValue("location");
                        var lineItemCount = transaction.getLineCount("item");
                        for (var i = 0; i < lineItemCount; i++) {
                            transaction.selectLine({ sublistId: 'item', line: i });
                            var currentLocation = transaction.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                line: i
                            });
                            var itemId = transaction.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            });
                            if (!currentLocation) {
                                transaction.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'location',
                                    value: actualLocation,
                                    ignoreFieldChange: true
                                });
                                transaction.commitLine("item");
                                log.debug("Line Updated: ", { id, itemId });
                                hasUpdate = true;
                                totalUpdates++;
                            }

                        }
                        if (hasUpdate) var idupdate = transaction.save({ ignoreMandatoryFields: true });
                        if (!hasUpdate) noChanges++;
                        log.debug({ hasUpdate, idupdate });
                    } catch (error) {
                        log.error("ERROR: ", error)
                        totalFailes++;
                        errorIds.push(id);
                    }
                    log.debug(count++);
                });
                log.debug("POs to update: ", ids.length);
                log.debug("REPORT: ", { totalUpdates, totalFailes, noChanges });
                log.debug("errorIds: ", errorIds);
                return [];
            } catch (e) {
                log.error("error: ", e);
            }
        }
        function map(context) {
            return;
        }
        return { getInputData, map }
    });