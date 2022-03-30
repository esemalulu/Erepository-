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
function massUpdateAddressZipCodes(recType, recId) {
	
	try {
		
		if (recType == 'vendor') {
			
			var recVendor = nlapiLoadRecord(recType, recId);
			
			var nameId = recVendor.getFieldValue('entityid');
			var newZipCode = '';
			var zipUpdated = false;
			
			for (var i = 1, len = recVendor.getLineItemCount('addressbook')+1; i < len; i++) {
				
				var zipcode = recVendor.getLineItemValue('addressbook','zip', i); 
				
				if (zipcode) {
					
					if (zipcode.length == 4 || zipcode.length == 9) {
						
						newZipCode = '0' + zipcode;
						recVendor.selectLineItem('addressbook',i);
						recVendor.setCurrentLineItemValue('addressbook','zip',newZipCode)
						recVendor.commitLineItem('addressbook');
						
						zipUpdated = true;
						
						//nlapiLogExecution('DEBUG', 'Addressbook Fields', 'internalId: ' + recId + 'Value: ' + zipcode + '; LineItemCount: ' + len + '; LineItem: ' + i + '; NewZipCode: ' + newZipCode);
						
					}
					
				}
				
			}
			
			if (zipUpdated) {
				
				nlapiSubmitRecord(recVendor);
				//nlapiLogExecution('DEBUG', 'Update Address Line', 'internalId: ' + recId + 'Value: ' + zipcode + '; zipUpdated:' + zipUpdated);
				
			}
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'mass update address zipcode', 'recType: ' + recType+ '; internalId: ' + recId + '; nameId: ' + nameId + 
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}

}
