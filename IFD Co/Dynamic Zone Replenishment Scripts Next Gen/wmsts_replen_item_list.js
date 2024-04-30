/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/query', 'N/runtime'],
    function (query, runtime) {
        function dopost(requestBody) {
            try {
                var params = requestBody.params;
                var replendetailsObj = {};
                var replendetailsArray = new Array();
                var priority = "";
                var report = "";


                log.debug('params', JSON.stringify(params));


                var scriptObj = runtime.getCurrentScript(); // getting open task status flags from parameters
                var objParams = {
                    taskType: scriptObj.getParameter("custscript_wmsts_tasktype_rpln"),
                    wmsStatusFlag: scriptObj.getParameter("custscript_wmsts_statusfalg_rpln"),

                    }
                const mapResultsToColumns = (result, columns) => { //function to map query results to thier id's 
                    let resultObj = {}
                    for (columnIndex in columns) {
                        resultObj[columns[columnIndex]] = result.values[columnIndex]
                    }
                    return resultObj
                }

                if (!params.binId) {
                    params.binId = null;

                }
                if (!params.itemid) {
                    params.itemid = null;

                }
                if (!params.zoneId) {
                    params.zoneId = null;

                }

                if (!params.orderPriority) {
                    priority = null;

                } 
                else

                {
                    priority = "'" + params.orderPriority + "'"

                }
                if (!params.replenReport) {
                    report = null;

                } 
                else

                {
                    report = params.replenReport;
                }

                //query to fetch replen tasks with given values in screen
                const columns = [
                    "CUSTOMRECORD_WMSSE_TRN_OPENTASK.id",
                    "custrecord_wmsse_uom",
                    "custrecord_wmsse_wms_location",
                    "custrecord_wmsse_actendloc",
                    "custrecord_wmsse_sku",
                    "custrecord_wmsse_expe_qty",
                    "bin.binnumber",
                    "item.itemid",
                    "bin.custrecord_wmsse_putseq_no"
                    
                ]

                const openTaskQuery = query.runSuiteQL({

                    query: `SELECT
         ${columns}
     FROM CUSTOMRECORD_WMSSE_TRN_OPENTASK , bin , item
     WHERE bin.id = CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_actendloc
     AND item.id = CUSTOMRECORD_WMSSE_TRN_OPENTASK.custrecord_wmsse_sku
     AND custrecord_wmsse_wms_status_flag = ${objParams.wmsStatusFlag}
     AND custrecord_wmsse_tasktype = ${objParams.taskType}
     AND nvl(nvl(custrecord_wmsse_sku,${params.itemid}),0)= nvl(nvl(${params.itemid},custrecord_wmsse_sku),0)
     AND nvl(nvl(custrecord_wmsse_actendloc,${params.binId}),0)= nvl(nvl(${params.binId},custrecord_wmsse_actendloc),0)
     AND nvl(nvl(custrecord_wmsse_zone_no,${params.zoneId}),0)= nvl(nvl(${params.zoneId},custrecord_wmsse_zone_no),0)
     AND nvl(nvl(custrecord_wmsse_orderindex,${priority}),'0')= nvl(nvl(${priority},custrecord_wmsse_orderindex),'0')
     AND nvl(nvl(custrecord_wmsse_report_no,${report}),0)= nvl(nvl(${report},custrecord_wmsse_report_no),0)
     ORDER BY bin.custrecord_wmsse_putseq_no,CUSTOMRECORD_WMSSE_TRN_OPENTASK.id
     `,

                });

                const openTaskQueryResults = openTaskQuery.results.map(result => mapResultsToColumns(result, columns))
                log.debug({
                    title: 'openTaskQueryResults',
                    details: JSON.stringify(openTaskQueryResults)
                });


                //forming an array of opentask objects
               
                for (let j of openTaskQueryResults) {
                    let opentaskObj = {};
                    opentaskObj["custrecord_wmsse_uom"] = j.custrecord_wmsse_uom;
                    opentaskObj["id"] = j["CUSTOMRECORD_WMSSE_TRN_OPENTASK.id"];
                    opentaskObj["recordType"] = "customrecord_wmsse_trn_opentask";
                    opentaskObj["custrecord_wmsse_actendloc"] = j.custrecord_wmsse_actendloc;
                    opentaskObj["custrecord_wmsse_actendlocText"] = j["bin.binnumber"];
                    opentaskObj["custrecord_wmsse_sku"] = j.custrecord_wmsse_sku;

                    opentaskObj["Remaining quantity"] = j.custrecord_wmsse_expe_qty;
                    opentaskObj["quantity"] = j.custrecord_wmsse_expe_qty;


                    opentaskObj["custrecord_wmsse_skuText"] = j["item.itemid"];
                    opentaskObj["custrecord_wmsse_location"] = params.locationId;
                    opentaskObj["custrecord_wmsse_locationText"] = params.locationName;


                    replendetailsArray.push(opentaskObj);

                }


                replendetailsObj["isValid"] = true
                replendetailsObj["replenItemList"] = replendetailsArray;

                log.debug('replendetailsObj', replendetailsObj);

            } catch (e) {
                log.debug('error in script', e.toString());
            }

            return replendetailsObj;
        }
        return {
            post: dopost
        }

    });