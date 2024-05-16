/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(["N/record", "N/runtime", "N/https", "N/log", "N/search", 'N/error', "N/cache"], function (record, runtime, https, log, search, error, cache) {
    function ngAction(scriptContext) {
        var myRet = 0;
            //Added functionality to set the current user
            try {
                var sessionObj = runtime.getCurrentSession();  
                var currentrecord = scriptContext.newRecord;
                var recordid = currentrecord.id;
                search.create({
                  type: "customrecord_sdb_require_lock",
                  filter:["custrecord_sdb_sales_order_locked", "is", recordid]
                }).run().each(function(res) {
                  myRet = 1;
                  return true;
                })
            } catch (e) {
                log.error('Error setting Entered By', e.toString());
            }
      
        log.debug("My Ret: ", myRet)
return myRet;
    }
    return {
        onAction: ngAction
    }
});