function expire()
{
var yesterday = ( (new Date()).getDate()-1 );
nlapiSetFieldValue('custrecordr7nxlicenseexpirationdate',yesterday);
}
