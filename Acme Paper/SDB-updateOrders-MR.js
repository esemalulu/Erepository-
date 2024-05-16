/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search"], function (log, record, search)
{

    function getInputData()
    {

        var searchRecord = search.load({
            id: 3126,
            type: 'transaction'
        });

        if (searchRecord) return searchRecord;
    }

    function map(context)
    {
        try
        {
            var values = JSON.parse(context.value);

            var saleId = values.id;
            if (saleId)
            {
                var recordSales = record.load({
                    type: 'salesorder',
                    id: saleId,
                });
                if (recordSales)
                {
                    recordSales.save({
                        ignoreMandatoryFields: true
                    });

                    log.debug('idSale', saleId);
                }

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
