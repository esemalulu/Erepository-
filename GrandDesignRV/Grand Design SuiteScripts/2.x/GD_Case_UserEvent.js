/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/ui/message', 'N/ui/serverWidget', 'N/error', 'N/search',
        'SuiteScripts/SSLib/2.x/SSLib_Util', './GD_Common', '/.bundle/102084/2.x/RVS_Common'],

function(record, runtime, message, serverWidget, error, search, SSLib_Util, GD_Common, RVS_Common) {
   
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
            var unitId = scriptContext.newRecord.getValue('custeventgd_vinnumber');
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
                            title: 'Case Locked',
                            message: messageString
                        });
                        scriptContext.form.addPageInitMessage({message: messageObj});
                    }
                }
            }
        }


        if( scriptContext.type == scriptContext.UserEventType.CREATE || 
        	scriptContext.type == scriptContext.UserEventType.COPY || 
        	scriptContext.type == scriptContext.UserEventType.EDIT) {
            
        	// build a dictionary of follow up days by status to use client-side.
        	var statusDictionary = {};
        	search.create({
        		type: 'customrecordgd_casestatusconfig',
        		columns: ['custrecordgd_casestatusconfig_status',
        		          'custrecordgd_casestatusconfig_followup'],
        	}).run().each(function(result) {
        		var status = result.getValue('custrecordgd_casestatusconfig_status');
        		var followUpDays = result.getValue('custrecordgd_casestatusconfig_followup');
        		statusDictionary[status] = followUpDays;
                return true;
            });
        	
            var dictionaryField = scriptContext.form.addField({
            	id: 'custpage_statusdictionary', 
            	label: 'Status Dictionary', 
            	type: serverWidget.FieldType.LONGTEXT,
            }).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            dictionaryField.defaultValue = JSON.stringify(statusDictionary);
        }
        
        if( scriptContext.type == scriptContext.UserEventType.CREATE || 
           	scriptContext.type == scriptContext.UserEventType.COPY) {
        
        	// on create or copy, set the follow up date appropriately
        	var status = scriptContext.newRecord.getValue('status');
        	if(status && statusDictionary[status]) {
    			var followUpDate = new Date();
    			followUpDate.setDate(followUpDate.getDate() + parseInt(statusDictionary[status]));
    			scriptContext.newRecord.setValue({
    				fieldId: 'custeventgd_followupdate',
    				value: followUpDate
    			});
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
        // beforeSubmit: beforeSubmit,
        // afterSubmit: afterSubmit
    };
    
});
