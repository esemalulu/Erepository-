/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/log"], function (search, record, log)
{

    function getInputData()
    {
        try
        {
            var salesOrder = search.load({
                id: 3203,
                type: search.Type.SALES_ORDER
            });

            return salesOrder;

        }
        catch (error)
        {
            log.error('error', error);
        }

    }

    function map(context)
    {
        try
        {
            var idSaleOrder = JSON.parse(context.value).id;
            

            var salesRecord = record.load({
                type: search.Type.SALES_ORDER,
                id: idSaleOrder,
            });
            salesRecord.setValue("custbody_aps_entered_by", 84216)
           var myId = salesRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
           log.debug('myId id: ', myId);
           log.debug("Record has been updated", idSaleOrder)
            
           

        }
        catch (error)
        {
            log.error('error', error);
        }

    }

    function reduce(context)
    {

    }

    function summarize(summary)
    {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
