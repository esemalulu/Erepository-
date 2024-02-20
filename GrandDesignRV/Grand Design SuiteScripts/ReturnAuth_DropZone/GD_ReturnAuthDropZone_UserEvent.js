/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/email', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/file','N/runtime', '/.bundle/102084/RVSLib_Bootstrapper','/.bundle/102084/RVSLib_Constants','SuiteScripts/SSLib/2.x/SSLib_Util','/.bundle/102084/2.x/RVS_Common','/.bundle/102084/2.x/RVS_Constants', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {serverWidget} serverWidget
 */
function(email, record, search, serverWidget, file, runtime, RVSLib_Bootstrapper, RVSLib_Constants, SSLib_Util, Common, Constants, SSLib_Task) {
    
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
        if (scriptContext.type == scriptContext.UserEventType.VIEW) {
            if (scriptContext.newRecord.getValue({fieldId: 'custbodygd_retauthreturn'}) && scriptContext.newRecord.getValue({fieldId: 'status'}) != 'Closed') {
                scriptContext.newRecord.setValue({
                    fieldId: 'custbodygd_fileattachdropbox', 
                    value: '<div style="padding: 35px; font-size: 20px">Please send an email to <a href = "mailto: pickups@flatworldgs.com">pickups@flatworldgs.com</a> and put down weight and dims of your package or crate along with quantity, Returned Goods Authorization number, and email address. Shipping Label and BOL for the shipment will be provided from Flat World.</div>'
                  });
                scriptContext.form.getField({id: 'custbodygd_fileattachdropbox'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.NORMAL});
            } else {
                scriptContext.form.getField({id: 'custbodygd_fileattachdropbox'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            }
        } else {
            // Drag and Drop Dirty Flag
            var filesDirtyField = scriptContext.form.addField({
                id: 'custpage_filesdirty',
                label: 'Files Dirty',
                type: serverWidget.FieldType.CHECKBOX
            });
            filesDirtyField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            filesDirtyField.defaultValue = 'F';

            //Field we can reference in the knockOut to see if we're in the portal or not. 
            var portal = Common.IsDealerLoggedIn();
            var portalField = scriptContext.form.addField({id: 'custpage_portal', label: 'portal', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            portalField.defaultValue = portal;
            
            // get CSS or other client-side includes and add it to the html
            scriptContext.newRecord.setValue({fieldId: 'custbodygd_fileattachdropbox', value: 
              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_JQUERY) +
              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_KNOCKOUT) +
              RVSLib_Bootstrapper.buildHtmlFileLinks(RVSLib_Constants.RVS_BUNDLE_FILES_MODULE_WARRANTY2_COMMON) +
              RVSLib_Bootstrapper.buildHtmlFileLinks('gd_returnauth_dropzone')
            });
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
        if (scriptContext.type == scriptContext.UserEventType.CREATE) {
            if (scriptContext.newRecord.getValue({fieldId: 'custpage_filesdirty'}) == 'T')
            {
                SSLib_Task.scheduleScript('customscriptgd_retauthdropzoneattach_sch', null, {
                    custscriptretauth_dzattach_recordid: scriptContext.newRecord.id,
                    custscriptretauth_dzattach_recordtype: scriptContext.newRecord.type
                });
            }
        }
    }
    
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});