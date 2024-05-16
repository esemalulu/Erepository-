/**
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
*/
define(["N/record"], function (record) {
    function beforeLoad(context) {
        try {
            var thisRecord = context.newRecord
            var quoteId = thisRecord.id
            var form = context.form;
            form.clientScriptModulePath = "SuiteScripts/SDB-show-convert-quote-to-item-pricing-modal.js"
            form.addButton({
                id: 'custpage_convert_to_item_pricing_button',
                label: 'Convert To Item Pricing',
                functionName: 'showModal(' + quoteId + ')'
              });


        } catch (error) {
            log.debug('beforeLoad' , error)   
        }
     }



    return {
        beforeLoad,
    };
});