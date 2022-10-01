/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 *
 * Name: Yogesh Jagdale
 *
 * Script Type: Client Script
 *
 * Description: Calls the Instal Update Page using jQuery and gets the old and new version details
 *
 * Script Id: -NA-
 *
 * Deployment Id: -NA-
 ********************************************************************************/
define(['N/https', 'N/portlet'],
    /**
     * @param{https} https
     */
    function (https, portlet) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            try {
                var bundleId = "", bundleDetailHtml = "";
                bundleId = scriptContext.currentRecord.getValue({
                    fieldId: 'bundleid'
                });
                if (bundleId) {
                    bundleDetailHtml = https.get({
                        url: '/app/bundler/previewbundleupdate.nl?id=' + bundleId
                    });
                } else {
                    bundleDetailHtml = https.get({
                        url: '/app/bundler/previewbundleupdate.nl?id=84306'
                    });
                }
                var labelText = jQuery('#div__prelabel', bundleDetailHtml.body).text();
                var bundleName = labelText.split('Current Version:')[0].split('Name:')[1].trim();
                var currentVersion = labelText.split('Current Version:')[1].split('New Version')[0];
                var newVersion = labelText.split('New Version:')[1];
                jQuery('.newBundleVersion').text(newVersion.trim());
                jQuery('.bundleName').text(bundleName);

                log.debug({
                    title: 'currentVersion: ' + currentVersion,
                    details: 'newVersion: ' + newVersion
                });
                if (currentVersion.trim() == newVersion.trim()) {
                    jQuery('#loader').hide();
                    jQuery('#no-notification-alert').show();
                    portlet.resize();
                } else {
                    jQuery('#loader').hide();
                    jQuery('#new-notification-alert').show();
                    portlet.resize();
                }
            } catch (e) {
                log.error({
                    title: 'Error: ',
                    details: JSON.stringify(e)
                })
            }
        }

        return {
            pageInit: pageInit,
        };

    });

