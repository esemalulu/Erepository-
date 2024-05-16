/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log"],
    /**
   * @param{record} record
   * @param{search} search
   */
    (record, search, log) => {
        const getInputData = () => {
            try {
                var arrNames = ["500015", "R500178", "R500193", "R500195", "R500197", "R500310", "R500431", "461173", "R032612", "R032613", "R032666", "R032669", "R310052", "R310053", "R310054", "R330935", "R330936", "R330937", "R330939", "R330940", "R330941", "R031520", "R031522", "R031523", "R031524", "R031525", "R031526", "R031528", "R031529", "R031530", "R031531", "451208", "460211", "R130400", "R130401", "R130402", "R130403", "R130419", "R130435", "R130437", "R130486", "051341", "050355", "052356", "051358", "050598", "052805", "R050362", "RMIS125", "R100342", "R100344", "R100345", "R100346", "R100347", "R100354", "513389", "452903", "452909", "452910", "R450065", "R463207", "371215", "371216", "R120114", "R120117", "R120531", "R123502", "372217", "450887", "458942", "461167", "461375", "R450282", "511911", "R989702", "R450025", "R150618", "R450249", "R460090", "088136", "088461", "088462", "908045", "908046", "R088334", "R088437", "R088613", "R089334", "R159157", "R212806"]
                var arrIds = getArrIds(arrNames);
                log.audit("arrNames length", arrNames.length);
                log.audit("arrIds length", arrIds.length);
                var searchToReturn = search.create({
                    type: "customrecord_sdb_acme_upc_sap_uom",
                    filters: ["custrecord_sdb_acme_item", "anyof", arrIds],
                    columns: ["custrecord_sdb_acme_upc"]
                });
                log.audit("searchToReturn length", searchToReturn.runPaged().count);
                return searchToReturn;
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
                log.debug("json", json);
                record.submitFields({
                    type: "customrecord_sdb_acme_upc_sap_uom",
                    id: json.id,
                    values: {
                        custrecord_sdb_acme_upc: ""
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            } catch (e) {
                log.error({
                    title: "MAP ERROR",
                    details: e,
                })
            }
        }

        function getArrIds(arrNames) {
            var arrIds = [];
            arrNames.forEach(item => {
                var itemSearchObj = search.create({
                    type: "item",
                    filters:
                        [
                            ["name", "haskeywords", item]
                        ],
                    columns: []
                });
                itemSearchObj.run().each(function (result) {
                    // log.debug("item: ", item + " - " + result.id)
                    arrIds.push(result.id)
                    return false;
                });
            });
            return arrIds;
        }

        return { getInputData, map }
    });