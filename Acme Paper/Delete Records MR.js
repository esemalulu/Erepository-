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
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
          
         
            return search.load({
                id: "customsearch5543",//customsearch5547 customsearch5543
                //   let mySearch = search.load({
                //       id: "customsearch_sdb_delete_items"
            });

            // return mySearch;
        }

        const map = (mapContext) => {
            try {
                log.audit("mapContext: ", mapContext);
                var json = JSON.parse(mapContext.value);
                log.debug("json", json)
                log.debug("json.values[GROUP(internalid)]", json.values["GROUP(internalid)"].value)

                //  var ss = search.create({
                //    type: "transaction",
                //    filters: [["createdfrom", "is", mapContext.key],"AND",["mainline", "is", "T"]]
                //  }).run().each(function(res){
                //    log.debug("res: ", res);
                //    var poId = record.delete({
                //      type: res.recordType,
                //      id: res.id,
                //  });
                //     log.debug("poId: ", poId)
                //    return true;
                //  })
                var itemsDelete = record.load({
                    type: "invoice",//json.values["GROUP(type)"].text,
                    id: json.values["GROUP(internalid)"].value,
                });

                var recordId = itemsDelete.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                log.debug("recordId", recordId)
            } catch (e) {
                log.error({
                    title: "error map",
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