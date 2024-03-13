function setITHelpCA (type, fld)
{
if ( type == 'create' ) 
{
var origin = nlapiGetUser();
	nlapiSetFieldValue('helpdesk', 'T');
	nlapiSetFieldValue('assigned', 23207);
	nlapiSetFieldValue('company',origin);
}
}