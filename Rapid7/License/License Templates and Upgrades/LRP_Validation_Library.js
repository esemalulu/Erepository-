/**
 * Module Description
 * 
 * Version	Date			Author		   Remarks
 * 1.00	   15 Jun 2016	 igrinenko
 * 
 * This library consists of functions used to validate 
 */

var REASON_NONE            = 1;
var REASON_EMBARGO         = 2;
var REASON_GOVERNMENT      = 3;
var REASON_IP_COUNTRY_MISSING = 4;
// Constant for AmberRoad's responses 1(Flagged) and 3 (Error)
var REASON_RESTRICTED_PARTY = 8;

var RES_AUTO_APPROVE            = 1;
var RES_AUTO_REJECT             = 2;
var RES_MANUAL_CHECK_GOVERNMENT = 3;
var RES_IP_COUNTRY_MISSING      = 4;

/**
 * Returns the result of validation.
 * @param
 *	 lrp Object with the following fields:
 *	 - email
 *	 - ipCountryIsoCode
 *	 - countryIsoCode
 *	 - ipCity
 *	 - city
 *	 - typeOfUse
 *	 - companyName
 *	 - checkForGraylist
 *	 - ipAddress
 *	 - logHeaderParams
 *	 - referer
 * @return int
 *	 1 - Auto approve.
 *	 2 - Auto reject.
 *	 3 - Manual check for government
 *	 4 - IP country is missing
 */
function validateLrp(lrp) {
	if (!isEdu(lrp) && lrp.ipCountryIsoCode == '') {
		return RES_IP_COUNTRY_MISSING;
	}
	if (isEndUsersPlaceEmbargoed(lrp)) {
		return RES_AUTO_REJECT;
	}
	if (!lrp.checkForGraylist) {
		return RES_AUTO_APPROVE;
	}
	if(isGovernmentEmail(lrp.email)) {
		return RES_MANUAL_CHECK_GOVERNMENT;
	}
	if (!isGovernment(lrp.typeOfUse, lrp.companyName)) {
		return RES_AUTO_APPROVE;
	}
	if (isEdu(lrp)) {
		if (isUSCanada(lrp.countryIsoCode)) {
			return RES_AUTO_APPROVE;
		}
	} else {
		if ((isUSCanada(lrp.ipCountryIsoCode)) && isUSCanada(lrp.countryIsoCode)) {
			return RES_AUTO_APPROVE;
		}
	}
	
	return RES_MANUAL_CHECK_GOVERNMENT;
}

/**
 * Check if the country is US or Canada.
 * @param countryIsoCode ISO code of the checked country.
 * @return {Boolean} True if the country is US or Canada. False otherwise.
 */
function isUSCanada(countryIsoCode) {
//	if ((countryIsoCode != null) && (typeof countryIsoCode == 'string')) {
//		if (countryIsoCode.toUpperCase() == 'US' || countryIsoCode.toUpperCase() == 'CA') {
//			return true;
//		}
//	}
//	return false;
	return ((countryIsoCode != null) && (typeof countryIsoCode == 'string')) && 
	(countryIsoCode.toUpperCase() == 'US' || countryIsoCode.toUpperCase() == 'CA'); 
}

/**
 * Check if the country or the city is embargoed.
 * @param countryIsoCode ISO code of the checked country.
 * @param city The name of the checked city.
 * @return {Boolean} True if country or city is embargoed. False otherwise.
 */
function isEndUsersPlaceEmbargoed(lrp) {
	if (isEdu(lrp)) {
		return isCountryEmbargoed(lrp.countryIsoCode) || isCityEmbargoed(lrp.countryIsoCode,lrp.city) || isEmailDomainEmbargoed(lrp.email);
	}
	return isCountryEmbargoed(lrp.countryIsoCode) || isCountryEmbargoed(lrp.ipCountryIsoCode) || 
	isCityEmbargoed(lrp.ipCountryIsoCode, lrp.ipCity) || isEmailDomainEmbargoed(lrp.email);
}

/**
 * Check if the country is embargoed.
 * @param countryIsoCode ISO code of the checked country.
 * @returns {Boolean} True if the country is embargoed. False otherwise.
 */
/*function isCountryEmbargoed(countryIsoCode) {
	if ((countryIsoCode != null) && (typeof countryIsoCode == 'string')) {
		var filters = new Array();
		filters.push(new nlobjSearchFilter('custrecordr7embargoedcountriesisocode', null, 'is', countryIsoCode.toUpperCase()));
		var columns = new Array();
		columns.push(new nlobjSearchColumn( 'internalid' ));
		var searchResults = nlapiSearchRecord( 'customrecordr7embargoedcountries', null, filters, columns);
		if (searchResults != null) {
			return (searchResults.length > 0);
		}
	}
	return false;
}*/

