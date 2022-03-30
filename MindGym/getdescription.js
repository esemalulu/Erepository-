function getItem()
{
	var lineItemCount = nlapiGetLineItemCount('item');
	for (var i =1; i<= lineItemCount; i++)
	{
		alert (nlapiGetLineItemValue('item', 'item', i));
	}	
}