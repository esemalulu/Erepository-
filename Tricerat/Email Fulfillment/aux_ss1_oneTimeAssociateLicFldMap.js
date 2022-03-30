
function oneTimeLicRefMap()
{
	var ss = nlapiSearchRecord(null,'customsearch2733',null,null);
	for (var i=0; ss && i < ss.length; i+=1)
	{

		var tlic = ss[i].getValue('custrecord_afa_20160229_license2renew');
		if (tlic && tlic.indexOf('L') > -1)
		{
			tlic = tlic.replace('L','');
			
			//alert(tlic);
			try
			{
				nlapiSubmitField('customrecord_contract_item', ss[i].getValue('internalid'), 'custrecord_afa_license2renew', tlic, false);
			}
			catch (err)
			{
				alert(err.toString());
			}
		}	
	}
}