function isCountryEmbargoed(countryIsoCode) {
	var arrSearchFilters = new Array();
	arrSearchFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrSearchFilters.push(new nlobjSearchFilter('custrecordr7countriescountryid', 'custrecordr7graylistcountry', 'is', countryIsoCode.toUpperCase()));
	arrSearchFilters.push(new nlobjSearchFilter('custrecordr7graylistisblacklist', null, 'is', 'T'));
	arrSearchFilters.push(new nlobjSearchFilter('custrecordr7graylistembargoedcity', null, 'isempty'));
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	var arrSearchResults = nlapiSearchRecord('customrecordr7graylist', null, arrSearchFilters, columns);
	if (arrSearchResults != null){
		nlapiLogExecution('DEBUG', 'Validation for isCountryEmbargoed. Country is ' + countryIsoCode, 'Result is true');
		return true;
	}
	else{
		nlapiLogExecution('DEBUG', 'Validation for isCountryEmbargoed. Country is ' + countryIsoCode, 'Result is false');
		return false;
	}
}

/**
 * Check if the city is embargoed.
 * @param countryIsoCode ISO code of the country where the checked city is located.
 * @param city The name of the checked city.
 * @returns {Boolean} True if the city is embargoed. False otherwise.
 */
/*function isCityEmbargoed(countryIsoCode, city) {
	if ((countryIsoCode != null) && (typeof countryIsoCode == 'string')) {
		var filters = new Array();
		filters.push(new nlobjSearchFilter('name', null, 'is', city));
		filters.push(new nlobjSearchFilter('custrecordr7embargoedcitiescountryiso', null, 'is', countryIsoCode.toUpperCase()));
		var columns = new Array();
		columns.push(new nlobjSearchColumn( 'internalid' ));
		var searchResults = nlapiSearchRecord( 'customrecordr7embargoedcities', null, filters, columns);
		if (searchResults != null) {
			return (searchResults.length > 0);
		}
	}
	return false;
}*/

function isCityEmbargoed(countryIsoCode, city) {
	var arrSearchFilters = new Array();
	arrSearchFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrSearchFilters.push(new nlobjSearchFilter('custrecordr7graylistembargoedcity', null, 'is', city));
	arrSearchFilters.push(new nlobjSearchFilter('custrecordr7countriescountryid', 'custrecordr7graylistcountry', 'is', countryIsoCode.toUpperCase()));
	arrSearchFilters.push(new nlobjSearchFilter('custrecordr7graylistisblacklist', null, 'is', 'T'));
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7graylist', null, arrSearchFilters);
	if (arrSearchResults != null){
		nlapiLogExecution('DEBUG', 'Validation for isCityEmbargoed. city is ' + city + '. Country is ' + countryIsoCode, 'Result is true');
		return true;
	}
	else{
		nlapiLogExecution('DEBUG', 'Validation for isCityEmbargoed. city is ' + city + '. Country is ' + countryIsoCode, 'Result is false');
		return false;
	}
}

/**
 * Check if it is government.
 * @param typeOfUse The type of use of a license.
 * @param companyName Company's name.
 * @returns {Boolean}
 */
function isGovernment(typeOfUse, companyName) {
	nlapiLogExecution('DEBUG', 'Checking for government', '');
	return isGraylistedTypeOfUse(typeOfUse) || isGovernmentCompany(companyName);
}

/**
 * Check if the email is in graylisted domain.
 * @param email Email to check.
 * @returns {Boolean}
 */
function isGovernmentEmail(email) {
	if (isEmpty(email)) {
		return false;
	}

	var domain = email.substring(email.lastIndexOf('@')+1);
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custrecordr7graylistdomain', null, 'isnotempty'));
	
	var filter1 = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
	filter1.setFormula("CASE WHEN '" + domain + "' LIKE '%.' || {custrecordr7graylistdomain} THEN 1 ELSE 0 END");
	filter1.setLeftParens(1);
	filter1.setOr(true);
	filters.push(filter1);
	
	var filter2 = new nlobjSearchFilter('custrecordr7graylistdomain', null, 'is', domain);
	filter2.setRightParens(1);
	filters.push(filter2);
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	
	var searchResults = nlapiSearchRecord( 'customrecordr7graylist', null, filters, columns);
	if (searchResults != null) {
		nlapiLogExecution('DEBUG', 'isGovernmentEMail(\'' + email + '\')', 'true');
		return (searchResults.length > 0);
	}
	nlapiLogExecution('DEBUG', 'isGovernmentEMail(\'' + email + '\')', 'false');
	return false;
}

