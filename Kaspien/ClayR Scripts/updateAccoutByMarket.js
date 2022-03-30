/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Jul 2015     clayr
 *
 */

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
function updateAccountByMarket(type) {
	
	try {
		
		if (type == 'edit') {
			
			var newRecord = nlapiGetNewRecord();
			
			var marketId = newRecord.getFieldValue('custentitymarket_c');
			var market = newRecord.getFieldText('custentitymarket_c');
			var venName = newRecord.getFieldValue('companyname');
			var firstLetter = '';
			nlapiLogExecution('DEBUG','venName',venName);
			switch (market) {
				case 'AMZ : Amazon US':
					//var letterPos = venName.search(/[A-Za-z]/);
					firstLetter = venName.charAt(0).toLowerCase();
					
					if (firstLetter.match(/[a-h]/) || firstLetter.match(/[0-9]/)) {
						newRecord.setFieldValue('custentityaccounting_team','766271');  // Inna Dragnya
					} else if (firstLetter.match(/[i-s]/)) {
						newRecord.setFieldValue('custentityaccounting_team','1308');  // Liz Pikalova
					} else if (firstLetter.match(/[t-z]/)) {
						newRecord.setFieldValue('custentityaccounting_team','1237');  // Cassandra Hamlin
                    } else {
						newRecord.setFieldValue('custentityaccounting_team','1237');  // Cassandra Hamlin
					}
									
					break;
				case 'AMZ : Amazon CA':
					newRecord.setFieldValue('custentityaccounting_team','766271');  // Inna Dragnya
					break;
				case 'AMZ : Amazon UK':
					newRecord.setFieldValue('custentityaccounting_team','1308');  // Liz Pikalova
					break;
				case 'AMZ : Amazon DE':
					newRecord.setFieldValue('custentityaccounting_team','1308');  // Liz Pikalova
					break;
                case 'Deliverr':
					newRecord.setFieldValue('custentityaccounting_team','766271');  // Inna D
					break;
				default:
					newRecord.setFieldValue('custentityaccounting_team','1237');  // Cassandra Hamlin
			
			}
			
			nlapiLogExecution('DEBUG', 'Update Account', 'type: ' + type + '; marketId: ' + marketId + '; market: ' + market + 
					'; venName: ' + venName);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Accounting Team', 'type: ' + type + '; marketId: ' + marketId + '; market: ' + market + 
				'; venName: ' + venName + '; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
}
