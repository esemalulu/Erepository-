/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Feb 2014     nathanah
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_FixCreditMemoAddress(recType, recId) 
{
	var record = nlapiLoadRecord('creditmemo', recId, null);
	
	var dealerId = record.getFieldValue('entity');
	if (dealerId != '')
	{
		var creditOnlyDealer = nlapiLookupField('customer', dealerId, 'custentityrvscreditdealer');
		if (creditOnlyDealer == 'T')
		{
			var parentDealerId = nlapiLookupField('customer', dealerId, 'parent');
			if (parentDealerId != '')
			{
				var parentDealer = nlapiLoadRecord('customer', parentDealerId);
				var addressCount = parentDealer.getLineItemCount('addressbook');
				for (var i=1; i<= addressCount; i++)
				{
					var defaultBilling = parentDealer.getLineItemValue('addressbook', 'defaultbilling', i);
					
					if (defaultBilling == 'T')
					{
						var addr1 = parentDealer.getLineItemValue('addressbook', 'addr1', i);
						var addr2 = parentDealer.getLineItemValue('addressbook', 'addr2', i);
						var addr3 = parentDealer.getLineItemValue('addressbook', 'addr3', i);
						var addressee = parentDealer.getLineItemValue('addressbook', 'addressee', i);
						var addressid = parentDealer.getLineItemValue('addressbook', 'addressid', i);
						var addrtext = parentDealer.getLineItemValue('addressbook', 'addrtext', i);
						var attention = parentDealer.getLineItemValue('addressbook', 'attention', i);
						var city = parentDealer.getLineItemValue('addressbook', 'city', i);
						var country = parentDealer.getLineItemValue('addressbook', 'country', i);
						var isresidential = parentDealer.getLineItemValue('addressbook', 'isresidential', i);
						var label = parentDealer.getLineItemValue('addressbook', 'label', i);
						var phone = parentDealer.getLineItemValue('addressbook', 'phone', i);
						var state = parentDealer.getLineItemValue('addressbook', 'state', i);
						var zip = parentDealer.getLineItemValue('addressbook', 'zip', i);
						
						// set the ship to address on the order
						record.setFieldValue('billcountry', country);
						record.setFieldValue('billaddr1', addr1);
						record.setFieldValue('billaddr2', addr2);
						record.setFieldValue('billaddr3', addr3);				
						record.setFieldValue('billaddress', addrtext);
						record.setFieldValue('billattention', attention);
						record.setFieldValue('billaddressee', addressee);				
						record.setFieldValue('billcity', city);				
						record.setFieldValue('billisresidential', isresidential);
						record.setFieldValue('billphone', phone);
						record.setFieldValue('billstate', state);
						record.setFieldValue('billzip', zip);
						
						break;
					}
				}	
			}
		}
	}
	
	nlapiSubmitRecord(record);
}

function GD_FixRefundCheckAddress(recType, recId) 
{
	var record = nlapiLoadRecord('customerrefund', recId, null);
	
	var dealerId = record.getFieldValue('customer');
	if (dealerId != '')
	{
		var creditOnlyDealer = nlapiLookupField('customer', dealerId, 'custentityrvscreditdealer');
		if (creditOnlyDealer == 'T')
		{
			var parentDealerId = nlapiLookupField('customer', dealerId, 'parent');
			if (parentDealerId != '')
			{
				var parentDealer = nlapiLoadRecord('customer', parentDealerId);
				var addressCount = parentDealer.getLineItemCount('addressbook');
				for (var i=1; i<= addressCount; i++)
				{
					var defaultBilling = parentDealer.getLineItemValue('addressbook', 'defaultbilling', i);
					
					if (defaultBilling == 'T')
					{
						var address1 = parentDealer.getLineItemValue('addressbook', 'addr1', i);
						var address2 = parentDealer.getLineItemValue('addressbook', 'addr2', i);
						var addr3 = parentDealer.getLineItemValue('addressbook', 'addr3', i);
						var addressee = parentDealer.getLineItemValue('addressbook', 'addressee', i);
						var addressid = parentDealer.getLineItemValue('addressbook', 'addressid', i);
						var addrtext = parentDealer.getLineItemValue('addressbook', 'addrtext', i);
						var attention = parentDealer.getLineItemValue('addressbook', 'attention', i);
						var city = parentDealer.getLineItemValue('addressbook', 'city', i);
						var country = parentDealer.getLineItemValue('addressbook', 'country', i);
						var isresidential = parentDealer.getLineItemValue('addressbook', 'isresidential', i);
						var label = parentDealer.getLineItemValue('addressbook', 'label', i);
						var phone = parentDealer.getLineItemValue('addressbook', 'phone', i);
						var state = parentDealer.getLineItemValue('addressbook', 'state', i);
						var zip = parentDealer.getLineItemValue('addressbook', 'zip', i);
						
						var addresseeLine = '';
						if (addressee != '' && addressee != null)
							addresseeLine = addressee + '\n';
						
						var addressLine = address1 + '\n';
						if (address2 != null && address2 != '' && address2 != 'null') 
						{
							addressLine += address2 + '\n';
						} 
						
						var address = addresseeLine + 
									  addressLine + 
									  city + ', ' + state + ' ' + zip;
						
						// set the ship to address on the order
						record.setFieldValue('address', address);
						record.setFieldValue('custbodyrvstobeprinted', 'T');
						
						break;
					}
				}	
			}
		}
	}
	
	nlapiSubmitRecord(record);
}