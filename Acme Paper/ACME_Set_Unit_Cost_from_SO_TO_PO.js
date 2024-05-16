/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],

function(record, search) {
   
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
    	if(scriptContext.type == 'create' || scriptContext.type == 'edit'){
    		var newrec = scriptContext.newRecord;
    		var oldrec = scriptContext.oldRecord;
    		try{
    
                    var dropship = newrec.getValue({fieldId: 'custbody_dropship_order'});
                    log.debug('dropship=', dropship);
                    log.debug('SO ID=', newrec.id);
                    if (dropship == true)
                    {
                  
                           var soLineCount = newrec.getLineCount({ sublistId: 'item'});
                           log.debug('soLineCount', soLineCount);
                      

                             for(var ilc = 0; ilc < soLineCount; ilc++)
                               {
                                      var soitem = newrec.getSublistValue({sublistId: 'item', fieldId: 'item', line: ilc});
                                      var sorate = newrec.getSublistValue({sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: ilc});
                                      var sooldrate = oldrec.getSublistValue({sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: ilc});
                                      var poId;
                                      
                                     // Get POs from SO
                                      var purchaseorderSearchObj = search.create({
                                    	   type: "purchaseorder",
                                    	   filters:
                                    	   [
                                    	      ["createdfrom","anyof",newrec.id], 
                                    	      "AND", 
                                    	      ["type","anyof","PurchOrd"], 
                                    	      "AND", 
                                    	      ["mainline","is","T"]
                                    	   ],
                                    	   columns:
                                    	   [
                                    	      search.createColumn({name: "internalid", label: "Internal ID"})
                                    	   ]
                                    	});
                                    	var searchResultCount = purchaseorderSearchObj.runPaged().count;
                                    	log.debug("purchaseorderSearchObj result count",searchResultCount);
                                    	purchaseorderSearchObj.run().each(function(result){
                                    	   // .run().each has a limit of 4,000 results
                                    		  poId= result.getValue({name: "internalid"})
                                    		  
                                    		  
                                      log.debug('poId', poId );
                                      log.debug( 'sorate' , sorate );
                                      log.debug( 'sooldrate' , sooldrate);

                                      var poupdated='no';
                                  //    var soquantity = salesOrder.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: ilc});
                                  //    log.debug('SO ITEM', item);
                                      if(poId)
                                      {
                                    	  var purchaseOrder = record.load({type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: true});
                                    	  var poLineCount = purchaseOrder.getLineCount({ sublistId: 'item'});
                                    	 
                                    	  
                                    	  for(var i=0; i< poLineCount; i++)
                                    	  {
                                    		   var poitem = purchaseOrder.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                                    		   var porate = purchaseOrder.getSublistValue({sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: i});
                                    		   var poquantity = purchaseOrder.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i});
                                    		   
                                    		   log.debug('poitem', poitem );
                                    		   log.debug('soitem', soitem );
                                              if(soitem == poitem && porate != sorate)
                                              {
                                            	  
                                            	  poupdated = 'yes';
                                            	  log.debug('poupdated true' );
                                            	  purchaseOrder.selectLine({sublistId: 'item', line: i});
                                            	  purchaseOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: sorate, ignoreFieldChange: false, forceSyncSourcing : true});
                                            //	  purchaseOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'costestimaterate', value: poItems[i].cost, ignoreFieldChange: false, forceSyncSourcing : true});                              
                                                  var extendedCost = poquantity * sorate;
                                                  extendedCost = extendedCost.toFixed(2);
                                                  purchaseOrder.setCurrentSublistValue({sublistId: 'item', fieldId: 'costestimate', value: extendedCost, ignoreFieldChange: false, forceSyncSourcing : true});
                                                  purchaseOrder.commitLine({sublistId: 'item'});
                                                
                                              }
                                          }
                                    	  if(poupdated == 'yes')
                                          {
                                    		 
                                    	  purchaseOrder.save(true, true);
                                    	  log.debug('PO Updated' );
                                          }
                                      }
                                    		                                      		  
                                    	   return true;
                                   });   //All POS                                	
                                    		  
                               } //all so lines
                                    
                    } //if dropship
        	//	}  soid
    		}catch(e){
    			log.debug('Error!', e);
    		}
    	}
    }

    return {
      //  beforeLoad: beforeLoad,
      //  beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
