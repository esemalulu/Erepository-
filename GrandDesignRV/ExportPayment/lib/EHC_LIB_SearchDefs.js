/**
 * @NApiVersion 2.1
 */
define(['N/search'],
    /**
 * @param{search} search
 */
    (search) => {

        const getVendorPaymentSearch = () => {
            return search.create({
                type: "transaction",
                filters:
                    [
                        ["type","anyof","VendPymt"],
                        "AND",
                        ["status","noneof","VendPymt:E","VendPymt:D","VendPymt:V"],
                        "AND",
                        ["mainline","is","T"],
                        "AND",
                        ["custbody_gd_export_processed","is","F"],
                        "AND",
                        ["internalid","anyof","17323366"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "Internal ID"}),
                        search.createColumn({name: "entity", label: "Name"}),
                        search.createColumn({
                            name: "tranid",
                            sort: search.Sort.DESC,
                            label: "Document Number"
                        }),
                        search.createColumn({name: "netamount", label: "Amount (Net)"}),
                        search.createColumn({name: "grossamount", label: "Amount (Gross)"}),
                        search.createColumn({name: "trandate", label: "Date"}),
                        search.createColumn({name: "memo", label: "Memo"}),
                        search.createColumn({name: "custbody_record_processed_for_export", label: "Record Processed for export"})
                    ]
            });
        }

        const getDealerRefundSearch = () => {
            return search.create({
                type: "transaction",
                filters:
                    [
                        ["type","anyof","CustRfnd"],
                        "AND",
                        ["type","anyof","CustRfnd"],
                        "AND",
                        ["mainline","is","F"],
                        "AND",
                        ["custbody_gd_export_processed","is","F"],
                        "AND",
                        ["datecreated","onorafter","10/1/2022 12:00 am"],
                        "AND",
                        ["number","isnotempty",""],
                        "AND",
                        ["applyingtransaction.type","anyof","CustCred"],
                        "AND",
                        ["status","noneof","CustRfnd:R","CustRfnd:V"],
                        "AND",
                        ["internalid","anyof","17325107"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "tranid",
                            summary: "GROUP",
                            sort: search.Sort.DESC,
                            label: "Document Number"
                        }),
                        search.createColumn({
                            name: "trandate",
                            summary: "GROUP",
                            label: "Date"
                        }),
                        search.createColumn({
                            name: "netamount",
                            summary: "GROUP",
                            label: "Amount (Net)"
                        }),
                        search.createColumn({
                            name: "grossamount",
                            summary: "GROUP",
                            label: "Amount (Gross)"
                        }),
                        search.createColumn({
                            name: "type",
                            join: "applyingTransaction",
                            summary: "GROUP",
                            label: "Type"
                        }),
                        search.createColumn({
                            name: "entity",
                            summary: "GROUP",
                            label: "Name"
                        }),
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "trandate",
                            summary: "GROUP",
                            label: "Date"
                        })
                    ]
            });
        }

        return {getVendorPaymentSearch, getDealerRefundSearch}
    });
