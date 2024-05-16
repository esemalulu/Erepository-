/**
 * @NApiVersion  2.1
 * @NScriptType  ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord'], function (currentRecord) {

    try {
        function fieldChanged() {
        }
        function createCsvString() {

            var csvString = 'CUSTOMER,ITEM,PRICE LEVEL,COMMODITY,CURRENT SELL,UNIT COST,CURRENT GP,LAST SALE DATE,LAST SELL,LAST COST C/S,LAST GP%,LAST QUANTITY C/S, WH AVAIL C/S\n';
            var recObj = currentRecord.get()
            var customerName = recObj.getValue('customername');
            console.log('customerName', customerName);
            var lines = recObj.getLineCount({ sublistId: 'custpage_itempricingsublist' })

            for (var i = 0; i < lines; i++) {
                csvString +=
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_customer',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_item',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_price_level',
                        line: i,
                    })?.replaceAll(",", " ") + ',' + 
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_commodity',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_current_sell',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_unit_cost',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_current_gp',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_last_sale_date',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_last_sell',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_last_cost',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_last_gp',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_last_quantity',
                        line: i,
                    })?.replaceAll(",", " ") + ',' +
                    recObj.getSublistValue({
                        sublistId: 'custpage_itempricingsublist',
                        fieldId: 'custpage_wh_avail',
                        line: i,
                    })?.replaceAll(",", " ") + '\n';
            }
            console.log('csvString', csvString)

            if (lines > 0) {
                var blob = new Blob([csvString], { type: 'text/csv' });

                var downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(blob);
                downloadLink.download = customerName + '.csv';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            } else {
                alert('No Data to Download Price List');
            }
        }
    } catch (e) {
        console.log(e.message)
    }

    return {
        createCsvString: createCsvString,
        fieldChanged: fieldChanged,
    };
});