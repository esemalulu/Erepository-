/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        var rec = context.newRecord;
      log.debug('record id', rec.id)
        var lineCount = rec.getLineCount({sublistId: 'item'});
        for(var i=0; i< lineCount; i++){
           // rec.selectLine({sublistId: 'item',line: i});
            var markupValue = rec.getSublistValue({sublistId: 'item',fieldId: 'custcol_acme_markup_percent', line: i});
            if(isEmpty(markupValue)){
                var item = rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                var rate = rec.getSublistValue({sublistId: 'item', fieldId: 'rate', line: i});
                var costestimaterate  = rec.getSublistValue({sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: i});
                if(isEmpty(costestimaterate)){
                    costestimaterate = rec.getSublistValue({sublistId: 'item', fieldId: 'costestimaterate', line: i});
                }
                log.debug('Item Lines', 'item: '+item+', rate: '+rate+', costestimaterate: '+costestimaterate+', markupValue: '+markupValue);
                if(costestimaterate == 0){
                    rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: 99999999,
                         line: i,
                        ignoreFieldChange: true
                    });
                    break;
                } else{
                    log.debug(costestimaterate.toFixed(2))
                    rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acc_unitcost',
                        value: costestimaterate.toFixed(2),
                        line: i,
                        ignoreFieldChange: true
                    });
                }
                if ( rate != 0)
                {
                    var markup = ((rate - costestimaterate) / rate) * 100;
                    log.debug(markup);
                    rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        line: i,
                        value: markup.toFixed(2),
                        ignoreFieldChange: true
                    });
                      
                }
               // rec.commitLine({sublistId: 'item'});
            }
            
        }
    }

    function afterSubmit(context) {
        
    }

    //is empty function
    function isEmpty(stValue) {
        if ((stValue == '') || (stValue == null) || (stValue == 'undefined')) {
            return true;
        }
        else {
            if (stValue instanceof String) {
                if ((stValue == '')) {
                    return true;
                }
            }
            else if (stValue instanceof Array) {
                if (stValue.length == 0) {
                    return true;
                }
            }
            return false;
        }
    }

    return {
       // beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
      //  afterSubmit: afterSubmit
    }
});
