/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Nov 2017     brians
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_Dealer_BeforeLoad(type, form, request){
 
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function userEventBeforeSubmit(type){
 
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GD_Dealer_AfterSubmit(type){
	/****************************** The following is for Cases 10852 and 10853 Dealer Locator changes *****************************************/
	if (type != 'delete' && 
			(nlapiGetContext().getExecutionContext() != 'scheduled' || 
					(nlapiGetContext().getExecutionContext() == 'scheduled' && 
							nlapiGetContext().getScriptId() != 'customscriptgd_setdealersgeocodesched'))) {
		var customerRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var currentDealerLocatorAddress1 = customerRecord.getFieldValue('custentitygd_dlrlocaddress1') || '';
		var currentDealerLocatorAddress2 = customerRecord.getFieldValue('custentitygd_dlrlocaddress2') || '';
		var currentDealerLocatorCity = customerRecord.getFieldValue('custentitygd_dlrloccity') || '';
		var currentDealerLocatorState = customerRecord.getFieldValue('custentitygd_dlrlocstate') || '';
		var currentDealerLocatorZipCode = customerRecord.getFieldValue('custentitygd_dlrloczipcode') || '';
		var currentDealerLocatorCountry = customerRecord.getFieldValue('custentitygd_dlrloccountry') || '';
		var currentDealerLocatorPhone = customerRecord.getFieldValue('custentitygd_dlrlocphone') || '';
		var currentDealerLocatorLongitude = customerRecord.getFieldValue('custentitygd_addresslongitude') || '';
		var currentDealerLocatorLatitude = customerRecord.getFieldValue('custentitygd_addresslatitude') || '';
			
		var oldCustomerRecord = nlapiGetOldRecord() || null;
		
		var oldCustomerDealerLocatorAddress1 = oldCustomerRecord != null ? oldCustomerRecord.getFieldValue('custentitygd_dlrlocaddress1') || '' : '';
		var oldCustomerDealerLocatorAddress2 = oldCustomerRecord != null ? oldCustomerRecord.getFieldValue('custentitygd_dlrlocaddress2') || '' : '';
		var oldCustomerDealerLocatorCity = oldCustomerRecord != null ? oldCustomerRecord.getFieldValue('custentitygd_dlrloccity') || '' : '';
		var oldCustomerDealerLocatorState = oldCustomerRecord != null ? oldCustomerRecord.getFieldValue('custentitygd_dlrlocstate') || '' : '';
		var oldCustomerDealerLocatorZipCode =  oldCustomerRecord != null ? oldCustomerRecord.getFieldValue('custentitygd_dlrloczipcode') || '' : '';
		var oldCustomerDealerLocatorCountry = oldCustomerRecord != null ? oldCustomerRecord.getFieldValue('custentitygd_dlrloccountry') || '' : '';
		var oldCustomerDealerLocatorPhone =  oldCustomerRecord != null ? oldCustomerRecord.getFieldValue('custentitygd_dlrlocphone') || '' : '';

		if (currentDealerLocatorAddress1 != oldCustomerDealerLocatorAddress1 ||
				currentDealerLocatorAddress2 != oldCustomerDealerLocatorAddress2 ||
				currentDealerLocatorCity != oldCustomerDealerLocatorCity ||
				currentDealerLocatorState != oldCustomerDealerLocatorState ||
				currentDealerLocatorZipCode != oldCustomerDealerLocatorZipCode ||
				currentDealerLocatorCountry != oldCustomerDealerLocatorCountry ||
				currentDealerLocatorPhone != oldCustomerDealerLocatorPhone || 
				currentDealerLocatorLongitude == '' || 
				currentDealerLocatorLatitude == '') {
			// We still need to make sure there are values for the dealer locator fields before resetting the longitude and latitude.
			if (currentDealerLocatorAddress1 != '' &&
					currentDealerLocatorCity != '' &&
					currentDealerLocatorState != '' &&
					currentDealerLocatorZipCode != '' &&
					currentDealerLocatorCountry != ''){
				var stateRecord = nlapiLoadRecord('state', currentDealerLocatorState); //load the state so we can get the short name of the state and country
				
				customerRecord.setFieldValue('custentitygd_dlrlocstateabbreviation', stateRecord.getFieldValue('shortname') || '');
				customerRecord.setFieldValue('custentitygd_dlrloccountryabbreviation', stateRecord.getFieldValue('country'));
				customerRecord.setFieldValue('custentitygd_addresslongitude', '');
				customerRecord.setFieldValue('custentitygd_addresslatitude', '');

				nlapiSubmitRecord(customerRecord, false, true);

				var params = new Array();
				params['custscriptgd_dlrlocdealerid'] = nlapiGetRecordId();
				
				ScheduleScript('customscriptgd_setdealersgeocodesched', null, params); // use this common function so that if multiple users submit dealers, they will all get processed case 10171

			}
		}
	}
	/******************************** End of changes for Case  10852 and 10853 Dealer Locator changes ******************************************/	
}