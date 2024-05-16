/**
*
* @NApiVersion 2.1
* @NScriptType ClientScript
*
*/

// function isEmpty(stValue) {
//     return ((stValue === '' || stValue == null || stValue == undefined) ||
//         (stValue.constructor === Array && stValue.length == 0) ||
//         (stValue.constructor === Object && (function(v) {
//             for (var k in v) return false;
//             return true;
//         })(stValue)));
// }

define(["N/record", "N/search", "N/runtime", "N/currentRecord", "N/ui/dialog"], function (record, search, runtime, currentRecord, dialog)
{

    function approveSaleOrder(recId)
    {
        try
        {
            console.log('recId', recId);
            record.submitFields({
                type: record.Type.SALES_ORDER,
                id: recId,
                values: {
                    'orderstatus': 'B',
                    'custbody_so_approval_status': 'Approved'
                },
                options: {
                    ignoreMandatoryFields: true
                }
            })
            location.reload();
        }
        catch (e)
        {
            console.log('ERROR', e)
        }
    }

    function RejectAction()
    {
        var url = nlapiResolveURL('SUITELET', 'customscript_set_reject_reason', 'customdeploy_set_reject_reason');

        //alert('Record ID: '+nlapiGetRecordId());
        url += '&record_id=' + nlapiGetRecordId() + '&record_type=' + nlapiGetRecordType();
        // alert('URL: '+url);
        var win = window.open(url, 'Enter Reason For Rejection', 'scrollbars=yes,menubar=no,width=500,height=300,toolbar=no');
    }

    function clientSaveRecord()
    {
        //alert('Client Triggered');
        var rejectReason = nlapiGetFieldValue('custpage_reject_comments');
        var strRejectReason = trim(rejectReason);
        if (strRejectReason == '' || strRejectReason == null)
        {
            alert('Please Enter Reason for Rejection');
            return false;
        }
        else
        {
            //alert('Comments Entered!');
            return true;
        }
    }

    function trim(rejectReason)
    {
        var str = new String(rejectReason);
        return str.replace(/(^\s*)|(\s*$)/g, "");
    }



    // function fPostSourcing(context){

    // 	var oCurrentScript = runtime.getCurrentScript()
    // 	var sDefaultShipMethod = oCurrentScript.getParameter("custscript_lbsso_cs_defshpm")
    //    /*var Cform =oCurrentScript.getValue({
    //         fieldId:"customformm"
    //     })*/
    // 	var oCurrentRecord = context.currentRecord
    // 	var sFieldId = context.fieldId
    // 	var sSublistId = context.sublistId



    // 	 if(sFieldId == "entity")
    // 	{
    // /*       var Cform =oCurrentRecord.getValue({
    //         fieldId:"customform"
    //        });
    //        log.debug('Cform ',Cform);

    // 	  if(Cform == 300)
    //        {             
    //               var Dship = oCurrentRecord.getValue({
    //                     fieldId:"custbody_dropship_order"
    //                 });

    //                 log.debug('Dship',Dship);

    //                 if(Dship == true){
    //                     oCurrentRecord.setValue({
    //                         fieldId:"shipmethod",
    //                         value: 103530
    //                     });
    //                 } 
    //        } */
    // 		var sShipMethod = oCurrentRecord.getValue({
    // 			fieldId : "shipmethod"
    // 		})


    // 		if(isEmpty(sShipMethod)){

    // 			oCurrentRecord.setValue({
    // 				fieldId : "shipmethod",
    // 				value : sDefaultShipMethod
    // 			})

    // 		}


    // 	}
    // 	else(sFieldId == "item" && sSublistId == "item")
    // 	{

    // 		var sEntity = oCurrentRecord.getValue({
    // 			fieldId : "entity"
    // 		})

    // 		var oEntityDetails = search.lookupFields({
    // 			type : "customer",
    // 			id : sEntity,
    // 			columns : ["custentity_warehouse"]
    // 		})

    // 		if(!isEmpty(oEntityDetails.custentity_warehouse)){

    // 			oCurrentRecord.setCurrentSublistValue({
    // 				sublistId : "item",
    // 				fieldId : "location",
    // 				value : oEntityDetails.custentity_warehouse[0].value
    // 			})

    // 		}

    // 	}


    // }

    function fFieldChanged(context)
    {

        // 	var oCurrentRecord = context.currentRecord
        // 	var sFieldId = context.fieldId

        // 	if(sFieldId == "entity"){
        // 		var sEntity = oCurrentRecord.getValue({
        // 			fieldId : "entity"
        // 		})

        // 		var oCustomerInformation = search.lookupFields({
        // 			type : "customer",
        // 			id : sEntity,
        // 			columns : ["custentity_acc_fedex_acn", "custentity_po_number_required"]
        // 		})

        // 		if(!isEmpty(oCustomerInformation.custentity_acc_fedex_acn)){

        // 			oCurrentRecord.setValue({
        // 				fieldId : "custbody_acc_cus_fedex_acn",
        // 				id : oCustomerInformation.custentity_acc_fedex_acn
        // 			})

        // 		}

        // 		if(oCustomerInformation.custentity_po_number_required == true || oCustomerInformation.custentity_po_number_required == "T"){

        // 			var fldOtherRefNum = oCurrentRecord.getField({
        // 				fieldId : "otherrefnum"
        // 			})

        // 			fldOtherRefNum.isMandatory = true

        // 		}

        // 	}

    }

    // function fSaveRecord(context){

    // 	var oCurrentRecord = context.currentRecord

    // 	var bIsDropShip = oCurrentRecord.getValue({
    // 		fieldId : "custbody_dropship_order"
    // 	})

    // 	if(bIsDropShip == true  || bIsDropShip == "T"){

    // 		oCurrentRecord.setValue({
    // 			fieldId : "custbody_a1wms_dnloadtowms",
    // 			value : false
    // 		})

    // 	}

    // 	return true

    //}

    return {
        RejectAction: RejectAction,
        clientSaveRecord: clientSaveRecord,
        approveSaleOrder: approveSaleOrder,
        //postSourcing : fPostSourcing,
        fieldChanged: fFieldChanged,
        //saveRecord : fSaveRecord

    }

})