//####################################################################################################
/*var arrItemFieldsNeededData =
 [
 'isinactive',
 'displayname',
 'custitemr7itemacrproducttype',
 'usemarginalrates',
 'custitemr7itemmarginrateaddvalue',
 'overallquantitypricingtype',
 'custitemr7itemfamily',
 'custitemr7addondataqty'
 ];
 
 */
var arrItemFieldsNeededData = [];
arrItemFieldsNeededData.push('isinactive');
arrItemFieldsNeededData.push('displayname');
arrItemFieldsNeededData.push('custitemr7itemacrproducttype');
arrItemFieldsNeededData.push('usemarginalrates');
arrItemFieldsNeededData.push('custitemr7itemmarginrateaddvalue');
arrItemFieldsNeededData.push('overallquantitypricingtype');
arrItemFieldsNeededData.push('custitemr7itemfamily');
arrItemFieldsNeededData.push('custitemr7addondataqty');
//####################################################################################################
// Global variables
var objDataTiers = null;
var objLineItemProps = null;

var objMargSearch = {};
var lock = false;
var lastGroup = 0;
var lastGroupIx = 0;
//####################################################################################################
// Event handlers
// These functions manipulate global variables

// Page Init event handler
function r7_pageInit_dyn_marg_pricing(type) {
    //var d = new Date();
    //nlapiLogExecution('DEBUG', 'r7_pageInit_dyn_marg_pricing', 'Started at: ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds());
    if (!objDataTiers) {
        objDataTiers = getDataTiers();
    }
    if (!objLineItemProps) {
        objLineItemProps = getAllItemProps();
    }
    // d = new Date();
    //nlapiLogExecution('DEBUG', 'r7_pageInit_dyn_marg_pricing', 'Finished at: ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds());
}

// Recalc event handler
//
function r7_recalc_dyn_marg_pricing(type) {
    var itemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
    if (lock || ['Discount', 'Subtotal', 'Description'].indexOf(itemType) >= 0) {
        return;
    }
    lock = true;
    //var d = new Date();
    //nlapiLogExecution('DEBUG', 'r7_recalc_dyn_marg_pricing', 'Started at: ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds());

    if (itemType && 'Group' !== itemType) {
        updateLine(nlapiGetCurrentLineItemIndex('item'));
    } else {
        var itemId = nlapiGetCurrentLineItemValue('item', 'id');
        var item = nlapiGetCurrentLineItemValue('item', 'item');
        var ix = nlapiGetCurrentLineItemIndex('item');
        if (item) {
            lastGroup = item;
            lastGroupIx = ix;
        } else if (!itemId) {
            item = lastGroup;
            ix = lastGroupIx;
        }
        updateGroupLines(ix, item, itemId);
    }
    lock = false;
    //d = new Date();
    //nlapiLogExecution('DEBUG', 'r7_recalc_dyn_marg_pricing', 'Finished at: ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds());
}
//####################################################################################################
// Additional internal functions

// Updates Line Rate and Data
function updateLine(p_line_ix) {
    try {
        //var d = new Date().getTime();
        calculateCurrentLine_rate(p_line_ix);
        //nlapiLogExecution('DEBUG', 'updateLine', 'Line[' + p_line_ix + '] Rate updated in ' + (new Date().getTime() - d) + ' ms');

        //d = new Date().getTime();
        calculateCurrentLine_data(p_line_ix);
        //nlapiLogExecution('DEBUG', 'updateLine', 'Line[' + p_line_ix + '] Data updated in ' + (new Date().getTime() - d) + ' ms');
    } catch (e) {
        nlapiLogExecution(
            'DEBUG',
            'updateLine',
            'Exception while processing item ' + p_line_ix + ' : ' + e.name + '; ' + e.message + '; ' + e.stack
        );
    }
}

