/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * Rapid 7
 * License/Modify License/License_Console_Self_Service_Banner_Helper.js
 * @module LicenseConsoleSelfServiceBannerHelper
 * @description
 */
define(["N/ui/message"], function(message) {

    /**
     * @function beforeLoad
     * @description Adds a banner to alert users why the manage consoles button is not available
     *
     * @public
     * @param  {type} scriptContext description
     */
    function beforeLoad(scriptContext) {
        const record = scriptContext.newRecord;
        const migratedForConsoleSelfService = record.getValue('custrecordr7nxlicenseconsoleselfservice');
        const doNotSendToServer = record.getValue('custrecordr7nxlicense_nosendserver');

        if(migratedForConsoleSelfService || doNotSendToServer) {
            const banner = message.create({
                type: message.Type.INFORMATION,
                title: "Migrated for Console Self-Service",
                message: "Manage Consoles is no longer supported from Netsuite as this license has been migrated to One Price.</br>\n\r"
                + "IP allocation among active consoles can now be done by the customer themselves through the 'Subscription Management' feature on the insight platform.</br>\n\r"
                + "This feature also allows the customer to self serve on adding new child consoles which will no longer be supported from Netsuite</br>\n\r"
                + "For further details please refer to the following <a href='https://docs.google.com/presentation/d/16oxN6bst2siwhtDulYUmrCq3-jtrJ3AMGCMmIwHylGU/edit?usp=sharing'>enablement material</a>"
            });
            scriptContext.form.addPageInitMessage({message: banner});
        }
    }

    return /** @alias module: LicenseConsoleSelfServiceBannerHelper */ {
        beforeLoad: beforeLoad,
    };
});