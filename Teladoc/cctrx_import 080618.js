/* NETSUITE-58 */
/* Last Updated: 09-Oct-2017 New Script */
/* Last updated: 01-Nov-2017 NS-72 */
/* Last updated: 04-Dec-2017 NS-93 */
/* Last updated: 11-Apr-2018 NS-143 */
/* Last updated: 06-Aug-2018 NS-187 */

function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
      
      // Search record existence in custom record
       var arrFilter = new Array(); 
       var refnumber = nlapiGetFieldValue('custrecord_liv_cc_ref_number');
       var controlcard = nlapiGetFieldValue('custrecord_liv_cc_control_card');
       var activityfor = nlapiGetFieldValue('custrecord_liv_cc_activity_for');
       var rec_exist = 0;
        
       var searchrefnumber = refnumber + activityfor ; //NS72 
       

	   arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cc_ref_number', null, 'is',  searchrefnumber );  //NS-72
	   arrFilter[1] = new nlobjSearchFilter('custrecord_liv_cc_ns_je_internal_id', null, 'isempty',  'null' );   //080618
	   arrFilter[2] = new nlobjSearchFilter('custrecord_liv_cc_expense_acct', null, 'isempty', 'null' );  //080618
	   
	 //  arrFilter[1] = new nlobjSearchFilter('custrecord_liv_cc_control_card', null, 'is',  controlcard ); 

	    //Define search columns
	
	    var arrColumns = new Array();
	
		arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ref_number'));
	    arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ns_je_internal_id'));
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_cc_trxs', null, arrFilter, arrColumns);
		
		nlapiLogExecution('DEBUG','Reference number:'+ refnumber) ;
	
		

       if(arrResult) //  found - delete records first
        {
           nlapiLogExecution('DEBUG','arrResult:'+ arrResult.length) ;
           
           rec_exist = 1;
           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
           var refnumber = current_rec.getValue('custrecord_liv_cc_ref_number');
       
           
        }
        else
        {
              nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
              processRecords(type) ;
        }
        
        if (rec_exist == 1)
        {
           throw nlapiCreateError('Record Exists', 'Reference number already exists in Credit Card Transactions');
           //throw 'Reference number already exists in Credit Card transactions';
        }

  }
  
  // NS-93 prevent inline edit

  if ( (type == 'xedit') &&  (nlapiGetContext().getExecutionContext() != 'csvimport'))
  {
    var newrec = nlapiGetNewRecord();
    var locked = nlapiLookupField(newrec.getRecordType(), newrec.id, 'custrecord_liv_cc_ns_je_internal_id');

    if(locked) 
    {
       throw "You cannot edit this record.  Journal has been created.";
    }
   }

} // end function beforeSumit




function processRecords(type)
{   

      var newId = nlapiGetRecordId();
      var newType = nlapiGetRecordType();
      var trxdetail = nlapiGetFieldValue('custrecord_liv_cc_trx_detail');
      var activityfor = nlapiGetFieldValue('custrecord_liv_cc_activity_for');
      var postdate = nlapiGetFieldValue('custrecord_liv_cc_post_date');
      var controlacct = nlapiGetFieldText('custrecord_liv_cc_control_account');
      var refnumber = nlapiGetFieldValue('custrecord_liv_cc_ref_number');
      
      var periodno = convertdate(postdate,'YYYY-MM');
      var jename = controlacct + ' ' + postdate ;
      
      var newrefnumber = refnumber + activityfor ;  //NS-72
      
      nlapiSetFieldValue('custrecord_liv_cc_ns_je_memo',trxdetail);
      nlapiSetFieldValue('custrecord_liv_cc_period_no',periodno);
      nlapiSetFieldValue('custrecord_liv_cc_ns_je_no',jename);
      nlapiSetFieldValue('custrecord_liv_cc_ref_number',newrefnumber);
      
      // Default Department //
      
      if (activityfor == '...0822')
      {
        nlapiSetFieldValue('custrecord_liv_cc_dept',11);  //01 Clinical DS
      }
      if (activityfor == '...2701')
      {
        nlapiSetFieldValue('custrecord_liv_cc_dept',23);  //01 IT
      }
      if (activityfor == '...5872')
      {
        nlapiSetFieldValue('custrecord_liv_cc_dept',18);  //01 Payor
      }
      if (activityfor == '...5906')
      {
        nlapiSetFieldValue('custrecord_liv_cc_dept',13);  //01 Tech
      }
      // NS-143
      if (activityfor == '...3711')
      {
        nlapiSetFieldValue('custrecord_liv_cc_dept',27);  //HR
      }
      if (activityfor == '...4175')
      {
        nlapiSetFieldValue('custrecord_liv_cc_dept',16);  //Marketing
      }
   

} //end processRecords



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


function nvl(value1, value2)
{
  if (value1 == null)
  {
    return value2;
  }
  else
  { 
    return value1 ;
  }
}
   
function cleanString(input) 
{
    var output = "";
    for (var i=0; i<input.length; i++) {
        if (input.charCodeAt(i) <= 127) {
            output += input.charAt(i);
        }
    }
    return output;
}
   
   
   
   

   