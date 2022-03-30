/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 
/**
* SCRIPT EXPLANATION:
*  - The purpose of this script is to recalculate Projected Total when an Opportunity includes 3-Year Products
*/ 
define(['N/record',
		'N/search',
		'N/runtime',
		'N/email',
		'N/log',
		'N/error'],

function(record, search, runtime, email, log, error){
	
	function afterSubmit(context) {

		var recOpp = context.newRecord;
		
		log.debug('-- START --', 'opp id: ' + recOpp.id);
		log.debug('runtime.executionContext', runtime.executionContext);
		log.debug('context.type', context.type);
		
		if(!isScriptApplicable(context, recOpp)){
			return;
		}
		
		try{
			updateOppProjectedTotal(recOpp);
			
			/* //test
			throw error.create({
				name: 'ERROR',
				message: 'test error'
			});*/
			
		} catch(ex){	
			sendErrorMail(recOpp.id, ex.toString());
		}
	}
	
	function isScriptApplicable(context, recOpp){
		if(runtime.executionContext.toUpperCase() != 'USERINTERFACE'){
			return false;
		}
		
		if(context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT){
			return false;
		}
		
		if(context.type == context.UserEventType.EDIT){
			
			//Check status
			var stStatus = recOpp.getValue({
				fieldId : 'statusRef' 
			});
			
			log.debug('statusRef', stStatus);
			
			//Do not apply script if Closed Won
			if(stStatus.toUpperCase() == 'CLOSEDWON'){
				return false;
			}
		}
		
		return true;
	}
	
	//Recalculates and updates Projected Total of the opportunity record
	function updateOppProjectedTotal(recOpp){
		
		var arExcludeItemTypes = ['SUBTOTAL', 'DESCRIPTION'];
		var arSpecialItemTypes = ['DISCOUNT', 'MARKUP']; //item types that depend on the preceding item line
		var bApply3YrCalcToSpecItemTypes = true; //if true, the 3-yr calculation will apply to discount and markup
		//log.debug('updateOppProjectedTotal', 'bApply3YrCalcToSpecItemTypes: ' + bApply3YrCalcToSpecItemTypes);
		
		var ar3YrItems;
		var st3YrItems = runtime.getCurrentScript().getParameter({name: 'custscript_3yr_special_items'}); //may be comma-separated list of item ids
		if(st3YrItems){
			ar3YrItems = st3YrItems.split(",");
		}
		
		var stProjTotalOld = recOpp.getValue({
			fieldId : 'projectedtotal'
		});
		var intCount = recOpp.getLineCount({
			sublistId : 'item'
		});
		
		var stItem;
		var stPrevItem;
		var stItemType;
		var stAmount;
		var flProjTotal = 0;
		
		for(var i = 0; i < intCount; i++){
			
			stItem = recOpp.getSublistValue({
				sublistId : 'item',
				fieldId : 'item',
				line : i
			});
			
			stAmount = recOpp.getSublistValue({
				sublistId : 'item',
				fieldId : 'amount',
				line : i
			});
			
			stAmount = recOpp.getSublistValue({
				sublistId : 'item',
				fieldId : 'amount',
				line : i
			});
			stAmount = stAmount ? stAmount : '0'; //for when amount is empty
			
			stItemType = recOpp.getSublistValue({
				sublistId : 'item',
				fieldId : 'itemtype',
				line : i
			});
			
			//Skip some item types
			if(arExcludeItemTypes.indexOf(stItemType.toUpperCase()) > -1){
				continue;
			}
			
			//Calculate projected total
			if(ar3YrItems && ar3YrItems.indexOf(stItem) > -1){ 					//current line item is a 3-yr product
				
				flProjTotal += parseFloat(stAmount) / 3;
				
			} else if(bApply3YrCalcToSpecItemTypes 								//apply 3-yr calc to discount, markup
				&& arSpecialItemTypes.indexOf(stItemType.toUpperCase()) > -1 	//current line item is a discount, markup
				&& ar3YrItems && ar3YrItems.indexOf(stPrevItem) > -1){			//previous line item is a 3-yr product
					
				flProjTotal += parseFloat(stAmount) / 3;
				
			} else {
				
				flProjTotal += parseFloat(stAmount);
				
			}
			
			//Take note of the line item
			if(arSpecialItemTypes.indexOf(stItemType.toUpperCase()) < 0			//current line item is not discount, markup
				&& arExcludeItemTypes.indexOf(stItemType.toUpperCase()) < 0){	//current line item is not subtotal, description
				stPrevItem = stItem;
			}
		}
		
		log.debug('updateOppProjectedTotal', 'old projtotal: ' + stProjTotalOld + ' | new projtotal: ' + flProjTotal);
		
		//Update Opportunity Projected Total
		if(flProjTotal != parseFloat(stProjTotalOld)){
			record.submitFields({
				type: record.Type.OPPORTUNITY,
				id: recOpp.id,
				values: {
					projectedtotal : flProjTotal
				},
				options: {
					enableSourcing: false,
					ignoreMandatoryFields : true
				}
			});
			
			log.debug('updateOppProjectedTotal', 'updated projected total of opp: ' + recOpp.id);
		}
	}
	
	//Sends error email
	function sendErrorMail(stOppId, stErrorMsg){				
		var stSendTo = runtime.getCurrentScript().getParameter({name: 'custscript_projtotal_error_sendto_opp'}); //may be comma-separated values of internalids or email addresses
		var stSendFrom = runtime.getCurrentScript().getParameter({name: 'custscript_projtotal_error_sendfrom_opp'}); //employee id
		if(!stSendFrom){
			stSendFrom = runtime.getCurrentUser() ? runtime.getCurrentUser().id : ''; //current user
		}
		
		if(stSendFrom && stSendTo){
			var arSendTo = stSendTo.split(",");
			
			try{
				log.debug('sendErrorMail', 'sending error mail to: ' + arSendTo);
				log.debug('sendErrorMail', 'error msg: ' + stErrorMsg);
				
				email.send({
					author: stSendFrom,
					recipients: arSendTo,
					subject: 'Error occured while updating Projected Total of Opportunity',
					body: 'Opportunity internal ID: ' + stOppId + '<br/>'
						+ 'Script ID: ' + runtime.getCurrentScript().id + '<br/>'
						+ 'Deployment ID: ' + runtime.getCurrentScript().deploymentId + '<br/>'
						+ 'Error: ' + stErrorMsg + '<br/><br/>'
						+ 'This is an automated email, please contact your administrator.'
				});	

				log.error('sendErrorMail', 'error mail sent');
				
			} catch(ex){
				log.error('sendErrorMail', 'error while sending mail: ' + ex.toString());
			}
		}
	}

    return {
		afterSubmit : afterSubmit
    };

});
