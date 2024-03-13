/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/task','N/error', 'N/record', 'N/search','N/runtime', 'N/email'],

function(task, error, record, search, runtime, email) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
       var searchId = runtime.getCurrentScript().getParameter({name: 'custscriptr7_customers_search_id'})
        return {
            type: 'search',
            id: searchId
        };

    }

    function map(context)
    {
        if (!context.isRestarted)
        {
        var searchResult = JSON.parse(context.value);
        var customerId = searchResult.id;
        var customerRec = record.load({
                type:record.Type.CUSTOMER,
                id: customerId
            });
        log.debug('checking customer',customerId);
        var subsidListCount = customerRec.getLineCount('submachine')
        var lccSubsidiaryIsAdded            = false;
        var internationalSubsidiaryIsAdded  = false;
        for (var i = 0;i<subsidListCount;i++){
            var subsidiary = customerRec.getSublistValue('submachine','subsidiary',i);
            if(!lccSubsidiaryIsAdded){
                lccSubsidiaryIsAdded = subsidiary==1 ? true : false;
            };
            if(!internationalSubsidiaryIsAdded){
                internationalSubsidiaryIsAdded = subsidiary==10 ? true : false;
            };
        }
        if(!lccSubsidiaryIsAdded){
            subsidListCount = customerRec.getLineCount('submachine');
            customerRec.insertLine('submachine',subsidListCount);
            customerRec.setSublistValue('submachine','subsidiary',subsidListCount,'1');
        }
        if(!internationalSubsidiaryIsAdded){
            subsidListCount = customerRec.getLineCount('submachine');
            customerRec.insertLine('submachine',subsidListCount);
            customerRec.setSublistValue('submachine','subsidiary',subsidListCount,'10');
        }
        customerRec.setValue('custentityr7_multiple_sub_add',true);
        customerRec.save();
        }else {
            context.errors.iterator().each(function (key, error, executionNo){
                log.error({
                    title:  'Map error for key: ' + key + ', execution no  ' + executionNo,
                    details: error
                });
                return true;
            });
            
        }
        
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }




    return {
        config:{
            retryCount: 2,
            exitOnError: true
        },
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };

});
