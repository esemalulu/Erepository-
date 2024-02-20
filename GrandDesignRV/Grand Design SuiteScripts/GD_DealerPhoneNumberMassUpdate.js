/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Jul 2015     brians
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function SetPhoneNumberOnAddress(recType, recId) {

	var dealerRecord = nlapiLoadRecord(recType, recId, {recordmode: 'dynamic'});
	
	//We do try catch to make sure the mass update does not stop if one record fails.
	try
	{
		var currentMainPhone = dealerRecord.getFieldValue('phone');
		var numberOfAddresses = dealerRecord.getLineItemCount('addressbook');
		var submitRecord = false;
		var commitAddressLine = false;
		for(var i = 1; i<=numberOfAddresses; i++)
		{
			dealerRecord.selectLineItem('addressbook', i);
			var addrSubrecord = dealerRecord.editCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
			if(addrSubrecord != null)
			{			
				var currentAddrPhone = addrSubrecord.getFieldValue('addrphone');
				var currentCountry = addrSubrecord.getFieldValue('country');
				
				//If Address Phone number is not set and the address has country, 
				//set the phone number based on the dealer main phone or dummy phone number if dealer has no main phone.
				//Note: we check for country because it is a required field on the address. 
				//      If it is not set, then we leave the address alone.
				if((currentAddrPhone == null || currentAddrPhone == '') && 
				   (currentCountry != null && currentCountry != ''))
				{
					if(currentMainPhone != '' && currentMainPhone != null){
						//If the dealer record has a phone number defined, then use that one for the address phone
						addrSubrecord.setFieldValue('addrphone', currentMainPhone);
					}
					else{ //But if the dealer does not have a phone number defined, then use 000-000-0000
						addrSubrecord.setFieldValue('addrphone', '000-000-0000');
						//addrSubrecord.commit();
						//nlapiCommitLineItem('addressbook');
					}
					commitAddressLine = true;
				}
				else
					commitAddressLine = false;
				
				
//				if(currentCountry == null || currentCountry == '')
//				{
//					addrSubrecord.setFieldValue('country', 'US');
//					nlapiLogExecution('debug', 'SetPhoneNumberOnAddress', 'Added Country: ' + addrSubrecord.getFieldValue('country'));
//					submitRecord = true;
//					//addrSubrecord.commit();
//					//nlapiCommitLineItem('addressbook');
//				}
				
				if(commitAddressLine)
				{
					addrSubrecord.commit();
					dealerRecord.commitLineItem('addressbook');	
					
					submitRecord = true;
				}
		
			}

		}

		if(submitRecord)
		{
			nlapiSubmitRecord(dealerRecord,true,true);
		}
	
	}
	catch(e){}		
}
