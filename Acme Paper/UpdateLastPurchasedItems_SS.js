
var REC_LASTPURCHASEDITEMPERCUSTOME = 'customrecord_lastpurchaseditempercustome'; 
var FLD_LPIPC_CUSTOMER = 'custrecord_lpipc_customer'; 
var FLD_LPIPC_ITEM = 'custrecord_lpipc_item'; 
var FLD_LPIPC_UNITCOST = 'custrecord_lpipc_unitcost'; 
var FLD_LPIPC_SELLINGPRICE = 'custrecord_lpipc_sellingprice'; 
var FLD_LPIPC_SALESORDER = 'custrecord_lpipc_salesorder'; 
var FLD_LPIPC_ORDERDATE = 'custrecord_lpipc_orderdate'; 

var SPARAM_SELECTED_CUSTOMER = 'custscript_selected_customer';

/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log', 'N/format', 'N/runtime'], function(search, record, log, format, runtime) {
    
    function getLastPurchasedItems(idParamCustomer) {
        var oData = {};
        var oSearch;
        var aSSFilter = [];
        if(idParamCustomer) {
            aSSFilter.push({
                name: FLD_LPIPC_CUSTOMER,
                operator: 'is',
                values: idParamCustomer
            });
        }
        
        oSearch = search.create({
            type: REC_LASTPURCHASEDITEMPERCUSTOME,
            columns: [
                 search.createColumn({
                     name: 'internalid',
                     sort: search.Sort.ASC
                 }),
                FLD_LPIPC_CUSTOMER,
                FLD_LPIPC_ITEM,
                FLD_LPIPC_UNITCOST,
                FLD_LPIPC_SELLINGPRICE,
                FLD_LPIPC_SALESORDER,
                FLD_LPIPC_ORDERDATE
            ],
            filters: aSSFilter
        });
        
        var aPagedData = oSearch.runPaged({pageSize : 1000});
        for(var i=0; i < aPagedData.pageRanges.length; i++ ) {
            var aCurrentPage = aPagedData.fetch(i);
            aCurrentPage.data.forEach( function(oItem) {
                
                if(!oData[oItem.getValue(FLD_LPIPC_CUSTOMER)]) {
                    oData[oItem.getValue(FLD_LPIPC_CUSTOMER)] = {};
                }
                
                oData[oItem.getValue(FLD_LPIPC_CUSTOMER)][oItem.getValue(FLD_LPIPC_ITEM)] = {
                    internal_id: oItem.getValue('internalid'), 
                    salesorder_id: oItem.getValue(FLD_LPIPC_SALESORDER), 
                    orderdate: oItem.getValue(FLD_LPIPC_ORDERDATE), 
                    customer_id: oItem.getValue(FLD_LPIPC_CUSTOMER), 
                    item_id: oItem.getValue(FLD_LPIPC_ITEM), 
                    sellingprice: !isNaN(parseFloat(oItem.getValue(FLD_LPIPC_SELLINGPRICE))) ? parseFloat(oItem.getValue(FLD_LPIPC_SELLINGPRICE)) : 0, 
                    cost: !isNaN(parseFloat(oItem.getValue(FLD_LPIPC_UNITCOST))) ? parseFloat(oItem.getValue(FLD_LPIPC_UNITCOST)) : 0, 
                };
            });

        }
                                      
        return oData;
    }
    
    function execute(context) {
        var oData = {};
        var aSSFilter = [];
        var oUpdatData;
        var idParamCustomer = runtime.getCurrentScript().getParameter({
            name : SPARAM_SELECTED_CUSTOMER
        });
        var oCurrent = getLastPurchasedItems(idParamCustomer);
        
        log.audit({
            title: 'RUNTIME',
            details: 'Customer ID: '+idParamCustomer
        });
        
        aSSFilter = [
            {
                name: 'type',
                operator: 'is',
                values: 'SalesOrd'
            },
            {
                name: 'mainline',
                operator: 'is',
                values: 'F'
            },
            {
                name: 'taxline',
                operator: 'is',
                values: 'F'
            },
            {
                name: 'shipping',
                operator: 'is',
                values: 'F'
            },
            {
                name: 'type',
                join: 'item',
                operator: 'anyof',
                values: ['InvtPart','Group','Kit','NonInvtPart','OthCharge','Service']
            },
            {
                name: 'isinactive',
                join: 'item',
                operator: 'is',
                values: 'F'
            }
        ];
        
        if(idParamCustomer) {
            aSSFilter.push({
                name: 'entity',
                operator: 'is',
                values: idParamCustomer
            });
        }
        
        var oSearch = search.create({
            type: search.Type.TRANSACTION,
            columns: [
                 search.createColumn({
                     name: 'internalid',
                     sort: search.Sort.ASC
                 }),
                'tranid',
                'trandate',
                'entity',
                'item',
                'rate',
                'costestimaterate'
            ],
            filters: aSSFilter
        });
        
        var aPagedData = oSearch.runPaged({pageSize : 1000});
        for(var i=0; i < aPagedData.pageRanges.length; i++ ) {
            var aCurrentPage = aPagedData.fetch(i);
            aCurrentPage.data.forEach( function(oItem) {
                
                if(!oData[oItem.getValue('entity')]) {
                    oData[oItem.getValue('entity')] = {};
                }
                
                oData[oItem.getValue('entity')][oItem.getValue('item')] = {
                    document_number: oItem.getValue('tranid'), 
                    salesorder_id: oItem.getValue('internalid'), 
                    orderdate: oItem.getValue('trandate'),  
                    customer_id: oItem.getValue('entity'), 
                    item_id: oItem.getValue('item'), 
                    sellingprice: !isNaN(parseFloat(oItem.getValue('rate'))) ? parseFloat(oItem.getValue('rate')) : 0, 
                    cost: !isNaN(parseFloat(oItem.getValue('costestimaterate'))) ? parseFloat(oItem.getValue('costestimaterate')) : 0, 
                };
            });

        }
        
        for(var idCustomer in oData) {
            if(oData.hasOwnProperty(idCustomer)) {
                
                for(var idItem in oData[idCustomer]) {
                    if(oData[idCustomer].hasOwnProperty(idItem)) {
                        
                        if(!oCurrent[idCustomer] || !oCurrent[idCustomer][idItem] || !oCurrent[idCustomer][idItem].internal_id) {
                            
                            //create record
                            var oRec = record.create({type: REC_LASTPURCHASEDITEMPERCUSTOME,isDynamic: true});
                            var idRec;
                            
                            oRec.setValue({fieldId: FLD_LPIPC_CUSTOMER,value: oData[idCustomer][idItem].customer_id});
                            oRec.setValue({fieldId: FLD_LPIPC_ITEM,value: oData[idCustomer][idItem].item_id});
                            oRec.setValue({fieldId: FLD_LPIPC_UNITCOST,value: oData[idCustomer][idItem].cost});
                            oRec.setValue({fieldId: FLD_LPIPC_SELLINGPRICE,value: oData[idCustomer][idItem].sellingprice});
                            oRec.setValue({fieldId: FLD_LPIPC_SALESORDER,value: oData[idCustomer][idItem].salesorder_id});
                            oRec.setValue({fieldId: FLD_LPIPC_ORDERDATE,value: format.parse({
                                value: oData[idCustomer][idItem].orderdate,
                                type: format.Type.DATE
                            })});
                            
                            idRec = oRec.save();
                            
                            log.audit({
                                title: 'CREATE',
                                details: 'Customer ID: '+oData[idCustomer][idItem].customer_id+'; Item ID: '+oData[idCustomer][idItem].item_id+'; ID: '+idRec
                            });
                        } else if(oCurrent[idCustomer][idItem].salesorder_id != oData[idCustomer][idItem].salesorder_id
                                 || oCurrent[idCustomer][idItem].sellingprice.toFixed(2) != oData[idCustomer][idItem].sellingprice.toFixed(2)
                                 || oCurrent[idCustomer][idItem].cost.toFixed(2) != oData[idCustomer][idItem].cost.toFixed(2)
                                 || oCurrent[idCustomer][idItem].orderdate != oData[idCustomer][idItem].orderdate
                                 ) {
                            
                            oUpdatData = {};
                            oUpdatData[FLD_LPIPC_UNITCOST] = oData[idCustomer][idItem].cost;
                            oUpdatData[FLD_LPIPC_SELLINGPRICE] = oData[idCustomer][idItem].sellingprice;
                            oUpdatData[FLD_LPIPC_SALESORDER] = oData[idCustomer][idItem].salesorder_id;
                            oUpdatData[FLD_LPIPC_ORDERDATE] = oData[idCustomer][idItem].orderdate;
                            //update record
                            record.submitFields({
                                type: REC_LASTPURCHASEDITEMPERCUSTOME,
                                id: oCurrent[idCustomer][idItem].internal_id,
                                values: oUpdatData
                            });
                            
                            log.audit({
                                title: 'UPDATE',
                                details: 'Customer ID: '+oData[idCustomer][idItem].customer_id+'; Item ID: '+oData[idCustomer][idItem].item_id+'; ID: '+oCurrent[idCustomer][idItem].internal_id
                            });
                        }
                    }
                }
            }
        }
    }
    
    return {
        execute: execute
    };
});