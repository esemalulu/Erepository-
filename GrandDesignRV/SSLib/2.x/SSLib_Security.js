/**
 * User libary file for Solution Source accounts.
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/runtime'],

/**
 * @param {runtime} runtime
 */
function(runtime) {
   
	/**
	 * Returns whether or not the current user is logged in via the customer center
	 */
	function isCustomerCenter()
	{
		return (runtime.getCurrentUser().roleCenter.toLowerCase() == 'customer');
	}
	
    return {
    	isCustomerCenter: isCustomerCenter
    };
    
});
