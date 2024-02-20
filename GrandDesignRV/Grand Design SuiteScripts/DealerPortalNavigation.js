/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Nov 2013     ibrahima
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function DealerPortalNavigateTo(request, response)
{
	var context = nlapiGetContext();
	var type  = context.getSetting('SCRIPT', 'custscriptnavigatetotype');
	var primaryIdentifier = context.getSetting('SCRIPT', 'custscriptnavtypeprimaryidentifier');
	var secondaryIdentifier = context.getSetting('SCRIPT', 'custscriptnavtypesecondaryidentifier');
	var jsonArrayString = context.getSetting('SCRIPT', 'custscriptjsonformattedstringarray');
	var params = null;
	
	if(secondaryIdentifier == '')
		secondaryIdentifier = null;

	if(jsonArrayString != null && jsonArrayString != '')
	{
		var jsonArray = JSON.parse(jsonArrayString);
		params = GetParameterArray(jsonArray);	
	}
			
	nlapiSetRedirectURL(type, primaryIdentifier, secondaryIdentifier, null, params);
}

/**
 * Gets array with the properties from jsonArray.
 * @param jsonArray
 * @returns
 */
function GetParameterArray(jsonArray)
{
	var params = null;
	if(jsonArray != null && jsonArray.length > 0)
	{
		params = new Array();
		
		//Loop through json array
		for(var i = 0; i < jsonArray.length; i++)
		{
			//get json object
			var jsonObject = jsonArray[i];
			//loop through object properties and add them to our array.
			for (prop in jsonObject) 
			{
			    if (jsonObject.hasOwnProperty(prop)) 
			    {
			        params[prop] = jsonObject[prop];
			    }
			}
		}
	}
	
	return params;
}