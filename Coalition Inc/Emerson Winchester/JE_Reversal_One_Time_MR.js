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
                    id: value,
                    isDynamic: true
                });

                var lineCount = jRec.getLineCount({sublistId: 'line'});

                for(var a = 0; a < lineCount; a++){

                    jRec.selectLine({sublistId: 'line', line: a});
                    var lDebit = jRec.getCurrentSublistValue({sublist: 'line', fieldId: 'debit'});
                    var lCredit = jRec.getCurrentSublistValue({sublist: 'line', fieldId: 'credit'});

                    jRec.setCurrentSublistValue({siblistId: 'line', fieldId: 'debit', value: Number(lCredit)});
                    jRec.setCurrentSublistValue({siblistId: 'line', fieldId: 'credit', value: Number(lDebit)});

                    jRec.commitLine({sublistId: 'line'});

                }

                jRec.setValue({fieldId: 'custbody4', value: true});

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


            var customrecord_reversing_journalsSearchObj = search.create({
                type: "customrecord_reversing_journals",
                filters:
                    [
                        ["custrecord_journal_id","contains","56759"]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_journal_id", label: "Journal ID"})
                    ]
            });
            var searchResultCount = customrecord_reversing_journalsSearchObj.runPaged().count;
            log.debug("customrecord_reversing_journalsSearchObj result count",searchResultCount);
            customrecord_reversing_journalsSearchObj.run().each(function(result){
                policyList.push(result.getValue('custrecord_journal_id'));
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