/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search"], function (log, record, search)
{

    function getInputData()
    {
        var searchLoaded = search.load({
            id: '3359',
            type: 'salesorder'
        });

        return searchLoaded;
    }

    function map(context)
    {
        try
        {
            var id = JSON.parse(context.value).id;
            record.delete({
                type: 'salesorder',
                id: id
            });

            log.debug("Deleted", `Order ${id} has been successfully deleted`);

        } catch (error)
        {
            log.error("error", error);
        }
    }

    return {
        getInputData: getInputData,
        map: map
    }
});
