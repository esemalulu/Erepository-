function newSymLicense (type)
{
if (type == 'create')	
{
	//custrecordr7nxnumberengines                 
	nlapiSetFieldValue('custrecordr7nxnumberengines',9999);
	nlapiSetFieldValue('custrecordr7nxlicensemodel', 1);
	nlapiSetFieldValue('custrecordr7nxlicensenumberips', '1000');
	nlapiSetFieldValue('custrecordr7nxordertype', 1);
	nlapiSetFieldValue('custrecordr7nxwebscan', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensepcitemplate', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensediscoverylicense', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensecsvrichdataexport', 'T');
	nlapiSetFieldValue('custrecordr7nxlicenseadvancedpolicyeng', 'T');
	nlapiSetFieldValue('custrecordr7nxlicenseenginepool', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensevirtualization', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensecustomreporting', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensefdcc', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensecis', 'T');
	nlapiSetFieldValue('custrecordr7nxdisa', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensepolicyeditor', 'T');
	nlapiSetFieldValue('custrecordr7nxlicenseusgcb', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensecustompolicies', 'T');
	nlapiSetFieldValue('custrecordr7nxpolicy', 'T');
	nlapiSetFieldValue('custrecordr7nxlic_enableproductupdates', 'T');
	nlapiSetFieldValue('custrecordr7nxlic_enablecontentupdates', 'T');
	/* default expiration to 365 days */ 
	var defaultExpirationDays = 365;
	var date = new Date();
	var d = nlapiAddDays(date,defaultExpirationDays);
	var dateStringDefault = (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear();
	nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate',dateStringDefault);
	
	                 
	/* Sets default expiration to 365 days */	

}
if(type=='copy'){
	nlapiSetFieldValue('custrecordr7nxproductkey','');
	nlapiSetFieldValue('custrecordr7nxlicenseserialnumber','');
	nlapiSetFieldValue('custrecordr7nxproductserialnumber','');
}

}

function saveRecord(){
	var orderType = nlapiGetFieldValue('custrecordr7nxordertype');
	if(orderType==1||orderType==2){
		return true;	
	}else{
		alert("OrderType can only be Purchasing/Evaluation");
		return false;
	}	
}