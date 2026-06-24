/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record',
        'N/error',
        'N/search',
        'N/ui/serverWidget',
        'N/runtime',
        'N/url',
        'N/email'],

function(record,  error, search, serverw, runtime, url, email) 
{

   function beforeLoad(context) {}

   function beforeSubmit(context) 
   {

            //var thisOldRec = context.oldRecord;
            //var thisOldRecType = thisOldRec.type;
     
            var thisNewRec = context.newRecord;
            var thisNewRecType = thisNewRec.type;
         
      		var lineCount = thisNewRec.getLineCount({'sublistId':'item'});

     
            var listOfAssemblies = [];
            var listOfBOMS = [];
            var itemsToAdd = [];
          
           if( (thisNewRec.type == 'purchaseorder') && context.type === context.UserEventType.CREATE )  
           {
//-------------------------------------------------------------------------------------------------------

                for (var i=0; lineCount && i < lineCount; i+=1)
                {
                    var itemId = thisNewRec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});  
                    var itemLookup = search.lookupFields({type: search.Type.ITEM,id: itemId,columns: ['recordtype']});

                    if (itemId && itemLookup.recordtype == 'assemblyitem')
                    {
                         thisNewRec.setSublistValue({sublistId:'item', fieldId:'quantity', line:i, value: 0 });
                         thisNewRec.setSublistValue({sublistId:'item', fieldId:'custcol_374_is_assembly', line:i, value: true });                       
                         listOfAssemblies.push(itemId); 
                         
                    }

                    log.error('recordtype', itemLookup.recordtype );

                  
                  
                }

                //log.error('listOfAssemblies', JSON.stringify(listOfAssemblies) );

//-------------------------------------------------------------------------------------------------------
            

                var listOfBOMSSearch = search.create({
                type: "bom",
                filters:
                [
                     ["assemblyitem.assembly","anyof", listOfAssemblies]
                ],
                columns:
                [
				    search.createColumn({name: "internalid"})                  
			    ]
			    }).run().getRange({start: 0, end: 1000 });

                //log.error('listOfBOMSSearch', JSON.stringify(listOfBOMSSearch) );
         
				for (var j = 0; j < listOfBOMSSearch.length; j++)
                {
                    var billOfMatterial = listOfBOMSSearch[j].getValue('internalid'); 

					listOfBOMS.push(billOfMatterial);                 
                }

                 //log.error('listOfBOMS', JSON.stringify(listOfBOMS) );

//-------------------------------------------------------------------------------------------------------

                var listOfItemsSearch = search.create({
                type: "bomrevision",
                filters:
                [
                    ["billofmaterials","anyof", listOfBOMS]
                ], 
                columns:
                [
				    search.createColumn({name: "item", join: "component"}),
				    search.createColumn({name: "quantity", join: "component"})			    

                ]
			    }).run().getRange({start: 0, end: 1000 });
        
				for (var k = 0; k < listOfItemsSearch.length; k++)
                {
                    var itemInList = listOfItemsSearch[k].getValue({name: "item", join: "component"} ); 
                    var itemQty = listOfItemsSearch[k].getValue({name: "quantity", join: "component"} ); 

					itemsToAdd.push({itemInList,itemQty});                 
                }

                 //log.error('itemsToAdd', JSON.stringify(itemsToAdd) );

//-------------------------------------------------------------------------------------------------------
                    
				for (var l = 0; l < itemsToAdd.length; l++)
                {
                    var itemToAdd = itemsToAdd[l].itemInList;
                    var itemToAddQty = itemsToAdd[l].itemQty;

                    log.error('itemToAdd', itemToAdd );

                    thisNewRec.insertLine({sublistId: 'item', line: lineCount});
                    thisNewRec.setSublistValue({sublistId: 'item', fieldId: 'item', line: lineCount, value: itemToAdd});
                    thisNewRec.setSublistValue({sublistId: 'item', fieldId: 'quantity', line: lineCount, value: itemToAddQty});                
                }
            

           }

             var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

              log.error('remainingUsage', remainingUsage );

    
   }



  function afterSubmit(context) 
  {

            var thisNewRec = context.newRecord;
            var thisNewRecType = thisNewRec.type;
         
      		var lineCount = thisNewRec.getLineCount({'sublistId':'item'});

           if( (thisNewRec.type == 'purchaseorder') && context.type === context.UserEventType.CREATE )  
           {
                for (var i=0; lineCount && i < lineCount; i+=1)
                {

                     var itemId = thisNewRec.getSublistValue({
                     sublistId: 'item',
                     fieldId: 'item',
                     line: i
                     });

                                 
                     var itemLookup = search.lookupFields({
                     type: search.Type.ITEM,
                     id: itemId,
                     columns: ['recordtype']
                     });

                  
 
                     if(itemLookup.recordtype == 'assemblyitem') 
                     {

                         //log.error('itemLookup', itemLookup.recordtype );
                   
                          thisNewRec.removeLine({
                          sublistId: 'item',
                          line: 1,
                          ignoreRecalc: true
                          });;
                          
                     }


                  
                }             
           }


    
    
  }


  function isEmpty(stValue)
  {
        if ((stValue == '') || (stValue == null) || (stValue == undefined))
        {
            return true;
        }
        else
        {
            if (stValue instanceof String)
            {
                if ((stValue == '')){ return true; }
            }
            else if (stValue instanceof Array)
            {
                if (stValue.length == 0){ return true; }
            }
            return false;
        }
  }


    return{
           //beforeLoad: beforeLoad,
           beforeSubmit: beforeSubmit
           //afterSubmit: afterSubmit
    	};

});




