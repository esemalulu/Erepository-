/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
 define(['N/record', 'N/query', 'N/runtime',  'N/format', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
 
/**
 * @param {record} record
 * @param {query} query
 * @param {runtime} runtime
 * @param {format} format
 */
 
 function(record, query, runtime, format, SSLib_Task) {
    var scriptObj = runtime.getCurrentScript();
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData(){
        var batchCreateBacklogRecordId = scriptObj.getParameter({name: 'custscript_batchcreatebacklogid'});

    	//var batchCreateBacklogRecordId = runtime.getCurrentScript.getParameter({name:'customscriptrvs_processbatchcreatebacklogs_mr'}); //gets parameter of create record for location, should be passed in from suitelet when this is called
        //var batchCreateBacklogRecordId = context.request.parameters.custparam_batchcreatebacklogid
        var batchCreateBacklogRecord = record.load({
            type: 'customrecordrvsbatchbacklogcreate', 
            id: batchCreateBacklogRecordId
        });

        // get the list of orderIds
		var orderIds = batchCreateBacklogRecord.getValue({fieldId: 'custrecordbatchbacklogcreate_salesorders'});
        //log.debug('kicking off map', orderIds[0]);

        return orderIds;
    }
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context){
        var result = JSON.parse(context.value);
        var salesOrderId = result;
        var salesOrder = record.load({
            type: 'salesorder',
            id: result
        });
        var modelId = salesOrder.getValue({fieldId: 'custbodyrvsmodel'});
        var entityId = salesOrder.getValue({fieldId: 'entity'});
        var locationId = salesOrder.getValue({fieldId: 'location'})
        
        // loop through the order and make sure we find the correct line item
        // this is the line item with the model on it.
        // we need to set the line item on the workorder so that it links it up appropriately on the order-side
        var itemSublist = salesOrder.getSublist({sublistId: 'item'}); 
        var itemLineCount = salesOrder.getLineCount({sublistId: 'item'});
        var modelLineNumber = -1;
        for (var i = 0; i < itemLineCount; i++)
        {
            var itemId = salesOrder.getSublistValue({sublistId: 'item',fieldId: 'item', line: i});
            if (itemId == modelId)
            {
                modelLineNumber = salesOrder.getSublistValue({sublistId: 'item', fieldId: 'line', line: i}); // find the model line number
                break;
            }
        }
        
        // if we can't find the model line then we can't proceed
        // shouldn't ever happen
        
        if (modelLineNumber != -1) 
        {
            //log.debug('backlog create flag', modelLineNumber);

            /*var backlog = record.create({
                type: 'workorder', 
                isDynamic: false
            });*/
            // set all the fields, including the fields that will link this backlog directly to the sales order
            
            //RCB 12-5-11 commented out to use the preferred form for now.  If the other form needs to be used
            // in some situations we will have to deal with that manually rather than by changing the preferred form (or change this code)
            //backlog.setFieldValue('customform', 196); // select the Backlog (With Sales Order) custom form
            
                var params = {
                    soid: salesOrderId,
                    soline: 1,
                    specord: 'T', // Special Order
                    assemblyitem: modelId // internal ID of an assembly item
                };
    
                var backlog = record.create({
                    type: record.Type.WORK_ORDER,
                    isDynamic: true,
                    defaultValues: params
                });

            
            var assemblyItem = record.load({
                type:'assemblyitem',
                id: modelId
            });

            var subsidiary = salesOrder.getValue({fieldId: 'subsidiary'});

            backlog.setValue({fieldId: 'subsidiary', value: subsidiary});
            //log.debug('subsidiary', subsidiary)

            //backlog.setValue({fieldId: 'soid', value: salesOrderId});
            //backlog.setValue({fieldId: 'soline', value: modelLineNumber});
            //backlog.setValue({fieldId: 'specord', value: 'T'}); // not sure what this but this was set when creating a workorder from an order manually so am setting it here
            backlog.setValue({fieldId: 'entity', value: entityId});
            backlog.setValue({fieldId: 'custbodyrvsunitdealer', value: entityId});
            backlog.setValue({fieldId: 'custbodyrvsunit', value: salesOrder.getValue({fieldId:'custbodyrvsunit'})});
            backlog.setValue({fieldId: 'quantity', value: 1});
            try{
                backlog.setValue({fieldId: 'assemblyitem',  value: modelId});

                backlog.setValue({fieldId: 'custbodyrvsmainbacklog', value: Boolean('T')});
            }
            catch(err)
            {
                log.debug('fail 2', err)
            }
            try{
                backlog.setValue({fieldId: 'location', value: locationId});
            }
            catch(err){
                log.debug('fail 2', err)
            }
            try{
                backlog.save();
            }
            catch(err){
                log.debug('fail 1.9', err)
            }
            var batchCreateBacklogRecordId = scriptObj.getParameter({name: 'custscript_batchcreatebacklogid'});
            var batchCreateBacklogRecord = record.load({
                type: 'customrecordrvsbatchbacklogcreate', 
                id: batchCreateBacklogRecordId
            });
            var percentComplete = batchCreateBacklogRecord.getValue({fieldId:'custrecordbatchbacklogcreate_percentcomp'});
            var perWO = batchCreateBacklogRecord.getValue({fieldId:'custrecordbatchbacklogcreate_salesorders'});
            perWO = perWO.length;
            perWO = Math.round(100/perWO)
            percentComplete = percentComplete + perWO;
            batchCreateBacklogRecord.setValue({fieldId:'custrecordbatchbacklogcreate_percentcomp', value: percentComplete})
            batchCreateBacklogRecord.save();
        }
    }
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
    */
    function reduce(context) {

    }
    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary){
        var batchCreateBacklogRecordId = scriptObj.getParameter({name: 'custscript_batchcreatebacklogid'});

        var batchCreateBacklogRecord = record.load({
            type: 'customrecordrvsbatchbacklogcreate', 
            id: batchCreateBacklogRecordId
        });
        batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_salesorders', value: ""});
        batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_status', value: 1});
        batchCreateBacklogRecord.setValue({fieldId: 'custrecordbatchbacklogcreate_percentcomp', value: 100});
        batchCreateBacklogRecord.save();
        //update BCB record processing status
    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});