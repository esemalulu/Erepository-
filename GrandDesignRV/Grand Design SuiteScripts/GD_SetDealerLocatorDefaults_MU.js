/**
 * Mass update to find the addressbook subrecord that is marked as the dealer locator default, and then set that on a new body field on the dealer
 * 
 * Version    Date            Author           Remarks
 * 2.00       16 Nov 2017     Brian Sutter
 *
 */

/**
 * For each dealer in the mass update, sets the default dealer locator address body field to be the addressbook address that was previously marked as default.
 * If it can't find one marked as default, it uses the default shipping
 * If it can't find either, it does nothing.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdate(recType, recId)
{
	//Load the record.
	var dealerRec = nlapiLoadRecord('customer', recId, {recordmode: 'dynamic'});
	
	//Loop through the addressbook lines, and view the subrecord to find the one marked as the dealer locator default
	try {
		
		//We need to store both the id of the address (so we can display it to the user),
		//and the id of the addressbook subrecord, so we can store it on a hidden body field and find it via search
		var defaultDLAddressId = '';
		var defaultDLAddressBookId = '';
		var foundDefault = false;
		
		for(var a = 0; a < dealerRec.getLineItemCount('addressbook'); a++){
			dealerRec.selectLineItem('addressbook', a + 1);
			var subrecord = dealerRec.viewCurrentLineItemSubrecord('addressbook', 'addressbookaddress');

			var isDefaultDLAddress = subrecord.getFieldValue('custrecordgd_defaultdealerlocator');
			if(isDefaultDLAddress == 'T')
			{
				defaultDLAddressId = dealerRec.getCurrentLineItemValue('addressbook', 'id') || '';
				defaultDLAddressBookId = dealerRec.getCurrentLineItemValue('addressbook', 'addressbookaddress_key') || '';
				//nlapiLogExecution('debug', recId + ' defaultDLAddressId from default', defaultDLAddressId);
				foundDefault = true;
				break;
			}

		}
		
		//If there is no addressbook entry set as the Default dealer address, just get the default shipping
		if(foundDefault == false)
		{
			var lineNum = dealerRec.findLineItemValue('addressbook', 'defaultshipping', 'T');
			if (lineNum < 1) return; 	//If there isn't one, we can't do anything else, so our work here is done
			
			dealerRec.selectLineItem('addressbook', lineNum);
			defaultDLAddressId = dealerRec.getCurrentLineItemValue('addressbook', 'id') || '';
			defaultDLAddressBookId = dealerRec.getCurrentLineItemValue('addressbook', 'addressbookaddress_key') || '';
			nlapiLogExecution('debug', recId + ' defaultDLAddressId from shipping', defaultDLAddressId + ' | defaultDLAddressBookId: ' + defaultDLAddressBookId);

		}
		
		//Set that on our new body field
//		dealerRec.setFieldValue('custentitygd_defaultdealerlocatoraddress', defaultDLAddressId); //this field was deleted per case 9998
		dealerRec.setFieldValue('custentitygd_defaultdealerlocatoraddrbk', defaultDLAddressBookId);
		nlapiSubmitRecord(dealerRec, false, true);
	}
	catch(err){
		nlapiLogExecution('error', 'dealer update err', recId + ' ' + err);
	}
}
