/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */


define(['N/search','N/record',"N/format" ], function(search, record,format) {

    function getInputData(context){

        try {
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                   ["mainline","is","T"], 
                   "AND", 
                   ["location","noneof","@NONE@"], 
                   "AND", 
                   ["custbody_warehouse_roadnet","noneof","@NONE@"], 
                   "AND", 
                   ["formulatext: case when {location} != {custbody_warehouse_roadnet} then 'Different' else 'Equals' end","is","Different"], 
                   "AND", 
                   ["custbody_dropship_order","is","F"], 
                   "AND", 
                   ["type","anyof","SalesOrd"]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "internalid",join: "customerMain",label: "Internal ID"}),
                ]
             });
             var searchResultCount = salesorderSearchObj.runPaged().count;
             log.debug("salesorderSearchObj result count",searchResultCount);
            return salesorderSearchObj;
        } catch (error) {
            log.error('getInputData',error)
        }
    }
    function map(context){
        try {
            var contextValue = JSON.parse(context.value)
            var customerId   = contextValue?.values['internalid.customerMain']?.value;
            context.write({
                key: context.key,
                value: {
                    customerId:customerId,
                }
            });
            
        } catch (error) {
            log.error('map',error)
        }
    }

    function reduce(context){
        try {
            var contextValues = JSON.parse(context.values)
            var orderId = context.key;
            var customerId = contextValues.customerId
            var warehouseToSet = getWarehouseFromAddress(customerId)
           

            record.submitFields({
                type: record.Type.SALES_ORDER,
                id: orderId,
                values: {
                    'custbody_warehouse_roadnet':warehouseToSet,
                },       
            })
        } catch (error) {
            log.error('reduce',error)
        }
    }

    

    function getWarehouseFromAddress(customerId){
        try {
            var customerSearchObj = search.create({
                type: "customer",
                filters:
                    [
                        ["internalid", "anyof", customerId],
                        "AND",
                        ["isdefaultshipping", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_ship_zone",
                            join: "shippingAddress",
                            label: "Ship Zone"
                        }),
                        search.createColumn({ name: "custentity_warehouse", label: "Warehouse" })
                    ]
            });
            var shippingWarehouse;
            var customerWarehouse;
            var warehouse;
            customerSearchObj.run().each(function (result) {
                shippingWarehouse = result.getValue({ name: "custrecord_ship_zone", join: "shippingAddress" })
                customerWarehouse = result.getValue("custentity_warehouse")
                return false;
            });
            warehouse =  shippingWarehouse ?? customerWarehouse;
            return warehouse;
        } catch (error) {
            log.error('getWarehouseFromAdderss',error)
        }
    }


    return{
        getInputData:getInputData,
        map:map,
        reduce:reduce,
    }
    
});