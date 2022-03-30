/* Last Updated: 19-Sep-2018 */
/* 09/19/18 - New script NS-212 */

function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
      
      
      // Search record existence in custom record
       var arrFilter = new Array(); 
   
       var positionid = nlapiGetFieldValue('custrecord_liv_emp_position_id');
       var asofdate = nlapiGetFieldValue('custrecord_liv_emp_as_of_date');
      
       nlapiLogExecution('DEBUG','Position ID value:'+ positionid) ;
       nlapiLogExecution('DEBUG','As of date value:'+ asofdate) ;
    
	   arrFilter[0] = new nlobjSearchFilter('custrecord_liv_emp_as_of_date', null, 'on',  asofdate ); 
	   arrFilter[1] = new nlobjSearchFilter('custrecord_liv_emp_position_id', null, 'is',  positionid ); 


	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('custrecord_liv_emp_as_of_date'));
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_employee_snapshot', null, arrFilter, arrColumns);


       if(arrResult) //  found - delete records first
        {
          nlapiLogExecution('DEBUG','In arrResult') ;
           for (var i = 0;  i < arrResult.length; i++)
           {
              nlapiLogExecution('DEBUG','Deleting record') ;
              var current_rec = arrResult[i];
              var rec_id = current_rec.getId();
              nlapiDeleteRecord('customrecord_liv_employee_snapshot', rec_id);
           }
         }
         
        
        
        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
        processRecords(type) ;
   

  }

} // end function beforeSumit




function processRecords(type)
{
  //applies only to CSV Import and Create event
  nlapiLogExecution('DEBUG','beforeSubmit') ;
  nlapiLogExecution('DEBUG','type : '+ type) ;

if ( (nlapiGetContext().getExecutionContext() == 'csvimport'))
{
     
       var adpdeptcode = nlapiGetFieldValue('custrecord_liv_emp_home_dept_code');
       var location = nlapiGetFieldValue('custrecord_liv_emp_location');
       var asofdate = nlapiGetFieldValue('custrecord_liv_emp_as_of_date');
       var subsidiary = nlapiGetFieldText('custrecord_liv_emp_ns_subsidiary');
       var hiredate = nlapiGetFieldValue('custrecord_liv_emp_hire_date');
       var termdate = nlapiGetFieldValue('custrecord_liv_emp_term_date');
       var positionstatus = nlapiGetFieldValue('custrecord_liv_emp_position_status');
       var hcstatus = nlapiGetFieldValue('custrecord_liv_emp_headcount_status');
       
       var today = new Date(); 
       
       var chkdate = new Date(asofdate); 
       var dd = chkdate.getDate();
       var mm = chkdate.getMonth()+1; //January is 0!
       var yyyy = chkdate.getFullYear();
/*
       if(dd<10) {
          dd='0'+dd ;
         } 

        if(mm<10) {
             mm='0'+mm ;
         } 
*/
       var lastdate = mm+'/'+dd+'/'+yyyy;

       
       nlapiLogExecution('DEBUG','last date : '+ lastdate) ;
       nlapiLogExecution('DEBUG','term date  : '+ termdate) ;
       
       if ( (termdate == lastdate) &&  (positionstatus == 'Terminated') )
       {
           hcstatus = 'Active' ;
        }
       else
       {
           hcstatus = positionstatus ;
       }
          
       nlapiLogExecution('DEBUG','Headcount Status : '+ hcstatus) ;
       nlapiSetFieldValue('custrecord_liv_emp_headcount_status', hcstatus );
      
       //var jebatchnumber = 'HC-Livongo';
       var jenumber = 'Headcount 01 Livongo Health, Inc. '+ asofdate ;
       
       nlapiLogExecution('DEBUG','ADP dept code : '+ adpdeptcode) ;
       nlapiLogExecution('DEBUG','ADP location : '+ location) ;
       //nlapiLogExecution('DEBUG','JE Batch Number : '+ jebatchnumber) ;
       nlapiLogExecution('DEBUG','subsidiary : '+ subsidiary) ;
       
       //nlapiSetFieldValue('custrecord_liv_emp_je_batch_number', jebatchnumber );
       //nlapiSetFieldValue('custrecord_liv_emp_stat_journal', jenumber );
       
       //nlapiSetFieldValue('custrecord_liv_emp_as_of_date', today );
    	
       // Update NS Location
       if (location == 'California Office')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_location', 'LIV MV' );
       }
       if (location == 'Chicago Office')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_location', 'LIV CHI' );
       }
       
    
       // Update NS Dept
    
       if (adpdeptcode == '20700')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : HR' );
       }
       if (adpdeptcode == '40700')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'S&M : CIM' );
       }
       if (adpdeptcode == '010100')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'COR : CDE' );
       }
       if (adpdeptcode == '010200')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'COR : Member Support' );
       }
       if (adpdeptcode == '020100')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : CEO & Admin' );
       }
       if (adpdeptcode == '020200')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'COR : CDE' );
       }
       if (adpdeptcode == '020300')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : Finance' );
       }
       if (adpdeptcode == '020400')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : Legal' );
       }
       if (adpdeptcode == '020500')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : Ops' );
       }
       if (adpdeptcode == '020600')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : Supply Chain' );
       }
       if (adpdeptcode == '020700')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : HR' );
       }
       if (adpdeptcode == '020800')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'G&A : Regulatory' );
       }
       if (adpdeptcode == '030100')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'R&D : Clinical DS' );
       }
       if (adpdeptcode == '030200')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'COR : Member Support' );
       }
       if (adpdeptcode == '030400')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'R&D : Product' );
       }
       if (adpdeptcode == '030500')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'R&D : Tech' );
       }
       if (adpdeptcode == '040100')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'S&M : Biz Dev' );
       }
       if (adpdeptcode == '040200')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'S&M : CSM' );
       }
       if (adpdeptcode == '040300')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'S&M : Marketing' );
       }
       if (adpdeptcode == '040500')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'S&M : Payor' );
       }
       if (adpdeptcode == '040600')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'S&M : Sales' );
       }
       if (adpdeptcode == '040700')
       {
         nlapiSetFieldText('custrecord_liv_emp_ns_dept', 'S&M : CIM' );
       }

  }  
} // end function beforeSumit

function asofdate() 
{
var asofdate = new Date();
asofdate.setDate(0); 
var tdate = asofdate.getDate();
var month = asofdate.getMonth() + 1; // jan = 0
var year = asofdate.getFullYear();
return newDate = month + '/' + tdate + '/' + year;
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
    if (inputformat == 'YYYY-MM')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var year = newdate.getFullYear();
     var datestring = year + "-" + ("0" + (newdate.getMonth() + 1).toString()).substr(-2) 

      nlapiLogExecution('DEBUG','datestring : '+ datestring) ;
     
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



   