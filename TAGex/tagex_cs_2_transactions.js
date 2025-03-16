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
        'N/runtime',
        'N/currentRecord'],

function(record, error, search,format, url, runtime, custDate, currentRecord )
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

    var thisRec = context.currentRecord;
    var recType = thisRec.type;

  
    if(recType == 'salesorder' )
    {
        var shipMethod = thisRec.getValue({ fieldId: "shipmethod" });

        try 
        {
            if(shipMethod != '21866' )
            {
               thisRec.getField({fieldId: 'custbody_tagex_pallet_progress'}).isDisplay = false;
               thisRec.setValue({ fieldId: "custbody_tagex_pallet_progress", value: null });
              
            }

        }
        catch (e) 
        {
          log.error('Error On Sales Order: '+ recType+'/'+thisRec.id, e);
/*
          email.send({
	    		'author':-5,
	    		'recipients':'elijah@semalulu.com',
	    		'subject':'Error Submitting Record'+ recType+'/'+thisRec.id ,
	    		'body':e
	    	});
*/        
         }

      
   } 


      
  
}



function fieldChanged(context) 
{

    var thisRec = context.currentRecord;
    var recType = thisRec.type;

	 if(recType == 'salesorder' )
	 {
  
		 if(context.fieldId == "shipmethod")
		 {

              var shipMethod = thisRec.getValue({ fieldId: "shipmethod" });
		      var palletProgress = thisRec.getField({ fieldId: "custbody_tagex_pallet_progress" });
           
              if(shipMethod == '21866')
              {
                 palletProgress.isDisplay = true;  
                 thisRec.setValue({ fieldId: "custbody_tagex_pallet_progress", value: '1' });
                
              }
              else
              {
                 palletProgress.isDisplay = false; 
                 thisRec.setValue({ fieldId: "custbody_tagex_pallet_progress", value: null });

              }
          
		}

	}


  
    
}







  
  
function validateLine(context) 
{

} 




function saveRecord(context) 
{
    var thisRec = context.currentRecord;
    var recType = thisRec.type;
 

  
    if(recType == 'salesorder' )
    {

          var shipMethod = thisRec.getValue({ fieldId: "shipmethod" });
		  var palletProgress = thisRec.getField({ fieldId: "custbody_tagex_pallet_progress" });
    
       	   if(shipMethod == '21866')
		   {
              if(palletProgress == undefined )
             {
                 alert('Please Enter PALLET PROGRESS ');
                 return false;      
             }          
           }  

    return true; 
      
    }

  


   
}


  


  



function refreshPage(ID, sub, addy)
{
  
  
 var smdSlUrl = url.resolveRecord({
    recordType: 'invoice',
    recordId: ID,
    isEditMode: true
});

	smdSlUrl +=	'&subsid='+ sub +'&address='+ addy;
	window.ischanged = true;
	window.location = smdSlUrl;
}



  function getParameterFromURL()
  {
      var query = window.location.search.substring(1);
      var vars = query.split("&");

      for (var i=0;i<vars.length;i++) 
      {
        var pair = vars[i].split("=");
        if(pair[0] == param){
          return decodeURIComponent(pair[1]);} 
      }
      return(false);
  } 



    return {
    	pageInit: pageInit,
      	fieldChanged: fieldChanged,
        validateLine: validateLine,
        saveRecord: saveRecord,
    };

});





