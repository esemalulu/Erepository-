/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/render', 'N/email', 'N/search', 'N/file'], function (log, render, email, search, file) {

    function afterSubmit(context) {
        try {

            if (context.type != context.UserEventType.CREATE) return;
            var thisRecord = context.newRecord;
            var lineCount = thisRecord.getLineCount({
                sublistId: 'item'
            });

            log.debug('TOTAL ITEMS: ', lineCount);
            var billAndHoldItems = [];
            for (let i = 0; i < lineCount; i++) {
                var itemId = thisRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                })
                var itemLookup = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemId,
                    columns: ['custitembill_and_hold_item', 'itemid']
                })
                var itemName = itemLookup.itemid
                var isBillAndHold = itemLookup.custitembill_and_hold_item
                if (isBillAndHold) {
                    billAndHoldItems.push(itemName)
                }
            }
            log.debug('billAndHoldItems: ', { billAndHoldItems });

            if (billAndHoldItems.length > 0) {
                var billNumber = thisRecord.getValue('tranid')
                var itemsBaH = ''
                billAndHoldItems.forEach((item, index) => {
                    if (index == 0) {
                        itemsBaH += `${item}`
                    }
                    else {
                        itemsBaH += `, ${item}`
                    }
                });
                var emailText = `A vendor bill (${billNumber}) that contained one or more bill and hold items was created. A copy of the bill is attached to this email\n
                The bill and hold item(s) in the vendor bill are the following:
                ${itemsBaH}`
                
                var form = Number(thisRecord.getValue('customform'))
                log.debug('form', form)
                var billPrint = render.transaction({
                    entityId: Number(thisRecord.id),
                    printMode: render.PrintMode.PDF,
                    formId: form,
                })
                log.debug('SEND EMAIL: ', { emailText, billNumber });
                email.send({
                    author: 96988, // no-reply
                    body: emailText,
                    recipients: 11, // Maggie
                    subject: `Bill and hold vendor bill entered! (${billNumber})`,
                    attachments: [billPrint]
                })
            }
        } catch (error) {
            log.error('Error at beforeSubmit', error)
        }
    }

    return {

        afterSubmit: afterSubmit
    }
});
