/**
 * Record Type: Invoice
 *
 * Button to send dispatch email to contact. Button displays if user location set to Team Services.
 *
 * Author: Kyra Schaefer
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', 'N/runtime'],
    /**
     * @param{url} url
     */
    (url, runtime) => {
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

            var logTitle = 'beforeLoad';
            var type = scriptContext.type;

            // Trigger type = View
            if (type != scriptContext.UserEventType.VIEW) return;

            // Location = Team Services
            var location = runtime.getCurrentUser().location;
            var locationParam = runtime.getCurrentScript().getParameter('custscript_klc_gd_inv_disp_em_location');
            log.debug(logTitle, 'Location ID: ' + location);
            if (location != locationParam) return;

            var newRec = scriptContext.newRecord;
            var recId = newRec.id;
            var dealer = newRec.getValue('entity');
            log.debug(logTitle, 'Invoice ID: ' + recId);

            if (recId && dealer) {
                var form = scriptContext.form
                var suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_klc_gd_inv_disp_email_sl',
                    deploymentId: 'customdeploy_klc_gd_inv_disp_email_sl',
                    params: {
                        'invoice': recId,
                        'dealer': dealer
                    }
                });
                var script = "window.open('" + suiteletUrl + "', '_blank', 'width=600,height=800');";

                // Add button to send dispatch email
                form.addButton({
                    id: 'custpage_dispatch',
                    label: 'Dispatch Submission',
                    functionName: script
                });
            }
        }

        return {beforeLoad}

    });
