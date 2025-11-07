/**
 * Provide customized version of the Manage Pending Charges page. Used to provide project managers and billing
 * managers with more detail about pending charges that isn't available in the native pending charges sublist.
 * 
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

const FORM_TITLE = 'VEIC - Manage Pending Charges';
const CHARGE_SUBLIST_ID = 'custpage_pending_charges';
const CLIENT_MODULE_PATH = 'SuiteScripts/Client Scripts/veic_cs_update_charges.js';
const UPDATE_CHARGES_URL_FIELD = 'custpage_update_charges_url';
const CHARGES_FOLDER_ID_PARAM = 'custscript_charge_updates_folder_id' // SB1 = 1602
const UPDATE_CHARGES_MR_SCRIPT_ID = 'customscript_veic_mr_update_charges';
const UPDATE_CHARGES_MR_DEPLOYEMENT_ID = 'customdeploy_veic_mr_update_charges';
const STAGES = {
    HOLD: 'HOLD_FOR_BILLING',
    READY: 'READY_FOR_BILLING',
    NON_BILLABLE: 'NON_BILLABLE',
};
const RESULT_STATUS = {
    SUCCESS: 'success', // all charges updated successfully
    WARNING: 'warning', // some charges updated successfully, some errors
    ERROR: 'error', // all updates failed
};

/**
 * @typedef {Object} ProjectInfo
 * @property {number} internalId
 * @property {string} client
 * @property {number} id
 * @property {string} name
 * @property {number} readyCount
 * @property {number} readyAmount
 * @property {number} holdCount
 * @property {number} holdAmount
 * @property {number} billedAmount
 * @property {number} creditAmount
 */

/**
 * @typedef {Object} ChargeDetail
 * @property {number} amount
 * @property {string} billing_class
 * @property {string} bub
 * @property {string} charge_date
 * @property {string} charge_from
 * @property {string} charge_type
 * @property {string} duration
 * @property {string} employee
 * @property {number} id
 * @property {string} item
 * @property {string} memo
 * @property {number} quantity
 * @property {number} rate
 * @property {string} stage
 * @property {string} task
 */

/**
 * @typedef ChargeUpdate
 * @property {number} chargeId
 * @property {string} stage
 */

/**
 * Get charges/billing totals for a Project
 * 
 * @param {number} projectId 
 * @param {query} query 
 * @returns {ProjectInfo}
 */
function getProjectInfo(projectId, query) {
    const cleanedProjId = Number(projectId);
    const billedToDateQuery = `SELECT
            BUILTIN.DF(j.customer) AS client,
            j.entityid AS project_id,
            j.companyname AS project_name,
            COALESCE(
                SUM(CASE WHEN t.type = 'CustInvc' THEN tl.foreignAmount ELSE 0 END), 0
            ) AS total_billed,
            COALESCE(
                SUM(CASE WHEN t.type = 'CustCred' THEN tl.foreignAmount ELSE 0 END), 0
            ) AS total_credit
        FROM job j
        LEFT JOIN transaction t ON t.job = j.id AND t.type IN ('CustInvc', 'CustCred')
        LEFT JOIN transactionline tl on t.id = tl.transaction AND tl.mainline = 'T'
        WHERE j.id = ?
        GROUP BY BUILTIN.DF(j.customer), j.entityid, j.companyname`;
    const billedToDateResultSet = query.runSuiteQL({
        query: billedToDateQuery,
        params: [cleanedProjId]
    });
    const billedToDate = billedToDateResultSet.results[0].asMap();

    /** @type {ProjectInfo} project */
    const project = {
        internalId: cleanedProjId,
        client: billedToDate.client,
        id: billedToDate.project_id,
        name: billedToDate.project_name,
        readyCount: 0,
        readyAmount: 0,
        holdCount: 0,
        holdAmount: 0,
        billedAmount: billedToDate.total_billed,
        creditAmount: billedToDate.total_credit,
    };

    const pendingChargesQuery = `SELECT
            SUM(CASE WHEN stage = 'HOLD_FOR_BILLING' THEN amount ELSE 0 END) AS hold_total,
            SUM(CASE WHEN stage = 'READY_FOR_BILLING' THEN amount ELSE 0 END) AS ready_total,
            SUM(CASE WHEN stage = 'HOLD_FOR_BILLING' THEN 1 ELSE 0 END) AS hold_count,
            SUM(CASE WHEN stage = 'READY_FOR_BILLING' THEN 1 ELSE 0 END) AS ready_count,
            SUM(amount) AS total_pending
        FROM charge
        WHERE stage IN ('HOLD_FOR_BILLING', 'READY_FOR_BILLING')
            AND billto = ?
            AND use = 'Actual'`;
    const pendingChargesResultSet = query.runSuiteQL({
        query: pendingChargesQuery,
        params: [cleanedProjId]
    });
    const pendingCharges = pendingChargesResultSet.results[0].asMap();
    project.readyCount = pendingCharges.ready_count;
    project.readyAmount = pendingCharges.ready_total;
    project.holdCount = pendingCharges.hold_count;
    project.holdAmount = pendingCharges.hold_total;

    return project;
}

