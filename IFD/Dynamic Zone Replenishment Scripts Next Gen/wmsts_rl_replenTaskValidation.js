/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/query', 'N/search'],
    function (query, search) {
        function dopost(requestBody) {
            try {
                log.debug('input paramters', requestBody);
                let inputparams = requestBody.params;
                //var item=inputparams.itemName;
                var recId = inputparams.recordInternalId;
                var location = inputparams.warehouseLocationId;
                var replenObj = {};
                replenObj["imageUrl"] = "";
                replenObj["warehouseLocationName"] = location;

                //Function to map query results
                const mapResultsToColumns = (result, columns) => {
                    let resultObj = {}
                    for (columnIndex in columns) {
                        resultObj[columns[columnIndex]] = result.values[columnIndex]
                    }
                    return resultObj
                }

                // function to get inventory details of an item
                const getInventoryDetails = (itemid, binnumber) => {
                    let results = '';
                    const columns = [
                        "item",
                        "bin",
                        "SUM(onhand)",
                        "SUM(onhandavail)"
                    ]
                    const invdetailsquery = query.runSuiteQL({
                        query: `SELECT ${columns} FROM itemBinQuantity  WHERE item = ${itemid} AND bin = ${binnumber}
           GROUP BY item,bin ORDER BY item,bin`,
                    })

                    const invdetailsqueryResults = invdetailsquery.results.map(result => mapResultsToColumns(result, columns))
                    if (invdetailsqueryResults)
                        results = invdetailsqueryResults[0];

                    return results;

                }

                //function to get item configuration details
                const getItemDetails = (iteminternalid, binid, wmszone) => {

                    log.debug('params', iteminternalid+","+binid+","+wmszone);

                    const replenColumns = ["custrecord_wmstsrpl_maxqty",
                        "custrecord_wmstsrpl_minqty",
                        "custrecord_wmstsrpl_rplqty",
                        "custrecord_wmstsrpl_roundqty",
                        "item.description",
                        "item.custitem_wmsse_itemgroup",
                        "item.custitem_wmsse_itemfamily",
                        "item.itemid",
                        "item.unitstype",
                        "item.itemtype",
                        "item.islotitem"

                    ]

                    const itemDetailsQuery = query.runSuiteQL({
                        query: `SELECT 
${replenColumns}
FROM CUSTOMRECORD_WMSTS_REPLEN_CONFIG , item
WHERE item.id = CUSTOMRECORD_WMSTS_REPLEN_CONFIG.custrecord_wmstsrpl_item
AND custrecord_wmstsrpl_bin = ${binid}
AND custrecord_wmstsrpl_item = ${iteminternalid}
`
                    })

                    const itemDetailsQueryResults = itemDetailsQuery.results.map(result => mapResultsToColumns(result, replenColumns))
                    log.debug({
                        title: 'itemDetailsQueryResults',
                        details: JSON.stringify(itemDetailsQueryResults)
                    });

                    return itemDetailsQueryResults
                }

                if (recId) {

                    //fetching details from open task for selected replen task
                    replenObj["recordInternalId"] = recId;

                    const columns = [
                        "custrecord_wmsse_sku",
                        "custrecord_wmsse_actendloc",
                        "custrecord_wmsse_actbeginloc",
                        "custrecord_wmsse_zone_no",
                        "custrecord_wmsse_expe_qty",
                        "fromBin.binnumber",
                        "toBin.binnumber"
                    ]
                    const openTaskQuery = query.runSuiteQL({

                        query: `SELECT ${columns}
         FROM CUSTOMRECORD_WMSSE_TRN_OPENTASK OT
         INNER JOIN bin AS fromBin ON OT.custrecord_wmsse_actbeginloc = fromBin.id
         INNER JOIN bin AS toBin ON OT.custrecord_wmsse_actendloc = toBin.id
         WHERE OT.id = ${recId}
        `,

                    });

                    const openTaskQueryResults = openTaskQuery.results.map(result => mapResultsToColumns(result, columns))
                    log.debug({
                        title: 'openTaskQueryResults',
                        details: JSON.stringify(openTaskQueryResults)
                    });

                    //forming an object with results
                    var openTaskResult = "";
                    let itemid = "";
                    let bin = "";
                    let zone = "";
                    let frombin = "";
                    let frombinName = ""
                    if (openTaskQueryResults) {
                        openTaskResult = openTaskQueryResults[0];
                        itemid = openTaskResult.custrecord_wmsse_sku;
                        bin = openTaskResult.custrecord_wmsse_actendloc;
                        zone = openTaskResult.custrecord_wmsse_zone_no;
                        frombin = openTaskResult.custrecord_wmsse_actbeginloc;
                        frombinName = openTaskResult["fromBin.binnumber"];
                        replenObj["remainingQuantity"] = openTaskResult.custrecord_wmsse_expe_qty;
                        replenObj["quantitywithUOM"] = openTaskResult.custrecord_wmsse_expe_qty;
                        replenObj["quantityToMove"] = openTaskResult.custrecord_wmsse_expe_qty;
                        replenObj["binName"] = openTaskResult["toBin.binnumber"];
                    }

                    replenObj["itemInternalId"] = itemid;
                    replenObj["transactionUomConversionRate"] = 1;
                    replenObj["actualQuantity"] = 0;
                    replenObj["stockUnitName"] = "";
                    replenObj["binInternalId"] = bin;
                    let binname = new Array();
                    binname.push(frombinName);
                    replenObj["recommendedBinName"] = binname;
                    replenObj["fromBinName"] = frombinName;
                    replenObj["fromBinInternalId"] = frombin;

                    //pushing item configuration details into object
                    const itemObjresults = getItemDetails(itemid, bin, zone);

                    log.debug('itemObjresults',itemObjresults);
                    if (itemObjresults)
                        var itemObj = itemObjresults[0];

                    if (itemObj) 
                    {
                        replenObj["itemName"] = itemObj["item.itemid"];
                        replenObj["itemDescription"] = itemObj["item.description"];
                        replenObj["unitType"] = itemObj["item.unitstype"];
                        replenObj["itemGroup"] = itemObj["item.custitem_wmsse_itemgroup"];
                        replenObj["itemFamily"] = itemObj["item.custitem_wmsse_itemfamily"];
                        replenObj["replenMinQuantity"] = itemObj["custrecord_wmstsrpl_minqty"];
                        replenObj["replenQuantity"] = itemObj["custrecord_wmstsrpl_rplqty"];
                        replenObj["replenQuantitywithUOM"] = itemObj["custrecord_wmstsrpl_rplqty"];
                        replenObj["replenMaxQuantity"] = itemObj["custrecord_wmstsrpl_maxqty"];
                        replenObj["replenRoundQuantity"] = itemObj["custrecord_wmstsrpl_roundqty"];
                        replenObj["isValid"] = true;

                        if (itemObj["item.itemtype"] == 'InvtPart' && itemObj["item.islotitem"] == 'T') {
                            replenObj["itemType"] = "lotnumberedinventoryitem";
                        } else if (itemObj["item.itemtype"] == 'InvtPart') {
                            replenObj["itemType"] = "inventoryitem";
                        }
                    } 
                    
                    else {
                        replenObj["isValid"] = false;
                        replenObj["errorMessage"] = "Bin/Validation Failed.Please check the replen task";


                    }
                    
                    //pushing inventory details of item into object
                    const invObj = getInventoryDetails(itemid, frombin);
                    log.debug('invtobj', invObj);

                    if (invObj) {
                        replenObj["availbleQuanity"] = invObj["SUM(onhandavail)"];

                    }


                }
                log.debug('replenobj', JSON.stringify(replenObj));
                return replenObj;


            } catch (e) {
                log.debug("e", e.toString());
            }
        }

        return {
            post: dopost
        }
    });