/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */

function lineDiscountLineInit(type)
{
  
	//Keeps the amount and rate values visible upon line selection
	if (type == 'item' &&  (nlapiGetCurrentLineItemValue(type, 'price') == '-1'  || nlapiGetCurrentLineItemValue(type, 'price') == '1'))
	{
	return;
	}  
  
	//Check to see if we have price set
	if (type=='item' && nlapiGetCurrentLineItemValue(type,'price')  &&  nlapiGetCurrentLineItemValue(type,'amount') )
	{	
	
		nlapiSetCurrentLineItemValue(type,'price', nlapiGetCurrentLineItemValue(type,'price'),true,true); 	
		
	}
 
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @returns {Void}
 */
function lineDiscountPostSourcing(type, name){

	//Filtered buyer alteration
	try {
		
		
		if (name=='price' && nlapiGetCurrentLineItemValue(type,'price')) 
		{
			//Does a search to see if Client has Custom Item Pricing			
			var filters = [new nlobjSearchFilter('internalid', null, 'anyof', nlapiGetFieldValue('entity')),
						  new nlobjSearchFilter('pricingitem', null, 'anyof', nlapiGetCurrentLineItemValue(type,'item'))];						  
			var columns = [new nlobjSearchColumn('pricingitem')];			
			var searchRs = nlapiSearchRecord ('customer',null , filters, columns);
		
			if(!searchRs)
			{
				
		
				var discountedLineAmount = nlapiGetCurrentLineItemValue(type,'amount');
				//if price level changes, always keep rate at base price of item
				
				//6/20/2014 - Currency based workaround.
				//Issue is that NS native value sourcing doesn't source the value based on transactions' currency.
				/**
				 * Using custom field on item and sourcing it on transaction column is not scalable. 
				 * Formula to set default value doesn't seem to work properly.
				 * HACK work around is created using NetSuite internal UNDOCUMENTED nlXMLRequestURL method and passing in 
				 * NS generate URL call. 
				 * THIS IS UNDOCUMENTED HACK WORKAROUND and May break if NS changes backend operation. 
				 */
				
				//URL below is based on steps taken during debugging process. THIS URL returns JavaScript code that NS Generated Client Script executes.
				//alert('Before: '+nlapiGetContext().getRemainingUsage());
				var customForm = nlapiGetFieldValue('customform');
				var entityId = nlapiGetFieldValue('entity');
				var subsidiaryId = nlapiGetFieldValue('subsidiary');
				var recordTypeId = nlapiGetRecordType();
				if (recordTypeId == 'salesorder') {
					recordTypeId = 'salesord';
				}
				var itemId = nlapiGetCurrentLineItemValue(type,'item');
				
				//setFormValue(document.forms['item_form'].elements['rate'], '2350.00');
				//stringToLookFor will identify where the first occurance starts.
				//once identified, length of stringToLookFor will be added to use as starting point for substring.
				var stringToLookFor = "setFormValue(document.forms['item_form'].elements['rate'], '";
				var simulatedUrl = '/app/accounting/transactions/'+recordTypeId+'.nl?'+
								   'cf='+customForm+'&e=T&q=price&si=1&si_entity='+entityId+'&si_subsidiary='+subsidiaryId+'&si_item='+itemId+'&f=T&machine=item';
				
				
				//run hidden NetSuite api call to simulatedUrl
				var lookupXml = nlXMLRequestURL(simulatedUrl).getBody();
				//remove carriage returns
				lookupXml = strGlobalReplace(lookupXml, '\n', '');
				
				//startIndexVal is first occurance of stringToLookFor + length of stringToLookFor
				var startIndexVal = lookupXml.indexOf("setFormValue(document.forms['item_form'].elements['rate'], '")+stringToLookFor.length;
				//endIndexVal will look for first occurance of '); 
				var endIndexVal = lookupXml.indexOf("');");
				
				var itemBasePriceByTrxCurrency = lookupXml.substring(startIndexVal, endIndexVal);
				
				if (itemBasePriceByTrxCurrency) {
					itemBasePriceByTrxCurrency = parseFloat(itemBasePriceByTrxCurrency).toFixed(2);
				}
				nlapiSetCurrentLineItemValue(type, 'rate', itemBasePriceByTrxCurrency, false, true);
				nlapiSetCurrentLineItemValue(type, 'amount', discountedLineAmount, false, true);
				
				
				
			}				

		
		}
		
		
		
	} catch (linediscerr) {
		alert('Error Setting Line Discount via Price Level: '+getErrText(linediscerr));
	}	
}
