function saveRecord()
{
   //  Check to see if department is entered when adjustment is opex
   
   var account = nlapiGetFieldText('account') ;
   var firstnumber = account.substr(0,1) ;

   if ((String(nlapiGetFieldValue('department')).length === 0) && (firstnumber === "6"))
   {
      alert("Please provide a value for Department");
      return false;
   }
   return true;
}
