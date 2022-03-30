/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/record'],

function(widget, record) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext)
    {
        var admSync = scriptContext.newRecord.getValue({fieldId : 'custentity_aux_cx_synctoadm'});
        if(scriptContext.type == 'edit' && admSync == true)
        {
            var custID = scriptContext.newRecord.id;
            var form = scriptContext.form;

                form.addButton({
                    id : 'custpage_merge',
                    label : 'Merge Record',
                    functionName : 'callSuitelet(' + custID + ')'
                });

                form.clientScriptFileId = 5817665;

                var stdMergeBtn = form.getButton({id : 'merge' });
                    stdMergeBtn.isHidden = true;

        }

    }

    return {
        beforeLoad: beforeLoad
    };

});
