/**
*@NApiVersion 2.0
*@NScriptType ClientScript
*/
define(['N/record', 'N/ui/dialog', 'N/log', 'N/currentRecord'],
    function (record, dialog, log, currentRecord)
    {
        //debugger;
        try
        {
            function pageInit(context) 
            {
                var field = context.currentRecord.getField({ fieldId: "itemid" });
                // field.isDisabled = true;
              
                var rec = context.currentRecord;
                var type = rec.getValue({ fieldId: 'itemtype' });
                log.debug({ title: 'item type', details: 'type: ' + type });

                // ------------------ POPULATING ACCOUNT FIELD FOR DISCOUNT ITEMS ---------------------------------------
                if (type == "Discount" && context.mode == "create")
                {
                    rec.setValue({ fieldId: "account", value: 390 }); //485099 PURCHASE DISCOUNT ACCOUNT
                    rec.setValue({fieldId: "includechildren", value: true});
                }
                // ------------------------------------------------------------------------------------------------------

                // if (context.mode == 'create' )
                // {
                var accFormId = rec.getValue({
                    fieldId: 'customform' //get customform id
                });
                log.debug({ title: 'On Pageinit current form', details: 'accFormId: ' + accFormId });
                if ((accFormId != '' || accFormId != null) && (type == 'OthCharge'))
                {
                    if (accFormId != '198')
                    {
                        var defaultform = 198;
                        rec.setValue({ fieldId: 'customform', value: defaultform });
                        log.debug({ title: 'On Pageinit set default form', details: 'DeFaultedform: ' + defaultform });
                    }
                }

                // }

     
                log.debug({
                    title: 'Success',
                    details: 'Item displayed successfully'
                });

            }
        }
        catch (e)
        {
            log.error({
                title: e.name,
                details: e.message
            });

        }

        return {
            pageInit: pageInit
            //validateField: validateField
        };

    });