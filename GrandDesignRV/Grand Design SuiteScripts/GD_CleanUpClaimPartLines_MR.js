/**
 * 
 * For Warranty 2.0, it's necessary to clean up old part lines that aren't linked to operation lines with a persistent link. 
 * 
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
var GD_FLATRATECODE_REVISION = '960436';
var GD_FAULTCODE_REVISION = '103';

define(['N/error', 'N/record', 'N/runtime', 'N/search', 'N/file'],
/**
 * @param {error} error
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */

function(error, record, runtime, search) {

    function handleErrorAndSendNotification(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);
    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if(inputSummary.error) {
            var e = error.create({
                name: 'INPUT_STAGE_FAILED',
                message: inputSummary.error
            });
            handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function(key, value) {
            var msg = 'Failure to link part line: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
        if(errorMsg.length > 0) {
            var e = error.create({
                name: 'PART_LINKING_FAILED',
                message: JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function getNextOpLineNum(claimId) {

        var highestSoFar = 0;
        var lineNumSearch = search.create({
            type: 'customrecordrvsclaimoperationline',
            filters: [
                ["custrecordclaimoperationline_claim", "anyof", claimId]
            ],
            columns: [
                search.createColumn({
                    name: "custrecordclaimoperationline_linenumber",
                    summary: "MAX"
                })
            ]
        }).run().each(function(result) {
            highestSoFar = result.getValue({
                name: "custrecordclaimoperationline_linenumber",
                summary: "MAX"
            }) || 0;
            return false;
        });

        return parseInt(highestSoFar) + 1;
    }

    function createOpLineAndLink(partLineId, claimId, type) {
       
    	// first check if there's already a revision opline there we can use
        var opLineId = '';
        var opLineNum = '';
        var opLineSearch = search.create({
            type: 'customrecordrvsclaimoperationline',
            filters: [
                ["custrecordclaimoperationline_claim", "anyof", claimId],
                "AND",
                ['custrecordclaimoperationline_flatratecod', 'anyof', GD_FLATRATECODE_REVISION]
            ],
            columns: ['internalid','custrecordclaimoperationline_linenumber']
        }).run().each(function(result) {
        	opLineId = result.id;
        	opLineNum = result.getValue('custrecordclaimoperationline_linenumber');
            return false;
        });
        
        if(opLineId == '') {
            //create a new op line for that claim
            opLineNum = getNextOpLineNum(claimId);
            
            var opLineRec = record.create({
            	type: 'customrecordrvsclaimoperationline',
            	isDynamic: true
            });

            opLineRec.setValue({fieldId: 'custrecordclaimoperationline_claim', value: claimId});
            opLineRec.setValue({fieldId: 'custrecordclaimoperationline_flatratecod',value: GD_FLATRATECODE_REVISION});
            opLineRec.setValue({fieldId: 'custrecordclaimoperationline_linenumber',value: opLineNum});
            opLineRec.setValue({fieldId: 'custrecordclaimoperationline_faultcode',value: GD_FAULTCODE_REVISION});
            opLineRec.setValue({fieldId: 'custrecordclaimoperationline_problem',value: 'N/A'});
            opLineRec.setValue({fieldId: 'custrecordclaimoperationline_cause',value: 'N/A'});
            opLineRec.setValue({fieldId: 'custrecordclaimoperationline_remedy',value: 'N/A'});

            var opLineId = opLineRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            
        }
        
        // set op line number and op link on part line
        record.submitFields({
            type: 'customrecordrvsclaimpartline',
            id: partLineId,
            values: {
                custrecordclaimpartline_operationlinenum: opLineNum,
                custrecordcustrecordclaimpartline_oplink: opLineId
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        });

    }

    function createLinkOnly(partLineId, opLineNum, claimId) 
    {
        //look up the operation line by the claim id and the operation line number
        var opLineId = '';
        var opLineSearch = search.create({
            type: 'customrecordrvsclaimoperationline',
            filters: [
                ["custrecordclaimoperationline_claim", "anyof", claimId],
                "AND",
                ['custrecordclaimoperationline_linenumber', 'equalto', opLineNum]
            ],
            columns: ['internalid']
        }).run().each(function(result) {
            opLineId = result.id;
            return false;
        });

        if(opLineId == '') {
            createOpLineAndLink(partLineId, claimId, 'bad link');
        } else {
            record.submitFields({
                type: 'customrecordrvsclaimpartline',
                id: partLineId,
                values: {
                    custrecordcustrecordclaimpartline_oplink: opLineId
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }
    }

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

        var parts = {};
        var count = 0;
        var data = search.create({
            type: 'customrecordrvsclaimpartline',
            filters: [
                ["custrecordcustrecordclaimpartline_oplink", "anyof", "@NONE@"],
            ],
            columns: [
                search.createColumn({
                    name: "custrecordclaimpartline_claim",
                    label: "Claim"
                }),
                search.createColumn({
                    name: "custrecordclaimpartline_operationlinenum",
                    label: "Operation Line #"
                })
            ]
        }).runPaged({
            pageSize: 1000
        });

        data.pageRanges.forEach(function(pageRange) {
            data.fetch({
                index: pageRange.index
            }).data.forEach(function(result) {
            	count++;
                parts[result.id] = {
                    'claimId': result.getValue('custrecordclaimpartline_claim'),
                    'opLineNumber': result.getValue('custrecordclaimpartline_operationlinenum')
                };
            });
        });

        log.debug('parts count', count);

        return parts;

    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {

        var partLineId = context.key
        var partObj = JSON.parse(context.value);
        var claimId = partObj.claimId;
        var opLineNum = partObj.opLineNumber || '';
        var type = '';
        
        // some orphan parts lines have an associated operation line, specified by the operation line num field (an integer number). 
        // these lines just need to be linked up. Most orphan parts lines have a operation line num of 0, or none at all, which means 
        // we will also create an op line for them.

        if(opLineNum == '' || opLineNum == 0)
            createOpLineAndLink(partLineId, claimId, 'no link');
        else
            createLinkOnly(partLineId, opLineNum, claimId);
        
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
    function summarize(summary) {

        handleErrorIfAny(summary);

        log.debug({title: 'Usage units consumed', details: summary.usage});
        log.debug({title: 'Concurrency',details: summary.concurrency});
        log.debug({title: 'Number of yields', details: summary.yields});
        
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});