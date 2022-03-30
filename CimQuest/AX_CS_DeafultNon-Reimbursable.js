
/**
 *  Default Expense Report Non-Reimbursable Field to True
 * @appliedtorecord Expense Report
 *   
 * @param {String} type Sublist internal id
 * @returns {Void}

*/

//Define the action that the user is taking. This script ONLY runs in CREATE
var userAction = '';



function pageInit_rec(type) {
	
	userAction = type;
	
	lineInit_rec('expense');
}










function lineInit_rec(recType)
{	
	
	if(userAction == 'create'){
		
		
		if (recType == 'expense') {
		      
		 	var setVal = nlapiGetCurrentLineItemValue(recType, 'isnonreimbursable');   
	        
			if (setVal == 'F') {
	            nlapiSetCurrentLineItemValue(recType, 'isnonreimbursable', 'T');
	        }

	    }	
		
		
	}
			
	 
								
}









