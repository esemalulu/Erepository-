/**
 * @author Adam Ploof - aploof@veic.org
 * @date   08/06/2025
 * Script File:	veic_lib_effective_labor_rate.js
 * Script Name:	veic_lib_effective_labor_rate
 * Script Type:	Library
 * Description:	A module for calculating effective labor rates in time tracking records.
 * Contains functions for calculating effective rates, updating time tracking
 * records, updating rates of direct-cost charges, updating labor rates in
 * time posting journal entries.
 * 
 * ## IMPORTANT NOTE ABOUT TIME POSTING CONFIG!
 * This module assumes that journal entries created from time posting will
 * have a single line per time tracking record. This relationship is what allows us to
 * update the rates in journal entry lines to the effective rate from time tracking records.
 * 
 * It's possible to configure Netsuite to aggregate projects/segments which would break this
 * script. If we ever decide to change this configuration this script will need to be updated
 * to accomodate that.
 * 
 * @NApiVersion 2.1
 * @NModuleScope public
 */

// ### Constants ###
const CHARGE_STAGE_BILLED = 'BILLED';
const CHARGE_TYPE_TIME = 'TIMEBASED';
const RATE_SOURCE_RESOURCES = 'RESOURCES';
const CHARGE_USE_ACTUAL = 'Actual';
const MAX_CHARGE_COUNT = 1e4;
const SEARCH_TYPE_JOURNAL = 'Journal';
const STATUS_PENDING_APPROVAL = 'Pending Approval';
const STATUS_APPROVED = 'Approved';
const NUM_DAYS_IN_WORKWEEK = 5;

// TODO: Eventually, we need to replace this static O/T multiplier with a dynamic O/T rule that can
// be maintained by finance/HR. For now, a static multiplier is acceptable because we have very little
// O/T and very few staff in states with different rules so this doesn't really come up currently.
const OVERTIME_MULTIPLIER = 1.5;
const OVERTIME_HOURS_THRESHOLD = 40.0;

// ### Types ###
/** @typedef {import('@hitc/netsuite-types/N/record').Record} N_Record */
/** @typedef {import('@hitc/netsuite-types/N/query').QueryResultMap} QueryResultMap */
/** @typedef {import('veic-types').EffectiveLaborRate.ChargeSource} ChargeSource */
/** @typedef {import('veic-types').EffectiveLaborRate.EffectiveLaborRateLib} EffectiveLaborRateLib */
/** @typedef {import('veic-types').EffectiveLaborRate.EmployeeDetail} EmployeeDetail */
/** @typedef {import('veic-types').EffectiveLaborRate.TimeDetail} TimeDetail */
/** @typedef {import('veic-types').EffectiveLaborRate.JournalEntry} JournalEntry */
/** @typedef {import('veic-types').EffectiveLaborRate.JournalEntryLine} JournalEntryLine */
/** @typedef {import('veic-types').EffectiveLaborRate.JournalEntryTime} JournalEntryTime */

