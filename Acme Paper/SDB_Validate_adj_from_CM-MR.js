/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log", "N/config", "N/format"],
    /**
   * @param{record} record
   * @param{search} search
   */
    (record, search, log, config, format) => {
      
        const getInputData = (inputContext) => {
            try {
                var inventoryadjus = search.create({
                    type: "inventoryadjustment",
                    filters:
                    [
                       ["type","anyof","InvAdjst"], 
                       "AND", 
                       ["custbody_sdb_cm_associated.status","anyof","CustCred:V"], 
                       "AND", 
                       ["mainline","is","T"]
                    ],
                    columns:[]
                 });
            } catch (error) {
                log.error('Error getInputData',error)
            }
           
            return inventoryadjus;
        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);
               log.debug("json", json)

               
               var recordId = record.delete({
                type: record.Type.INVENTORY_ADJUSTMENT,
                id: json.id
            });

                log.debug("recordId deleted", recordId)
            } catch (e) {
                log.error({
                    title:'map Error',
                    details: e,
                })
            }
        }
        const reduce = (reduceContext) => {
        }
        const summarize = (summaryContext) => {
        }

        return { getInputData, map }
    });