// Update group lines
function updateGroupLines(p_ix, p_item, p_itemId, p_objLineItemProps, p_objMargSearch, p_objDataTiers) {
    for (var i = p_ix, l = nlapiGetLineItemCount('item') + 1, flag = false, currId, currItem, currType; i < l; i++) {
        currId = nlapiGetLineItemValue('item', 'id', i);
        currItem = nlapiGetLineItemValue('item', 'item', i);
        currType = nlapiGetLineItemValue('item', 'itemtype', i);
        flag = flag || (i === p_ix && currType === 'Group' && currItem === p_item && currId === p_itemId);
        if (flag) {
            if ('EndGroup' === currType) break;
            updateLine(i, p_objLineItemProps, p_objMargSearch, p_objDataTiers);
        }
    }
}

// Calculates data counter required for custcolr7_monthlydatalimit_gb field calculation
function getDataCounter(p_remainingAssets, p_arrDataTiers) {
    var dataCounter = 0;
    if (p_remainingAssets && p_arrDataTiers) {
        //start at highest threshold
        for (var i = p_arrDataTiers.length - 1, delta, data; i >= 0; i--) {
            data = parseFloat(p_arrDataTiers[i].data_mb || 0);
            delta = Math.max(p_remainingAssets - Math.max(parseFloat(p_arrDataTiers[i].threshold || 0), 1), 0);

            p_remainingAssets -= delta;
            dataCounter += delta * data;
        }
    }
    return dataCounter;
}

// Get DataTiers of p_ItemId Family
function getItemDataTiers(p_ItemId) {
    var arrItemFamilies = (getItemProperty(p_ItemId, 'custitemr7itemfamily', objLineItemProps) || '').split(',');
    for (var i = 0, l = arrItemFamilies ? arrItemFamilies.length : 0; i < l; i++) {
        if (objDataTiers.hasOwnProperty(arrItemFamilies[i])) return objDataTiers[arrItemFamilies[i]].tiers;
    }
    return null;
}
//####################################################################################################
// Initial functions changed to handle individual line items based on index

// Sort function used when sorting DataTiers array
function dataTierSort(a, b) {
    var valA = parseFloat(a.threshold || 0);
    var valB = parseFloat(b.threshold || 0);

    //sort string ascending
    if (valA < valB) return -1;

    if (valA > valB) return 1;

    //default return value (no sorting)
    return 0;
}

// get data tiers from customscriptr7_dynamic_marg_pricing_help helper suitlet
function getDataTiers() {
    var helperSuiteletURL = nlapiResolveURL(
        'SUITELET',
        'customscriptr7_dynamic_marg_pricing_help',
        'customdeployr7_dynamic_marg_pricing_help',
        false
    );

    var objHeaders = { 'Content-Type': 'application/json' };
    var objPostData = { operation: 'get_data_tiers' };

    var response = nlapiRequestURL(helperSuiteletURL, JSON.stringify(objPostData), objHeaders, null, 'POST');
    if (!response.getBody()) {
        nlapiLogExecution('DEBUG', 'getDataTiers', 'Problem retrieving data tier information.');
        return null;
    }

    var objResponse = JSON.parse(response.getBody());
    if (!objResponse.hasOwnProperty('success') || !objResponse.success) {
        nlapiLogExecution('DEBUG', 'getDataTiers', objResponse.error);
        return null;
    }
    var objDataTiers = objResponse.data;
    for (var k in objDataTiers) {
        if (objDataTiers.hasOwnProperty(k)) objDataTiers[k].tiers = objDataTiers[k].tiers.sort(dataTierSort);
    }
    return objDataTiers;
}

