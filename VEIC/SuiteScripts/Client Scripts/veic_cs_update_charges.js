/**
 * Custom module that provides the functions for updating Charge records in the
 * veic_sl_manage_pending_charges Suitelet
 * 
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */

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
const CHARGE_LIST_ID = 'custpage_pending_charges';
const STAGE_SELECT_ID = 'custpage_stage_select';
const MEMO_FIELD_ID = 'memo';
const CHARGE_ID_FIELD_ID = 'charge_id';
const UPDATE_CHARGES_URL_FIELD = 'custpage_update_charges_url';
const FLASH_MSG_PARAMS = ['result_title', 'result_status', 'result_message'];

/**
 * @typedef ChargeUpdate
 * @property {number} chargeId
 * @property {string} stage
 */

/**
 * @typedef UpdateBatch
 * @property {Array<ChargeUpdate>} updates
 * @property {Array<number>} skipped
 */

/**
 * @typedef ResultMessage
 * @property {string} title
 * @property {string} status
 * @property {string} message
 */

/**
 * Updates the selected charges in the form to the stage provided.
 * 
 * @param {Form} form 
 * @param {log} log 
 * @param {string} stage 
 * @returns {UpdateBatch}
 */
function getChargeUpdates(form, log, stage) {
    const updates = [];
    const skipped = [];
    const lineCnt = form.getLineCount({ sublistId: CHARGE_LIST_ID });
    for (let i = 0; i < lineCnt; i++) {
        const checked = form.getSublistValue({
            sublistId: CHARGE_LIST_ID,
            fieldId: 'select',
            line: i
        });

        if (checked === false) {
            continue;
        }

        const chargeId = form.getSublistValue({
            sublistId: CHARGE_LIST_ID,
            fieldId: 'charge_id',
            line: i
        });
        const currentStage = normalizeStage(form.getSublistValue({
            sublistId: CHARGE_LIST_ID,
            fieldId: 'charge_stage',
            line: i
        }));

        if (currentStage === stage) {
            skipped.push(chargeId);
            log.debug({
                title: 'Charge update aborted',
                details: `Skipping update for charge ${chargeId}, stage is already ${currentStage}`
            });
            continue;
        }

        updates.push({chargeId, stage});
    }

    return {updates, skipped};
}

/**
 * Convert the stage name used in the charges list to the STAGES enum
 * 
 * @param {string} stageLabel 
 * @returns {string}
 */
function normalizeStage(stageLabel) {
    let normalized;
    switch (stageLabel) {
        case 'Hold':
            normalized = STAGES.HOLD;
            break;
        case 'Ready':
            normalized = STAGES.READY;
            break;
        case 'Non-Billable':
            normalized = STAGES.NON_BILLABLE;
            break;
        default:
            throw new Error(`Unknown stage provided: ${stageLabel}`);
    }

    return normalized;
}

