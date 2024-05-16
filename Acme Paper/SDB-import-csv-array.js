/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search", "N/file"], function (log, record, search, file)
{

    function getInputData()
    {
        var searchRecord = search.load({
            id: '3094',
            type: 'customer'
        })

        return searchRecord;
        
    }

    function map(context)
    {
        try
        {
            var recordValue = JSON.parse(context.value);
            if (!recordValue) return;

            var customerRecord = record.load({
                type: 'customer',
                id: recordValue.id
            });
            
            customerRecord.setValue({fieldId: 'custentity_po_flag', value: 2});

            customerRecord.save({
                ignoreMandatoryFields: true
            });

        } catch (error)
        {
            log.error('errorMAP', error);
        }

    }

    function reduce(context)
    {
        
    }

    function summarize(summary)
    {

    }

    function csvToArray(str, delimiter)
    {
        const headers = str.slice(0, str.indexOf("\n")).split(delimiter);
        const rows = str.slice(str.indexOf("\n") + 1).split("\n");
        const arr = rows.map(function (row)
        {
            const values = row.split(delimiter);
            const el = headers.reduce(function (object, header, index)
            {
                object[header] = values[index];
                return object;
            }, {});
            return el;
        });

        // return the array
        return arr;
    }

    function getItemIdByAcmeCode(acmeCode)
    {
        var itemId = "";

        var itemSearchObj = search.create({
            type: "item",
            filters:
                [
                    ["formulanumeric: CASE WHEN {itemid} = '" + acmeCode + "' THEN 1 END", "equalto", "1"]
                ],
            columns:
                [
                    search.createColumn({
                        name: "itemid",
                        sort: search.Sort.ASC,
                        label: "Name"
                    })
                ]
        });
        var searchResultCount = itemSearchObj.runPaged().count;
        log.debug("itemSearchObj result count", searchResultCount);
        itemSearchObj.run().each(function (result)
        {
            itemId = result.id;

            return;
        });

        return itemId;
    }


    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
