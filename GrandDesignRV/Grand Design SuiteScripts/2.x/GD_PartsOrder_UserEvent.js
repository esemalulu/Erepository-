/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/ui/message', 'N/ui/serverWidget', 'N/error', 'SuiteScripts/SSLib/2.x/SSLib_Util', './GD_Common', '/.bundle/102084/2.x/RVS_Common'],

function(record, runtime, message, serverWidget, error, SSLib_Util, GD_Common, RVS_Common) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
        if (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'view')
        {
            var unitId = scriptContext.newRecord.getValue('custbodyrvsunit');
            if (unitId && unitId != '')
            {
                var hasLegalPermission = GD_Common.CheckLegalPermission(runtime.getCurrentUser().id);
                var needsLegalPermission = GD_Common.CheckLegalFlag(unitId);
                if (needsLegalPermission && !hasLegalPermission)
                {
                    if (RVS_Common.IsDealerLoggedIn())
                    {
                        var messageField = scriptContext.form.addField({
                            id: 'custpage_custhtmlmessage', 
                            label: ' ', 
                            type: serverWidget.FieldType.INLINEHTML
                        });

                        messageField.defaultValue = '<span style="font-size:12px;font-weight:bold;color:red;">'+
                                                                'This unit file is locked, please contact Grand Design Warranty Department.' +
                                                                '</span><ul>';

                        //This puts this message above the top field group
                        messageField.updateLayoutType({
                            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                        });
                    }
                    else
                    {
                        var messageString = 'This unit file is locked, please consult with the Consumer Affairs department.';
                        var messageObj = message.create({
                            type: message.Type.WARNING,
                            title: 'Parts Order Locked',
                            message: messageString
                        });
                        scriptContext.form.addPageInitMessage({message: messageObj});
                    }
                }
            }
        }
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

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

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
