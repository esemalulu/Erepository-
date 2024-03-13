function setNSHelp (type, fld)
{
if ( type == 'create' ) 
{
var origin = nlapiGetUser();
	nlapiSetFieldValue('helpdesk', 'T');
	nlapiSetFieldValue('custeventr7netsuitecase', 'T');
	nlapiSetFieldValue('assigned', 2);
	nlapiSetFieldValue('company',origin);
}
}