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
 * 	1.00       Oct 11, 2019      Raffy Gaspay    Initial version. Mock up for the Mass Emailing Transactions
 * 
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/file','N/url','N/redirect','N/format','N/error', 'N/search','N/task',
        'N/log', 'N/record','N/runtime','./itr_ifd_lib_common.js'],


function(serverWidget,file,url,redirect,format,error,search,task,log,record,runtime,common) {
           
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
	
    function onRequest(context) {
    	var DEBUG_IDENTIFIER = 'onRequest';
    	log.debug(DEBUG_IDENTIFIER,'--START--');
    	try{
    		var request = context.request;
			var response = context.response;
			var NUMBEROFROWS = common.getScriptParameter('custscript_itr_ifd_email_num_rows');
			var stMapReduceScript = common.getScriptParameter('custscript_itr_mr_scriptid');
			var stMapReduceDeployment = common.getScriptParameter('custscript_itr_mr_deploymentid');
			var stDeploymentID = common.getScriptParameter('custscript_itr_mr_dep_internal_id');
			
			log.debug(DEBUG_IDENTIFIER, 'Action: '+ request.parameters.custpage_action);
			var objParameters = {};
	    		objParameters['parameter_action'] = request.parameters.custpage_action; 
	    		
	    	
	    		objParameters['parameter_tran_date_from'] = !common.isNullOrEmpty(request.parameters.custpage_tran_date_from) ? request.parameters.custpage_tran_date_from : ''; 
	    		objParameters['parameter_tran_date_to'] = !common.isNullOrEmpty(request.parameters.custpage_tran_date_to) ? request.parameters.custpage_tran_date_to : ''; 	    		
	    		objParameters['parameter_customer'] = request.parameters.custpage_customer || -1;    		
	    		objParameters['parameter_contact_action'] =request.parameters.custpage_contact_action || -1; 
	    		objParameters['parameter_already_emailed'] = request.parameters.custpage_already_emailed || -1; 
	    		objParameters['parameter_route'] = request.parameters.custpage_route|| -1; 
	    		
	    		
	    		objParameters['parameter_currentpage'] = request.parameters.custpage_current_page || 1; 
	    		objParameters['parameter_pagestart'] = request.parameters.custpage_page_start || 1;
	    			    		
	    		 //get the selected sales order json
	    		objParameters['parameter_perpage'] = NUMBEROFROWS;
	    		objParameters['parameter_pagenav'] = objParameters['parameter_currentpage'];
	    		objParameters['parameter_initial_state'] = request.parameters.custpage_initial_state || 'F';
	    		
	    		
	    		objParameters['parameter_all_lines'] = request.parameters.custpage_all_lines;
	    		objParameters['parameter_selected_lines'] = request.parameters.custpage_selected_lines;
	    		
	    		
	    	
    		switch(objParameters['parameter_action']){  
    		
    		case 'process':
				
    			var selectedLines = request.parameters.custpage_selected_lines;
				log.debug(DEBUG_IDENTIFIER,'Selected Invoice: ' +JSON.stringify(selectedLines));				
				
				var jobStatus = '';
				
				if(!common.isNullOrEmpty(selectedLines)){
					
					jobStatus = sendToMapReduceScript(stMapReduceScript,stMapReduceDeployment, selectedLines);
				}
				objParameters['parameter_selected_lines'] = '';			
				objParameters['parameter_currentpage'] = 1;
				objParameters['parameter_pagestart'] = 1;
				
				var form = confirmationPage(request,stMapReduceScript,stDeploymentID);
				response.writePage(form);
				break;

			case 'search':

			default:
				//create the suitelet
				 createForm(response, objParameters); 
			
				
				//var fileUrl = url.resolveTaskLink('LIST_MEDIAITEMFOLDER',{'folder':outsFolderId} );
				//var form = confirmationPage(request,fileUrl);
				//response.writePage(form);
				break;
			
		}
		
		log.debug(DEBUG_IDENTIFIER, '---PROCESS COMPLETE---');
    			
    		
    	}catch(ex){
    	
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    		
	    }
    }
    	
    	function createPageNavOptions(objPaging, objParameters, objSearchResult){
    		var DEBUG_IDENTIFIER = 'createPageNavOptions';
    		try
    		{
    			var stNumOfPages = 1;
    			var stPageNum = 1;
    			var stMaxRowPerPage = common.forceInt(objParameters['parameter_perpage']);
    			log.debug(DEBUG_IDENTIFIER,'Max Rows Per Page: ' + stMaxRowPerPage);
    			if(!common.isNullOrEmpty(objSearchResult))
    			{
    				var intResultLength = objSearchResult.length;
    				if(intResultLength > stMaxRowPerPage)
    				{
    					// Enable Paging selection			
    					// Add options to the select field
    					stNumOfPages = Math.ceil(intResultLength / stMaxRowPerPage);
    					for(var intLineCtr = 1; intLineCtr <= stNumOfPages; intLineCtr++){
    						objPaging.addSelectOption({
    							value : intLineCtr, 
    							text: intLineCtr
    						});
    					}
    				}
    			}		
    			else{
    				objPaging.addSelectOption({
    					value : 1, 
    					text: 1});			
    			}
    			log.debug(DEBUG_IDENTIFIER,'Num of Pages: ' + stNumOfPages);
    			return stNumOfPages;
    		}
    		catch(ex){
    	    	var errorStr = 'Type: ' + ex.type + ' | ' +
    			'Name: ' + ex.name +' | ' +
    			'Error Message: ' + ex.message;
        		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
    				+ errorStr);
        		
    	    }
    	}
    	function sendToMapReduceScript(stMapReduceScript,stMapReduceDeployment, mappedLines)
    	{
    		var DEBUG_IDENTIFIER = 'sendToMapReduceScript';
    		log.debug(DEBUG_IDENTIFIER,'--START--');
    		try{
    			

    			var mapReduce = task.create({
    	    	    taskType: task.TaskType.MAP_REDUCE,
    	    	    scriptId: stMapReduceScript,
    	    	    deploymentId: stMapReduceDeployment,
    	    	   params: {
    	    		   
    	    		   'custscript_itr_mr_mapped_obj': mappedLines,	    		  
    	    	   }
    	    	});
    	  
    	    	var jobId = mapReduce.submit();
    	    	log.audit(DEBUG_IDENTIFIER,'Calling Map Reduce Script from Suitelet Invoice Email: '+ jobId);
    			//get the map reduce script deployment status
    	    	
    	    	var jobStatusPost = task.TaskStatus;
    	    	log.debug(DEBUG_IDENTIFIER,'Status Post: ' + JSON.stringify(jobStatusPost));
    			if(jobStatusPost.PENDING == 'PENDING' ) //check if the schedule script status is QUEUED
    	    	{
    	            log.audit( DEBUG_IDENTIFIER, 'Executing Map Reduce Script: Map Reduce Script Status = ' + jobStatusPost);
    	        }
    			log.debug(DEBUG_IDENTIFIER,'--END--');
    			
    			return jobStatusPost;
    		}
    		catch(ex){
    	    	var errorStr = 'Type: ' + ex.type + ' | ' +
    			'Name: ' + ex.name +' | ' +
    			'Error Message: ' + ex.message;
        		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
    				+ errorStr);
        		
    	    }
    	}

    	
    	
    function createForm(response,objParameters){
    	var DEBUG_IDENTIFIER = 'createForm';	
		try{
			log.debug(DEBUG_IDENTIFIER, '--START--');
			var CLIENTSCRIPTID = common.getScriptParameter('custscript_itr_ifd_client_script'); 
			
    	
			 //create suitelet form
			var objForm = serverWidget.createForm({
				 title: 'Mass Emailing Transactions (1.0 BETA)',//TODO to be changed remove BETA
				 hideNavBar: false
		      });
			objForm.clientScriptFileId = CLIENTSCRIPTID;
			
			 var objSalesOrderLinesTab = objForm.addTab({
			        id : 'custpage_item_lines',
			        label : 'Items'
			    });
			 
			 var objSalesOrderLinesTab2 =  objForm.addTab({
			        id : 'custpage_temp_tab',
			        label : ' '
			    });
			 var objActionField = objForm.addField({
			        id: 'custpage_action',
			        type: serverWidget.FieldType.TEXT,
			        label: 'Action'
			      });

			 objActionField.defaultValue = 'process';
			 objActionField.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });			
			 
			    var searchCriteria = objForm.addFieldGroup({
			        id : 'custpage_search_criteria',
			        label : 'Search Criteria',
			        
			    });
			    var today = new Date();
			   var objTranFrom = objForm.addField({
		    		id: 'custpage_tran_date_from', 
		    		type: 'date', 
		    		label:'Transaction From Date', 		    		
		    		container: 'custpage_search_criteria'
		    	}); 
			   
			   var objTranTo= objForm.addField({
		    		id: 'custpage_tran_date_to', 
		    		type: 'date', 
		    		label:'Transaction To Date', 		    		
		    		container: 'custpage_search_criteria'
		    	}); 
			   
			   

			   var objInitialState = objForm.addField({
			    	id: 'custpage_initial_state', 
			    	type: 'checkbox', 
			    	label: 'Initial State', 		    	
		    		container: 'custpage_search_criteria'
			    	});
			   objInitialState.defaultValue= objParameters['parameter_initial_state'];
			 
			   objInitialState.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });
			
			   var today = new Date();

			   var objCustomer = objForm.addField({
		    		id: 'custpage_customer', 
		    		type: 'select', 
		    		label:'Customer', 
		    		source: 'customer',
		    		container: 'custpage_search_criteria'
		    	}); 
			   objCustomer.defaultValue = objParameters['parameter_customer'];
			   var objConAction = objForm.addField({
		    		id: 'custpage_contact_action', 
		    		type: 'select', 
		    		source:'customlist_itr_ifd_mass_email_action',
		    		label:'Action', 
		    		container: 'custpage_search_criteria'
		    	});
			  
	
			   var objAlreadyEmail = objForm.addField({
		    		id: 'custpage_already_emailed', 
		    		type: 'select', 
		    		source:'customlist_itr_ifd_mass_email_already_',
		    		label:'Already Emailed', 
		    		container: 'custpage_search_criteria'
		    	});
			 
			   
			   var objRoute = objForm.addField({
		    		id: 'custpage_route', 
		    		type: 'select', 
		    		source:'customrecord_ifd_customerrouting',
		    		label:'Route', 
		    		container: 'custpage_search_criteria'
		    	});
			   objRoute.defaultValue = objParameters['parameter_route'];
			   
			   var objSendEmail = objForm.addField({
		    		id: 'custpage_send_email', 
		    		type: 'text', 
		    		label:'Send Email', 
		    		container: 'custpage_search_criteria'
		    	}); 
			   
			   
			   
			   objSendEmail.defaultValue =objParameters['parameter_send_email'];
			   objSendEmail.updateDisplayType({
		        displayType : serverWidget.FieldDisplayType.HIDDEN
		      });
			   
			   var objSelectedLines = objForm.addField({
			    	id: 'custpage_selected_lines', 
			    	type: 'longtext', 
			    	label: 'Selected Lines'
			    	});			   
			   objSelectedLines.defaultValue =objParameters['parameter_selected_lines'];
			   objSelectedLines.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      }); 
			   
			   if(objParameters['parameter_initial_state'] == 'F' ){
				   objTranFrom.defaultValue = today;
				   objTranTo.defaultValue = today;	
				   objConAction.defaultValue = '1'; //Email Invoice
				   objAlreadyEmail.defaultValue = '2';//NO
			    }else{			    	
			    	objTranFrom.defaultValue = objParameters['parameter_tran_date_from'];
			    	objTranTo.defaultValue = objParameters['parameter_tran_date_to'];
			    	objAlreadyEmail.defaultValue = objParameters['parameter_already_emailed'];
			    	objConAction.defaultValue = objParameters['parameter_contact_action'];
			    }
			   
			   var objSearchBtn = objForm.addButton({
			        id : 'custpage_searchbtn',
			        label : 'Search',
			        functionName: 'search()'
			    });
			 
			   var objPerPage =   objForm.addField({
			    	id: 'custpage_perpage', 
			    	type: 'text', 
			    	label: 'Row Per Page'
			    	});
			    objPerPage.defaultValue=objParameters['parameter_perpage'];
			    objPerPage.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });
			    // Sublist
			   var stCurrentPage = objParameters['parameter_currentpage'];

			   var objNote =  objForm.addField({
			    	id: 'custpage_note', 
			    	type: 'text', 
			    	label: 'Note',
			    	container: 'custpage_temp_tab'
			    	
			    	});
			   objNote.dafaultValue = 'Testing';
			 
			   objNote.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.INLINE
			      });
			
			   log.debug(DEBUG_IDENTIFIER,'stCurrentPage: ' + stCurrentPage);
			   var objItemSublist = objForm.addSublist({
					id : 'custpage_items_sublist',
					label : 'Page: '+ stCurrentPage,	
					type : serverWidget.SublistType.LIST,
					tab: 'custpage_item_lines'
					
					
				});
			   //Hide the Sublist if action is not search
			   if(objParameters['parameter_action'] != 'search'){
				   objItemSublist.displayType = serverWidget.SublistDisplayType.HIDDEN;
				   objNote.updateDisplayType({
				        displayType : serverWidget.FieldDisplayType.HIDDEN
				      });		       
			    }	
			   //Add Columns
			   var colSelect = objItemSublist.addField({
			    	id: 'custpage_select', 
			    	type: 'checkbox', 
			    	label: 'Select',
			    });

			   var colTranDate = objItemSublist.addField({
			    	id: 'custpage_tran_date', 
			    	type: 'text', 
			    	label: 'Transaction Date',
			    });

			   var colTranNumber = objItemSublist.addField({
			    	id: 'custpage_tran_number', 
			    	type: 'text', 
			    	label: 'Transaction Number',
			    });
			      
			   						   
			   var colCustNum = objItemSublist.addField({
			    	id: 'custpage_cust_num', 
			    	type: 'text', 
			    	label: 'Account Number',
			    });
			   			   							  			   
			   var colCustomer = objItemSublist.addField({
			    	id: 'custpage_customer_name', 
			    	type: 'text', 
			    	label: 'Account Name',
			    });	
			   
			   var colTranAmount = objItemSublist.addField({
			    	id: 'custpage_tran_amount', 
			    	type: 'text', 
			    	label: 'Transaction Amount',
			    });
			  
			  	
			   var colEmailFlag = objItemSublist.addField({
			    	id: 'custpage_email_flag', 
			    	type: 'text', 
			    	label: 'Already Email Flag',
			    });	
			   
			   var colRoute = objItemSublist.addField({
			    	id: 'custpage_route_results', 
			    	type: 'text', 
			    	label: 'Route',
			    });	
			  
			   
			   var colRecId = objItemSublist.addField({
			    	id: 'custpage_internal_id', 
			    	type: 'text', 
			    	label: 'Internal Id',
			    });
			   colRecId.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });	
			   var colRecType = objItemSublist.addField({
			    	id: 'custpage_record_type', 
			    	type: 'text', 
			    	label: 'Record Type',
			    });	
			   colRecType.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });	
			   var colSalesRep = objItemSublist.addField({
			    	id: 'custpage_sales_rep', 
			    	type: 'select', 
			    	source:'employee',
			    	label: 'Sales REp',
			    });	
			   colSalesRep.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });	 //TODO
			   
			   if(objParameters['parameter_action'] == 'search'){
			    	objItemSublist = populateSublistData(objForm, objItemSublist, objParameters); //supply the sublist with data lines
			    }
			   
			  /* if(objParameters['parameter_action'] == 'search'|| objParameters['parameter_action'] == 'process'){
			    	var prePickOuts = populateSublistData(objForm, objItemSublist, objParameters); //supply the sublist with data lines
			    }
			   */
			    response.writePage(objForm);
			
				log.debug(DEBUG_IDENTIFIER, '--END--');
		
		
		}catch(ex){
    	
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    	}
    		

    }
    
    function populateSublistData(objForm, objItemSublist, objParameters){
		var DEBUG_IDENTIFIER = 'populateSublistData';
		 log.debug(DEBUG_IDENTIFIER,'--START--');
		try
		{
			var arrFilteredResults = [];
					
			var stTranDateFrom = !common.isNullOrEmpty(objParameters['parameter_tran_date_from']) ? objParameters['parameter_tran_date_from'] : '';
			var stTranDateTo = !common.isNullOrEmpty(objParameters['parameter_tran_date_to']) ? objParameters['parameter_tran_date_to'] : '';
			var stCustomer = !common.isNullOrEmpty(objParameters['parameter_customer']) ? objParameters['parameter_customer'] : -1;
			var stAction = !common.isNullOrEmpty(objParameters['parameter_contact_action']) ? objParameters['parameter_contact_action'] : -1;
			var stAlreadEmailed = !common.isNullOrEmpty(objParameters['parameter_already_emailed']) ? objParameters['parameter_already_emailed'] : -1;
			var stRoute = !common.isNullOrEmpty(objParameters['parameter_route']) ? objParameters['parameter_route'] : -1;
		
			var tranSearchId = common.getScriptParameter('custscript_itr_tran_search_id');		
			
			var stCurrentPage = objParameters['parameter_currentpage'];
		    var stPageStart = objParameters['parameter_pagestart'];
		    var stRowsPerPage = objParameters['parameter_perpage'];	 
		    var stSelectedInvoice = objParameters['parameter_selected_lines'];
		    var arrSelected = [];
				arrSelected = JSON.parse(stSelectedInvoice);
			
			
			var searchFilters = [];
			var outsFilters = [];
			var recType = '';
		    if(!common.isNullOrEmpty(stAction) && stAction != -1){
		    	switch (stAction) {
		    		case '1' 	: 
		    			recType = 'CustInvc';
		    		break;		    		
		    		case '2'	:
		    			recType = 'CustCred';
		    	    break;
		    		case '3'	:
		    			recType = 'RtnAuth';
		    	    break;
		    	    
		    			    		    		
		    	}
				var type = search.createFilter({
		    	    name: 'type',
		    	    operator: search.Operator.ANYOF,
		    	    values: recType
	            	});
				
				searchFilters.push(type);				
			} 
		    if(!common.isNullOrEmpty(stCustomer) && stCustomer != -1){		    	
		    	var customer = search.createFilter({
		    	    name: 'entity',		    	   
		    	    operator: search.Operator.ANYOF,
		    	    values: stCustomer,
	            	});
			
		    	searchFilters.push(customer);			    	
	        }			    		    
		    if(!common.isNullOrEmpty(stRoute) && stRoute != -1){
				var route = search.createFilter({
		    	    name: 'custbody_ifd_so_route_number',		    	  
		    	    operator: search.Operator.ANYOF,
		    	    values: stRoute
	            	});
				
				searchFilters.push(route);				
			} 		 
		    if(!common.isNullOrEmpty(stAlreadEmailed) && stAlreadEmailed != -1){
		    	switch (stAlreadEmailed){
		    	case '1' :
		    		var alreadyEmailed = search.createFilter({
			    	    name: 'subject',		
			    	    join:'messages',
			    	    operator: search.Operator.ISNOTEMPTY,			    	   
		            	});
		    		search.createFilter({
			    	    name: 'messagetype',		
			    	    join:'messages',
			    	    operator: search.Operator.ISNOTEMPTY,			    	   
		            	});
		    		break;
		    	
		    	case '2' :
		    		var alreadyEmailed = search.createFilter({
			    	    name: 'subject',		
			    	    join:'messages',
			    	    operator: search.Operator.ISEMPTY,
			    	   
		            	});
		    		break;
		    		
		    	}
				searchFilters.push(alreadyEmailed);				
			} 
		    
		    if(!common.isNullOrEmpty(stTranDateFrom)){
				var dateFrom = search.createFilter({
		    	    name: 'trandate',
		    	    operator: search.Operator.ONORAFTER,
		    	    values: stTranDateFrom,
	            	});
				
				searchFilters.push(dateFrom);
				
			} 
		    
		    if(!common.isNullOrEmpty(stTranDateTo)){
				var dateTo = search.createFilter({
		    	    name: 'trandate',
		    	    operator: search.Operator.ONORBEFORE,
		    	    values: stTranDateTo,
	            	});
				
				searchFilters.push(dateTo);
				
			} 

		  
		    arrSearchResults = common.searchRecords(null,tranSearchId,searchFilters);
		    	log.debug(DEBUG_IDENTIFIER,'Search Results: ' + arrSearchResults.length);
		    	  var objSearchResults =   	common.removeDuplicatesArrofObjects(arrSearchResults,'id'); //Remove duplicates as the searchresults is duplicating because of the Messages columns
		    	  log.debug(DEBUG_IDENTIFIER,'Unique Search Results: ' + objSearchResults.length);
		    	  var arrAllLines = [];
		    for(var i in objSearchResults){
		    	var recType =  objSearchResults[i].getText('type').toLowerCase().replace(/ /g, "");
		    	var type = '';
		    	if(recType == 'invoice'){
		    		type='inv';
		    	}
		    	if(recType == 'creditmemo'){
		    		type='cm';
		    	}
		    	if(recType == 'returnauthorization'){
		    		type='ra';
		    	}
		    
		    	var map = {
		    			id 	: objSearchResults[i].getValue('internalid'),//internalid
		    			t	: type, //Record Type		    			
		    			
		    		}
		    	arrAllLines.push(map);
		    }

		    objForm.addSubmitButton({
		        id : 'custpage_submit',
		        label : 'Send Email'
		      });
		    var objPageNav = objForm.addField({
		    	id: 'custpage_pagenav', 
		    	type: 'select', 
		    	label: 'Go To Page: ',
		    	container: 'custpage_item_lines'
		    	});
			objPageNav.defaultValue = objParameters['parameter_pagenav'];
			
			var intNumOfPages = createPageNavOptions(objPageNav, objParameters, objSearchResults);
			if(common.isNullOrEmpty(stPageStart)){
				stPageStart = '1';
			}
			
			var stResultCount = !common.isNullOrEmpty(objSearchResults) ? objSearchResults.length : 0;
		    stCurrentPage = common.forceInt(stPageStart) / common.forceInt(stRowsPerPage);
			stCurrentPage = Math.ceil(stCurrentPage);
			var stNextPage = stCurrentPage + 1;
			var stPreviousPage = stCurrentPage - 1;
			var intNext = common.forceInt(stPageStart) + common.forceInt(stRowsPerPage);
			var intPrevious = common.forceInt(stPageStart) - common.forceInt(stRowsPerPage);
			// get current page's result		
			var arrTransactions = objSearchResults.slice(common.forceInt(stPageStart) - common.forceInt(1), common.forceInt(intNext) - common.forceInt(1));
			
			
			// add previous and next buttons
			objItemSublist.addButton({
				id:'custpage_markall', 
				label: 'Mark All', 
				functionName:'btnMarkUnMarkAll(\'custpage_items_sublist\', \'custpage_select\', \'true\')' //add mark all button
			});
		    objItemSublist.addButton({
		    	id:'custpage_unmarkall', 
		    	label:'Unmark All', 
		    	functionName: 'btnMarkUnMarkAll(\'custpage_items_sublist\', \'custpage_select\', \'false\')' //add unmark all button	    
		    });
			
			var previousBtn = objItemSublist.addButton({
				id: 'custpage_previous_btn',
				label: '<< Previous', 
				functionName: "goToPage('"+ stPreviousPage +"','"+ intPrevious +"')"
				});
			log.debug(DEBUG_IDENTIFIER,'stNextPage: ' + stNextPage + ' intNext:' + intNext);
			var nextBtn = objItemSublist.addButton({
				id:'custpage_next_btn', 
				label:'Next >>', 
				functionName: "goToPage('"+ stNextPage +"', '" + intNext + "')"
				});
			// disable the buttons if necessary (if the user is on the first/last page)
			previousBtn.isDisabled = common.forceInt(intPrevious)  < common.forceInt(1) ? true : false;
			nextBtn.isDisabled = common.forceInt(intNext) > common.forceInt(stResultCount) ? true : false;
			
			var currentPageField = 	objForm.addField({
		    	id: 'custpage_current_page', 
		    	type: 'text', 
		    	label: 'Current Page',
				}).updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });
			
			currentPageField.defaultValue = stCurrentPage;

			var pageStartField = objForm.addField({
		    	id: 'custpage_page_start', 
		    	type: 'text', 
		    	label: 'Page Page',
				}).updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });
			pageStartField.defaultValue=stPageStart;	
			
			var stPageNavTxt = objItemSublist.label + ' of '+ intNumOfPages;	
			log.debug(DEBUG_IDENTIFIER,'stPageNavTxt: ' + stPageNavTxt);
				objItemSublist.label = stPageNavTxt; //setlabel of the Sublist
				var arrMap = [];
			if(!common.isNullOrEmpty(arrTransactions)) {
				 var objAllLines = objForm.addField({
				    	id: 'custpage_all_lines', 
				    	type: 'longtext', 
				    	label: 'All Lines'
				    });
				 objAllLines.updateDisplayType({
				        displayType : serverWidget.FieldDisplayType.HIDDEN
				      }); 
				try{   
				 objAllLines.defaultValue = JSON.stringify(arrAllLines);
				}catch(err){
					var errorStr = 'Type: ' + err.type + ' | ' +
					'Name: ' + err.name +' | ' +
					'Error Message: ' + err.message;
					log.debug('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
						+ errorStr);
				}
				
				
				for(var intLnCtr = 0; intLnCtr < arrTransactions.length; intLnCtr++) {
					var objItemSublistItem = {};
				
					var objCurRow = arrTransactions[intLnCtr];
				
							var internalId 		=	objCurRow.getValue({
													name: 'internalid',													
													});
							var salesRepTxt 	=	objCurRow.getText({
													name: 'salesrep',
													join: 'customer'													
													});
							var salesRepId 		= 	objCurRow.getValue({
													name: 'salesrep',
													join: 'customer'								
													});
							var customerId 		= objCurRow.getValue({
													name: 'custentity_ifd_external_id_view',//changed from entitynumber to accountnumber 9/16/2019
													join: 'customer',													
													});
							var customerTxt 	= objCurRow.getValue({
													name: 'companyname',//changed from altname to companyname 9/16/2019
													join: 'customer',													
												});
							if(!common.isNullOrEmpty(customerId) || customerId == '- None -'){
									customerId == objCurRow.getValue({
										name: 'accountnumber',
										join: 'customer',
										summary: 'GROUP',
									});
							}
							
							var tranDate 	= objCurRow.getValue({
													name: 'trandate',													
												});
							var tranId 		= objCurRow.getValue({
												name: 'tranid',												
											});
							var totalAmount = objCurRow.getValue({
												name: 'amount',												
											});
							var tranType = objCurRow.getText({
												name: 'type',												
											}).toLowerCase().replace(/ /g, "");

							var route = objCurRow.getText({
								name: 'custbody_ifd_so_route_number',								
								
							});
							var emailSubject = objCurRow.getValue({
								name: 'subject',	
								join: 'messages'
								
							});
							var messageType = objCurRow.getValue({
								name: 'messagetype',	
								join: 'messages'
								
							});
							var ALREADY_EMAILED = 'No';
							if(messageType == 'EMAIL' && !common.isNullOrEmpty(emailSubject)){
								ALREADY_EMAILED = 'Yes'
							}
							for(var c in arrSelected){
				    			if(arrSelected[c].id == internalId){
				    				objItemSublistItem['custpage_select'] = 'T';
				    			}
					
				    		}											
							objItemSublistItem['custpage_tran_date'] = tranDate;
							objItemSublistItem['custpage_tran_number'] = tranId;
							objItemSublistItem['custpage_cust_num'] = customerId;
							objItemSublistItem['custpage_customer_name'] = customerTxt;
							objItemSublistItem['custpage_tran_amount'] = totalAmount;
							objItemSublistItem['custpage_email_flag'] = ALREADY_EMAILED;
							objItemSublistItem['custpage_route_results'] = route;
							objItemSublistItem['custpage_internal_id'] = internalId;
							objItemSublistItem['custpage_record_type'] = tranType;
							objItemSublistItem['custpage_sales_rep'] = salesRepId;
							
						
	
				arrFilteredResults.push(objItemSublistItem); //add the current json object to the array collection
				
			
					var stCalRowLine = stCurrentPage * common.forceInt(stRowsPerPage);
					if((stCalRowLine - 1) == intLnCtr)
					{
						break;
					}
				}
			}
			
			objItemSublist = appendSublistData(objItemSublist, objItemSublistItem, arrFilteredResults);
			return objItemSublist;
		}
		catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    		
	    }
	}

    function appendSublistData(objItemSublist, objItemSublistItem, arrFilteredResults){
		var DEBUG_IDENTIFIER = 'appendSublistData';
		log.debug(DEBUG_IDENTIFIER,'--START--');
		try
		{
			if(!common.isNullOrEmpty(arrFilteredResults)) {
				//log.debug(DEBUG_IDENTIFIER,'arrFilteredResults: ' + JSON.stringify(arrFilteredResults));
				
				for(var i = 0; i < arrFilteredResults.length  ; i++){
					
					objItemSublist.setSublistValue({
						id: 'custpage_select', 
						line: i,
						value: arrFilteredResults[i].custpage_select  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_tran_date', 
						line: i,
						value: arrFilteredResults[i].custpage_tran_date  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_tran_number', 
						line: i,
						value: arrFilteredResults[i].custpage_tran_number  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_cust_num', 
						line: i,
						value: arrFilteredResults[i].custpage_cust_num  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_customer_name', 
						line: i,
						value: arrFilteredResults[i].custpage_customer_name  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_tran_amount', 
						line: i,
						value: arrFilteredResults[i].custpage_tran_amount  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_email_flag', 
						line: i,
						value: arrFilteredResults[i].custpage_email_flag  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_route_results', 
						line: i,
						value: arrFilteredResults[i].custpage_route_results  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_internal_id', 
						line: i,
						value: arrFilteredResults[i].custpage_internal_id  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_record_type', 
						line: i,
						value: arrFilteredResults[i].custpage_record_type  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_sales_rep', 
						line: i,
						value: arrFilteredResults[i].custpage_sales_rep || null					
					});
					
				}
			}
			 
			log.debug(DEBUG_IDENTIFIER,'--END--');
			return objItemSublistItem;
		
		}
		catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    		
	    }
    }
    
    
    
    function confirmationPage(request,stMapReduceScriptId,stMRDeploymentID)
	{
		var DEBUG_IDENTIFIER = 'confirmationPage';
		log.debug(DEBUG_IDENTIFIER,'--START--');
		try{

		// Create confirmation page
		
		var objForm = serverWidget.createForm({
			 title: 'Mass Emailing Transactions',
			hideNavBar: false
	      });
		

		 var objConfirmField = objForm.addField({
		        id: 'custpage_end_page',
		        type: 'inlinehtml',
		        label: 'Confirmation Page'
		      });

		var scriptId = runtime.getCurrentScript().id;
    	var deploymentId = runtime.getCurrentScript().deploymentId;
    	
    	var stSuiteLetURL = url.resolveScript({
    	    scriptId: scriptId,
    	    deploymentId: deploymentId,
    	   
    	});
    	var statusUrl = url.resolveTaskLink({
    	    id: 'LIST_MAPREDUCESCRIPTSTATUS',
    	    params: {
    	    	'scripttype':stMapReduceScriptId,
    	    	'primarykey':stMRDeploymentID,//stMapReduceScriptDeployment
    	    	
    	    }
    	   
    	});
    	
		var arrConfirmPage = [];
	
		arrConfirmPage.push('The selected lines are being processed. Click <a style="font-weight:bold" href=\'' + statusUrl + '\'  target="_blank">here</a> to navigate on Map/Reduce Script status page.');
		arrConfirmPage.push('<hr style="font-size:3";>');
		arrConfirmPage.push('<h1>Click the BACK button to return on Mass Emailing Transactions Page.</h1>');
				
		
		var confirmPage = arrConfirmPage.join('</br>');
		log.debug(DEBUG_IDENTIFIER,'arrConfirmPage: ' + confirmPage);

		var stConfirmation = '<div width="100%" class="uir-alert-box confirmation session_confirmation_alert" style=""><div class="icon confirmation"><img alt="" src="/images/icons/messagebox/icon_msgbox_confirmation.png"></div><div class="content"><div class="title">Confirmation</div><div class="descr">'+confirmPage+'</div></div></div>';

		objConfirmField.defaultValue = stConfirmation;
		objForm.addButton({
			id : 'custpage_back_button',
	        label : 'Back',
	        functionName: 'window.location.assign(\''+stSuiteLetURL+'\')'
	        	
	      
			});	

		return objForm;
	}
		
		catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
			log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
			
	    	}
	}
    
    function formatDate(dateVal) {
    	var DEBUG_IDENTIFIER = 'formatDate';
	    var newDate = new Date(dateVal);
	    log.debug(DEBUG_IDENTIFIER,'New Date: ' + newDate);
	    var sMonth = padValue(newDate.getMonth() + 1);
	    var sDay = padValue(newDate.getDate());
	    var sYear = newDate.getFullYear();
	    var sHour = newDate.getHours();
	    var sMinute = padValue(newDate.getMinutes());
	    var sAMPM = "AM";
	    log.debug(DEBUG_IDENTIFIER,'newDate: ' + newDate);
	    var iHourCheck = parseInt(sHour);

	    if (iHourCheck > 12) {
	        sAMPM = "PM";
	        sHour = iHourCheck - 12;
	    }
	    else if (iHourCheck === 0) {
	        sHour = "12";
	    }

	    sHour = padValue(sHour);

	    return sMonth + "-" + sDay + "-" + sYear + " " + sHour + ":" + sMinute + " " + sAMPM;
	}
	function padValue(value) {
	    return (value < 10) ? "0" + value : value;
	}
    
    return {
        onRequest: onRequest
    };
    
});