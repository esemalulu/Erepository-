/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Nov 2013     JSon
 *
 */

//Company Level parameter for calculating entitlement end date from current date
var paramDaysToEntDate = nlapiGetContext().getSetting('SCRIPT','custscript_gsrq_numdaystoentdate');

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
		nlapiSetFieldValue('custpage_trxdt', nlapiDateToString(nlapiAddDays(nlapiStringToDate(nlapiGetFieldValue(name)), - parseInt(paramDaysToEntDate))));
		
		//Mod Req 11/7/2013: Allow user to override trx date
		nlapiSetFieldValue('custpage_trxdtor', nlapiDateToString(nlapiAddDays(nlapiStringToDate(nlapiGetFieldValue(name)), - parseInt(paramDaysToEntDate))));
		
		//9/15/2015 - Add Payment Date Override feature 
		var paramDaysToPayment = nlapiGetContext().getSetting('SCRIPT','custscript_gsrq_numdaysduedate');
		//business days means Monday through Friday
		var paymentBizDate = null;
		var numDays = 0;
		//loop until you get to parseInt(paramDaysToPayment) days BEFORE entitlement date
		while (numDays < parseInt(paramDaysToPayment)) 
		{
			if (!paymentBizDate) 
			{
				//Use selected Entitlement End Date
				paymentBizDate = nlapiStringToDate(nlapiGetFieldValue(name));
			}
			//add one day
			paymentBizDate = nlapiAddDays(paymentBizDate, -1);
			//0 = Sunday
			//6 = Sat
			//5/21/2014 - Make it 7 Calendar Days.
			//	Leave Business days coding in place just incase
			//if (paymentBizDate.getDay() != 0 && paymentBizDate.getDay()!=6) {
			numDays++;
			//}
		}
			
		//Set Payment Date Override
		nlapiSetFieldValue('custpage_paydtor',nlapiDateToString(paymentBizDate));
	}
	
}

