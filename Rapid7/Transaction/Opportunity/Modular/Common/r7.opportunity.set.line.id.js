/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([], function () {
    function beforeSubmit(context) {
        setOpportunityLineId(context)
    }

    ////////////////////////////////////////////////

    function setOpportunityLineId(context) {
        const { newRecord } = context;
        const lineCount = newRecord.getLineCount({ sublistId: 'item' });

        for (let i = 0; i < lineCount; i++) {
            const itemType = newRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'itemtype',
                line: i
            });

            if (itemType === 'EndGroup') {
                continue;
            }

            newRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_r7_opp_line_id',
                line: i,
                value: i + 1
            });
        }
    }

    return {
        beforeSubmit
    };
});