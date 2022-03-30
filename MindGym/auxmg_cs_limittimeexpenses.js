function limitexp_OnSave() {

/**
*Unrelated to Time and Expenses the below portion simply copies the Bookings "End Date"
*so that its available for workflow condition formula's since the Bookings "End Date" doesn't display
*/	

 var mainEndDate = nlapiGetFieldValue('enddate');     
 nlapiSetFieldValue('custentity_bo_booking_enddatecopy', mainEndDate);
	 

/**
 * 6/24/2015 - Audaxium Update
 *  Based on Spicework Ticket #1431, Where booking were not able to be viewed 
 *  under the Expense Report because the checkbox
 *  "Limit Time and Expenses To Resources" was automatically checked off. 
 */	
	
//Grab the value from the Job Type	field
 var jbtype = nlapiGetFieldValue('jobtype');

/**If Job Type field equals (11)Face to Face, (12)License or (13)Virtual 
*   set the "Limit Time and Expenses To Resources" check box to false
*   or else set the value to True
*/
  if (jbtype == '11' || jbtype == '12' || jbtype == '13' ){
	  
	nlapiSetFieldValue('limittimetoassignees', 'F');	

  }
  else{
	  
	nlapiSetFieldValue('limittimetoassignees', 'T');
	
  }
   return true;    
   

}






















