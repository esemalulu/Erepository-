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
            var lotDetailsvalidate = {};
            try {
                let opentaskid = context.params.opentaskid;
                let lotName = context.params.lotName;
                if (lotName) {
                    const mapResultsToColumns = (result) => {
                        let resultObj = {}
                        for (columnIndex in outputcolumns) {
                            resultObj[outputcolumns[columnIndex]] = result.values[columnIndex]
                        }

                        return resultObj
                    }
                    const outputcolumns = [
                        "binnumber",
                        "availableqty",
                        "lotnumber",
                        "bininternalid",
                        "lotexpirydate",

                    ]
                    // array of columns
                    const columns = [
                        "custrecord_wmsse_actbeginloc",
                        "custrecord_wmsse_act_qty",
                        "custrecord_wmsse_batch_num",
                        "custrecord_wmsse_actbeginloc",
                        "custrecord_wmsse_expirydate",
                    ]
                    const myQuery = query.runSuiteQL({
                        query: `SELECT
                        ${columns}
                        FROM CUSTOMRECORD_WMSSE_TRN_OPENTASK WHERE id = ${opentaskid}  AND custrecord_wmsse_batch_num = '${lotName}'`,
                    })
                    const myQueryResults = myQuery.results.map(result => mapResultsToColumns(result))
                    log.debug({
                        title: 'myQueryResults',
                        details: JSON.stringify(myQueryResults)
                    });
                    log.debug
                    if (myQueryResults.length != 0) {
                        lotDetailsvalidate['lotDetailslist'] = myQueryResults[0]
                        lotDetailsvalidate['isValid'] = true;
                    }
                    else {
                        lotDetailsvalidate['errorMessage'] = 'Please Enter A valid Lot ';
                        lotDetailsvalidate['isValid'] = false;
                    }
                }
                else {
                    lotDetailsvalidate['isValid'] = false;
                    lotDetailsvalidate['errorMessage'] = 'Please Enter Lot Number ';

                }
            }
            catch (e) {
                lotDetailsvalidate['isValid'] = false;
                lotDetailsvalidate['errorMessage'] = e;
            }
            return lotDetailsvalidate;
        }
        return {
            post: post
        }
    })