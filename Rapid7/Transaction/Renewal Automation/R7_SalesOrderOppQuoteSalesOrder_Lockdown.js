function lineInit(){
	var user = nlapiGetUser();
	if(user==117670){
		alert("lineInit");
		var itemIid = nlapiGetLineItemValue('item','item',nlapiGetCurrentLineItemIndex());
		alert(itemIid);
		var lockDownMatrix = loadLockedDownFieldsForItem(itemIid);
			
	}
}




function loadLockedDownFieldsForItem(itemIid){
	var fieldsToLookup = new Array(
	'custitemlockquantity',
	'custitemlockdescription',
	'custitemlockpricelevel',
	'custitemlockrate',
	'custitemlockamount'
	);
	var resultFields = nlapiLookupField('item',itemIid,fieldsToLookup);
	return resultsFields;
} 
