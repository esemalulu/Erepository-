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
                id: 3503,
                type: "customrecord_sdb_sps_orders_to_replace"
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
            log.debug('idItem', idSaleOrder);

            var salesRecord = record.load({
                type: "customrecord_sdb_sps_orders_to_replace",
                id: idSaleOrder,
            });
            if(salesRecord){
               salesRecord.save({
                ignoreMandatoryFields: true
            });
              log.debug("Record has been updated", idSaleOrder)
            }
           

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
