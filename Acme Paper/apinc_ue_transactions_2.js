/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record',
        'N/error',
        'N/search',
        'N/ui/serverWidget',
        'N/runtime',
        'N/url'],

function(record,  error, search, serverw, runtime, url) 
{

    function beforeLoad(context) 
    {
            try {
                    var newRecord = context.newRecord;

                    var cust = newRecord.getValue('entity')
                    log.error('Customer', cust);
              
                     var sub = newRecord.getValue("subsdiary")              
                     log.error('Subsidiary', sub);

                     newRecord.setValue('subsdiary', '3');
              
               } catch (error) {
                  log.error('ERROR', error);
               }     
    }


    function beforeSubmit(context) 
	{
            try {
                    var newRecord = context.newRecord;

                    var cust = newRecord.getValue('entity')
                    log.error('Customer', cust);
              
                     var sub = newRecord.getValue("subsdiary")              
                     log.error('Subsidiary', sub);

                     newRecord.setValue('subsdiary', '3');
              
               } catch (error) {
                  log.error('ERROR', error);
               }       
              
   }


      


    function afterSubmit(context) 
	{
      try{
      
            var thisRec = context.newRecord;
            var recType = thisRec.type;  
  
            if(context.type === context.UserEventType.CREATE )
            {

                  var thisRec = record.load({
                  'type':recType,
                  'id':thisRec.id
                  });

                  var entity = thisRec.getValue({'fieldId':'entity'});  
                  log.error('Customer', entity )

                  var custRec = record.load({
                  'type':record.Type.CUSTOMER,
                  'id':entity
                   });

                  var division = custRec.getValue({'fieldId':'cseg_accrete_divisi'}); 
                   log.error('Division',division ) 

              
                  //NATIONAL PAPER CUSTOMERS 
                   if(division == '16')
                   {
                
                       log.error('ENTERED DIVISION ') 
                     
                       thisRec.setValue({
                       fieldId: 'subsidiary',
                       value: 3   
                        });

                       thisRec.setValue({
                       fieldId: 'custbody_so_rejereas',
                       value: 'NO REASON'   
                        });

                     
                        thisRec.save({
                       'enableSourcing':true,
                       'ignoreMandatoryFields':true
                        });  
                        
                   }
             
              }


            }
            catch (error)
            {
                log.error('Error in beforeSubmit', error.toString());
            }
    }

    return{
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
        //afterSubmit: afterSubmit
    	};

});