//@ts-ignore
define(['N/query', 'N/record', 'N/search'],
    /**
     * @param {import('N/query')} query
     * @param {import('N/record')} record
     * @param {import('N/search')} search
     * @returns {EffectiveLaborRateLib}
     */
    (query, record, search) => {
        // ### Constants ###
        const fieldRanges = {
            MIN_WEEKLY_HOURS: 0.25,
            MAX_WEEKLY_HOURS: 150.0,
            MIN_LABOR_COST: 10.0,
            MAX_LABOR_COST: 500.0,
            MIN_FTE_HOURS: 1.0,
            MAX_FTE_HOURS: 8.0,
        };

        /**
         * Caclculate the effective hourly rate for the employee based on the actual hours worked
         * and their weekly pay (salaried employees) or their adjust hourly rate including O/T (hourly employees).
         * 
         * Effective rate is calculate as:
         * (Base hourly rate [labor cost field] * (FTE Hours [average daily hours] * 5)) / actual hours worked for week
         * 
         * ## Error handling/asserts ##
         * There's a lot of asserts in here to make sure we're calculating a reasonable rate. We want to bail out and
         * leave things untouched in the event that an employee record isn't set up correctly. Any errors thrown here
         * should be caught and handled by the caller.
         * 
         * Remember, this script is hooked into the payroll process and we don't want an uncaught error later on that
         * could prevent saving/approving/posting timesheets.
         * 
         * @param {TimeDetail[]} weeklyTime
         * @returns {number} the effective labor cost for the employee that the timesheet belongs to
         * @throws {Error} Throws an error if TimeDetails include empty weeklyTime or out-of-range data
         *                 (e.g. negative labor cost or FTE hours > 8)
         */
        const calculateEffectiveLaborCost = (weeklyTime) => {
            if (weeklyTime.length === 0) {
                throw new Error("Unable to calculate effective labor cost, no hours provided");
            }

            const weeklyHoursTotal = weeklyTime.reduce((totalHours, t) => {
                if (t.isApproved === false) {
                    return totalHours;
                }

                return totalHours += t.hours;
            }, 0.0);

            assertInRange(
                weeklyHoursTotal,
                fieldRanges.MIN_WEEKLY_HOURS,
                fieldRanges.MAX_WEEKLY_HOURS,
                'Weekly Hours'
            );

            const employee = weeklyTime[0].employee;
            const baseHourlyRate = employee.baseRate;
            assertInRange(
                baseHourlyRate,
                fieldRanges.MIN_LABOR_COST,
                fieldRanges.MAX_LABOR_COST,
                'Labor Cost'
            );

            const fteHours = employee.fteHours;
            assertInRange(
                fteHours,
                fieldRanges.MIN_FTE_HOURS,
                fieldRanges.MAX_FTE_HOURS,
                'FTE Hours'
            );


            /** @type {number} */
            let effectiveRate = 0.0;
            if (employee.isExempt) {
                // Salary
                effectiveRate = (baseHourlyRate * (fteHours * NUM_DAYS_IN_WORKWEEK)) / weeklyHoursTotal;
            } else {
                // Hourly
                const regHours = Math.min(weeklyHoursTotal, OVERTIME_HOURS_THRESHOLD);
                const regPay = regHours * baseHourlyRate;
                const otHours = Math.max((weeklyHoursTotal - OVERTIME_HOURS_THRESHOLD), 0.0)
                const otPay = otHours * (baseHourlyRate * OVERTIME_MULTIPLIER);
                effectiveRate = (regPay + otPay) / weeklyHoursTotal;
            }

            return effectiveRate;
        };

        /**
         * Helper function for asserting that number values are within the range
         * provided (inclusive). Throws an Error if the value is outside the provided range.
         * 
         * @param {number} val 
         * @param {number} lowerBound 
         * @param {number} upperBound 
         * @param {string} propertyName the name of the property being checked. Default: 'value'
         * @throws {Error} throws if val is outside of provided range
         * @returns {void}
         */
        const assertInRange = (val, lowerBound, upperBound, propertyName = 'value') => {
            const errMsg = `Expected ${propertyName} to be between ${lowerBound}-${upperBound}. Got: ${val}`;
            if (val < lowerBound || val > upperBound) {
                throw new Error(errMsg);
            }
        };

        /**
         * Check if charge record is a direct cost charge. Direct cost charges are:
         * 
         * - Time-based
         * - Actual (not forecast)
         * - Time entry is not empty
         * - Employee is not empty
         * - Generated from rules with a rate basis of "resource"
         * 
         * @param {ChargeSource} chargeSource
         * @return {boolean}
         */
        const isDirectCostCharge = (chargeSource) => {
            if (chargeSource.chargeRuleType !== CHARGE_TYPE_TIME) {
                return false;
            }

            if (chargeSource.use !== CHARGE_USE_ACTUAL) {
                return false;
            }

            if (chargeSource.timeRecordId === null || chargeSource.employeeId === null) {
                return false;
            }

            if (chargeSource.rateSourceType !== RATE_SOURCE_RESOURCES) {
                return false;
            }

            if (chargeSource.effectiveRate === null) {
                return false;
            }

            return true;
        };

        /**
         * Get the details for the individual timebill records for the week's timesheet
         * 
         * @param {number} timesheetId the ID of the weekly timesheet to lookup
         * @returns {TimeDetail[]}
         */
        const getTimeDetailForTimesheet = (timesheetId) => {
            const q = `SELECT
                        t.id                     AS timebill_id,
                        t.tranDate               AS tran_date,
                        t.hours                  AS hours,
                        t.approvalStatus         AS approval_status_key,
                        a.name                   AS approval_status_name,
                        e.id                     AS employee_id,
                        e.laborCost              AS labor_cost,
                        e.employeetype           AS employee_type_id,
                        et.name                  AS employee_type_name,
                        et.exempt                AS is_exempt,
                        e.custentity_cp_ftehours AS fte_hours
                    FROM timebill t
                    LEFT JOIN timeLineApprovalStatus a ON t.approvalStatus = a.key
                    LEFT JOIN employee e ON t.employee = e.id
                    LEFT JOIN EmployeeType et ON e.employeetype = et.id
                    WHERE t.timesheet = ?
                        AND a.name = 'Approved'
                    ORDER BY t.tranDate ASC`;
            const resultSet = query.runSuiteQL({
                query: q,
                params: [timesheetId]
            });
            const results = resultSet.asMappedResults();
            const timesheetDetails = results.map(r => {
                /** @type {EmployeeDetail} */
                const employee = {
                    id: Number(r.employee_id),
                    fteHours: r.fte_hours ? Number(r.fte_hours) : 0.0,
                    baseRate: r.labor_cost ? Number(r.labor_cost) : 0.0,
                    isExempt: r.is_exempt === 'T'
                };

                /** @type {TimeDetail} */
                const detail = {
                    id: Number(r.timebill_id),
                    isApproved: r.approval_status_name === STATUS_APPROVED,
                    hours: r.hours ? Number(r.hours) : 0.0,
                    employee: employee
                };

                return detail;
            });

            return timesheetDetails;
        }

        /**
         * Get the detail on the source of a chage.
         * 
         * @param {number} chargeId 
         * @returns {ChargeSource}
         */
        const getChargeSourceDetail = (chargeId) => {
            const q = `SELECT
                        c.id                                AS charge_id,
                        c.stage                             AS stage,
                        c.chargeType                        AS charge_type_id,
                        c.use                               AS use,
                        c.timeRecord                        AS time_record_id,
                        c.rate                              AS rate,
                        c.chargeEmployee                    AS employee_id,
                        c.amount                            AS amount,
                        c.rule                              AS rule_id,
                        cr.rateSourceType                   AS rate_source_type,
                        cr.chargeRuleType                   AS charge_rule_type,
                        t.custcol_veic_effective_labor_rate AS effective_rate
                    FROM charge c
                    LEFT JOIN ChargeRule cr ON c.rule = cr.id
                    LEFT JOIN TimeBill t ON c.timeRecord = t.id
                    WHERE c.id = ?`;
            const resultSet = query.runSuiteQL({
                query: q,
                params: [chargeId]
            });
            const results = resultSet.asMappedResults();
            if (results.length !== 1) {
                throw new Error(`Expected only a single result for charge ${chargeId}, got: ${results.length}`);
            }
            const data = results[0];

            /** @type {ChargeSource} */
            const chargeSource = _queryResultToChargeSource(data);

            return chargeSource;
        };

        /**
         * Fetch a list of all eligible charges that require updating the rate with
         * the effective labor rate from time tracking records.
         * 
         * The criteria used for selecting the charges is the same as isDirectCostCharge() plus a
         * check to see if the charge has already had its rate adjusted.
         * 
         * To prevent selecting charges that have already been updating, we check if the
         * current rate is equal to the effective rate in it's time tracking source record.
         * 
         * @returns {ChargeSource[]}
         */
        const getDirectCostChargesToUpdate = () => {
            const q = `SELECT
                        c.id                                AS charge_id,
                        c.stage                             AS stage,
                        c.chargeType                        AS charge_type_id,
                        c.use                               AS use,
                        c.timeRecord                        AS time_record_id,
                        c.rate                              AS rate,
                        c.chargeEmployee                    AS employee_id,
                        c.amount                            AS amount,
                        c.rule                              AS rule_id,
                        cr.rateSourceType                   AS rate_source_type,
                        cr.chargeRuleType                   AS charge_rule_type,
                        t.custcol_veic_effective_labor_rate AS effective_rate
                    FROM charge c
                    LEFT JOIN ChargeRule cr ON c.rule = cr.id
                    LEFT JOIN TimeBill t ON c.timeRecord = t.id
                    WHERE c.stage <> '${CHARGE_STAGE_BILLED}'
                        AND cr.chargeRuleType = '${CHARGE_TYPE_TIME}'
                        AND c.use = '${CHARGE_USE_ACTUAL}'
                        AND c.timeRecord IS NOT NULL
                        AND c.chargeEmployee IS NOT NULL
                        AND cr.rateSourceType = '${RATE_SOURCE_RESOURCES}'
                        AND ROUND(c.rate, 2) <> ROUND(t.custcol_veic_effective_labor_rate, 2)`;
            const pagedData = query.runSuiteQLPaged({
                query: q,
                pageSize: 1000
            });

            if (pagedData.count > MAX_CHARGE_COUNT) {
                // A real simple sanity check on the amount of data this thing can handle.
                let msg = 'getDirectCostChargesToUpdate has been configured to handle a maximum ';
                msg += `of ${MAX_CHARGE_COUNT} results, got ${pagedData.count}. `
                msg += 'This is to prevent missing updates due to script governance limits. If this '
                msg += 'limit is hit regularly, update this script to handle paged data more efficiently.'
                throw new Error(msg);
            }

            /** @type {ChargeSource[]} charges */
            const charges = [];
            pagedData.iterator().each(page => {
                const pageIterator = page.value.data.iterator();
                pageIterator.each(row => {
                    const rowMap = row.value.asMap();
                    charges.push(_queryResultToChargeSource(rowMap));

                    return true;
                });

                return true;
            });

            return charges;
        };

        /**
         * Update the journal entry record with the effective rates provided
         * by the JournalEntry details.
         * 
         * @param {JournalEntry} journalEntry 
         * @returns {void}
         * @throws {Error} throws if the journal entry was not created from time posting
         */
        const updateJournalEntryEffectiveRates = (journalEntry) => {
            if (!journalIsTimePosting(journalEntry)) {
                let errMsg = `Unable to update effective rate for Journal Entry: ${journalEntry.id}.`;
                errMsg += ' Journal was not created from time posting.';
                throw new Error(errMsg);
            }

            const validationErrors = validateTimePostingJournal(journalEntry);
            if (validationErrors.length > 0) {
                let errMsg = 'Unable to update time posting journal entry effective rates.';
                errMsg += ` Journal Entry: ${journalEntry.id}`;
                errMsg += ` Errors: ${validationErrors.join(', ')}`;
                throw new Error(errMsg);
            }

            const jeRecord = record.load({
                type: record.Type.JOURNAL_ENTRY,
                id: journalEntry.id,
                isDynamic: false
            });
            for (const line of journalEntry.lines) {
                const fieldId = line.debit !== 0 ? 'debit' : 'credit';
                const amount = Math.round((line.time.effectiveRate * line.time.hours) * 100) / 100
                jeRecord.setSublistValue({
                    sublistId: 'line',
                    fieldId: fieldId,
                    line: line.lineNum,
                    value: amount 
                });
            }

            jeRecord.save({enableSourcing: false});
        };

        /**
         * Get the journal entry details needed for updating time-posting JEs with
         * the effective rate from Time Tracking records.
         * 
         * ## A note on joining journal entry lines with time tracking ##
         * The astute observer here might spot that gathering up this detail involves retreiving
         * data by loading the journal via the N/record module *and* getting the time tracking
         * data via the N/search module.
         * 
         * Why not just get all the data through one interface? Because getting the time data related
         * to a journal entry line is tricky and each interface only exposes part of the data.
         * 
         * @param {number} journalId 
         * @returns {JournalEntry | null}
         */
        const getJournalEntryDetail = (journalId) => {
            const jeRecord = record.load({type: record.Type.JOURNAL_ENTRY, id: journalId});
            const period = record.load({
                type: record.Type.ACCOUNTING_PERIOD,
                id: Number(jeRecord.getValue({fieldId: 'postingperiod'}))
            });

            /** @type {JournalEntry} je */
            const je = {
                id: journalId,
                status: String(jeRecord.getValue({fieldId: 'status'})),
                periodId: Number(period.getValue({fieldId: 'id'})),
                periodName: String(period.getValue({fieldId: 'periodname'})),
                periodIsOpen: !Boolean(period.getValue({fieldId: 'closed'})),
                lines: []
            };
            const timeLines = getTimeRecordsForJournalEntry(journalId);
            const lineCnt = jeRecord.getLineCount({sublistId: 'line'});
            for (let i = 0; i < lineCnt; i++) {
                const lineNum = Number(jeRecord.getSublistValue({
                    sublistId: 'line', line: i, fieldId: 'line'
                }));

                /** @type {JournalEntryLine} jeLine */
                const jeLine = {
                    lineNum: lineNum,
                    accountId: Number(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'account'
                    })),
                    debit: Number(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'debit'
                    })),
                    credit: Number(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'credit'
                    })),
                    projectClientId: Number(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'entity'
                    })),
                    employeeId: Number(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'entity2'
                    })),
                    chargeFromId: Number(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'department'
                    })),
                    bubId: Number(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'class'
                    })),
                    memo: String(jeRecord.getSublistValue({
                        sublistId: 'line', line: i, fieldId: 'memo'
                    })),
                    time: timeLines.get(lineNum) ?? null
                };
                je.lines.push(jeLine);
            }

            // Update credit lines with time info since credits are not associated with time
            // records natively in Netsuite.
            //
            // It would be simpler to just look at the previous line of the JE to get the debit
            // but that could be fragile. The approach below is slower, but has a better
            // chance of finding the corresponding debit line for the credit if the order of
            // the lines gets shuffled.

            /** @type {Object<string, JournalEntryLine[]>} */
            const jeLineHashMap = {};
            je.lines.forEach(line => {
                if (line.debit === 0 || line.time === null) {
                    return;
                }

                const hash = getJournalLineHashKey(line);
                if (!jeLineHashMap.hasOwnProperty(hash)) {
                    jeLineHashMap[hash] = [];
                }

                jeLineHashMap[hash].push(line);
            });

            for (const line of je.lines) {
                if (line.credit === 0 || line.time !== null) {
                    continue;
                }

                const currentLineHash = getJournalLineHashKey(line);
                /** @type {JournalEntryLine[]} */
                const matches = jeLineHashMap[currentLineHash] ?? [];
                const closestLine = findClosestJournalLine(line, matches)
                line.time = closestLine.time;
            }

            return je;
        };

        /**
         * Gets the details of the time tracking records associated with a Journal Entry.
         * 
         * Returns a JournalEntryTime entities mapped to their line number in the journal.
         * 
         * @param {number} journalId 
         * @returns {Map<number, JournalEntryTime | null>}
         */
        const getTimeRecordsForJournalEntry = (journalId) => {
            const columns = [
                {name: "line"},
                {name: "internalid",      join: "time"},
                {name: "employee",        join: "time"},
                {name: "customer",        join: "time"},
                {name: "class",           join: "time"},
                {name: "department",      join: "time"},
                {name: "durationdecimal", join: "time"},
                {name: "custcol_veic_effective_labor_rate", join: "time"},
            ];
            const jeTimeSearch = search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['type', search.Operator.ANYOF, SEARCH_TYPE_JOURNAL],
                    'AND',
                    ['internalid', search.Operator.ANYOF, journalId],
                    'AND',
                    ['time', search.Operator.NONEOF, '@NONE@']
                ],
                columns: columns.map(c => search.createColumn(c))
            });

            /** @type {Map<number, JournalEntryTime | null>} */
            const timeLines = new Map();
            const pagedData = jeTimeSearch.runPaged();
            pagedData.pageRanges.forEach((pageRange => {
                const page = pagedData.fetch({index: pageRange.index});
                page.data.forEach(result => {
                    const lineNum = Number(result.getValue({name: 'line'}));
                    const id = result.getValue({
                        name: "internalid",
                        join: "time"
                    });

                    if (!id) {
                        timeLines.set(lineNum, null);
                        return;
                    }

                    const employeeId = result.getValue({
                        name: "employee",
                        join: "time"
                    });
                    const projectId = result.getValue({
                        name: "customer",
                        join: "time"
                    });
                    const bubId = result.getValue({
                        name: "class",
                        join: "time"
                    });
                    const chargeFromId = result.getValue({
                        name: "department",
                        join: "time"
                    });
                    const hours = result.getValue({
                        name: "durationdecimal",
                        join: "time"
                    });
                    const effectiveRate = result.getValue({
                        name: "custcol_veic_effective_labor_rate",
                        join: "time"
                    });

                    timeLines.set(lineNum, {
                        id: Number(id),
                        employeeId: Number(employeeId),
                        projectId: projectId ? Number(projectId) : null,
                        bubId: bubId ? Number(bubId) : null,
                        chargeFromId: chargeFromId ? Number(chargeFromId) : null,
                        hours: hours ? Number(hours) : null,
                        effectiveRate: effectiveRate ? Number(effectiveRate) : null,
                    });
                });
            }));

            return timeLines;
        }

        /**
         * Check if the provided journal entry is from posting time. This is accomplished
         * by checking the journal entry lines. If even one line has a time transaction
         * associated with it, then it's a time posting journal.
         * 
         * Because time can't be manually associated with journal entry lines when creating 
         * journals, we can be sure that a journal entry that contains a time relationship is
         * from time posting.
         * 
         * @param {JournalEntry} journalEntry 
         * @returns {boolean}
         */
        const journalIsTimePosting = (journalEntry) => {
            for (const jeLine of journalEntry.lines) {
                if (jeLine.time !== null) {
                    return true;
                }
            }

            return false;
        };

        /**
         * This is a version of the journalIsPosted function that can be used when you don't
         * want to fetch all of the journal data and just need to know if the journal is
         * from time posting as soon as possible.
         * 
         * This takes in only the journal ID and is useful in client or user event scripts
         * that need to determine the source of a journal before proceeding with processing.
         * 
         * @param {number} journalId
         * @returns {boolean}
         */
        const journalIsTimePostingFromId = (journalId) => {
            let isTimePosting = false;
            const jeTimeSearch = search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['type', search.Operator.ANYOF, SEARCH_TYPE_JOURNAL],
                    'AND',
                    ['internalid', search.Operator.ANYOF, journalId],
                    'AND',
                    ['time', search.Operator.NONEOF, '@NONE@']
                ],
                columns: [search.createColumn({name: "internalid", join: "time"})]
            });

            const pagedData = jeTimeSearch.runPaged();
            for (const pageRange of pagedData.pageRanges) {
                const page = pagedData.fetch({index: pageRange.index});
                for (const result of page.data) {
                    const timeId = result.getValue({
                        name: "internalid",
                        join: "time"
                    });
    
                    if (timeId) {
                        isTimePosting = true;
                        break;
                    }
                }

                if (isTimePosting) {
                    break;
                }
            }

            return isTimePosting;
        };

        /**
         * Check that a journal entry from time posting has all the required data for updating
         * the effective rate of the lines.
         * 
         * @param {JournalEntry} journalEntry
         * @returns {string[]} an array of error messages
         * 
         */
        const validateTimePostingJournal = (journalEntry) => {
            const errors = [];
            if (journalEntry.status !== STATUS_PENDING_APPROVAL) {
                errors.push(`Journal entry: ${journalEntry.id} must be pending approval, actual status: ${journalEntry.status}`);
            }

            if (!journalEntry.periodIsOpen) {
                errors.push(
                    `Journal entry: ${journalEntry.id} is in a closed period. 
                    period id: ${journalEntry.periodId}, 
                    period name: ${journalEntry.periodName}`
                );
            }

            let debits = 0.0;
            let credits = 0.0;
            for (const line of journalEntry.lines) {
                if (line.time === null) {
                    errors.push(`Journal entry: ${journalEntry.id}, line: ${line.lineNum} does not have time info`);
                } else {
                    if (line.time.effectiveRate === null) {
                        errors.push(`Journal entry: ${journalEntry.id}, line: ${line.lineNum}, time tracking: ${line.time.id} does not have an effective rate`);
                    }

                    if (line.time.hours === null) {
                        errors.push(`Journal entry: ${journalEntry.id}, line: ${line.lineNum}, time tracking: ${line.time.id} hours is null`);
                    }
                }

                debits += line.debit;
                credits += line.credit;
            }

            debits = (Math.round(debits * 100) / 100);
            credits = (Math.round(credits * 100) / 100);

            if (debits !== credits) {
                // Note: Netsuite would obviously catch an out of balance JE, this is
                // to make sure we're fetching and storing JE data is correctly.
                errors.push(`Journal entry: ${journalEntry.id} does not balance. Debits: ${debits}, Credits: ${credits}`);
            }

            return errors;
        }

        /**
         * Create a hash key for a journal entry line using:
         * 
         * - Project ID (entity)
         * - Employee ID (entity2)
         * - BUB ID
         * - Charge From ID
         * - Amount (credit or debit)
         * 
         * ## Note about aggregated time posting
         * If we ever change Netsuite's config to aggregate time posting lines, the
         * hash key would likely need to omit the employeeId
         * 
         * @param {JournalEntryLine} jeLine 
         * @returns {string}
         */
        const getJournalLineHashKey = (jeLine) => {
            let hash = `${jeLine.projectClientId ?? 'null'}`;
            hash += `.${jeLine.employeeId ?? 'null'}`;
            hash += `.${jeLine.bubId ?? 'null'}`;
            hash += `.${jeLine.chargeFromId ?? 'null'}`;
            hash += `.${jeLine.debit > 0 ? jeLine.debit : jeLine.credit}`

            return hash;
        };

        /**
         * Given a single journal entry lines, find the closest line to
         * it in an array of other lines. If there is a line immediately
         * before and immediately after, return the preceding line.
         * 
         * If there is a duplicate line number to the target line, it is ignored.
         * 
         * Examples:
         * Starting line number: 5
         * Lines: [3, 6, 7, 9]
         * Returns: 6
         * 
         * Starting line number: 4
         * Lines: [3, 5, 6, 7, 9]
         * Returns: 3
         * 
         * Starting line number: 4
         * Lines: [3, 4, 5]
         * Returns: 3
         * 
         * @param {JournalEntryLine} targetLine 
         * @param {JournalEntryLine[]} lines 
         * @returns {JournalEntryLine | null} the closest je line or null if lines array is empty
         */
        const findClosestJournalLine = (targetLine, lines) => {
            const target = targetLine.lineNum;
            const candidates = lines.filter(l => l.lineNum !== target);
            if (candidates.length === 0) {
                return null;
            }

            /** @type {JournalEntryLine} */
            let closest = candidates[0];
            let minDiff = Math.abs(closest.lineNum - target);

            for (const line of candidates) {
                const diff = Math.abs(line.lineNum - target);
                if (diff < minDiff || (diff === minDiff && line.lineNum < closest.lineNum)) {
                    closest = line;
                    minDiff = diff;
                }
            }

            return closest;
        };

        /**
         * A private helper for converting a row in a query result to a ChargeSource
         * 
         * @param {QueryResultMap} resultRow 
         * @returns {ChargeSource}
         */
        const _queryResultToChargeSource = (resultRow) => {
            /** @type {ChargeSource} */
            const chargeSource = {
                chargeId: Number(resultRow['charge_id']),
                stage: String(resultRow['stage']),
                amount: Number(resultRow['amount']),
                employeeId: resultRow['employee_id'] ? Number(resultRow['employee_id']) : null,
                chargeRuleType: String(resultRow['charge_rule_type']),
                chargeTypeId: Number(resultRow['charge_type_id']),
                rate: Number(resultRow['rate']),
                effectiveRate: resultRow['effective_rate'] ? Number(resultRow['effective_rate']) : null,
                rateSourceType: String(resultRow['rate_source_type']),
                ruleId: Number(resultRow['rule_id']),
                timeRecordId: resultRow['time_record_id'] ? Number(resultRow['time_record_id']) : null,
                use: String(resultRow['use']),
            };

            return chargeSource;
        };

        return {
            assertInRange,
            calculateEffectiveLaborCost,
            findClosestJournalLine,
            getDirectCostChargesToUpdate,
            getChargeSourceDetail,
            getJournalEntryDetail,
            getJournalLineHashKey,
            getTimeDetailForTimesheet,
            getTimeRecordsForJournalEntry,
            isDirectCostCharge,
            journalIsTimePosting,
            journalIsTimePostingFromId,
            updateJournalEntryEffectiveRates,
            validateTimePostingJournal,
            fieldRanges
        };
    }
);
