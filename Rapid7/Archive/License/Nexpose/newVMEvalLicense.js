<HTML><META HTTP-EQUIV="content-type" CONTENT="text/html;charset=utf-8">
<PRE>function newVMEvalLicense (type, fld)
{
if ( type == 'create' ) 
{
	/* Sets default expiration to 14 days */
	var defaultExpirationDays = 14;
	var date = new Date();
	var d = nlapiAddDays(date,defaultExpirationDays);
	var dateStringDefault = (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear();
	nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate',dateStringDefault);
	/* Sets default expiration to 20 days */	
	
	nlapiSetFieldValue('custrecordr7nxlicensemodel', 1);
	nlapiSetFieldValue('custrecordr7nxlicensenumberips', '64');
	nlapiSetFieldValue('custrecordr7nxordertype', 6);
	nlapiSetFieldValue('custrecordr7nxlicensesendactivationemail', 'T');
	nlapiSetFieldValue('custrecordr7nxwebscan', 'T');
	nlapiSetFieldValue('custrecordr7nxpolicy', 'T');
	nlapiSetFieldValue('custrecordr7nxmetasploit', 'T');
	nlapiSetFieldValue('custrecordr7nxpolicy', 'T');
}
}


function MergeAndSendEmail()
{
	
	if(nlapiGetFieldValue('custrecordr7nxcommunitylicense')=='T'){nlapiSetFieldValue('custrecordr7nxlicensenumberips',32);}
	if(nlapiGetFieldValue('custrecordr7nxexpress')=='T'){nlapiSetFieldValue('custrecordr7nxmetasploit','F');}
	
	
	//ipRestrictions 256
	var ipRestrictions = 256;
	if (( nlapiGetFieldValue('custrecordr7nxlicensenumberips') &gt; ipRestrictions))
	{
	nlapiSetFieldValue('custrecordr7nxlicensenumberips', ipRestrictions);
	confirm("Your IP total has been limited to " + ipRestrictions + ".  Please see a manager to override this IP limit.");
	}
	
	
	/* Checks if license is within expiration date */ 
	var daysLimited = 30;
	var date = new Date();
	var expLimit = nlapiAddDays(date,daysLimited);
	var expLimitString = (expLimit.getMonth()+1)+"/"+expLimit.getDate()+"/"+expLimit.getFullYear();
	var expDate = nlapiGetFieldValue('custrecordr7nxlicenseexpirationdate');
	if(expDate!=null){expDate = nlapiStringToDate(expDate);}
	
	if (expDate &gt; expLimit){
		nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate', expLimitString);
		return confirm("Your expiration date has been limited to " + daysLimited + " days.  Please see a manager to override this limit.");
	}	
	/* Checks if license is within expiration date */
	
	

//if ((nlapiGetFieldValue('custrecordr7nxlicensesendactivationemail') == 'T'))
//	{
//	var author = nlapiGetUser();
//	var recipient = nlapiGetFieldValue('custrecordr7nxlicensecontact');
//	var recType = nlapiGetRecordType();
//	var recordID = nlapiGetRecordId(); 
//	var records = new Object();
//	records.recordType = recType;
//	records.record = recordID;
	//	var emailBody = nlapiMergeRecord( 172, recType, recordID, null, null, null );
//	var emailBody = records;
//	nlapiSendEmail( author, recipient, 'NeXpose License Activation', emailBody, null, null, records );
//	nlapiSetFieldValue('custrecordr7nxlicensesendactivationemail',null);
//	}
{ return confirm("Are you sure you want to save this record?");}

}</PRE>