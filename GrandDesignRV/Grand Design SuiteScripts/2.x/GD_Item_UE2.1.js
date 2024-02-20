/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', './GD_Common.js', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param{record} record
 * @param{GD_Common} GD_Common
 * @param{SSLib_Task} SSLib_Task
 */
    (record, GD_Common, SSLib_Task) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            if (scriptContext.type != 'create') {
                let newNLA = scriptContext.newRecord.getValue({fieldId: 'custitemgd_isnla'});
                let newReplacement = scriptContext.newRecord.getValue({fieldId: 'custitemgd_nlareplacementitem'});
                let oldNLA = scriptContext.oldRecord.getValue({fieldId: 'custitemgd_isnla'}) || false;
                let oldReplacement = scriptContext.oldRecord.getValue({fieldId: 'custitemgd_nlareplacementitem'}) || '';
                if (newNLA && newReplacement != oldReplacement && newReplacement != scriptContext.oldRecord.id) {
                    let mapReduceParams = {
                        'custscriptgd_nla_itemid': scriptContext.newRecord.id,
                        'custscriptgd_nla_replacement': newReplacement,
                        'custscriptgd_nla_itemtype': scriptContext.newRecord.type,
                        'custscriptgd_nla_description': scriptContext.newRecord.getValue({fieldId: 'storedetaileddescription'})
                    }
                    SSLib_Task.startMapReduceScript('customscriptgd_nlaprocessing_mr', null, mapReduceParams, '2', '5', '60');
                }
                if (oldNLA && !newNLA) {
                    let regex = /(<!-- Replacement Message Start -->)(.*)(<!-- Replacement Message End -->)/;
                    let detailedDescription = scriptContext.newRecord.getValue({fieldId: 'storedetaileddescription'});
                    detailedDescription = detailedDescription.replace(regex, '');
                    log.debug('description', detailedDescription);
                    log.debug('id', scriptContext.newRecord.id);
                    log.debug('type', GD_Common.convertItemType(scriptContext.newRecord.getText({fieldId: 'itemtype'})));
                    record.submitFields({
                        type: GD_Common.convertItemType(scriptContext.newRecord.getText({fieldId: 'itemtype'})),
                        id: scriptContext.newRecord.id,
                        values: {
                            storedetaileddescription: detailedDescription,
                            custitemgd_nlareplacementitem: ''
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }
            }
        }

        return {
            //beforeLoad,
            //beforeSubmit,
            afterSubmit
        }

    });
