/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/query', 'N/runtime',  'N/format', 'N/render','N/search','N/email'],
 
/**
 * @param {record} record
 * @param {query} query
 * @param {runtime} runtime
 * @param {format} format
 * @param {render} render
 */
    function(record, query, runtime, format, render,search,email) {
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
            return search.load({id:'customsearch_gd_claims_paid_email_bfill'});
        }
        function map(context){
            try{
            var result = JSON.parse(context.value);
            log.debug({title:"result",details:result.values});
            var recId = Number(result.id);
            var custEmail = result.values["custrecordunitretailcustomer_email.CUSTRECORDCLAIM_RETAILCUSTOMER"]
            log.debug({title:"custEmail",details:custEmail});
            //var customerName = result.changeOrderId
            if(custEmail)
            {
               // var transactionId = 4022538; 
                        var mergeResult = render.mergeEmail({
                        templateId: 282,
                        entity: null,
                        recipient: null,
                        supportCaseId: null, 
                        transactionId: null,
                        customRecord: {
                            type: 'customrecordrvsclaim',
                            id: recId
                        }
                        });
                        var emailSubject = mergeResult.subject; 
                        var emailBody = mergeResult.body;
              try{
                  email.send({
                        author : 563864, 
                        recipients : custEmail, 
                        subject : emailSubject, 
                        body : emailBody, 
                        relatedRecords : {
                       customRecord:{
                        id:recId,
                        recordType:62
                       }
                        }
                        });
              }
              catch(e){
                log.error({title:"Error when sending email: ",details:e.message})
              }
                      
            }
            }
            catch(err)
            {
                log.error({title:"Error Map Stage : ",details: err.message});
            }
        }
        function reduce(context){
            
        }
        function summarize(summary){

        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
});