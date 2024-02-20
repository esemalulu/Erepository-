/**
 * 
 * For Warranty 2.0, it's necessary to clean up old part lines that aren't linked to operation lines with a persistent link. 
 *
 * 
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/runtime', 'N/error', 'N/file'],
		
function(search, record, runtime, error, file) {
   
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

    	var fileObj = file.load({
    	    id: 'Templates/Solution Source Other Data/DuplicateLinesToUpdate.csv'
    	});
    	  	
    	var iterator = fileObj.lines.iterator();
    	var inputData = {};
    	//Skip the first line (CSV header)
        iterator.each(function () {return false;});
        iterator.each(function (line)
        {
        	//create a dictionary with op line internal ids as the key, and claim internal ids as the value 
        	var lineValues = line.value.split(',');
            inputData[lineValues[0]] = lineValues[1];
            
            return true;
          });
    	
    	return inputData;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	
        var opLineId = context.key || '';
        var claimId = context.value || '';

        if(opLineId != '' && claimId != '') {
        	try
        	{
            	//find the next available line number on the claim
            	var newLineNumber = getNextOpLineNum(claimId);

            	//load the operation line and update it with the new number.
                var opLineRec = record.load({
                	type: 'customrecordrvsclaimoperationline',
                	id: opLineId,
                	isDynamic: true
                });

                opLineRec.setValue({
                	fieldId: 'custrecordclaimoperationline_linenumber',
                	value: newLineNumber
                	});

                opLineRec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
        	}
        	catch(e)
        	{
        		log.debug('error: '+JSON.stringify(e));
        	}
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
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});