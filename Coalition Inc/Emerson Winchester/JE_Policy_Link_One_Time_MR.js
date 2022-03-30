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

                var jRec = record.load({
                    type: record.Type.JOURNAL_ENTRY,
                    id: value.journalId,
                    isDynamic: true
                });

                jRec.setValue({fieldId: 'custbody_policy_number', value: value.policyId});

                var lineCount = jRec.getLineCount({sublistId: 'line'});

                for(var a = 0; a < lineCount; a++){

                    jRec.selectLine({sublistId: 'line', line: a});
                    jRec.setCurrentSublistValue({sublistId: 'line', fieldId: 'custcol_coalition_policy_number', value: value.policyId});

                    jRec.commitLine({sublistId: 'line'});

                }

                jRec.setValue({fieldId: 'custbody_coal_journal_linked', value: true});

                jRec.save();


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

            var mapKeys = [];
            summary.mapSummary.keys.iterator().each(function(log, record, search){
                mapKeys.push(key);
                return true;
            });

            // Log any errors that occurred
            summary.mapSummary.errors.iterator().each(function (key, error) {
                log.error({
                    title: 'Map Error for key: ' + key,
                    details: error
                });
            });

            log.debug('summarize','end');
        }


        function getPolicyList(){

            var policyList     = [];

            var customrecord_coalition_policySearchObj = search.create({
                type: "customrecord_coalition_policy",
                filters:
                    [
                        ["custrecord_coal_je_id_kp","noneof","@NONE@"],
                        "AND",
                        ["created","within","3/21/2021 12:00 am","3/27/2021 11:59 pm"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "Internal ID"}),
                        search.createColumn({name: "custrecord_coal_je_id_kp", label: "Journal Entry ID"})
                    ]
            });
            var searchResultCount = customrecord_coalition_policySearchObj.runPaged().count;
            log.debug("customrecord_coalition_policySearchObj result count",searchResultCount);
            customrecord_coalition_policySearchObj.run().each(function(result){

                var tObj    = {};
                tObj.policyId   = result.getValue('internalid');
                tObj.journalId  = result.getValue('custrecord_coal_je_id_kp');
                policyList.push(tObj);
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