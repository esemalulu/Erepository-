/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/search'],
    (log, record, search) => {

        const updateCPLRecords = (item, optionsSubmit)=>{
            try {
                var customrecord_acme_cust_price_contract_lnSearchObj = search.create({
                    type: "customrecord_acme_cust_price_contract_ln",
                    filters:
                    [
                       ["custrecord_acme_cpc_line_item","anyof",item],
                    ],
                    columns:
                    [
                       search.createColumn({name: "internalid", label: "Internal ID"})
                    ]
                 });
                 customrecord_acme_cust_price_contract_lnSearchObj.run().each(function(result){
                    var cplRecordId = result.getValue({name:'internalid'});
                    log.debug("cplREcordIdUpdated",cplRecordId)
                    record.submitFields({
                        type: 'customrecord_acme_cust_price_contract_ln',
                        id: cplRecordId,
                        values: optionsSubmit,
                    })
                    return true;
                 });
            } catch (error) {
                log.error("updateCPLRecords",error);
            }
        }

        const afterSubmit = (scriptContext) => {
            try {
                var scriptContextType = scriptContext.type;
                log.debug(scriptContextType)
                var newRecord = scriptContext.newRecord;
                var oldRecord = scriptContext.oldRecord;
                if(scriptContextType == 'delete'){
                    var item = oldRecord.getValue('custrecord_sdb_acme_item');
                    log.debug("item Deleted",item);
                    if(!item)return;
                    var optionsSubmit = {};
                    optionsSubmit['custrecord_sap_code'] = null;
                    optionsSubmit['custrecord_sdb_item_upc_code'] = null;
                    updateCPLRecords(item, optionsSubmit)
                }else{
                    var item = newRecord.getValue('custrecord_sdb_acme_item');
                    if(!item)return;
                    var upcNewRecord = newRecord.getValue('custrecord_sdb_acme_upc')
                    var sapNewRecord = newRecord.getValue('custrecord_sdb_acme_sap')
                    log.debug("upcNewRecord " + upcNewRecord, "sapNewRecord " + sapNewRecord)
    
                    var upcOldRecord = oldRecord?.getValue('custrecord_sdb_acme_upc')
                    var sapOldRecord = oldRecord?.getValue('custrecord_sdb_acme_sap')
                    log.debug("upcOldRecord " + upcOldRecord, "sapOldRecord " + sapOldRecord)
    
                    //if(upcNewRecord == upcOldRecord && sapNewRecord == sapOldRecord)return;
    
                    var optionsSubmit = {};
                    if(sapNewRecord != sapOldRecord)optionsSubmit['custrecord_sap_code'] = sapNewRecord;
                    if(upcNewRecord != upcOldRecord)optionsSubmit['custrecord_sdb_item_upc_code'] = upcNewRecord;
                    optionsSubmit['custrecord_sap_code'] = sapNewRecord;
                    optionsSubmit['custrecord_sdb_item_upc_code'] = upcNewRecord;
                    
                    log.debug("item",item);
                    log.debug("optionsSubmit",optionsSubmit);
                    updateCPLRecords(item, optionsSubmit)
                }
            } catch (error) {
                log.error("afterSubmit error:",error);
            }
        }

        return {afterSubmit}

    });
