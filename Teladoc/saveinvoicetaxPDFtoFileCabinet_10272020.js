function beforeSubmit(type)
{

    var arrFilter = new Array(); 
   
   // Get the value of the Date parameter 
    
    var fromdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_taxpdf_date_from');
    var todate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_taxpdf_date_to');
    var psubsidiary = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_taxpdf_subsidiary');
  //  var billtocustomer = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_taxpdf_bt_customer'); 
    var folderid = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_taxpdf_folder_id'); 
      
    nlapiLogExecution('DEBUG','param-from date: '+fromdate) ;
    nlapiLogExecution('DEBUG','param-to date: '+todate) ;
    nlapiLogExecution('DEBUG','param-subsidiary: '+psubsidiary) ;
    nlapiLogExecution('DEBUG','param-folder-id: '+folderid) ;
  //  nlapiLogExecution('DEBUG','param-billtocustomer: '+billtocustomer) ;
    
  //  arrFilter[0] = new nlobjSearchFilter('entity', null, 'is',  billtocustomer ); 
    arrFilter[0] = new nlobjSearchFilter('trandate', null, 'within', fromdate, todate  ); 
    arrFilter[1] = new nlobjSearchFilter('subsidiary', null, 'is',  psubsidiary ); 

 var sResult = new Array();
 
 sResult = nlapiSearchRecord('transaction', 'customsearch_liv_save_taxpdf_filecabinet', arrFilter, null); //load an existing transaction saved search or create a search
 

 for(var i=0; sResult != null && i < sResult.length; i++)
 {
  
  var sColumns = sResult[i].getAllColumns();
  
  //generate invoice printout
  var pdfFile = nlapiPrintRecord('TRANSACTION', sResult[i].getValue(sColumns[0]),'PDF');
  
  //set the file name
  pdfFile.setName("SalesTaxInvoice_"+sResult[i].getValue(sColumns[2]));
  
  //set target folder in file cabinet
  pdfFile.setFolder(folderid);
  //Set Available without login to true
  pdfFile.setIsOnline(true);
  
  //store file in cabinet
  var fileID = nlapiSubmitFile(pdfFile);
   
    nlapiLogExecution('DEBUG','Generated File ID: '+fileID) ;
  


 }
 


}