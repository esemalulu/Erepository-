/**
 * Common functions used by the Projects with Pending Charges Suitelet and Portlet
 * charge review and approvals.
 * 
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

// export default {};

// The name of the roles used to designate charge approvers
const CHARGE_APPROVER_ROLES = ['Project Manager', 'Staff'];

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
define (['N/query', 'N/runtime'],
    /**
     * @typedef query
     * @typedef runtime
     * 
     * @param{runtime} runtime
     * @param{query} query
     */
    (query, runtime) => {
        /**
         * Get the logged in user. Used to filter the project list to show
         * only projects that the user is a charge approver for.
         * 
         * @returns {CurrentUser}
         */
        const getCurrentUser = () => {
            const user = runtime.getCurrentUser();

            return {
                id: user.id,
                name: user.name
            };
        }

        /**
         * Get the list of projects with pending charges for which the provided
         * user is a resource with a role in `CHARGE_APPROVER_ROLES`
         * 
         * @param {CurrentUser} user 
         * @returns {ProjectChargeRow[]}
         */
        const getProjectCharges = (user) => {
            const q = `SELECT
                        c.billTo AS project_id,
                        BUILTIN.DF(j.customer) AS client,
                        LPAD(j.entityNumber, 5, '0') AS project_number,
                        j.companyName AS project_name,
                        SUM(CASE WHEN c.stage = 'HOLD_FOR_BILLING'  THEN c.amount ELSE 0 END) AS hold_total,
                        SUM(CASE WHEN c.stage = 'READY_FOR_BILLING' THEN c.amount ELSE 0 END) AS ready_total,
                        SUM(CASE WHEN c.stage = 'NON_BILLABLE'      THEN c.amount ELSE 0 END) AS non_billable_total,
                        SUM(CASE WHEN c.stage = 'HOLD_FOR_BILLING'  THEN 1        ELSE 0 END) AS hold_count,
                        SUM(CASE WHEN c.stage = 'READY_FOR_BILLING' THEN 1        ELSE 0 END) AS ready_count,
                        SUM(CASE WHEN c.stage = 'NON_BILLABLE'      THEN 1        ELSE 0 END) AS non_billable_count,
                        SUM(
                            CASE WHEN c.stage IN ('HOLD_FOR_BILLING', 'READY_FOR_BILLING') THEN
                                c.amount 
                            ELSE 0 END
                        ) AS total_pending
                    FROM charge c
                    LEFT JOIN job j ON j.id = c.billTo
                    LEFT JOIN jobResources r ON r.project = j.id
                    LEFT JOIN (
                        SELECT r.jobResource, r.project, rr.name
                        FROM jobResources r
                        LEFT JOIN jobResourceRole rr ON rr.id = r.role
                    ) rr ON rr.project = c.billTo AND rr.jobResource = r.jobResource
                    WHERE r.jobResource = ?
                        AND c.use = 'Actual'
                        AND rr.name IN (${CHARGE_APPROVER_ROLES.map(r => "'" + r + "'").join(', ')})
                        AND c.stage IN ('HOLD_FOR_BILLING', 'READY_FOR_BILLING', 'NON_BILLABLE')
                    GROUP BY c.billTo, BUILTIN.DF(j.customer), j.entityNumber, j.companyName
                    ORDER BY hold_total DESC`;
            const resultSet = query.runSuiteQL({
                query: q,
                params: [user.id]
            });
            const results = resultSet.asMappedResults();
            const projects = results.map(r => {
                return {
                    project_id:         Number(r.project_id),
                    client:             r.client,
                    project_number:     r.project_number,
                    project_name:       r.project_name,
                    hold_total:         r.hold_total         ? Number(r.hold_total)         : 0,
                    ready_total:        r.ready_total        ? Number(r.ready_total)        : 0,
                    non_billable_total: r.non_billable_total ? Number(r.non_billable_total) : 0,
                    hold_count:         r.hold_count         ? Number(r.hold_count)         : 0,
                    ready_count:        r.ready_count        ? Number(r.ready_count)        : 0,
                    non_billable_count: r.non_billable_count ? Number(r.non_billable_count) : 0,
                    total_pending:      r.total_pending      ? Number(r.total_pending)      : 0,
                }
            });

            return projects;
        }

        return {
            getCurrentUser: getCurrentUser,
            getProjectCharges: getProjectCharges
        };
    }
);
