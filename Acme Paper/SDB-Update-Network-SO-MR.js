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
                let searchId = scriptObj.getParameter({ name: 'custscript_sdb_search_network_so' });
                return search.load({
                    id: searchId
                });
            } catch (e) {
                log.error({
                    title: "ERROR",
                    details: e,
                })
            }
        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);



                
                var salesorder = record.load({
                    type: json.recordType,
                    id: mapContext.key
                });
                var idSaved = salesorder.save({
                    ignoreMandatoryFields: true
                });
                log.debug("idSaved", idSaved)
                return;
                // search.create({
                //     type: "transaction",
                //     filters: [["createdfrom", "is", mapContext.key], "AND", ["mainline", "is", "T"]]
                // }).run().each(function (res) {
                //     log.debug("res: ", res);
                //     var poId = record.delete({
                //         type: res.recordType,
                //         id: res.id,
                //     });
                //     log.debug("poId: ", poId)
                //     return true;
                // })
                // var itemsDelete = record.delete({
                //     type: json.recordType,
                //     id: mapContext.key,
                // });

                log.debug("Record id deleted", itemsDelete)
            } catch (e) {
                log.error({
                    title: "MAP ERROR",
                    details: e,
                })
            }
        }
        return { getInputData, map }
    });