/**
 * Fetch the details for the project's pending charges via SuiteQL
 * 
 * @param {query} query 
 * @param {number} projectId 
 * @param {string | null} stage
 * @returns {ChargeDetail[]}
 */
function getChargeDetails(query, projectId, stage = null) {
    const cleanedProjId = Number(projectId);
    const stageClause = stage === null
        ? "AND c.stage IN ('HOLD_FOR_BILLING', 'READY_FOR_BILLING', 'NON_BILLABLE')"
        : "AND c.stage = ?";
    const q = `SELECT
                c.id AS id,
                c.chargeDate AS charge_date,
                BUILTIN.DF(c.chargeType) AS charge_type,
                BUILTIN.DF(c.billingItem) AS item,
                COALESCE(BUILTIN.DF(t.caseTaskEvent), ' ') AS task,
                COALESCE(BUILTIN.DF(c.class), ' ') AS bub,
                COALESCE(BUILTIN.DF(c.department), ' ') AS charge_from,
                COALESCE(BUILTIN.DF(c.chargeEmployee), ' ') AS employee,
                CASE WHEN COALESCE(t.hours, 0) > 0 THEN
                    TO_CHAR(FLOOR(t.Hours)) || ':' || LPAD(TO_CHAR(ROUND((t.hours - FLOOR(t.hours)) * 60, 0)), 2, '0')
                ELSE
                    ' '
                END AS duration,
                COALESCE(c.memo, ' ') AS memo,
                c.quantity AS quantity,
                c.rate AS rate,
                BUILTIN.DF(c.stage) AS stage,
                COALESCE(BUILTIN.DF(a.billingClass), ' ') AS billing_class,
                c.amount AS amount
            FROM charge c
            LEFT JOIN TimeBill t ON t.id = c.timeRecord
            LEFT JOIN projectTaskAssignee a ON a.projecttask = t.caseTaskEvent
                AND a.resource = t.employee
            WHERE c.billTo = ?
                ${stageClause}
                AND c.use = 'Actual'
            ORDER BY c.chargeDate ASC`;

    /** @type {Array<number | string>} */
    const params = [cleanedProjId];
    if (stage !== null) {
        params.push(stage);
    }
    const resultSet = query.runSuiteQL({
        query: q,
        params
    });
    const results = resultSet.results;
    const charges = [];
    for (let i = 0; i < results.length; i++) {
        const chargeData = results[i].asMap();
        charges.push({
            amount:        Number(chargeData.amount),
            billing_class: chargeData.billing_class,
            bub:           chargeData.bub,
            charge_date:   chargeData.charge_date,
            charge_from:   chargeData.charge_from,
            charge_type:   chargeData.charge_type,
            duration:      chargeData.duration,
            employee:      chargeData.employee,
            id:            Number(chargeData.id),
            item:          chargeData.item,
            memo:          chargeData.memo,
            quantity:      Number(chargeData.quantity),
            rate:          Number(chargeData.rate),
            stage:         chargeData.stage,
            task:          chargeData.task,
        });
    }

    return charges;
}

/**
 * Build the form
 * 
 * @param {serverWidget} serverWidget 
 * @param {query} query 
 * @param {ProjectInfo} project
 * @param {string | null} stage
 * @param {Message | null} msg
 * @returns {Form}
 */
