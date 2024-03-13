/*
 * @author efagone
 */


function fieldChanged(list,field,linenum){
	
	if (list == 'custpage_approval_results' && field == 'custpage_approve') {
		approve = nlapiGetLineItemValue(list, 'custpage_approve', linenum);
		
		if (approve == 'T') {
			nlapiSetLineItemValue(list, 'custpage_reject', linenum, 'F');
		}
	}
	
	if (list == 'custpage_approval_results' && field == 'custpage_reject') {
		reject = nlapiGetLineItemValue(list, 'custpage_reject', linenum);
		
		if (reject == 'T') {
			nlapiSetLineItemValue(list, 'custpage_approve', linenum, 'F');
		}
	}
}

function saveRecord(){
	var approverLineCount = nlapiGetLineItemCount('custpage_approval_results');
	var isRejected = false;
	var commentedAdded = false;
	for(var i=1;i<=approverLineCount;i++){
		var reject = nlapiGetLineItemValue('custpage_approval_results', 'custpage_reject', i);
		if (reject == 'T'){
			isRejected = true;
		}
		var comments = nlapiGetLineItemValue('custpage_approval_results', 'custpage_comments', i);
		comments = comments.trim();
		if(comments !== "" && comments != null){
			commentedAdded = true;
		}
	}
	//alert('isRejected= '+ isRejected + 'commentedAdded = '+ commentedAdded);
	if(isRejected && !commentedAdded){
		alert('Comments field is mandatory for quote rejections for at least one approval rule.')
		return false;
	}
	return true;
}