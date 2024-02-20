/**
 * Client Script associated with Suitelet Script File: KLC_GD_DealerGroups_SL.js
 *
 * Author: Kyra Schaefer
 *
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url'],
    /**
     * @param {url}
     *            url
     * @param {currentRecord}
     *            currentRecord
     */
    function (currentRecord, url) {

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {

            var fld = scriptContext.fieldId;
            if (fld == 'group_id') {
                // Location or Group field changed
                var currentRec = scriptContext.currentRecord;
                var groupId = currentRec.getValue('group_id');

                if (groupId) {
                    loadSuitelet(groupId);
                }
            }

        }

        function loadSuitelet(groupId) {

            // Reload Suitelet
            var currentRec = currentRec = currentRecord.get();

            setWindowChanged(window, false);
            document.location = url.resolveScript({
                scriptId: 'customscript_klc_gd_dealer_groups_sl',
                deploymentId: 'customdeploy_klc_gd_dealer_groups_sl',
                params: {
                    'group_id': groupId
                }
            });

        }

        return {
            fieldChanged: fieldChanged
        };

    });
