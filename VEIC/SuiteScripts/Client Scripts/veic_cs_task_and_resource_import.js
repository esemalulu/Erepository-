/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * 
 * This is very basic client script used by the project task and project resource
 * imports to clear flash message parameters from the browser's URL history. It's
 * likely this script will get folded into other client scripts or become a custom
 * module.
 * 
 * This ensures that alert messages are only displayed once.
 */

const FLASH_MSG_PARAMS = ['alert_type', 'alert_title', 'alert_msg'];

// @ts-ignore
define(['N/log'],
    /**
     * @typedef log
     * @typedef Record
     * 
     * @param {log} log
     */
    function(log) {        
        /**
         * Function to be executed after page is initialized.
         * 
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(context) {
            // Clear flash message params
            try {
                let hasFlash = false;
                const currentUrl = new URL(window.location.href);
                for (const p of FLASH_MSG_PARAMS) {
                    if (currentUrl.searchParams.has(p)) {
                        currentUrl.searchParams.delete(p);
                        hasFlash = true;
                    }
                }

                if (hasFlash) {
                    history.replaceState(null, '', currentUrl.toString());
                }
            } catch (e) {
                log.error({title: 'Flash message error', details: `Unable to clear flash message params: ${e}`});
            }
        }

        return {
            pageInit: pageInit,
        };
        
    }
);
