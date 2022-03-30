/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 
/**
* SCRIPT EXPLANATION:
*  - The purpose of this script is to update Projected Total of Opportunity with Invoice subtotal
*/ 
define(['N/record',
		'N/search',
		'N/runtime',
		'N/email',
		'N/log',
		'N/error'],

function(record, search, runtime, email, log, error){
	
	function afterSubmit(context) {
					
		var recInvoice = context.newRecord;
		var stInvId = recInvoice.id;
		
		log.debug('-- START --', 'invoice id: ' + stInvId);
		log.debug('runtime.executionContext', runtime.executionContext);
		log.debug('context.type', context.type);
		
		if(context.type !== context.UserEventType.CREATE){
			return;
		}
		
		var stCreatedFromId = recInvoice.getValue({
			fieldId : 'createdfrom'
		});
		var stInvOppId = recInvoice.getValue({
			fieldId : 'opportunity'
		});
		var stInvSubtotal = recInvoice.getValue({
			fieldId : 'subtotal'
		});
		
		try{
			
			if(isFirstInvoice(stInvId, stCreatedFromId, stInvOppId)){
				
				var stOppId = getOpp(stInvOppId, stCreatedFromId);
				
				if(stOppId){
					updateOppProjectedTotal(stOppId, stInvSubtotal);	
				}
			}
			
			/* //test
			throw error.create({
				name: 'ERROR',
				message: 'test error'
			});*/
			
		} catch(ex){	
			sendErrorMail(stInvId, ex.toString());
		}
	}
	
	//Checks if invoice is the first one in the chain
	function isFirstInvoice(stInvId, stCreatedFromId, stInvOppId){
		
		var bIsFirstInvoice = false;
		var invoiceSearch;
		var intOtherInvCount = 0;
		
		if(stInvId){
			
			if(stInvOppId){	
				//Search invoices from the same opportunity
				invoiceSearch = search.create({
					type: 'INVOICE',
					columns: ['internalid'],
					filters: [
						['mainline', 'is', 'T'],
						'and', ['internalid', 'noneof', stInvId],
						'and', ['opportunity', 'anyof', stInvOppId]
					]
				});
			} else if(stCreatedFromId){				
				//Search invoices from the same sales order
				invoiceSearch = search.create({
					type: 'INVOICE',
					columns: ['internalid'],
					filters: [
						['mainline', 'is', 'T'],
						'and', ['internalid', 'noneof', stInvId],
						'and', ['createdfrom', 'anyof', stCreatedFromId]
					]
				});
			} 
				
			
			if(invoiceSearch){
				invoiceSearch.run().each(function(result){
					intOtherInvCount++;
					return true;
				});
			}
			
			if(intOtherInvCount == 0){
				bIsFirstInvoice = true;
			}
		}
		
		log.debug('isFirstInvoice', 'invoice: ' + stInvId + ' | createdfrom: ' + stCreatedFromId + ' | opp: ' + stInvOppId + ' | isFirstInvoice: ' + bIsFirstInvoice);
		
		return bIsFirstInvoice;
	}
	
	//Returns the Opportunity id related to the invoice or sales order
	function getOpp(stInvOppId, stSOId){
		
		var stOppId = null;
		
		if(stInvOppId){
			stOppId = stInvOppId;
		} else {
			
			if(stSOId){
				
				var soLookup = search.lookupFields({
					type : 'SALESORDER',
					id : stSOId,
					columns : ['opportunity']
				});
				
				log.debug('getOpp', 'soLookup.opportunity: ' + JSON.stringify(soLookup.opportunity));
				
				if(soLookup.opportunity && soLookup.opportunity[0]){ //select field
					stOppId = soLookup.opportunity[0].value;
				}
			}		
		}
		
		log.debug('getOpp', 'opp: ' + stOppId);
		
		return stOppId;
	}
	
	//Sets Projected Total of the opportunity to the invoice subtotal
	function updateOppProjectedTotal(stOppId, stInvSubtotal){
		
		record.submitFields({
			type: record.Type.OPPORTUNITY,
			id: stOppId,
			values: {
				projectedtotal : stInvSubtotal
			},
			options: {
				enableSourcing: false,
				ignoreMandatoryFields : true
			}
		});
		
		log.debug('updateOppProjectedTotal', 'opp: ' + stOppId + ' | projtotal: ' + stInvSubtotal);
	}
	
	//Sends error email
	function sendErrorMail(stInvId, stErrorMsg){				
		var stSendTo = runtime.getCurrentScript().getParameter({name: 'custscript_projtotal_error_sendto_inv'}); //may be comma-separated values of internalids or email addresses
		var stSendFrom = runtime.getCurrentScript().getParameter({name: 'custscript_projtotal_error_sendfrom_inv'}); //employee id
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
					body: 'Invoice internal ID: ' + stInvId + '<br/>'
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
