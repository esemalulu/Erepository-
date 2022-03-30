/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Nov 2013     JSon
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function custGenSubsReQtFldChg(type, name, linenum){
 
	if (name == 'custpage_eedt' && nlapiGetFieldValue(name)) {
		nlapiSetFieldValue('custpage_trxdt', nlapiDateToString(nlapiAddDays(nlapiStringToDate(nlapiGetFieldValue(name)), -70)));
		
		//Mod Req 11/7/2013: Allow user to override trx date
		nlapiSetFieldValue('custpage_trxdtor', nlapiDateToString(nlapiAddDays(nlapiStringToDate(nlapiGetFieldValue(name)), -70)));
	}
	
}
