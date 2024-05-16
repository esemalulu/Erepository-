/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/********************************************************************************************************************************************************************                    
 **@Author      : Manoj Kumar
 **@Dated       : 16/10/2020   DD/MM/YYYY
 **@Version     : 
 **@Description : UserEvent Script Deployed On Sales Order to Get The Purchase Price From Item Master And Set In Unit Cost On Line Level. 
*******************************************************************************************************************************************************************/
define(['N/search','N/record','N/error'],function(search,record,error){
	function beforeSubmit(scriptContext){
		try{
			log.audit('scriptContext.type',scriptContext.type)
			if (scriptContext.type=='DELETE') {
				return;
			}
			var currRecord=scriptContext.newRecord;
          log.debug('record id', currRecord.id)
				var  lineCount=currRecord.getLineCount('item');
				for(var i=0;i<lineCount;i++){
					var createPo=currRecord.getSublistValue({sublistId:'item',fieldId:'createpo',line:i});
                    var price=currRecord.getSublistValue({sublistId:'item',fieldId:'price',line:i});
              /*     log.debug({
            title: 'Debug Entry',
            details: 'price=: ' + price
        });*/
					if (createPo=='DropShip' && price != -1) {
						currRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'costestimatetype',
                            line: i,
                            value: 'PURCHPRICE'
                        });
					}
				}
		}catch(e){
			log.error("ERROR OCCURED",JSON.stringify(e));
		}
	}

	return{
		beforeSubmit:beforeSubmit
	};
})