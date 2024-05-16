/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
*/
define(['N/record'], function (record) {
    function beforeSubmit(context) {
        if (context.type == context.UserEventType.CREATE) {
            var newRecord = context.newRecord;
            var shipDate = newRecord.getValue({
                fieldId: 'shipdate'
            });

            var currentDate = new Date();
            var businessDays = 0;

            var dueDate = shipDate
            while (dueDate < currentDate && businessDays < 3) {
                if (currentDate.getDay() !== 0 & currentDate.getDay() !== 6) { //it's neither sunday nor saturday
                    businessDays++
                }
                currentDate = new Date(dueDate + 1);
            }

            if (businessDays > 1) return;

            newRecord.setValue({
                fieldId: 'trandate',
                value: new Date(shipDate)
            });
        }
    }
    return {
        beforeSubmit: beforeSubmit,
    }
});