// get line item properties
function getAllItemProps() {
    var objItemPropsData = {};
    var arrItemIds = [];
    var i, l, tmp;
    for (i = 1, l = nlapiGetLineItemCount('item') + 1; i < l; i++) {
        tmp = nlapiGetLineItemValue('item', 'item', i);
        if (tmp) arrItemIds.push(tmp);
    }
    if (!arrItemIds.length) return objItemPropsData;

    var arrFilters = [new nlobjSearchFilter('internalid', null, 'anyof', arrItemIds)];

    var arrColumns = [new nlobjSearchColumn('internalid')];
    var j, n, key;
    for (j = 0, n = arrItemFieldsNeededData.length; j < n; j++) {
        arrColumns.push(new nlobjSearchColumn(arrItemFieldsNeededData[j]));
    }

    var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
    if (!arrResults) return objItemPropsData;

    for (i = 0, l = arrResults.length, n = arrItemFieldsNeededData.length; i < l; i++) {
        tmp = { internalid: arrResults[i].getValue('internalid') };
        for (j = 0; j < n; j++) {
            key = arrItemFieldsNeededData[j];
            tmp[key] = arrResults[i].getValue(key);
        }
        objItemPropsData[tmp.internalid] = tmp;
    }

    return objItemPropsData;
}

// Gets item property, if necessary, function will attempt to get
// the fields for specified item and return the requested field
function getItemProperty(p_itemId, p_fieldName) {
    if (!p_itemId || !p_fieldName) {
        return null;
    }

    if (!objLineItemProps.hasOwnProperty(p_itemId)) {
        objLineItemProps[p_itemId] = nlapiLookupField('item', p_itemId, arrItemFieldsNeededData);
    }
    if (!objLineItemProps[p_itemId] || !objLineItemProps[p_itemId].hasOwnProperty(p_fieldName)) {
        return null;
    }
    return objLineItemProps[p_itemId][p_fieldName];
}
function getMarginalValueFromSearchId(searchId) {
    var customerId = (nlapiGetFieldValue('entity') || '').toString();
    var specIdentifier = customerId + '_' + searchId;
    if (searchId && customerId) {
        if (objMargSearch.hasOwnProperty(specIdentifier)) {
            return objMargSearch[specIdentifier];
        }

        var newSearch = nlapiLoadSearch(null, searchId);
        var columns = newSearch.getColumns();

        if (columns[1] != null && columns[1].name.substr(0, 7) == 'formula') {
            newSearch.addFilter(
                new nlobjSearchFilter(columns[1].name, null, 'is', customerId).setFormula(columns[1].formula)
            );
        } else {
            nlapiLogExecution('ERROR', 'Error running dynamic margincal rate search', 'improperly formatted results');
            return;
        }
        nlapiLogExecution('DEBUG', 'RunningSearch', 'searchId:' + searchId);
        var resultSet = newSearch.runSearch();

        var resultSlice = resultSet.getResults(0, 1);
        if (resultSlice && resultSlice.length > 0) {
            var columns = resultSlice[0].getAllColumns();
            var value = resultSlice[0].getValue(columns[0]);

            objMargSearch[specIdentifier] = parseFloat(value || 0);
            return objMargSearch[specIdentifier];
        }
    }
    objMargSearch[specIdentifier] = 0;

    return objMargSearch[specIdentifier];
}

// calculate sum of 'field_name' field across all line items except line item 'excludeLine'
function groupLinesByField(p_searchId, field_name, excludeLine) {
    var sumValue = 0;
    var l = nlapiGetLineItemCount('item') + 1;
    for (var i = 1; i < l; i++) {
        var itemId = nlapiGetLineItemValue('item', 'item', i);
        if (i == excludeLine || !itemId) continue;

        if (
            'T' == getItemProperty(itemId, 'usemarginalrates', objLineItemProps) &&
            p_searchId == getItemProperty(itemId, 'custitemr7itemmarginrateaddvalue', objLineItemProps)
        )
            sumValue += parseFloat(nlapiGetLineItemValue('item', field_name, i)) || 0;
    }

    return Math.round(sumValue * 100) / 100;
}

