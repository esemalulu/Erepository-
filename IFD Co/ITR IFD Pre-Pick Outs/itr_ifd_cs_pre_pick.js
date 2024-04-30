/**
 * 2018 IT Rationale Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code
 * 
 *  This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.*
 * 
 *  Version    Date            Author           Remarks
 * 	1.00       19 Nov 2018     Raffy Gaspay		 Initial Version
 * 
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/error','N/url', 'N/search','N/log', 'N/currentRecord','./itr_ifd_lib_common.js'],

function(error,url,search,log,currentRecord,common) {
	
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */

	 function fieldChanged(scriptContext) {
	    	
	    	var DEBUG_IDENTIFIER = 'fieldChanged';
	    	try{
	    		 		
	    		var objRecord = currentRecord.get();
	    		var fieldName = scriptContext.fieldId;
	    		var sublist = scriptContext.sublistId;
	    	
	    		if(fieldName == 'custpage_pagenav'){


		    		var stNewCurrentPage = common.forceInt(objRecord.getValue({
								fieldId: fieldName
						}));
		    		    		
		     		var stRowPerPage = common.forceInt(objRecord.getValue({
						fieldId: 'custpage_perpage' 
		    		}));
		     	
		    		var stPageStart = stNewCurrentPage == 1 ? stNewCurrentPage : (stNewCurrentPage - 1) * stRowPerPage + 1;
		    	
		    		objRecord.setValue({
						fieldId: 'custpage_page_start', 
						value: stPageStart
						});
		    	
		    		objRecord.setValue({
						fieldId: 'custpage_current_page', 
						value: stNewCurrentPage
						});
		
		    		objRecord.setValue({
						fieldId: 'custpage_action', 
						value: 'search'
						});
		    		
		    		window.ischanged = false;
		    		//window.location.reload
		    		document.forms[0].submit();
	    		}
    		    
	  		
	    	}catch(ex){
		    	var errorStr = 'Type: ' + ex.type + ' | ' +
				'Name: ' + ex.name +' | ' +
				'Error Message: ' + ex.message;
	    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
					+ errorStr);	    		
		    }
	    }
  

	    /**
	     * Validation function to be executed when record is saved.
	     *
	     * @param {Object} scriptContext
	     * @param {Record} scriptContext.currentRecord - Current form record
	     * @returns {boolean} Return true if record is valid
	     *
	     * @since 2015.2
	     */
	   
	    function search(context){
	    	var DEBUG_IDENTIFIER = 'searchInvoice';
	    	try
	    	{	
	    		
	    		var objRecord = currentRecord.get();
	    	
	    	        		
	    		//set the hidden field custpage_action for later use
	   		    	
	    	    objRecord.setValue({
					fieldId: 'custpage_initial_state', 
					value: true
					});
	    
	    		 objRecord.setValue({
	 				fieldId: 'custpage_current_page', 
	 				value: 1
	 				});
	     		
	    		 objRecord.setValue({
	  				fieldId: 'custpage_page_start', 
	  				value: 1
	  				});	    		 
	    		 
	    		 objRecord.setValue({
	   				fieldId: 'custpage_action', 
	   				value: 'search'
	   				});
	    		 
	    		 window.ischanged = false;
	    		 
	    		document.forms[0].submit();

	    	}
	    	catch(ex){
	    		var errorStr = 'Type: ' + ex.type + ' | ' +
				'Name: ' + ex.name +' | ' +
				'Error Message: ' + ex.message;
	    		log.debug('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
					+ errorStr);
	    		
		    }
	    }
	    
	     

	    /**
	     * Invoked when the user clicked the Prev/next button on the form
	     * 
	     * @param intStart - the sequence number where the sublist will start 
	     */
	     function goToPage(intCurrentPage, stPageStart){
	    	 var DEBUG_IDENTIFIER = 'goToPage';
	    	 try{
	    		 var objRecord = currentRecord.get();
		    	
		
		    	 objRecord.setValue({
						fieldId: 'custpage_page_start', 
						value: stPageStart
						});
		   	
		    	objRecord.setValue({
					fieldId: 'custpage_current_page', 
					value: intCurrentPage
					});
		
		    	objRecord.setValue({
					fieldId: 'custpage_action', 
					value:  'search',
					ignoreFieldChange: true
		
					});
		    	window.ischanged = false;
		    	document.forms[0].submit();
	    	 }
	    	catch(ex){
	    		var errorStr = 'Type: ' + ex.type + ' | ' +
				'Name: ' + ex.name +' | ' +
				'Error Message: ' + ex.message;
	    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
					+ errorStr);
	    		
		    }
	    }
	     
	     function windowOpen(url) {
	    	 window.open(url,'newPO','width=1000,height=400,scrollbars=yes');
		}

	     function saveRecord(scriptContext) {
	     	var DEBUG_IDENTIFIER = 'saveRecord_POconsolidation';
	     	try{
	     		var objRecord = currentRecord.get();    		
	     		objRecord.setValue({
	 				fieldId: 'custpage_export_to_csv', 
	 				value: 'export'
	 				});
	    
	     		return true;
	     		
	 	
	     	}catch(ex){
	     	    	var errorStr = 'Type: ' + ex.type + ' | ' +
	     			'Name: ' + ex.name +' | ' +
	     			'Error Message: ' + ex.message;
	         		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
	     				+ errorStr);        		
	     	    }
	     }
	     

    return {
    	
        fieldChanged:fieldChanged,
        search : search,      
        goToPage : goToPage,
        saveRecord:saveRecord,

    };
    
});



