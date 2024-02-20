/**
 * Suitelet that simply redirects the user to a custom record.
 * Provide the url of the custom record (or list) in the suitelet parameter
 * Pull the base url from the company preferences based on the environment
 * 
 * This is used to create deployment links containing different url parameters to custom
 * records that are a part of a bundle. Allows us to set up a custom center type with links 
 * to custom records that are normally wiped when the bundle is pushed.
 * 
 * @param request
 * @param response
 */
function GD_RedirectLinks_Suitelet(request, response)
{
	var urlParam = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_redirectlinksuitlet_url');
	var html = '<html><body><meta http-equiv="refresh" content="0; URL=' + urlParam +'" /></body></html>';
	response.write(html);
}