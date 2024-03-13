function saveRecord(){
	

	//alert(nlapiGetFieldValue('probability'));
	//alert(nlapiGetFieldValue('salesrep'));
	//alert(nlapiGetContext().getUser());
	//alert(nlapiGetUser());


	if(nlapiGetFieldValue('salesrep')==nlapiGetContext().getUser()){
	
	var probability = nlapiGetFieldValue('probability');
	var reason = nlapiGetFieldText('winlossreason');
	
	if (probability=='0.0%' && reason.length<1){
		alert(" Please fill in Win Loss Reason");
		return false;
	}
	else{ return true;}
	
	}
	else{return true;}
}