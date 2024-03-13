function MergeAndSendEmail()
{
//if ((nlapiGetFieldText('custrecordr7nxlicensecontact') != null))
	{
	var author = nlapiGetUser();
	var recipient = nlapiGetFieldValue('custrecordr7nxlicensecontact');
	//var records = nlapiGetFieldValue('internalid');
	//var emailBody = = nlapiMergeRecord( 172, 'contact', recipient).getValue();
	nlapiSendEmail( author, recipient, 'NeXpose License Activation - Product Key', 'emailBody', null, null, null );
	//nlapiSetFieldText('custeventr7taskemailtemplate','');
	}
{	return confirm("Are you sure you want to save this record?");}
}
