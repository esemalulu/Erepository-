/**
 * Company preferences and address information for Solution Source accounts.
 * CAN ONLY BE LOADED FROM SERVER SCRIPTS.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Returns the company's name from company information configuration.
 * If useLegalName is true, company's legal name is returned otherwise, company name is returned.
 * @returns {String} Company Name
 */
function GetCompanyName(useLegalName) {
    var companyInfo = nlapiLoadConfiguration('companyinformation');
    var companyName = '';
    if(useLegalName)
        companyName = companyInfo.getFieldValue('legalname');
    else
        companyName = companyInfo.getFieldValue('companyname');
     
    if(companyName == null)
        companyName = '';
    
    return companyName;
}

/**
 * Returns the company's complete shipping address from company information configuration.
 * @param {Boolean} singeLine: Whether or not address shoud be formatted in a single line.
 * @returns {String} Company Shipping Address
 */
function GetCompanyShippingAddress(singleLine) {
    var companyInfo = nlapiLoadConfiguration('companyinformation');
    var shippingAddress = '';
    if(!singleLine) {
        var shipAddr1 = companyInfo.getFieldValue('shippingaddress1');  
        if(shipAddr1 == null)
            shipAddr1 = '';
        
        var shipCity = companyInfo.getFieldValue('shippingcity'); 
        if(shipCity == null)
            shipCity = '';
        
        var shipState = companyInfo.getFieldValue('shippingstate'); 
        if(shipState == null)
            shipState = '';

        var shipZip = companyInfo.getFieldValue('shippingzip'); 
        if(shipZip == null)
            shipZip = '';
         
        var shipCountry = companyInfo.getFieldValue('shippingcountry'); 
        if(shipCountry == null)
            shipCountry = '';   
        else if(shipCountry.toLowerCase() == 'us')
            shipCountry = 'United States';
        else if(shipCountry.toLowerCase == 'ca')
            shipCountry = 'Canada';
         
        if (shipAddr1 != '')
            shippingAddress = shipAddr1 + "<br />";
        
        if(shipCity != '') {
            if(shipState != '')
                shippingAddress += shipCity + ', ' + shipState;
        } else { //no ship city
            if(shipState != '')
                shippingAddress += shipState;   
        }
        
        if (shipZip != '' )
            shippingAddress += ' ' + shipZip;
        if (shipCountry != '')
            shippingAddress += "<br />" + shipCountry;
    } else {
        shippingAddress = companyInfo.getFieldValue('shippingaddress1') + ', ' +  companyInfo.getFieldValue('shippingcity') + ', ' +
                          companyInfo.getFieldValue('shippingstate') + ' ' + companyInfo.getFieldValue('shippingzip');  
    }

    return shippingAddress;
}

/**
 * Returns the company's complete main address from company information configuration.
 */
function GetCompanyMainAddress(isSingleLine, includeCountry) {
	//load company info
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var mainAdd = companyInfo.viewSubrecord('mainaddress');
	var addressee = mainAdd.getFieldValue('addressee');
	var addr = mainAdd.getFieldValue('addr1') + mainAdd.getFieldValue('addr2');
	var city = mainAdd.getFieldValue('city');
	var state = mainAdd.getFieldValue('state');
	var zip = mainAdd.getFieldValue('zip');
	var country = mainAdd.getFieldValue('country');
	
	if (isSingleLine)
		return addressee + ' ' + addr + ' ' + city + ', ' + state + ' ' + zip + (includeCountry ? '. ' + country : '');
	
	return addressee + '<br />' + addr + '<br />' + city + ', ' + state + ' ' + zip + (includeCountry ? '<br />' + country : '');
}

/**
 * Returns the company's complete shipping address from company information configuration.
 */
function GetCompanyReturnAddress(isSingleLine, includeCountry) {
	//load company info
    var companyInfo = nlapiLoadConfiguration('companyinformation');
	var mainAdd = companyInfo.getSubrecord({fieldId: 'returnaddress'});
	var addressee = mainAdd.getValue({fieldId: 'addressee'});
	var addr = mainAdd.getValue({fieldId: 'addr1'}) + mainAdd.getValue({fieldId: 'addr2'});
	var city = mainAdd.getValue({fieldId: 'city'});
	var state = mainAdd.getValue({fieldId: 'state'});
	var zip = mainAdd.getValue({fieldId: 'zip'});
	var country = mainAdd.getValue({fieldId: 'country'});
	
	if (isSingleLine)
		return addressee + ' ' + addr + ' ' + city + ', ' + state + ' ' + zip + (includeCountry ? '. ' + country : '');
	
	return addressee + '<br />' + addr + '<br />' + city + ', ' + state + ' ' + zip + (includeCountry ? '<br />' + country : '');
}

