/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Aug 2015     brians
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_DealerPortalAutoInactivation(type)
{
	//Only execute when run from the scheduler or in the UI.  Otherwise, return immediately.
	if (type != 'scheduled' && type != 'skipped' && type != 'userinterface' ) return;
	
	var dealer = '';
	
	//The GetDealerInactivationPeriod() method is located in the GrandDesignCommon.js file.
	//It gets the value of the parameter on the GD Preferences suitelet, which is shown on the General Preferences > Custom Preferences tab
	//After this many days of inactivity, the dealer contact's access to the dealer portal will be removed
	var dealerInactivationPeriod = GetDealerInactivationPeriod();
	
	//If no Dealer Inactivation period has been defined, use the default value of 90.
	if(dealerInactivationPeriod == null || dealerInactivationPeriod == '')
		{
		dealerInactivationPeriod = 90;
		}
	
	var todaysDate = new Date();
	var someDaysAgo = new Date();
	someDaysAgo.setDate(todaysDate.getDate() - dealerInactivationPeriod);
	//someDaysAgo.setDate(4);  //Use this to set a specific date, for testing
	
	var contactLoginHistory = nlapiSearchRecord('customer', 'customsearchgd_dealercontactslogin', null, null);	//Get the login history, via a saved search
	
	if(contactLoginHistory != null && contactLoginHistory.length > 0)
	{
		for(var i = 0; i < contactLoginHistory.length; i++)	//Loop through each line of the results
		{							
			var contactResultsColumns = contactLoginHistory[i].getAllColumns();
			var contactDealer = contactLoginHistory[i].getValue(contactResultsColumns[0]);
			var contactEmail = contactLoginHistory[i].getValue(contactResultsColumns[2]);
			var lastLoginDateString = contactLoginHistory[i].getValue(contactResultsColumns[3]);	//Gets the user's last login date as a string, from the search
			var lastLoginDateInMillis = Date.parse(lastLoginDateString);							//Converts that string to a time in milliseconds, which can be
			var lastLoginDate = new Date(lastLoginDateInMillis);									//converted to a javascript Date() object
			
			//If the contact's last login was before the Auto Inactivation period, then their access to the dealer portal will be removed
			if (lastLoginDate < someDaysAgo)
			{
				if(contactDealer != '' && contactDealer != null)
				{
					dealer = nlapiLoadRecord('customer', contactDealer);							//Load the dealer associated with that contact
				}
				
				if(dealer != '' && dealer != null)
				{
					for (var j = 1; j <= dealer.getLineItemCount('contactroles'); j++)
					{
						if(dealer.getLineItemValue('contactroles','email', j) == contactEmail) 			//Finds that contact on the dealer contact list
						{
							if(dealer.getLineItemValue('contactroles','giveaccess', j) == 'T')			//Dont waste time revoking access for contacts who already dont have access
							{
								dealer.setLineItemValue('contactroles', 'giveaccess', j, 'F');			//Removes access
								//nlapiLogExecution('debug', 'Results: ', 'Dealer: ' + contactDealer + ' User: ' + contactEmail + ' - Last Login Date: ' + lastLoginDate + ' - Access: Revoked');
							}
						}
					}
					nlapiSubmitRecord(dealer,null,true);
				}
			}
		} //End of loop performed on each line of search results
	}
}
