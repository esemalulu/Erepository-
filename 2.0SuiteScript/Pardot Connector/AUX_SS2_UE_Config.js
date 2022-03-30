/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/encode', 'N/record'],

function(encode, record) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
        var oldValue = scriptContext.oldRecord.getValue({ fieldId : 'custrecord_pi_config_pass'});
        var newValue = scriptContext.newRecord.getValue({ fieldId : 'custrecord_pi_config_pass'});

        if(oldValue !== newValue)
        {
            var encryptedPass = encode.convert({
                string : newValue,
                inputEncoding : encode.Encoding.UTF_8,
                outputEncoding : encode.Encoding.HEX
            });

            var configRecord = record.load({type : 'customrecord_pi_config' , id : scriptContext.newRecord.id});

            configRecord.setValue({ fieldId : 'custrecord_pi_config_pass', value : encryptedPass});
            configRecord.save();
        }
    }

    return {
        afterSubmit: afterSubmit
    };

});
