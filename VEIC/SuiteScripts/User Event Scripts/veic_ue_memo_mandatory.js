/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([],

    () => {
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
            try {
                var form = scriptContext.form;
                var sublistobj = form.getSublist({ id: 'expense' });
                if (!sublistobj) return;

                var memofield = sublistobj.getField({ id: 'memo' });
                if (memofield) memofield.isMandatory = true;

                var categoryfield = sublistobj.getField({ id: 'category' });
                if (categoryfield){
                    categoryfield.isMandatory = true;
                    
                    // // Filter the category field to only show categories that start with "Expense"
                    // var categories = categoryfield.getSelectOptions();
                    // categoryfield.removeSelectOption({ value: null });
                    // categories.forEach(option => {
                    //     log.debug({
                    //         title: 'Category Option',
                    //         details: option.value + ' - ' + option.text
                    //     });
                    //     // Remove options that do not start with 'Expense'
                    //     if (option.value && option.text.startsWith('Expense')) {
                    //         categoryfield.addSelectOption({
                    //             value: option.value,
                    //             text: option.text
                    //         });
                    //     }
                    // });
                }

            } catch (e) {
                log.error({
                    title: 'Error in ' + scriptContext.type + ' event',
                    details: e.message
                });
            }
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

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
