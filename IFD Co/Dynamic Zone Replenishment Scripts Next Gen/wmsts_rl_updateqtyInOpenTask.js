/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record','./wmsts_utility.js','N/format'],
    function (record,utility,format) {
        function dopost(requestBody) {

            try {
                let inputparams = requestBody.params;
                let openTaskId = inputparams.openTaskId;
                let  actualQty = inputparams.scannedQty;
                
                let begintime=inputparams.begintime;
                let begindate=inputparams.beginDate;

                log.debug('inputparams', JSON.stringify(inputparams));

                log.debug('begin time & Date', begintime+","+begindate);
        var currTime=utility.getCurrentTimeStamp();
        var currDate = utility.DateStamp();

       
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
        //var timeStamp = format.parse({value: currTime, type: format.Type.TIMEOFDAY});
               
        
                //Updating entered quantity into open task and closing the task
                if (openTaskId) {

                    log.debug('begin time & Date inside the loop', begintime+","+begindate);
                    var id = record.submitFields({
                        type: "customrecord_wmsse_trn_opentask",
                        id: openTaskId,
                        values: {
                            custrecord_wmsse_act_qty: actualQty,
                            custrecord_wmsse_wms_status_flag: 19,
                            custrecord_wmsse_actualbegintime:begintime,
                            custrecord_wmsse_actualendtime:currTime,
                            custrecord_wmsse_act_begin_date:begindate,
                            custrecord_wmsse_act_end_date:parsedCurrentDate

                        },
                        options: {
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        }
                    });
                    log.debug('id', id);
                }
            } catch (error) {
                log.error("Error in updateqtyInOpenTask", error);
            }

        }

        return {
            post: dopost
        }
    });