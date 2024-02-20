/**
 * @NApiVersion 2.x
 * @NScriptType plugintypeimpl
 */
define(['N/record', 'N/search'],

function(record, search) {
   
    /**
     * @param {string} bomRollupId - Internal Id of the Processing Record
     * @returns {Object} object containing all of the data retrieved from the Processing Record
     */
    function getProcRecData(bomRollupId) {
        // Get the model
        var bomRollupFields = search.lookupFields({
            type: 'customrecordrvs_multibomrollupprocessing',
            id: bomRollupId,
            columns: ['custrecordmultibomrollupproc_models', 
                      'custrecordmultibomrollupproc_date',
                      'custrecordmultibomrollupproc_purchdays',
                      'custrecordgd_multibomrollupproc_location'
                     ]
        });

        var locations = bomRollupFields.custrecordgd_multibomrollupproc_location;
        var locationIds = [];
        for (var i = 0; i < locations.length; i++) {
            locationIds.push(locations[i].value);
        }

        return {
            "modelId": bomRollupFields.custrecordmultibomrollupproc_models,
            "date": bomRollupFields.custrecordmultibomrollupproc_date,
            "purchNumDays": bomRollupFields.custrecordmultibomrollupproc_purchdays,
            "location": locationIds
        };
    }

    return {
        getProcRecData: getProcRecData
    };
    
});
