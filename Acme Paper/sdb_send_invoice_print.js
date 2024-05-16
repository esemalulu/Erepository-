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
                let searchId = "customsearch_sdb_send_print_invoice_bluk";
                return search.load({
                    id: searchId
                });
            } catch (e) {
                log.error("getInputData ERROR", e);
            }
        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);
                var transaction = record.load({
                    type: json.recordType,
                    id: mapContext.key
                });
                var idSaved = transaction.save({
                    ignoreMandatoryFields: true
                });
                log.debug("transaction saved: ", idSaved);
            } catch (e) {
                log.error("map ERROR", e)
            }
        }
        return { getInputData, map }
    });