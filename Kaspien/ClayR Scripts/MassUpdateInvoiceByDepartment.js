/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       8 May 2017     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateInvoiceDepartment(recType, recId) {
	
	try {
		if (recType == 'invoice') {
			
			var recInvoice = nlapiLoadRecord(recType, recId);
			
			var location = recInvoice.getFieldText('location');
			var departmentId = null;
			
			switch (location) {
				case 'US':
					departmentId = 161;		// IS - FBA US
					break;
				case 'International : CA':
				case 'International : UK':
				case 'International : DE':
					departmentId = '163';	// IS -FBA International
					break;
				default:
			}
			if (departmentId) {
				nlapiSubmitField(recType,recId,'department',departmentId);	
			}
			
			nlapiLogExecution('DEBUG', 'Update Invoice By Department', 'recType: ' + recType + '; location: ' + location + '; Department: ' + departmentId);
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Invoice by Department', 'recType: ' + recType+ '; internalId: ' + recId + '; location: ' + location + 
				'; errCode: ' + err.name + '; err: ' + err.message);		
	
	}
}
