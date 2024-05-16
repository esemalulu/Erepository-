/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/format'],

function(record, search, format) 
{
	/**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) 
    {
    	if (scriptContext.type == scriptContext.UserEventType.CREATE ) 
    	{
    		try
    		{
				var dropShipOrderFlag = false;
    			var recordObj = scriptContext.newRecord;
    			var recType = recordObj.type;
    			var recId = recordObj.id;
				var createdFrom = recordObj.getValue({fieldId : 'createdfrom'});
			
				var lineCount = recordObj.getLineCount({sublistId : 'item'});
				log.debug("lineCount : createdFrom",+lineCount+':'+createdFrom);
				
				 //var soRecObj = record.load({type: record.Type.SALES_ORDER,id: createdFrom, isDynamic : true });
				 if(createdFrom != '' && createdFrom != null && createdFrom != undefined && createdFrom != 'undefined')
		  		{
				 	for(var i = 0; i < lineCount; i++)
    		  	{
    		  		var itemId = recordObj.getSublistValue({sublistId:'item',fieldId:'item',line: i});
					log.debug("itemid", itemId);
    		  		if(itemId)
    		  		{
    		  			 var itemLookup = search.lookupFields({
                             type: search.Type.ITEM,
                             id: itemId,
                             columns: ['isdropshipitem']
                         });
                        log.debug('itemLookup', itemLookup);
                         var isDropShip = itemLookup.isdropshipitem;
                       
                         if(isDropShip== true)// || specialOrder
						 {
                        	 dropShipOrderFlag = true;
							 
						 }
							
       		  		}
    		  	}
				if(dropShipOrderFlag === true)
				{
    		  			recordObj.setValue({fieldId : 'custbody_dropship_order', value : true});
				}	
			  }//end of Created form for loop				
				//else if(dropShipOrderFlag === false)
    		  			//recordObj.setValue({fieldId : 'custbody_dropship_order', value : false});
			  
			}	//end of try					
catch(e)
    		{
    			log.debug("Error", e);
    		}//end of catch
    	
      }//end of Main IF
	}//End of Function

    return {
    	beforeLoad: beforeSubmit
    };
    
});						