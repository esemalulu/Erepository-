/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateAccountByMarket(recType, recId) {
	
	try {
		if (recType == 'vendor') {
			
			var recVendor = nlapiLoadRecord(recType, recId);
			//var etailzSku = recItem.getFieldValue('itemid');
			//nlapiSubmitField(recType,recId,'externalid',etailzSku);
			
			var marketId = recVendor.getFieldValue('custentitymarket_c');
			var market = recVendor.getFieldText('custentitymarket_c');
			var venName = recVendor.getFieldValue('companyname');
			var firstLetter = '';
			var employeeId = null;
			
			switch (market) {
				case 'US':
					//var letterPos = venName.search(/[A-Za-z]/);
					firstLetter = venName.charAt(0).toLowerCase();
					
					if (firstLetter.match(/[a-d]/)) {
						employeeId = '1278';	// Maria Mathews
					} else if (firstLetter.match(/[e-k]/)) {
						employeeId = '1237';	// Cassandra Hamlin
					} else if (firstLetter.match(/[l-r]/)) {
						employeeId = '1303';	// Valentina Karakay
					} else if (firstLetter.match(/[s-z]/)) {
						employeeId = '1262';	// Kamila Yusapova
					} else if (firstLetter.match(/[0-9]/)) {
						employeeId = '1278';	// Maria Mathews
					} else {
						employeeId = '1278';	// Maria Mathews
					}
									
					break;
				case 'International : CA':
					employeeId = '1278';	// Maria Mathews
					break;
				case 'International : UK':
					employeeId = '1262';	// Kamila Yusapova
					break;
				case 'International : DE':
					employeeId = '1262';	// Kamila Yusapova
					break;
				default:
					employeeId = '1278';	// Maria Mathews
			
			}
			
			nlapiSubmitField(recType,recId,'custentityaccounting_team',employeeId);
			
			nlapiLogExecution('DEBUG', 'Update Account By Market', 'recType: ' + recType + '; marketId: ' + marketId + 
					'; market: ' + market + '; venName: ' + venName);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'mass update values', 'recType: ' + recType+ '; internalId: ' + recId + '; market: ' + market + 
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}
	
}