function getChargeList(serverWidget, query, project, stage, msg = null) {
    const form = serverWidget.createForm({
        title: FORM_TITLE
    });
    form.clientScriptModulePath = CLIENT_MODULE_PATH;

    if (msg) {
        form.addPageInitMessage({message: msg});
    }

    // ### Hidden field that holds the url to POST charge changes to ###
    const urlField = form.addField({
        id: UPDATE_CHARGES_URL_FIELD,
        label: 'Charge Update URL',
        type: serverWidget.FieldType.TEXT
    });
    urlField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});

    // ### Form buttons ###
    const holdBtn = form.addButton({
        id: 'custpage_hold_btn',
        label: 'Mark for Hold',
        functionName: 'setChargesToHold'
    });
    const readyBtn = form.addButton({
        id: 'custpage_ready_btn',
        label: 'Mark Ready',
        functionName: 'setChargesToReady'
    });
    const nonBillableBtn = form.addButton({
        id: 'custpage_non_billable_btn',
        label: 'Mark Non-Billable',
        functionName: 'setChargesToNonBillable'
    });

    const stageSelect = form.addField({
        id: 'custpage_stage_select',
        type: serverWidget.FieldType.SELECT,
        label: 'Stage'
    });

    stageSelect.addSelectOption({value: '', text: '- All -'});
    stageSelect.addSelectOption({value: 'hold', text: 'Hold', isSelected: stage === STAGES.HOLD});
    stageSelect.addSelectOption({value: 'ready', text: 'Ready', isSelected: stage === STAGES.READY});

    // ### Project info fields ###
    // name
    form.addFieldGroup({
        id: 'fgrp_project_info',
        label: 'Project Information'
    });
    const clientField = form.addField({
        id: 'custpage_client',
        type: serverWidget.FieldType.TEXT,
        label: 'Client',
        container: 'fgrp_project_info'
    });
    clientField.defaultValue = project.client;
    clientField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    const projectNameField = form.addField({
        id: 'custpage_proj_name',
        type: serverWidget.FieldType.TEXT,
        label: 'Project Name',
        container: 'fgrp_project_info'
    });
    projectNameField.defaultValue = `${project.id} ${project.name}`;
    projectNameField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    // counts
    form.addFieldGroup({
        id: 'fgrp_charge_summary',
        label: 'Charges Summary'
    });
    const readyCountField = form.addField({
        id: 'custpage_charge_ready_cnt',
        type: serverWidget.FieldType.INTEGER,
        label: 'Ready Count',
        container: 'fgrp_charge_summary'
    });
    readyCountField.defaultValue = project.readyCount;
    readyCountField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    const onHoldCountField = form.addField({
        id: 'custpage_charge_hold_cnt',
        type: serverWidget.FieldType.INTEGER,
        label: 'Hold Count',
        container: 'fgrp_charge_summary'
    });
    onHoldCountField.defaultValue = project.holdCount;
    onHoldCountField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    // amounts
    const billedAmountField = form.addField({
        id: 'custpage_billed_amt',
        type: serverWidget.FieldType.CURRENCY,
        label: 'Billed to Date',
        container: 'fgrp_charge_summary'
    });
    billedAmountField.defaultValue = project.billedAmount;
    billedAmountField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    const readyAmountField = form.addField({
        id: 'custpage_charge_ready_amt',
        type: serverWidget.FieldType.CURRENCY,
        label: 'Ready Amount',
        container: 'fgrp_charge_summary'
    });
    readyAmountField.defaultValue = project.readyAmount;
    readyAmountField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    const onHoldAmountField = form.addField({
        id: 'custpage_charge_hold_amt',
        type: serverWidget.FieldType.CURRENCY,
        label: 'Hold Amount',
        container: 'fgrp_charge_summary'
    });
    onHoldAmountField.defaultValue = project.holdAmount;
    onHoldAmountField.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    // ### Charges list ###
    const chargeList = form.addSublist({
        id: CHARGE_SUBLIST_ID,
        label: 'Pending Charges',
        type: serverWidget.SublistType.LIST,
    });
    chargeList.addMarkAllButtons();
    const fields = [
        {id: 'select',         label: 'Select',               type: serverWidget.FieldType.CHECKBOX},
        {id: 'charge_id',      label: 'Charge ID',            type: serverWidget.FieldType.TEXT},
        {id: 'charge_stage',   label: 'Stage',                type: serverWidget.FieldType.TEXT},
        {id: 'charge_date',    label: 'Date',                 type: serverWidget.FieldType.DATE},
        {id: 'charge_type',    label: 'Type',                 type: serverWidget.FieldType.TEXT},
        {id: 'expense_item',   label: 'Item',                 type: serverWidget.FieldType.TEXT},
        // {id: 'client_project', label: 'Client : Project',     type: serverWidget.FieldType.TEXT},
        {id: 'project_task',   label: 'Task',                 type: serverWidget.FieldType.TEXT},
        {id: 'bub',            label: 'Business Unit Budget', type: serverWidget.FieldType.TEXT},
        {id: 'charge_from',    label: 'Charge From',          type: serverWidget.FieldType.TEXT},
        {id: 'employee',       label: 'Employee',             type: serverWidget.FieldType.TEXT},
        {id: 'billing_class',  label: 'Billing Class',        type: serverWidget.FieldType.TEXT},
        {id: 'duration',       label: 'Duration',             type: serverWidget.FieldType.TEXT},
        {id: 'memo',           label: 'Memo',                 type: serverWidget.FieldType.TEXT},
        {id: 'quantity',       label: 'Quantity',             type: serverWidget.FieldType.FLOAT},
        {id: 'rate',           label: 'Rate',                 type: serverWidget.FieldType.CURRENCY},
        {id: 'ext_amount',     label: 'Amount',               type: serverWidget.FieldType.CURRENCY},
    ];
    fields.forEach(f => chargeList.addField(f));

    // Make memo field editable
    const memoField = chargeList.getField({id: 'memo'});
    memoField.updateDisplayType({displayType: serverWidget.FieldDisplayType.ENTRY});
    memoField.updateDisplaySize({height: 1, width: 35});

    const charges = getChargeDetails(query, project.internalId, stage);
    let lineNum = 0;
    for (const charge of charges) {
        chargeList.setSublistValue({
            id: 'charge_id',
            line: lineNum,
            value: charge.id
        });
        chargeList.setSublistValue({
            id: 'charge_date',
            line: lineNum,
            value: charge.charge_date
        });
        chargeList.setSublistValue({
            id: 'charge_type',
            line: lineNum,
            value: charge.charge_type
        });
        chargeList.setSublistValue({
            id: 'expense_item',
            line: lineNum,
            value: charge.item
        });
        chargeList.setSublistValue({
            id: 'project_task',
            line: lineNum,
            value: charge.task
        });
        chargeList.setSublistValue({
            id: 'bub',
            line: lineNum,
            value: charge.bub
        });
        chargeList.setSublistValue({
            id: 'charge_from',
            line: lineNum,
            value: charge.charge_from
        });
        chargeList.setSublistValue({
            id: 'employee',
            line: lineNum,
            value: charge.employee
        });
        chargeList.setSublistValue({
            id: 'billing_class',
            line: lineNum,
            value: charge.billing_class
        });
        chargeList.setSublistValue({
            id: 'duration',
            line: lineNum,
            value: charge.duration
        });
        chargeList.setSublistValue({
            id: 'memo',
            line: lineNum,
            value: charge.memo
        });
        chargeList.setSublistValue({
            id: 'quantity',
            line: lineNum,
            value: charge.quantity
        });
        chargeList.setSublistValue({
            id: 'rate',
            line: lineNum,
            value: charge.rate
        });
        chargeList.setSublistValue({
            id: 'charge_stage',
            line: lineNum,
            value: charge.stage
        });
        chargeList.setSublistValue({
            id: 'ext_amount',
            line: lineNum,
            value: charge.amount
        });

        lineNum++;
    }

    return form;
}

