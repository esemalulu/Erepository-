function newPreSalesEvalLicense (type, fld)
{
if ( type == 'create' ) 
{
	/* Sets default expiration to 20 days */
	//alert('Eval Presales');
	var defaultExpirationDays = 20;
	var date = new Date();
	var d = nlapiAddDays(date,defaultExpirationDays);
	var dateStringDefault = (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear();
	nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate',dateStringDefault);
	/* Sets default expiration to 20 days */
	
	nlapiSetFieldValue('custrecordr7nxlicensemodel', 1);
	nlapiSetFieldValue('custrecordr7nxlicensenumberips', '256');
	nlapiSetFieldValue('custrecordr7nxordertype', 2);
	nlapiSetFieldValue('custrecordr7nxwebscan', 'T');
	nlapiSetFieldValue('custrecordr7nxpolicy', 'T');
	nlapiSetFieldValue('custrecordr7nxlicensevirtualization', 'T');
	nlapiSetFieldValue('custrecordr7nxlicenseadvancedpolicyeng', 'T');

}

if (type == 'edit'){
	
	var oT = nlapiGetFieldText('custrecordr7nxordertype'); 
	if (oT!= 'Evaluation' && oT!='Evaluation - VM' && oT!='R7 Internal Use'){
		alert("Your role does not allow for editing a non-evaluation license.");
		var url = nlapiResolveURL('RECORD',nlapiGetRecordType(), nlapiGetRecordId());
		window.location = url;
	}
}

}

function savePreSalesLicense (type, fld)
{
	
	if(nlapiGetFieldValue('custrecordr7nxcommunitylicense')=='T'){nlapiSetFieldValue('custrecordr7nxlicensenumberips',32);}
	if(nlapiGetFieldValue('custrecordr7nxexpress')=='T'){nlapiSetFieldValue('custrecordr7nxmetasploit','F');}
	
	
	//IPRestrictions
	var ipRestrictions = 65536;
	if ( nlapiGetFieldValue('custrecordr7nxlicensenumberips') > ipRestrictions)
	{
	nlapiSetFieldValue('custrecordr7nxlicensenumberips', ipRestrictions);
	confirm("Your IP total has been limited to " + ipRestrictions + ".  Please see a manager to override this IP limit.");
	}

	/* Checks if license is within expiration date */ 
	var daysLimited = 365;
	var date = new Date();
	var expLimit = nlapiAddDays(date,daysLimited);
	var expLimitString = (expLimit.getMonth()+1)+"/"+expLimit.getDate()+"/"+expLimit.getFullYear();
	var expDate = nlapiGetFieldValue('custrecordr7nxlicenseexpirationdate');
	if(expDate!=null){expDate = nlapiStringToDate(expDate);}
	
	if (expDate > expLimit){
		nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate', expLimitString);
		return confirm("Your expiration date has been limited to " + daysLimited + " days.  Please see a manager to override this limit.");
	}	
	/* Checks if license is within expiration date */
	
	{return confirm("Do you want to save this record?");}
}
