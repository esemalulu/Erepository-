/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/task','SuiteScripts/SSLib/2.x/SSLib_Task'],
    /**
     * @param {record} record
     * @param {search} search
     * @param {runtime} runtime
     */
    function (record, search, runtime, task, SSLib_Task) {

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

        }

        /**
         * Function definition to be triggered before record is submitted.
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
         * Function definition to be triggered after record is submitted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            if (scriptContext.type != scriptContext.UserEventType.CREATE && scriptContext.type != scriptContext.UserEventType.COPY && scriptContext.newRecord.getValue('custitemrvsitemtype') == '4') { // Model Item Type
                // If the Hidden field Unit Appliances Updated is true on save of a model
                // or there was a line removed / added to the Unit Appliances on Model, run MapRed
                if (scriptContext.newRecord.getValue('custitemgd_unitappliancesupdated') == true ||
                    scriptContext.oldRecord.getLineCount('recmachcustrecordunitappliancetemplate_model') !=
                    scriptContext.newRecord.getLineCount('recmachcustrecordunitappliancetemplate_model')) {

                    var model = scriptContext.newRecord.getValue('internalid');

                    // Kick off Unit Appliance Update Map Reduce
                    var params = {};
                    params['custscriptgd_unitappupdate_model'] = model;
                    scriptTaskId = SSLib_Task.startMapReduceScript('customscriptgd_unitaplianceupdate_mapred', null, params);
                }

                if (scriptContext.newRecord.getValue('custitemgd_updatetobackoffice') == true) {
                    var model = scriptContext.newRecord.getValue('internalid');
                    var params = {};
                    params['custscriptgd_f5_model'] = model;
                    scriptTaskId = SSLib_Task.startMapReduceScript('customscriptgd_force5_productupdater_mr', null, params);
                }
            }

            // For motorized units only, checks to see if US or Canadian freight rates 
                // have changed on the unit/model item record.
            if (scriptContext.type == scriptContext.UserEventType.EDIT) {
                var isMotorized = scriptContext.newRecord.getValue('custitemgd_chassismfg');
                if (isMotorized) {
                    var oldCanadianFreightRate = scriptContext.oldRecord.getValue('custitemgd_canadafreightrate');
                    var newCanadianFreightRate = scriptContext.newRecord.getValue('custitemgd_canadafreightrate');
                    var oldUsFreightRate = scriptContext.oldRecord.getValue('custitemgd_usfreightrate');
                    var newUsFreightRate = scriptContext.newRecord.getValue('custitemgd_usfreightrate');
                    var modelId = scriptContext.newRecord.getValue('id');

                    var params = {custscriptgd_modelids : JSON.stringify(modelId)};

                    if (oldCanadianFreightRate != newCanadianFreightRate || oldUsFreightRate != newUsFreightRate) {

                        SSLib_Task.startMapReduceScript('customscriptgd_motorizedsofreightfix_mr', null, params, '2', '5', '60');
                    }

                }
            }
        }

        return {
            //beforeLoad: beforeLoad,
            //beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });