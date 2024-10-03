/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/search'], (log, record, search) => {
        function beforeLoad(scriptContext) {
            try {
                const itemRec = scriptContext.newRecord;
                log.debug("itemRec", itemRec);
                if(itemRec){
                    setSapCodeInItem(itemRec);
                }
            } catch (e) {
                log.error('Error beforeLoad', e);
            }
        }

    /**
     * This function was created for the task https://app.clickup.com/t/86b0yu3tz,
     * since they want to see the SAP CODE into History View sublist
     * @param {object} itemRec
     * @return {void}
     */
        function setSapCodeInItem(itemRec){
            try{
                const itemId = itemRec.id;
                let sapToSet = getSapCodeByItem(itemId);
                if(sapToSet) record.submitFields({
                    type: itemRec.type,
                    id: itemRec.id,
                    values: {custitem_acc_sap_code: sapToSet},
                });
            } catch (e) {
                log.error("error in setSapCodeInItem", e);
            }
        }

        function getSapCodeByItem(itemId){
            try {
                let sapToReturn = "";
                if(itemId){
                    let customrecord_sdb_acme_upc_sap_uomSearchObj = search.create({
                        type: "customrecord_sdb_acme_upc_sap_uom",
                        filters: [["custrecord_sdb_acme_item","anyof",itemId]],
                        columns: [search.createColumn({name: "custrecord_sdb_acme_sap", label: "SAP Code"}),]
                    });
                    customrecord_sdb_acme_upc_sap_uomSearchObj.run().each(function(result){
                        log.debug("result value", result.getValue("custrecord_sdb_acme_sap"));
                        sapToReturn = result.getValue("custrecord_sdb_acme_sap");
                        return false;
                    });
                }
                return sapToReturn;
            } catch (e) {
                log.error("ERROR in getSapCodeByItem", e);
            }
        }

        return {
            beforeLoad: beforeLoad
        }
    });

