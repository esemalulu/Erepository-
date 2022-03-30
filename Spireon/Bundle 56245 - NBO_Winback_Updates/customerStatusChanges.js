function LostCustomersNBOC()
{
	//retrieve results from saved search with internal id 11025
	var closedCustomers1 = nlapiSearchRecord('transaction', 11025);
	//if the search is not empty
	if (closedCustomers1 != null)
	{
		//for each search result
		for (var i=0; i < closedCustomers1.length; i++)
		{
			//set the customer status to lost and substatus to nbo churn  
			nlapiSubmitField('customer', closedCustomers1[i].getValue('internalid', 'customer', 'group'), ['entitystatus','custentity316'], ['16','59'], false);
		}
	}
}

function CurrentCustomersAR()
{
	//retrieve results from saved search with internal id 13053
	var closedCustomers2 = nlapiSearchRecord('transaction', 13053);
	//if the search is not empty	
	if (closedCustomers2 != null)
	{
		//initiate daysSinceSale variable
		var daysSinceSale = 0;
		//initiate avgDaysToPurchase variable
		var avgDaysToPurchase = 0;
		//for each search result		
		for (var j=0; j < closedCustomers2.length; j++)
		{
			//retrieve the customer days since last sale
			daysSinceSale = closedCustomers2[j].getValue('trandate', null, 'max');
			//retrieve the customer purchase pattern
			avgDaysToPurchase = closedCustomers2[j].getValue('custentity_absi_avg_days_to_purchase', 'customer', 'group');
			//if the customers has exceeded purchase pattern by 1 day
			if ((daysSinceSale - 1) > avgDaysToPurchase)
			{
				//set the customer status to current and substatus to at risk
				nlapiSubmitField('customer', closedCustomers2[j].getValue('internalid', 'customer', 'group'), ['entitystatus','custentity316'], ['13','61'], false);
			}
		}
	}
}

function LostCustomersOOPP()
{
	//retrieve results from saved search with internal id 11065
	var closedCustomers3 = nlapiSearchRecord('transaction', 11065);
	//if the search is not empty	
	if (closedCustomers3 != null)
	{
		//initiate daysSinceSale variable
		var daysSinceSale = 0;
		//initiate avgDaysToPurchase variable
		var avgDaysToPurchase = 0;
		//for each search result		
		for (var k=0; k < closedCustomers3.length; k++)
		{
			//retrieve the customer days since last sale
			daysSinceSale = closedCustomers3[k].getValue('trandate', null, 'max');
			//retrieve the customer purchase pattern
			avgDaysToPurchase = closedCustomers3[k].getValue('custentity_absi_avg_days_to_purchase', 'customer', 'group');
			//if the customers has exceeded purchase pattern by 60 days
			if ((daysSinceSale - 60) > avgDaysToPurchase)
			{
				//set the customer status to lost and substatus to out of purchase pattern
				nlapiSubmitField('customer', closedCustomers3[k].getValue('internalid', 'customer', 'group'), ['entitystatus','custentity316'], ['16','32'], false);
			}
		}
	}	
}