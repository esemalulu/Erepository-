/**
 * User library file for Solution Source accounts.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Returns whether or not the current user is logged in via the customer center
 */
function IsCustomerCenter() {
	return (nlapiGetContext().getRoleCenter().toLowerCase() == 'customer');
}