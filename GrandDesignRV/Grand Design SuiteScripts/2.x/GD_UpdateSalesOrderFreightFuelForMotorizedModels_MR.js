/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/query', 'N/record', 'N/runtime', './GD_Constants'],
    /**
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 */
    (query, record, runtime, constants) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * 
         * Receives motorized model id from GD_Item_UE.js.
         *   Passes the following to map():  country of dealer, sales order id, model id, 
         *      US freight rate, Canadian freight rate.
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

        let modelId = JSON.parse(runtime.getCurrentScript().getParameter({
                name: 'custscriptgd_modelids'
            })); 

        modelId = parseFloat(modelId);

        // Finds following data relative to each existing sales order for the current model:
            // country of dealer, sales order id, model id.  Gets US freight rate and Canadian freight rate
            // from model record.
        let salesOrderQuery = `
            SELECT  
                custentitygd_dlrloccountry as country, 
                customer.id as dealer, 
                transaction.id as soid, 
                transaction.custbodyrvsmodel as model, 
                item.custitemgd_usfreightrate as usfreigt, 
                item.custitemgd_canadafreightrate as canadianfreight,
                customer.custentityrvsmiles as mileage,
                customer.custentityrvstollsandpermits as tollspermits,
                customer.custentityrvswash as wash
            FROM
                Item
                INNER JOIN
                    Transaction ON transaction.custbodyrvsmodel = item.id			
                INNER JOIN
                    Customer on transaction.entity = customer.id		
            WHERE
                transaction.recordtype = 'salesorder'
                AND
                    item.id = ${modelId}
                AND
                    customer.custentitygd_dlrloccountry IN (37, 230);
            `
        const results = query.runSuiteQLPaged({
            query: salesOrderQuery
        });
        
        let salesOrderArray = [];
        let resultIterator = results.iterator();
        resultIterator.each(function(page) {
            let pageIterator = page.value.data.iterator();
            pageIterator.each(function(row) {
                salesOrderArray.push({
                        country: row.value.values[0],
                        dealer: row.value.values[1],
                        salesOrderId: row.value.values[2],
                        model: row.value.values[3],
                        usFreight: row.value.values[4],
                        canadianFreight: row.value.values[5],
                        mileage: row.value.values[6],
                        tollsAndPermits: row.value.values[7],
                        wash: row.value.values[8],
                });
                
                return true;
            });

            return true;
        });

            return salesOrderArray;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * 
         * If rate for freight has changed on a unit model, updates all sales orders for that model with the new rate.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */
        const map = (mapContext) => {

            //Is passed model id, sales order ids, country of dealer, and freight rates.
            let salesOrderData = JSON.parse(mapContext.value);
            let country = salesOrderData.country;
            let usFreight = salesOrderData.usFreight;            
            let canadianFreight = salesOrderData.canadianFreight;
            let salesOrderId = salesOrderData.salesOrderId;
            let mileage = parseFloat(salesOrderData.mileage) || 0;
            let tollsAndPermits = parseFloat(salesOrderData.tollsAndPermits) || 0;
            let wash = parseFloat(salesOrderData.wash) || 0;

            let freight = '';
        
            // If it has, grabs and sets correct rate from unit record, based on
                // country of dealer.               
            if (country == constants.GD_CANADA) {
                freight = canadianFreight;
            }
            else {
                freight = usFreight;
            }

            //Calculates final freight charge by factoring in mileage, tolls/permits, and wash.
            let calculatedFreight = (freight * mileage) + tollsAndPermits + wash;

            // Tries up to 5 times to set new total freight charge on Sales Orders
            //      before throwing an error.
            let maxTryCount = 5;
            let tryCount = 1;
            
            while(tryCount < maxTryCount) {
                try{		
                    UpdateSalesOrders(salesOrderId, calculatedFreight);
                    
                    break;
                }
                catch(err) {
                    if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
                        log.audit('Collision or Changed Error', err.name);
                        tryCount++;
            
                        continue;
                    }
                }   
            }
        }     
        

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */

        const reduce = (reduceContext) => {
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
        }

    
        /**
         * Updates the specified sales orders with the new freight charges,
         *      when freight rates change on a motorized unit item/model.
         * @param {Number} freight
         * @param {Number} salesOrderId
         */
        function UpdateSalesOrders(salesOrderId, freight) {

            //Loads sales order
            let salesOrderRecord = record.load({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                isDynamic: true
            }) || null;
            
            // Gets line item count, line item type, and line item values
            if(salesOrderRecord != null) {
                let isFreightRateSet = false;
                let soItemCount = salesOrderRecord.getLineCount({
                    sublistId: 'item'
                });

                for(let j = 0; j < soItemCount; j++){
                    let soItemId = parseInt(salesOrderRecord.getSublistValue({
                        sublistId: 'item', 
                        fieldId: 'item', 
                        line: j
                    }));
                 
                    // Don't care about any items, except for freight pricing item.
                    if(soItemId == constants.GD_ITEM_TYPE_FREIGHTCHARGE_ITEM) { 
                        salesOrderRecord.selectLine({
                            sublistId: 'item', 
                            line: j
                        });

                        salesOrderRecord.setCurrentSublistValue({
                            sublistId: 'item', 
                            fieldId: 'rate', 
                            value: freight
                        });
                        salesOrderRecord.setCurrentSublistValue({
                            sublistId: 'item', 
                            fieldId: 'amount', 
                            value: freight
                        });
                        salesOrderRecord.commitLine({
                            sublistId: 'item'
                        });
                        isFreightRateSet = true;
                    }
    
                    // Once freight rate item is set, don't need to loop through
                        //any more items.
                    if(isFreightRateSet) {  
                        
                        break;	
                    }
                }

                salesOrderRecord.save({
                    enableSourcing:	false,
                    ignoreMandatoryFields: true
                });
            }
        }

        return {getInputData, map}

    });

