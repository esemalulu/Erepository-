/** 
* Copyright (c) 1998-2018 NetSuite, Inc. 
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511 
* All Rights Reserved. 

* This software is the confidential and proprietary information of 
* NetSuite, Inc. ("Confidential Information"). You shall not 
* disclose such Confidential Information and shall use it only in 
* accordance with the terms of the license agreement you entered into 
* with NetSuite. 
*  
*   Version    Date            Author              Remarks 
*   1.00       09 Dec 2020     Mahesh Tadepally       Initial Version 
*/

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

//Add filter based on location 
//Remove the hardcoded value 

define(["N/search"],
    function (search) {
        function post(context) {
            var binlist = {};
            var binListDetails = [];
            try {
                let itemInternalId = context.params.itemInternalId;
                let warehouseLocationId = context.params.warehouseLocationId;

                log.debug('itemInternalId1', itemInternalId)
                if (itemInternalId) {
                    log.debug('itemInternalId2', itemInternalId)

                    let itemSearchObj = search.create({
                        type: "item",
                        filters:
                            [
                                ["internalid", "anyof", itemInternalId],
                                "AND",
                                ["preferredbin", "is", "T"], 
                                "AND",
                                ["binnumber.location", "anyof", warehouseLocationId]
                            ],
                        columns:
                            [
                                search.createColumn({
                                    name: "binnumber",
                                    join: "binNumber",
                                    sort: search.Sort.ASC,
                                    label: "Bin Number"
                                }),

                                search.createColumn({ name: "preferredbin", label: "Preferred Bin" }),

                                search.createColumn({
                                    name: "internalid",
                                    join: "binNumber",
                                    label: "Internal ID"
                                })
                            ]
                    });
                    let searchResultCount = itemSearchObj.runPaged().count;
                    log.debug("itemSearchObj result count", searchResultCount);
                    itemSearchObj.run().each(function (result) {
                        let binName = result.getValue({ name: "binNumber", join: "binNumber" })
                        let binId = result.getValue({ name: "internalid", join: "binNumber" })
                        log.debug('binName', binName + 'te' + binId)
                        binListDetails.push({ binName: binName, binInternalId: binId })
                    });
                    if (binListDetails.length == 0) {
                        log.debug()
                        var binSearchObj = search.create({
                            type: "bin",
                            filters:
                                [
                                    ["location", "anyof", warehouseLocationId] ,
                                     "AND", 
                                     ["binnumber","is","No Preferred bin"]
                                    ],
                            columns:
                                [
                                    search.createColumn({
                                        name: "binnumber",
                                        sort: search.Sort.ASC,
                                        label: "Bin Number"
                                    }),

                                ]
                        });

                        var BinlocationDetails = binSearchObj.run().getRange({
                            start: 0,
                            end: 1000
                        });
                        let binName = BinlocationDetails[0].getValue({ name: "binnumber" })
                        let binId = BinlocationDetails[0].id
                        binListDetails.push({ binName: binName, binInternalId: binId });


                    }
                    binlist['binList'] = binListDetails
                    binlist['isValid'] = true;

                } else {
                    binlist['isValid'] = false;
                }
            }
            catch (e) {
                binlist['isValid'] = false;
                binlist['errorMessage'] = e;
            }
            return binlist

        }
        return {
            post: post
        }
    })