/**
 * Add an alert to the top of the page to notify the user of charge update results status.
 * 
 * @param {message} message 
 * @param {string} status
 * @returns {string}
 */
function getMessageType(message, status) {
    let msgType;
    switch (status) {
        case RESULT_STATUS.SUCCESS:
            msgType = message.Type.CONFIRMATION;
            break;
        case RESULT_STATUS.WARNING:
            msgType = message.Type.WARNING;
            break;
        case RESULT_STATUS.ERROR:
            msgType = message.Type.ERROR;
            break;
        default:
            msgType = message.Type.INFORMATION;
    }
    
    return msgType;
}

/**
 * Serialize charge updates as JSON and write to file saved to the 
 * file cabinet. This file will be used as the the data source for the
 * input in the update charges stage map/reduce script.
 * 
 * @param {Array<ChargeUpdate>} charges 
 * @param {number} folderId 
 * @param {file} file 
 * @returns {number} the file id of the JSON file in the file cabinet
 */
function writeChargeUpdateFile(charges, folderId, file) {
    const filename = `charge_updates_${Date.now()}.json`;
    const chargesFile = file.create({
        name: filename,
        fileType: file.Type.JSON,
        contents: JSON.stringify(charges),
        description: 'List of pending charge updates',
        encoding: file.Encoding.UTF8,
        folder: folderId,
        isOnline: false
    });

    return chargesFile.save();
}