// @ts-ignore
define(['N/currentRecord', 'N/record', 'N/log'],
    /**
     * @typedef currentRecord
     * @typedef record
     * @typedef log
     * @typedef NsRecord
     * @typedef Form
     * @typedef ScriptContext
     * 
     * @param{currentRecord} currentRecord
     * @param{record} record
     * @param{log} log
     */
    function (currentRecord, record, log) {
        /** 
         * @type {Map} chargeMemos
         * 
         * A map holding the state of the memos, used for reverting memo on cancelling changes 
         */
        const chargeMemos = new Map();

        /**
         * Store the the charge memos and clear flash message params from URL
         * 
         * @param {ScriptContext} context 
         */
        function pageInit(context) {
            const currentRec = context.currentRecord;
            const lineCnt = currentRec.getLineCount({sublistId: CHARGE_LIST_ID});
            for (let i = 0; i < lineCnt; i++) {
                const chargeId = currentRec.getSublistValue({
                    sublistId: CHARGE_LIST_ID,
                    fieldId: CHARGE_ID_FIELD_ID,
                    line: i
                })
                const memo = currentRec.getSublistValue({
                    sublistId: CHARGE_LIST_ID,
                    fieldId: MEMO_FIELD_ID,
                    line: i
                });
                chargeMemos.set(chargeId, memo);
            }

            // Clear flash message params
            try {
                let hasFlash = false;
                const currentUrl = new URL(window.location.href);
                for (const p of FLASH_MSG_PARAMS) {
                    if (currentUrl.searchParams.has(p)) {
                        currentUrl.searchParams.delete(p);
                        hasFlash = true;
                    }
                }

                if (hasFlash) {
                    history.replaceState(null, '', currentUrl.toString());
                }
            } catch (e) {
                log.error({title: 'Flash message error', details: `Unable to clear flash message params: ${e}`});
            }
        }

        /**
         * Refresh the page when the user selects a charge stage and filter the
         * charge list
         * 
         * @param {ScriptContext} context 
         */
        function fieldChanged(context) {
            if (context.fieldId === STAGE_SELECT_ID) {
                refreshPage(context.currentRecord);
            } else if (context.sublistId === CHARGE_LIST_ID && context.fieldId === MEMO_FIELD_ID) {
                const currentRec = context.currentRecord;
                const chargeId = currentRec.getSublistValue({
                    sublistId: context.sublistId,
                    fieldId: CHARGE_ID_FIELD_ID,
                    line: context.line
                });

                const memo = currentRec.getSublistValue({
                    sublistId: context.sublistId,
                    fieldId: context.fieldId,
                    line: context.line
                });

                const prevMemo = chargeMemos.get(chargeId);
                const normalizeMemo = s => (s ?? '').trim();
                if (normalizeMemo(prevMemo) === normalizeMemo(memo)) {
                    return;
                }

                const acceptChange = window.confirm(`Update memo for charge ${chargeId} to:\n${memo}`);
                if (!acceptChange) {
                    currentRec.selectLine({
                        sublistId: context.sublistId,
                        line: context.line
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: context.sublistId,
                        fieldId: context.fieldId,
                        value: prevMemo ?? '',
                        ignoreFieldChange: true
                    });

                    return false;
                }
                
                try {  
                    console.log(`Updating charge ${chargeId}, memo: ${memo}`);
                    chargeMemos.set(chargeId, memo);
                    record.submitFields({
                        type: record.Type.CHARGE,
                        id: chargeId,
                        values: {memo}
                    });
                } catch (e) {
                    alert(`Error: unable to save memo for charge ${chargeId} to:\n${memo}`);
                    currentRec.selectLine({
                        sublistId: context.sublistId,
                        line: context.line
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: context.sublistId,
                        fieldId: context.fieldId,
                        value: prevMemo ?? '',
                        ignoreFieldChange: true
                    });
                }
            }
        }

        /**
         * Refresh the current page filtered by the selected stage
         * 
         * @param {Form} form 
         * @param {ResultMessage | null} result
         * @returns {void}
         */
        function refreshPage(form, result = null) {
            const selectedStage = form.getValue(STAGE_SELECT_ID);
            const url = new URL(window.location.href);
            url.searchParams.set('stage', selectedStage || '');
            if (result) {
                url.searchParams.set('result_status', result.status);
                url.searchParams.set('result_title', result.title);
                // keep the message to reasonable length to encode in the url just in case there
                // are a lot of errors
                url.searchParams.set('result_message', result.message.substring(0, 1200));
            } else {
                url.searchParams.delete('result_status');
                url.searchParams.delete('result_title');
                url.searchParams.delete('result_message');
            }

            window.onbeforeunload = null; // suppress "unsaved changes will be lost" warning
            window.location.href = url.toString();
        }

        /**
         * POST charge updates to the manage pending charges Suitelet
         * 
         * @param {string} url manage pending charges Suitelet URL
         * @param {UpdateBatch} batch the batch of charges to update and skipped charges
         * @param {log} log
         * @returns {Promise<ResultMessage>}
         */
        async function submitChargeUpdates(url, batch, log) {
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(batch.updates)
            });
            if (!res.ok) {
                log.error({title: 'HTTP Error', details: `status: ${res.status}, body: ${res.text()}`});

                return {
                    title: "Updates Failed",
                    status: RESULT_STATUS.ERROR,
                    message: 'An unexpected error occurred while processing updates. See script log for details.'
                };
            }

            const results = await res.json();
            const resultMsg = {
                title: "Updates in progress",
                status: RESULT_STATUS.SUCCESS,
                message: `Updating ${results.count} charges. This will take about 2 minutes to complete. Refresh this page to check results.`
            };

            return resultMsg;
        }

        /**
         * Set the stage of the selected charges to On Hold.
         *
         * @returns {void}
         */
        function setChargesToHold() {
            const form = currentRecord.get();
            const batch = getChargeUpdates(form, log, STAGES.HOLD);
            const url = form.getValue(UPDATE_CHARGES_URL_FIELD)
            submitChargeUpdates(url, batch)
                .then(r => refreshPage(form, r))
                .catch(e => log.error({
                    title: 'Charge Update Error',
                    details: e
                }));
        }

        /**
         * Set the stage of the selected charges to Ready.
         *
         * @returns {void}
         */
        function setChargesToReady() {
            const form = currentRecord.get();
            const batch = getChargeUpdates(form, log, STAGES.READY);
            const url = form.getValue(UPDATE_CHARGES_URL_FIELD)
            submitChargeUpdates(url, batch)
                .then(r => refreshPage(form, r))
                .catch(e => log.error({
                    title: 'Charge Update Error',
                    details: e
                }));
        }

        /**
         * Set the stage of the selected charges to Non-Billable.
         *
         * @returns {void}
         */
        function setChargesToNonBillable() {
            const form = currentRecord.get();
            const batch = getChargeUpdates(form, log, STAGES.NON_BILLABLE);
            const url = form.getValue(UPDATE_CHARGES_URL_FIELD)
            submitChargeUpdates(url, batch)
                .then(r => refreshPage(form, r))
                .catch(e => log.error({
                    title: 'Charge Update Error',
                    details: e
                }));
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            setChargesToHold: setChargesToHold,
            setChargesToReady: setChargesToReady,
            setChargesToNonBillable: setChargesToNonBillable
        };
    }
);
