/**
 * URL library file for Solution Source accounts.
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/url', 'N/config', 'N/file', 'N/xml'],

/**
 * @param {url} url
 * @param {config} config
 * @param {file} file
 * @param {xml} xml
 */
function(url, config, file, xml) {
	
	/**
	 * Returns search URL for the specified searchId.
	 */
	function getSearchResultURL(searchId) {
		return '/app/common/search/searchresults.nl?searchid=' + searchId;
	}
	
	/**
	 * The base url for a custom record list
	 */
	function getCustomRecordListURL(recordTypeId) {
		return '/app/common/custom/custrecordentrylist.nl?rectype=' + recordTypeId; 
	}
	
	/**
	 * Returns the value of the URL of the window
	 */
	function getURLParameterValue(paramName) {
		 paramName = paramName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		 var regex = new RegExp('[\\?&]'+paramName+'=([^&#]*)');
		 var results = regex.exec( window.location.href );
		 if (results == null)
		   return null;
		 else
		   return results[1];
	}
	
	/**
	 * Returns a value of the url parameter specified.
	 */
	function getURLParameterValueFromURL(url, paramName) {
		 paramName = paramName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		 var regex = new RegExp('[\\?&]'+paramName+'=([^&#]*)');
		 var results = regex.exec(url);
		 if (results == null)
		   return null;
		 else
		   return results[1];
	}
	
	/**
	 * Returns the company's logo URL
	 */
	function getCompanyLogoURL() {
		var companyFormLogoId = config.load({
			type: config.Type.COMPANY_INFORMATION
		}).getValue({
			fieldId: 'formlogo'
		});
		
		if (companyFormLogoId != '' && companyFormLogoId != null) {
			return xml.escape(file.load({id: companyFormLogoId}).url);
		}
		return null;
	}

   
    return {
    	getSearchResultURL: getSearchResultURL,
    	getCustomRecordListURL: getCustomRecordListURL,
    	getURLParameterValue: getURLParameterValue,
    	getURLParameterValueFromURL: getURLParameterValueFromURL,
    	getCompanyLogoURL: getCompanyLogoURL
    };
    
});
