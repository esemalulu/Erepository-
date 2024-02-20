/**
 * Company preferences and address information for Solution Source accounts.
 * CAN ONLY BE LOADED FROM SERVER SCRIPTS.
 * 
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/config', './SSLib_Util'],

/**
 * {config} config
 */
function(config, SSLib_Util) {
	
	/**
	 * Returns the company name from the preferences.
	 * If parameter is true, returns the legal name of the company. 
	 */
	function getCompanyName(useLegalName) {
		var fieldName = (useLegalName != null && useLegalName) ? 'legalname' : 'companyname';
		return config.load({
			type: config.Type.COMPANY_INFORMATION
		}).getValue({
			fieldId: fieldName
		});
	}
	
	/**
	 * Returns the company's complete shipping address from company information configuration.
	 */
	function getCompanyShippingAddress(isSingleLine, includeCountry) {
		//load company info
		var companyInfo = config.load({
			type: config.Type.COMPANY_INFORMATION
		});
		var mainAdd = companyInfo.getSubrecord({fieldId: 'shippingaddress'});
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
	
	/**
	 * Returns the company's complete main address from company information configuration.
	 */
	function getCompanyMainAddress(isSingleLine, includeCountry) {
		//load company info
		var companyInfo = config.load({
			type: config.Type.COMPANY_INFORMATION
		});
		var mainAdd = companyInfo.getSubrecord({fieldId: 'mainaddress'});
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
	
	/**
	 * Returns the company's complete shipping address from company information configuration.
	 */
	function getCompanyReturnAddress(isSingleLine, includeCountry) {
		//load company info
		var companyInfo = config.load({
			type: config.Type.COMPANY_INFORMATION
		});
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
	
    return {
    	getCompanyName: getCompanyName,
    	getCompanyShippingAddress: getCompanyShippingAddress,
    	getCompanyMainAddress: getCompanyMainAddress,
    	getCompanyReturnAddress: getCompanyReturnAddress
    };
    
});
