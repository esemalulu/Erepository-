/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/search'], function (log, search) {
    function saveRecord(context) {
        const { currentRecord } = context;
        const UPGRADE_CREDIT = '9';

        // If the user cannot edit the field then there is no reason to validate it.
        const appliedToOrderField = currentRecord.getField({ fieldId: 'custbody_r7_applied_to_order' });
        if (appliedToOrderField.isReadOnly) {
            return true;
        }

        var isUpgradeCredit = currentRecord.getValue({ fieldId: 'custbody_ns_acs_return_type' }) === UPGRADE_CREDIT;
        var createdFromId = currentRecord.getValue({ fieldId: 'createdfrom' });
        var appliedToOrderId = currentRecord.getValue({ fieldId: 'custbody_r7_applied_to_order' });

        if (!isUpgradeCredit) {
            return true;
        }

        if (!appliedToOrderId) {
            alert('For return types of "Upgrade Credit", a sales order is required in the Applied To Order field.');
            return false;
        }

        if (createdFromId === appliedToOrderId) {
            const message = 'For return types of "Upgrade Credit", the Applied To Order field should not match the ' +
                'Created From field.\n\nClick OK to save anyway.';

            return confirm(message);
        }

        return true;
    }

    function beforeLoad(context) {
        const { type, newRecord } = context;
        const { CREATE } = context.UserEventType;

        if (type !== CREATE) {
            return;
        }

        newRecord.setValue({ fieldId: 'custbody_r7_applied_to_order', value: '' });
    }

    function beforeSubmit(context) {
        const { type, newRecord } = context;
        const { CREATE, EDIT } = context.UserEventType;
        const UPGRADE_CREDIT = '9';

        if (type !== CREATE &&  type !== EDIT) {
            return;
        }

        var isUpgradeCredit = newRecord.getValue({ fieldId: 'custbody_ns_acs_return_type' }) === UPGRADE_CREDIT;
        var appliedToOrderId = newRecord.getValue({ fieldId: 'custbody_r7_applied_to_order' });

        if (isUpgradeCredit && !appliedToOrderId) {
            throw "'Applied to Order' is required when the Return Authorization Type is 'Upgrade Credit'";
        }
    }

    return {
        beforeLoad,
        beforeSubmit,
        saveRecord,
    };
});