// Gets quantity of related items entered before current line.
// Used for custcolr7_monthlydatalimit_gb field calculation
function getRelatedTotalQtyAbove(p_searchId, field_name, stopLine) {
    var sumValue = 0;
    for (var itemId, i = 1; i < stopLine; i++) {
        if (!(itemId = nlapiGetLineItemValue('item', 'item', i))) continue;
        if (
            'T' === getItemProperty(itemId, 'usemarginalrates', objLineItemProps) &&
            p_searchId === getItemProperty(itemId, 'custitemr7itemmarginrateaddvalue', objLineItemProps)
        )
            sumValue += parseFloat(nlapiGetLineItemValue('item', field_name, i)) || 0;
    }
    getRelatedTotalQtyAbove;

    return Math.round(sumValue * 100) / 100;
}

function formatRate(lineIndex) {
    var rate;
    nlapiSelectLineItem('item', lineIndex);
    nlapiSetLineItemValue('item', 'price', lineIndex, 1);
    rate = Math.round(parseFloat(nlapiGetLineItemValue('item', 'rate', lineIndex)) * 100) / 100;
    nlapiSetLineItemValue('item', 'rate', lineIndex, rate.toFixed(2));
    nlapiCommitLineItem('item');
}

// Update rate of specified line
function calculateCurrentLine_rate(p_line_ix) {
    nlapiLogExecution(
        'DEBUG',
        'calculateCurrentLine_rate',
        'p_line_ix: ' + p_line_ix + ' p_objLineItemProps: ' + objLineItemProps + ' p_oMarginalSearch:' + objMargSearch
    );
    if (!p_line_ix) {
        return;
    }

    var itemId = nlapiGetLineItemValue('item', 'item', p_line_ix);
    var quantity = parseFloat(nlapiGetLineItemValue('item', 'quantity', p_line_ix) || 0);

    if (quantity <= 0) {
        return;
    }
    var marginalSearchId = getItemProperty(itemId, 'custitemr7itemmarginrateaddvalue');
    if ('T' != getItemProperty(itemId, 'usemarginalrates') || !marginalSearchId) {
        return;
    }
    // Get marginal values
    var marginalValue = getMarginalValueFromSearchId(marginalSearchId);
    nlapiLogExecution('DEBUG', 'calculateCurrentLine_rate', 'marginalValue: ' + marginalValue);
    
    // modification apps-3489
    var ignoreMarginalPricing = nlapiGetFieldValue('custbody_r7_ignore_marginal_pricing')
    if (marginalValue <= 0) {
        // just use base price, native calculation will be correct.
        // need to explicetely set base price because it may have been set to custom if marginal was > 0
        formatRate(p_line_ix);
    } else {
        // allow custom pricing on marginal pricing SKUs
        if (ignoreMarginalPricing == 'T') {
            formatRate(p_line_ix);
        } else {
            var qtyGroup = groupLinesByField(marginalSearchId, 'quantity', p_line_ix) + quantity;
            nlapiLogExecution('DEBUG', 'calculateCurrentLine_rate', 'qtyGroup: ' + qtyGroup);
            nlapiSelectLineItem('item', p_line_ix);
            nlapiSetCurrentLineItemValue('item', 'price', 1, false, true);
            nlapiSetCurrentLineItemValue('item', 'quantity', marginalValue, false, true);
            var amountOriginal = parseFloat(nlapiGetCurrentLineItemValue('item', 'amount'));

            nlapiSetCurrentLineItemValue('item', 'price', 1, false, true);
            nlapiSetCurrentLineItemValue('item', 'quantity', qtyGroup + marginalValue, false, true);
            var newAmount = parseFloat(nlapiGetCurrentLineItemValue('item', 'amount'));
            var amountDelta = newAmount - amountOriginal;
            var newRate = amountDelta / qtyGroup;
            nlapiSetCurrentLineItemValue('item', 'quantity', quantity, false, true);
            nlapiSetCurrentLineItemValue('item', 'price', -1, false, true);
            nlapiSetCurrentLineItemValue('item', 'rate', Math.round(newRate * 100) / 100, false, true);
            nlapiLogExecution(
                'DEBUG',
                'calculateCurrentLine_rate',
                'amountOriginal: ' +
                amountOriginal +
                ' newAmount:' +
                newAmount +
                ' amountDelta:' +
                amountDelta +
                ' newRate:' +
                newRate +
                ' quantity: ' +
                quantity
            );
            nlapiCommitLineItem('item');
        }
    }
}

