/**
 * Provides a customized version of the Projects with Pending Charges saved search with projects
 * filtered by the user's resource role in the project. Used to display a list of projects with
 * pending charges that a user has been assigned the Project Manager or Charge Review role.
 * 
 * @NApiVersion 2.1
 * @NScriptType Suitelet
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

/**
 * 
 * @param {serverWidget} serverWidget 
 * @param {url} url
 * @param {ProjectChargeRow[]} projects 
 * @returns {List}
 */
function getProjectChargesList(serverWidget, url, projects) {
    const chargeList = serverWidget.createList({
        title: LIST_TITLE
    });
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
    fields.forEach(f => {
        const col = chargeList.addColumn(f)
        if (f.id === 'project_name') {
            col.setURL({url: baseUrl});
            col.addParamToURL({
                param: 'project_id',
                value: 'project_id',
                dynamic: true
            });
        }
    });
    chargeList.addRows(projects);

    return chargeList;
}

// @ts-ignore
define(
    [
        'N/error',
        'N/log',
        'N/ui/serverWidget',
        'N/url',
        '/SuiteScripts/Lib/Project_Charge_Approvals/veic_charge_approvals'
    ],
    /**
     * @typedef log
     * @typedef error
     * @typedef serverWidget
     * @typedef url
     * @typedef veic_charge_approvals
     * @typedef ServerRequest
     * @typedef ServerResponse
     * @typedef List
     * 
     * @param{error} error
     * @param{log} log
     * @param{serverWidget} serverWidget
     * @param{url} url
     * @param{veic_charge_approvals} veic_charge_approvals
     */
    (error, log, serverWidget, url, veic_charge_approvals) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} context
         * @param {ServerRequest} context.request - Incoming request
         * @param {ServerResponse} context.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (context) => {
            if (context.request.method === 'GET') {
                const currentUser = veic_charge_approvals.getCurrentUser();
                const projects = veic_charge_approvals.getProjectCharges(currentUser);
                const list = getProjectChargesList(serverWidget, url, projects);
                context.response.writePage(list);
            } else {
                // This Suitelet does not handle POST requests. Updates are submitted via the setCharges*
                // functions attached as actions to the form buttons.
                throw error.create({
                    name: 'INVALID_HTTP_METHOD',
                    message: `Unsupported HTTP method: ${context.request.method}`
                });
            }
        }

        return {onRequest}
    }
);
