/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * Purpose : The purpose of the restlet is validating the pick task entered exists or not 
 */
define(["N/query"],
    function (query) {
        function post(context) {
            lotDetailslist = {};
            try {
                let scannedQuantity = context.params.scannedQuantity;
                let opentaskid = context.params.opentaskid;

                if (scannedQuantity) {
                    const mapResultsToColumns = (result) => {
                        let resultObj = {}
                        for (columnIndex in outputcolumns) {
                            resultObj[outputcolumns[columnIndex]] = result.values[columnIndex]
                        }
                        
                        return resultObj
                    }
                    const outputcolumns = [
                        "binnumber",
                        "availableQuantityWithUOM",
                        "lotName",
                        "bininternalid",
                        "lotExpiryDate",
                        
                    ]
                    // array of columns
                    const columns = [
                        "custrecord_wmsse_actbeginloc",
                        "custrecord_wmsse_act_qty" ,
                        "custrecord_wmsse_batch_num",
                        "custrecord_wmsse_actbeginloc",
                        "custrecord_wmsse_expirydate",
                    ]
                    const myQuery = query.runSuiteQL({
                        query: `SELECT
                        ${columns}
                        FROM CUSTOMRECORD_WMSSE_TRN_OPENTASK WHERE id = ${opentaskid} AND custrecord_wmsse_act_qty = ${scannedQuantity}`
                    })
                    const myQueryResults = myQuery.results.map(result => mapResultsToColumns(result))
                    log.debug({
                        title: 'myQueryResults',
                        details: JSON.stringify(myQueryResults)
                    });
                    if(myQueryResults.length != 0 ){
                    lotDetailslist['isValid'] = true;
                    lotDetailslist['statusTable'] = myQueryResults;
                }else{
                    lotDetailslist['isValid'] = false;
                                      lotDetailslist['errorMessage'] = 'Please Enter Available Qty';

                }
                }
                else {
                    lotDetailslist['isValid'] = true;
                }
            }
            catch (e) {
                lotDetailslist['isValid'] = true;
                lotDetailslist['errorMessage'] = e;
            }
            return lotDetailslist;
        }
        return {
            post: post
        }
    })