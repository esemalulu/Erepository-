function pageInit()
{
if ((nlapiGetFieldText('custeventr7supporttier') == '')){nlapiSetFieldText('custeventr7supporttier','Tier 1');}
nlapiDisableField('custeventr7supporttier', true);
}