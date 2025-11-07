/**
 * VEIC Fees and Discounts Library
 * --------------------------------
 * Contains functions and objects common to calculating fees and discounts for invoices.
 * 
 * This feature depends on the custom Fee Rule record. Fee Rules are child records of projects
 * and contain the information necessary to calculate Fee Items to add to invoices.
 * 
 * See Cost Reimbursable Billing Design Doc for details on how this process works:
 * https://confluence.veic.org/spaces/ERP/pages/364022556/Cost+Reimbursable+Billing
 */

// ## Types ##
/** @typedef {import('veic-types/feesAndDiscounts').BillableItem} BillableItem */
/** @typedef {import('veic-types/feesAndDiscounts').Invoice} Invoice */
/** @typedef {import('veic-types/feesAndDiscounts').InvoiceLine} InvoiceLine */
/** @typedef {import('veic-types/feesAndDiscounts').FeeRule} FeeRule */
/** @typedef {import('veic-types/feesAndDiscounts').Fee} Fee */

/**
 * @NApiVersion 2.1
 * @NModuleScope public
 */
// @ts-ignore
define(['N/record', 'N/query', 'N/log'],
    /**
     * @param {import('N/record')} record
     * @param {import('N/query')} query
     * @param {import('N/log')} log
     * @returns {import('veic-types/feesAndDiscounts').FeesAndDiscounts}
     */
    (record, query, log) => {
        const MAX_RESULT_COUNT = 1e4;
        const ITEM_SUBLIST = 'item';
        const STATUS_PENDING_APPROVAL = 'Pending Approval';

        /**
         * Calculate fee items to apply to an invoice based on the rules associated
         * with the project. This is the main function for the library.
         * 
         * @param {number} invoiceId 
         * @returns {number} the id of the saved invoice.
         */
        const processInvoiceFees = (invoiceId) => {
            const itemMap = getItemMap();
            const invoice = getInvoice(invoiceId, itemMap);
            const feeRules = getFeeRules(invoice.projectId, itemMap);
            const fees = calculateInvoiceFees(invoice, feeRules, itemMap);

            log.debug({
                title: 'Fee application',
                details: `Calculated ${fees.length} fees for
                    invoice: ${invoice.id},
                    project: ${invoice.projectId},
                    rules: ${feeRules.map(r => r.id).join(', ')}
                    system item count: ${Array.from(itemMap.keys()).length}
                `
            });

            return addFeesToInvoice(invoice, fees);
        }

        /**
         * Add the provided fees to the invoice and save the record.
         * 
         * @param {Invoice} invoice 
         * @param {Fee[]} fees
         * @returns {number} the ID of the saved invoice
         */
        const addFeesToInvoice = (invoice, fees) => {
            const invoiceRec = record.load({id: invoice.id, type: record.Type.INVOICE});
            if (!invoiceRec) {
                throw new Error(`Unable to load invoice for id ${invoice.id}`);
            }

            if (fees.length === 0) {
                return invoice.id;   
            }

            const lineCount = invoiceRec.getLineCount({sublistId: ITEM_SUBLIST});
            fees.forEach((fee, index) => {
                if (fee.amount === 0) {
                    log.audit({
                        title: 'Empty fee',
                        details: `Attempted to add a fee with $0 amount to invoice: ${invoice.id}. Fee: ${JSON.stringify(fee)}`
                    });

                    return;
                }

                const line = lineCount + index;

                // item
                invoiceRec.setSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: line,
                    fieldId: 'item',
                    value: fee.item.id
                });

                // description
                invoiceRec.setSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: line,
                    fieldId: 'description',
                    value: fee.description
                });
                // quantity
                invoiceRec.setSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: line,
                    fieldId: 'quantity',
                    value: fee.quantity
                });
                // rate
                invoiceRec.setSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: line,
                    fieldId: 'rate',
                    value: Math.round(fee.rate * 100) / 100
                });
                // amount
                invoiceRec.setSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: line,
                    fieldId: 'amount',
                    value: fee.amount
                });
                // chargeFrom
                invoiceRec.setSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: line,
                    fieldId: 'department',
                    value: fee.chargeFromId
                });
                // bub
                invoiceRec.setSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: line,
                    fieldId: 'class',
                    value: fee.bubId
                });
            });

            return invoiceRec.save();
        };

        /**
         * Calculate fee items to apply to an invoice based on the rules associated
         * with the project.
         * 
         * This gets a little tricky, so lets walk through it. Remember, the fee rules are
         * a graph: a fee rule can depend on another fee rule.
         * 
         * - Get a map of all item records. This simplifies looking up items later
         * - Get the details of the invoice needed for calculating the fees
         * - Map the invoice line amounts to the line Item IDs, this will be useful for
         *   summing up eligble lines to apply fees to.
         * - Get the fee rules for the project associated with the invoice
         * - For each fee rule, create a new Fee object:
         *      - Get the total amount for each Item on the invoice
         *      - Create a Map of Rule ID => Fee to store computed fees
         *      - For each rule, generate a Fee
         *      - Recursively generate a fee for each included fee and add its amount
         *        to the dependent fee's amount. This is the trickiest part. The function
         *        that gets called recursively is `computeFee`
         * 
         * ### Validation ###
         * This function will
         * - call validateFeeRule for each rule
         * - check that the rules provided are associated with the project on the invoice
         * - check that there are no circular dependencies for the rules
         * 
         * If any of these checks fail, an error is thrown.
         * 
         * @param {Invoice} invoice
         * @param {FeeRule[]} feeRules
         * @param {Map<number, BillableItem>} itemMap
         * @returns {Fee[]}
         * @throws {Error}
         */
        const calculateInvoiceFees = (invoice, feeRules, itemMap) => {
            if (invoice.status !== STATUS_PENDING_APPROVAL) {
                let errMsg = 'Invalid invoice status. Can only assign fees to invoices with';
                errMsg += ` status: ${STATUS_PENDING_APPROVAL}, got ${invoice.status}`;
                throw new Error(errMsg);
            }

            if (feeRulesContainCycle(feeRules)) {
                let errMsg = `Could not calculate fees for invoice ${invoice.id}.`;
                errMsg += ` Fee rules for project ${invoice.projectId} contain circular dependencies.`
                errMsg += ' Update the included fees on these rules and try again';
                throw new Error(errMsg);
            }

            /** @type {Map<number, number>} */
            const itemAmounts = new Map();
            for (const line of invoice.lines) {
                const itemId = line.item.id;
                const prevAmt = itemAmounts.get(itemId) ?? 0.0;
                itemAmounts.set(itemId, prevAmt + line.amount);
            }

            const today = new Date();
            /**
             * Returns true if today is within the rules start and end date (inclusive),
             * otherwise false.
             * 
             * @param {FeeRule} rule 
             * @returns {boolean}
             */
            const ruleIsActive = (rule) => {
                if (rule.startDate > today || rule.endDate < today) {
                    return false;
                }

                return true;
            }

            /** @type {Map<number, Fee>} */
            const feeMap = new Map();

            /**
             * 
             * @param {FeeRule} rule 
             * @returns {Fee}
             */
            const computeFee = (rule) => {
                if (feeMap.has(rule.id)) {
                    return feeMap.get(rule.id);
                }

                validateFeeRule(rule, itemMap);
                if (rule.projectId !== invoice.projectId) {
                    let errMsg = 'Invalid fee rule: the rule does not belong to the project associated';
                    errMsg += `  with this invoice: Rule ID: ${rule.id}, rule name: ${rule.name}`;
                    errMsg += ` rule project: ${rule.projectId}, invoice project: ${invoice.projectId}`;
                    throw new Error(errMsg);
                }

                let base = 0.0;
                for (const item of rule.basis) {
                    base += itemAmounts.get(item.id) ?? 0.0;
                }
                
                for (const includeRule of rule.include) {
                    if (!ruleIsActive(rule)) {
                        continue;
                    }
                    const includeFee = computeFee(includeRule);
                    base += includeFee.amount;
                }
                
                const amount = base * rule.rate;
                /** @type {Fee} */
                const fee = {
                    rule: rule,
                    item: rule.item,
                    quantity: 1,
                    rate: amount,
                    amount: amount,
                    description: `Fee: ${rule.name}`, // TODO: get description from memo field of rule
                    chargeFromId: null, // TODO: figure out if we need to set this
                    bubId: null // TODO: figure out if we need to set this
                };
                feeMap.set(rule.id, fee);

                return fee;
            };

            for (const rule of feeRules) {
                if (ruleIsActive(rule)) {
                    computeFee(rule);
                }
            }

            const fees = Array.from(feeMap.values()).filter(f => f.amount > 0.0);

            return fees;
        };

        /**
         * Get the details of an invoice required for calculating fees.
         * 
         * @param {number} invoiceId 
         * @param {Map<number, BillableItem>} itemMap 
         * @returns {Invoice}
         */
        const getInvoice = (invoiceId, itemMap) => {
            const invoiceRec = record.load({
                type: record.Type.INVOICE,
                id: invoiceId
            });
            /** @type {Invoice} */
            const invoice = {
                id: invoiceId,
                projectId: Number(invoiceRec.getValue({fieldId: 'job'})),
                status: String(invoiceRec.getValue({fieldId: 'status'})),
                lines: []
            };
            
            const lineCount = invoiceRec.getLineCount({sublistId: ITEM_SUBLIST});
            for (let i = 0; i < lineCount; i++) {
                const itemId = Number(invoiceRec.getSublistValue({
                    sublistId: ITEM_SUBLIST,
                    line: i,
                    fieldId: 'item'
                }));

                /** @type {BillableItem | undefined} */
                const item = itemMap.get(itemId);
                if (!item) {
                    // This should never happen.
                    throw new Error(`Could not find Item record in itemMap for invoice line: ${i} with item ID: ${itemId}.`)
                }

                /** @type {InvoiceLine} */
                const invLine = {
                    lineNum: i,
                    amount: Number(invoiceRec.getSublistValue({
                        sublistId: ITEM_SUBLIST,
                        line: i,
                        fieldId: 'amount'
                    })),
                    item: item
                };

                invoice.lines.push(invLine);
            }

            return invoice;
        };

        /**
         * Fetch the fee rules associate with a project.
         * 
         * Note that limits on results are not a concern here since we don't expect a huge
         * number of rules to be associated with projects, ~12 max.
         * 
         * This enforces a few requirements to ensure that fee rules loaded are valid:
         * - Rule basis references a valid item in itemMap
         * - The include list of each rule only includes valid rules
         * - The rule's include list does not contain itself
         * 
         * If any of the above checks fails, an error is thrown.
         * 
         * @param {number} projectId 
         * @param {Map<number, BillableItem>} itemMap
         * @returns {FeeRule[]}
         * @throws {Error}
         */
        const getFeeRules = (projectId, itemMap) => {
            const q = `
                SELECT 
                    fr.id                            AS id,
                    fr.custrecord_veic_fr_project    AS project_id,
                    fr.name                          AS name,
                    fr.custrecord_veic_fr_rate       AS rate,
                    fr.custrecord_veic_fr_basis      AS basis,
                    fr.custrecord_veic_fr_include    AS include,
                    fr.custrecord_veic_fr_fee_item   AS item_id,
                    i.itemid                         AS item_name,
                    fr.custrecord_veic_fr_start_date AS start_date,
                    fr.custrecord_veic_fr_end_date   AS end_date
                FROM CUSTOMRECORD_VEIC_FEE_RULE fr
                LEFT JOIN item i ON fr.custrecord_veic_fr_fee_item = i.id
                WHERE custrecord_veic_fr_project = ?
            `;
            const resultSet = query.runSuiteQL({query: q, params: [projectId]});
            const results = resultSet.results;

            /** @type {Map<number, FeeRule>} */
            const rules = new Map();

            /** @type {{id: number, include: number[]}[]} */
            const ruleGraphRaw = [];
            for (const result of results) {
                const resultMap = result.asMap();

                /** @type {Array<BillableItem | null>} */
                const basis = String(resultMap.basis).split(',').map(strId => {
                    const itemId = Number(strId);
                    if (!itemMap.has(itemId)) {
                        let errMsg = 'Rule references unknown item in basis.';
                        errMsg += ` Item ID: ${itemId}, rule ID: ${resultMap.id}, rule name: ${resultMap.name}`
                        throw new Error(errMsg);
                    }

                    return itemMap.get(itemId);
                });

                const ruleId = Number(resultMap.id);
                rules.set(ruleId, {
                    id: ruleId,
                    projectId: Number(resultMap.project_id),
                    name: String(resultMap.name),
                    rate: Number(resultMap.rate),
                    basis: basis.filter(item => item !== null),
                    include: [], // gets populated after all FeeRules are parsed
                    item: {
                        id: Number(resultMap.item_id),
                        name: String(resultMap.item_name)
                    },
                    startDate: new Date(Date.parse(String(resultMap.start_date))),
                    endDate: new Date(Date.parse(String(resultMap.end_date))),
                });

                let include = [];
                if (resultMap.include) {
                    const includeStr = String(resultMap.include).replace(/\s+/g, '');
                    include = includeStr.split(',').map(i => Number(i));
                }

                ruleGraphRaw.push({
                    id: ruleId,
                    include: include
                });
            }

            for (const ruleRaw of ruleGraphRaw) {
                const currentRule = rules.get(ruleRaw.id);
                currentRule.include = ruleRaw.include.map(ruleId => {
                    if (!rules.has(ruleId)) {
                        let errMsg = 'Rule references unknown rule in include list.';
                        errMsg += ` Rule ID: ${currentRule.id}, rule name: ${currentRule.name}`
                        errMsg += `, include rule ID: ${ruleId}`;
                        throw new Error(errMsg);
                    }

                    if (currentRule.id === ruleId) {
                        let errMsg = 'Rule cannot include itself in include list.';
                        errMsg += ` Rule ID: ${currentRule.id}, rule name: ${currentRule.name}`
                        errMsg += `, include rule ID: ${ruleId}`;
                        throw new Error(errMsg);
                    }

                    return rules.get(ruleId);
                }).filter(includeRule => includeRule !== null);
            }

            return Array.from(rules.values());
        };

        /**
         * Get a list of all active Items mapped by ID. Used to provide more detail
         * in logs/notifications when working with Items.
         * 
         * Note that we fetch all items rather than only items used on an invoice because
         * it's just simpler and I don't expect there to be more than 100-200 active items
         * in the system. If that changes, then we should consider changing this approach.
         * 
         * @returns {Map<number, BillableItem>}
         */
        const getItemMap = () => {
            const q = `SELECT i.id, i.itemid FROM item i WHERE nvl(i.isInactive, 'F') = 'F'`
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

            /** @type {Map<number, BillableItem>} */
            const items = new Map();
            pagedData.iterator().each(page => {
                page.value.data.iterator().each(row => {
                    const rowMap = row.value.asMap();
                    const id = Number(rowMap.id);
                    items.set(id, {id: id, name: String(rowMap.itemid)});

                    return true;
                });

                return true;
            });

            return items;
        };

        /**
         * Check that an individual fee rule is valid. Throw error on fail.
         * 
         * Checks:
         * - The fee does not include itself
         * - The item(s) used as the basis actually exist
         * 
         * @param {FeeRule} rule 
         * @param {Map<number, BillableItem>} itemMap
         * @returns {void}
         * @throws {Error}
         */
        const validateFeeRule = (rule, itemMap) => {
            if (rule.include.some(i => i.id === rule.id)) {
                let errMsg = 'Invalid fee rule: the rule references itself in its include list.';
                errMsg += ` rule ID ${rule.id}, rule name: ${rule.name}`;
                throw new Error(errMsg);
            }

            for (const item of rule.basis) {
                if (!itemMap.has(item.id)) {
                    let errMsg = 'Invalid fee rule: could not find item used in rule basis.';
                    errMsg += ` Rule ID: ${rule.id}, rule name: ${rule.name}`;
                    errMsg += `, item id ${item.id}, item name: ${item.name}`;
                    throw new Error(errMsg);
                }
            }
        };

        /**
         * Check if the the fee rules contain a circular dependency. A circular dependency in fee
         * rules would create an infinite loop while calculating fees. I doubt our clients want to
         * pay an infinite fee.
         * 
         * To figure this out, we'll use depth first search to traverse the fee rules as a graph.
         * If we hit the same vertex in the graph twice then we have a cycle.
         * 
         * Example of rules with this problem:
         * 
         * | Fee | Include |
         * | --- | ------- |
         * | A   | B       |
         * | B   | C       |
         * | C   | A       |
         * 
         * @param {FeeRule[]} rules 
         * @returns {boolean}
         */
        const feeRulesContainCycle = (rules) => {
            /** @type {Set<number>} a set of rule IDs */
            const visited = new Set();

            /** @type {Set<number>} a set of rule IDs*/
            const inStack = new Set();

            /**
             * Depth first search. Returns true if cycle is found.
             * 
             * @param {FeeRule} rule 
             * @returns {boolean}
             */
            const dfs = (rule) => {
                if (inStack.has(rule.id)) {
                    // Cycle found  
                    return true;
                }

                if (visited.has(rule.id)) {
                    // Already explored this node, no cycle found
                    return false;
                }

                visited.add(rule.id);
                inStack.add(rule.id);
                for (const include of rule.include) {
                    if (dfs(include)) {
                        // Cycle found
                        return true;
                    }
                }

                inStack.delete(rule.id);

                return false;
            };

            for (const rule of rules) {
                if (dfs(rule)) {
                    return true;
                }
            }

            return false;
        };

        return {
            addFeesToInvoice,
            calculateInvoiceFees,
            feeRulesContainCycle,
            getFeeRules,
            getInvoice,
            getItemMap,
            processInvoiceFees,
            validateFeeRule,
        };
    }
);
