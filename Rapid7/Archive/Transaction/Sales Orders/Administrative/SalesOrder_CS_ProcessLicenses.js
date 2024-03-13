function processLicenses(){
	
	//Resets all XXX line-items to ''
	//If there are any line items for which we previously tried to, and failed, to create a license for
	//Remove the XXX from the custcolr7translicenseid field in those lineitems
	var noLineItems = nlapiGetLineItemCount('item');
	for(var i=1;i<=noLineItems;i++){
		var value = nlapiGetLineItemValue('item','custcolr7translicenseid',i);
		if(value!=null && value.length>=3){
			if(value.substring(0,3)=='XXX'){
				nlapiSelectLineItem('item',i);
				nlapiSetCurrentLineItemValue('item','custcolr7translicenseid','');
				nlapiCommitLineItem('item');	
			}
		}	
	}
	
	
	//Setting Suspend-AutoCreate License explicitly to false
	nlapiSetFieldValue('custbodyr7salesorderautocreatel','F');
		
}
