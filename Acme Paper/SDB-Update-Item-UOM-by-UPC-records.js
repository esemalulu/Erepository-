/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/search'],
    (log, record, search) => {

        const getInputData = (inputContext) => {
            try {
                log.debug("STATUS",'init script')
              
                var customrecord_sdb_acme_upc_sap_uomSearchObj = search.create({
                    type: "customrecord_sdb_acme_upc_sap_uom",
                    filters:
                    [
                        ["custrecord_sdb_upc_sap_codes_triggered","is","F"]
                    ],
                    columns:
                    [
                       search.createColumn({name: "internalid", label: "Internal ID"}),
                    ]
                 });
                 return customrecord_sdb_acme_upc_sap_uomSearchObj;
            } catch (error) {
                log.error("getInputData error",error)
            }
        }
       

        const map = (mapContext) => {
            try {
                var recordId = mapContext.key;
                log.debug("RECORD LOADED",recordId)
                var upc_by_uom_record = record.load({
                    type: 'customrecord_sdb_acme_upc_sap_uom',
                    id: recordId,
                    isDynamic: true,
                })
                upc_by_uom_record.setValue('custrecord_sdb_upc_sap_codes_triggered',true);
                var id_saved = upc_by_uom_record.save({ ignoreMandatoryFields: true });
                log.audit("RECORD UPDATED: ",id_saved);
            } catch (error) {
                log.error("map error",error);
            }
        }

        return {getInputData, map}

    });
