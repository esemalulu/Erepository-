function onBeforeSubmit(type)
{
	try{
	   if ( type == 'create' || type == 'edit')
		{
			nlapiLogExecution('DEBUG', "settermsin months()", "STARTING");
			var lineCount = nlapiGetLineItemCount('item');
			for ( var b=1; b<=lineCount; b++ )
			{
				var terms = nlapiGetLineItemValue('item', 'revrecterminmonths', b);
				nlapiLogExecution('DEBUG', "settermsin months()", "terms: " + terms);
				if(terms == null || terms == '')
				{
					nlapiLogExecution('DEBUG', "settermsin months() ", "setting to 12");
					nlapiSetLineItemValue('item', 'revrecterminmonths', b, '12');
				}
			}
		}
	}
	catch(e)
	{
		nlapiLogExecution('DEBUG', "settermsin months()", "ERROR");
	}
}