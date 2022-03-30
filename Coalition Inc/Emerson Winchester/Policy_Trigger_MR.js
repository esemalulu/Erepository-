/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/log", "N/record", "N/search"],

    function(log, record, search) {


        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         */
        function getInputData() {

            log.audit({title: 'START', details: 'START OF RUN'});

            var policyList     = getPolicyList();


            return policyList;
        }



        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(ctx) {

            try {
                var shipIdSet = false;
                log.debug('JSON.stringify(context)', JSON.stringify(ctx));

                var value = JSON.parse(ctx.value);

                var rec = record.load({
                    type: 'customrecord_coalition_policy',
                    id: value
                });
        /*      
              rec.setValue({
                fieldId: 'custrecord_je_so_lines_processed',
                value: false
              });
                rec.save();
*/

            }
            catch(e){
                log.error({title: 'Failed to Initiate Policy Workflow', details: JSON.stringify(e)});
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


        function getPolicyList(){

            var policyList     = [];


            var customrecord_coalition_policySearchObj = search.create({
                type: "customrecord_coalition_policy",
/*
              filters:
   [
      ["created","notonorbefore","2/15/2021 11:59 pm"],
      "AND", 
      ["created","onorbefore","2/17/2021 1:05 pm"]
   ],
   */
              filters:
                    [
                         ["custrecord_je_so_lines_processed","is","F"],
                      "AND",
   						["custrecord_policy_eff_date","notbefore","1/1/2021"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "Internal ID"})
                    ]
            });
            var searchResultCount = customrecord_coalition_policySearchObj.runPaged().count;
            log.debug("customrecord_coalition_policySearchObj result count", searchResultCount);
            customrecord_coalition_policySearchObj.run().each(function (result) {

                policyList.push(result.getValue('internalid'));

                return true;

            });



            return policyList;

        }



        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };


})