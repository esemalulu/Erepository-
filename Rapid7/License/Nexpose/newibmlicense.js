function newIBMLicense (type)
{
if (type == 'create')	
{
	//custrecordr7nxnumberengines                 
	nlapiSetFieldValue('custrecordr7nxnumberengines',1000);
	nlapiSetFieldValue('custrecordr7nxlicensemodel', 1);
	nlapiSetFieldValue('custrecordr7nxlicensenumberips', '16777214');
	nlapiSetFieldValue('custrecordr7nxordertype', 1);
	nlapiSetFieldValue('custrecordr7nxwebscan', 'T');
	nlapiSetFieldValue('custrecordr7nxpolicy', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensepcitemplate', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensediscoverylicense', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensemultitenancy', 'T');
	nlapiSetFieldValue('custrecordr7nxlicenseenginepool', 'T');
	nlapiSetFieldValue('custrecordr7nxscada', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensenumberhostedips', '0');
	nlapiSetFieldValue('custrecordr7nxlicensevirtualization', 'T');
	nlapiSetFieldValue('custrecordr7nxlicenseadvancedpolicyeng', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensecustompolicies', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensefdcc', 'T');
	nlapiSetFieldValue('custrecordr7nxlicenseusgcb', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensecsvrichdataexport', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensepolicyeditor', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensecis', 'T');
	nlapiSetFieldValue('custrecordr7nxdisa', 'T');
	nlapiSetFieldValue('custrecordr7nxlic_enableproductupdates', 'T');
	nlapiSetFieldValue('custrecordr7nxlic_enablecontentupdates', 'T');

	/* default expiration to 365 days */ 
	//var defaultExpirationDays = 365;
	//var date = new Date();
	//var d = nlapiAddDays(date,defaultExpirationDays);
	//var dateStringDefault = (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear();
	var dateStringDefault = "11/20/2017";
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
	var dateStringDefault = "11/20/2017";
	nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate',dateStringDefault);
	var orderType = nlapiGetFieldValue('custrecordr7nxordertype');
	if(orderType==1||orderType==2){
		return true;	
	}else{
		alert("OrderType can only be Purchasing/Evaluation");
		return false;
	}	
}

