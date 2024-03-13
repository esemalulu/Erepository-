function newSymphonyLicense (type, fld)
{
if ( type == 'create' )       
{				
				nlapiSetFieldValue('custrecordr7nxlicensecontact',259170);
                nlapiSetFieldValue('custrecordr7nxlicensecustomer',259166);
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
				
				alert(nlapiGetFieldText('custrecordr7nxlicensecontact'));
}
}

function saveRecord(){
	nlapiSetFieldValue('custrecordr7nxlicensecontact',259170);
	nlapiSetFieldValue('custrecordr7nxlicensecustomer',259166);
	return true;
}

function postSource(){
				nlapiSetFieldValue('custrecordr7nxlicensecontact',259170);
                nlapiSetFieldValue('custrecordr7nxlicensecustomer',259166);
	
}
