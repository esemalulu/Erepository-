/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 *
 */
define(['N/record', 'N/runtime', 'N/task', 'N/search', 'N/log'],
    function (record, runtime, task, search, log)
    {

        function beforeSubmit(context)
        {
          log.debug('beforeSubmit executed')
            try
            {
                if (context.type == 'delete' || context.type == 'approve' || context.type == 'cancel') return;

                var rec = context.newRecord;
                var lineCount = rec.getLineCount({ sublistId: 'item' });
                
                for (var i = 0; i < lineCount; i++)
                {
                    // --------------- Set openQTY field functionality -----------
                  //log.debug('rec.type',rec.type);
                  if(rec.type != 'invoice') {
                      var orderQty = 0;
                    var receivedQty = 0;
                    orderQty = rec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });

                    receivedQty = rec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantityreceived',
                        line: i
                    });
     
                    if (orderQty != undefined && receivedQty != undefined)
                    {
                        var openQTY = Number(orderQty) - Number(receivedQty);
                        rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_open_qty_difference', value: openQTY, line: i });
                    }
                    
                  }
                    // -----------------------------------------------------------
                    rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_lineid', value: i + 1, line: i });
                }
                

            }
            catch (error)
            {
                log.error('Error in beforeSubmit', error.toString());
            }
        }

        function afterSubmit(context)
        {
            try
            {
                if (context.type == 'delete' || context.type == 'approve' || context.type == 'cancel') return;

                var rec = context.newRecord;
                if(rec.type == 'invoice' || rec.type ==  'purchaseorder' || rec.type == "itemreceipt") return
                
                var total = rec.getValue({ fieldId: 'subtotal' });
                var customer = rec.getValue({ fieldId: 'entity' });
                var discount = getOrderTotalDiscount(customer, total);
                var discountItem = runtime.getCurrentScript().getParameter({ name: 'custscript_odm_disc_item' });
                if (!isEmpty(discount))
                {
                    discount = parseFloat(discount) * -1;
                    record.submitFields({
                        type: rec.type,
                        id: rec.id,
                        values: {
                            discountitem: discountItem,
                            discountrate: discount + '%',
                            custbody_acme_order_discount_added: true
                        }
                    });
                }
            }
            catch (error)
            {
                log.error('Error in afterSubmit', error.toString());
            }
        }

        function getOrderTotalDiscount(customer, total)
        {
            try
            {
              if(!customer || !total)return;
                var orderDiscountSearch = search.create({
                    type: "customrecord_acme_order_discount_matrix",
                    filters: [
                        ["custrecord_acme_odm_customer", "anyof", customer],
                        "AND",
                        ["custrecord_acme_odm_amount_min", "lessthanorequalto", total],
                        "AND",
                        ["custrecord_acme_odm_amount_max", "greaterthan", total]
                    ],
                    columns: [
                        search.createColumn({ name: "custrecord_acme_odm_discount_perc" })
                    ]
                });
                var discount = orderDiscountSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (discount.length < 1)
                {
                    return null;
                }
                else
                {
                    return discount[0].getValue({ name: 'custrecord_acme_odm_discount_perc' });
                }
            }
            catch (error)
            {
                log.error('Error in getOrderTotalDiscount', error.toString());
            }
        }

        function isEmpty(stValue)
        {
            if ((stValue == null) || (stValue == '') || (stValue == ' ') || (stValue == undefined))
            {
                return true;
            } else
            {
                return false;
            }
        }

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });