
function service(request, response)
{
	'use strict';
	try
	{
		require('SuiteCommerce.CustomFields.Checkout.ServiceController').handle(request, response);
	}
	catch(ex)
	{
		console.log('SuiteCommerce.CustomFields.Main.ServiceController ', ex);
		var controller = require('ServiceController');
		controller.response = response;
		controller.request = request;
		controller.sendError(ex);
	}
}
