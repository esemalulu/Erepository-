/**
 * URL library file for Solution Source accounts.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Returns search URL for the specified searchId.
 * @param searchId
 * @returns {String}
 */
function GetSearchResultURL(searchId) {
    if(searchId != null && trim(searchId) != '')
        return '/app/common/search/searchresults.nl?searchid=' + searchId;
    else
        return '';
}
    
/**
 * The base URL for a custom record list
 */
function GetCustomRecordListURL(recordTypeId) {
	return '/app/common/custom/custrecordentrylist.nl?rectype=' + recordTypeId; 
}
	
/**
 * Returns the value of the URL of the window
 */
function GetURLParameterValue(paramName) {
	 paramName = paramName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	 var regex = new RegExp('[\\?&]'+paramName+'=([^&#]*)');
	 var results = regex.exec( window.location.href );
	 if (results == null)
	   return null;
	 else
	   return results[1];
}
	
/**
 * Returns the company's page logo. Can only be used on server-side scripts.
 * 
 * @returns {String} page logo URL.
 */
function GetCompanyPageLogo() {
    var companyFormLogoId = nlapiLoadConfiguration('companyinformation').getFieldValue('formlogo');
    
    if (companyFormLogoId != '' && companyFormLogoId != null) {
        var logo = nlapiLoadFile(companyFormLogoId);
        return nlapiEscapeXML(logo.getURL());
    }
    return null;
}