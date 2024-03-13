/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/dialog', 'N/runtime', 'N/log'], function (dialog, runtime, log) {
    // https://issues.corp.rapid7.com/browse/APPS-15983
    // get statuses to decline from script param as a comma-separated string => convert to array
    // 'custscript_r7_decline_opp_status_ids - 97,91,90,89,54,106,68,80,81,78,82,38,41,95,88,86,107,96,15'
    var currentScript = runtime.getCurrentScript();
    var statusesToDecline = currentScript.getParameter({ name: 'custscript_r7_decline_opp_status_ids' }).split(',');

    // global variable to keep initial and further truthy Opp statuses
    var initialEntityStatus = '';

    function pageInit(context) {
        initialEntityStatus = getEntityStatus(context);
    }

    function validateField(context) {
        // only applicable for Renewal Opp aka customform 142
        var currentOppForm = context.currentRecord.getValue({
            fieldId: 'customform'
        });
        // Renewal Opp form
        if (currentOppForm === '142') {
            if (context.fieldId === 'entitystatus') {
                var currentOppStatus = getEntityStatus(context);
                if (statusesToDecline.indexOf(currentOppStatus) >= 0) {
                    dialog
                        .alert({
                            title: 'Not a valid entry.',
                            message: 'Do not select this value. It is not a valid Renewal Opportunity Status.'
                        })
                        .then(function () {
                            // revert to a valid value
                            context.currentRecord.setValue({
                                fieldId: 'entitystatus',
                                value: initialEntityStatus,
                                forceSyncSourcing: true
                            });
                        })
                        .catch(function () {});
                } else {
                    // reset truthy status value
                    initialEntityStatus = getEntityStatus(context);
                }
            }
        }

        return true;
    }

    // prevent record from saving with falsy status value
    function saveRecord(context) {
        return validateRenewalStatus(context)
            && validateMandatoryDealFactorFields(context);
    }

    function validateRenewalStatus(context) {
        var currentOppStatus = getEntityStatus(context);
        if (statusesToDecline.indexOf(currentOppStatus) >= 0) {
            // noinspection JSIgnoredPromiseFromCall
            dialog.alert({
                title: 'Not a valid entry.',
                message: 'It is not a valid Renewal Opportunity Status. Please set a valid status for this Opportunity before saving the record.'
            });
            return false;
        } else {
            return true;
        }
    }

    //////////////////////////////////////////////

    function validateMandatoryDealFactorFields(context) {
        if (!isTargetForm(context)) {
            return true;
        }

        if (!isTargetStatus(context)) {
            return true;
        }

        const opportunity = context.currentRecord;

        const mandatoryDealFactorFields = [
            'custbody_r7_primary_risk_reason',
            'custbody_r7_primary_risk_detail',
            'custbody_r7_product_family',
            'custbody_r7_product_reason_details',
            'custbody_r7_risk_notes_action_plan'
        ];

        var allRequiredValuesPopulated = mandatoryDealFactorFields.every(function(field) {
            return !!opportunity.getValue({ fieldId: field });
        });

        if (!allRequiredValuesPopulated) {
            // noinspection JSIgnoredPromiseFromCall
            dialog.alert({
                title: 'Missing required Deal Factors fields',
                message: 'All fields in the Deal Factors section are required for the selected Opportunity Status.'
            });
        }

        return allRequiredValuesPopulated;
    }

    function isTargetForm(context) {
        var opportunity = context.currentRecord;
        var RENEWAL_OPP_FORM = '142';

        return opportunity.getValue({ fieldId: 'customform' }) === RENEWAL_OPP_FORM;
    }

    function isTargetStatus(context) {
        var opportunity = context.currentRecord;
        var targetStatusIds = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_deal_factor_opp_status_id' })
            .split(',')
            .map(function(id) { return id.trim() })
            .filter(Boolean);

        var opportunityStatus = opportunity.getValue({ fieldId: 'entitystatus' });
        log.debug({ title: 'opportunityStatus', details: opportunityStatus + ' - ' + typeof opportunityStatus });

        return targetStatusIds.indexOf(opportunityStatus) >= 0;
    }

    function getEntityStatus(context) {
        const currentRecord = context.currentRecord;
        return currentRecord.getValue({
            fieldId: 'entitystatus'
        });
    }

    return {
        pageInit: pageInit,
        validateField: validateField,
        saveRecord: saveRecord
    };
});
