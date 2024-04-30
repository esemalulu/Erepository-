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
	    			var stCurrentPage = objRecord.getValue({
						fieldId: 'custpage_current_page' 
						});
	    			var stSelected = getSelectedLines(stCurrentPage);	
		    		
		    		
		    		objRecord.setValue({
						fieldId: 'custpage_selected_lines', 
						value: stSelected
						});
		    		
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
	    	var DEBUG_IDENTIFIER = 'search';
	    	try
	    	{	
	    		
	    		var objRecord = currentRecord.get();
	  		   	
	    		var stCurrentPage = objRecord.getValue({
					fieldId: 'custpage_current_page' 
					});
	    		var stSelected = getSelectedLines(stCurrentPage);	
	    		
	    	    objRecord.setValue({
					fieldId: 'custpage_selected_lines', 
					value: stSelected
					});		
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
	 	    	var stSelected = getSelectedLines(intCurrentPage);		
	 	    
	 	    	 objRecord.setValue({
	 					fieldId: 'custpage_selected_lines', 
	 					value: stSelected
	 					});		    	
		
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
	     	var DEBUG_IDENTIFIER = 'saveRecord_ProcessInvoice';
	     	try{
	     		
	     		var arrErrorMessage = new Array();
	     		var boolProceed = true;
	     	    
	     		var objRecord = currentRecord.get();
	     		var stCurrentPage = objRecord.getValue({
	 				fieldId: 'custpage_current_page' 
	 				});
	     		
	     		var stSelected = getSelectedLines(stCurrentPage);
	     		
	     		
	     		objRecord.setValue({
	 				fieldId: 'custpage_selected_lines', 
	 				value: stSelected
	 				});
	     		
	     		var arrSelected = JSON.parse(stSelected);
	     			     		
	     		var intTotalCheckLine = 0;
	     		
	     		//check if there are no selected item(s) on the sublist
	     		if(common.isNullOrEmpty(arrSelected)){
	     			//add the error
	     			arrErrorMessage.push('No line selected, Please select an line first.');
	     		}else{
	     			intTotalCheckLine = arrSelected.length;
	     		}

	     		//check if there is an error
	     		if(!common.isNullOrEmpty(arrErrorMessage)){
	     			//create error messages
	     			var stErrors = arrErrorMessage.join('\n');
	     			alert(stErrors); //show the alert message
	     			boolProceed = false;
	     		}
	     		else{
	     			//alert the user how many selected/checked line to be processed
	     			alert(intTotalCheckLine + ' selected lines scheduled to be processed.');
	     		}
	     		return boolProceed;
	     		
	 	
	     	}catch(ex){
	     	    	var errorStr = 'Type: ' + ex.type + ' | ' +
	     			'Name: ' + ex.name +' | ' +
	     			'Error Message: ' + ex.message;
	         		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
	     				+ errorStr);        		
	     	    }
	     }
	     function goToPage(intCurrentPage, stPageStart){
	    	 var DEBUG_IDENTIFIER = 'goToPage';
	    	 try{
	    		 var objRecord = currentRecord.get();
		    	 var stSelected = getSelectedLines(intCurrentPage);		
		    
		    	 objRecord.setValue({
						fieldId: 'custpage_selected_lines', 
						value: stSelected
						});
		
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
	     function getSelectedLines(stCurrentPage){	 
	    	 var DEBUG_IDENTIFIER = 'getSelectedLines';
	    	 try{
	    		
	    		 var objRecord = currentRecord.get();  		
	     		 var stPageCount = objRecord.getLineCount({
	    			sublistId: 'custpage_items_sublist' 
	    		 });
	     		

	     	 	var arrExistingLines = [];
				var stExisting = objRecord.getValue({
					fieldId: 'custpage_selected_lines'
				});
				
				if(!common.isNullOrEmpty(stExisting)){
				
					arrExistingLines = JSON.parse(stExisting); 		
				}

				 var recIds = '';
				 var recType = '';
				 var salesRep = '';
				 var arrSelected = [];
	 
			 for(var x = 0; x < stPageCount ; x++){
				
					var stChecked = objRecord.getSublistValue({
			 			 sublistId: 'custpage_items_sublist',
			 		     fieldId: 'custpage_select',
			 		     line: x
			 		});
						recIds = objRecord.getSublistValue({
			   	 			 sublistId: 'custpage_items_sublist',
			   	 		     fieldId: 'custpage_internal_id',
			   	 		     line: x
	   	 				});
						recType= objRecord.getSublistValue({
			   	 			 sublistId: 'custpage_items_sublist',
			   	 		     fieldId: 'custpage_record_type',
			   	 		     line: x
	   	 				});
						
						var map = {
								id 	: recIds,
								t : recType,
								
						}
				/*	//If the line is unchecked but previously selected, remove that line in the Selected Invoice
						if(stChecked == false || stChecked == 'false'){
							for(var i in arrExistingLines){
								if(recIds == arrExistingLines[i].recId){
									arrExistingLines.splice(i, 1);
								}
							}
						}*/
				
					if(stChecked == true || stChecked == 'true'){
						arrSelected.push(map);
						map = {};
					}
		
			 	}

			 arrExistingLines = arrExistingLines.concat(arrSelected);
			 var arrUniqueIds = common.removeDuplicatesArrofObjects(arrExistingLines,'id');
			 return JSON.stringify(arrUniqueIds);

	     	}
	    	 catch(ex){
	     		var errorStr = 'Type: ' + ex.type + ' | ' +
	 			'Name: ' + ex.name +' | ' +
	 			'Error Message: ' + ex.message;
	     		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
	 				+ errorStr);
	     		
	 	    }
	     }
	     function btnMarkUnMarkAll(stSublistId, stCheckBoxInternalId, stMarkUnMarkAll){
	     	var DEBUG_IDENTIFIER = 'btnMarkUnMarkAll';
	     	try{
	     	
	     		var objRecord = currentRecord.get();
	     		var listCount = objRecord.getLineCount({
	     			sublistId: stSublistId
	     		}); //get the total sublist line items
	     		
	     	
	     	for(var intLnCtr = 0; intLnCtr < listCount; intLnCtr++){//traverse each sublist line
	     			 //select sublist row
	     		
	     			objRecord.selectLine({
	     			    sublistId: stSublistId,
	     			    line: intLnCtr
	     			});
	     		
	     			//get the value of the checkbox column on the suitelet sublist
	     			var stCheckUncheck = objRecord.getCurrentSublistValue({
	     			    sublistId: stSublistId,
	     			    fieldId: stCheckBoxInternalId,

	     			});
	     		
	     			if(stCheckUncheck != stMarkUnMarkAll) {//check if checkbox is check/unchecked
	   
	     			 //change the value of the checkbox
	     				
	     				if(stMarkUnMarkAll == 'true'){
	 	    				objRecord.setCurrentSublistValue({
	 	    				    sublistId: stSublistId,
	 	    				    fieldId: stCheckBoxInternalId,
	 	    				    value: true 
	 	    				});
	     				}else if(stMarkUnMarkAll == 'false'){
	     					objRecord.setCurrentSublistValue({
	 	    				    sublistId: stSublistId,
	 	    				    fieldId: stCheckBoxInternalId,
	 	    				    value: false
	 	    				  
	 	    				});
	     					objRecord.setValue({
	     						fieldId: 'custpage_selected_lines',	    
	 	    				    value: null
	 	    				  
	 	    				});
	     				}
	     				
	     				
	     			//commit the changes
	     				objRecord.commitLine({
	     				    sublistId: stSublistId
	     				});
	     				
	     			}
	     			
	     		}
	     	//If Mark All, get the internal ids of all invoice and set it to the selected lines field
	     	if(stMarkUnMarkAll == 'true'){
	     		var allInvoice = objRecord.getValue({
	     			fieldId: 'custpage_all_lines'
	     		});
	     		objRecord.setValue({
	     			fieldId: 'custpage_selected_lines',
	     			value: allInvoice,
	     		});
	     	}
	     
	         }
	     	catch(ex){
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
        btnMarkUnMarkAll:btnMarkUnMarkAll,

    };
    
});



