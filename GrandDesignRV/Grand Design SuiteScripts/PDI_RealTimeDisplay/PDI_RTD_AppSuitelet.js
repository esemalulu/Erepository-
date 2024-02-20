/**
 * The main wrapper suitelet for the PDI Real-Time Display Suitelet.
 * 
 * Version    Date            Author           Remarks
 * 1.00       1 Mar 2017     brians
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function pdiRtdAppSuitelet(request, response){
	var context = nlapiGetContext();
		
	if (request.getMethod() == 'GET') 
	{
		var setting_roleId = nlapiGetContext().getSetting('SCRIPT','custscriptpdi_rtd_consumerkey');
		var setting_consumer_key = nlapiGetContext().getSetting('SCRIPT','custscriptpdi_rtd_consumersecret');
		var setting_consumer_secret = nlapiGetContext().getSetting('SCRIPT','custscriptpdi_rtd_roleid');
		
		//nlapiLogExecution('debug', 'CO : Bundle : Environment', setting_roleId + ' : ' + setting_consumer_key + ' : ' + setting_consumer_secret );
		
		// get data center safe url by loading the deployment and parsing the external url
		var script = {
				id: context.getScriptId(),
				deploymentId: context.getDeploymentId()
			 };
		// Get both of the Proxy External URL's and also set the datacenter domain stuff at the same time
		var deployResults = nlapiSearchRecord('scriptdeployment',null,[new nlobjSearchFilter('scriptid', 'script', 'is', 'customscriptpdi_rtd_restproxysuitelet')],[new nlobjSearchColumn('internalid')]);
		if(deployResults != null && deployResults.length > 0)
		{
			var deployRec = nlapiLoadRecord('scriptdeployment', deployResults[0].getId());
			var url =  deployRec.getFieldValue('externalurl'); //suitelet full external url
		
			//parse the url to get different domains.
			var suiteletDomain = url.substring(0,url.indexOf('/app'));
			var systemDomain = url.substring(0,url.indexOf('/app')).replace('forms','system');
			var restDomain = url.substring(0,url.indexOf('/app')).replace('forms','rest');
		}
	
		deployResults = nlapiSearchRecord('scriptdeployment',null,[new nlobjSearchFilter('scriptid', 'script', 'is', 'customscriptpdi_rtd_gettokenproxysuite')],[new nlobjSearchColumn('internalid')]);
		if(deployResults != null && deployResults.length > 0)
		{
			var deployRec = nlapiLoadRecord('scriptdeployment', deployResults[0].getId());
			var getTokenUrl = deployRec.getFieldValue('externalurl'); //suitelet full external url
		}
		
		// Build the URL relative to path to avoid installation parameters
		// Dev Accounts (source accounts) assuming the same folder will exist in the filecabinet Web Hosting Files/Live Hosting Files location so that this relative
		// url will work.  In dev, the bundleId will be empty so that part of the url will be omitted.
	    //nlapiLogExecution('debug', 'CO : Bundle : Environment', context.getCompany() + ' : ' + context.getBundleId() + ' : ' + context.getEnvironment() );
		
		var rootURL = suiteletDomain +  '/c.' + context.getCompany() + '/';
		if(context.getBundleId() && context.getBundleId() !== '')
			rootURL = rootURL + 'suitebundle' + context.getBundleId() + '/';
		
		var htmlHead = '<html class="ui-mobile"><head>'
			+ '<title>Grand Design PDI Real-Time Display App</title>'
			+ '<meta charset="utf-8"/>'
			+ '<meta name="apple-mobile-web-app-capable" content="yes" /> '
			+ '<meta name="viewport" content="user-scalable=no, width=device-width" /> '
			+ '<link rel="apple-touch-icon" href="./apple-touch-icon.png" /> '
			+ '<link rel="apple-touch-startup-image" href="./startup.png" />  '
			
			// jquery 1.11.2.min
			//+ '<script type="text/javascript" src="' + rootURL + 'PDI_RealTimeDisplay/jquery-1.11.2.min.js"></script>'
			+ '<script type="text/javascript" src="https://system.na2.netsuite.com/core/media/media.nl?id=2422322&c=3598857&h=a81ebb7fcc9612cc7290&_xt=.js"></script>'
			
			// knockout-3.3.0.js
			//+ '<script type="text/javascript" src="' + rootURL + 'PDI_RealTimeDisplay/knockout-3.3.0.js"></script>'
			+ '<script type="text/javascript" src="https://system.na2.netsuite.com/core/media/media.nl?id=2422325&c=3598857&h=316377be3dec3b6d656f&_xt=.js"></script>'

			// jquery mobile
			//+ '<script type="text/javascript" src="' + rootURL + 'PDI_RealTimeDisplay/jquery.mobile-1.4.5.min.js"></script>'
			+ '<script type="text/javascript" src="https://system.na2.netsuite.com/core/media/media.nl?id=2422323&c=3598857&h=65036eb2669a7421e4a1&_xt=.js"></script>'
			
			// jquery.mobile-1.4.5.min.css
			//+ '<link href="' + rootURL + 'PDI_RealTimeDisplay/css/jquery.mobile-1.4.5.min.css" rel="stylesheet" type="text/css" />'
			+ '<link href="https://system.na2.netsuite.com/core/media/media.nl?id=2422327&c=3598857&h=7bd7ef1f131e5de65f54&_xt=.css" rel="stylesheet" type="text/css" />'
			
			// jquery.mobile.icons.min.css
			//+ '<link href="' + rootURL + 'PDI_RealTimeDisplay/css/jquery.mobile.icons.min.css" rel="stylesheet" type="text/css" />'
			+ '<link href="https://system.na2.netsuite.com/core/media/media.nl?id=2422328&c=3598857&h=9ae929b9d2939a375358&_xt=.css" rel="stylesheet" type="text/css" />'
			
			// jquery.mobile.structure-1.4.5.min.css
			//+ '<link href="' + rootURL + 'PDI_RealTimeDisplay/css/jquery.mobile.structure-1.4.5.min.css" rel="stylesheet" type="text/css" />'
			+ '<link href="https://system.na2.netsuite.com/core/media/media.nl?id=2422330&c=3598857&h=9575d14bd4358e9e5099&_xt=.css" rel="stylesheet" type="text/css" />'

			// PDI_RTD_style.css 
			//+ '<link href="' + rootURL + 'PDI_RealTimeDisplay/css/PDI_RTD_style.css" rel="stylesheet" type="text/css" />'	
			+ '<link href="https://system.na2.netsuite.com/core/media/media.nl?id=2421920&c=3598857&h=d6b644ba1c558116128a&_xt=.css" rel="stylesheet" type="text/css" />'

			// Global parameters to give access to javascript in page
			+ '<script>  function BlockMove(event) { event.preventDefault() ; } ' 
			//+ 'var GLOBAL_MAIN_PAGE = "' + rootURL + 'PDI_RealTimeDisplay/PDI_RTD_Main.htm"; '
			+ 'var GLOBAL_MAIN_PAGE = "https://forms.na2.netsuite.com/core/media/media.nl?id=2422020&c=3598857&h=6c33af8a89588831be9d&_xt=.html"; '
			+ 'var GLOBAL_ACCOUNT_ID = "' + context.getCompany() + '"; ' 
			+ 'var GLOBAL_REST_URL = "' + restDomain + '"; ' 
			+ 'var GLOBAL_PROXY_REST = "' + url + '"; ' 
			+ 'var GLOBAL_PROXY_TOKEN = "' + getTokenUrl + '"; ' 
			+ 'var GLOBAL_CONSUMER_KEY = "' + setting_consumer_key + '"; ' 
			+ 'var GLOBAL_CONSUMER_SECRET = "' + setting_consumer_secret + '";'
			+ 'var GLOBAL_ROLE_ID = "' + setting_roleId + '"; </script>' 
			
			// TokenAuthenticationClient.js
			 //+ '<script type="text/javascript" src="' + rootURL + 'PDI_RealTimeDisplay/PDI_RTD_TokenAuthenticationClient.js"></script>'
			 + '<script type="text/javascript" src="https://system.na2.netsuite.com/core/media/media.nl?id=2422120&c=3598857&h=2d427d9f6375e9567727&_xt=.js"></script>'
			
			// PDI_RTD_ViewModel.js
			 //+ '<script type="text/javascript" src="' + rootURL + 'PDI_RealTimeDisplay/PDI_RTD_ViewModel.js"></script>'
			 + '<script type="text/javascript" src="https://system.na2.netsuite.com/core/media/media.nl?id=2422220&c=3598857&h=a116789a3080be21d454&_xt=.js"></script>'

//			//+ 'https://system.netsuite.com/c.' + nlobjContext.getCompany() '/SuiteBundles/bundle' +  nlobjContext.getBundleId() + ''/<folder>/<subfolder>/<file>.<ext>
//			/* override Loader to set image path */
			+' <style> .ui-icon-loading {background: url("https://system.na2.netsuite.com/core/media/media.nl?id=2421818&c=3598857&h=fb7884981881f28ee509");	background-size: 2.875em 2.875em;} </style>'		
		
			+ '</head>';
		response.write(htmlHead);
		
		var htmlMain = 	'<body class="pdi-body"> ' +
						//This "#create-rtd-page" div will have the contents of GLOBAL_MAIN_PAGE loaded into it on document.ready of the ViewModel
						'<div data-role="page" id="create-rtd-page"> ' +
						'</div> <!-- end page -->' +
						'</body></html>' ;
		
		response.write(htmlMain);
	}
	else
	{
		var htmlMain = '<body> <table><tr><td>POST</td></tr></table></body>';
		response.write(htmlMain);
	}
}