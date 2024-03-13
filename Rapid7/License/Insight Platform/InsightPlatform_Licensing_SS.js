/*
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       02 March 2016   mburstein
 *
 * This script will be used for integrating license server with the NetSuite Product record. However, for the time being it has 2 functions:
 *	1. Create the Product Key (and check for dupes)
 *	2. Set expiration to yesterday if the Contact for Licensing is Blacklist/Restricted
 */

/*
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



function insightPlatform_beforeSubmit(type){

	// --------------------- BEGIN ENVIRONMENT CHECK ---------------------
	if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {
		if (type == 'create' || type == 'copy') {
			var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
			var randomKey = '0000-0000-';
			for (var i = 0; i < 8; i++) {
				var rnum = Math.floor(Math.random() * chars.length);
				randomKey += chars.substring(rnum, rnum + 1);

				if (i == 3) {
					randomKey += '-';
				}
			}
			nlapiSetFieldValue('custrecordr7inplicenseprodcutkey', randomKey);
		}
	}
	// --------------------- END ENVIRONMENT CHECK ---------------------


	//restricted user stuff - MUST BE FIRST
	if (type == 'create' || type == 'edit') {
		var contactId = nlapiGetFieldValue('custrecordr7inplicensecontact');
		var isBlackListed = checkBlacklisted(contactId);
		var isRestricted = checkRestricted(contactId);

		var strToday = nlapiDateToString(new Date());
		var dtToday = nlapiStringToDate(strToday);

		var strcurrentExpiration = nlapiGetFieldValue('custrecordr7inplicenseexpirationdate') || strToday;
		var dtCurrentExpiration = nlapiStringToDate(strcurrentExpiration);

		if (isBlackListed) {
			if (dtCurrentExpiration >= dtToday) {
				nlapiSetFieldValue('custrecordr7inplicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
			}
		}

		if (isRestricted) {
			if (dtCurrentExpiration >= dtToday) {
				nlapiSetFieldValue('custrecordr7inplicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
			}
			if (type == 'create') {
				throw nlapiCreateError('ERROR', 'Failed to create license.  Please contact Rapid7 Support', true);
			}
		}

	}
	//end restricted user stuff

	// https://issues.corp.rapid7.com/browse/APPS-15987
	// comparing all custom fields of new record to old record to find any changes => send only actual changes to IPIMS
	// avoiding native fields comparsion, which might change with edit action making no actual change to the license record itself
	if (type == 'edit') {
		// nlapiLogExecution('DEBUG', 'edit proccesing', 'ipimsUpdateRequired => changing custbodyr7_insight_out_event_created to FALSE');
		var oldRec = JSON.parse(JSON.stringify(nlapiGetOldRecord()));
		var newRec = JSON.parse(JSON.stringify(nlapiGetNewRecord()));
		var ipimsUpdateRequired = false;
		for (var property in newRec) {
			var isProductToken = property.indexOf("inpproducttoken") > 0 ? true : false;
			var isLineHash = property.indexOf("inpcreatedfromlinehash") > 0 ? true : false;
			var isSyncWithIpims = property.indexOf("inpsyncupwithipims") > 0 ? true : false;
			if (property.lastIndexOf("custrecord", 0) === 0 && !(isProductToken || isLineHash || isSyncWithIpims)) { // check the property to contain 'custrecord' prefix
				if (typeof newRec[property] !== 'object') { // strings, numbers
					// nlapiLogExecution('DEBUG', 'comparing strings ', newRec[property] + ' ----- ' + oldRec[property]);
					if (newRec[property] !== oldRec[property]) {
						ipimsUpdateRequired = true;
						// nlapiLogExecution('DEBUG', 'prop ' + property, 'Triggered an update!');
					}
				} else if (typeof newRec[property] === 'object') {
					// nlapiLogExecution('DEBUG', 'comparing objects ', JSON.stringify(newRec[property]) + ' ----- ' + JSON.stringify(oldRec[property]));
					if (JSON.stringify(newRec[property]) !== JSON.stringify(oldRec[property])) {
						ipimsUpdateRequired = true;
						// nlapiLogExecution('DEBUG', 'prop ' + property, 'Triggered an update!');
					}
				}
			}
		}

		if (ipimsUpdateRequired) {
			var soId = nlapiGetNewRecord().getFieldValue('custrecordr7inplicensesalesorder');
			nlapiLogExecution('DEBUG', 'update required', 'ipimsUpdateRequired => changing custbodyr7_insight_out_event_created to FALSE');
			nlapiSubmitField('salesorder', soId, 'custbodyr7_insight_out_event_created', 'F');
		}
	}

	//make request to Insight Platform server
	if (type == 'create' || type == 'edit') {

		var productKey = nlapiGetFieldValue('custrecordr7inplicenseprodcutkey');

		if (productKey == null || productKey == '' || type == 'create') {
			nlapiSetFieldValue('custrecordr7inplicenseprodcutkey', generateProductKey());
		}
		else
		if (productKeyExists(nlapiGetFieldValue('custrecordr7inplicenseprodcutkey'))) {
			nlapiLogExecution('ERROR', 'REQUEST_ERROR', 'Product Key already exists');
		}
	}
	else {
		nlapiLogExecution('ERROR', 'FEATURE_UNAVAILABLE', 'Cannot trigger actions on anything other than create or edit');
	}
	//end userInsight request

	//if end date was changed or netfort checbox was changed, reset SO inbound event checkbox
	if (type == 'edit') {
		var oldRec = nlapiGetOldRecord();
		var newRec = nlapiGetNewRecord();

		var oldEndDate = nlapiStringToDate(oldRec.getFieldValue('custrecordr7inplicenseexpirationdate')).getTime();
		var newEndDate = nlapiStringToDate(newRec.getFieldValue('custrecordr7inplicenseexpirationdate')).getTime();
		var oldNetfort = oldRec.getFieldValue('custrecordr7inpnetfort');
		var newNetfort = newRec.getFieldValue('custrecordr7inpnetfort');

		nlapiLogExecution('DEBUG', 'old/new endDates/netfort', JSON.stringify({
			oldEndDate: oldEndDate,
			newEndDate: newEndDate,
			oldNetfort: oldNetfort,
			newNetfort: newNetfort
		}));

		if (oldEndDate != newEndDate || oldNetfort != newNetfort) {
			var soId = newRec.getFieldValue('custrecordr7inplicensesalesorder');
			nlapiLogExecution('DEBUG', 'end date or netfort checbox is changed, updating SO checkbox');
			nlapiSubmitField('salesorder', soId, 'custbodyr7_insight_out_event_created', 'F');
		}
	}

	if (type == 'edit') {
		var oldRec = nlapiGetOldRecord();
		var newRec = nlapiGetNewRecord();

		var oldTelemetry = oldRec.getFieldValue('custrecordr7inptelemetry');
		var newTelemetry = newRec.getFieldValue('custrecordr7inptelemetry');
		nlapiLogExecution('DEBUG', 'old/new telemetry', JSON.stringify({
			oldTelemetry: oldTelemetry,
			newTelemetry: newTelemetry
		}));

		if (oldTelemetry != newTelemetry && newTelemetry == 'T') {
			var soId = newRec.getFieldValue('custrecordr7inplicensesalesorder');
			nlapiSubmitField('salesorder', soId, 'custbodyr7_insight_out_event_created', 'F');
		}
	}

	//restricted user stuff - MUST BE FIRST
	if (type == 'create' || type == 'edit') {

		var contactId = nlapiGetFieldValue('custrecordr7inplicensecontact');
		var isBlackListed = checkBlacklisted(contactId);
		var isRestricted = checkRestricted(contactId);

		var strToday = nlapiDateToString(new Date());
		var dtToday = nlapiStringToDate(strToday);

		var strcurrentExpiration = nlapiGetFieldValue('custrecordr7inplicenseexpirationdate') || strToday;
		var dtCurrentExpiration = nlapiStringToDate(strcurrentExpiration);

		if (isBlackListed) {
			if (dtCurrentExpiration >= dtToday) {
				nlapiSetFieldValue('custrecordr7inplicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
			}
		}

		if (isRestricted) {
			if (dtCurrentExpiration >= dtToday) {
				nlapiSetFieldValue('custrecordr7inplicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
			}
			if (type == 'create') {
				throw nlapiCreateError('ERROR', 'Failed to create license.  Please contact Rapid7 Support', true);
			}
		}

	}
	//end restricted user stuff

	//make request to Insight Platform server
	if (type == 'create' || type == 'edit') {

		var productKey = nlapiGetFieldValue('custrecordr7inplicenseprodcutkey');

		if (productKey == null || productKey == '' || type == 'create') {
			nlapiSetFieldValue('custrecordr7inplicenseprodcutkey', generateProductKey());
		}
		else
		if (productKeyExists(nlapiGetFieldValue('custrecordr7inplicenseprodcutkey'))) {
			nlapiLogExecution('ERROR', 'REQUEST_ERROR', 'Product Key already exists');
		}
	}
	else {
		nlapiLogExecution('ERROR', 'FEATURE_UNAVAILABLE', 'Cannot trigger actions on anything other than create or edit');
	}
	//end userInsight request

	//trigger 1price updates
	var itemFamily = nlapiGetFieldValue('custrecordr7inplicenseitemfamily');
	//47 One-InsightIDR 48 One-InsightAppSec 49 One-InsightConnect 53 One-InsightCloudSec
	var insightOneItemFamilies = ["47","48","49","53", "54"];
	var isOnePrice = insightOneItemFamilies.indexOf(itemFamily) != -1;

	var salesOrder = nlapiGetFieldValue('custrecordr7inplicensesalesorder');
	var isFulfilAtScale = nlapiGetFieldValue('custrecord_inp_req_fulfil_at_scale') == 'T' ? true : false;
	nlapiLogExecution('DEBUG', 'isOnePrice / salesOrder', JSON.stringify({
		isOnePrice: isOnePrice,
		salesOrder: salesOrder,
		isFulfilAtScale: isFulfilAtScale
	}));
	if (type == 'create' && salesOrder && (isOnePrice || isFulfilAtScale)) {
		nlapiLogExecution('DEBUG', 'new 1price license, need to sync');
		nlapiSetFieldValue('custrecordr7inpsyncupwithipims', 1);
	}
	if (type == 'edit' && salesOrder && (isOnePrice || isFulfilAtScale)) {
		if (nlapiGetFieldValue('custrecordr7inpsyncupwithipims') == '3') {
			nlapiLogExecution('DEBUG', 'something change on the license, need to re-sync');
			nlapiSetFieldValue('custrecordr7inpsyncupwithipims', 1);
		}
	}
}

function generateProductKey(){

	var productKey = '';

	while (productKey == '' || productKeyExists(productKey)) {

		var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
		var randomKey = '';
		for (var i = 0; i < 16; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomKey += chars.substring(rnum, rnum + 1);

			if (i == 3 || i == 7 || i == 11) {
				randomKey += '-';
			}
		}

		productKey = randomKey;
	}

	return productKey;
}

function productKeyExists(productKey){

	if (productKey != null && productKey != '') {
		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7inplicenseprodcutkey', null, 'is', productKey);

		var internalId = nlapiGetRecordId();
		if (internalId != null && internalId != '') {
			arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', internalId);
		}

		var arrSearchResults = nlapiSearchRecord('customrecordr7insightplatform', null, arrFilters);

		if (arrSearchResults != null && arrSearchResults.length > 0) {
			return true;
		}

		return false;
	}

	return true;
}