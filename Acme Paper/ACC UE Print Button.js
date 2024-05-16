/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/url','N/runtime'],

function(record, url,  runtime){

	function beforeLoad(scriptContext){	

		if (scriptContext.type === scriptContext.UserEventType.VIEW && runtime.executionContext == 'USERINTERFACE'){
			
			var currentrecord = scriptContext.newRecord;
			var recordid = currentrecord.id;
				try{
					
						createButton(scriptContext, recordid);
				}
				catch(e)
				{
					log.error('Error Details', e.toString());
				}
			
		}
}



	// Function to create button.
function createButton(scriptContext, recordid){
	
		// Getting the URL to open the suitelet.
		var outputUrl =  url.resolveScript({scriptId: 'customscript_acc_st_so_print', deploymentId: 'customdeploy_acc_st_so_print', returnExternalUrl: false});

		// Adding parameters to pass in the suitelet.
		outputUrl += '&action=printso';
		outputUrl += '&recordid=' + recordid;

		// Creating function to redirect to the suitelet.
		var stringScript = "window.open('"+outputUrl+"','_blank','toolbar=yes, location=yes, status=yes, menubar=yes, scrollbars=yes')";

		// Creating a button on form.
		var printButton = scriptContext.form.addButton({id: 'custpage_print',label: 'Print',functionName: stringScript});
	}

	return {
		beforeLoad: beforeLoad
	};
});