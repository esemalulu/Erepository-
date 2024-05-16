/**
*@NApiVersion 2.0
*@NScriptType ClientScript
*/
define(['N/record', 'N/ui/dialog', 'N/log', 'N/currentRecord'],
function (record, dialog, log, currentRecord) {
try
{
	function pageInit(context) 
	{
      //log.debug({ details: 'Type: ' + context.mode.type});
            if (context.mode == 'create' )
           {
            var rec = context.currentRecord;
            var type = rec.getValue({fieldId: 'itemtype'});
            log.debug({title: 'item type', details: 'Type: ' + type });
			var formid = rec.getValue({fieldId: 'customform'});
            log.debug({title: 'Form  id', details: 'customform: ' + formid });

           if(type =='OthCharge' && formid!=198 )
            {
              rec.setValue({fieldId: 'customform', value: 198});
             
            }
            
           }
      
    
	 }//end of pageinit function
	}//end of try block
		catch (e)
			{
				 log.error ({ 
	                    title: e.name,
	                    details: e.message
	                }); 

			}

	return {
	pageInit: pageInit
	//validateField: validateField
	};

});