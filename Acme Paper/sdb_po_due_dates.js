/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/log", "N/format", "N/record"], function (log, format, record) {
    function beforeSubmit(context) {
        try {
            let poRecord = context.newRecord;
            var oldRecord = context.oldRecord;
            log.debug("schedule date: ", { id: poRecord.id, old: oldRecord ? oldRecord.getValue("custbody_acc_sch_date_time") : '', new: poRecord.getValue("custbody_acc_sch_date_time") });
            if (oldRecord && String(oldRecord.getValue("custbody_acc_sch_date_time")) != String(poRecord.getValue("custbody_acc_sch_date_time"))) setExpectedReceipt(poRecord);
        } catch (error) {
            log.error("ERROR: ", error);
        }
    }

    function setExpectedReceipt(poRecord) {
        var scheduleDate = poRecord.getValue("custbody_acc_sch_date_time");
        if (!scheduleDate) return false;
        scheduleDate = getFormatDate(new Date(scheduleDate));
        log.debug("Execute setExpectedReceipt: ", { POid: poRecord.id, scheduleDate });
        var itemLines = poRecord.getLineCount('item');
        for (let i = 0; i < itemLines; i++) {
            try {
                poRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'expectedreceiptdate',
                    value: format.parse({ value: scheduleDate, type: format.Type.DATE }),
                    line: i,
                });
            } catch (e) {
                log.error("ERROR updating line: ", e);
            }
        }
    }

    function getFormatDate(date) {
        let parsedDate = format.parse({
            value: date,
            type: format.Type.DATE
        });
        return format.format({
            value: new Date(parsedDate),
            type: format.Type.DATE
        });
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
