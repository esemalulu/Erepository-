/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget'],
    (serverWidget) => {
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
            // Updating the label for project classification class field to 'Business Unit Budget'
            const pcClass = scriptContext.form.getField({
                id: 'custpage_pc_class'
            });
            if (pcClass) {
                pcClass.label = 'Business Unit Budget';
            }       

            // Updating the label for project classification department field to 'Charge From'
            const pcDept = scriptContext.form.getField({
                id: 'custpage_pc_department'
            });
            if (pcDept) {
                pcDept.label = 'Charge From';
            }

            // Hiding the project classification location field
            const pcLocation = scriptContext.form.getField({   
                id: 'custpage_pc_location' 
            });
            if (pcLocation) {
                pcLocation.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
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

        return {beforeLoad /*, beforeSubmit, afterSubmit*/}

    });
