/**
 * 2019 IT Rationale Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code
 * 
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.
 * 
 *  Version    Date            	Author           Remarks
 * 	1.00       11 Oct 2019      Raffy Gaspay    Initial version.
 * 
 * 
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/file','N/url','N/redirect','N/format','N/error', 'N/search','N/task',
        'N/log', 'N/record','N/runtime','./itr_ifd_lib_common.js'],


function(serverWidget,file,url,redirect,format,error,search,task,log,record,runtime,common) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
    	var DEBUG_IDENTIFIER = 'beforeLoad';
    	try{
    		var triggerType = scriptContext.type;
    		var CLIENTSCRIPTID = common.getScriptParameter('custscript_itr_ifd_email_contacts_client');
    		if(triggerType != 'view'){
    			return;
    		}
    		var recType = scriptContext.newRecord.type;
    		var recId = scriptContext.newRecord.id;
    		var form = scriptContext.form;
    			form.clientScriptFileId = CLIENTSCRIPTID;
    		
    		form.addButton({
				id : "custpage_email_contacts_header",
				label : "Email All Contacts",
				functionName : 'toSuitelet(\''
					+ recType
					+ '\', \''
					+ recId
					+ '\');'
			});
    		var msgSublist = form.getSublist({
    		    id : 'messages'
    		});
    		msgSublist.addButton({
    			id : "custpage_email_contacts_comms",
				label : "Email All Contacts",
				functionName : 'toSuitelet(\''
					+ recType
					+ '\', \''
					+ recId
					+ '\');'
			});
			
    		
    		
    		
    	
    		
    	}catch(ex){
    	
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    	}
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	var DEBUG_IDENTIFIER = 'beforeSubmit';
    	try{
    		var objNewRec = scriptContext.newRecord;
    		var recType = objNewRec.type;
    		var entity = objNewRec.getValue('entity');
    		var contactsSearchId = common.getScriptParameter('custscript_itr_ifd_search_contactsi');
    		var type = scriptContext.type;
    		if(type != 'create'){
    			return;
    		}
    		
    		var searchFilters = [];
    		var company = search.createFilter({
    			 	name: 'internalid',
    			 	join: 'company',
		    	    operator: search.Operator.ANYOF,
		    	    values: entity
	            	});
				
    			searchFilters.push(company);
    		
			
			var emailFlag = common.filterContactEmailFlag(recType);
			if(!common.isNullOrEmpty(emailFlag)){
				searchFilters.push(emailFlag);
			}
			
			var searchResults = common.searchRecords(null,contactsSearchId,searchFilters);
			var stEmails = '';
			if(!common.isNullOrEmpty(searchResults)){
				for(var i in searchResults){
					var contactFields = searchResults[i];
					var email = contactFields.getValue('email');
					if(i > 0){
						stEmails +=',';
					}
					stEmails += email;
				}
			}
			if(!common.isNullOrEmpty(stEmails)){
				objNewRec.setValue({
					fieldId: 'email',
					value: stEmails
				});
				if(recType == 'vendorcredit'){
					objNewRec.setValue({
						fieldId: 'custbody_itr_ifd_vb_vc_email',
						value: stEmails
					});
				}
			}
			log.debug(DEBUG_IDENTIFIER,'Contact Emails: ' + stEmails);
    		
    		
    	}catch(ex){
    	
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    	}
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        //afterSubmit: afterSubmit
    };
    
});
