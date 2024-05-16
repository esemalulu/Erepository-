/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/********************************************************************************************************************************************************************                    
 **@Author      : Farhan Shaikh
 **@Dated       : 15/10/2020   DD/MM/YYYY
 **@Version     : 
 **@Description : UserEvent Script Deployed On Sales Order to Get The Value Of Checkbox from body and accordingly set Create PO Value to Drop Shipment on line level. 
*******************************************************************************************************************************************************************/
define(['N/search','N/record','N/error','N/runtime'],function(search,record,error,runtime){
	function beforeSubmit(scriptContext){
		try{
			//log.debug('scriptContext.type',scriptContext.type)
			if (scriptContext.type=='DELETE') {
				return;
			}
			var currRecord=scriptContext.newRecord;
			log.debug('record id', currRecord.id)
			var dropShipCheckboxValue=currRecord.getValue('custbody_dropship_order')
			log.debug('dropShipCheckboxValue',dropShipCheckboxValue);
			if (dropShipCheckboxValue=='T' || dropShipCheckboxValue==true) {
				var  lineCount=currRecord.getLineCount('item');
              log.debug('lineCount',lineCount);
				for(var i=0;i<lineCount;i++){
					var createPo=currRecord.getSublistValue({sublistId:'item',fieldId:'createpo',line:i});
                   log.debug('createPo',createPo);
                    var amount=currRecord.getSublistValue({sublistId:'item',fieldId:'amount',line:i});
					if (createPo!='DropShip' && amount > 0) {
					currRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'createpo',
                            line: i,
                            value: 'DropShip'
                        });
                     
                      
					}
                 
                  
				}
		
            }
            //log.debug('createPo',createPo);
		}
      
      catch(e){
			log.debug("ERROR OCCURED",JSON.stringify(e));
		}
      
	}

	return{
		beforeSubmit:beforeSubmit
	};
})