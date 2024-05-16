/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search", "N/file", "N/runtime", "N/format"], function (log, record, search, file, runtime,format) {
    function getInputData(context) {
        try {
            var returnSearch = search.load({
                id: 'customsearch_sdb_sps_fields_values',
                type: search.Type.TRANSACTION
            });
            return returnSearch;
        } catch (e) {
            log.error("getInputData() error", JSON.stringify(e));
        }
    }
    /*
    {
   recordType: "salesorder",
   id: "973246",
   values: {
      tranid: "SO10019180",
      custcol_sps_bpn: "SAP1083649",
      custcol_sps_linesequencenumber: "00003",
      custcol_sps_purchaseprice: "0.91",
      custcol_sps_upc: "729661137213",
      custbody_sps_routingkey: "CHKALLACMEPAPER",
      custbody_sps_vendor: "0000004600",
      custbody_sps_st_addresslocationnumber: "461127858",
      custbody_sps_st_locationcodequalifier: "92",
      custbody_sps_purchaseorderdate: "03/07/2024",
      "internalid.billingTransaction": {
         value: "999407",
         text: "999407"
      },
      item: {
         value: "89203",
         text: "510743"
      },
      "internalid.item": {
         value: "89203",
         text: "89203"
      },
      "line.billingTransaction": "3"
   }
}
    */


    function map(context) {
        try {
            var value = JSON.parse(context.value);
            var values = value.values;

            var bpn = values.custcol_sps_bpn;
            var linesequencenumber = values.custcol_sps_linesequencenumber;
            var purchaseprice = values.custcol_sps_purchaseprice;
            var upc = values.custcol_sps_upc;
            var routingkey = values.custbody_sps_routingkey;
            var vendor = values.custbody_sps_vendor;
            var st_addresslocationnumber = values.custbody_sps_st_addresslocationnumber;
            var st_locationcodequalifier = values.custbody_sps_st_locationcodequalifier;
            var purchaseorderdate = values.custbody_sps_purchaseorderdate;
            var invoice = values["internalid.billingTransaction"].value;
            var item = values.item.value;
            var line = values["line.billingTransaction"];

            context.write({
                key: invoice,
                value: {
                    bpn,
                    linesequencenumber,
                    purchaseprice,
                    upc,
                    routingkey,
                    vendor,
                    st_addresslocationnumber,
                    st_locationcodequalifier,
                    purchaseorderdate,
                    item,
                    line,
                }
            })
        } catch (error) {
            log.error('map() error', error);
        }


    }
    function reduce(context) {
        try {
            var values = context.values;
            var invoice = context.key;
            var invoiceRecord = record.load({
                type: 'invoice',
                id: invoice,
                isDynamic: true
            });
            var valuesLength = values ? values.length : -1;
            for (var i = 0; i < valuesLength; i++) {
                var value = JSON.parse(values[i]);
                populateSublistLine(value, invoiceRecord);
                
            }
            var routingkey = value.routingkey;
            var vendor = value.vendor;
            var st_addresslocationnumber = value.st_addresslocationnumber;
            var st_locationcodequalifier = value.st_locationcodequalifier;
            var purchaseorderdate = value.purchaseorderdate;


            invoiceRecord.setValue({
                fieldId: 'custbody_sps_routingkey',
                value: routingkey,
                ignoreFieldChange: true
            });
            invoiceRecord.setValue({
                fieldId: 'custbody_sps_vendor',
                value: vendor,
                ignoreFieldChange: true
            });
            invoiceRecord.setValue({
                fieldId: 'custbody_sps_st_addresslocationnumber',
                value: st_addresslocationnumber,
                ignoreFieldChange: true
            });
            invoiceRecord.setValue({
                fieldId: 'custbody_sps_st_locationcodequalifier',
                value: st_locationcodequalifier,
                ignoreFieldChange: true
            });
            invoiceRecord.setValue({
                fieldId: 'custbody_sps_purchaseorderdate',
                value: format.parse({
                    type: format.Type.DATE,
                    value: purchaseorderdate
                }),
                ignoreFieldChange: true
            });
            log.debug("map() Successfully setted all body fields");
            var savedInvoiceRecord = invoiceRecord.save({
                ignoreMandatoryFields: true
            });
            log.debug('map() savedInvoiceRecord is: ', savedInvoiceRecord);
        } catch (error) {
            log.error("reduce() error", {
                error,
                invoice
            });
        }
    }

    function populateSublistLine(value, invoiceRecord) {
        try {
            var bpn = value.bpn;
            var linesequencenumber = value.linesequencenumber;
            var purchaseprice = value.purchaseprice;
            var upc = value.upc;
            var item = value.item;
            var line = value.line;

            invoiceRecord.selectLine({
                sublistId: 'item',
                line: line - 1
            });
            var itemInSublist = invoiceRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });
            if (itemInSublist == item) {
                invoiceRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sps_bpn',
                    value: bpn,
                    ignoreFieldChange: true
                });
                invoiceRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sps_linesequencenumber',
                    value: linesequencenumber,
                    ignoreFieldChange: true
                });
                invoiceRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sps_purchaseprice',
                    value: purchaseprice,
                    ignoreFieldChange: true
                });
                invoiceRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sps_upc',
                    value: upc,
                    ignoreFieldChange: true
                });
                invoiceRecord.commitLine({
                    sublistId: 'item',
                    ignoreRecalc: true
                });
                log.debug("map() The item in line and in result match and fields where setted successfully");
            } else {
                log.error("map() The item in line and in result did not match. Abort setting line fields");
            }
        } catch (errorPopulateSublist) {
            log.error("populateSublist() Error", errorPopulateSublist);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
    };
});