/**
 * Check if company's name has "government keywords".
 * @param companyName Company's name.
 * @returns {Boolean}
 */
function isGovernmentCompany(companyName) {
	if (isEmpty(companyName)) {
		return false;
	}
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	var filter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
	var repCompany = companyName.replace('\'','');
	filter.setFormula("CASE WHEN LOWER('" + repCompany + "') LIKE '%' || LOWER({custrecordr7graylistkeyword}) || '%' THEN 1 ELSE 0 END");
	filters.push(filter);
	filters.push(new nlobjSearchFilter('custrecordr7graylistisgraylist', null, 'is', 'T'));
	filters.push(new nlobjSearchFilter('custrecordr7graylistkeyword', null, 'isnotempty'));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	
	var searchResults = nlapiSearchRecord( 'customrecordr7graylist', null, filters, columns);
	if (searchResults != null) {
		nlapiLogExecution('DEBUG', 'isGovernmentCompany(\'' + companyName + '\')', 'true');
		return (searchResults.length > 0);
	}
	nlapiLogExecution('DEBUG', 'isGovernmentCompany(\'' + companyName + '\')', 'false');
	return false;
}

/**
 * Check if the typeOfUse is graylisted.
 * @param typeOfUse Type of use to be checked.
 * @returns {Boolean}
 */
function isGraylistedTypeOfUse(typeOfUse) {
	if (isEmpty(typeOfUse)) {
		return false;
	}

	var filters = new Array();
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custrecordr7graylistisgraylist', null, 'is', 'T'));
	filters.push(new nlobjSearchFilter('custrecordr7graylisttypeofuse', null, 'is', typeOfUse));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	
	var searchResults = nlapiSearchRecord( 'customrecordr7graylist', null, filters, columns);
	if (searchResults != null) {
		nlapiLogExecution('DEBUG', 'isGraylistedTypeOfUse(\'' + typeOfUse + '\')', 'true');
		return (searchResults.length > 0);
	}
	nlapiLogExecution('DEBUG', 'isGraylistedTypeOfUse(\'' + typeOfUse + '\')', 'false');
	return false;
}

/**
 * The function returns true if email match in Domain Extensions with Category is blacklist,
 * return false in other cases 
 * 
 * @param <email> <Email of requester>.
 * 
 * @returns boolean value
 */
function isEmailDomainEmbargoed(email) {

	if (isEmpty(email)) {
		return false;
	}
	
	var domainExt = email.substr(email.lastIndexOf('.'));

	var arrSearchFilters = new Array();
	arrSearchFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrSearchFilters.push(new nlobjSearchFilter('custrecordr7domainextensioncategory', null, 'is', 2));
	arrSearchFilters.push(new nlobjSearchFilter('name', null, 'is', domainExt));

	var arrSearchResults = nlapiSearchRecord('customrecordr7domainextensions',
			null, arrSearchFilters);
	return arrSearchResults != null;

}

/**
 * The function returns true if requested product is Metasploit and returns false if other product 
 * @param <accessCode> <Code of license request>.
 * @returns boolean value
 */
function isMetasploit(accessCode) {
	if (isEmpty(accessCode)) {
		return false;
	}
	
	var arrSearchFilters = new Array();
	arrSearchFilters.push(new nlobjSearchFilter(
			'custrecordr7lictemp_accesscode', null, 'is', accessCode));
	// Metasploit Id in ACR Product Type List = 2
	arrSearchFilters.push(new nlobjSearchFilter(
			'custrecordr7lictemp_acrprodtype', null, 'is', 2));

	var arrSearchResults = nlapiSearchRecord(
			'customrecordr7lictemplatesupgrades', null, arrSearchFilters);
	
	return arrSearchResults != null;
}

function isMetasploitPro(accessCode){
	/// HARDCODE 
	// TODO - Get rid of hardcoded value - move to script parameters
	return accessCode == 'W8PL6ZgWHf'; 
}

/**
 * Check if LRP is from an educational entity (using NetSuite Forms)
 * @param lrp
 * @returns {Boolean}
 */
function isEdu(lrp) {
	return (isEmpty(lrp.ipAddress) && isEmpty(lrp.logHeaderParams) && isEmpty(lrp.referer));
}

function isEmpty(value) {
	return (value===undefined || value===null || value==='');
}

