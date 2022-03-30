/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/serverWidget','N/error', 'N/runtime'],
/**
 * @param {record} record
 * @param {ui} ui
 * @param {dialog} dialog
 * @param {message} message
 */
function(record, serverw, error, runtime) 
{
   
	//Helper function to display error correctly
	function debug(error) 
	{
		var errMsg = '';
		try {
            var errorJSON = JSON.parse(error);
            
            errMsg = errorJSON.type+' // '+errorJSON.name+' // '+errorJSON.message;
        }
        catch (e){
            errMsg = error.toString();
        }
        
        return errMsg;
	}
	
    /**
     * Entry Point
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) 
    {
    	//Let's Create NetSuite Look/Feel Form
    	var nsform = serverw.createForm({
    		'title':'SuiteScript 2.0 Developer Reference Guide',
    		'hideNavBar':false
    	});
    	
    	//Set the client file from script parameter
    	nsform.clientScriptFileId = runtime.getCurrentScript().getParameter({
    									'name':'custscript_ssc2_sctfileid'
    								});
    	
    	//Header level field to store any error messages
    	//	Error message will be shown as Message object for 30 seconds
    	var hiddenMsgFld = nsform.addField({
    					   		'id':'custpage_hidmsgfld',
    					   		'label':'Message to Dispaly',
    					   		'type':'textarea',
    					   		'container':''
    					   });
    	hiddenMsgFld.updateDisplayType({
    		'displayType':serverw.FieldDisplayType.HIDDEN
    	});
    	
    	try
    	{
    		//--------------- Add Filter Group ----------------------------------
    		nsform.addFieldGroup({
    			'id':'grpa',
    			'label':'Filter Options'
    		});
    		
    		var fltFld = nsform.addField({
    			'id':'custpage_flt',
    			'label':'SuiteScript 1 API',
    			'type':serverw.FieldType.SELECT,
    			'container':'grpa',
    			'source':'customrecord_ssc_apirefrec'
    		});
    	}
    	catch(err)
    	{
    		
    	}
    	
    	//Show the form to user
    	context.response.writePage(nsform);
    }

    return {
        onRequest: onRequest
    };
    
});
