/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 * Task          Date                Author                                         Remarks
 */

define(["N/record", "N/runtime", "N/search"], function (
  record,
  runtime,
  search
) {
  function execute(context) {
    try {
      var customrecord_sdb_require_lockSearchObj = search.create({
        type: "customrecord_sdb_require_lock",
        filters: [
          ["custrecord_sdb_sales_order_locked", "noneof", "@NONE@"],
          "AND",
          ["created", "before", "minutesago45"],
        ],
        columns: [
          search.createColumn({
            name: "scriptid",
            sort: search.Sort.ASC,
            label: "Script ID",
          }),
          search.createColumn({ name: "created", label: "Date Created" }),
        ],
      });

      var searchResultCount =
        customrecord_sdb_require_lockSearchObj.runPaged().count;
      log.debug(
        "customrecord_sdb_require_lockSearchObj result count",
        searchResultCount
      );
      customrecord_sdb_require_lockSearchObj.run().each(function (result) {
        try {
          var recordId = record.delete({
            type: "customrecord_sdb_require_lock",
            id: result.id,
          });
          log.debug("recordId deleted", recordId);
        } catch (error) {
          log.debug("error deleting the record", error);
        }
        return true;
      });
    } catch (e) {
      log.error("error at execute", e);
    }
  }

  return {
    execute: execute,
  };
});
