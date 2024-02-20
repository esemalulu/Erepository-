/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Mar 2016     jeffrb
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_Address1BugMassUpdate(recType, recId)
{
	var creditMemo = nlapiLoadRecord(recType, recId);
	
	var credMemoAddress1 = creditMemo.getFieldValue('billaddr1') || '';
	if (credMemoAddress1 == '')
	{
		var dealerParentId = nlapiLookupField('customer', creditMemo.getFieldValue('entity'), 'parent');
		var dealerBillAddress = nlapiLookupField('customer', dealerParentId, ['billaddress', 'billaddress1', 'billaddressee', 'billcity', 'billcountry', 'billstate', 'billphone', 'billzipcode', 'billattention', 'billaddress2', 'billaddress3']);
		
		// set the ship to address on the order
		creditMemo.setFieldValue('billaddr1', dealerBillAddress.billaddress1);
		
		if (creditMemo.getFieldValue('billaddressee') == '')
		{
			creditMemo.setFieldValue('billcountry', dealerBillAddress.billcountry);
			creditMemo.setFieldValue('billaddr2', dealerBillAddress.billaddress2);
			creditMemo.setFieldValue('billaddr3', dealerBillAddress.billaddress3);
			creditMemo.setFieldValue('billaddress', dealerBillAddress.billaddress);
			creditMemo.setFieldValue('billattention', dealerBillAddress.billattention);
			creditMemo.setFieldValue('billaddressee', dealerBillAddress.billaddressee);
			creditMemo.setFieldValue('billcity', dealerBillAddress.billcity);
			creditMemo.setFieldValue('billphone', dealerBillAddress.billphone || '');
			if (dealerBillAddress.billphone == '')
				creditMemo.setFieldValue('billphone', '000-000-0001');
			creditMemo.setFieldValue('billstate', dealerBillAddress.billstate);
			creditMemo.setFieldValue('billzip', dealerBillAddress.billzipcode);
          	nlapiLogExecution('DEBUG', 'dealer parent id', dealerParentId);
		}
		else if (creditMemo.getFieldValue('billphone') == '')
		{
			creditMemo.setFieldValue('billphone', dealerBillAddress.billphone || '');
			if (dealerBillAddress.billphone == '')
				creditMemo.setFieldValue('billphone', '000-000-0002');
		}
		
		nlapiSubmitRecord(creditMemo);
	}
}
