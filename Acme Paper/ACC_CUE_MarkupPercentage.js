/**
 * @NApiVersion 2.0
 * @NScriptType clientscript
 *
 */

define(['N/runtime'],
    function (runtime)
    {

        function fieldChanged(context)
        {
            try
            {
                var rec = context.currentRecord;
                var sublistName = context.sublistId;
                var fieldName = context.fieldId;
                var line = context.line;
                if (sublistName == 'item' && (fieldName == 'rate' || fieldName == 'custcol_acc_unitcost' || fieldName == 'costestimate'))
                {
                    var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' })
                    var rate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate' });
                    var costestimaterate;
                    costestimaterate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' });

                    if (isEmpty(costestimaterate))
                        costestimaterate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' });

                    if (isEmpty(item))
                    {
                        return;
                    }
                    if (costestimaterate == 0)
                    {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acme_markup_percent',
                            value: 99999999,
                            ignoreFieldChange: true
                        });
                        return;
                    } else
                    {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acc_unitcost',
                            value: costestimaterate.toFixed(2),
                            ignoreFieldChange: true
                        });

                    }
                    var markup = ((rate - costestimaterate) / rate) * 100;
                    //   alert ('Margin' + markup);
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: markup.toFixed(2),
                        ignoreFieldChange: true
                    });
                    //      alert ('Margine complete' );

                }
                else if (sublistName == 'item' && fieldName == 'custcol_acme_markup_percent')
                {
                    var costestimaterate;
                    costestimaterate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' });

                    if (isEmpty(costestimaterate))
                        costestimaterate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' });

                    var quantity = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
                    var markup = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent'
                    });

                    //rev = (1/(1-(marg/100)))*cost
                    var temp = 1 - (markup / 100);
                    var rate = (1 / temp) * costestimaterate;
                    //        alert ('costestimaterate = ' + costestimaterate);
                    //         alert ('Rate = ' + rate);
                    var amount = rate * quantity;
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: rate.toFixed(2),
                        ignoreFieldChange: true
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: amount.toFixed(2),
                        ignoreFieldChange: true
                    });


                }
            }
            catch (error)
            {
                console.log('Error: ' + error.toString());
            }
        }

        function postSourcing(context)
        {
            try
            {
                var rec = context.currentRecord;
                var sublistName = context.sublistId;
                var fieldName = context.fieldId;
                var line = context.line;
                if (sublistName == 'item' && (fieldName == 'item'))
                {
                    var rate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate' });
                    var costestimaterate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' });
                    if (costestimaterate == 0)
                    {

                        var price = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'price' });
                        if (price != "-1") return;

                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acme_markup_percent',
                            value: 99999999,
                            ignoreFieldChange: true
                        });

                        return;
                    }
                    else
                    {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acc_unitcost',
                            value: costestimaterate.toFixed(2),
                            ignoreFieldChange: true
                        });
                    }
                    var markup = ((rate - costestimaterate) / rate) * 100;
                    //      alert ('Margin' + markup);

                    debugger;
                    
                    var price = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'price' });
                    if (price != "-1") return;

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: markup.toFixed(2),
                        ignoreFieldChange: true
                    });
                }
                else if (sublistName == 'item' && fieldName == 'custcol_acme_markup_percent')
                {
                    var costestimaterate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' });
                    if (costestimaterate == 0)
                    {
                        var price = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'price' });
                        if (price != "-1") return;

                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acme_markup_percent',
                            value: 99999999,
                            ignoreFieldChange: true
                        });
                        return;
                    }
                    else
                    {
                        rec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_acc_unitcost',
                            value: costestimaterate.toFixed(2),
                            ignoreFieldChange: true
                        });
                    }

                    var markup = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent'
                    });
                    var temp = 1 - (markup / 100);
                    var rate = (1 / temp) * costestimaterate;
                    //       alert ('Rate = ' + rate);
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: rate.toFixed(2),
                        ignoreFieldChange: true
                    });
                }
            }
            catch (error)
            {
                log.error('Error in postSourcing', error.toString());
            }
        }

        function isEmpty(stValue)
        {
            if ((stValue == '') || (stValue == null) || (stValue == undefined))
            {
                return true;
            }
            else
            {
                if (stValue instanceof String)
                {
                    if ((stValue == ''))
                    {
                        return true;
                    }
                }
                else if (stValue instanceof Array)
                {
                    if (stValue.length == 0)
                    {
                        return true;
                    }
                }
                return false;
            }
        }

        return {
            //   fieldChanged: fieldChanged,
            postSourcing: postSourcing
        };
    })
    ;