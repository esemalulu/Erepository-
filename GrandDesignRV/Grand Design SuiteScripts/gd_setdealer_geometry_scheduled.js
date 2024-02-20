/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       02 Jul 2015     ibrahima
 *
 */

var DEALER_TYPE_RVSDEALER = '10';
var DEALER_TYPE_NON_RVSDEALER = '11';
var DEALER_TYPE_WARRANTY = '2';

/**
 * Schedule script that sets dealer longitude and latitude based on the address.
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_SetDealerGeometry_Scheduled(type){
	var dealerIdFromParameter = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_dlrlocdealerid') || '';  // added specific dealer to process by using id. case 10171
	// We only need one search since we've added the new dealer locator address fields on the header part of the customer record.
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custentitygd_addresslongitude', null, 'isempty'));
	filters.push(new nlobjSearchFilter('custentitygd_addresslatitude', null, 'isempty'));
	filters.push(new nlobjSearchFilter('companyname', null, 'isnotempty'));
	filters.push(new nlobjSearchFilter('custentityrvsdealertype', null, 'anyof', [DEALER_TYPE_RVSDEALER, DEALER_TYPE_WARRANTY, DEALER_TYPE_NON_RVSDEALER]));
	filters.push(new nlobjSearchFilter('custentitygd_dlrlocaddress1', null, 'isnotempty', ''));
	filters.push(new nlobjSearchFilter('custentitygd_dlrloccity', null, 'isnotempty', ''));
	filters.push(new nlobjSearchFilter('custentitygd_dlrlocstate', null, 'isnotempty', ''));
	filters.push(new nlobjSearchFilter('custentitygd_dlrloczipcode', null, 'isnotempty', ''));
	filters.push(new nlobjSearchFilter('custentitygd_dlrloccountry', null, 'isnotempty', ''));
	if (dealerIdFromParameter != '') // if there is an id set, this processing must be for a single dealer only. case 10171
		filters.push(new nlobjSearchFilter('internalid', null, 'is', dealerIdFromParameter));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('companyname', null, null));
	columns.push(new nlobjSearchColumn('custentitygd_dlrlocaddress1'));
	columns.push(new nlobjSearchColumn('custentitygd_dlrlocaddress2'));
	columns.push(new nlobjSearchColumn('custentitygd_dlrloccity'));
	columns.push(new nlobjSearchColumn('custentitygd_dlrlocstate'));
	columns.push(new nlobjSearchColumn('custentitygd_dlrloczipcode'));
	columns.push(new nlobjSearchColumn('custentitygd_dlrloccountry'));
	columns.push(new nlobjSearchColumn('custentitygd_dlrlocstateabbreviation'));
	columns.push(new nlobjSearchColumn('custentitygd_dlrloccountryabbreviation'));
	
	var dealersAddresses = nlapiSearchRecord('customer', null, filters, columns);
	
	if(dealersAddresses != null && dealersAddresses.length > 0)
	{
		var errorArray = new Array();
		var errorJSON = null;
		for(var i = 0; i < dealersAddresses.length; i++)
		{
			try {
				setDealerGeoCodeBasedOnAddress(dealersAddresses[i].getId(), dealersAddresses[i], errorArray);
			}
			catch(e) {
				errorJSON = new Object();
				errorJSON.dealerId = dealersAddresses[i].getId();
				errorJSON.dealerName = dealersAddresses[i].getValue('companyname');
				errorJSON.error = e;
				
				errorArray[errorArray.length] = errorJSON;
			}			
			
			if(nlapiGetContext().getRemainingUsage() < 100)
				nlapiYieldScript();
		}
		
		//throw errors that were encountered.
		if(errorArray.length > 0)
		{
			var message = 'Could not set longitude and latitude for ' + errorArray.length + ' dealers. The script execution did not stop because of this error, all dealers were updated except the ones shown below:';			
			for(var j = 0; j < errorArray.length; j++)
				message += '\r\n\r\nDealer ID: ' + errorArray[j].dealerId + '\r\nDealer Name: ' + errorArray[j].dealerName + '\r\nError: ' + getErrorDescription(errorArray[j].error, true);
			
			throw new nlobjError('SET_DEALERS_GEO_CODE_FAILED',message, false);
		}
	}
	
}


/**
 * Sets dealer geo code based on shipping address or billing address if no shipping address.
 * @param dealerId
 * @returns {Object} - JSOn object with hasAddress and hasOpenCageGeo properties.
 */
function setDealerGeoCodeBasedOnAddress(dealerId, addrResults, errorsArray)
{
	var resultJSON = new Object();
	resultJSON.address = '';
	resultJSON.hasDefaultAddress = false;
	resultJSON.hasOpenCageGeo = false;
	
	if(dealerId != undefined && dealerId != null && dealerId != '')
	{
		try
		{
			var addressInfoObj = null;
			if(addrResults != null)
			{
				addressInfoObj = {
					address: addrResults.getValue('custentitygd_dlrlocaddress1'),
					city: addrResults.getValue('custentitygd_dlrloccity'),
					state: addrResults.getText('custentitygd_dlrlocstate'),
					zip: addrResults.getValue('custentitygd_dlrloczipcode'),
					country: addrResults.getText('custentitygd_dlrloccountry')
				};
			}
			
			if(addressInfoObj != null)
			{
				resultJSON.address = addressInfoObj.address + ', ' + addressInfoObj.city + ', ' + addressInfoObj.state + ' ' + addressInfoObj.zip + ', ' + addressInfoObj.country;
				resultJSON.hasDefaultAddress = true;
				var addressGeo = getAddressGeometry(addressInfoObj);
				if(addressGeo != null)
				{
					resultJSON.hasOpenCageGeo = true;
					nlapiSubmitField('customer', dealerId, ['custentitygd_addresslongitude', 'custentitygd_addresslatitude'], [addressGeo.lng, addressGeo.lat], false);
				}
			}
		}
		catch(e)
		{
			if(errorsArray != undefined && errorsArray != null)
			{
				var errorJSON = new Object();
				errorJSON.dealerId = dealerId;
				errorJSON.dealerName = nlapiLookupField('customer', dealerId, 'companyname');
				errorJSON.error = e;
				errorsArray[errorsArray.length] = errorJSON;			
			}
			else
				throw e;
		}			
	}	
	return resultJSON;
}