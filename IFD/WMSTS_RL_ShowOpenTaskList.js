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
            opentasklist = {};
            try {
                let location = context.params.warehouseLocationId;
                let binInternalId = context.params.binInternalId;
                log.debug('location', location + 'm' + binInternalId)
                if (location) {
                        const mapResultsToColumns = (result) => {
                        let resultObj = {}
                        for (columnIndex in outputcolumns) {
                            log.debug('outputcolumns[columnIndex]', outputcolumns[columnIndex])
                            if(outputcolumns[columnIndex] == 'availbleQuanity'){
                                log.debug('inside', outputcolumns[columnIndex])
                                resultObj[outputcolumns[columnIndex]]  = result.values[0] +' '+result.values[7] 
                            }
                            else if(outputcolumns[columnIndex] == 'itemType'){
                                if(result.values[columnIndex] == "T"){
                                resultObj[outputcolumns[columnIndex]]  = 'lotnumberedinventoryitem' 
                            }else{
                                resultObj[outputcolumns[columnIndex]]  = 'inventoryitem' 

                            }

                            }
                            else{
                            resultObj[outputcolumns[columnIndex]] = result.values[columnIndex]
                        }
                        }
                        return resultObj
                    }
					
					
					         const gettaskid = query.runSuiteQL({
                        query: `SELECT id ,name
                FROM CUSTOMRECORD_WMSSE_TASKTYPE WHERE name = 'PUTW'
                 `,
                    })

                  let taskType =  gettaskid.results[0].values[0];

                      const getstatusId = query.runSuiteQL({
                        query: `SELECT id ,name
                FROM CUSTOMRECORD_WMSSE_WMS_STATUS_FLAG WHERE name ='Putaway Completed' `,
                    })

      let statusFlagid =   getstatusId.results[0].values[0]

                   log.debug('getpicktaskid',  getstatusId.results[0].values[0]);
				   
				   
				   
                    const outputcolumns = [
                        "availbleQuanity",
                        "itemName",
                        "OrderNumber",
                        "itemInternalId",
                        "lineno",
                        "opentaskid",
                        "itemType",
                        "uom",
                        "lotNumber",
                        "expiryDate",
                        "name",
						"upccode",
                        "quantity"
                    ]
                    // array of columns
                    const columns = [
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_act_qty " ,
                        "item.externalid",
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_order_no",
                        "item.id",
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_line_no",
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.id",
                        "item.islotitem",
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_uom",
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_batch_num",
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_expirydate",
                        "CUSTOMRECORD_WMSSE_TRN_OPENTASK.name",
						"item.upccode",
                       "CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_act_qty " 

                    ]
                    const myQuery = query.runSuiteQL({
                        query: `SELECT
                        ${columns}
                        FROM CUSTOMRECORD_WMSSE_TRN_OPENTASK , item 
                        WHERE item.id = CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_sku AND
                         CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_actendloc = ${binInternalId}
                          AND CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_wms_location = ${location} AND 
                           (CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_nsconfirm_ref_no is NULL or CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_nsconfirm_ref_no = '' )  AND CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_wms_status_flag = ${statusFlagid} AND CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_tasktype = ${taskType}  `,
                    })
                    const myQueryResults = myQuery.results.map(result => mapResultsToColumns(result))
                    log.debug({
                        title: 'myQueryResults',
                        details: JSON.stringify(myQueryResults)
                    });
                    opentasklist['isValid'] = true;
                    opentasklist['itemList'] = myQueryResults;
                }
                else {
                    opentasklist['isValid'] = false;
                }
            }
            catch (e) {
                opentasklist['isValid'] = false;
                opentasklist['errorMessage'] = e;
            }
            return opentasklist;
        }
        return {
            post: post
        }
    })