/**
 * Trigger the map/reduce script to update the charges. Pass the file ID of the pending
 * charges file as a param to the MR script.
 * 
 * @param {task} task 
 * @param {number} fileId
 * @returns {string} the task ID
 */
function triggerUpdate(task, fileId) {
    const mrTask = task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: UPDATE_CHARGES_MR_SCRIPT_ID,
        deploymentId: UPDATE_CHARGES_MR_DEPLOYEMENT_ID,
        params: {custscript_charge_updates_file_id: fileId}
    });

    return mrTask.submit();
}

// @ts-ignore
define(
    [
        'N/log',
        'N/error',
        'N/ui/serverWidget',
        'N/ui/message',
        'N/query',
        'N/file',
        'N/task',
        'N/runtime'
    ],
    /**
     * @typedef log
     * @typedef error
     * @typedef serverWidget
     * @typedef message
     * @typedef query
     * @typedef file
     * @typedef task
     * @typedef runtime
     * @typedef ServerRequest
     * @typedef ServerResponse
     * @typedef Form
     * @typedef Message
     * 
     * @param{log} log
     * @param{error} error
     * @param{serverWidget} serverWidget
     * @param{message} message
     * @param{query} query
     * @param{file} file
     * @param{task} task
     * @param{runtime} runtime
     */
    (log, error, serverWidget, message, query, file, task, runtime) => {
        /**
         * @param {Object} context
         * @param {ServerRequest} context.request - Incoming request
         * @param {ServerResponse} context.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (context) => {
            const request = context.request;
            if (context.request.method === 'GET') {
                /** @type {number} projectId */
                const projectId = request.parameters.project_id;
                if (!projectId) {
                    throw error.create({
                        name: 'MISSING_REQ_PARAM',
                        message: 'Unable to load pending charges. Missing parameter: project_id.'
                    });
                }

                /** @type {Message | null} updateResult */
                let msg = null;
                const resultStatus = request.parameters.result_status;
                if (resultStatus) {
                    msg = message.create({
                        type: getMessageType(message, resultStatus),
                        title: request.parameters.result_title ?? '',
                        message: request.parameters.result_message ?? ''                        
                    });
                }

                /** @type {string | null} stage, default: HOLD */
                let stage = STAGES.HOLD;
                const stageParam = request.parameters.stage ?? null;
                if (stageParam !== null) {
                    // null stage is effectively 'All'
                    stage = STAGES[String(stageParam).toUpperCase()] ?? null;
                }

                const project = getProjectInfo(projectId, query);
                const form = getChargeList(serverWidget, query, project, stage, msg);
                context.response.writePage(form);
            } else if (context.request.method === 'POST') {
                /** @type Array<Object> */
                const charges = JSON.parse(context.request.body);
                log.debug({
                    title: 'Updating charges',
                    details: JSON.stringify(charges)
                });

                const script = runtime.getCurrentScript();
                /** @type {number} chargesFolderId */
                const chargesFolderId = script.getParameter({name: CHARGES_FOLDER_ID_PARAM});
                if (!chargesFolderId) {
                    throw new Error('Missing folder parameter for charge updates file');
                }

                const chargesFileId = writeChargeUpdateFile(charges, chargesFolderId, file);
                const taskId = triggerUpdate(task, chargesFileId);
                log.debug({title: 'Charge update task started', details: `Task ID: ${taskId}`});

                context.response.setHeader({name: 'Content-Type', value: 'application/json'});
                context.response.write({output: JSON.stringify({count: charges.length})});
            } else {
                throw error.create({
                    name: 'INVALID_HTTP_METHOD',
                    message: `Unsupported HTTP method: ${context.request.method}`
                });
            }
        }

        return { onRequest };
    }
);
