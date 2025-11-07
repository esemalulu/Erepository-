/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

// ### Types ###
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.getInputDataContext} InputContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.mapContext} MapContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.reduceContext} ReduceContext */
/** @typedef {import('@hitc/netsuite-types/N/types').EntryPoints.MapReduce.summarizeContext} SummarizeContext */
/** @typedef {import('@hitc/netsuite-types/N/record').Record} N_Record */

/**
 * @typedef Employee
 * @property {number} id
 * @property {string} email
 * @property {number} fteHours
 */

/**
 * @returns {number}
 */
function getFteHours() {
    const hourOptions = [7.5, 6, 4.5];
    
    // 85% chance 7.5
    // 10% chance 6
    // 5% chance 4.5
    const randInt = Math.floor(Math.random() * 100);
    let idx = 0;
    if (randInt <= 5) {
        idx = 2;
    } else if (randInt <= 15) {
        idx = 1;
    }
    
    return hourOptions[idx];
}

// @ts-ignore
define(['N/query', 'N/record', 'N/log'],
    /**
     * @param {import('N/query')} query
     * @param {import('N/record')} record
     * @param {import('N/log')} log
     */
    (query, record, log) => {
        const MAX_RESULT_COUNT = 1e4;

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * 
         * @param {InputContext} context
         */
        const getInputData = (context) => {
         const MAX_RESULT_COUNT = 1e4;

            const q = `SELECT
                        e.id                             AS id,
                        e.email                          AS email,
                        NVL(e.custentity_cp_ftehours, 0) AS fte_hours
                    FROM employee e
                    WHERE e.isinactive = 'F'
                        AND NVL(e.custentity_cp_ftehours, 0) = 0`;

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

            /** @type {Employee[]} */
            const results = [];
            pagedData.iterator().each(page => {
                page.value.data.iterator().each(row => {
                    const rowMap = row.value.asMap();

                    /** @type {Employee} */
                    const employeeRate = {
                        id: Number(rowMap['id']),
                        email: String(rowMap['email']),
                        fteHours: Number(rowMap['fte_hours'])
                    };
                    results.push(employeeRate);

                    return true;
                });

                return true;
            });

            return results;
        };

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {MapContext} context - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         */
        const map = (context) => {
            /** @type {Employee} */
            const employee = JSON.parse(context.value);
            record.submitFields({
                type: record.Type.EMPLOYEE,
                id: employee.id,
                values: {
                    custentity_cp_ftehours: getFteHours()
                }
            });
        };

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {SummarizeContext} context - Statistics about the execution of a map/reduce script
         */
        const summarize = (context) => {
            let updateCount = 0;
            context.mapSummary.keys.iterator().each(_ => {
                updateCount++;

                return true;
            });
            log.debug({
                title: 'FTE Hours update complete',
                details: `Updated ${updateCount} employees`
            });
        };

        return {getInputData, map, summarize};
    }
);