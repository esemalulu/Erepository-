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


define(["N/search", "N/record"],
    function (search, record) {
        function post(context) {
            var binlist = {};
            try {
                let warehouseLocationId = context.params.warehouseLocationId;
                let binName = context.params.binName;
                let opentaskId = context.params.opentaskid
                log.debug('opentaskId', opentaskId)
                if (binName) {
                    log.debug('opentaskId', opentaskId)

                    var binSearchObj = search.create({
                        type: "bin",
                        filters:
                            [
                                ["location", "anyof", Number(warehouseLocationId)],
                                "AND",
                                ["binnumber", "is", binName],
                             	 "AND",
                             	 ["type","noneof","INBOUND_STAGING","OUTBOUND_STAGING"]
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
                    log.debug('BinlocationDetails', BinlocationDetails.length);

                    if (BinlocationDetails.length == 1) {
                        log.debug('BinlocationDetails', BinlocationDetails);

                        var id = record.submitFields({
                            type: 'customrecord_wmsse_trn_opentask',
                            id: opentaskId,
                            values: {
                                'custrecord_wmsse_actendloc': BinlocationDetails[0].id,
                            }
                        });
                        binlist['isValid'] = true;

                    } else {
                        binlist['isValid'] = false;
                        binlist['errorMessage'] = 'Please Enter A Valid Bin ';
                    }

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