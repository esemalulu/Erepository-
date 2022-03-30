/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 
 define(['N/record', 
        'N/format',
        'N/runtime',
        '/SuiteScripts/Audaxium Customization/SuiteScript 2.0/UTILITY_LIB'],		
		
function(record, format, runtime, custUtil) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */ 
 
    function afterSubmit(context) 
    { 
	     var oldRec = context.oldRecord,
			 newRec = context.newRecord;
			 		
     	if (context.type == context.UserEventType.CREATE )
    	{							
			var date = new Date();
				
			var oppRec = record.load({
			'type':record.Type.OPPORTUNITY,
			'id':newRec.getValue({'fieldId':'custrecord_sss_opportunity'}),
			'isDynamic':false
			});
								
			var lineCnt = oppRec.getLineCount({'sublistId':'recmachcustrecord_sss_opportunity'});
						
			if(lineCnt == 1 && !newRec.getValue({'fieldId':'custbody_aux_sss_date'}))
			{
				oppRec.setValue({
    			'fieldId':'custbody_aux_sss_date',
    			'value':new Date(),
    			'ignoreFieldChange':true
				});
					
				oppRec.save({
    			'enableSourcing':true,
    			'ignoreMandatoryFields':true
				});
		
				log.error('Completed Setting Field Value');			
			}
			
    		return;
    	}
 
	}

    return {
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});

