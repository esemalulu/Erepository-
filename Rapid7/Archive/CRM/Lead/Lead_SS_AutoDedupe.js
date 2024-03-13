/* This script tries to resolve an automatically obtained lead 
 * to a DUNS no, using the Hoovers webservices.
 * 
 * * EXTEERNAL DEPENDENCY ON HOOVERS MUST BE MANAGED SECURELY
*/

var	HOOVERS_SERVICE_URL = 'http://dnbdirect-api.dnb.com/DnBAPI-15';
var	HOOVERS_API_KEY = 'rjcrh44v93rhfh25ty56bg64';

function autoDedupe(type){
	
	var haveDuns = canBeWhiteListed(fields);
	if (haveDuns == null) {
		var noGood = canBeBlackListed(fields);
	}
	if(noGood){
		//Set into a junkpile	
	}
}

function canBeBlackListed(fields){
	
}

function canBeWhiteListed(fields){
	//Filter top100 results returned by
	//State,Country,PhoneNumber
	//order by nameMatch,(over threshold) pick top1
	// if headquarters with the same name pick headquarters
	
}

function phoneNumberRoughMatch(phone1,phone2){
	return false;
}

function returnNameMatchPercent(name1,name2){
	for(var i=0;i<name1.length;i++){
	}	
}

function returnStateAndCountryMatch(state1,country1,state2,country2){
	return false;
}

function getTop100Hoovers(fields){
	//decides whether to search by url or name
	//puts the headquarters at top
	
}


function getAdvancedResults(url) {
	var req = getAdvancedRequest(url);
	var resp = '';
	var soapHeaders = new Array(); 
	soapHeaders['SOAPAction'] = 'AdvancedCompanySearchRequest';
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	return soapText;
}

function getAdvancedRequest(url){
	var soap = '';
	soap='<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://applications.dnb.com/webservice/schema/">\n';
	soap += '<soapenv:Header>\n';
	soap += '<web:API-KEY>' + HOOVERS_API_KEY +'</web:API-KEY>\n';
	soap += '</soapenv:Header>\n';
	soap += '<soapenv:Body>\n';
	soap += '<web:AdvancedCompanySearchRequest>\n';
	soap += '<web:bal>\n';
	soap += '<web:maxRecords>100</web:maxRecords>\n';
	soap += '<web:specialtyCriteria>\n';
	soap += '<web:primaryUrl>' + url + '</web:primaryUrl>\n';
	soap += '</web:specialtyCriteria>\n';
	soap += '<web:hitOffset>0</web:hitOffset>\n';
	soap += '</web:bal>\n';
	soap += '</web:AdvancedCompanySearchRequest>\n';
	soap += '</soapenv:Body>\n';
	soap += '</soapenv:Envelope>';
	this.soapRequest = soap;
	return soap;
}

function getResults(coName) {
	
	var req = getRequest(coName);
	var resp = '';
	var soapHeaders = new Array(); 
	soapHeaders['SOAPAction'] = 'FindCompanyByKeywordRequest';
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	return soapText;
}

function getRequest(coName) {

	var soap = '';
	soap += '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.hoovers.com">';
	soap += '<soapenv:Header>';
	soap += '<web:API-KEY>' + HOOVERS_API_KEY + '</web:API-KEY>';
	soap += '</soapenv:Header>';
	soap += '<soapenv:Body>';
	soap += '<web:FindCompanyByKeywordRequest>';
	soap += '<web:keyword>' + coName + '</web:keyword>';
	soap += '<web:maxRecords>100</web:maxRecords>';
	soap += '<web:hitOffset>0</web:hitOffset>';
	soap += '<web:searchBy>companyName</web:searchBy>';
	soap += '<web:orderBy></web:orderBy>';
	soap += '<web:sortDirection>Descending</web:sortDirection>';
	soap += '</web:FindCompanyByKeywordRequest>';
	soap += '</soapenv:Body>';
	soap += '</soapenv:Envelope>';

	this.soapRequest = soap;
	return soap;
}


