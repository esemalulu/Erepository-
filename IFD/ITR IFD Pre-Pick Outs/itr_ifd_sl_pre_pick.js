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
 * 	1.00       Aug 08 2019      Raffy Gaspay    Initial version.Suitelet for Pre-pick
 *  2.0        Sept 19 2019     Raffy Gaspay    Added the Export to CSV Functionality
 *  3.0        Oct 15 2019      Raffy Gaspay	Added new customer filters.
 * 
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
			var NUMBEROFROWS = common.getScriptParameter('custscript_itr_ifd_numberofrows');
			var outsFolderId = common.getScriptParameter('custscript_itr_ifd_outs_folder_id');
			log.debug(DEBUG_IDENTIFIER, 'Action: '+ request.parameters.custpage_action);
			var objParameters = {};
	    		objParameters['parameter_action'] = request.parameters.custpage_action; 
	    		objParameters['parameter_sales_rep'] = request.parameters.custpage_sales_rep || -1; 
	    		objParameters['parameter_item'] = request.parameters.custpage_item || -1; 
	    		objParameters['parameter_preferred_vendor'] = request.parameters.custpage_preferred_vendor || -1; 
	    		objParameters['parameter_buyer'] = request.parameters.custpage_buyer || -1; 
	    		objParameters['parameter_customer'] = request.parameters.custpage_customer || -1;    		
	    		objParameters['parameter_cust_category'] =request.parameters.custpage_cust_category || -1; 
	    		objParameters['parameter_ship_date_from'] = !common.isNullOrEmpty(request.parameters.custpage_ship_date_from) ? request.parameters.custpage_ship_date_from : ''; 
	    		objParameters['parameter_ship_date_to'] = !common.isNullOrEmpty(request.parameters.custpage_ship_date_to) ? request.parameters.custpage_ship_date_to : ''; 
	    		//Additional Filters for Phase 3
	    		objParameters['parameter_chain_name'] = request.parameters.custpage_chain_name || -1;
	    		objParameters['parameter_customer_list'] = !common.isNullOrEmpty(request.parameters.custpage_customer_list) ? request.parameters.custpage_customer_list : ''; 
	    		
	    		objParameters['parameter_currentpage'] = request.parameters.custpage_current_page || 1; 
	    		objParameters['parameter_pagestart'] = request.parameters.custpage_page_start || 1;
	    			    		
	    		//objParameters['parameter_selected_items'] = request.parameters.custpage_selected_items; //get the selected sales order json
	    		objParameters['parameter_perpage'] = NUMBEROFROWS;
	    		objParameters['parameter_pagenav'] = objParameters['parameter_currentpage'];
	    		objParameters['parameter_initial_state'] = request.parameters.custpage_initial_state || 'F';
	    		
	    		objParameters['parameter_export_to_csv'] = request.parameters.custpage_export_to_csv || '';
    		switch(objParameters['parameter_action']){  

			case 'search':

			default:
				//create the suitelet
				var prePickOuts = createForm(response, objParameters); 
			
			if(objParameters['parameter_export_to_csv'] == 'export'){			
				
				prePickOuts.save();
				
				var fileUrl = url.resolveTaskLink('LIST_MEDIAITEMFOLDER',{'folder':outsFolderId} );
				var form = confirmationPage(request,fileUrl);
				response.writePage(form);
				break;
			}
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
    	
    	
    function createForm(response,objParameters){
    	var DEBUG_IDENTIFIER = 'createForm';	
		try{
			log.debug(DEBUG_IDENTIFIER, '--START--');
			var CLIENTSCRIPTID = common.getScriptParameter('custscript_itr_client_script'); 
			
    	
			 //create suitelet form
			var objForm = serverWidget.createForm({
				 title: 'Pre-Pick OUTS Report',//TODO to be changed remove BETA
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

			   var objSalesRep = objForm.addField({
		    		id: 'custpage_sales_rep', 
		    		type: 'select', 
		    		label:'Sales Rep', 
		    		source: 'employee',
		    		container: 'custpage_search_criteria'
		    	}); 
			   objSalesRep.defaultValue = objParameters['parameter_sales_rep'];
			   
			   var objItem = objForm.addField({
		    		id: 'custpage_item', 
		    		type: 'select', 
		    		label:'Item', 
		    		source: 'item',
		    		container: 'custpage_search_criteria'
		    	}); 
			   objItem.defaultValue = objParameters['parameter_item'];
			   
			   var objVendor = objForm.addField({
		    		id: 'custpage_preferred_vendor', 
		    		type: 'select', 
		    		label:'Preferred Vendor', 
		    		source: 'vendor',
		    		container: 'custpage_search_criteria'
		    	}); 
			   objVendor.defaultValue = objParameters['parameter_preferred_vendor'];
			   
			   var objBuyer = objForm.addField({
		    		id: 'custpage_buyer', 
		    		type: 'select', 
		    		label:'Buyer', 
		    		source: 'employee',
		    		container: 'custpage_search_criteria'
		    	}); 
			   objBuyer.defaultValue = objParameters['parameter_buyer'];
			   
			
			   var objCustCat = objForm.addField({
		    		id: 'custpage_cust_category', 
		    		type: 'select', 
		    		label:'Customer Category', 
		    		source: 'customercategory',
		    		container: 'custpage_search_criteria'
		    	}); 
			   objCustCat.defaultValue = objParameters['parameter_cust_category'];
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
			   var tomorrow = new Date();
			   tomorrow.setDate(today.getDate()+1);
			   var objShipFrom = objForm.addField({
		    		id: 'custpage_ship_date_from', 
		    		type: 'date', 
		    		label:'Ship Date From', 
		    		container: 'custpage_search_criteria'
		    	}); 
			   
			   
			   var objShipTo = objForm.addField({
		    		id: 'custpage_ship_date_to', 
		    		type: 'date', 
		    		label:'Ship Date To', 
		    		container: 'custpage_search_criteria'
		    	}); 
			   var objChainName = objForm.addField({
		    		id: 'custpage_chain_name', 
		    		type: 'select', 
		    		source:'customlist_ifd_customer_chain_name',
		    		label:'Chain Name', 
		    		container: 'custpage_search_criteria'
		    	});
			   objChainName.defaultValue = objParameters['parameter_chain_name'];
			   var objCustomer = objForm.addField({
		    		id: 'custpage_customer', 
		    		type: 'select', 
		    		label:'Customer', 
		    		source: 'customer',
		    		container: 'custpage_search_criteria'
		    	}); 
			   objCustomer.defaultValue = objParameters['parameter_customer'];
			   var objCustList = objForm.addField({
		    		id: 'custpage_customer_list', 
		    		type: 'text', 	    	
		    		label:'Customer List', 
		    		container: 'custpage_search_criteria'
		    	});
			   objCustList.defaultValue = objParameters['parameter_customer_list'];
			   var objExportToCSV = objForm.addField({
		    		id: 'custpage_export_to_csv', 
		    		type: 'text', 
		    		label:'Export To CSV', 
		    		container: 'custpage_search_criteria'
		    	}); 
			   objExportToCSV.defaultValue =objParameters['parameter_export_to_csv'];
			   objExportToCSV.updateDisplayType({
		        displayType : serverWidget.FieldDisplayType.HIDDEN
		      });
			   
			   if(objParameters['parameter_initial_state'] == 'F' ){
				   objShipFrom.defaultValue = tomorrow;
				   objShipTo.defaultValue = tomorrow;			    	
			    }else{			    	
			    	objShipFrom.defaultValue = objParameters['parameter_ship_date_from'];
					objShipTo.defaultValue = objParameters['parameter_ship_date_to'];
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
			   
			   if(objParameters['parameter_action'] != 'search'){
				   objItemSublist.displayType = serverWidget.SublistDisplayType.HIDDEN;
				   objNote.updateDisplayType({
				        displayType : serverWidget.FieldDisplayType.HIDDEN
				      });		       
			    }	
			   
			   var colBFCRead = objItemSublist.addField({
			    	id: 'custpage_bfc_read', 
			    	type: 'text', 
			    	label: 'BFC Read',
			    });
			   colBFCRead.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.INLINE
			      });		
				  			  
			   var colDSR = objItemSublist.addField({
			    	id: 'custpage_dsr', 
			    	type: 'text', 
			    	label: 'DSR',
			    });
			   
			   var colRoute = objItemSublist.addField({
			    	id: 'custpage_route', 
			    	type: 'text', 
			    	label: 'Route',
			    });
			   
			   var colStop = objItemSublist.addField({
			    	id: 'custpage_stop', 
			    	type: 'text', 
			    	label: 'Stop',
			    });
			   						   
			   var colCustNum = objItemSublist.addField({
			    	id: 'custpage_cust_num', 
			    	type: 'text', 
			    	label: 'Cust#',
			    });
				  			   
			   var colCustomer = objItemSublist.addField({
			    	id: 'custpage_customer', 
			    	type: 'text', 
			    	label: 'Customer',
			    });	
			   var colCustCategory = objItemSublist.addField({
			    	id: 'custpage_customer_category', 
			    	type: 'text', 
			    	label: 'Customer Category',
			    });
			   colCustCategory.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });	
			   var colItemId = objItemSublist.addField({
			    	id: 'custpage_item_id', 
			    	type: 'text', 
			    	label: 'Item',
			    });			  				   
			   
			   var colDescription = objItemSublist.addField({
			    	id: 'custpage_item_disp_name', 
			    	type: 'text', 
			    	label: 'Description',
			    });
  
			   var colPackSize = objItemSublist.addField({
			    	id: 'custpage_pack_size', 
			    	type: 'text', 
			    	label: 'Pack Size',
			    });
			   
			   var colSOqty = objItemSublist.addField({
			    	id: 'custpage_so_quantity', 
			    	type: 'text', 
			    	label: 'SO Quantity',
			    });
			   
			   var colTotal = objItemSublist.addField({
			    	id: 'custpage_total_nxt_day_ship', 
			    	type: 'text', 
			    	label: 'Total Ordered',//changed from Total To be Shipped to Total Ordered 9/16/2019
			    });
			   
			   var colCommitted = objItemSublist.addField({
			    	id: 'custpage_committed', 
			    	type: 'text', 
			    	label: 'Committed',
			    });
			   
			   var colOuts = objItemSublist.addField({
			    	id: 'custpage_outs', 
			    	type: 'text', 
			    	label: 'Outs',
			    });

			   var colQtyEauClaire = objItemSublist.addField({
			    	id: 'custpage_qty_main_eau_claire', 
			    	type: 'text', 
			    	label: 'Quantity on Hand: Main-Eau Claire',
			    });
			   
			   var colQtyCentral = objItemSublist.addField({
			    	id: 'custpage_qty_central', 
			    	type: 'text', 
			    	label: 'Quantity on Hand: Central Storage',
			    });
			   
			   var colQtyOnOrder = objItemSublist.addField({
			    	id: 'custpage_qty_on_order', 
			    	type: 'text', 
			    	label: 'Quantity on Purchase Order',
			    });
			   
			   var colPODetails = objItemSublist.addField({
			    	id: 'custpage_po_details', 
			    	type: 'textarea', 
			    	label: 'Expected Arrival Date/Qty Ordered /Scheduled Rec DateTime',
			    });
			   
			   var colSub = objItemSublist.addField({
			    	id: 'custpage_sub_num', 
			    	type: 'text', 
			    	//source: 'item', 
			    	label: 'Sub#',
			    });
			   colSub.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.INLINE
			      });	
			   var colSalesOrder = objItemSublist.addField({
			    	id: 'custpage_sales_order_num', 
			    	type: 'textarea', 
			    	label: 'Sales Order#',
			    });
			   
			   var colPreferredVendor = objItemSublist.addField({
			    	id: 'custpage_vendor', 
			    	type: 'text', 
			    	
			    	label: 'Vendor',
			    });
			   
			   var colISR = objItemSublist.addField({
			    	id: 'custpage_reviewed', 
			    	type: 'text', 
			    	label: 'ISR Reviewed',
			    });
			   
			   colISR.updateDisplayType({
			        displayType : serverWidget.FieldDisplayType.HIDDEN
			      });	
			   
			   var colbuyer = objItemSublist.addField({
			    	id: 'custpage_buyer', 
			    	type: 'text', 			    	
			    	label: 'Buyer',
			    });
			   
			   
			   
			   /*if(objParameters['parameter_action'] == 'search'){
			    	objItemSublist = populateSublistData(objForm, objItemSublist, objParameters); //supply the sublist with data lines
			    }*/
			   
			   if(objParameters['parameter_action'] == 'search'|| objParameters['parameter_action'] == 'process'){
			    	var prePickOuts = populateSublistData(objForm, objItemSublist, objParameters); //supply the sublist with data lines
			    }
			   
			    response.writePage(objForm);
			    return prePickOuts;
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
			var stSalesRep = !common.isNullOrEmpty(objParameters['parameter_sales_rep']) ? objParameters['parameter_sales_rep'] : -1;
			var stItem = !common.isNullOrEmpty(objParameters['parameter_item']) ? objParameters['parameter_item'] : -1;
			var stPreferredVend = !common.isNullOrEmpty(objParameters['parameter_preferred_vendor']) ? objParameters['parameter_preferred_vendor'] : -1;
			var stBuyer = !common.isNullOrEmpty(objParameters['parameter_buyer']) ? objParameters['parameter_buyer'] : -1;
			var stCustomer = !common.isNullOrEmpty(objParameters['parameter_customer']) ? objParameters['parameter_customer'] : -1;
			var stCustCategory = !common.isNullOrEmpty(objParameters['parameter_cust_category']) ? objParameters['parameter_cust_category'] : -1;
			var stShipDateFrom = !common.isNullOrEmpty(objParameters['parameter_ship_date_from']) ? objParameters['parameter_ship_date_from'] : '';
			var stShipDateTo = !common.isNullOrEmpty(objParameters['parameter_ship_date_to']) ? objParameters['parameter_ship_date_to'] : '';
			
			var stChainName = !common.isNullOrEmpty(objParameters['parameter_chain_name']) ? objParameters['parameter_chain_name'] : -1;
			var stCustomerList = !common.isNullOrEmpty(objParameters['parameter_customer_list']) ? objParameters['parameter_customer_list'] : -1;
			
			var OutsSearchId = common.getScriptParameter('custscript_itr_outs_item_search');
			var SOsearchId = common.getScriptParameter('custscript_itr_ifd_so_search');
			var POsearchId = common.getScriptParameter('custscript_itr_ifd_po_search');
			var subItemSearchId = common.getScriptParameter('custscript_itr_item_sub_search');
			
			var customerSearch = common.getScriptParameter('custscript_itr_ifd_cust_search');
			
			var stCurrentPage = objParameters['parameter_currentpage'];
		    var stPageStart = objParameters['parameter_pagestart'];
		    var stRowsPerPage = objParameters['parameter_perpage'];	 	
			
			var searchFilters = [];
			var outsFilters = [];
		    if(!common.isNullOrEmpty(stSalesRep) && stSalesRep != -1){
				var salesRep = search.createFilter({
		    	    name: 'salesrep',
		    	    operator: search.Operator.ANYOF,
		    	    values: stSalesRep
	            	});
				
				searchFilters.push(salesRep);
				
			} 
		    if(!common.isNullOrEmpty(stPreferredVend) && stPreferredVend != -1){		    	
		    	var prefVendor = search.createFilter({
		    	    name: 'vendor',
		    	    join: 'item',
		    	    operator: search.Operator.ANYOF,
		    	    values: stPreferredVend,
	            	});
			
		    	outsFilters.push(prefVendor);			    	
	        }	
		    		    
		    if(!common.isNullOrEmpty(stBuyer) && stBuyer != -1){
				var buyer = search.createFilter({
		    	    name: 'custitem_ifd_buyer',
		    	    join: 'item',
		    	    operator: search.Operator.ANYOF,
		    	    values: stBuyer
	            	});
				
				searchFilters.push(buyer);
				
			} 
		   //Chain Name filter
		    if(!common.isNullOrEmpty(stChainName) && stChainName != -1){
				var chainName = search.createFilter({
		    	    name: 'custentityifd_chain_name',		
		    	    join:'customer',
		    	    operator: search.Operator.ANYOF,
		    	    values: stChainName,
	            	});
				
				searchFilters.push(chainName);
				
			} 
		    log.debug(DEBUG_IDENTIFIER,'Customer List: ' + stCustomerList);
		    log.debug(DEBUG_IDENTIFIER,'Chain Name: ' + stChainName);
		    log.debug(DEBUG_IDENTIFIER,'Customer: ' + stCustomer);
		   //Customer List Filter
		    if(!common.isNullOrEmpty(stCustomerList) && stCustomerList != -1){
		    	var arrCustomer = stCustomerList.split(',');
		    	
		    	log.debug(DEBUG_IDENTIFIER,'arrCustomer: ' + arrCustomer);
		    	var custFilters = [];
		    	var arrCustId = [];
		    	if(!common.isNullOrEmpty(arrCustomer)){
		    		for(var x in arrCustomer){		    			
						custFilters.push(['custentity_ifd_external_id_view','is',arrCustomer[x]]);
						if(parseInt(arrCustomer.length) - 1 != x){
							custFilters.push('OR');
						}						
		    		}
		    		if((!common.isNullOrEmpty(stCustomer) && stCustomer != -1)){
						custFilters.push('OR');
						custFilters.push(['internalid','anyof',stCustomer]);
			    	}
					log.debug(DEBUG_IDENTIFIER,'custFilters: ' + JSON.stringify(custFilters));
					
					var customerResults = common.searchRecFilExp(null,customerSearch,custFilters);
					if(!common.isNullOrEmpty(customerResults)){
						for(var c in customerResults){
							arrCustId.push(customerResults[c].getValue({
								name:'internalid'
							}));
						}
					}								
			    	var customer1 = search.createFilter({
			    	    name: 'entity',			    	  
			    	    operator: search.Operator.ANYOF,
			    	    values: arrCustId,
		            	});				
					searchFilters.push(customer1);
		    	}
	
		    }
		    
		    //Customer Filter
		    if((!common.isNullOrEmpty(stCustomer) && stCustomer != -1) && 
		    		(stCustomerList == -1) ) {
				var customer = search.createFilter({
		    	    name: 'entity',		    	   
		    	    operator: search.Operator.ANYOF,
		    	    values: stCustomer,
	            	});				
				searchFilters.push(customer);			
			} 
		    if(!common.isNullOrEmpty(stCustCategory) && stCustCategory != -1){
				var category = search.createFilter({
		    	    name: 'category',
		    	    join: 'customer',
		    	    operator: search.Operator.ANYOF,
		    	    values: stCustCategory,
	            	});
				
				searchFilters.push(category);
				
			} 
		    if(!common.isNullOrEmpty(stItem) && stItem != -1){		    	
			    	var item = search.createFilter({
			    	    name: 'item',
			    	    operator: search.Operator.ANYOF,
			    	    values: stItem,
		            	});
				
			    	outsFilters.push(item);			    	
		    }		    
		    if(!common.isNullOrEmpty(stShipDateFrom)){
				var shipDateFrom = search.createFilter({
		    	    name: 'shipdate',
		    	    operator: search.Operator.ONORAFTER,
		    	    values: stShipDateFrom,
	            	});
				
				searchFilters.push(shipDateFrom);
				outsFilters.push(shipDateFrom);
			} 
		    
		    if(!common.isNullOrEmpty(stShipDateTo)){
				var shipDateTo = search.createFilter({
		    	    name: 'shipdate',
		    	    operator: search.Operator.ONORBEFORE,
		    	    values: stShipDateTo,
	            	});
				
				searchFilters.push(shipDateTo);
				outsFilters.push(shipDateTo);
			} 
		    log.debug(DEBUG_IDENTIFIER,'Searching OUTS..');
		    var outsItemSearchResults = common.searchRecords(null,OutsSearchId,outsFilters);
		    if(common.isNullOrEmpty(outsItemSearchResults)){
		    	log.debug(DEBUG_IDENTIFIER,'Outs Item Saved Search is empty!');
		    	return;
		    }
		    var arrItemIds = [];
		    var arrMapOutsItem = [];
		    var arrSubItem = [];
		    //log.debug(DEBUG_IDENTIFIER,'outsItemSearchResults: ' + JSON.stringify(outsItemSearchResults));
		    for(var ctr in outsItemSearchResults){
		    	
		    	var columns = outsItemSearchResults[ctr].columns;
		    	var itemId = outsItemSearchResults[ctr].getValue(columns[0]);
		    	var itemName = outsItemSearchResults[ctr].getValue(columns[1]);
		    	var cummSoQty = parseInt(outsItemSearchResults[ctr].getValue(columns[2]));
		    	var onHandQtyMEC = parseInt(outsItemSearchResults[ctr].getValue(columns[3]));
		    	var onHandQtyCSW = outsItemSearchResults[ctr].getValue(columns[4]);
		    	var outs = onHandQtyMEC - cummSoQty;
		    	//Additional Results column to get the pack size of the Sub#
		    	var subNum = outsItemSearchResults[ctr].getValue(columns[5]);
		    	
		    	if(cummSoQty > onHandQtyMEC){
		    		var obj = {
			    			itemid   		: itemId,
			    			itemname 		: itemName,
			    			outs			: outs,
			    			mainonhand		: onHandQtyMEC || 0,
			    			cummulativeqty 	: cummSoQty,
			    			centralonhand	: onHandQtyCSW	
			    	}
		    		arrItemIds.push(itemId);
		    		arrMapOutsItem.push(obj);
		    		//log.debug(DEBUG_IDENTIFIER,'Outs Item Details: ' + JSON.stringify(obj));
		    		if(!common.isNullOrEmpty(subNum) || subNum == '- None -'){
		    			arrSubItem.push(subNum);
		    		}
		    	}		    	
		    }
		    log.debug(DEBUG_IDENTIFIER,'arrItemIds: ' + JSON.stringify(arrItemIds));
		    log.debug(DEBUG_IDENTIFIER,'stItem: ' + JSON.stringify(stItem));
		    var itemPOFilter = [];
		    if(!common.isNullOrEmpty(stItem) && stItem != -1){
		    	if(arrItemIds.indexOf(stItem) >= 0 ){ //Check if the Item selected in the filter has outs quantity
			    	var item = search.createFilter({
			    	    name: 'item',
			    	    operator: search.Operator.ANYOF,
			    	    values: stItem,
		            	});
				
			    	searchFilters.push(item);
			    	itemPOFilter.push(item);
		    	}else{
		    		log.debug(DEBUG_IDENTIFIER,'Item Selected in the Criteria section has no outs');
		    		return;
		    	}
			}else{
				var item = search.createFilter({
		    	    name: 'item',
		    	    operator: search.Operator.ANYOF,
		    	    values: arrItemIds,
	            	});
				searchFilters.push(item);
				itemPOFilter.push(item);
			}
		    		   		    
		    log.debug(DEBUG_IDENTIFIER,'SO  searchFilters: ' + JSON.stringify(searchFilters));
		    var objSearchResults = common.searchRecords(null,SOsearchId,searchFilters);
		    var objResultsForCSV = objSearchResults;
		    if(common.isNullOrEmpty(objSearchResults)){
		    	log.debug(DEBUG_IDENTIFIER,'Sales Order Search is empty!');
		    	return;
		    }
		 //Execute Item/Sub# Search to look for Pack Size using the item internal ids ""
		   
		    var arrSubItemPackSize = [];
		   if(!common.isNullOrEmpty(arrSubItem)){
			   var subFilters = [];
			   var itemSub = search.createFilter({
		    	    name: 'internalid',
		    	    operator: search.Operator.ANYOF,
		    	    values: arrSubItem,
	            });
			   subFilters.push(itemSub);
			   log.debug(DEBUG_IDENTIFIER,'subFilters: ' + JSON.stringify(subFilters));
			   var objSearchResSubItem = common.searchRecords(null,subItemSearchId,subFilters);
			   
			   if(!common.isNullOrEmpty(objSearchResSubItem)){
				   for(var sub in objSearchResSubItem){
					   var results = objSearchResSubItem[sub]; 
					   var itemId = results.getValue({
							  name: 'itemid' 
					   });
					   var displayName = results.getValue({
							  name: 'displayname' 
					   });
					   var packSize = results.getValue({
							  name: 'custitem_ifd_field_packsize' 
					   });
					   var suggestNum = itemId + ' ' + displayName + ' ' + packSize;
					   var obj = {
							   internalid: results.getValue({
								  name: 'internalid' 
							   }),
							   suggestnumber : suggestNum							  
					   }
					   arrSubItemPackSize.push(obj);
				   }
			   }
			   log.debug(DEBUG_IDENTIFIER,'objSearchResSubItem: ' + JSON.stringify(objSearchResSubItem));
			   log.debug(DEBUG_IDENTIFIER,'arrSubItemPackSize: ' + JSON.stringify(arrSubItemPackSize));
		   }
		//Execute PO Search
		    var objPOresults = common.searchRecords(null,POsearchId,itemPOFilter);
		    var arrPOmapResults = [];
		    if(!common.isNullOrEmpty(objPOresults)){
		    	for(var po in objPOresults){
		    		var poResults = objPOresults[po];
		    		var map = {
		    				itemid 		: 	poResults.getValue({name: 'item', summary:'GROUP'}),
		    				internalid 	: 	poResults.getValue({name: 'internalid', summary:'GROUP'}),
		    				tranid 		: 	poResults.getValue({name: 'tranid', summary:'GROUP'}),
		    				poqty		:	poResults.getValue({name: 'quantity', summary:'SUM'}),
		    				expdate		:	poResults.getValue({name: 'duedate', summary:'GROUP'}),
		    				schdrcdate	:	poResults.getValue({name: 'custbody_ifd_scheduledrcvgappt', summary:'GROUP'}),
		    				recapptime	:	poResults.getValue({name: 'custbody_ifd_receivingapptime', summary:'GROUP'}),
		    				
		    		};
		    		arrPOmapResults.push(map);
		    	}		    	
		    }
		    objForm.addSubmitButton({
		        id : 'custpage_submit',
		        label : 'Export to CSV'
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
				
				
				for(var intLnCtr = 0; intLnCtr < arrTransactions.length; intLnCtr++) {
					var objItemSublistItem = {};
				
					var objCurRow = arrTransactions[intLnCtr];
					//log.debug(DEBUG_IDENTIFIER,'Rows: ' + JSON.stringify(objCurRow));
							var bfcRead 		=	(objCurRow.getValue({
												name: 'custbody_ifd_bfc_read',
												summary: 'GROUP',
												}));
							var salesRepTxt 	=	objCurRow.getText({
													name: 'salesrep',
													summary: 'GROUP',
													});
							var salesRepId 		= 	objCurRow.getValue({
													name: 'salesrep',
													summary: 'GROUP',
												});
							var customerId 		= objCurRow.getValue({
													name: 'custentity_ifd_external_id_view',//changed from entitynumber to accountnumber 9/16/2019
													join: 'customer',
													summary: 'GROUP',
												});
							var customerTxt 	= objCurRow.getValue({
													name: 'companyname',//changed from altname to companyname 9/16/2019
													join: 'customer',
													summary: 'GROUP',
												});
							if(!common.isNullOrEmpty(customerId) || customerId == '- None -'){
									customerId == objCurRow.getValue({
										name: 'accountnumber',//changed from entitynumber to accountnumber 9/16/2019
										join: 'customer',
										summary: 'GROUP',
									});
							}
							//Added Quantity Committed 9/16/2019
							var commitedQty = 0;
							commitedQty = objCurRow.getValue({
												name: 'quantitycommitted',
												summary: 'MAX',
											});
							if(common.isNullOrEmpty(commitedQty)){
								commitedQty = 0;
							}
							var itemId 			= objCurRow.getValue({
												name: 'item',
												summary: 'GROUP',
												});
							var itemTxt 		= objCurRow.getText({
												name: 'item',
												summary: 'GROUP',
											});
							var packSize = objCurRow.getValue({
									name: 'custcol_ifd_packsize',
									summary: 'GROUP',
								});
							var	 soQty = objCurRow.getValue({
									name: 'quantity',
									summary: 'SUM',
								});					
							var	itemDisplayName= objCurRow.getValue({
									name: 'displayname',
									join: 'item',
									summary: 'GROUP',
								});				
							var soNum = objCurRow.getValue({
									name: 'tranid',						
									summary: 'GROUP',
								});
							var	 soInternalId = objCurRow.getValue({
									name: 'internalid',						
									summary: 'GROUP',
								});
							var	prefVendor = objCurRow.getText({
									name: 'vendor',	
									join: 'item',
									summary: 'GROUP',
								});
							var buyer = objCurRow.getText({
									name: 'custitem_ifd_buyer',	
									join: 'item',
									summary: 'GROUP',
								});
							var subNumId = objCurRow.getValue({
								name: 'custitem_ifd_suggested_sub',	
								join: 'item',
								summary: 'GROUP',
							});
							//Updated the value of the Suggest Num
							var suggestedSubNum = '';
							
							if(!common.isNullOrEmpty(subNumId)){
								for(var r in arrSubItemPackSize){
									var internalId = arrSubItemPackSize[r].internalid;								
									if(subNumId == internalId){
										suggestedSubNum = arrSubItemPackSize[r].suggestnumber;
										break;
									}
								}
							}
							var isrReviewed = (objCurRow.getValue({
								name: 'custbody_ifd_isr_so_reviewed',									
								summary: 'GROUP',
							}));
							
							var custCategory = objCurRow.getText({
								name: 'category',	
								join: 'customer',
								summary: 'GROUP',
							});
							
							var route = objCurRow.getText({
								name: 'custbody_ifd_so_route_number',								
								summary: 'GROUP',
							});
							var stop = objCurRow.getValue({
								name: 'custbody_ifd_stop',								
								summary: 'GROUP',
							});
						
						
							objItemSublistItem['custpage_bfc_read'] = bfcRead != true ? 'No':'Yes';
							objItemSublistItem['custpage_dsr'] = salesRepTxt == '- None -' ? '': salesRepTxt;
							objItemSublistItem['custpage_cust_num'] = customerId;
							objItemSublistItem['custpage_customer'] = customerTxt; 
							objItemSublistItem['custpage_item_id'] = itemTxt; 
							objItemSublistItem['custpage_item_disp_name'] = itemDisplayName	; 
							objItemSublistItem['custpage_pack_size'] = packSize; 
							objItemSublistItem['custpage_vendor'] = prefVendor == '- None -' ? '': prefVendor;
							objItemSublistItem['custpage_reviewed'] =  isrReviewed != true ? 'No':'Yes'; //TODO
							objItemSublistItem['custpage_buyer'] = buyer; 
							objItemSublistItem['custpage_so_quantity'] = soQty;
							objItemSublistItem['custpage_customer_category'] = custCategory == '- None -' ? '': custCategory;
							objItemSublistItem['custpage_committed'] = parseInt(commitedQty).toFixed(0);
							
							objItemSublistItem['custpage_route'] = route == '- None -' ? '': route;
							objItemSublistItem['custpage_stop'] = stop == '- None -' ? '': stop;
					
				var salesOrderNum = soNum;
				var	soUrl = url.resolveRecord({
						    recordType: 'salesorder',
						    recordId: soInternalId,
						    isEditMode: false,
						    });
				var href =   '<a href="' + soUrl + '"  target="_blank">'+salesOrderNum+'</a><br/>';
				var outs = 0;	
				var mainOnHandQty =0;
				var cswOnHandQty = 0;
				var cummulative = 0;
				for(var k in arrMapOutsItem){
					if(itemId == arrMapOutsItem[k].itemid){
						outs = arrMapOutsItem[k].outs;
						mainOnHandQty = arrMapOutsItem[k].mainonhand;
						cswOnHandQty = arrMapOutsItem[k].centralonhand;
						cummulative = arrMapOutsItem[k].cummulativeqty;
					}
				}										
				objItemSublistItem['custpage_total_nxt_day_ship'] = parseInt(cummulative).toFixed(0); 
				objItemSublistItem['custpage_outs'] = parseInt(outs).toFixed(0); 
				objItemSublistItem['custpage_qty_main_eau_claire'] = parseInt(mainOnHandQty).toFixed(0); 
				objItemSublistItem['custpage_qty_central'] = cswOnHandQty; 
				objItemSublistItem['custpage_sales_order_num'] = href; 								 
				objItemSublistItem['custpage_sub_num'] = suggestedSubNum; 
				var	poUrl = '';
				var poHrefTag = '';
				var hrefTag = '';
				var poDetailsTxt = '';
				var totalpoQty = 0;
				var poCSV = '';
				for(var q in arrPOmapResults){
					var poRes = arrPOmapResults[q];				
					var poItem = poRes.itemid ;				
					if(itemId == poItem){
						var poId 		= poRes.internalid;
						var poQty 		= poRes.poqty;
						var expDate 	= poRes.expdate;
						var schdRcvDate	= poRes.schdrcdate;
						var recAppTime	= poRes.recapptime;
						totalpoQty 		+= parseInt(poQty);
						poDetailsTxt = expDate + '-(' +poQty+ ')-' + schdRcvDate + ' ' + recAppTime;
						poUrl = url.resolveRecord({
						    recordType: 'purchaseorder',
						    recordId: poId,
						    isEditMode: false,
						    });
						hrefTag =    '<a href="' + poUrl + '"  target="_blank">'+poDetailsTxt+'</a><br/>';
						poHrefTag += hrefTag;
						
					}
				}
				objItemSublistItem['custpage_qty_on_order'] = parseInt(totalpoQty).toFixed(0);
				objItemSublistItem['custpage_po_details'] = poHrefTag;				
	
				arrFilteredResults.push(objItemSublistItem); //add the current json object to the array collection
				
			
					var stCalRowLine = stCurrentPage * common.forceInt(stRowsPerPage);
					if((stCalRowLine - 1) == intLnCtr)
					{
						break;
					}
				}
			}
			//For Export to CSV
			if(!common.isNullOrEmpty(objResultsForCSV)) {
				var prePickOuts = createCSVFile(objResultsForCSV,arrMapOutsItem,arrSubItemPackSize,arrPOmapResults)
				log.debug(DEBUG_IDENTIFIER,'PrePick OUTS CSV: ' + prePickOuts);
			}	 
		
			objItemSublist = appendSublistData(objItemSublist, objItemSublistItem, arrFilteredResults);
			return prePickOuts;
		}
		catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
    		log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    		
	    }
	}
    function createCSVFile(objResultsForCSV,arrMapOutsItem,arrSubItemPackSize,arrPOmapResults){	
    	try{
    		var DEBUG_IDENTIFIER = 'createCSVFile';
		var outsReport = 'BFC READ,DSR,ROUTE,STOP,CUST#,CUSTOMER,ITEM,DESCRIPTION,PACK SIZE,SO QUANTITY,TOTAL ORDERED,OUTS,COMMITTED,QUANTITY ON HAND: MAIN-EAU CLAIRE,QUANTITY ON HAND: CENTRAL STORAGE,QUANTITY ON PURCHASE ORDER,EXPECTED ARRIVAL DATE/QTY ORDERED/SCHEDULED REC DATETIME,SUB#,SALES ORDER#,VENDOR,BUYER\n';   
		var outsFolderId = common.getScriptParameter('custscript_itr_ifd_outs_folder_id');
		for(var intCSV = 0; intCSV < objResultsForCSV.length; intCSV++) {
			var objItemSublistItem = {};
		
			var objCurRow = objResultsForCSV[intCSV];
			
					var bfcRead 		=	(objCurRow.getValue({
										name: 'custbody_ifd_bfc_read',
										summary: 'GROUP',
										}));
					var salesRepTxt 	=	objCurRow.getText({
											name: 'salesrep',
											summary: 'GROUP',
											});
					var salesRepId 		= 	objCurRow.getValue({
											name: 'salesrep',
											summary: 'GROUP',
										});
					var customerId 		= objCurRow.getValue({
											name: 'custentity_ifd_external_id_view',//changed from entitynumber to accountnumber 9/16/2019
											join: 'customer',
											summary: 'GROUP',
										});
					var customerTxt 	= objCurRow.getValue({
											name: 'companyname',//changed from altname to companyname 9/16/2019
											join: 'customer',
											summary: 'GROUP',
										});
					if(!common.isNullOrEmpty(customerId) || customerId == '- None -'){
							customerId == objCurRow.getValue({
								name: 'accountnumber',//changed from entitynumber to accountnumber 9/16/2019
								join: 'customer',
								summary: 'GROUP',
							});
					}
					//Added Quantity Committed 9/16/2019
					var commitedQty = 0;
					commitedQty = objCurRow.getValue({
										name: 'quantitycommitted',
										summary: 'MAX',
									});
					if(common.isNullOrEmpty(commitedQty)){
						commitedQty = 0;
					}
					var itemId 			= objCurRow.getValue({
										name: 'item',
										summary: 'GROUP',
										});
					var itemTxt 		= objCurRow.getText({
										name: 'item',
										summary: 'GROUP',
									});
					var packSize = objCurRow.getValue({
							name: 'custcol_ifd_packsize',
							summary: 'GROUP',
						});
					var	 soQty = objCurRow.getValue({
							name: 'quantity',
							summary: 'SUM',
						});					
					var	itemDisplayName= objCurRow.getValue({
							name: 'displayname',
							join: 'item',
							summary: 'GROUP',
						});				
					var soNum = objCurRow.getValue({
							name: 'tranid',						
							summary: 'GROUP',
						});
					var	 soInternalId = objCurRow.getValue({
							name: 'internalid',						
							summary: 'GROUP',
						});
					var	prefVendor = objCurRow.getText({
							name: 'vendor',	
							join: 'item',
							summary: 'GROUP',
						});
					var buyer = objCurRow.getText({
							name: 'custitem_ifd_buyer',	
							join: 'item',
							summary: 'GROUP',
						});
					var subNumId = objCurRow.getValue({
						name: 'custitem_ifd_suggested_sub',	
						join: 'item',
						summary: 'GROUP',
					});
					//Updated the value of the Suggest Num
					var suggestedSubNum = '';
					
					if(!common.isNullOrEmpty(subNumId)){
						for(var r in arrSubItemPackSize){
							var internalId = arrSubItemPackSize[r].internalid;								
							if(subNumId == internalId){
								suggestedSubNum = arrSubItemPackSize[r].suggestnumber;
								break;
							}
						}
					}
					var isrReviewed = (objCurRow.getValue({
						name: 'custbody_ifd_isr_so_reviewed',									
						summary: 'GROUP',
					}));
					
					var custCategory = objCurRow.getText({
						name: 'category',	
						join: 'customer',
						summary: 'GROUP',
					});
					
					var route = objCurRow.getText({
						name: 'custbody_ifd_so_route_number',								
						summary: 'GROUP',
					});
					var stop = objCurRow.getValue({
						name: 'custbody_ifd_stop',								
						summary: 'GROUP',
					});
				
					objItemSublistItem['custpage_bfc_read'] = bfcRead != true ? 'No':'Yes';
					objItemSublistItem['custpage_dsr'] = salesRepTxt == '- None -' ? '': salesRepTxt;
					objItemSublistItem['custpage_cust_num'] = customerId;
					objItemSublistItem['custpage_customer'] = customerTxt; 
					objItemSublistItem['custpage_item_id'] = itemTxt; 
					objItemSublistItem['custpage_item_disp_name'] = itemDisplayName	; 
					objItemSublistItem['custpage_pack_size'] = packSize; 
					objItemSublistItem['custpage_vendor'] = prefVendor == '- None -' ? '': prefVendor;
					objItemSublistItem['custpage_reviewed'] =  isrReviewed != true ? 'No':'Yes'; //TODO
					objItemSublistItem['custpage_buyer'] = buyer; 
					objItemSublistItem['custpage_so_quantity'] = soQty;
					objItemSublistItem['custpage_customer_category'] = custCategory == '- None -' ? '': custCategory;
					objItemSublistItem['custpage_committed'] = parseInt(commitedQty).toFixed(0);
					
					objItemSublistItem['custpage_route'] = route == '- None -' ? '': route;
					objItemSublistItem['custpage_stop'] = stop == '- None -' ? '': stop;
		var salesOrderNum = soNum;	
		var outs = 0;	
		var mainOnHandQty =0;
		var cswOnHandQty = 0;
		var cummulative = 0;
		for(var k in arrMapOutsItem){
			if(itemId == arrMapOutsItem[k].itemid){
				outs = arrMapOutsItem[k].outs;
				mainOnHandQty = arrMapOutsItem[k].mainonhand;
				cswOnHandQty = arrMapOutsItem[k].centralonhand;
				cummulative = arrMapOutsItem[k].cummulativeqty;
			}
		}										
		objItemSublistItem['custpage_total_nxt_day_ship'] = parseInt(cummulative).toFixed(0); 
		objItemSublistItem['custpage_outs'] = parseInt(outs).toFixed(0); 
		objItemSublistItem['custpage_qty_main_eau_claire'] = parseInt(mainOnHandQty).toFixed(0); 
		objItemSublistItem['custpage_qty_central'] = cswOnHandQty; 									 
		objItemSublistItem['custpage_sub_num'] = suggestedSubNum; 
		var	poUrl = '';
		var poHrefTag = '';
		var hrefTag = '';
		var poDetailsTxt = '';
		var totalpoQty = 0;
		var poCSV = '';
		for(var q in arrPOmapResults){
			var poRes = arrPOmapResults[q];				
			var poItem = poRes.itemid ;				
			if(itemId == poItem){
				var poId 		= poRes.internalid;
				var poQty 		= poRes.poqty;
				var expDate 	= poRes.expdate;
				var schdRcvDate	= poRes.schdrcdate;
				var recAppTime	= poRes.recapptime;
				totalpoQty 		+= parseInt(poQty);
				poDetailsTxt = expDate + '-(' +poQty+ ')-' + schdRcvDate + ' ' + recAppTime;
				
				poCSV += poDetailsTxt +' ';
			}
		}
		objItemSublistItem['custpage_qty_on_order'] = parseInt(totalpoQty).toFixed(0);
		objItemSublistItem['custpage_po_details'] = poHrefTag;
		
		var c= ',';
		 
		 outsReport += objItemSublistItem['custpage_bfc_read']+ c + objItemSublistItem['custpage_dsr'] 
		 			+ c + objItemSublistItem['custpage_route'] + c +  objItemSublistItem['custpage_stop']
		 			+ c + objItemSublistItem['custpage_cust_num'] + c + objItemSublistItem['custpage_customer'] 
		 			+ c + objItemSublistItem['custpage_item_id']+ c +  objItemSublistItem['custpage_item_disp_name']  	 
		 			+ c + objItemSublistItem['custpage_pack_size'] + c + objItemSublistItem['custpage_so_quantity'] 
			 		+ c + objItemSublistItem['custpage_total_nxt_day_ship'] + c + objItemSublistItem['custpage_outs'] 
		 			+ c + objItemSublistItem['custpage_committed']
		 			+ c + objItemSublistItem['custpage_qty_main_eau_claire']+ c + objItemSublistItem['custpage_qty_central']
		 			+ c + objItemSublistItem['custpage_qty_on_order'] + c + poCSV   + c + objItemSublistItem['custpage_sub_num'] 
	 				+ c + salesOrderNum + c + objItemSublistItem['custpage_vendor']
			 		+ c + objItemSublistItem['custpage_buyer'] + c + ' \n'	
	
			}
		 
		 var stoday = new Date().toLocaleString("en-US", {timeZone: 'America/Chicago'});
		 log.debug(DEBUG_IDENTIFIER,'Sytem Date: ' + stoday);
		 var dateToday = formatDate(stoday);
		 log.debug(DEBUG_IDENTIFIER,'Formatted Date: ' + dateToday);
	     var currentUser = runtime.getCurrentUser().name;
	     var fileName = dateToday + '-OutsReport-' + currentUser;
		 var prePickOuts = file.create({
	    	    name: fileName,
	    	    fileType: file.Type.CSV,
	    	    contents: outsReport,
	    	    encoding: file.Encoding.UTF8,
	    	    folder: outsFolderId, //outsFolderId,12624
	    	    isOnline: true
	    	}); 
		 return prePickOuts;
    	}catch(ex){
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
						id: 'custpage_bfc_read', 
						line: i,
						value: arrFilteredResults[i].custpage_bfc_read  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_dsr', 
						line: i,
						value: arrFilteredResults[i].custpage_dsr  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_cust_num', 
						line: i,
						value: arrFilteredResults[i].custpage_cust_num  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_customer', 
						line: i,
						value: arrFilteredResults[i].custpage_customer  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_item_id', 
						line: i,
						value: arrFilteredResults[i].custpage_item_id  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_item_disp_name', 
						line: i,
						value: arrFilteredResults[i].custpage_item_disp_name  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_pack_size', 
						line: i,
						value: arrFilteredResults[i].custpage_pack_size  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_so_quantity', 
						line: i,
						value: arrFilteredResults[i].custpage_so_quantity  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_total_nxt_day_ship', 
						line: i,
						value: arrFilteredResults[i].custpage_total_nxt_day_ship  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_outs', 
						line: i,
						value: arrFilteredResults[i].custpage_outs  || 0						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_committed', 
						line: i,
						value: arrFilteredResults[i].custpage_committed || 0					
					});
					objItemSublist.setSublistValue({
						id: 'custpage_qty_main_eau_claire', 
						line: i,
						value: arrFilteredResults[i].custpage_qty_main_eau_claire  || 0						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_qty_central', 
						line: i,
						value: arrFilteredResults[i].custpage_qty_central  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_qty_on_order', 
						line: i,
						value: arrFilteredResults[i].custpage_qty_on_order  || null						
					});
										
					objItemSublist.setSublistValue({
						id: 'custpage_po_details', 
						line: i,
						value: arrFilteredResults[i].custpage_po_details  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_sub_num', 
						line: i,
						value: arrFilteredResults[i].custpage_sub_num  || null						
					});					
					objItemSublist.setSublistValue({
						id: 'custpage_sales_order_num', 
						line: i,
						value: arrFilteredResults[i].custpage_sales_order_num  || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_vendor', 
						line: i,
						value: arrFilteredResults[i].custpage_vendor || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_reviewed', 
						line: i,
						value: arrFilteredResults[i].custpage_reviewed || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_buyer', 
						line: i,
						value: arrFilteredResults[i].custpage_buyer || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_customer_category', 
						line: i,
						value: arrFilteredResults[i].custpage_customer_category || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_route', 
						line: i,
						value: arrFilteredResults[i].custpage_route || null						
					});
					objItemSublist.setSublistValue({
						id: 'custpage_stop', 
						line: i,
						value: arrFilteredResults[i].custpage_stop || null						
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
    
    
    
    function confirmationPage(request,fileUrl)
	{
		var DEBUG_IDENTIFIER = 'confirmationPage';
		log.debug(DEBUG_IDENTIFIER,'--START--');
		try{

		// Create confirmation page
		
		var objForm = serverWidget.createForm({
			 title: 'Pre-Pick OUTS Report',
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
    	
		var arrConfirmPage = [];
	
		arrConfirmPage.push('The Pre-Pick OUTS Report CSV File has been generated. Click <a style="font-weight:bold" href="' + fileUrl + '"  target="_blank">here</a> to navigate on the Pre-Pick OUTS Report folder.');
		arrConfirmPage.push('<hr style="font-size:3";>');
		arrConfirmPage.push('<h1>Click the BACK button to return to Pre-Pick OUTS Report Page.</h1>');

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