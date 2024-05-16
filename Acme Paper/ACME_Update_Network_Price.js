/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/task','N/file', 'N/search', 'N/record'],

function(task,file,search,record) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
	
	  
	  function updateContractPrice(networkInternalId, headerInternalId, sapCode, finalPrice, uom, pack) {
	    try {
	    	
	    	log.debug('sapCode' +  sapCode );
      		log.debug('uom' +  uom );
      	//	log.debug('customer' +  customer );
      		log.debug('finalPrice' +  finalPrice );
      		log.debug('Pack' +  pack );
      		log.debug('headerInternalId ' +  headerInternalId );
      		
      		
      		var itemFound=false;
      		var recordUpdated =false;
      		
      		var customrecord_acme_cust_price_contract_lnSearchObj = search.create({
      		   type: "customrecord_acme_cust_price_contract_ln",
      		   filters:
      		   [
      		      ["custrecord_acme_cpc_item_header","anyof",headerInternalId], 
      		      "AND", 
      		      ["custrecord_sap_code","is",sapCode]
      		   ],
      		   columns:
      		   [
      		      search.createColumn({
      		         name: "scriptid",
      		         sort: search.Sort.ASC,
      		         label: "Script ID"
      		      }),
      		      search.createColumn({name: "internalid", label: "Internal ID"}),
      		      search.createColumn({name: "custrecord_acme_cpc_line_item", label: "Item"}),
      		      search.createColumn({name: "custrecord_acme_cpc_line_price", label: "Price"}),
      		      search.createColumn({name: "custrecord_acc_cpcl_sale_unit", label: "Sale Unit"}),
      		      search.createColumn({name: "custrecord_acme_cpc_line_description", label: "Description"}),
      		      search.createColumn({name: "custrecord_acme_cpc_item_header", label: "Contract Header"}),
      		      search.createColumn({name: "custrecord_acme_cpc_line_cost", label: "Loaded Cost"}),
      		      search.createColumn({name: "custrecord_item_pref_vendor", label: "Item Pref Vendor"}),
      		      search.createColumn({name: "custrecord_commodity_code", label: "Commodity Code"}),
      		      search.createColumn({name: "custrecord_sap_code", label: "SAP Code"}),
      		      search.createColumn({name: "custrecord_sap_code2", label: "SAP CODE #2"})
      		   ]
      		});
      		var searchResultCount = customrecord_acme_cust_price_contract_lnSearchObj.runPaged().count;
      		log.debug("customrecord_acme_cust_price_contract_lnSearchObj result count",searchResultCount);
      		customrecord_acme_cust_price_contract_lnSearchObj.run().each(function(result){
      		   // .run().each has a limit of 4,000 results
      			var lineInternalId=  result.getValue({name: "internalid"});
      			var item=  result.getValue({name: "custrecord_acme_cpc_line_item"});
      			var saleUnit=  result.getText({name: "custrecord_acc_cpcl_sale_unit"});
      			
      			 log.debug("saleUnit =" +  saleUnit);
      		     itemFound=true;
      		     
      		   log.debug("item =" +  item);
      		  // var finalPrice1 = finalPrice/pack;  
      			
      		 if(saleUnit == uom)
      		  {
  	           var otherId = record.submitFields({
  	            type: 'customrecord_acme_cust_price_contract_ln',
  	            id: lineInternalId,
  	            values: {
  	                'custrecord_acme_cpc_line_price': finalPrice  	                
  	              }
  	           });
  	           
  	           log.debug("Item Updated =" + item);
  	           recordUpdated = true;
  	           
  	          }
      		   return true;
      		});
      		
      		if(recordUpdated)
      		{
      		var otherId1 = record.submitFields({
 	            type: 'customrecord_network_file',
 	            id: networkInternalId,
 	            values: {
 	                'custrecord_file_status': "APPLIED"  	                
 	              }
 	           });
  	           log.debug("Record Updated");
  	           
      		} else
      			{
      			var otherId1 = record.submitFields({
    	            type: 'customrecord_network_file',
    	            id: networkInternalId,
    	            values: {
    	                'custrecord_file_status': "SALEUOMMISMATCHED"  	                
    	              }
    	           });
    	           log.debug("Unit Of Measure is not matching");
    	          
      			
      			}
      		
      		if(itemFound == false)
      		{
      			// attach item to Header
      		  var itemSearchObj = search.create({
	    		   type: "item",
	    		   filters:
	    		   [
	    		      ["custitem_acc_sap_code","is",sapCode]
	    		   ],
	    		   columns:
	    		   [
	    		      search.createColumn({name: "internalid", label: "Internal ID"}),
	    		      search.createColumn({name: "custitem_acc_sap_code", label: "SAP Code"}),
	    		      search.createColumn({
	    		         name: "itemid",
	    		         sort: search.Sort.ASC,
	    		         label: "Name"
	    		      })
	    		   ]
	    		});
	    		var searchResultCount = itemSearchObj.runPaged().count;
	    		log.debug("itemSearchObj result count",searchResultCount);
	    		itemSearchObj.run().each(function(result){
	    		   // .run().each has a limit of 4,000 results
	    			
	    			var itemInternalId=  result.getValue({name: "internalid"});
	    			  // create item child table
		  	    	  var item_Child = record.create({
		  	    		    type: 'customrecord_acme_cust_price_contract_ln'
		  	    		  });
		  	    	  item_Child.setValue({
		  					fieldId: 'custrecord_acme_cpc_item_header',
		  					value: headerInternalId
		  				});
		  	    	  item_Child.setValue({
		  					fieldId: 'custrecord_acme_cpc_line_item',
		  					value: itemInternalId
		  				});
		  	    	  
		  	    	  		  	    	  
		  	    	  item_Child.setValue({
		  					fieldId: 'custrecord_acme_cpc_line_price',
		  					value: finalPrice
		  				}); 
		  	    	  
		  	    	  item_Child.save({
		      			  enableSourcing: true,
		      			  ignoreMandatoryFields: false});
		  	    	  
		  	    	var otherId1 = record.submitFields({
		 	            type: 'customrecord_network_file',
		 	            id: networkInternalId,
		 	            values: {
		 	                'custrecord_file_status': "APPLIED"  	                
		 	              }
		 	           });
		  	           log.debug("Record INSERTED");
		  	    	  
		  	    	//   return true;
	    		});
      			
      			
      		}
      		
      		return true;
   
	    } 
	    catch (error) {
	    	log.debug('Error!', error);
	    }
	}

	  function isEmpty(stValue) {
	    if (stValue == "" || stValue == null || stValue == undefined ) {
	      return true;
	    } else {
	      if (stValue instanceof String) {
	        if (stValue == "") {
	          return true;
	        }
	      } else if (stValue instanceof Array) {
	        if (stValue.length == 0) {
	          return true;
	        }
	      }

	      return false;
	    }
	  }
	  
    function execute(scriptContext) {
    	
    	try
    	{    	
    	//STEP 1 :
    	//CSV Import today's file
 /*   	var scriptTask = task.create({taskType: task.TaskType.CSV_IMPORT});
    	scriptTask.mappingId = 310;
    	var f = file.load('SuiteScripts/Network File/Network Price File.csv');
    	scriptTask.importFile = f;
      	var csvImportTaskId = scriptTask.submit(); */
    	
    	//STEP 2 :
    	// Loop thru today's uploaded rows
    	var headerFound=false;
    	var networkInternalId=0;
      	var customrecord_network_fileSearchObj = search.create({
      	   type: "customrecord_network_file",
      	   filters:
      	   [
      	      ["custrecord_file_status","is","NOTAPPLIED"]
      	  //    "AND", 
      	  //    ["created","on","today"]
      	   ],
      	   columns:
      	   [
      		  search.createColumn({name: "internalid", label: "Internal ID"}),
      	      search.createColumn({name: "custrecord_file_customer_id", label: "Customer ID"}),
      	      search.createColumn({name: "created", label: "Date Created"}),
      	      search.createColumn({name: "custrecord_file_sap_code", label: "SAP Code"}),
      	      search.createColumn({name: "custrecord_file_umo", label: "UOM"}),
      	      search.createColumn({name: "custrecord_file_case", label: "Case/Pack"}),
      	      search.createColumn({name: "custrecord_file_upc", label: "UPC"}),
      	      search.createColumn({name: "custrecord_file_valid_from", label: "Valid From"}),
      	      search.createColumn({name: "custrecord_file_valid_to", label: "Valid TO"}),
      	      search.createColumn({name: "custrecord_file_final_price", label: "Final Price"}),
      	      search.createColumn({name: "custrecord_file_status", label: "Status"}),
      	      search.createColumn({name: "custrecord_file_contract_reference", label: "Contract Reference"})
      	   ]
      	});
      	var searchResultCount = customrecord_network_fileSearchObj.runPaged().count;
      	log.debug("customrecord_network_fileSearchObj result count",searchResultCount);
      	customrecord_network_fileSearchObj.run().each(function(result){
      	   // .run().each has a limit of 4,000 results
      		
      		var custInternalId;
      		headerFound=false;
      		var sapCode=  result.getValue({name: "custrecord_file_sap_code"});
      		var customerId=  result.getValue({name: "custrecord_file_customer_id"});      		
      		var finalPrice=  result.getValue({name: "custrecord_file_final_price"});
      		var uom=  result.getValue({name: "custrecord_file_umo"});
      		var pack=  result.getValue({name: "custrecord_file_case"});
      		var contract_header=  result.getValue({name: "custrecord_file_contract_reference"});
      		networkInternalId=  result.getValue({name: "internalid"});
      		
      		//read header id
      		var headerRef = customerId.substring(0, 3);
      		log.debug("headerRef =" + headerRef);
      		
      		//Read header internal ID
      		
      		var customrecord_acme_cust_price_contractsSearchObj = search.create({
      		   type: "customrecord_acme_cust_price_contracts",
      		   filters:
      		   [
      		      ["custrecord_acme_cpc_contract_ref_no","is",headerRef]
      		   ],
      		   columns:
      		   [
      		      search.createColumn({
      		         name: "name",
      		         sort: search.Sort.ASC,
      		         label: "ID"
      		      }),
      		      search.createColumn({name: "scriptid", label: "Script ID"}),
      		      search.createColumn({name: "internalid", label: "Internal ID"}),
      		      search.createColumn({name: "custrecord_acme_cpc_start_date", label: "Start Date"}),
      		      search.createColumn({name: "custrecord_acme_cpc_end_date", label: "End Date"}),
      		      search.createColumn({name: "custrecord_acme_cpc_contract_ref_no", label: "Contract Reference No."})
      		   ]
      		});
      		var searchResultCount = customrecord_acme_cust_price_contractsSearchObj.runPaged().count;
      		log.debug("customrecord_acme_cust_price_contractsSearchObj result count",searchResultCount);
      		customrecord_acme_cust_price_contractsSearchObj.run().each(function(result){
      		   // .run().each has a limit of 4,000 results
      			headerFound=true;
      			headerInternalId=  result.getValue({name: "internalid"});
      			log.debug('headerInternalId' +  headerInternalId );      		
            	var price = updateContractPrice(networkInternalId,headerInternalId, sapCode, finalPrice, uom, pack);
            	return true;      		  
      		}); 
      		
      		if(headerFound==false)
      		{
          	    
	           var otherId1 = record.submitFields({
	            type: 'customrecord_network_file',
	            id: networkInternalId,
	            values: {
	                'custrecord_file_status': "HEADERNF"  	                
	              }
	           });
	           log.debug("Header Not Found");
      		
      		}
      	  
      		return true;
      	});   
      	
      	
       }
      	
      	catch (error) {
	    	log.debug('Error!', error);
	    }
      	

    }

    return {
        execute: execute
    };
    
});
