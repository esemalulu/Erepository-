function csvImportChurn()
{
  var enrollmentCSVImport = nlapiCreateCSVImport();
  enrollmentCSVImport.setMapping("36");  // Churn Import
  
  // setMapping(id) – id (parameter): Internal ID of the Field Map created Step 1.
  // Navigate to: Setup > Import/Export > Saved CSV Imports.
  
  var fileString = "Email Capture > Enrollment/Churn Daily Files/Churn_by_Month_2017_08_28c";
  enrollmentCSVImport.setPrimaryFile(fileString);
 
 
 // customerCSVImport.setPrimaryFile(nlapiLoadFile(2766));
  /*
  setPrimaryFile(file) – file {string} (parameter):
 
  The internal ID, as shown in the file cabinet, of the CSV file containing data to be imported, referenced by nlapiLoadFile. For example: setPrimaryFile(nlapiLoadFile(73)
  Or 
  Raw string of the data to be imported. For Example
 
  fileString = "company name, isperson, subsidiary, externalid\ncompanytest001, FALSE, Parent Company, companytest001";
  setPrimaryFile(fileString);
 
  */
  
  enrollmentCSVImport.setOption("jobName", "Churn Import");
  nlapiSubmitCSVImport(enrollmentCSVImport);
}