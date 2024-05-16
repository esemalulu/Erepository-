/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/record"], function (log, record)
{

    /**
    * Suitelet to create a Sales Order in NetSuite
    */
    function onRequest(context)
    {

        var request = context.request;
        var customer = 78366;

        // SPS ERROR ITEM
        var item = 119976;
        var quantity = 1; // Hardcoded quantity

        // Create the Sales Order record
        var salesOrder = record.create({
            type: record.Type.SALES_ORDER,
            isDynamic: true
        });

        salesOrder.setValue({
            fieldId: 'entity',
            value: customer
        });

        var upcCodes = [
            "00049202003495",
            "00840239101716",
            "55000013600280",
            "00079594184014",
            "10031009063458",
            "00079594714105",
            "00079594710251",
            "10072181000398",
            "00079594081658",
            "00079594184120",
            "00079594802796",
            "55000004584483",
            "00079594710084",
            "10072181000947",
            "10072181000978",
            "55000012777365",
            "00079594809764",
            "55000010050682",
            "55000010050392",
            "00079594149051",
            "55000010050620",
            "10072181002460",
            "10072181004143",
            "55000012102976",
            "00756022165363"
        ];

        // ITEM
        for (var i = 0; i < 22; i++)
        {
            salesOrder.selectNewLine({
                sublistId: 'item'
            });

            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: item
            });

            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: quantity
            });

            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: 100
            });

            salesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_sps_upc',
                value: upcCodes[i]
            });

            salesOrder.commitLine({
                sublistId: 'item'
            });
        }

        // --------------------------------------

        var salesOrderId = salesOrder.save({ignoreMandatoryFields: true}); // Submit the Sales Order record
        log.debug("order created",`Order: ${salesOrderId} has been created`)
    }


    return {
        onRequest: onRequest
    }
});