// Function updates custcolr7_monthlydatalimit_gb field of current line item
function calculateCurrentLine_data(p_line_ix) {
    nlapiLogExecution(
        'DEBUG',
        'calculateCurrentLine_data',
        'p_line_ix: ' +
        p_line_ix +
        ' p_objLineItemProps: ' +
        objLineItemProps +
        ' p_oMarginalSearch:' +
        objMargSearch +
        ' p_objDataTiers:' +
        objDataTiers
    );
    if (!p_line_ix) return;

    //CM: 9/1/20 - APPS-14185 adding search to get items that should have data qty x4 on quotes.
    var appliedItemsX4 = get4XDataItems();

    var itemId = nlapiGetLineItemValue('item', 'item', p_line_ix);

    var dataQty = getItemProperty(itemId, 'custitemr7addondataqty');
    if (dataQty) {

        if(appliedItemsX4.indexOf(itemId) >= 0){
            dataQty = parseInt(dataQty, 10) * 4;
        }

        nlapiSetLineItemValue('item', 'custcolr7_monthlydatalimit_gb', p_line_ix, dataQty);
        return;
    }

    var marginalSearchId = getItemProperty(itemId, 'custitemr7itemmarginrateaddvalue');
    if ('T' !== getItemProperty(itemId, 'usemarginalrates') || !marginalSearchId) {
        nlapiSetLineItemValue('item', 'custcolr7_monthlydatalimit_gb', p_line_ix, '');
        return;
    }

    var arrDataTiers = getItemDataTiers(itemId);
    if (!arrDataTiers || !arrDataTiers.length) {
        nlapiSetLineItemValue('item', 'custcolr7_monthlydatalimit_gb', p_line_ix, '');
        return;
    }

    var marginalValue = getMarginalValueFromSearchId(marginalSearchId);
    var qtyLine = parseFloat(nlapiGetLineItemValue('item', 'quantity', p_line_ix) || 0);
	/*
     // Calculate quantity of related items that were allocated before current one
     var qtyAllocatedOnOrder = getRelatedTotalQtyAbove(marginalSearchId, 'quantity', p_line_ix, p_objLineItemProps);
     */

    // Do not calculate quantity of related items (this keeps value of custcolr7_monthlydatalimit_gb same)
    var qtyAllocatedOnOrder = 0;

    //now total (with new)
    var startingDataCounter = getDataCounter(marginalValue + qtyAllocatedOnOrder, arrDataTiers);
    var totalDataCounter = getDataCounter(marginalValue + qtyAllocatedOnOrder + qtyLine, arrDataTiers);

    var monthlyGB = Math.round((totalDataCounter - startingDataCounter) * 30 / 1024);

    if(appliedItemsX4.indexOf(itemId) >= 0){
        monthlyGB = parseInt(monthlyGB, 10) * 4;
    }

    nlapiSetLineItemValue('item', 'custcolr7_monthlydatalimit_gb', p_line_ix, monthlyGB);
}

function get4XDataItems(){
    var arr_applicableItems = [];
    var searchResults = nlapiSearchRecord(null, 'customsearch_r7_idr_data_x4');

    if(searchResults){
        for(var i=0; i < searchResults.length; i++){
            var thisResult = searchResults[i];
            var thisItemId = thisResult.getId();
            arr_applicableItems.push(thisItemId);
        }
    }

    return arr_applicableItems;
}
