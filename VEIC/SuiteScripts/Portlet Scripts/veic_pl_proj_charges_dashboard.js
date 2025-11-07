/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */

const LIST_TITLE = 'VEIC - Project with Pending Charges';
const CHARGES_SCRIPT_ID = 'customscript_veic_sl_manage_pend_charges';
const CHARGES_DEPLOYEMENT_ID = 'customdeploy_veic_sl_manage_pend_charges';

/**
 * @typedef CurrentUser
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef ProjectChargeRow
 * @property {number} project_id
 * @property {string} client
 * @property {string} project_number
 * @property {string} project_name
 * @property {number} hold_total
 * @property {number} ready_total
 * @property {number} non_billable_total
 * @property {number} hold_count
 * @property {number} ready_count
 * @property {number} non_billable_count
 * @property {number} total_pending
 */

// @ts-ignore
define(['N/url', 'N/ui/serverWidget', '/SuiteScripts/Lib/Project_Charge_Approvals/veic_charge_approvals'],
    /**
     * @typedef url
     * @typedef serverWidget
     * @typedef veic_charge_approvals
     * @typedef Portlet
     * 
     * @param {url} url
     * @param {serverWidget} serverWidget
     * @param {veic_charge_approvals} veic_charge_approvals
     */
    function (url, serverWidget, veic_charge_approvals) {
        /**
         * Defines the Portlet script trigger point.
         * @param {Object} params - The params parameter is a JavaScript object. It is automatically passed to the script entry
         *                          point by NetSuite. The values for params are read-only.
         * @param {Portlet} params.portlet - The portlet object used for rendering
         * @param {string} params.column - Column index forthe portlet on the dashboard; left column (1), center column (2) or
         *     right column (3)
         * @param {string} params.entity - (For custom portlets only) references the customer ID for the selected customer
         * @since 2015.2
         */
        const render = (params) => {
            const isNarrow = (Number(params.column) !== 2);
            const portlet = params.portlet;
            portlet.title = LIST_TITLE;

            const currentUser = veic_charge_approvals.getCurrentUser();
            const projects = veic_charge_approvals.getProjectCharges(currentUser);
            const baseUrl = url.resolveScript({
                deploymentId: CHARGES_DEPLOYEMENT_ID,
                scriptId: CHARGES_SCRIPT_ID,
            });
            const fields = [
                // {id: 'project_id',         label: 'Project Id', type: serverWidget.FieldType.TEXT},
                // {id: 'hold_total',         label: 'On Hold Total', type: serverWidget.FieldType.TEXT},
                // {id: 'ready_total',        label: 'Ready Total', type: serverWidget.FieldType.TEXT},
                // {id: 'non_billable_total', label: 'Non-Bilalble Total', type: serverWidget.FieldType.TEXT},
                {id: 'client',             label: 'Client',        type: serverWidget.FieldType.TEXT},
                {id: 'project_number',     label: 'ID',            type: serverWidget.FieldType.TEXT},
                {id: 'project_name',       label: 'Project',       type: serverWidget.FieldType.TEXT},
                {id: 'hold_count',         label: 'On Hold',       type: serverWidget.FieldType.INTEGER},
                {id: 'ready_count',        label: 'Ready',         type: serverWidget.FieldType.INTEGER},
                {id: 'non_billable_count', label: 'Non-Billable',  type: serverWidget.FieldType.INTEGER},
                {id: 'total_pending',      label: 'Total Pending', type: serverWidget.FieldType.CURRENCY},
            ];
            const importantFields = ['client', 'project_name', 'project_number', 'hold_count'];
            fields.forEach(f => {
                if (isNarrow && !importantFields.includes(f.id)) {
                    // Skip non-critical fields when the portlet is narrow
                    return;
                }

                const col = portlet.addColumn(f)
                if (f.id === 'project_name') {
                    col.setURL({url: baseUrl});
                    col.addParamToURL({
                        param: 'project_id',
                        value: 'project_id',
                        dynamic: true
                    });
                }
            });
            portlet.addRows(projects);
        }

        return { render }
    }
);
