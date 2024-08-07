/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/log', 'N/https', 'N/file', 'N/url'], function (log, https, file, url) {

    function onRequest(context) {
        try {
     /*        var customrecord_acme_cust_price_contract_lnSearchObj = search.create({
                type: "customrecord_acme_cust_price_contract_ln",
                filters:
                    [
                        ["custrecord_acme_cpc_item_header", "anyof", "7401211"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_acme_cpc_line_item", label: "Item" }),
                        search.createColumn({
                            name: "displayname",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "Description"
                        }),
                        search.createColumn({ name: "custrecord_acme_cpc_line_price", label: "Price" }),
                        search.createColumn({
                            name: "custitem_acc_sap_code",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "SAP Code"
                        }),
                        search.createColumn({
                            name: "upccode",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "UPC Code"
                        }),
                        search.createColumn({
                            name: "costestimate",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "Item Defined Cost"
                        }),
                        search.createColumn({ name: "custrecord182", label: "Rebate Cost" }),
                        search.createColumn({
                            name: "othervendor",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "Vendor Name"
                        }),
                        search.createColumn({
                            name: "vendorname",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "Vendor Item"
                        }),
                        search.createColumn({
                            name: "quantityonhand",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "On Hand"
                        }),
                        search.createColumn({ name: "custrecord_acc_cpcl_sale_unit", label: "Sale Unit" }),
                        search.createColumn({ name: "custrecord_commodity_code", label: "Commodity Code" }),
                        search.createColumn({
                            name: "custitem_non_returnable",
                            join: "CUSTRECORD_ACME_CPC_LINE_ITEM",
                            label: "Dead Inventory"
                        }),
                        search.createColumn({ name: "lastmodifiedby", label: "Last Modified By" }),
                        search.createColumn({ name: "lastmodified", label: "Last Modified" })
                    ]
            });

            const pagedData = customrecord_acme_cust_price_contract_lnSearchObj.runPaged({
                pageSize: 1000
            });


            const results = [];


            pagedData.pageRanges.forEach(function (pageRange) {
                const page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach(function (result) {
                    
                    results.push(result);
                });
            }); */

            var output = url.resolveDomain({
                hostType: url.HostType.APPLICATION,
            });
            log.debug('output', output)
            var httpsResponse = https.get({
                url: `https://${output}/app/common/search/searchresults.xls?rectype=590&searchtype=Custom&CUSTRECORD_ACME_CPC_ITEM_HEADER=7401225&style=NORMAL&report=&grid=&searchid=6206&dle=T&sortcol=Custom_SCRIPTID_raw&sortdir=ASC&csv=Export&OfficeXML=T&pdf=&size=1000&_csrf=AcCOtWRyc2R8LoPtGNm3LpoZuTdiinQH8asHs_tf-_t5LFhz68LFksHDX_lhuwidZKSO9-u6Qaz4tVxBXt384on1nH0Q34RERxW6HTKx49IlOPxGLXrGE6LZhrbqTivlJyj610hgy7RbRLVFj-7zBHzF2XDowEwVT-mtgspjOn4%3D&twbx=F&segment=`,
            })
            var myFile = file.create({
                name: 'CPC_Example_XML.txt',
                fileType: file.Type.PLAINTEXT,
                contents: JSON.stringify(httpsResponse),
                folder: -15,
            })
            myFile.save()
        } catch (e) {
            log.error('Error at onRequest', e)
        }
    }

    return {
        onRequest: onRequest
    }
});
