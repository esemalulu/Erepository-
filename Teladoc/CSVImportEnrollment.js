function csvImportEnrollment()
{
  var enrollmentCSVImport = nlapiCreateCSVImport();
  var sysdate = new Date;
  var filedate = convertdate(sysdate,'MMDDYY');
  nlapiLogExecution('DEBUG','Filedate: '+filedate) ; 
  
   // setMapping(id) – id (parameter): Internal ID of the Field Map created Step 1.
  // Navigate to: Setup > Import/Export > Saved CSV Imports.
  enrollmentCSVImport.setMapping("35");  // Enrollment Import
  
  // Search document
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('name', null, 'contains',  '082917' );

       var searchresults = nlapiSearchRecord('document','customsearch_liv_doc_search', arrFilter, null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 

               var results=searchresults[z];
               var columns=results.getAllColumns();  
               var fileid = custrecord.getId();

               nlapiLogExecution('DEBUG','File ID: '+fileid) ; 
            }
        }
  
        enrollmentCSVImport.setPrimaryFile(nlapiLoadFile(fileid));
  
 
 // customerCSVImport.setPrimaryFile(nlapiLoadFile(2766));
  /*
  setPrimaryFile(file) – file {string} (parameter):
 
  The internal ID, as shown in the file cabinet, of the CSV file containing data to be imported, referenced by nlapiLoadFile. For example: setPrimaryFile(nlapiLoadFile(73)
  Or 
  Raw string of the data to be imported. For Example
 
  fileString = "company name, isperson, subsidiary, externalid\ncompanytest001, FALSE, Parent Company, companytest001";
  setPrimaryFile(fileString);
 
  */
  
  enrollmentCSVImport.setOption("jobName", "Enrollment Import");
  nlapiSubmitCSVImport(enrollmentCSVImport);
}

function convertdate(inputdate, inputformat) 
{


  var newdate = new Date(inputdate);
   
    
   if (inputformat == 'MMDDYY')
   {
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + ("0" + newdate.getDate().toString()).substr(-2)  +  (newdate.getFullYear().toString()).substr(2);
 
     return datestring ;
   }  
   if (inputformat == 'MM/DD/YY')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + "/" + ("0" + newdate.getDate().toString()).substr(-2)  + "/" + (newdate.getFullYear().toString()).substr(2);
     
     return datestring ;
   }  
   
   if (inputformat == 'MONTHYY')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;

     var monthNames = [
     "January", "February", "March",
     "April", "May", "June", "July",
     "August", "September", "October",
     "November", "December"
        ];

     var day = newdate.getDate();
     var monthIndex = newdate.getMonth();
     var year = newdate.getFullYear();
     
     var datestring =  monthNames[monthIndex] + ' ' + year;
     
     return datestring ;
   }  


}
