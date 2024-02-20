/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Nov 2014     jeffrb
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function UpdateCreditMemoAddresses(recType, recId) 
{
	var creditMemo = nlapiLoadRecord(recType, recId);
	var dealerId = creditMemo.getFieldValue('entity');
	
	var creditOnlyDealer = nlapiLookupField('customer', dealerId, 'custentityrvscreditdealer');
	if (creditOnlyDealer == 'T')
	{
		// load the record instead of doing the lookup because if we use the lookup the "parent" is the top-level parent and not the immediate parent
		// the immediate parent is where the address info is loaded
		// 5-1-2014 NAH
		var dealerRecord = nlapiLoadRecord('customer', dealerId);
		var parentDealerId = dealerRecord.getFieldValue('parent'); //nlapiLookupField('customer', dealerId, 'parent');
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
					creditMemo.setFieldValue('billcountry', country);
					creditMemo.setFieldValue('billaddr1', addr1);
					creditMemo.setFieldValue('billaddr2', addr2);
					creditMemo.setFieldValue('billaddr3', addr3);
					creditMemo.setFieldValue('billaddress', addrtext);
					creditMemo.setFieldValue('billattention', attention);
					creditMemo.setFieldValue('billaddressee', addressee);
					creditMemo.setFieldValue('billcity', city);				
					creditMemo.setFieldValue('billisresidential', isresidential);
					creditMemo.setFieldValue('billphone', phone);
					creditMemo.setFieldValue('billstate', state);
					creditMemo.setFieldValue('billzip', zip);
					nlapiLogExecution('debug', 'testing12345...', zip);
					var recIdz = nlapiSubmitRecord(creditMemo);
					nlapiLogExecution('debug', 'testing12345...', recIdz);
					
					break;
				}
			}	
		}
	}
}
