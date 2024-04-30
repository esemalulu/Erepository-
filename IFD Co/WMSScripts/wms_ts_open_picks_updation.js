/**
 * Copyright (c) 1998-2018 Oracle-NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 *  Version    Date            Author                  Remarks
 *   1.00       Jul 19, 2019   Mounika Sirigneedi       Initial Version
 *
 * @NModuleScope public
 * @NApiVersion 2.x
 * *@NScriptType ScheduledScript
 *
 **/

define(['N/search','N/record'], 
function(search,record) {
function openTaskUpdation(context)
{
    var salesOrderSearch=search.load({id:'customsearch_wms_ts_picktask_without_if'});
    salesOrderSearch.run().each(function(result) {

        var orderid = result.getValue({
            name: 'internalid',
            join:'custrecord_wmsse_order_no',
            summary: 'group'
        });

log.debug('orderid',orderid);
if(orderid)
{
var ifrecords=getIFRecords(orderid);



if(ifrecords.length>0)
{
changeStatus(orderid);
}
}
else{
    var date=new Date();
    log.debug('No records Message',date+','+'No records to update');
}

return true;
});
  


}


function getIFRecords(orderId)
{

    var ifrecordsSearch = search.create({
        type: "itemfulfillment",
        filters:
        [
           ["type","anyof","ItemShip"], 
           "AND", 
           ["createdfrom","anyof",orderId],
           "AND", 
           ["mainline","is","T"]
        ]
       
     });
     var searchResult = ifrecordsSearch.run().getRange(0,1000);
     
return searchResult;

}

function changeStatus(orderNum)
{

    log.debug('orderNum',orderNum);
    var pickTaskRecordSearch = search.create({
        type: "customrecord_wmsse_trn_opentask",
        filters:
        [
           
           ["custrecord_wmsse_order_no","anyof",orderNum], 
           "AND", 
           ["custrecord_wmsse_tasktype","anyof","3"],
           "AND", 
           ["custrecord_wmsse_wms_status_flag","anyof",["28","8"]],
           "AND", 
           ["custrecord_wmsse_nsconfirm_ref_no","anyof","@NONE@"]
        ],
        columns:
        [
           search.createColumn({name: "internalid"})]
     });
     var searchResult = pickTaskRecordSearch.run();


if(searchResult){

    log.debug('into if','into if');
		
		searchResult.each(function(result){		

var picktaskid=result.getValue('internalid');

log.debug('picktaskid',picktaskid);

var id = record.submitFields({
    type: "customrecord_wmsse_trn_opentask",
    id: picktaskid,
    values: {
        custrecord_wmsse_wms_status_flag : '33'
    },
    options: {
    enableSourcing: false,
    ignoreMandatoryFields : true
    }
    });

return true;
        });
    }
}

return {
    execute : openTaskUpdation
};

});