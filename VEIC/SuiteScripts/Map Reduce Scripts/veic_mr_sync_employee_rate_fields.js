/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

// ### Types ###
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.getInputDataContext} InputContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.mapContext} MapContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.reduceContext} ReduceContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.summarizeContext} SummarizeContext */
/** @typedef {import('veic-types/notifications').Notify} Notify */

/**
 * @typedef EmployeeRate
 * @property {number} id
 * @property {string} email
 * @property {number} laborCost
 * @property {number} hourlyRate
 */

// @ts-ignore
define(['N/log', 'N/record', 'N/query', '/SuiteScripts/Lib/veic_lib_notify'],
    /**
     * @param {import('N/log')} log
     * @param {import('N/record')} record
     * @param {import('N/query')} query
     * @param {Notify} notify
     */
    (log, record, query, notify) => {
        const MAX_RESULT_COUNT = 1e4;

        /**
         * Lookup all active employees whose labor cost is different from their hourly rate. Pass them
         * to the map stage.
         * 
         * @param {InputContext} context
         */
        const getInputData = (context) => {
            const q = `SELECT TOP 10
                        e.id        AS id,
                        e.email     AS email,
                        e.laborCost AS labor_cost,
                        e.rate      AS hourly_rate
                    FROM employee e
                    WHERE e.isinactive = 'F'
                        AND e.laborCost IS NOT NULL
                        AND (e.rate IS NULL OR e.laborCost <> e.rate)`;

            const pagedData = query.runSuiteQLPaged({
                query: q,
                pageSize: 1000
            });

            if (pagedData.count > MAX_RESULT_COUNT) {
                // A real simple sanity check on the amount of data this thing can handle.
                let msg = 'query has been configured to handle a maximum ';
                msg += `of ${MAX_RESULT_COUNT} results, got ${pagedData.count}. `
                msg += 'This is to prevent missing updates due to script governance limits. If this '
                msg += 'limit is hit regularly, update this script to handle paged data more efficiently.'
                throw new Error(msg);
            }

            /** @type {EmployeeRate[]} */
            const results = [];
            pagedData.iterator().each(page => {
                page.value.data.iterator().each(row => {
                    const rowMap = row.value.asMap();

                    /** @type {EmployeeRate} */
                    const employeeRate = {
                        id: Number(rowMap['id']),
                        email: String(rowMap['email']),
                        laborCost: Number(rowMap['labor_cost']),
                        hourlyRate: Number(rowMap['hourly_rate']),
                    };
                    results.push(employeeRate);

                    return true;
                });

                return true;
            });

            return results;
        };

        /**
         * Update the employee's hourly rate field to match their labor cost
         * 
         * @param {MapContext} context
         */
        const map = (context) => {
            /** @type {EmployeeRate} */
            const employeeRate = JSON.parse(context.value);
            record.submitFields({
                type: record.Type.EMPLOYEE,
                id: employeeRate.id,
                values: {
                    rate: employeeRate.laborCost
                }
            });
        };

        /**
         * Log total update count and any errors
         * 
         * @param {SummarizeContext} context - Statistics about the execution of a map/reduce script
         */
        const summarize = (context) => {
            const errors = notify.getMapReduceErrors(context);
            if (errors.length > 0) {
                notify.logMapReduceErrors(errors);
            }

            let employeeCount = 0;
             context.mapSummary.keys.iterator().each(_ => {
                employeeCount++;

                return true;
            });
            const mapErrorCount = errors.reduce((count, err) => {
                if (err.stage === 'map') {
                    return count + 1;
                }

                return count;
            }, 0);

            log.audit({
                title: 'Employee rate sync complete',
                details: `Employee count: ${employeeCount},
                    synced successfully: ${employeeCount - mapErrorCount},
                    errors: ${mapErrorCount}`
            });
        };

        return {getInputData, map, summarize};
    }
);
