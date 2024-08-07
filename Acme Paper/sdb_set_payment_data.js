/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/search'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{search} search
 */
    (log, record, search) => {

        const beforeLoad = (scriptContext) => {
            try {
                
            } catch (error) {
                log.error("BeforeLoad ERROR",error)
            }
        }

 
        const beforeSubmit = (scriptContext) => {
            try {
                var newRecord = scriptContext.newRecord;
                var applyLineCount = newRecord.getLineCount({sublistId: 'apply'})
                log.debug("applyCount",applyLineCount);


            } catch (error) {
                log.erorr("BeforeSubmit ERROR:", error);
            }
        }


        return {beforeLoad, beforeSubmit}

    });
