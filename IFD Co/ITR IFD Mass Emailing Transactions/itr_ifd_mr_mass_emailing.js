/**
 * 2019 IT Rationale Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code
 * 
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.
 * 
 *  Version    Date            Author           Remarks
 * 	1.00       18 Oct 2019      Raffy Gaspay    Initial version. 
 * 
 *  
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/log','N/error','N/search','N/email','N/render','N/record','N/runtime','N/email','N/url','./itr_ifd_lib_common.js'],

function(log,error,search,email,render,record,runtime,email,url,common) {
   
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	var DEBUG_IDENTIFIER = 'getInpuData';
    	log.debug(DEBUG_IDENTIFIER,'--START--');
    	try{
    		var stMapObj = common.getScriptParameter('custscript_itr_mr_mapped_obj');
    		var invEmailTemplate = common.getScriptParameter('custscript_mr_inv_email_template');
       		var cmEmailTemplate = common.getScriptParameter('custscript_mr_cm_email_template');   		
       		var raEmailTemplate = common.getScriptParameter('custscript_mr_ra_email_template');   		
       		var authorInvCM = common.getScriptParameter('custscript_mr_author');       		  		
       		var authorRA = common.getScriptParameter('custscript_mr_authorra');
       		var authorVC = common.getScriptParameter('custscript_mr_authorvc');
       		var VENDOR_CUSTOMER = common.getScriptParameter('custscript_mr_vend_customer');
       		
    		var arrMapObj = JSON.parse(stMapObj);
    		for(var x in arrMapObj){
    			arrMapObj[x]['invEmailTemplate'] = invEmailTemplate;
    			arrMapObj[x]['cmEmailTemplate'] = cmEmailTemplate;
    			arrMapObj[x]['raEmailTemplate'] = raEmailTemplate;
    			arrMapObj[x]['authorInvCM'] = authorInvCM;
    			arrMapObj[x]['authorRA'] = authorRA;
    			arrMapObj[x]['authorVC'] = authorVC;
    			arrMapObj[x]['VENDOR_CUSTOMER'] = VENDOR_CUSTOMER;
    			
    		}
    		log.debug(DEBUG_IDENTIFIER,'arrMapObj: ' +JSON.stringify(arrMapObj));
    		if(common.isNullOrEmpty(arrMapObj)){
    			log.debug(DEBUG_IDENTIFIER,'No Transaction has been found!');
    			arrMapObj = {};
    			
    		}
    		return arrMapObj;
    		
   		 
    		log.debug(DEBUG_IDENTIFIER,'--END--');
    	}catch(ex){
        	var errorStr = 'Type: ' + ex.type + ' | ' +
    		'Name: ' + ex.name +' | ' +
    		'Error Message: ' + ex.message;
        	
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
    			+ errorStr);
        }
    
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var DEBUG_IDENTIFIER = 'map';
    	log.debug(DEBUG_IDENTIFIER,'----START----');
    	
	    try{
	    	var objFields = JSON.parse(context.value);
    		log.debug(DEBUG_IDENTIFIER,'ObjFields: ' + JSON.stringify(objFields));
    	
    		var internalid = objFields.id;
    		
    		context.write(internalid,objFields);
 	
	    	log.debug(DEBUG_IDENTIFIER,'----END----');
	    }catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +'Name: ' + ex.name +' | ' +'Error Message: ' + ex.message;
	    	
			log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '+ errorStr);
	    }
    }

    function reduce(context) {
    	var DEBUG_IDENTIFIER = 'reduce';
    	log.debug(DEBUG_IDENTIFIER,'----START----');
    	
    	
	    try{
			var recId = parseInt(context.key);
	    	var objFields = context.values;
	    
	    	//Loop Through each Transaction
	    	
	    	  for(var i in objFields){
	    		    var tranFields = JSON.parse(objFields[i]);
	    		   
	    		    var recType = tranFields.t; // Record Type	
	    		    var invEmailTemplate = tranFields.invEmailTemplate;
	    		    var cmEmailTemplate = tranFields.cmEmailTemplate;
	    		    var raEmailTemplate = tranFields.raEmailTemplate;
	    		    var raEmailTemplate = tranFields.raEmailTemplate;
	    		    var authorInvCM = tranFields.authorInvCM;
	    		    var authorRA = tranFields.authorRA;
	    		    var authorVC = tranFields.authorVC;
	    		    var VENDOR_CUSTOMER = tranFields.VENDOR_CUSTOMER;
	    		          			        		
	        		var EMAIL_TEMPLATE = '';
	        		var ENTITY_TYPE = '';
	        		var AUTHOR = '';
	        		
	        		switch (recType) {
	        			
	        			case 'invoice' : 
	        				EMAIL_TEMPLATE = invEmailTemplate;
	        				ENTITY_TYPE = 'customer';
	        				AUTHOR = authorInvCM;
	        				
	        			break;
	        			
	        			case 'creditmemo' : 
	        				EMAIL_TEMPLATE = cmEmailTemplate;
	        				ENTITY_TYPE = 'customer';
	        				AUTHOR = authorInvCM;
	        			break;
	        			
	        			
	        			case 'returnauthorization' : 
	        				EMAIL_TEMPLATE = raEmailTemplate;
	        				ENTITY_TYPE = 'customer';
	        				AUTHOR = authorRA;
	        			break;  	        				        			
	        		
	        		}
	        		
	        		var objTranRec = record.load({
	        			type: recType,
	        			id: recId
	        		});
	        		var tranNumber = objTranRec.getValue('tranid');
	        		var entityName = objTranRec.getText('entity');
	        		var customFormId = objTranRec.getValue('customform');
	        		var strEmails = objTranRec.getValue('email');	        		
	        		var entityId = objTranRec.getValue('entity');
	        		
	        		var objCustRec = record.load({
	        			type: ENTITY_TYPE,
	        			id: entityId,       			
	        		});
	        		var DSR = [];
	        		var salesRep = objCustRec.getValue('salesrep');
	        		var custCategory = objCustRec.getValue('category');
	        		
	        		if(VENDOR_CUSTOMER == custCategory){
	        			AUTHOR = authorVC;
	        		}
	        		if(!common.isNullOrEmpty(salesRep)){
	        			DSR.push(salesRep);
	        		}
	        		
	        		var emailTemp = render.mergeEmail({
	    			    templateId: EMAIL_TEMPLATE, 
	    			    entity: null ,
	    			    recipient: null,
	    			    supportCaseId: null,
	    			    transactionId: recId,
	    			    customRecord: null
	    			   });
	        		
	        		var subject = emailTemp.subject ;//+ ' ' +tranNumber ;
	        		var body = emailTemp.body;
	        		
	        		var tranPDF = [];
	        		
		    		var renderedPDF = render.transaction({
		    				entityId: recId,
		    				printMode: render.PrintMode.PDF,
		    				formId : parseInt(customFormId),
		    				inCustLocale: true 
		    			});
		    			tranPDF.push(renderedPDF);
		    			email.send({
						    author: AUTHOR,
						    recipients: strEmails,
						    cc: DSR,
						    subject: subject,
						    body: body,
						    attachments: tranPDF,
						    relatedRecords: { 
						    	entityId: entityId,
						    	transactionId : recId,				    
						    	
						    	}
						    
						});
		    			log.debug(DEBUG_IDENTIFIER,'Email has been sent');
		        		
	    		    context.write(recId,recId);
	    	  }
	    	log.debug(DEBUG_IDENTIFIER,'----END----');
	    }catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +'Name: ' + ex.name +' | ' +'Error Message: ' + ex.message;
	    	
			log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '+ errorStr);
	    }
    }



    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	var DEBUG_IDENTIFIER = 'summary';
    	var DEBUG_IDENTIFIER = 'summary';
    	log.audit(DEBUG_IDENTIFIER + ' Usage Consumed', summary.usage);
    	var numOfRecords = 0;
  		summary.output.iterator().each(function(key, value) {
  			
  			numOfRecords++;
  			return true;
  			});
  		log.debug(DEBUG_IDENTIFIER,'Total Number of Emails Sent: ' + numOfRecords);
  		log.debug(DEBUG_IDENTIFIER,'Map/Reduce script execution has been completed');
  		
    	handleErrorIfAny(summary);
    }
    

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error) {
            var e = error.create({
                name : 'INPUT_STAGE_FAILED',
                message : inputSummary.error
            });
            handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(
                function(key, value) {
                    var msg = 'Failure to create : ' + key
                            + '. Error was: '
                            + JSON.parse(value).message + '\n';
                    errorMsg.push(msg);
                    return true;
                });
        if (errorMsg.length > 0) {
            var e = error.create({
                name : 'CAPTURE_FAILEDD',
                message : JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function handleErrorAndSendNotification(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);
    }

    return {
        getInputData: getInputData,
        map: map, 
        reduce:reduce,
        summarize: summarize
    };
    
});
