/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/url', 'N/xml'],

function(search, record, url, xml) {

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        var xmlContent = "";
        var recId = context.request.parameters.recordId;
        log.debug('recId', recId);
        if (isNaN(recId)) return;

        var invRecObj = record.load({
            type: record.Type.INVOICE,
            id: recId,
            isDynamic: false,
        });
        var customer = invRecObj.getValue({
            fieldId: 'entity'
        });
        log.debug('customer', customer);
        var invoiceSearchObj = search.create({
            type: "invoice",
            filters: [
                ["type", "anyof", "CustInvc"],
                "AND",
                ["mainline", "is", "F"],
                "AND",
                ["taxline", "is", "F"],
                "AND",
                ["shipping", "is", "F"],
                "AND",
                ["item.custitem_printed_name", "isnotempty", ""],
                "AND",
                ["item.custitem_sds_fileid", "isnotempty", ""],
                "AND",
                ["internalidnumber", "equalto", recId]
            ],
            columns: [
                search.createColumn({
                    name: "internalid",
                    label: "Internal ID"
                }),
                search.createColumn({
                    name: "tranid",
                    label: "Document Number"
                }),
                search.createColumn({
                    name: "createdfrom",
                    label: "Created From"
                }),
                search.createColumn({
                    name: "item",
                    sort: search.Sort.ASC,
                    label: "Item"
                }),
                search.createColumn({
                    name: "custitem_sds_fileid",
                    join: "item",
                    label: "SDS FILE ID"
                }),
                search.createColumn({
                    name: "custitem_printed_name",
                    join: "item",
                    label: "Printed Name"
                }),
                search.createColumn({
                    name: "customform",
                    label: "Custom Form"
                })
            ]
        });
        var searchResultCount = invoiceSearchObj.runPaged().count;
        log.debug("invoiceSearchObj result count", searchResultCount);
        if (searchResultCount === 0) return;

        var itemDetails = {};
        var myPagedData = invoiceSearchObj.runPaged();
        myPagedData.pageRanges.forEach(function(pageRange) {
            var myPage = myPagedData.fetch({
                index: pageRange.index
            });
            myPage.data.forEach(function(result) {
                var itemiId = result.getValue({
                    name: "item"
                });
                var sdsFileId = result.getValue({
                    name: "custitem_sds_fileid",
                    join: "item",
                    label: "SDS FILE ID"
                });
                if (sdsFileId != null && sdsFileId != '') {
                    itemDetails[itemiId] = parseInt(sdsFileId);
                }
            });
        });
        log.debug('itemDetails', JSON.stringify(itemDetails));

        // Check if items have already ordered and get the required URLs.
        var urls = checkIfItemIsOrderedBefore(itemDetails, customer, recId);
        if (urls == null) return;

        for (var u in urls) {
            log.debug('url', urls[u])
            xmlContent += "<pdf src='" + xml.escape({
                xmlText: urls[u]
            }) + "'/>";
        }
        context.response.write(xmlContent)
    }
    // This function is used to find the previous ordered items
    function checkIfItemIsOrderedBefore(itemDetails, customer, recId) {
        var orderedItems = [];
        var invoiceSearchObj = search.create({
            type: "invoice",
            filters: [
                ["type", "anyof", "CustInvc"],
                "AND",
                ["item", "anyof", Object.keys(itemDetails)],
                "AND",
                ["name", "anyof", customer]
            ],
            columns: [
                search.createColumn({
                    name: "formulatext",
                    summary: "MIN",
                    formula: "min({internalid}) keep (dense_rank first order by {datecreated} asc)",
                    label: "Formula (Text)"
                }),
                search.createColumn({
                    name: "internalid",
                    join: "item",
                    summary: "GROUP",
                    label: "Internal ID"
                })
            ]
        });
        var myPagedData = invoiceSearchObj.runPaged();
        myPagedData.pageRanges.forEach(function(pageRange) {
            var myPage = myPagedData.fetch({
                index: pageRange.index
            });
            myPage.data.forEach(function(result) {
                var firstSale = result.getValue({
                    name: "formulatext",
                    summary: "MIN"
                });
                if (firstSale == recId) {
                    orderedItems.push(result.getValue({
                        name: "internalid",
                        join: "item",
                        summary: "GROUP"
                    }));
                }
            });
        });
        log.debug('orderedItems', orderedItems);
        var requiredUrls = Object.keys(itemDetails).reduce(function(object, key) {
            if (orderedItems.indexOf(key) >= 0) {
                object[key] = itemDetails[key]
            }
            return object
        }, {});
        log.debug('requiredUrls', requiredUrls);
        // Create a search on document and get the URL.
        var isEmpty = Object.keys(requiredUrls).length === 0;
        if (!isEmpty) {
            return findUrls(Object.keys(requiredUrls).map(function(k) {
                return requiredUrls[k];
            }));
        } else {
            return null;
        }
    }
    // This function is used to get the SDS sheet file url which is associated with items.
    function findUrls(fileIds) {
        var fileDetails = {};
        var domainUrl = url.resolveDomain({
            hostType: url.HostType.APPLICATION,
            accountId: '5774630'
        });
        var fileSearchObj = search.create({
            type: "file",
            filters: [
                ["internalid", "anyof", fileIds]
            ],
            columns: [
                "internalid",
                "url"
            ]
        });
        var searchResultCount = fileSearchObj.runPaged().count;
        log.debug("fileSearchObj result count", searchResultCount);
        fileSearchObj.run().each(function(result) {
            var fileInternalid = result.getValue({
                name: "internalid"
            });
            var fileUrl = result.getValue({
                name: "url"
            });
            fileDetails[fileInternalid] = "https://" + domainUrl + fileUrl;
            return true;
        });
        return fileDetails;
    }

    return {
        onRequest: onRequest
    };

});