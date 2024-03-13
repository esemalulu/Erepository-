/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/ui/message', 'N/currentRecord'], function(runtime, message, currentRecord){

    function pageInit(context){
    
        var record = currentRecord.get();
        
        var response = record.getValue({
            fieldId: 'response'
        });
		
		if (response) {
			var objResponse = JSON.parse(response);
			var reminderMsg = message.create({
				message: objResponse.msg,
				type: (objResponse.success) ? message.Type.CONFIRMATION : message.Type.ERROR
			});
			
			reminderMsg.show({
				duration: 15 * 1000 // x 1000 to get seconds
			});
		}
    }
    
    return {
        pageInit: pageInit
    };
});
