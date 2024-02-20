/**
 * Mass update to set Parts Shipping Address fields from Default Shipping Address. 
 * 
 * Version    Date            Author           Remarks
 * 2.00       13 Feb 2019     Lydia Miller
 *
 */

/**
 * For each dealer in the mass update, sets the part shipping address body fields to be the addressbook address marked as default shipping.
 * If it can't find default shipping, it does nothing.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SetPartsShippingAddress_MU(recType, recId)
{
	try {

		var dealerRec = nlapiLoadRecord('customer', recId, {recordmode: 'dynamic'});
		
		var lineNum = dealerRec.findLineItemValue('addressbook', 'defaultshipping', 'T');
		if (lineNum < 1) return; 	//If there isn't a default shipping address, quit here.
		
		dealerRec.selectLineItem('addressbook', lineNum);
		var shipphone = dealerRec.getCurrentLineItemValue('addressbook','phone') || '';
		
		nlapiLogExecution('debug','shipcountry',ConvertNSCountryToRVSCountry(dealerRec.getFieldValue('shipcountry')));
		
		dealerRec.setFieldValue('custentitygd_partsshipaddressee', dealerRec.getFieldValue('shipaddressee'));
		dealerRec.setFieldValue('custentitygd_partsshipaddress1', dealerRec.getFieldValue('shipaddr1'));
		dealerRec.setFieldValue('custentitygd_partsshipaddress2', dealerRec.getFieldValue('shipaddr2'));
		dealerRec.setFieldValue('custentitygd_partsshipcity', dealerRec.getFieldValue('shipcity'));		
		dealerRec.setFieldValue('custentitygd_partsshipstate', ConvertNSStateToRVSState(dealerRec.getFieldValue('shipstate')));
		dealerRec.setFieldValue('custentitygd_partsshipzip', dealerRec.getFieldValue('shipzip'));
		dealerRec.setFieldValue('custentitygd_partsshipcountry', ConvertNSCountryToRVSCountry(dealerRec.getFieldValue('shipcountry')));
		dealerRec.setFieldValue('custentitygd_partsshipphone', shipphone);

		
		nlapiSubmitRecord(dealerRec, false, true);
	}
	catch(err){
		nlapiLogExecution('error', 'dealer parts shipping update error', recId + ' ' + err);
	}
}
