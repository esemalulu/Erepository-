/**
*
* @NApiVersion 2.x
* @NScriptType UserEventScript
*
*
*/

function isEmpty(stValue) {
    return ((stValue === '' || stValue == null || stValue == undefined) ||
        (stValue.constructor === Array && stValue.length == 0) ||
        (stValue.constructor === Object && (function(v) {
            for (var k in v) return false;
            return true;
        })(stValue)));
}

define(["N/record", "N/search", "N/runtime"], function(record, search, runtime){

	function fBeforeLoad(context){

		var oNewRecord = context.newRecord
		var oOldRecord = context.oldRecord

		var oForm = context.form

		var oCurrentScript = runtime.getCurrentScript()
		var sNoCloseRoles = oCurrentScript.getParameter("custscript_lbsso_nclsrls")
		var aNoCloseRoles = sNoCloseRoles.split(",")
log.debug("aNoCloseRoles", aNoCloseRoles)
		var sEnteredByCustomer = oCurrentScript.getParameter("custscript_lbsso_entrdbcst")
log.debug("sEnteredByCustomer", sEnteredByCustomer)
		var oCurrentUser = runtime.getCurrentUser()


		if(context.type == context.UserEventType.VIEW || context.type == context.UserEventType.EDIT || context.type == context.UserEventType.CREATE){


			if(runtime.executionContext == runtime.ContextType.USERINTERFACE){

				oForm.removeButton({
					id : "autofill"
				})

				if(aNoCloseRoles.indexOf(oCurrentUser.role) > -1){

					oForm.removeButton({
						id : "closeremaining"
					})

				}

				

			}

		}

		if(context.type = context.UserEventType.CREATE){

			var sEntity = oNewRecord.getValue({
				fieldId : "entity"
			})

			if(sEntity != sEnteredByCustomer){

				oNewRecord.setValue({
					fieldId : "custbody_aps_entered_by",
					value : oCurrentUser.id
				})

			}


		}

		if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.CREATE){

			var sEntity = oNewRecord.getValue({
				fieldId : "entity"
			})

			if(!isEmpty(sEntity)){

				var oPORequired = search.lookupFields({
					type : "customer",
					id : sEntity,
					columns : ["custentity_po_number_required"]
				})

				var fldOtherRefNum = oForm.getField({
					id : "otherrefnum"
				})

				if(!isEmpty(oPORequired)){

					if(oPORequired.custentity_po_number_required == true || oPORequired.custentity_po_number_required == "T"){

						fldOtherRefNum.isMandatory = true

					}

				}

			}

		}

	}

	function fBeforeSubmit(context){

		var oNewRecord = context.newRecord
		var oOldRecord = context.oldRecord

		oNewRecord.setValue({
			fieldId : "tobeemailed",
			value : false
		})

		var oCurrentScript = runtime.getCurrentScript()

		var sEnteredByCustomer = oCurrentScript.getParameter("custscript_lbsso_entrdbcst")
        
        log.debug("sEnteredByCustomer", sEnteredByCustomer)

		var oCurrentUser = runtime.getCurrentUser()

		if(context.type = context.UserEventType.CREATE){

			var sEntity = oNewRecord.getValue({
				fieldId : "entity"
			})

			if(sEntity != sEnteredByCustomer){

				oNewRecord.setValue({
					fieldId : "custbody_aps_entered_by",
					value : oCurrentUser.id
				})

			}


		}

	}

	function fAfterSubmit(context){

		var oCurrentScript = runtime.getCurrentScript()

		var sCommEligShipMethodT = oCurrentScript.getParameter("custscript_lbsso_scommelgshpmt")
		var aCommEligShipMethodT = sCommEligShipMethodT.split(",")
        
        log.debug("aCommEligShipMethodT", aCommEligShipMethodT)

		var sCommEligOrderStatusT = oCurrentScript.getParameter("custscript_lbsso_scommelgrdrsttt")
		var aCommEligOrderStatusT = sCommEligOrderStatusT.split(",")
        
        log.debug("aCommEligOrderStatusT", aCommEligOrderStatusT)

		var sCommEligShipMethodF = oCurrentScript.getParameter("custscript_lbsso_scommelgshpmf")
		var aCommEligShipMethodF = sCommEligShipMethodF.split(",")
        
        log.debug("aCommEligShipMethodF", aCommEligShipMethodF)

		var sCommEligOrderStatusF = oCurrentScript.getParameter("custscript_lbsso_scommelgrdrsttf")
		var aCommEligOrderStatusF = sCommEligOrderStatusF.split(",")
        
        log.debug("aCommEligOrderStatusF", aCommEligOrderStatusF)




		var oNewRecord = context.newRecord
		var oOldRecord = context.oldRecord

		var oSubmissionObject = new Object()

		var sEstGrossProfit = oNewRecord.getValue({
			fieldId : "estgrossprofit"
		})
        
        log.debug("sEstGrossProfit", sEstGrossProfit)

		var fldEstGrossProfit = parseFloat(sEstGrossProfit)

		var sShippingMethod = oNewRecord.getValue({
			fieldId : "shipmethod"
		})
        
        log.debug("sShippingMethod", sShippingMethod)

		// var sStatus = oNewRecord.getValue({
		// 	fieldId : "status"
		// })

		var sStatus = oNewRecord.getValue({
			fieldId : "orderstatus"
		})

		
        
        log.debug("sStatus", sStatus)

		var oDataPayload = new Object()

		if( ((fldEstGrossProfit >= 40 && aCommEligShipMethodT.indexOf(sShippingMethod) > -1 ) || fldEstGrossProfit >= 75) && aCommEligOrderStatusT.indexOf(sStatus) > -1 ){


			log.debug("Entered Eligible")

			oDataPayload.custbody_acc_elg_commission = true

		}
		else if( ((fldEstGrossProfit < 75 && aCommEligShipMethodF.indexOf(sShippingMethod) == -1) || fldEstGrossProfit < 40) && aCommEligOrderStatusF.indexOf(sStatus) > -1 ){

			log.debug("Entered Not-Eligible")

			oDataPayload.custbody_acc_elg_commission = false


		}
      
      log.debug("oDataPayload", JSON.stringify(oDataPayload))

		record.submitFields({
			type : oNewRecord.type,
			id : oNewRecord.id,
			values : oDataPayload
		})






	}

	return {

		beforeLoad : fBeforeLoad,
		beforeSubmit : fBeforeSubmit,
		afterSubmit : fAfterSubmit

	}

})