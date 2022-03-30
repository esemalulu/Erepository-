//Date Created : 08/27/18 NS-191

function fieldChanged(type,fieldname)
{
     var  type = nlapiGetRecordType();
 
   if (fieldname == 'trandate')
   {
      var gldate ;
      var trandate = nlapiGetFieldValue('trandate') ;
      var periodenddate = nlapiGetFieldValue('custbody_liv_period_end_date') ;
      var postingperiod = nlapiGetFieldText('postingperiod') ;
      var trandateperiod = convertdate(trandate, 'YYYY-MM');
      
      /*
      if (trandateperiod == postingperiod)
      {  
          gldate = trandate;
           nlapiLogExecution('DEBUG','gldate trandateperiod=postingperiod : '+ gldate) ;
      }
      else
      {    
          gldate = periodenddate;
           nlapiLogExecution('DEBUG','gldate trandateperiod!=postingperiod : '+ gldate) ;
      }
      */
      
      nlapiSetFieldValue('custbody_liv_gl_impact_date', trandate );
   
    }

   return true;
}
function convertdate(inputdate, inputformat) 
{
 

  var newdate = new Date(inputdate);
  
  nlapiLogExecution('DEBUG','Input Date:'+ inputdate) ;
  nlapiLogExecution('DEBUG','New Date:'+ newdate) ;
   
   if (inputformat == 'YYYY-MM')
   {
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring =  newdate.getFullYear()+ "-" + ("0" + (newdate.getMonth() + 1).toString()).substr(-2) ;
     nlapiLogExecution('DEBUG','datestring:'+ datestring) ;
     
     return datestring ;
   }   
   if (inputformat == 'MMDDYY')
   {
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + ("0" + newdate.getDate().toString()).substr(-2)  +  (newdate.getFullYear().toString()).substr(2);
      nlapiLogExecution('DEBUG','datestring:'+ datestring) ;
      
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
