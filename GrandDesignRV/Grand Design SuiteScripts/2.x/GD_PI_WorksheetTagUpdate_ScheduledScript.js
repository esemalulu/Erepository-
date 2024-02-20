/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record', 'N/search', 'N/runtime', './GD_Constants', 'N/query'],
/**
 * @param {error} error
 * @param {record} record
 * @param {search} search
 * @param {constants} constants
 * @param {query} query
 */
function(error, record, search, runtime, GD_Constants, query) {

    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	// Get the worksheet internal ID from parameters
    	var worksheetId = runtime.getCurrentScript().getParameter({name: 'custscriptgd_piworksheetcountid'}) || '';

    	// Load the record in dynamic mode
    	var worksheetRecord = record.load({
    		type: 'customrecordgd_physicalinventoryworkshee',
    		id: worksheetId,
    		isDynamic: true
    	});

    	// Get the dat to create a three month period for the last purchase 3 column.
    	var worksheetDate = worksheetRecord.getValue({
    		fieldId: 'custrecordgd_physinvtwrksht_date'
    	});

    	var physicalInventoryCountRecordId = worksheetRecord.getValue({
    		fieldId: 'custrecordgd_physinvtwrksht_physinvtcnt'
    	});

    	// Get the previous inventory count record to be used for the last inventory data count.
    	var lastPhysicalInventoryCountRecordId = search.lookupFields({
    		type: 'customrecordgd_physicalinventorycount',
    		id: physicalInventoryCountRecordId,
    		columns: 'custrecordgd_physinvtcount_lastinventory'
    	}).custrecordgd_physinvtcount_lastinventory || '';

    	var wDateToConvert = new Date(worksheetDate);
    	var worksheetFormattedDate = (wDateToConvert.getMonth() + 1) + "/" + wDateToConvert.getDate() + "/" + wDateToConvert.getFullYear();
    	wDateToConvert.setMonth(wDateToConvert.getMonth() - 3);
    	var dateThreeMonthsLater = (wDateToConvert.getMonth() + 1) + "/" + wDateToConvert.getDate() + "/" + wDateToConvert.getFullYear();

    	var locationId = worksheetRecord.getValue({
    		fieldId: 'custrecordgd_physinvtwrksht_plant'
    	}) || 0;

    	var lineItems = new Object();

    	var tagLineIdsArray = new Array();
    	var itemId = 0;
    	for (var i = 0; i < worksheetRecord.getLineCount({sublistId: 'recmachcustrecordgd_physinvttagline_parent'}); i++) {
    		itemId = worksheetRecord.getSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_item', line: i}) || 0;
    		tagLineIdsArray.push(itemId);
    		lineItems[itemId] = {lastInv: 0, lastThreeMonthsPurch: 0, lastInvAndPurch: 0, vendorpartNum: '', lastPurchPrice: '', hasLocationPurchPrice: false, unitsType: ''};
    	}

    	// If the last physical inventory count record ID does not exist, do not get any last inventory data.
    	if (lastPhysicalInventoryCountRecordId != '' && tagLineIdsArray.length > 0) {
    		// Get the last inventory count data if the last inventory count is set
    		var itemSearchLastInvObj = search.create({
    			   type: "customrecordgd_physinvttagline",
    			   filters: [
    		    		       ["custrecordgd_physinvttagline_item.internalid","anyof",tagLineIdsArray],
    		    		       "AND",
    		    		       ["custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_plant","anyof",locationId],
    		    		       "AND",
    		    		       ["custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_physinvtcnt","anyof", lastPhysicalInventoryCountRecordId[0].value],
    		    		       "AND",
    		    		       ["isinactive","is","F"]
    		    		   ],
    			   columns:
    			   [
    					search.createColumn({
    						name: "custrecordgd_physinvttagline_item",
    					    summary: "group",
    					    sort: search.Sort.ASC
    					}),
    					search.createColumn({
    					    name: "custrecordgd_physinvttagline_quantity",
    					    summary: "sum"
    					}),
    					search.createColumn({
    					    name: "type",
    					    join: "custrecordgd_physinvttagline_item",
    					    summary: "group"
    					})
    			   ]
    			}).runPaged();
    	    	itemSearchLastInvObj.pageRanges.forEach(function(pageRange) {
    	    		itemSearchLastInvObj.fetch({index: pageRange.index}).data.forEach(function(result) {
    	    			// sum the last invenotry data for all tags in that physical inventory count and set it on our object.
    	    			if (typeof(result.getValue({name: 'custrecordgd_physinvttagline_item', summary: 'group'})) != 'undefined') {
    	    				lineItems[result.getValue({name: 'custrecordgd_physinvttagline_item', summary: 'group'})].lastInv += parseFloat(result.getValue({name: 'custrecordgd_physinvttagline_quantity', summary: 'sum'}));
    	    				lineItems[result.getValue({name: 'custrecordgd_physinvttagline_item', summary: 'group'})].lastInvAndPurch += parseFloat(result.getValue({name: 'custrecordgd_physinvttagline_quantity', summary: 'sum'}));
    	    			}

    	    			return true;
    	    		});
    			});
    	}

    	if (tagLineIdsArray.length > 0) {
	    	// Get the item PO data by date and location
	    	var purchaseorderSearchPurchLast3Obj = search.create({
			   type: search.Type.PURCHASE_ORDER,
			   filters:
			   [
			      ["duedate","within",dateThreeMonthsLater,worksheetFormattedDate],
			      "AND",
			      ["mainline","is","F"],
			      "AND",
			      ["item.internalid","anyof",tagLineIdsArray],
			      "AND",
			      ["location","anyof",locationId]
			   ],
			   columns:
			   [
			      search.createColumn({
			         name: "item",
			         label: "GDRV #",
			         summary: 'group'
			      }),
			      search.createColumn({
			         name: "quantityuom",
			         join: "fulfillingTransaction",
			         label: "Qty Rcvd",
			         summary: 'sum'
			      })
			   ]
			}).runPaged();
	    	var searchItemId = '';
	    	purchaseorderSearchPurchLast3Obj.pageRanges.forEach(function(pageRange) {
	    		purchaseorderSearchPurchLast3Obj.fetch({index: pageRange.index}).data.forEach(function(result) {
	    			// Set the data in our object to be used to set data in worksheet tag line records.
	    			searchItemId = result.getValue({name: 'item', summary: 'group'}) || null;
	    			if (result.getValue({name: 'item', summary: 'group'}) != null) {
	    				if (lineItems[searchItemId].lastThreeMonthsPurch == 0)
	    					lineItems[searchItemId].lastThreeMonthsPurch += parseFloat(result.getValue({name: 'quantityuom', join: 'fulfillingTransaction', summary: 'sum'}));

	    				if (lineItems[searchItemId].lastInvAndPurch == 0)
	    					lineItems[searchItemId].lastInvAndPurch += parseFloat(result.getValue({name: 'quantityuom', join: 'fulfillingTransaction', summary: 'sum'}));
	    			}

	    			return true;
	    		});
			});

	    	// Get the last purchase price and vendor part # for each item if it exists.
			// New Search using Reciept
			var itemreceiptSearchObj = search.create({
				type: "itemreceipt",
				filters:
				[
				   ["type","anyof","ItemRcpt"],
				   "AND",
				   ["item.internalid","anyof",tagLineIdsArray],
				   "AND",
				   ["location","anyof",locationId],
				   "AND",
				   ["datecreated","within","ninetydaysago"]
				],
				columns:
				[
					search.createColumn({name: "tranid", label: "Document Number", summary: 'MAX'}),
					search.createColumn({name: "entity", label: "Name", summary: 'group'}),
					search.createColumn({name: "item", label: "Item", summary: 'group'}),
					search.createColumn({name: "custcolrvsvendorpartnumber", label: "Vendor Part No.", summary: 'group'}),
					search.createColumn({name: "rate", label: "Item Rate", summary: 'group'}),
					search.createColumn({name: "location", label: "Location", summary: 'group'}),
					search.createColumn({name: "datecreated", label: "Date Created", summary: 'group'}),
					search.createColumn({name: "unit", label: "Units", summary: 'group'}),
					search.createColumn({name: "internalid", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
					search.createColumn({name: "datecreated", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
				]
			 });
			 var searchResultCount = itemreceiptSearchObj.runPaged().count;
			 log.debug("itemreceiptSearchObj result count",searchResultCount);
			 itemreceiptSearchObj.run().each(function(result){
				// .run().each has a limit of 4,000 results
				var searchItemId = '';
				searchItemId = result.getValue({name: 'item', summary: 'group'}) || null;
	     			if (result.getValue({name: 'item', summary: 'group'}) != null) {
	     				if (lineItems[searchItemId].vendorpartNum == '' && result.getValue({name: "Name", summary: 'group'}) != '- None -')
	     					lineItems[searchItemId].vendorpartNum = result.getValue({name: "Name", summary: 'group'});

	     				if (lineItems[result.getValue({name: 'item', summary: 'group'})].lastPurchPrice == '') {
	     					lineItems[searchItemId].lastPurchPrice = parseFloat(result.getValue({name: 'rate', summary: 'group'}) || 0);
	     					lineItems[searchItemId].unitsType = result.getValue({name: 'Units', join: 'item', summary: 'group'});
	     					lineItems[searchItemId].hasLocationPurchPrice = true;
	     				}
	     			}
				return true;
			 });
			//#region Old Search Using PO Rate
	    	// var purchaseorderSearchPurchLastVendPartObj = search.create({
	 		//    type: search.Type.PURCHASE_ORDER,
	 		//    filters:
	 		//    [
	 		//       ["mainline","is","F"],
	 		//       "AND",
	 		//       ["item.internalid","anyof",tagLineIdsArray],
	 		//       "AND",
	 		//       ["location","anyof",locationId]
	 		//    ],
	 		//    columns:
	 		//    [
	 		//       search.createColumn({
	 		//          name: "item",
	 		//          summary: 'group'
	 		//       }),
	 		//       search.createColumn({name: "internalid", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
	 		//       search.createColumn({name: "datecreated", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
	 		//       search.createColumn({name: "custcolgd_vendornamesearchable", label: "Vendor Part #", summary: 'group'}),
	 		//       search.createColumn({name: "rate", label: "Last Purchase Price", summary: 'group'}),
	 		//       search.createColumn({name: "unitstype", join: 'item', label: "Unit Type", summary: 'group'})
	 		//    ]
	 		// }).runPaged();
	     	// var searchItemId = '';
	     	// purchaseorderSearchPurchLastVendPartObj.pageRanges.forEach(function(pageRange) {
	     	// 	purchaseorderSearchPurchLastVendPartObj.fetch({index: pageRange.index}).data.forEach(function(result) {
	     	// 		searchItemId = result.getValue({name: 'item', summary: 'group'}) || null;
	     	// 		if (result.getValue({name: 'item', summary: 'group'}) != null) {
	     	// 			if (lineItems[searchItemId].vendorpartNum == '' && result.getValue({name: "custcolgd_vendornamesearchable", summary: 'group'}) != '- None -')
	     	// 				lineItems[searchItemId].vendorpartNum = result.getValue({name: "custcolgd_vendornamesearchable", summary: 'group'});

	     	// 			if (lineItems[result.getValue({name: 'item', summary: 'group'})].lastPurchPrice == '') {
	     	// 				lineItems[searchItemId].lastPurchPrice = parseFloat(result.getValue({name: 'rate', summary: 'group'}) || 0);
	     	// 				lineItems[searchItemId].unitsType = result.getValue({name: 'unitstype', join: 'item', summary: 'group'});
	     	// 				lineItems[searchItemId].hasLocationPurchPrice = true;
	     	// 			}
	     	// 		}

	     	// 		return true;
	     	// 	});
	 		// });
	     	//#endregion

	     	// Get the last purchase price and vendor part # for each item if it exists. FROM ANY LOCATION
	    	// New Search using Reciept
			var itemreceiptSearchObj = search.create({
				type: "itemreceipt",
				filters:
				[
				   ["type","anyof","ItemRcpt"],
				   "AND",
				   ["item.internalid","anyof",tagLineIdsArray],
				   "AND",
				   ["location","noneof", GD_Constants.GD_LOCATIONS_CRIB_PARTSANDSERVICE, GD_Constants.GD_LOCATIONS_PLANT_PARTSANDSERVICE],
				   "AND",
				   ["datecreated","within","ninetydaysago"]
				],
				columns:
				[
					search.createColumn({name: "tranid", label: "Document Number", summary: 'MAX'}),
					search.createColumn({name: "entity", label: "Name", summary: 'group'}),
					search.createColumn({name: "item", label: "Item", summary: 'group'}),
					search.createColumn({name: "custcolrvsvendorpartnumber", label: "Vendor Part No.", summary: 'group'}),
					search.createColumn({name: "rate", label: "Item Rate", summary: 'group'}),
					search.createColumn({name: "location", label: "Location", summary: 'group'}),
					search.createColumn({name: "datecreated", label: "Date Created", summary: 'group'}),
					search.createColumn({name: "unit", label: "Units", summary: 'group'}),
					search.createColumn({name: "internalid", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
					search.createColumn({name: "datecreated", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
				]
			});
			var searchResultCount = itemreceiptSearchObj.runPaged().count;
			log.debug("itemreceiptSearchObj result count",searchResultCount);
			itemreceiptSearchObj.run().each(function(result){
			// .run().each has a limit of 4,000 results
			var searchItemId = '';
			searchItemId = result.getValue({name: 'item', summary: 'group'}) || null;
				if (result.getValue({name: 'item', summary: 'group'}) != null) {
					if (lineItems[searchItemId].vendorpartNum == '' && result.getValue({name: "Name", summary: 'group'}) != '- None -')
						lineItems[searchItemId].vendorpartNum = result.getValue({name: "Name", summary: 'group'});

					if (lineItems[result.getValue({name: 'item', summary: 'group'})].lastPurchPrice == '') {
						lineItems[searchItemId].lastPurchPrice = parseFloat(result.getValue({name: 'rate', summary: 'group'}) || 0);
						lineItems[searchItemId].unitsType = result.getValue({name: 'Units', join: 'item', summary: 'group'});
						lineItems[searchItemId].hasLocationPurchPrice = true;
					}
				}
			return true;
			});
			//#region Old Search using PO Rate
			// purchaseorderSearchPurchLastVendPartObj = search.create({
			// type: search.Type.PURCHASE_ORDER,
			// filters:
			// [
			// 	["mainline","is","F"],
			// 	"AND",
			// 	["item.internalid","anyof",tagLineIdsArray],
			// 	"AND",
			// 	["location","noneof", GD_Constants.GD_LOCATIONS_CRIB_PARTSANDSERVICE, GD_Constants.GD_LOCATIONS_PLANT_PARTSANDSERVICE]
			// ],
			// columns:
			// [
			// 	search.createColumn({
			// 		name: "item",
			// 		summary: 'group'
			// 	}),
			// 	search.createColumn({name: "internalid", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
			// 	search.createColumn({name: "datecreated", sort: search.Sort.DESC, label: "PO Internal ID", summary: 'MAX'}),
			// 	search.createColumn({name: "custcolgd_vendornamesearchable", label: "Vendor Part #", summary: 'group'}),
			// 	search.createColumn({name: "rate", label: "Last Purchase Price", summary: 'group'}),
			// 	search.createColumn({name: "unitstype", join: 'item', label: "Unit Type", summary: 'group'}),

			// ]
	 		// }).runPaged();
	     	// var searchItemId = '';
	     	// purchaseorderSearchPurchLastVendPartObj.pageRanges.forEach(function(pageRange) {
	     	// 	purchaseorderSearchPurchLastVendPartObj.fetch({index: pageRange.index}).data.forEach(function(result) {
	     	// 		searchItemId = result.getValue({name: 'item', summary: 'group'}) || null;
	     	// 		if (result.getValue({name: 'item', summary: 'group'}) != null) {
	     	// 			if (lineItems[searchItemId].vendorpartNum == '' && result.getValue({name: "custcolgd_vendornamesearchable", summary: 'group'}) != '- None -')
	     	// 				lineItems[searchItemId].vendorpartNum = result.getValue({name: "custcolgd_vendornamesearchable", summary: 'group'});

	     	// 			if (lineItems[result.getValue({name: 'item', summary: 'group'})].lastPurchPrice == '') {
	     	// 				lineItems[searchItemId].lastPurchPrice = parseFloat(result.getValue({name: 'rate', summary: 'group'}) || 0);
	     	// 				lineItems[searchItemId].unitsType = result.getValue({name: 'unitstype', join: 'item', summary: 'group'});
	     	// 			}
	     	// 		}

	     	// 		return true;
	     	// 	});
	 		// });
			//#endregion
    	}



    	var lineItemCost = '';
    	var vendorPartNum = '';
    	var itemType = '';
    	var tagLineItemId = '';
    	var tagLineQuantity = 0;
    	// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
		var maxTryCount = 5;
		var tryCount = 1;
		var unitsTypeArray = new Array();
		var lineUOMId = '0';
		while(tryCount < maxTryCount) {
			try {
				//Load the record again to get a fresh version of the record.
				worksheetRecord = record.load({
		    		type: 'customrecordgd_physicalinventoryworkshee',
		    		id: worksheetId,
		    		isDynamic: true
		    	});
				var totalExtCost = 0;
				var lineExtCost = 0;
				// Set the data collected on the tag lines of the WorkSheet
				for (var i = 0; i < worksheetRecord.getLineCount({sublistId: 'recmachcustrecordgd_physinvttagline_parent'}); i++) {
					worksheetRecord.selectLine({sublistId: 'recmachcustrecordgd_physinvttagline_parent',line: i});
					tagLineItemId = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_item'});
					lineUOMId = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_purchuom'});
					
					// Set the last inventory count and last purchase count in last 3 months.
					worksheetRecord.setCurrentSublistValue({
						sublistId: 'recmachcustrecordgd_physinvttagline_parent',
						fieldId: 'custrecordgd_physinvttagline_lastinvpurc',
						value: lineItems[tagLineItemId].lastInvAndPurch || 0
					});

					// Set the last purchase count in the last 3 months.
					worksheetRecord.setCurrentSublistValue({
						sublistId: 'recmachcustrecordgd_physinvttagline_parent',
						fieldId: 'custrecordgd_physinvttagline_purchlast3',
						value: lineItems[tagLineItemId].lastThreeMonthsPurch || 0
					});

					//Set if the line item has a purchase order price in combination with the location in the WorkSheet.
					worksheetRecord.setCurrentSublistValue({
						sublistId: 'recmachcustrecordgd_physinvttagline_parent',
						fieldId: 'custrecordgd_physinvttagline_haslocpurpr',
						value: lineItems[tagLineItemId].hasLocationPurchPrice
					});

					vendorPartNum = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_vendpartnum'}) || '';
					lineItemCost = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_cost'}) || 0;
					itemType = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_itemtype'});
					// Only set the vendor part num and line item cost if they are not set or zero and that the item type is not assembly item.
					if (itemType != GD_Constants.GD_ITEM_TYPE_ASSEMBLY_ITEM && itemType != GD_Constants.GD_ITEM_TYPE_NONINVENTORY_ITEM) {
						// Set the vendor part num.
						worksheetRecord.setCurrentSublistValue({
							sublistId: 'recmachcustrecordgd_physinvttagline_parent',
							fieldId: 'custrecordgd_physinvttagline_vendpartnum',
							value: lineItems[tagLineItemId].vendorpartNum
						});
						log.debug('unitsType: ' + lineItems[tagLineItemId].unitsType, 'lineUOMId: ' + lineUOMId + ' - lastPurchPrice: ' + (lineItems[tagLineItemId].lastPurchPrice + ': ' + search.lookupFields({
							type: 'item',
							id: tagLineItemId,
							columns: 'lastpurchaseprice'
						}).lastpurchaseprice));


						var convertedCost = ConvertUOMFromBase(lineItems[tagLineItemId].unitsType, lineUOMId, (
							lineItems[tagLineItemId].lastPurchPrice ||
							search.lookupFields({
								type: 'item',
								id: tagLineItemId,
								columns: 'lastpurchaseprice'
							}).lastpurchaseprice ||
							0
						), unitsTypeArray);

						// Set the cost from last purchase price by item by location.
						tagLineQuantity = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_quantity'});
						worksheetRecord.setCurrentSublistValue({
							sublistId: 'recmachcustrecordgd_physinvttagline_parent',
							fieldId: 'custrecordgd_physinvttagline_cost',
							value: parseFloat(convertedCost || 0).toFixed(3)
						});

						lineExtCost = (parseFloat(convertedCost || 0) * tagLineQuantity) || 0;
						// Set the calculated extended cost from the quantity and the price.
						worksheetRecord.setCurrentSublistValue({
							sublistId: 'recmachcustrecordgd_physinvttagline_parent',
							fieldId: 'custrecordgd_physinvttagline_extendcost',
							value: lineExtCost.toFixed(3)
						});

						totalExtCost += parseFloat(lineExtCost || 0);
					}
					if(itemType == GD_Constants.GD_ITEM_TYPE_ASSEMBLY_ITEM){
						try{
							var sqlStatement = ("SELECT custitemrvsrolledupcost FROM item WHERE itemtype = \'Assembly\' AND ID = "+ worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_item'}));
							var resultSuiteQL = query.runSuiteQL({
								query: sqlStatement
							});
							var rvsRolledUpCostResults = resultSuiteQL.results[0].asMap();
							log.debug('resultSuiteQL.results[0].asMap()',rvsRolledUpCostResults);
							var rvsRolledUpCost = rvsRolledUpCostResults.custitemrvsrolledupcost;

							var convertedCost = rvsRolledUpCost || 0;
							log.debug('convertedCost',convertedCost);
							// Set the cost from last purchase price by item by location.
							tagLineQuantity = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_quantity'});
							log.debug('tagLineQuantity',tagLineQuantity);
							worksheetRecord.setCurrentSublistValue({
								sublistId: 'recmachcustrecordgd_physinvttagline_parent',
								fieldId: 'custrecordgd_physinvttagline_cost',
								value: parseFloat(convertedCost || 0).toFixed(3)
							});
							log.debug('parseFloat(convertedCost || 0)* tagLineQuantity',(parseFloat(convertedCost || 0)* tagLineQuantity));
							lineExtCost = (parseFloat(convertedCost || 0) * tagLineQuantity) || 0;
							log.debug('lineExtCost',lineExtCost);
							// Set the calculated extended cost from the quantity and the price.
							worksheetRecord.setCurrentSublistValue({
								sublistId: 'recmachcustrecordgd_physinvttagline_parent',
								fieldId: 'custrecordgd_physinvttagline_extendcost',
								value: lineExtCost.toFixed(3)
							});

							totalExtCost += parseFloat(lineExtCost || 0);
							//totalExtCost += parseFloat(worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_extendcost'}) || 0);
						}catch(e){
							log.debug('Catch e', e);
						}
					}
					if(itemType == GD_Constants.GD_ITEM_TYPE_NONINVENTORY_ITEM){
						log.debug('GD_ITEM_TYPE_NONINVENTORY_ITEM');
						try{
							var tageLineCost = tagLineQuantity = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_cost'});
							if(tageLineCost == 0){
								// Set the vendor part num.
								worksheetRecord.setCurrentSublistValue({
									sublistId: 'recmachcustrecordgd_physinvttagline_parent',
									fieldId: 'custrecordgd_physinvttagline_vendpartnum',
									value: lineItems[tagLineItemId].vendorpartNum
								});
								log.debug('unitsType: ' + lineItems[tagLineItemId].unitsType, 'lineUOMId: ' + lineUOMId + ' - lastPurchPrice' + (lineItems[tagLineItemId].lastPurchPrice || 0));
								var convertedCost = ConvertUOMFromBase(lineItems[tagLineItemId].unitsType, lineUOMId, (
									lineItems[tagLineItemId].lastPurchPrice ||
									search.lookupFields({
										type: 'item',
										id: tagLineItemId,
										columns: 'lastpurchaseprice'
									}).lastpurchaseprice ||
									0
								), unitsTypeArray);

								// Set the cost from last purchase price by item by location.
								tagLineQuantity = worksheetRecord.getCurrentSublistValue({sublistId: 'recmachcustrecordgd_physinvttagline_parent', fieldId: 'custrecordgd_physinvttagline_quantity'});
								worksheetRecord.setCurrentSublistValue({
									sublistId: 'recmachcustrecordgd_physinvttagline_parent',
									fieldId: 'custrecordgd_physinvttagline_cost',
									value: parseFloat(convertedCost || 0).toFixed(3)
								});

								lineExtCost = (parseFloat(convertedCost || 0) * tagLineQuantity) || 0;
								// Set the calculated extended cost from the quantity and the price.
								worksheetRecord.setCurrentSublistValue({
									sublistId: 'recmachcustrecordgd_physinvttagline_parent',
									fieldId: 'custrecordgd_physinvttagline_extendcost',
									value: lineExtCost.toFixed(3)
								});

								totalExtCost += parseFloat(lineExtCost || 0);
							}
						}catch(e){
							log.debug('Catch e', e);
						}
					}

					worksheetRecord.commitLine({sublistId: 'recmachcustrecordgd_physinvttagline_parent'});
				}

				worksheetRecord.setValue({fieldId: 'custrecordgd_physinvtwrksht_totalextcost', value: totalExtCost});

				worksheetRecord.setValue({fieldId: 'custrecordgd_pilockedforprocessing', value: false});

				worksheetRecord.save();

				break;
			}
			catch(err) {
				log.audit('err message', JSON.stringify(err));
	    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
	    			tryCount++;
	    			continue;
	    		}
	    		// Issue with the script, unlock the record.
	    		record.submitFields({
		    		type: 'customrecordgd_physicalinventoryworkshee',
		    		id: worksheetId,
		    		values: {
		    			custrecordgd_pilockedforprocessing: 'F'
		    		}
		    	});
	    		throw err;
			}
		}
    }

    /**
     * Converts from the base UOM to another UOM.
     * @param unitsTypeId
     * @param toUOMId
     * @param cost
     * @param unitsTypeArray
     * @returns {Number}
     */
    function ConvertUOMFromBase(unitsTypeId, toUOMId, cost, unitsTypeArray)
    {
    	if (unitsTypeId != null && unitsTypeId != '')
    	{
    		var unitsType = null;
    		if (unitsTypeArray[unitsTypeId] == null)
    		{
    			unitsTypeArray[unitsTypeId] = record.load({type: 'unitstype', id: unitsTypeId});
    		}

    		unitsType = unitsTypeArray[unitsTypeId];

    		var toRate = 0;

    		var count = unitsType.getLineCount({sublistId: 'uom'});

    		for (var i=1; i<=count; i++)
    		{
    			var uomInternalId = unitsType.getSublistValue({sublistId: 'uom', fieldId: 'internalid', line: i});
    			var isBase = unitsType.getSublistValue({sublistId: 'uom', fieldId: 'baseunit', line: i});

    			// we found the UOM but make sure it isn't the base ... if it is, then we shouldn't do the converting because we are already at the base
    			if (uomInternalId == toUOMId && isBase != 'T')
    			{
    				toRate = parseFloat(unitsType.getSublistValue({sublistId: 'uom', fieldId: 'conversionrate', line: i}));
    				return cost*toRate;
    			}
    		}

    		return cost;
    	}

    	return cost;
    }

    return {
        execute: execute
    };

});
