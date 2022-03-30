function afterSubmitFunction() 
{
	var customform = nlapiGetFieldValue('customform');

	if (customform == getPointsFormId()) 
    {

          var count = nlapiGetLineItemCount('item');
          var points = 0;

          for (i = 1; i <= count; i++) 
          {
              var itemId = nlapiGetLineItemValue('item', 'item', i);
              if (itemId == getPointsItemId() || itemId == getKpmgPointsItemId()) 
              {
                points += parseInt(nlapiGetLineItemValue('item', getPointsOrderedCustomFieldId(), i));
              }
          }

          if (points != 0) 
          {
              var url = getServer() + "/netsuite/AddPoints";
              var post = new Array();
              post['userExternalId'] = getAuthenticatedExternalID();
              var internalId = nlapiGetFieldValue('entity');
              post['accountExternalId'] = nlapiLookupField('customer', internalId, 'externalid');
              post['invoiceNumber'] = nlapiGetFieldValue('tranid');

              //post['invoiceDate'] = nlapiGetFieldValue('trandate');

              post['points'] = points.toFixed(0);

              var parentProgram = nlapiLoadRecord('customer', internalId);
              var trueParentProgram = parentProgram.getFieldValue('parent');
              post['programExternalId'] = nlapiLookupField('customer', trueParentProgram, 'externalid');

              var header = getStandardHeader();
              var response = nlapiRequestURL(url, post, header);
              handleResponse(response, url, post);
          }
	}
}
