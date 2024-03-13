function newSymphonyLicense (type)
{
	if(type=='copy'){
	nlapiSetFieldValue('custrecordr7nxproductkey','');
	nlapiSetFieldValue('custrecordr7nxproductkey','');
	nlapiSetFieldValue('custrecordr7nxproductserialnumber','');
	}
	
{				
                nlapiSetFieldValue('custrecordr7nxlicensemodel', 1);
                nlapiSetFieldValue('custrecordr7nxlicensenumberips', '5000');
                nlapiSetFieldValue('custrecordr7nxlicensenumberhostedips', '50');
                nlapiSetFieldValue('custrecordr7nxnumberengines', '50');
                nlapiSetFieldValue('custrecordr7nxordertype', 3);
                nlapiSetFieldValue('custrecordr7nxwebscan', 'T');
                nlapiSetFieldValue('custrecordr7nxpolicy', 'T');
                nlapiSetFieldValue('custrecordr7nxlicensepcitemplate', 'T');
                nlapiSetFieldValue('custrecordr7nxlicensediscoverylicense', 'T');
                nlapiSetFieldValue('custrecordr7nxscada', 'T');
                nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate', '12/31/2014');
                nlapiSetFieldValue('custrecordr7nxlicenseoemstartdate', '01/01/2004');
}

{	return confirm("Are you sure you want to save this record?");}

}