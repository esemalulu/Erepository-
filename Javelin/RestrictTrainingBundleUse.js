function ValidateLine(type) {

	var newType = nlapiGetRecordType();
	var bundleQty = 0;
	var validTrainingBundleAddition = false;
	
		//alert('RecordType = ' + newType + ', Type = ' + type + ', Current item line number: ' + nlapiGetCurrentLineItemIndex('item') +  ', item = ' + nlapiGetCurrentLineItemValue('item','item'));
		//1176 = internal id for item: TC208475	(SolidWorks Essentials)
		//1174 = internal id for item: TC208450	(SolidWorks Refresher)
		//1177 = internal id for item: TA205500 (Simulation Essentials)
		if (newType == 'estimate' && type == 'item' && (nlapiGetCurrentLineItemValue('item','item') == 1176 || nlapiGetCurrentLineItemValue('item','item') == 1174 || nlapiGetCurrentLineItemValue('item','item') == 1177)) {
			var itemCount = nlapiGetLineItemCount(type);
			bundleQty = nlapiGetCurrentLineItemValue('item', 'quantity');
			
			
			var itemIsLicence = false;
			var columns = new Array();
			//var columns[0] = new nlobjSearchColumn('<internal id>');  // Search filter: Didn't know the fieldname for <internal id>, tried 'item', 'internalID'
			// 2051 = internal id of 'customsearch_solidworksandsiumationsw'
			var searchresults = nlapiSearchRecord('item', 2051, null, null);  //columns);
			
			for (var curItem = 1; curItem <= itemCount; curItem++) {
				var thisItemID = nlapiGetLineItemValue('item','item',curItem)
				for (var i = 0; searchresults != null && i < searchresults.length; i++ ) {
					var searchresult = searchresults[i];
					if (searchresult.getId() == thisItemID) {
						itemIsLicence = true;
						//alert('SUCCESS!!!!!  Item = ' + searchresult.getId() + ', thisItemID = ' + thisItemID);
						return true;
					}
				}
			}
			alert('Please press cancel button.  You selected a training bundle that can only be added to a quote with SolidWorks or Simulation on it');
			return false;
		}
		else {
			return true;
		}
}
