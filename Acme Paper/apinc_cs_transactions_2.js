/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(['N/record',
        'N/error',
        'N/search',
        'N/format',
        'N/url',
        'N/runtime'],

function(record, error, search,format, url, runtime)
{
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
 
function pageInit(context)
{
          var currentRecord = context.currentRecord;
          var recType = currentRecord.type;
    try
    {
          if(context.mode == 'create')
          {
              //NATIONAL PAPER  CUSUSTOMER NEED TO HAVE THE DEFAULT SUBSIDIARY CHANGED FROM 'ACME' TO 'NATIONAL PAPER' SUBSIDIARY
              var division = currentRecord.getValue({'fieldId': 'cseg_accrete_divisi'});

               if(division == '16')  // NATIONAL PAPER DIVISION = 16
               {
                   currentRecord.setValue({'fieldId':'subsidiary', 'value':'3'});  //'NATIONAL PAPER'  SUBSIDIARY = 3
               }        
          }
    }
    catch (error)
    {
      log.error('Error on pageInit (Subsidiar Change) ', error.toString());
    }
      
}




function fieldChanged(context) 
{
          var currentRecord = context.currentRecord;
          var recType = currentRecord.type;


    try
    { 
        if(context.mode == 'create')
        {
      
           //NATIONAL PAPER  CUSUSTOMER NEED TO HAVE THE DEFAULT SUBSIDIARY CHANGED FROM ACME TO NATIONAL PAPER SUBSIDIARY
           if(context.fieldId == 'entity' )
           {

              var division = currentRecord.getValue({'fieldId': 'cseg_accrete_divisi'});

               if(division == '16')  // NATIONAL PAPER DIVISION = 16
               {
                   currentRecord.setValue({'fieldId':'subsidiary', 'value':'3'});  //'NATIONAL PAPER'  SUBSIDIARY = 3
               } 
            
              //alert('TEST')           
              //refreshPage(currentRecord.id, sub, shipAddy);
           }
        }
    }
    catch (error)
    {
      log.error('Error on fieldChanged (Subsidiary Change)', error.toString());
    }

}




    return {
    	pageInit: pageInit,
        //saveRecord: saveRecord,
      	fieldChanged: fieldChanged
        //validateLine: validateLine
    };

});





