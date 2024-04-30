/**
 * Copyright (c) 1998-2018 Oracle-NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * Store software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * * Version    Date            Author           		Remarks
 *   1.00       Apr 03  2020		Mahesh Tadepally        	Initial Version
 *
 **/

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * Purpose : The purpose of the restlet is getting all the inbound bin list in indound 
 */
 
define(["N/query"],
    function (query) {
        function post(context) {
            var binlist = {}
            try {
                let location = context.params.warehouseLocationId;
              log.debug('location',location);
                if (location) {

                    const gettaskid = query.runSuiteQL({
                        query: `SELECT id ,name
                FROM CUSTOMRECORD_WMSSE_TASKTYPE WHERE name = 'PUTW'
                 `,
                    })

                  let taskType =  gettaskid.results[0].values[0];
                  
                  log.debug('tasktype',taskType);

                      const getstatusId = query.runSuiteQL({
                        query: `SELECT id ,name
                FROM CUSTOMRECORD_WMSSE_WMS_STATUS_FLAG WHERE name ='Putaway Completed' `,
                    })

      let statusFlagid =   getstatusId.results[0].values[0]

                   log.debug('getpicktaskid',  getstatusId.results[0].values[0]);
                   

                    const mapResultsToColumns = (result) => {
                        let resultObj = {}
                        for (columnIndex in outputcolumns) {
                            resultObj[outputcolumns[columnIndex]] = result.values[columnIndex]
                        }
                        return resultObj
                    }
                    let outputcolumns = [
                        "itemid",
                        "binnumberText",
                        "location",
                        "binnumber ",
                        "quantityavailable"
                    ]
                    let columns = [
                        "COUNT(CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_sku)",
                        "bin.binnumber ",
                        "bin.location ",
                        "bin.id ",
                        "SUM(CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_act_qty)"
                    ]
                    const getstageBinslist = query.runSuiteQL({
                        query: `SELECT
               ${columns}
                FROM CUSTOMRECORD_WMSSE_TRN_OPENTASK , bin
                WHERE bin.id = CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_actendloc  AND bin.type = 'INBOUND_STAGING'
                AND (CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_nsconfirm_ref_no is NULL or CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_nsconfirm_ref_no = '' ) 
                AND CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_wms_location = '${location}'
                AND CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_wms_status_flag = ${statusFlagid}
                AND CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_tasktype = ${taskType} 
                AND CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_actbeginloc = CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_actendloc 
                GROUP BY bin.binnumber,   bin.location,  bin.id
                 `,
                    })
                    const myQueryResults = getstageBinslist.results.map(result => mapResultsToColumns(result))
                    binlist['isValid'] = true;
                    binlist['stageinventorydetails'] = myQueryResults;
                    
                  
                }else{
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