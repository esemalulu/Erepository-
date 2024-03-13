function setITHelpMA (type, fld)
{
if ( type == 'create' ) 
{
var origin = nlapiGetUser();
	nlapiSetFieldValue('helpdesk', 'T');
	nlapiSetFieldValue('assigned', 5);
	nlapiSetFieldValue('company',origin);
	nlapiSetFieldValue('custeventr7customercasepriority',1);

}
}