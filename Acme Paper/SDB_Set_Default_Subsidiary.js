/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["N/log",'N/record','N/search'], (log, record,search) =>
{
    function beforeLoad(ctx){
        try
        {
            log.debug('context', ctx);
            var record = ctx.newRecord;
            var defaultSubsidiary = getSubsidiaryByName('Parent Company : ACME Paper and Supply Co., Inc.');
            if (ctx.type === ctx.UserEventType.CREATE && defaultSubsidiary != null){
                var subsidiaries = new Array();
                subsidiaries [0] = defaultSubsidiary.id;
                log.debug('default subsidiary to set', subsidiaries)
                record.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiaries,
                    ignoreFieldChange: true
                })
            }
        } catch (e)
        {
            log.error("ERROR IN BEFORE SUBMIT", e);
        }
    }

    function getSubsidiaryByName(name){
        var subsidiaryToReturn = null;
        var subsidiarySearchObj = search.create({
            type: "subsidiary",
            filters:
            [
               ["name","is", name]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"})
            ]
         });
         subsidiarySearchObj.run().each(function(result){
            if(result!==null){
                subsidiaryToReturn = result;
            }
            return false;
         });
         return subsidiaryToReturn;
    }
    
    return {
        beforeLoad: beforeLoad,
    };
});