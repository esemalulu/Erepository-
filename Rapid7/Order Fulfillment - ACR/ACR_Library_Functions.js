/*
 * @author efagone
 */

var objItemProps = new Object();

// add memoization caching for optimization
function memoize(fn) {
    var cache = {}
    return function() {
        var args = Array.prototype.slice.call(arguments)
        if (cache[args] === undefined) {
            cache[args] = fn.apply(this, args)
        }
        return cache[args]
    }
}

var memoizedLookupField = memoize(nlapiLookupField);

function memoizeSearchRecord(fn) {
    var cache = {};
    return function () {
        var args = Array.prototype.slice.call(arguments);
        var key = JSON.stringify(args);
        nlapiLogExecution('AUDIT', 'memoizeSearchRecord args: ', key);
        if (cache[key] === undefined) {
            nlapiLogExecution('AUDIT', 'memoizeSearchRecord not found in cache: ', 'making a call: ' + fn.name);

            var filters = [];
            args[2].forEach(function (filter) {
                filters.push(new nlobjSearchFilter(filter[0], filter[1], filter[2], filter[3]));
            });
            args[2] = filters;

            var columns = [];
            args[3].forEach(function (column) {
                if (typeof column === "string") {
                    columns.push(new nlobjSearchColumn(column));
                } else {
                    // array with summary
                    columns.push(new nlobjSearchColumn(column[0], column[1], column[2]));
                }
            });
            args[3] = columns;

            cache[key] = fn.apply(this, args);
        }
        return cache[key];
    };
}

var memoizedSearchRecord = memoizeSearchRecord(nlapiSearchRecord);

function grabLineItemACRIds(recOrder) {

    var itemACRIds = new Object();
    var orderLineCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= orderLineCount; i++) {
        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var lineId = recOrder.getLineItemValue('item', 'id', i);

        var acrId = getItemProperties(itemId, 'custitemr7itemacrproducttype');

        itemACRIds[lineId] = acrId;
    }

    return itemACRIds;
}

function convertEndDate(strStartDate, quantity, unitType, defaultTerm, onePriceTerm, onePriceTermInDays) {
    // unit = 1
    // month = 2
    // year = 3
    // days = 5
    // 15-day = 6
    // Per Term = 7
    // Week = 8
    // Workflow = 9
    // One Price = 10
    startDate = nlapiStringToDate(strStartDate);
    var dateEndDate = new Date();

    // https://issues.corp.rapid7.com/browse/APPS-5968
    if (onePriceTermInDays != null && onePriceTermInDays != '') {

        dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(onePriceTermInDays)) - 1);

    } else {

        if (defaultTerm == null || defaultTerm == '') {
            defaultTerm = 365;
        }
    
        switch (unitType) {
            case '1':
                dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1);
                break;
            case '2':
                dateEndDate = nlapiAddDays(nlapiAddMonths(startDate, quantity), -1);
                break;
            case '3':
                dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm) * quantity) - 1);
                break;
            case '5':
                dateEndDate = nlapiAddDays(startDate, Math.ceil(quantity) - 1);
                break;
            case '6':
                dateEndDate = nlapiAddDays(startDate, (quantity * 15) - 1);
                break;
            case '7':
                dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1);
                break;
            case '8':
                dateEndDate = nlapiAddDays(startDate, (Math.ceil(quantity) * 7) - 1);
                break;
            case '9':
                dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1);
                break;
            case '10':
                dateEndDate = nlapiAddMonths(startDate, onePriceTerm);
                dateEndDate = nlapiAddDays(dateEndDate, -2);
                break;
            default:
                dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm) * quantity) - 1);
        }
    }

    // Currently SF sends a one price term days for some orders. If so, no need to check ourselves
    if (isEmpty(onePriceTermInDays)) {
        dateEndDate = adjustEndDateForLeapYear(startDate, dateEndDate);
    }
    nlapiLogExecution('debug', 'dateEndDate after leap year calculation', dateEndDate);

    var strEndDate = nlapiDateToString(dateEndDate);
    return strEndDate;
}

function adjustEndDateForLeapYear(startDate, endDate) {
    var addDay = false;

    var startDateLeapYear = checkDateSpansLeapYear(startDate.getFullYear(), startDate);
    var endDateLeapYear = checkDateSpansLeapYear(endDate.getFullYear(), endDate);

    if (startDateLeapYear) {
        //check if start date is before leap day
        var leapDate = getLeapDate(startDate.getFullYear());
        addDay = startDate <= leapDate;
    }

    if (endDateLeapYear) {
        // if the start date is 3/1 and the end date is in a leap year, we want to add a date so the end date falls
        // on 2/29.  For example, start date 3/1/2023 should end on 2/29/2024.
        var dayBeforeLeapDate = getLeapDate(endDate.getFullYear());
        dayBeforeLeapDate.setDate(28);
        addDay = endDate >= dayBeforeLeapDate;
    }

    if (addDay) {
        endDate.setDate(endDate.getDate() + 1);
    }

    return endDate;
}

function checkDateSpansLeapYear(year) {
    nlapiLogExecution("AUDIT", "Checking Leap Year for year", year);
    var leap = new Date(year, 1, 29).getDate() === 29;
    return leap;
}

function getLeapDate(year) {
    return new Date(year, 1, 29);
}

function getItemsFromOrder(recOrder) {

    var lineItems = new Array();
    var arrayACLItems = new Array();

    var arrCurrentItemFamilyACLs = new Array();
    lineItemCount = recOrder.getLineItemCount('item');
    var parentLineId = null;

    for (var i = 1; i <= lineItemCount; i++) {
        var lineItem = new Object();
        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
        var itemProperties = getItemProperties(itemId);

        // If Group, get information and keep in Cache
        if (itemType === 'Group') {
            parentLineId = recOrder.getLineItemValue('item', 'line', i);
        }

        // If End Group, clear information and remove from Cache
        if (itemType === 'EndGroup') {
            parentLineId = null;
        }

        if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'group' && itemType != 'EndGroup') {

            if (itemProperties == null) {
                continue;
            }
            var ACL = itemProperties['custitemr7itemautocreatelicense'];
            // Get product type from item properties
            var acrId = itemProperties['custitemr7itemacrproducttype'];

            if (acrId != null && acrId != '') {
                var itemOptionId = arrProductTypes[acrId]['optionid'];
                var activationKey = recOrder.getLineItemValue('item', itemOptionId, i);
                var lineOneItemFlow = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', i);
                if (lineOneItemFlow && lineOneItemFlow == 2) {
                    nlapiLogExecution('DEBUG', 'lineOneItemFlow&&lineOneItemFlow==2', ACL)
                    ACL = 'F';
                    nlapiLogExecution('DEBUG', 'lineOneItemFlow&&lineOneItemFlow==2', ACL)
                }

                var itemFamilies = itemProperties['custitemr7itemfamily'];
                if (itemFamilies != '') {
                    itemFamilies = itemFamilies.split(",");
                }
                // nlapiSendEmail(55011, 55011, 'itemFamilies', itemFamilies);
                if (ACL == 'T' && itemFamilies != '' && itemFamilies != null) {
                    //set suggestion
                    if (activationKey == '' || activationKey == null || activationKey.substr(0, 4) == 'PEND') {
                        for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
                            var itemFamily = itemFamilies[j];
                            arrCurrentItemFamilyACLs[itemFamily] = recOrder.getLineItemValue('item', 'id', i);
                        }
                    }
                    else {
                        for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
                            var itemFamily = itemFamilies[j];
                            arrCurrentItemFamilyACLs[itemFamily] = 'PK:' + activationKey;
                        }
                    }
                }
                var suggestedACL = '';
                //calculating suggestions
                for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
                    var itemFamily = itemFamilies[j];
                    if (arrCurrentItemFamilyACLs[itemFamily] != null && arrCurrentItemFamilyACLs[itemFamily] != '' && arrCurrentItemFamilyACLs[itemFamily] != 'undefined') {
                        suggestedACL = arrCurrentItemFamilyACLs[itemFamily];
                        break;
                    }
                }

                // nlapiSendEmail(55011, 55011, 'suggestedACL', suggestedACL);
                var currentACLId = activationKey;
                if (activationKey != null && activationKey != '' && activationKey.substr(0, 4) != 'PEND') { //PK should take precedence
                    currentACLId = 'PK:' + activationKey;
                }
                else
                    if (activationKey != null && activationKey != '' && activationKey.substr(0, 4) == 'PEND') {
                        currentACLId = activationKey.substr(5);
                    }

                lineItem['itemProperties'] = itemProperties;
                lineItem['itemId'] = itemId;
                lineItem['isACL'] = ACL;
                lineItem['lineOneItemFlow'] = lineOneItemFlow;
                lineItem['currentParentACL'] = currentACLId;
                lineItem['suggestedParentACL'] = suggestedACL;
                lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
                lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i);
                lineItem['unitType'] = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i);
                lineItem['onePriceTerm'] = recOrder.getLineItemValue('item', 'custcolr7onepriceterm', i);
                lineItem['onePriceTermInDays'] = recOrder.getLineItemValue('item', 'custcolr7onepriceterm_in_days', i);
                lineItem['amount'] = recOrder.getLineItemValue('item', 'amount', i);
                lineItem['custcolr7translicenseid'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
                lineItem['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
                lineItem['description'] = recOrder.getLineItemValue('item', 'description', i);
                lineItem['licenseId'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
                lineItem['shipping'] = recOrder.getLineItemValue('item', 'custcolr7lineshipaddress', i);
                lineItem['isCoTermLine'] = recOrder.getLineItemValue('item', 'custcolr7iscotermline', i);
                lineItem['createdFromRA'] = recOrder.getLineItemValue('item', 'custcolr7createdfromra', i);
                lineItem['itemType'] = itemType;
                lineItem['lineNum'] = i;
                // PSL initiative change
                lineItem['custcol_r7_pck_package_license'] = recOrder.getLineItemValue('item', 'custcol_r7_pck_package_license', i);
                lineItem['custcol_r7_pck_package_item'] = recOrder.getLineItemValue('item', 'custcol_r7_pck_package_item', i);

                /*
                 * Set Parent Line Information if it is in Group
                 */
                if (recOrder.getLineItemValue('item', 'ingroup', i) === 'T') {
                    lineItem['parentLineId'] = parentLineId;
                } else {
                    lineItem['parentLineId'] = null;
                }

                if (ACL == 'T') {
                    lineItem['suggestedSiblingAddons'] = []
                    arrayACLItems[arrayACLItems.length] = lineItem;
                }
                // add to last ACL if suggestedACL is prev ACL item
                if (ACL == 'F') {
                    if (suggestedACL != lineItem['lineId'] && arrayACLItems[arrayACLItems.length - 1] !== undefined && suggestedACL == arrayACLItems[arrayACLItems.length - 1]['lineId']) {
                        // creating sibling/parent object links within lineItemObject for further optimized processes
                        arrayACLItems[arrayACLItems.length - 1]['suggestedSiblingAddons'].push(lineItem);
                        lineItem['suggestedParentLineItemObject'] = arrayACLItems[arrayACLItems.length - 1];
                    }
                }

                lineItems[lineItems.length] = lineItem;
                /*
                 * Using dynamic product method, delete commented lines after debug
                 */
                lineItem['acrId'] = acrId; // product Type id
                lineItem['activationKey'] = activationKey;

                /*
                 * Get Fields for itemFulfillment check
                 */
                lineItem['isfulfillable'] = itemProperties['isfulfillable'];
                lineItem['vsoedelivered'] = itemProperties['vsoedelivered'];

                /*
                 * Get field for requires HBR
                 */
                lineItem['requireshbr'] = itemProperties['custitemr7requireshbr'];

            }
        }
    }
    nlapiLogExecution('DEBUG', 'getItemsFromOrder lineItems', JSON.stringify(lineItems))
    return lineItems;
}

function getOrderObject(recOrder) {
    var startTime = new Date();

    var orderObject = {
        isNXPIVMMigration: false,
        items: {
            count: recOrder.getLineItemCount('item'),
            all: [],
            byLineIndex: {},
            byLineId: {},
            acl: {
                byAcr: {}
            },
            addons: {
                byAcr: {}
            },
            // ACLByLineIndex: {},
            events: [],
            hdw: [],
            families: []
        },
        getAclItemsByAcr: function(acrStr) {
            // if (acrStr === "") {
            //     return this.items.all;
            // }
            var aclItems = [];
            var acrProductIds = acrStr.split(',');
            acrProductIds.forEach(function(acrId) {
                if (this.items.acl.byAcr[acrId] !== undefined) {
                    aclItems = aclItems.concat(this.items.acl.byAcr[acrId]);
                }
            }, this);
            return aclItems;
        },
        getAddonItemsByAcr: function(acrStr) {
            // if (acrStr === "") {
            //     return this.items.all;
            // }
            var addonItems = [];
            var acrProductIds = acrStr.split(',');
            acrProductIds.forEach(function(acrId) {
                if (this.items.addons.byAcr[acrId] !== undefined) {
                    addonItems = addonItems.concat(this.items.addons.byAcr[acrId]);
                }
            }, this);
            return addonItems;
        },
        getItemByLineIndex: function(lineIndex) {
            return this.items.byLineIndex[lineIndex];
        },
        getEventItems: function() {
            return this.items.events;
        },
        getHDWItems: function() {
            return this.items.hdw;
        },
        getItemFamilyIds: function() {
            return this.items.families;
        },
        getParentOfItem: function(lineItem) {
            if (lineItem['parentIndex'] !== undefined) {
                return this.items.byLineIndex[lineItem['parentIndex']];
            } else {
                return null;
            }
        },
        getSiblingsOfItem: function(lineItem) {
            var siblingArray = [];
            if (lineItem['siblingIndexes'] !== undefined) {
                lineItem['siblingIndexes'].forEach(function(lineIndex) {
                    siblingArray.push(this.getItemByLineIndex(lineIndex))
                }, this)
            } else {
                return null;
            }
            return siblingArray;
        }
    };

    var itemsToIgnore = ['Subtotal', 'Discount', 'Description', 'Group', 'EndGroup'];
    var parentLineId = null;
    var arrCurrentItemFamilyACLs = new Array();
    var arrayACLItems = [];
    var NXPUpgradeUpsell = false;
    var IVMNewUpgrade = false;

    for (var i = 1; i<= orderObject.items.count; i++) {

        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var itemProperties = getItemProperties(itemId);
        if (itemProperties === null) {
            continue;
        }
        
        var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
        // If Group, get information and keep in Cache
        if (itemType === 'Group') {
            parentLineId = recOrder.getLineItemValue('item', 'line', i);
        }
        // If End Group, clear information and remove from Cache
        if (itemType === 'EndGroup') {
            parentLineId = null;
        }

        var acrId = itemProperties['custitemr7itemacrproducttype'];
        if (itemsToIgnore.indexOf(itemType) === -1 && !isEmpty(acrId)) {
            
            if(recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i) == 'T'){
                itemProperties['custitemr7itemautocreatelicense'] = 'T';
            }
            var ACL = itemProperties['custitemr7itemautocreatelicense'];
            
            var itemOptionId = arrProductTypes[acrId]['optionid'];
            var activationKey = recOrder.getLineItemValue('item', itemOptionId, i);
            
            var lineOneItemFlow = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', i);
            var onePriceSellingMotion = recOrder.getLineItemValue('item', 'custcolr7_oneprice_selling_motion', i);
            var incumbentProductPurchaseType = recOrder.getLineItemValue('item', 'custcolr7_incumbent_purchase_type', i);;
           
            if (lineOneItemFlow && lineOneItemFlow == 2 && onePriceSellingMotion !== 1 && itemProperties['custitemr7itemacrproducttype'] != 2) { //1 = upgrade, acr product type 2 = MS
                ACL = 'F';
            }

            nlapiLogExecution('AUDIT', 'itemProperties.displayname', itemProperties.displayname );
            if(itemProperties.displayname === 'NXP-SUB' && lineOneItemFlow == 2 && incumbentProductPurchaseType == 'Upgrade') {
                NXPUpgradeUpsell = true;
            } else if (itemProperties.displayname === 'IVM-SUB' && lineOneItemFlow == 1 && onePriceSellingMotion == 1) {
                IVMNewUpgrade = true;
            }

            var itemFamilies = itemProperties['custitemr7itemfamily'];
            if (itemFamilies != '') {
                itemFamilies = itemFamilies.split(',');
                // get all unique itemFamilies
                itemFamilies.forEach(function(itemFamily) {
                    if (orderObject.items.families.indexOf(itemFamily) === -1) {
                        orderObject.items.families.push(itemFamily)
                    }
                })
            }
            if (ACL == 'T' && itemFamilies != '' && itemFamilies != null) {
                //set suggestion
                if (activationKey == '' || activationKey == null || activationKey.substr(0, 4) == 'PEND') {
                    for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
                        var itemFamily = itemFamilies[j];
                        arrCurrentItemFamilyACLs[itemFamily] = recOrder.getLineItemValue('item', 'id', i);
                    }
                } else {
                    for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
                        var itemFamily = itemFamilies[j];
                        arrCurrentItemFamilyACLs[itemFamily] = 'PK:' + activationKey;
                    }
                }
            }
            var suggestedACL = '';
            //calculating suggestions
            for (var j = 0; itemFamilies != null && j < itemFamilies.length; j++) {
                var itemFamily = itemFamilies[j];
                if (
                    arrCurrentItemFamilyACLs[itemFamily] != null &&
                    arrCurrentItemFamilyACLs[itemFamily] != '' &&
                    arrCurrentItemFamilyACLs[itemFamily] != 'undefined'
                ) {
                    suggestedACL = arrCurrentItemFamilyACLs[itemFamily];
                    break;
                }
            }

            // nlapiSendEmail(55011, 55011, 'suggestedACL', suggestedACL);
            var currentACLId = activationKey;
            if (activationKey != null && activationKey != '' && activationKey.substr(0, 4) != 'PEND') {
                //PK should take precedence
                currentACLId = 'PK:' + activationKey;
            } else if (activationKey != null && activationKey != '' && activationKey.substr(0, 4) == 'PEND') {
                currentACLId = activationKey.substr(5);
            }

            var lineItem = new Object();
            lineItem.getOrderObject = function() {
                return orderObject;
            }
            lineItem.getInfo = function() {
                return JSON.stringify({
                    itemId: this['itemId'],
                    isACL: this['isACL'],
                    lineId: this['lineId'],
                    lineNum: this['lineNum'],
                    siblingIndexes: this['siblingIndexes'],
                    parentIndex: this['parentIndex']
                })
            }

            lineItem['itemProperties'] = itemProperties;
            lineItem['itemId'] = itemId;
            lineItem['isACL'] = ACL;
            lineItem['lineOneItemFlow'] = lineOneItemFlow;
            lineItem['currentParentACL'] = currentACLId;
            lineItem['suggestedParentACL'] = suggestedACL;
            lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
            lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i);
            lineItem['unitType'] = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i);
            lineItem['onePriceTerm'] = recOrder.getLineItemValue('item', 'custcolr7onepriceterm', i);
            lineItem['onePriceTermInDays'] = recOrder.getLineItemValue('item', 'custcolr7onepriceterm_in_days', i);
            lineItem['amount'] = recOrder.getLineItemValue('item', 'amount', i);
            lineItem['custcolr7translicenseid'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
            lineItem['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
            lineItem['description'] = recOrder.getLineItemValue('item', 'description', i);
            lineItem['licenseId'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
            lineItem['shipping'] = recOrder.getLineItemValue('item', 'custcolr7lineshipaddress', i);
            lineItem['isCoTermLine'] = recOrder.getLineItemValue('item', 'custcolr7iscotermline', i);
            lineItem['createdFromRA'] = recOrder.getLineItemValue('item', 'custcolr7createdfromra', i);
            lineItem['itemType'] = itemType;
            lineItem['lineNum'] = i;

            // Set Parent Line Information if it is in Group
            if (recOrder.getLineItemValue('item', 'ingroup', i) === 'T') {
                lineItem['parentLineId'] = parentLineId;
            } else {
                lineItem['parentLineId'] = null;
            }

            lineItem['acrId'] = acrId; // product Type id
            lineItem['activationKey'] = activationKey;
            // Get Fields for itemFulfillment check
            lineItem['isfulfillable'] = itemProperties['isfulfillable'];
            lineItem['vsoedelivered'] = itemProperties['vsoedelivered'];
            // Get field for requires HBR
            lineItem['requireshbr'] = itemProperties['custitemr7requireshbr'];
            
            lineItem['addOns'] = itemProperties['custitemr7acladdons'];

            orderObject.items.byLineIndex[lineItem['lineNum']] = lineItem;
            orderObject.items.byLineId[lineItem['lineId']] = lineItem;
            orderObject.items.all.push(lineItem);
            
            if (ACL === 'T') {
                lineItem['siblingIndexes'] = [];
                lineItem['siblingLineIds'] = [];
                if (currentACLId !== lineItem['lineId']) {
                    lineItem['upsell'] = true;
                }
                arrayACLItems.push(lineItem);

                // categorize
                if (orderObject.items.acl.byAcr[acrId] === undefined) {
                    orderObject.items.acl.byAcr[acrId] = [lineItem];
                } else {
                    orderObject.items.acl.byAcr[acrId].push(lineItem);
                }

            } else {
                // if ACL item is on this SO and is PENDing
                if (!isEmpty(suggestedACL)) {
                    if (arrayACLItems.length !== 0 && suggestedACL === arrayACLItems[arrayACLItems.length - 1]['lineId']) {
                        lineItem['parentIndex'] = arrayACLItems[arrayACLItems.length - 1]['lineNum'];
                        // lineItem['parentLineId'] = arrayACLItems[arrayACLItems.length - 1]['lineId'];
                        arrayACLItems[arrayACLItems.length - 1]['siblingIndexes'].push(lineItem['lineNum']);
                        // arrayACLItems[arrayACLItems.length - 1]['siblingLineIds'].push(lineItem['lineId']);
                    }
                } else {
                    lineItem['upsell'] = true;
                }
            }
            
            // categorize
            if (!isEmpty(lineItem['addOns'])) {
                if (orderObject.items.addons.byAcr[acrId] === undefined) {
                    orderObject.items.addons.byAcr[acrId] = [lineItem];
                } else {
                    orderObject.items.addons.byAcr[acrId].push(lineItem);
                }
            }

            var requiresEventReg = itemProperties['custitemr7itemrequireeventregistration'];
            if (requiresEventReg === 'T' && isEmpty(lineItem['licenseId'])) {
                lineItem['defaultEvent'] = itemProperties['custitemr7itemdefaulteventmaster'];
                orderObject.items.events.push(lineItem);
            }

            var requiresHBR = itemProperties['custitemr7requireshbr'];
            if (!isEmpty(requiresHBR) && isEmpty(lineItem['licenseId'])) {
                orderObject.items.hdw.push(lineItem);
            }
        }
    }

    var endTime = new Date();
    orderObject.isNXPIVMMigration =  NXPUpgradeUpsell && IVMNewUpgrade;
    nlapiLogExecution('AUDIT', 'orderObject.isNXPIVMMigration', orderObject.isNXPIVMMigration);
    nlapiLogExecution('AUDIT', 'NXPUpgradeUpsell', NXPUpgradeUpsell );
    nlapiLogExecution('AUDIT', 'IVMNewUpgrade', IVMNewUpgrade );
    nlapiLogExecution('AUDIT', 'getOrderObject processing time: ', 'Milliseconds: ' + (endTime - startTime));
    nlapiLogExecution('AUDIT', 'returnOrderObject', orderObject);
    return orderObject;
}

function getACRItems(arrItems, acrProductIds) {

    var arrACRItems = new Array();
    var acrProductIdsArray = acrProductIds.split(',');
    if (arrItems != null) {
        for (var i = 0; i < arrItems.length; i++) {
            var lineItem = arrItems[i];
            var ACL = lineItem['isACL'];
            var acrId = lineItem['acrId'];
            if (ACL == 'T' && acrProductIdsArray.indexOf(acrId) != -1) {
                arrACRItems[arrACRItems.length] = lineItem;
            }
        }
    }
    return arrACRItems;
}
/**
 * Loop through array of items on an order and return a subset of line items which require Hardware Build Request records
 * @method getHDWItems
 * @param {Array} arrItems
 * @return {Array} arrHDWItems
 */
function getHDWItems(arrItems) {

    var arrHDWItems = new Array();

    for (var i = 0; arrItems != null && i < arrItems.length; i++) {
        var lineItem = arrItems[i];
        var requiresHBR = lineItem['itemProperties']['custitemr7requireshbr'];

        if (requiresHBR != null && requiresHBR != '' && (lineItem['licenseId'] == null || lineItem['licenseId'] == '')) {
            arrHDWItems[arrHDWItems.length] = lineItem;
        }
    }
    return arrHDWItems;
}

function getAddOnItems(arrItems) {

    var arrAddOnItems = new Array();
    var arrMNGAddOnItems = new Array();
    var arrMNGSoftAddOnItems = new Array();

    for (var i = 0; arrItems != null && i < arrItems.length; i++) {
        var lineItem = arrItems[i];
        var lineItemPropertites = lineItem['itemProperties'];
        var strItemAddOns = lineItemPropertites['custitemr7acladdons'];
        var ACL = lineItem['isACL'];
        var acrId = lineItem['acrId'];

        if (strItemAddOns != null && strItemAddOns != '') {
            lineItem['addOns'] = strItemAddOns;

            if (acrId == 3) { //man service
                arrMNGAddOnItems[arrMNGAddOnItems.length] = lineItem;
            } else if (acrId == 10) {
                arrMNGSoftAddOnItems[arrMNGSoftAddOnItems.length] = lineItem;
            }
            else {
                arrAddOnItems[arrAddOnItems.length] = lineItem;
            }
        }
    }
    var arrAllAddOns = new Array(arrAddOnItems, arrMNGAddOnItems, arrMNGSoftAddOnItems);
    return arrAllAddOns;
}

/**
 * Loop through items on an order and return a subset of line items which require Event Attendee records
 * @method getEventItems
 * @param {Array} arrItems
 * @return {Array} arrEventItems
 */
function getEventItems(arrItems) {

    var arrEventItems = new Array();

    for (var i = 0; arrItems != null && i < arrItems.length; i++) {
        var lineItem = arrItems[i];
        var lineItemPropertites = lineItem['itemProperties'];
        var requiresEventReg = lineItemPropertites['custitemr7itemrequireeventregistration'];

        if (requiresEventReg == 'T' && (lineItem['licenseId'] == null || lineItem['licenseId'] == '')) {
            lineItem['defaultEvent'] = lineItemPropertites['custitemr7itemdefaulteventmaster'];
            arrEventItems[arrEventItems.length] = lineItem;
        }
    }

    return arrEventItems;
}

function getItemProperties(itemId, specificFieldId) {

    if (!itemId) {
        return null;
    }

    if (objItemProps.hasOwnProperty(itemId)) {

        if (objItemProps[itemId] == null) {
            return null;
        }
        if (specificFieldId != null && specificFieldId != '') {
            return objItemProps[itemId][specificFieldId];
        }
        return objItemProps[itemId];
    }

    var arrFieldIds = new Array();
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemacrproducttype';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemautocreatelicense';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemdedicatedhosted';
    arrFieldIds[arrFieldIds.length] = 'custitemr7acladdons';
    arrFieldIds[arrFieldIds.length] = 'isinactive';
    arrFieldIds[arrFieldIds.length] = 'displayname';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemmslicensetype1';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemnxlicensetype';
    arrFieldIds[arrFieldIds.length] = 'issueproduct';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemactivationemailtemplate';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemfamily';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemdefaultterm';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemcategory';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemdefaulteventmaster';
    arrFieldIds[arrFieldIds.length] = 'custitemr7itemrequireeventregistration';
    arrFieldIds[arrFieldIds.length] = 'isfulfillable';
    arrFieldIds[arrFieldIds.length] = 'vsoedelivered';
    arrFieldIds[arrFieldIds.length] = 'custitemr7requireshbr';
    arrFieldIds[arrFieldIds.length] = 'custitemr7skulicensetype';
    arrFieldIds[arrFieldIds.length] = 'vsoedelivered';
    arrFieldIds[arrFieldIds.length] = 'custitemr7revrecskucategory';

    for (acrId in arrProductTypes) {
        var templateFieldId = arrProductTypes[acrId]['templateid'];

        if (templateFieldId != null && templateFieldId != '' && templateFieldId != 'undefined') {
            arrFieldIds[arrFieldIds.length] = templateFieldId;
        }

    }

    // memoizing regardless current caching implementation because of discounts, subtotals etc.
    objItemProps[itemId] = memoizedLookupField('item', itemId, arrFieldIds);

    if (objItemProps[itemId] == null) {
        return null;
    }
    if (specificFieldId != null && specificFieldId != '') {
        return objItemProps[itemId][specificFieldId];
    }
    return objItemProps[itemId];
}

function getItemAddOns(itemId) {

    var arrAddOns = new Array();

    var strItemAddOns = getItemProperties(itemId, 'custitemr7acladdons');

    if (strItemAddOns != null && strItemAddOns != '') {
        arrAddOns = strItemAddOns.split(",");
    }
    return arrAddOns;
}

// todo
function processLineItemDates(recOrder, lineItem, orderUpdates, orderObject) {
    // added this line because this function is used by processes other than ACR.  If it's not an ACR process,
    // this object is needed, but ultimately ignored.
    orderUpdates = orderUpdates || getOrderUpdatesObject(recOrder);

    var lineNum = lineItem['lineNum'];
    var acrId = lineItem['acrId'];
    var optionId = arrProductTypes[acrId]['optionid'];
    var dateToday = new Date()
    var contextTimeZone = nlapiGetContext().getPreference('timezone');

    nlapiLogExecution('DEBUG', 'processLineItemDates debug obj', JSON.stringify({
        lineNum: lineNum,
        acrId: acrId,
        dateToday: dateToday,
        contextTimeZone: contextTimeZone
    }));

    var strToday = nlapiDateToString(dateToday);

    var delayedStart = recOrder.getFieldValue('custbodyr7delayedlicensestartdate');
    if (delayedStart != '' && delayedStart != null && nlapiStringToDate(delayedStart) > dateToday) {
        strToday = delayedStart;
    }

    var itemId = recOrder.getLineItemValue('item', 'item', lineNum);
    var itemFields = getItemProperties(itemId);

    var ACL = itemFields['custitemr7itemautocreatelicense'];
    var defaultTerm = itemFields['custitemr7itemdefaultterm'];
    var quantity = recOrder.getLineItemValue('item', 'quantity', lineNum);
    var unitType = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', lineNum);
    var onePriceTerm = recOrder.getLineItemValue('item', 'custcolr7onepriceterm', lineNum);
    var onePriceTermInDays = recOrder.getLineItemValue('item', 'custcolr7onepriceterm_in_days', lineNum);
    var activationKey = recOrder.getLineItemValue('item', optionId, lineNum);
    var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
    var createdFromRA = recOrder.getLineItemValue('item', 'custcolr7createdfromra', lineNum);
    var isOnePriceUpsellLine = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', lineNum) == 2;
    var isOnePriceRenewalLine = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', lineNum) == 3;
    var isOnePriceNewLine = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', lineNum) == 1;
    var isOnePriceSellingMotion = recOrder.getLineItemValue('item', 'custcolr7_oneprice_selling_motion', lineNum);
    var licenseProductKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', lineNum);
    var isEarlyRenewal = recOrder.getLineItemValue('item', 'custcol_r7_early_renewal', lineNum) == 'T';

    /**
    * APPS-17665 cmcaneney
    *
    * If this line item is service or training,
    * set updateOrderDates = false
    */
    var isServiceSku = checkIfLineItemIsService(itemId);
    // var isServiceSku = false

    if ((activationKey != '' && activationKey != null) && (licenseId == '' || licenseId == null || licenseId == 'XXX' || isOnePriceUpsellLine || isOnePriceRenewalLine || isEarlyRenewal) && !isServiceSku) {

        // var arrDates = getDatesByACL(recOrder, activationKey, optionId);
        var arrDates = optimizedGetDatesByACL(recOrder, activationKey, lineItem);
        var isACLOrder = true;
        if (arrDates['aclStartDate'] == null || arrDates['aclStartDate'] == '') {
            isACLOrder = false;
        }
        var addOns = getItemAddOns(itemId);

        var dateAddOnId = null;
        for (var i = 0; addOns != null && i < addOns.length; i++) { //parse add-ons
            var addOnId = addOns[i];
            var fields = ['custrecordr7acladdon_fieldid', 'custrecordr7acladdon_value', 'custrecordr7acladdon_fieldtype', 'custrecordr7acladdon_extendlicensedates'];
            var addOnFields = memoizedLookupField('customrecordr7acladdoncomponents', addOnId, fields);

            if (addOnFields.custrecordr7acladdon_extendlicensedates) { //a value in this field means this is a date add-on
                dateAddOnId = addOnFields.custrecordr7acladdon_extendlicensedates;
                break;
            }
        }

        var startDate, endDate;
        var currentLineStartDate = recOrder.getLineItemValue('item', 'custcolr7startdate', lineNum);
        var currentLineEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', lineNum);

        if (isOnePriceUpsellLine || isOnePriceRenewalLine || isEarlyRenewal) {

            if (isOnePriceUpsellLine && !isEarlyRenewal) {
                startDate = currentLineStartDate;
                endDate = isOnePriceSellingMotion == 1 ? currentLineEndDate : nlapiDateToString(findLicenseExpirationFromFMR(activationKey, itemId));

                nlapiLogExecution('AUDIT', 'itemFields.displayname', itemFields.displayname);
                nlapiLogExecution('AUDIT', 'orderObject.isNXPIVMMigration', orderObject ? orderObject.isNXPIVMMigration : 'orderobject is null');
                
                if(orderObject && orderObject.isNXPIVMMigration && itemFields.displayname === 'NXP-SUB') {
                    endDate = currentLineEndDate;
                    startDate = getNXPStartDate(licenseProductKey, currentLineStartDate);
                    
                    nlapiLogExecution('AUDIT', 'recOrder.getFieldValue(status)', recOrder.getFieldValue('status'));
                    if(recOrder.getFieldValue('status') != 'Pending Approval') {
                        updateLicenseEndDate(licenseProductKey, endDate);
                    }
                }
                
                nlapiLogExecution('AUDIT', 'onepriceupsellline dates', JSON.stringify({
                    startDate: startDate,
                    endDate: endDate
                }));
            }

            if (isOnePriceRenewalLine || isEarlyRenewal) {
                startDate = currentLineStartDate;
                endDate = currentLineEndDate;
                nlapiLogExecution('AUDIT', 'onepricerenewalline dates', JSON.stringify({
                    startDate: startDate,
                    endDate: endDate
                }));
            }

            recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, startDate);
            recOrder.setLineItemValue('item', 'revrecenddate', lineNum, endDate);
            recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, startDate);
            recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, endDate);

            orderUpdates.lines[lineNum]['revrecstartdate'] = startDate;
            orderUpdates.lines[lineNum]['revrecenddate'] = endDate;
            orderUpdates.lines[lineNum]['custcolr7startdate'] = startDate;
            orderUpdates.lines[lineNum]['custcolr7enddate'] = endDate;
        }
        else if(isOnePriceNewLine && ["1","2","3"].indexOf(isOnePriceSellingMotion) != -1 ){ //1: Upgrade, 2: Downgrade, 3: Cross-sell
            startDate = currentLineStartDate;
            endDate = currentLineEndDate;
            nlapiLogExecution('AUDIT', 'onepricerenewalline dates', JSON.stringify({
                startDate: startDate,
                endDate: endDate
            }));
            
            recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, startDate);
            recOrder.setLineItemValue('item', 'revrecenddate', lineNum, endDate);
            recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, startDate);
            recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, endDate);

            orderUpdates.lines[lineNum]['revrecstartdate'] = startDate;
            orderUpdates.lines[lineNum]['revrecenddate'] = endDate;
            orderUpdates.lines[lineNum]['custcolr7startdate'] = startDate;
            orderUpdates.lines[lineNum]['custcolr7enddate'] = endDate;
        }
        else {
            //finding end date to use
            if (createdFromRA != null && createdFromRA != '') { //already got actual dates
                //nothing
            }
            else {
                if (activationKey.substr(0, 4) == 'PEND') { //unprocessed
                    if (ACL == 'T') {// unprocessed ACL... determine dates and we good
                        startDate = strToday;
                        endDate = convertEndDate(strToday, quantity, unitType, defaultTerm, onePriceTerm, onePriceTermInDays);
                    }
                    else { //we an add-on
                        startDate = arrDates['aclStartDate'];
                        endDate = arrDates['aclEndDate'];
                        if (!isACLOrder || ['1', '7'].indexOf(unitType) == -1) {
                            startDate = strToday;
                            endDate = convertEndDate(strToday, quantity, unitType, defaultTerm, onePriceTerm, onePriceTermInDays);
                        }
                    }
                }
                else { //has real activationKey
                    if (ACL == 'T') { //is acl
                        var expDate = findLicenseExpirationFromFMR(activationKey, itemId);

                        if (expDate == null) {
                            var licenseInfo = findLicenseInfo(activationKey, null, itemId);
                            if (licenseInfo != null) {
                                expDate = nlapiStringToDate(licenseInfo[0]);
                            }
                        }
                        if (expDate != null) {
                            startDate = nlapiDateToString(nlapiAddDays(expDate, 1));
                            endDate = convertEndDate(startDate, quantity, unitType, defaultTerm, onePriceTerm, onePriceTermInDays);
                        }
                        else {
                            startDate = strToday;
                            endDate = convertEndDate(strToday, quantity, unitType, defaultTerm, onePriceTerm, onePriceTermInDays);
                        }
                    }
                    else {// is addon
                        startDate = arrDates['aclStartDate'];
                        endDate = arrDates['aclEndDate'];
                        nlapiLogExecution('AUDIT', 'processLineItemDates endDate - ' + lineNum, endDate);
                        if (!isACLOrder || ['1', '7'].indexOf(unitType) == -1) {
                            startDate = strToday;
                            endDate = convertEndDate(strToday, quantity, unitType, defaultTerm, onePriceTerm, onePriceTermInDays);
                        }
                    }
                }
            }

            if (createdFromRA == null || createdFromRA == '') {
                //recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, startDate);
                //recOrder.setLineItemValue('item', 'revrecenddate', lineNum, endDate);

                recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, startDate);
                recOrder.setLineItemValue('item', 'revrecenddate', lineNum, endDate);
                recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, startDate);
                recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, endDate);

                orderUpdates.lines[lineNum]['revrecstartdate'] = startDate;
                orderUpdates.lines[lineNum]['revrecenddate'] = endDate;
                orderUpdates.lines[lineNum]['custcolr7startdate'] = startDate;
                orderUpdates.lines[lineNum]['custcolr7enddate'] = endDate;
            }

            var arrAddOnDates = optimizedGetDatesByAddOn(recOrder, activationKey, lineItem);

            // only if item is an expiration extention addon
            if (dateAddOnId && ACL == 'F' && (createdFromRA == null || createdFromRA == '')) {

                if (arrParentEndDates[activationKey] == null || arrParentEndDates[activationKey] == '') {
                    arrParentStartDates[activationKey] = arrDates['aclStartDate'];
                    arrParentEndDates[activationKey] = arrDates['aclEndDate'];
                }

                if (!isACLOrder && (arrParentEndDates[activationKey] == null || arrParentEndDates[activationKey] == '')) {
                    var expDate = findLicenseExpirationFromFMR(activationKey, itemId);

                    if (expDate == null) {
                        var licenseInfo = findLicenseInfo(activationKey, null, itemId);
                        if (licenseInfo != null) {
                            expDate = licenseInfo[0];
                        }
                    }
                    else {
                        expDate = nlapiDateToString(expDate);
                    }

                    if (expDate != null) {
                        arrParentEndDates[activationKey] = expDate;
                    }
                }

                if (arrParentEndDates[activationKey] == null || arrParentEndDates[activationKey] == '') {
                    arrParentStartDates[activationKey] = strToday;
                    arrParentEndDates[activationKey] = arrAddOnDates['addOnMaxEndDate'];
                }

                var newStartDate = arrParentStartDates[activationKey];
                var newTrackerEndDate = arrParentEndDates[activationKey];
                if(dateAddOnId == '5'){
                    arrParentStartDates[activationKey] = prevLineStartDate;
                    arrParentEndDates[activationKey] = prevLineEndDate;
                }
              
                if (currentFollowerCount < 2 || ['2', '4'].indexOf(dateAddOnId) != -1) { //if haven't processed 2nd rentech/sub yet, then add the dates  OR add-on extend date type is a "Single" option

                    switch (dateAddOnId) {
                        case '1': //License End + 1 (Pair)
                            newStartDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(arrParentEndDates[activationKey]), 1));
                            currentFollowerCount++;
                            break;
                        case '2': //License End + 1 (Single)
                            newStartDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(arrParentEndDates[activationKey]), 1));
                            break;
                        case '3': //License Start (Pair)
                            newStartDate = arrParentStartDates[activationKey];
                            currentFollowerCount++;
                            break;
                        case '4': //License Start (Single)
                            newStartDate = arrParentStartDates[activationKey];
                            break;
                        case '5': //License End +1 (Trio)
                            newStartDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(arrParentEndDates[activationKey]), 1));
                            currentFollowerCount++;
                            break;
                        case '6': //License Start (Trio)
                            newStartDate = arrParentStartDates[activationKey];
                            currentFollowerCount++;
                            break;
                        default: //should never hit this, unless someone makes a new dropdown value... should never happen without code change
                            newStartDate = strToday;
                            currentFollowerCount++;
                            break;
                    }

                    newTrackerEndDate = convertEndDate(newStartDate, quantity, unitType, defaultTerm, onePriceTerm, onePriceTermInDays);
                    if(dateAddOnId == '5'){
                        arrParentStartDates[activationKey] = newStartDate;
                        arrParentEndDates[activationKey] = newTrackerEndDate;
                    }
                }
                else if (currentFollowerCount == 2 && dateAddOnId == 5) {
                    currentFollowerCount++
                } else {
                    currentFollowerCount = 1;
                }
                nlapiLogExecution('DEBUG', 'updating start and end dates on lines', lineNum + ': ' + newStartDate);
                nlapiLogExecution('DEBUG', 'updating start and end dates on lines', lineNum + ': ' + newTrackerEndDate);
                recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, newStartDate);
                recOrder.setLineItemValue('item', 'revrecenddate', lineNum, newTrackerEndDate);
                recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, newStartDate);
                recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, newTrackerEndDate);

                orderUpdates.lines[lineNum]['revrecstartdate'] = newStartDate;
                orderUpdates.lines[lineNum]['revrecenddate'] = newTrackerEndDate;
                orderUpdates.lines[lineNum]['custcolr7startdate'] = newStartDate;
                orderUpdates.lines[lineNum]['custcolr7enddate'] = newTrackerEndDate;
            }
        }
        prevLineStartDate = recOrder.getLineItemValue('item', 'custcolr7startdate', lineNum);
        prevLineEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', lineNum);
        if(ACL == 'T') {
            arrParentStartDates[activationKey] = recOrder.getLineItemValue('item', 'custcolr7startdate', lineNum);
            arrParentEndDates[activationKey] = recOrder.getLineItemValue('item', 'custcolr7enddate', lineNum);
        }
    }
    return recOrder;
}

function getNXPStartDate(licenseProductKey, currentStartDate) {
    var searchColumns = new Array(new nlobjSearchColumn("custrecordr7nxlicenseoemstartdate"));
    var searchFilter = new Array(new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', licenseProductKey));
    var results = nlapiSearchRecord('customrecordr7nexposelicensing', null, searchFilter, searchColumns);
    if (results && results.length > 0) {
        return results[0].getValue('custrecordr7nxlicenseoemstartdate');
    }
    return currentStartDate;
}

function findLicenseInfo(activationKey, acrId, itemId) {

    if (itemId != null && itemId != '') {
        acrId = getItemProperties(itemId, 'custitemr7itemacrproducttype');
    }

    var acrProductTypeFields = arrProductTypes[acrId];

    if (acrProductTypeFields != null && acrProductTypeFields != '' && acrProductTypeFields != 'undefined') {
        var activationKeyField = acrProductTypeFields['activationid'];
        var recordId = acrProductTypeFields['recordid'];
        var expirationField = acrProductTypeFields['expiration'];
        var licenseIdField = acrProductTypeFields['licenseid'];

        var arrSearchFilters = new Array();
        // arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(activationKeyField, null, 'is', activationKey);
        arrSearchFilters[arrSearchFilters.length] = [activationKeyField, null, 'is', activationKey];

        var arrSearchColumns = new Array();
        arrSearchColumns[0] = expirationField;
        arrSearchColumns[1] = 'internalid';
        arrSearchColumns[2] = licenseIdField;
        
        var arrSearchResults = memoizedSearchRecord(recordId, null, arrSearchFilters, arrSearchColumns);

        if (arrSearchResults != null && arrSearchResults.length >= 1) {
            var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
            var licenseId = arrSearchResults[0].getValue(arrSearchColumns[1]);
            var name = arrSearchResults[0].getValue(arrSearchColumns[2]);

            return new Array(expDate, licenseId, name);
        }

    }
    return null;
}

function findLicenseExpirationFromFMR(activationKey, itemId) {

    var acrId = getItemProperties(itemId, 'custitemr7itemacrproducttype');
    var licenseType = getItemProperties(itemId, 'custitemr7skulicensetype');

    var activationKeyField = arrProductTypes[acrId]['activationid'];
    var recordId = arrProductTypes[acrId]['recordid'];
    var expirationField = arrProductTypes[acrId]['expiration'];
    var licenseIdField = arrProductTypes[acrId]['licenseid'];

    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationKey);
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'F');
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordId);
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', expirationField);

    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7licfmenddate', null, 'max');
    arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmproductkey', null, 'group');

    var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);

    if (arrSearchResults != null && arrSearchResults.length >= 1) {
        var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);

        if (expDate != null && expDate != '') {

            if (licenseType == 2) { //perpetual
                return nlapiStringToDate(expDate);
            }

            var gracePeriodAllowed = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7graceperiodallowed');
            if (gracePeriodAllowed == null || gracePeriodAllowed == '') {
                gracePeriodAllowed = 63;
            }

            var dtMinDateToCareAbout = nlapiAddDays(new Date(), gracePeriodAllowed * -1);

            var arrSearchFilters = new Array();
            arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationKey);
            arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'T');
            arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
            arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'before', 'today');
            arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'after', expDate);
            arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordId);
            arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', expirationField);

            var arrSearchColumns = new Array();
            arrSearchColumns[0] = new nlobjSearchColumn('internalid');
            arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmstartdate').setSort(false);
            arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7licfmenddate');

            var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);

            var totalGraceDays = 0;
            var prevMaxGraceEnd = null;
            for (var k = 0; arrSearchResults != null && k < arrSearchResults.length; k++) {

                var searchResult = arrSearchResults[k];
                var graceStart = searchResult.getValue(arrSearchColumns[1]);
                var graceEnd = searchResult.getValue(arrSearchColumns[2]);

                if (graceStart != null && graceStart != '' && graceEnd != null && graceEnd != '') {

                    var dtMaxExp = nlapiStringToDate(expDate);
                    var dtgraceStart = nlapiStringToDate(graceStart);
                    var dtgraceEnd = nlapiStringToDate(graceEnd);

                    if (dtgraceStart < dtMinDateToCareAbout) {
                        dtgraceStart = dtMinDateToCareAbout;
                    }

                    if (dtgraceStart < dtMaxExp) {
                        dtgraceStart = dtMaxExp;
                    }

                    if (dtgraceEnd > new Date()) {
                        dtgraceEnd = new Date();
                    }

                    if (prevMaxGraceEnd != null && dtgraceStart < prevMaxGraceEnd) {
                        dtgraceStart = prevMaxGraceEnd;
                    }

                    if (dtgraceStart < dtgraceEnd) {
                        var numGraceDays = days_between(dtgraceStart, dtgraceEnd);
                        totalGraceDays = totalGraceDays + numGraceDays;

                        if (prevMaxGraceEnd == null || dtgraceEnd > prevMaxGraceEnd) {
                            prevMaxGraceEnd = dtgraceEnd;
                        }
                    }
                }

            }

            var dtMaxEndDate = nlapiStringToDate(expDate);
            var dtNewExp = nlapiAddDays(new Date(), (totalGraceDays * -1) - 1);

            if (dtMaxEndDate > new Date()) {
                return dtMaxEndDate;
            }
            else {
                return dtNewExp;
            }
        }

    }

    return null;
}

function days_between(date1, date2) {

    // The number of milliseconds in one day
    var ONE_DAY = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = Math.abs(date1_ms - date2_ms);

    // Convert back to days and return
    return Math.round(difference_ms / ONE_DAY);

}

function findParentLineNumber(recParentOrder, parentLineId) {

    lineItemCount = recParentOrder.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {
        var lineId = recParentOrder.getLineItemValue('item', 'id', i);

        if (lineId == parentLineId) {
            return i;
        }
    }
}

function optimizedGetDatesByACL(recOrder, activationKey, lineItem, processUpsellAddons) {
    nlapiLogExecution('AUDIT', 'optimizedGetDatesByACL for activationKey', activationKey);

    if (processUpsellAddons) {
        return getDatesByACL(recOrder, activationKey);
    }

    var dates = new Array();
    dates['aclStartDate'] = '';
    dates['aclEndDate'] = '';

    var lineIndex = lineItem["lineNum"];
    var lineId = lineItem["lineId"];
    var acrId = lineItem["acrId"];
    var optionId = arrProductTypes[acrId]['optionid'];
    var ACL = lineItem["isACL"];

    var currentActivationKey = recOrder.getLineItemValue('item', optionId, lineIndex);
    var currentLineId = recOrder.getLineItemValue('item', 'id', lineIndex);

    if ((currentLineId == lineId && currentActivationKey == activationKey) || (activationKey.substr(0, 4) == 'PEND' && activationKey.substr(5) == currentLineId)) {
        // var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', lineIndex);
        if (ACL == 'T') {
            var strLicStartDate = recOrder.getLineItemValue('item', 'custcolr7startdate', lineIndex);
            var strLicEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', lineIndex);
            dates['aclStartDate'] = strLicStartDate;
            dates['aclEndDate'] = strLicEndDate;
        }
    }
    
    return dates;
}

function getDatesByACL(recOrder, activationKey) {

    var dates = new Array();
    dates['aclStartDate'] = '';
    dates['aclEndDate'] = '';

    var lineItemCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {

        var lineId = recOrder.getLineItemValue('item', 'id', i);
        var acrId = arrItemACRIds[lineId];

        if (acrId == null || acrId == '' || acrId == 'undefined') {
            // do nothing
            continue;
        }
        else {
            var optionId = arrProductTypes[acrId]['optionid'];

            var currentActivationKey = recOrder.getLineItemValue('item', optionId, i);
            var currentLineId = recOrder.getLineItemValue('item', 'id', i);

            if (currentActivationKey == activationKey || (activationKey.substr(0, 4) == 'PEND' && activationKey.substr(5) == currentLineId)) {
                var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
                var strLicStartDate = recOrder.getLineItemValue('item', 'custcolr7startdate', i);
                var strLicEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', i);

                if (ACL == 'T') {
                    dates['aclStartDate'] = strLicStartDate;
                    dates['aclEndDate'] = strLicEndDate;
                }
            }
        }
    }
    return dates;
}

function optimizedGetDatesByAddOn(recOrder, activationKey, lineItem, processUpsellAddons) {

    if (processUpsellAddons) {
        return getDatesByAddOn(recOrder, activationKey);
    }

    nlapiLogExecution('AUDIT', 'optimizedGetDatesByAddOn for activationKey', activationKey);

    var dates = new Array();
    dates['addOnMinStartDate'] = '';
    dates['addOnMaxEndDate'] = '';

    var ACL = lineItem["isACL"];
    var targetAddonArray = null;
    
    if (ACL == 'T') {
        targetAddonArray = lineItem.getOrderObject().getSiblingsOfItem(lineItem);
    } else {
        if (lineItem.parentIndex !== undefined) {
            var parentItem = lineItem.getOrderObject().getParentOfItem(lineItem);
            targetAddonArray = lineItem.getOrderObject().getSiblingsOfItem(parentItem);
        }
        // // this will not work in case of item accosiation suitelet => in this case default to standart method
        // if (lineItem.suggestedParentLineItemObject !== undefined) {
        //     targetAddonArray = lineItem.suggestedParentLineItemObject.suggestedSiblingAddons;
        // } else {
        //     nlapiLogExecution('AUDIT', 'optimizedGetDatesByAddOn in Suitelet', 'default to standart getDatesByAddOn');
        //     return getDatesByAddOn(recOrder, activationKey)
        // }
    }
    
    if (targetAddonArray !== null) {
        targetAddonArray.forEach(function (siblingItem) {
            var lineId = siblingItem["lineId"];
            var acrId = arrItemACRIds[lineId];
            var optionId = arrProductTypes[acrId]['optionid'];
            var currentLineIndex = siblingItem["lineNum"];
            var currentActivationKey = recOrder.getLineItemValue('item', optionId, currentLineIndex);
            
            if (currentActivationKey == activationKey || (activationKey.substr(0, 4) == 'PEND' && activationKey.substr(5) == lineId)) {
                var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', currentLineIndex);
                var strLicStartDate = recOrder.getLineItemValue('item', 'custcolr7startdate', currentLineIndex);
                var strLicEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', currentLineIndex);

                if (ACL == 'F') {
                    if (dates['addOnMinStartDate'] == '' || dates['addOnMinStartDate'] == null || (strLicStartDate != null && strLicStartDate != '' && nlapiStringToDate(strLicStartDate) < nlapiStringToDate(dates['addOnMinStartDate']))) {
                        // nlapiLogExecution('AUDIT', 'strLicStartDate i=' + currentLineIndex, strLicStartDate);
                        dates['addOnMinStartDate'] = strLicStartDate;
                    }
                    if (dates['addOnMaxEndDate'] == '' || dates['addOnMaxEndDate'] == null || (strLicEndDate != null && strLicEndDate != '' && nlapiStringToDate(strLicEndDate) > nlapiStringToDate(dates['addOnMaxEndDate']))) {
                        // nlapiLogExecution('AUDIT', 'strLicEndDate i=' + currentLineIndex, strLicEndDate);
                        dates['addOnMaxEndDate'] = strLicEndDate;
                    }
                }
            }
        })
    } else {
        nlapiLogExecution('AUDIT', 'targetAddonArray is NULL for item: ', lineItem.getInfo())
    }

    return dates;
}

// this is the place where is dies on big orders
function getDatesByAddOn(recOrder, activationKey) {

    nlapiLogExecution('AUDIT', 'getDatesByAddOn for activationKey', activationKey);

    var dates = new Array();
    dates['addOnMinStartDate'] = '';
    dates['addOnMaxEndDate'] = '';

    var lineCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= lineCount; i++) {

        var lineId = recOrder.getLineItemValue('item', 'id', i);
        var acrId = arrItemACRIds[lineId];
        if (acrId == null || acrId == '' || acrId == 'undefined') {
            // do nothing
            continue;
        }
        else {
            var optionId = arrProductTypes[acrId]['optionid'];

            var currentActivationKey = recOrder.getLineItemValue('item', optionId, i);
            var currentLineId = recOrder.getLineItemValue('item', 'id', i);

            if (currentActivationKey == activationKey || (activationKey.substr(0, 4) == 'PEND' && activationKey.substr(5) == currentLineId)) {
                var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
                var strLicStartDate = recOrder.getLineItemValue('item', 'custcolr7startdate', i);
                var strLicEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', i);

                if (ACL == 'F') {
                    if (dates['addOnMinStartDate'] == '' || dates['addOnMinStartDate'] == null || (strLicStartDate != null && strLicStartDate != '' && nlapiStringToDate(strLicStartDate) < nlapiStringToDate(dates['addOnMinStartDate']))) {
                        dates['addOnMinStartDate'] = strLicStartDate;
                    }
                    if (dates['addOnMaxEndDate'] == '' || dates['addOnMaxEndDate'] == null || (strLicEndDate != null && strLicEndDate != '' && nlapiStringToDate(strLicEndDate) > nlapiStringToDate(dates['addOnMaxEndDate']))) {
                        dates['addOnMaxEndDate'] = strLicEndDate;
                    }
                }
            }
        }
    }
    return dates;
}


function reAssociateItems(recOrder, oldAK, newAK, orderUpdates) {
    // added this line because this function is used by processes other than ACR.  If it's not an ACR process,
    // this object is needed, but ultimately ignored.
    orderUpdates = orderUpdates || getOrderUpdatesObject(recOrder);

    var lineItemCount = recOrder.getLineItemCount('item');
    for (var k = 1; k <= lineItemCount; k++) {
        // Use ACR in conjunction with arrProductTypes to get activationKey using dynamic Item Option Id
        var lineId = recOrder.getLineItemValue('item', 'id', k);
        var acrId = arrItemACRIds[lineId];
        if (acrId != null && acrId != '') {


            var optionId = arrProductTypes[acrId]['optionid'];
            var activationKey = recOrder.getLineItemValue('item', optionId, k);
            // If current activation key is same as old key, set activation key to new key
            if (oldAK != null && newAK != null) {
                if (activationKey == oldAK) {
                    recOrder.setLineItemValue('item', optionId, k, newAK);
                    orderUpdates.lines[k][optionId] = newAK;
                }
            }
            else {
                // Set PEND on ACLs
                var ACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', k);
                var lineID = recOrder.getLineItemValue('item', 'id', k);
                var newActivationKey = 'PEND:' + lineID;

                if (ACL == 'T' && activationKey != null && activationKey.substr(0, 4) == 'PEND' && activationKey != newActivationKey) {

                    for (var j = 1; j <= lineItemCount; j++) {
                        var compareActivationKey = recOrder.getLineItemValue('item', optionId, j);
                        if (compareActivationKey == activationKey) {
                            recOrder.setLineItemValue('item', optionId, j, newActivationKey);
                            orderUpdates.lines[j][optionId] = newActivationKey;
                        }
                    }
                }
            }
        }
    }
    return recOrder;
}

function determineOrderStartEndDates(recOrder, orderUpdates, orderObject) {
    // added this line because this function is used by processes other than ACR.  If it's not an ACR process,
    // this object is needed, but ultimately ignored.
    orderUpdates = orderUpdates || getOrderUpdatesObject(recOrder);

    var isNXPIVMMigration = orderObject && orderObject.isNXPIVMMigration

    var dateToday = new Date();
    var strToday = nlapiDateToString(dateToday);
    recOrder.setFieldValue('startdate', '');
    recOrder.setFieldValue('enddate', '');
    orderUpdates['startdate'] = '';
    orderUpdates['enddate'] = '';

    lineItemCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {
        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var itemType = recOrder.getLineItemValue('item', 'itemtype', i);

        if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'group' && itemType != 'EndGroup') {
            //var itemSKU = recOrder.getLineItemValue('item', 'item', i);
            var itemQty = Number(recOrder.getLineItemValue('item', 'quantity', i));
            nlapiLogExecution('DEBUG', 'isNXPIVMMigration', isNXPIVMMigration);
            nlapiLogExecution('DEBUG', 'itemId', itemId);
            nlapiLogExecution('DEBUG', 'itemQty', itemQty);
            if(isNXPIVMMigration && itemId == 7555 && itemQty <= 0) {
                nlapiLogExecution('DEBUG', 'skipping'+ itemId, '');
                continue;
            }
            nlapiLogExecution('DEBUG', 'continuing' + itemId, '');

            var itemStart = recOrder.getLineItemValue('item', 'custcolr7startdate', i);
            var itemEnd = recOrder.getLineItemValue('item', 'custcolr7enddate', i);

            if ((itemStart != null && itemStart != '') && (recOrder.getFieldValue('startdate') == '' || nlapiStringToDate(itemStart) < nlapiStringToDate(recOrder.getFieldValue('startdate')))) {
                recOrder.setFieldValue('startdate', itemStart);
                orderUpdates['startdate'] = itemStart;
            }
            if ((itemEnd != null && itemEnd != '') && (recOrder.getFieldValue('enddate') == '' || nlapiStringToDate(itemEnd) > nlapiStringToDate(recOrder.getFieldValue('enddate')))) {
                recOrder.setFieldValue('enddate', itemEnd);
                orderUpdates['enddate'] = itemEnd;
            }
        }
    }

    if (recOrder.getFieldValue('startdate') == '' || recOrder.getFieldValue('startdate') == null) {
        recOrder.setFieldValue('startdate', strToday);
        orderUpdates['startdate'] = strToday;
    }
    if (recOrder.getFieldValue('enddate') == '' || recOrder.getFieldValue('enddate') == null) {
        recOrder.setFieldValue('enddate', strToday);
        orderUpdates['enddate'] = strToday;
    }
}

function processACRAddOns(recOrder, arrAddOnItems, orderUpdates, orderObject) {
    // added this line because this function is used by processes other than ACR.  If it's not an ACR process,
    // this object is needed, but ultimately ignored.
    orderUpdates = orderUpdates || getOrderUpdatesObject(recOrder);

    for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length && unitsLeft(1000) && timeLeft() && !exitScript; i++) {
        try {
            var lineItem = arrAddOnItems[i];
            var itemProperties = lineItem['itemProperties'];
            var itemId = lineItem['itemId'];
            var lineId = lineItem['lineId'];
            var acrId = arrItemACRIds[lineId];
            var licenseHashField = arrProductTypes[acrId]['createdFromLineHash'];
            var syncUpWithIpimsField = arrProductTypes[acrId]['syncUpWithIpims'];
            var lineNum = lineItem['lineNum'];
            var licenseId = lineItem['licenseId'];
            var licType = arrProductTypes[acrId]['recordid'];
            var skusHOSD = itemProperties['custitemr7itemdedicatedhosted'];
            var hbrType = lineItem['requireshbr'];
            var activationKey = recOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], lineNum);
            var licContactFld = arrProductTypes[acrId]['contact'];
            var newContact = lineItem['contact'];

            var fields = new Array();
            if ((activationKey != '' && activationKey != null) && (licenseId == '' || licenseId == null)) {

                // If the Item is a new Dedicated hosted Engine send build requests and create Dedicated Hosted Records
                if (skusHOSD == 'T') {
                    // Create Dedicated Hosted Record
                    try {
                        var dedicatedId = createDedicatedHostedRecord(recOrder);
                    }
                    catch (e) {
                        nlapiSendEmail(340932, 340932, 'Could Not create Dedicated Hosted Record', e.name + ' : ' + e.message);
                    }
                    // Queue help desk ticket
                    MQLib.QueueNewMessage('sendDedicatedBuildRequestEmail', {
                        salesOrderId: recOrder.id,
                        lineNum: lineNum,
                        dedicatedId: dedicatedId
                    });
                }

                nlapiLogExecution('DEBUG', 'Processing addOn dates', lineId);
                recOrder = processLineItemDates(recOrder, lineItem, orderUpdates, orderObject);

                if (activationKey.substr(0, 4) == 'PEND') {
                    var parentACLLineId = activationKey.substr(5);
                    var parentOrderId = parentACLLineId.substr(0, parentACLLineId.indexOf('_'));

                    nlapiLogExecution('DEBUG', 'activationKey / parentACLLineId / parentOrderId', JSON.stringify({
                        activationKey: activationKey,
                        parentACLLineId: parentACLLineId,
                        parentOrderId: parentOrderId
                    }));

                    if (parentOrderId == recOrder.getId()) {
                        var recParentOrder = recOrder;
                        var parentLineNum = itemLineNums[parentACLLineId];
                    }
                    else {
                        try {
                            var recParentOrder = nlapiLoadRecord('salesorder', parentOrderId);
                        }
                        catch (e) {
                            try {
                                var recParentOrder = nlapiLoadRecord('estimate', parentOrderId);
                            }
                            catch (e) {
                                var recParentOrder = nlapiLoadRecord('opportunity', parentOrderId);
                            }
                        }
                        var parentLineNum = findParentLineNumber(recParentOrder, parentACLLineId);
                    }
                    fields['activationKey'] = recParentOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], parentLineNum);
                    fields['parentLicId'] = recParentOrder.getLineItemValue('item', 'custcolr7translicenseid', parentLineNum);
                }
                else {
                    fields['activationKey'] = activationKey;
                }

                nlapiLogExecution('DEBUG', 'processACRAddOns fields', JSON.stringify({
                    x_itemId: itemId,
                    x_lineNum: lineNum,
                    x_lineId: recOrder.getLineItemValue('item', 'id', lineNum),
                    x_oneFlow: Number(recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', lineNum)),
                    x_lineHash: recOrder.getLineItemValue('item', 'custcolr7_linehash', lineNum),
                    x_custitemr7itemactivationemailtemplate: itemProperties['custitemr7itemactivationemailtemplate'],
                    x_activationKey: fields['activationKey'],
                    x_parentLicId: fields['parentLicId'],
                    x_contact: newContact
                }));

                fields['itemId'] = itemId;
                fields['lineNum'] = lineNum;
                fields['lineId'] = recOrder.getLineItemValue('item', 'id', lineNum);
                fields['oneFlow'] = Number(recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', lineNum));
                fields['lineHash'] = recOrder.getLineItemValue('item', 'custcolr7_linehash', lineNum);
                fields['custitemr7itemactivationemailtemplate'] = itemProperties['custitemr7itemactivationemailtemplate'];

                if (fields['parentLicId'] != 'XXX' && fields['activationKey'] != null && (fields['activationKey'].substr(0, 4) != 'PEND' ||
                    fields['activationKey'].substr(0, 4) == 'PEND' && [1, 3].indexOf(fields['oneFlow'] != -1))) {
                    
                    var processUpsellAddons = true // default to old date processing in Addon case
                    var returnedFields = createAddOnFMR(recOrder, fields, lineItem, processUpsellAddons);
                    nlapiLogExecution('DEBUG', 'created FMR', itemId);

                    var licenseName = returnedFields[0];
                    var success = returnedFields[1];
                    var newProductKey = returnedFields[2];
                    var licenseId = returnedFields[3];

                    //Get opportunity from sale order to be sure that it is renewal opportunity. There is no need in send email based on renewal opportunity and sale order
                    var isOppRenewal = 'F';
                    try {
                        isOppRenewal = nlapiLookupField('opportunity', recOrder.getFieldValue('opportunity'), 'custbodyr7transactionrenewalopp');
                    } catch (e) {
                        nlapiLogExecution('ERROR', 'ERROR getting opportunity renewal check from PROCESSING AN ADDON', 'OrderID: ' + recOrder.getId() + '\n' + e.name + ' : ' + e.message);
                    }
                    if (success) {
                        //nexpose or insight platform or metasploit + oneprice
                        if ((acrId == 1 || acrId == 9 || acrId == 2) && fields['lineHash'] && licenseHashField && fields['oneFlow']) {
                            var licRec = nlapiLoadRecord(licType, licenseId);
                            var currentLicRecHash = licRec.getFieldValue(licenseHashField);
                            var combinedLineHashes = collectLineHashes(fields['activationKey'], recOrder);
                            if (currentLicRecHash != combinedLineHashes) {
                                licRec.setFieldValue(licenseHashField, combinedLineHashes);
                                licRec.setFieldValue(syncUpWithIpimsField, 1);
                                licRec.setFieldValue(licContactFld, newContact);
                                nlapiSubmitRecord(licRec);
                            }
                        }

                        if ((fields['custitemr7itemactivationemailtemplate'] != null && fields['custitemr7itemactivationemailtemplate'] != '') && isOppRenewal == 'F' &&
                            //add one flow check, confirmation templates are processed in Licensing Event UE.js
                            !fields['oneFlow']) {
                            licenseEmailsToSend[licenseEmailsToSend.length] = [arrProductTypes[acrId]['recordid'], licenseId, fields['custitemr7itemactivationemailtemplate'], acrId];
                            nlapiLogExecution('DEBUG', 'licenseEmailsToSend processACRAddOns, ', JSON.stringify(licenseEmailsToSend));
                        }

                        recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, licenseName);
                        recOrder.setLineItemValue('item', arrProductTypes[acrId]['optionid'], lineNum, newProductKey);
                        orderUpdates.lines[lineNum]['custcolr7translicenseid'] = licenseName;
                        orderUpdates.lines[lineNum][arrProductTypes[acrId]['optionid']] = newProductKey;
                    }
                    else {
                        nlapiLogExecution('ERROR', 'updating line with XXX', lineNum)
                        recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
                        orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';

                        nlapiSendEmail(
                            adminUser,
                            210338407,
                            'License Not Delivered XXX ' + recOrder.getFieldValue('tranid'),
                            'OrderID: ' + recOrder.getFieldValue('tranid') + '\nLineNum: ' + lineNum + '\nCustomer: ' + recOrder.getFieldText('entity'));
                    }
                }
                else {
                    nlapiLogExecution('ERROR', 'updating line with XXX 2', lineNum)
                    recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
                    orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';

                    nlapiSendEmail(
                        adminUser,
                        210338407,
                        'License Not Delivered XXX ' + recOrder.getFieldValue('tranid'),
                        'OrderID: ' + recOrder.getFieldValue('tranid') + '\nLineNum: ' + lineNum + '\nCustomer: ' + recOrder.getFieldText('entity'));
                }
            }
        }
        catch (e) {
            var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, adminUser, 'ERROR PROCESSING AN ADDON', 'OrderID: ' + recOrder.getId() + '\nlineNum: ' + lineNum + '\n' + e.name + ' : ' + e.message, 'michael_burstein@rapid7.com');
            nlapiLogExecution('ERROR', 'ERROR PROCESSING AN ADDON', 'OrderID: ' + recOrder.getId() + '\n' + e.name + ' : ' + e.message);
            recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
            orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';

            exitScript = true;
            break;
        }
    }
}

function processACR(recOrder, acrItem, orderUpdates) {
    // added this line because this function is used by processes other than ACR.  If it's not an ACR process,
    // this object is needed, but ultimately ignored.
    orderUpdates = orderUpdates || getOrderUpdatesObject(recOrder);

    var strToday = nlapiDateToString(new Date());
    var lineId = acrItem['lineId'];
    var lineNum = acrItem['lineNum'];
    var licenseId = acrItem['licenseId'];
    var acrId = acrItem['acrId'];
    var itemOptionId = arrProductTypes[acrId]['optionid'];
    var activationKey = recOrder.getLineItemValue('item', itemOptionId, lineNum);
    var templateFieldId = arrProductTypes[acrId]['templateid'];

    //If the line-item is an MNG Order && and the license hasn't already been created
    if ((activationKey != '' && activationKey != null) && (licenseId == '' || licenseId == null)) {
        nlapiLogExecution('DEBUG', 'Needs processing', 'Yup');

        var itemProperties = acrItem['itemProperties'];
        var templateId = itemProperties[templateFieldId];


        var salesRep = recOrder.getFieldValue('salesrep');
        var activationNeeded = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', lineNum);
        var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);

        //The fields array contains all the parameters for creating/renewing a license
        var fields = new Object();

        //Lookup the primarycontact of the customer
        var presentContact = recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum);

        if (presentContact == null || presentContact == '') {
            var customerId = recOrder.getFieldValue('entity');
            var contactEmail = recOrder.getFieldValue('email');
            var lineItemContact = obtainLineItemContact(customerId, contactEmail);
            recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, lineItemContact);
            orderUpdates.lines[lineNum]['custcolr7translinecontact'] = lineItemContact;
            nlapiLogExecution('DEBUG', 'Set Primary Contact To', lineItemContact);
        }
        nlapiLogExecution('DEBUG', 'Contact ID for License', recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum));

        //ProductLine should be set to Managed Service
        fields['custitemr7itemactivationemailtemplate'] = itemProperties['custitemr7itemactivationemailtemplate'];
        fields['startDate'] = recOrder.getLineItemValue('item', 'custcolr7startdate', lineNum);
        fields['expirationDate'] = recOrder.getLineItemValue('item', 'custcolr7enddate', lineNum);
        fields['activationKey'] = activationKey;
        fields['licenseId'] = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
        fields['customer'] = recOrder.getFieldValue('entity');
        fields['salesorder'] = recOrder.getId();
        fields['salesrep'] = recOrder.getFieldValue('salesrep');
        fields['contact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum);
        fields['lineId'] = recOrder.getLineItemValue('item', 'id', lineNum);
        fields['licenseTemplate'] = templateId;
        fields['acrId'] = acrId;
        fields['lineNum'] = lineNum;
        fields['itemId'] = recOrder.getLineItemValue('item', 'item', lineNum);
        fields['lineHash'] = recOrder.getLineItemValue('item', 'custcolr7_linehash', lineNum);
        fields['lineOneItemFlow'] = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', lineNum);
        fields['packageLicense'] = recOrder.getLineItemValue('item', 'custcol_r7_pck_package_license', lineNum);
        fields['categoryPurchased'] = Number(recOrder.getLineItemValue('item', 'custcolr7_category_purchased', lineNum));
        fields['fulfilAtScale'] = recOrder.getLineItemValue('item', 'custcol_requires_fulfil_at_scale', lineNum);
        fields['fulfilAsPackage'] = recOrder.getLineItemValue('item', 'custcol_r7_fulfil_as_package', lineNum);

        // Create New licenses
        nlapiLogExecution('DEBUG', 'Time to process', 'yup');
        var returnedFields = new Array();
        if (activationKey.substr(0, 4) == 'PEND') {
            returnedFields = createNewACRLicense(fields, recOrder, activationKey, acrItem);
        }
        else {
            updatePackageLicense(fields);
            returnedFields = createRenewalFMR(fields, recOrder);
            try{
                updateLicenseContact(fields);
            }
            catch(e){
                nlapiLogExecution("ERROR", "Could not update license contact", e);
            }
        }

        var licenseName = returnedFields[0];
        var success = returnedFields[1];
        var newActivationKey = returnedFields[2];

        nlapiLogExecution('DEBUG', 'success', success);

        if (success) {
            recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, licenseName);
            recOrder.setLineItemValue('item', itemOptionId, lineNum, newActivationKey);
            orderUpdates.lines[lineNum]['custcolr7translicenseid'] = licenseName;
            orderUpdates.lines[lineNum][itemOptionId] = newActivationKey;

            nlapiLogExecution('DEBUG', 'itemOptionId / lineNum / newActivationKey', JSON.stringify({
                itemOptionId: itemOptionId,
                lineNum: lineNum,
                newActivationKey: newActivationKey
            }));

            if (activationKey != newActivationKey) {
                reAssociateItems(recOrder, activationKey, newActivationKey, orderUpdates);
            }
        }
        else {
            nlapiLogExecution('DEBUG', 'license was not correctly created, mark line as XXX')
            recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
            orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
            //recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', lineNum, '');
        }

        nlapiLogExecution('DEBUG', 'Processed ACR', lineId);

    }//If the line-item is an ACR Order && and the license hasn't already been created
    var licStartDate = recOrder.getLineItemValue('item', 'custcolr7startdate', lineNum);
    var licEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', lineNum);
    arrParentStartDates[activationKey] = licStartDate;
    arrParentEndDates[activationKey] = licEndDate;

    return recOrder;
}

function obtainLineItemContact(customerId, email) {
    //Check if customerId, email, and give acesss

    nlapiLogExecution('DEBUG', 'CustomerId of SalesOrder / Email of salesOrder', JSON.stringify({
        customerId: customerId,
        email: email
    }));

    var searchFilters = new Array(new nlobjSearchFilter('company', null, 'is', customerId), new nlobjSearchFilter('email', null, 'is', email));

    var results = nlapiSearchRecord('contact', null, searchFilters);
    if (results != null) {
        contactId = results[0].getId();
    }
    else {
        contactId = null;
    }
    return contactId;
}

function createNewACRLicense(fields, recOrder, activationKey, acrItem) {

    var acrId = fields['acrId'];
    var acrProductTypeFields = arrProductTypes[acrId];
    var licRecord = acrProductTypeFields['recordid'];
    var activationId = acrProductTypeFields['activationid'];
    var expirationFieldId = acrProductTypeFields['expiration'];
    var packageLicenseFieldId = acrProductTypeFields['packageLicense'];
    var categoryPurchased = fields['categoryPurchased'];
    var oneItemLinceFlow = fields['lineOneItemFlow'];
    var activationKey = fields['activationKey'];
    var isFulfilAtScale = fields['fulfilAtScale'] == 'T' ? true : false;
    var isFulfilAsPackage = fields['fulfilAsPackage'] == 'T' ? true : false;
    nlapiLogExecution('AUDIT', "Item IsFulfilAtScale", JSON.stringify({
        x_acrID: acrId,
        x_licRecord: licRecord,
        x_categoryPurchased: categoryPurchased,
        x_isFulfilAtScale: isFulfilAtScale
    }));
    
    nlapiLogExecution('DEBUG', 'createNewACRLicense debug', JSON.stringify({
        x_acrID: acrId,
        x_licRecord: licRecord,
        x_oneItemLinceFlow: oneItemLinceFlow,
        x_licenseTemplate: fields['licenseTemplate'],
        packageLicenseFieldId: packageLicenseFieldId,
        packageLicenseValue: fields['packageLicense'],
        x_categoryPurchased: categoryPurchased
    }));

    var newRecord = nlapiCopyRecord(licRecord, fields['licenseTemplate']);

    // Null out any necessary fields
    var fieldsToEmpty = acrProductTypeFields['emptyfields'];

    if (fieldsToEmpty != null && fieldsToEmpty != '' && fieldsToEmpty != 'undefined') {
        var arrFieldsToEmpty = fieldsToEmpty.split(',');
        for (var i = 0; i < arrFieldsToEmpty.length; i++) {
            newRecord.setFieldValue(arrFieldsToEmpty[i], '');
        }
    }

    //nexpose + oneprice
    if (acrId == 1 && (oneItemLinceFlow || isFulfilAtScale)) {
        if(categoryPurchased == 69) { //test 70 = Nexpose Subscription_1P prod  =69
            var nxProdToken = generateValue('randomString');
            newRecord.setFieldValue('custrecordr7nxproducttoken', nxProdToken);
        }
        newRecord.setFieldValue('custrecordr7nxlicenseoemstartdate', fields['startDate']);
        newRecord.setFieldValue(activationId, fields['activationKey']);
        var combinedLineHashes = collectLineHashes(activationKey, recOrder);
        newRecord.setFieldValue('custrecordr7createdfromlinehash', combinedLineHashes);
        if(isFulfilAtScale){
            newRecord.setFieldValue('custrecord_nx_req_fulfil_at_scale', 'T');
        }
    }

    //insight platform + oneprice
    if (acrId == 9 && (oneItemLinceFlow || isFulfilAtScale)) {
        var combinedLineHashes = collectLineHashes(activationKey, recOrder);
        newRecord.setFieldValue('custrecordr7inpcreatedfromlinehash', combinedLineHashes);
        if(isFulfilAtScale){
            newRecord.setFieldValue('custrecord_inp_req_fulfil_at_scale', 'T');
        }
    }
    
    // package license set (only for NXL or INP):
    if (acrId == 9 || acrId == 1) {
        newRecord.setFieldValue(acrProductTypeFields['packageLicense'], fields['packageLicense']);
    }

    //metasploit + oneprice
    if (acrId == 2 && (oneItemLinceFlow || isFulfilAtScale)) {
        var msProdToken = generateValue('randomString');
        newRecord.setFieldValue('custrecordr7msproducttoken', msProdToken);
        var combinedLineHashes = collectLineHashes(activationKey, recOrder);
        newRecord.setFieldValue('custrecordr7inpcreatedfromlinehash', combinedLineHashes);
        if(isFulfilAtScale){
            newRecord.setFieldValue('custrecord_ms_req_fulfil_at_scale', 'T');
        }
    }

    newRecord.setFieldValue(acrProductTypeFields['expiration'], fields['expirationDate']);
    newRecord.setFieldValue(acrProductTypeFields['customer'], fields['customer']);
    newRecord.setFieldValue(acrProductTypeFields['salesorder'], fields['salesorder']);
    newRecord.setFieldValue(acrProductTypeFields['contact'], fields['contact']);
    newRecord.setFieldValue(acrProductTypeFields['fmrcreatedid'], 'T');
    //if (acrProductTypeFields['createdFromLineHash']) {
    //    newRecord.setFieldValue(acrProductTypeFields['createdFromLineHash'], fields['lineHash']);
    //}

    if(isFulfilAsPackage){
        newRecord.setFieldValue(acrProductTypeFields['fulfilAsPackageIdentifier'], generatePackageIdentifier());
    }

    try {
        var id = nlapiSubmitRecord(newRecord);

        nlapiLogExecution('DEBUG', 'licRecord / id / fields[custitemr7itemactivationemailtemplate]', JSON.stringify({
            licRecord: licRecord,
            id: id,
            custitemr7itemactivationemailtemplate: fields['custitemr7itemactivationemailtemplate']
        }));

        //exclude Nexpose Licenses, they are now processed in Licensing Event UE.js
        nlapiLogExecution('DEBUG', 'createNewACRLicense add license to emails to sent. ACRId is ', acrId);
        if (!oneItemLinceFlow) {
            nlapiLogExecution('DEBUG', 'createNewACRLicense inside add condition, licenseEmailsToSend', JSON.stringify(licenseEmailsToSend));
            licenseEmailsToSend[licenseEmailsToSend.length] = [licRecord, id, fields['custitemr7itemactivationemailtemplate'], fields['acrId']];
            nlapiLogExecution('DEBUG', 'createNewACRLicense inside add condition, licenseEmailsToSend', JSON.stringify(licenseEmailsToSend));
        }

        nlapiLogExecution('DEBUG', 'activationId / expirationFieldId', JSON.stringify({
            activationId: activationId,
            expirationFieldId: expirationFieldId
        }));
        // var fieldsToLookup = ['name', activationId, expirationFieldId, superLicenseFieldId];
        var fieldsToLookup = ['name', activationId, expirationFieldId];
        // do not memoize
        var newLicenseFields = nlapiLookupField(licRecord, id, fieldsToLookup);

        var licName = newLicenseFields['name'];
        var activationKey = newLicenseFields[activationId];
        var expirationDate = newLicenseFields[expirationFieldId];
        // var superLicenseId = newLicenseFields[superLicenseFieldId];

        nlapiLogExecution('DEBUG', 'licName / activationKey / expirationDate', JSON.stringify({
            licName: licName,
            activationKey: activationKey,
            expirationDate: expirationDate,
            // superLicenseId: superLicenseId
        }));

        //creating built-in FMRs
        fields['activationKey'] = activationKey;

        // compareToAvailableAddOns(newRecord, fields, false);
        var restletResponce = callInternalRestlet({
            restletFunction: 'compareToAvailableAddOns',
            method: 'POST',
            licenseRecord: {
                type: licRecord,
                id: id
            },
            parentEndDateOfActivationKey: arrParentEndDates[fields['activationKey']] || null,
            fields: fields,
            isRenewal: false
        })
        nlapiLogExecution('AUDIT', 'callInternalRestlet responce', JSON.stringify(restletResponce));

        var processUpsellAddons = false;
        createAddOnFMR(recOrder, fields, acrItem, processUpsellAddons);

        // return new Array(licName, true, activationKey, nlapiDateToString(new Date()), expirationDate, superLicenseId);
        return new Array(licName, true, activationKey, nlapiDateToString(new Date()), expirationDate);
    }
    catch (e) {
        nlapiLogExecution('ERROR', "Could not submit new " + licRecord + " license record ", e)
        sendErrorEmail(fields, "Could not submit new " + licRecord + " license record " + e);
        return new Array('XXX', false);
    }
}

function generatePackageIdentifier() {
    var newPackageIdentifier = '';
    while (newPackageIdentifier == '' || getPackageLicenseByIdentifier(newPackageIdentifier) !== null) {
        var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
        var randomKey = 'SUPK-';
        for (var i = 0; i < 16; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomKey += chars.substring(rnum, rnum + 1);
            if (i == 3 || i == 7 || i == 11) {
                randomKey += '-';
            }
        }
        newPackageIdentifier = randomKey;
    }
    return newPackageIdentifier;
}

function getPackageLicenseByIdentifier(packageIdentifier) {
    if (packageIdentifier != null && packageIdentifier != '') {
        var packageInternalId = null;
        packageIdentifier = packageIdentifier.split(',')[0];
        var arrSearchfilters = new Array(new nlobjSearchFilter('custrecord_r7_pl_package_id', null, 'is', packageIdentifier+''));
        var arrSearchcolumns = new Array(new nlobjSearchColumn('internalid'));
        var pkgSearchResults = nlapiSearchRecord('customrecord_r7_pck_license', null, arrSearchfilters, arrSearchcolumns);
        for (var i = 0; pkgSearchResults && i < pkgSearchResults.length; i++) {
            packageInternalId = result[i].getValue(arrSearchcolumns[0]);
            // expecting single result
            return false;
        }
        return packageInternalId;
    } else {
        return null
    }
}

function callInternalRestlet(options) {
    try {
        // var startTime = new Date();        
        var urlStr = nlapiResolveURL('RESTLET', 'customscript_r7_internal_restlet', 'customdeploy_r7_internal_restlet', 'external');
        // https://663271-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2263&deploy=1&compid=663271_SB1

        var headers = {
            'Content-Type': 'application/json',
            'Authorization': getOAuthHeader({url: urlStr, method: options.method})
        };
        var json = JSON.stringify(options);
        var restletResponse = nlapiRequestURL(urlStr, json, headers, null, options.method);

        // var endTime = new Date();
        // nlapiLogExecution('AUDIT', "restletResponse came in " + (endTime - startTime) + " milliseconds \n" + "restletResponse code & status",restletResponse.code + ' - ' + JSON.parse(restletResponse.body).status);
        var responseBody = JSON.parse(restletResponse.body)
        return {
            code: restletResponse.code,
            status: responseBody.status,
            body: responseBody
        }
    } catch (restletError) {
        nlapiLogExecution('ERROR', "Failed to call internal restlet to perform function " + options.restletFunction, restletError);
    }
}

// posibly move to restlet because of high governance points usage (creating many FMRs)
function compareToAvailableAddOns(newRecord, fields, isRenewal) {

    var now = new Date();

    var arrSearchFilters = new Array();
    arrSearchFilters[0] = ['custrecordr7acladdon_fieldid', null, 'isnot', 'id'];
    arrSearchFilters[1] = ['custrecordr7acladdon_value', null, 'noneof', [7, 8]];

    var arrSearchColumns = new Array();
    arrSearchColumns[0] = 'custrecordr7acladdon_fieldid';
    arrSearchColumns[1] = 'custrecordr7acladdon_fieldtype';
    arrSearchColumns[2] = 'custrecordr7acladdon_value';
    arrSearchColumns[3] = 'custrecordr7acladdon_specificvalue';

    // objected memoize
    var arrSearchResults = memoizedSearchRecord('customrecordr7acladdoncomponents', null, arrSearchFilters, arrSearchColumns);

    var allFields = newRecord.getAllFields();

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
        var createAddOn = false;
        var searchResult = arrSearchResults[i];
        var addOnId = searchResult.getId();
        var fieldId = searchResult.getValue(arrSearchColumns[0]);
        var fieldType = searchResult.getValue(arrSearchColumns[1]);
        var valueId = searchResult.getValue(arrSearchColumns[2]);
        var specificValue = searchResult.getValue(arrSearchColumns[3]);

        if (allFields.indexOf(fieldId) != -1) {
            var fieldValue = newRecord.getFieldValue(fieldId);

            if (fieldType == 'date' || fieldType == 'integer') {

                if ((specificValue == '' || specificValue == null) && (fieldValue != null && fieldValue != '')) {

                    createAddOn = true;

                    if (['custrecordr7inplicenselicensedassets', 'custrecordr7nxlicensenumberips', 'custrecordr7managedservicesips'].indexOf(fieldId) != -1 && (fieldValue == '1' || fieldValue == '0')) {
                        createAddOn = false;
                    }

                    if (isRenewal && arrProductTypesByRecId[newRecord.getRecordType()]['expiration'] == fieldId) {
                        createAddOn = false;
                    }
                }
            }
            else
                if ((specificValue != '' || specificValue != null) && fieldValue == specificValue && fieldValue != 'F') {
                    createAddOn = true;
                }
                else
                    if ((specificValue == '' || specificValue == null) && fieldType == 'select') {
                        createAddOn = true;
                    }
        }

        if (createAddOn) {
            allFields[allFields.indexOf(fieldId)] = '';

            var fmrStart = fields['startDate'];

            if (fieldType == 'date') { // if add on is a date, it should take effect immediatly
                fmrStart = nlapiDateToString(now);
            }
            else // if add on is NOT a date, end date should be current max end date
                if (arrParentEndDates[fields['activationKey']] != '' && arrParentEndDates[fields['activationKey']] != null && arrParentEndDates[fields['activationKey']] != 'undefined') {
                    endDate = arrParentEndDates[fields['activationKey']];
                }

            var now = new Date();
            if (nlapiStringToDate(fmrStart) >= nlapiAddDays(now, 1)) {
                var status = 1;
            }
            else {
                var status = 3;
            }

            var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
            newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
            newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
            newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', fields['salesorder']);
            newFMRRecord.setFieldValue('custrecordr7licfmstartdate', fmrStart);
            newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['expirationDate']);
            newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
            newFMRRecord.setFieldValue('custrecordr7licfmstatus', status);
            newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
            newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);

            try {
                var id = nlapiSubmitRecord(newFMRRecord);
            }
            catch (e) {
                var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
                nlapiSendEmail(adminUser, adminUser, 'Could not create built-in FMR - ACR', 'AddOnId: ' + addOnId + '\nSalesOrder: ' + fields['salesorder'] + '\n\nError: ' + e);
            }
        }
    }
}

function collectLineHashes(activationKey, recOrder) {
    var combinedLineHashes = '';
    for (var lh = 1; lh <= recOrder.getLineItemCount('item'); lh++) {
        if (activationKey == recOrder.getLineItemValue('item', 'CUSTCOLR7ITEMMSPRODUCTKEY', lh)) {
            combinedLineHashes += recOrder.getLineItemValue('item', 'custcolr7_linehash', lh) + ',';
        }
    }
    combinedLineHashes = combinedLineHashes.substring(0, combinedLineHashes.length - 1);
    return combinedLineHashes;
}

function createRenewalFMR(fields, recOrder) {
    var acrId = fields['acrId'];
    var licRecord = arrProductTypes[acrId]['recordid'];
    var component = arrProductTypes[acrId]['componentid'];
    var licType = arrProductTypes[acrId]['recordid'];
    var licenseHashField = arrProductTypes[acrId]['createdFromLineHash'];
    var syncUpWithIpimsField = arrProductTypes[acrId]['syncUpWithIpims'];
    var recLicTemplate = nlapiCopyRecord(licRecord, fields['licenseTemplate']);

    // compareToAvailableAddOns(recLicTemplate, fields, true);
    var restletResponce = callInternalRestlet({
        restletFunction: 'compareToAvailableAddOns',
        method: 'POST',
        licenseRecord: {
            type: licRecord,
            id: fields['licenseTemplate']
        },
        parentEndDateOfActivationKey: arrParentEndDates[fields['activationKey']] || null,
        fields: fields,
        isRenewal: true
    })
    nlapiLogExecution('AUDIT', 'callInternalRestlet responce', JSON.stringify(restletResponce));
    
    var arrLicenseInfo = findLicenseInfo(fields['activationKey'], acrId);
    var licenseId = arrLicenseInfo[1];
    var licenseName = arrLicenseInfo[2];

    nlapiLogExecution('DEBUG', 'createRenewalFMR debug obj', JSON.stringify({
        // arrProductTypes: arrProductTypes,
        licenseHashField: licenseHashField,
        activationKey: fields['activationKey'],
        licenseName: licenseName,
        fieldsLineHash: fields['lineHash'],
        syncUpWithIpimsField: syncUpWithIpimsField,
        licenseId: licenseId,
        licRecord: licRecord,
        fieldsLicTemplate: fields['licenseTemplate'],
        fieldsOneFlow: fields['lineOneItemFlow'],
        acrId: acrId
    }));

    //nexpose or insight platform or metasploit + oneprice
    if ((acrId == 1 || acrId == 9 || acrId == 2) && fields['lineHash'] && licenseHashField && fields['lineOneItemFlow']) {
        var licRec = nlapiLoadRecord(licType, licenseId);
        var currentLicRecHash = licRec.getFieldValue(licenseHashField);
        var combinedLineHashes = collectLineHashes(fields['activationKey'], recOrder);
        nlapiLogExecution('DEBUG', 'combinedLineHashes', JSON.stringify({
            combinedLineHashes: combinedLineHashes,
        }));
        if (currentLicRecHash != combinedLineHashes) {
            licRec.setFieldValue(licenseHashField, combinedLineHashes);
            licRec.setFieldValue(syncUpWithIpimsField, 1);
            nlapiSubmitRecord(licRec);
        }
    }

    var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
    newFMRRecord.setFieldValue('custrecordr7licfmfeature', component);
    newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
    newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['expirationDate']);
    newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', fields['salesorder']);
    newFMRRecord.setFieldValue('custrecordr7licfmvalue', fields['expirationDate']);
    newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
    newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
    newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
    newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);
    var id = nlapiSubmitRecord(newFMRRecord);

    nlapiLogExecution('DEBUG', 'FMR ID', id);
    if (id != null && id != '') {
        return new Array(licenseName, true, fields['activationKey']);
    }
    else {
        return new Array('XXX', false);
    }
}


function createAddOnFMR(recOrder, fields, lineItem, processUpsellAddons) {

    var orderId = recOrder.getId();
    var lineId = recOrder.getLineItemValue('item', 'id', fields['lineNum']);
    var acrId = arrItemACRIds[lineId];
    var activationKey = recOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], fields['lineNum']);
    var startDate = recOrder.getLineItemValue('item', 'custcolr7startdate', fields['lineNum']);
    var endDate = recOrder.getLineItemValue('item', 'custcolr7enddate', fields['lineNum']);
    var addOns = getItemAddOns(fields['itemId']);
    var failed = false;
    var arrDates = optimizedGetDatesByACL(recOrder, activationKey, lineItem, processUpsellAddons);

    var arrAddOnDates = optimizedGetDatesByAddOn(recOrder, activationKey, lineItem, processUpsellAddons);

    var isACLOrder = true;
    if (arrDates['aclStartDate'] == null || arrDates['aclStartDate'] == '') {
        isACLOrder = false;
    }

    nlapiLogExecution('DEBUG', 'createAddOnFMR debug obj', JSON.stringify({
        fieldsLineNum: fields['lineNum'],
        arrDatesAclStartDate: arrDates['aclStartDate'],
        isACLOrder: isACLOrder
    }));

    for (var i = 0; addOns != null && i < addOns.length && unitsLeft(200) && timeLeft(); i++) {

        var addOnId = addOns[i];
        var fieldsToLookup = ['custrecordr7acladdon_fieldid', 'custrecordr7acladdon_value', 'custrecordr7acladdon_specificvalue', 'custrecordr7acladdon_fieldtype', 'custrecordr7acladdonmultiplier', 'custrecordr7acladdon_defaultvalue'];
        var addOnFields = memoizedLookupField('customrecordr7acladdoncomponents', addOnId, fieldsToLookup);
        fields['licFieldId'] = addOnFields.custrecordr7acladdon_fieldid;
        fields['licFieldType'] = addOnFields.custrecordr7acladdon_fieldtype;
        fields['licValueId'] = addOnFields.custrecordr7acladdon_value;
        fields['licSpecificValue'] = addOnFields.custrecordr7acladdon_specificvalue;
        fields['licMultiplierValue'] = addOnFields.custrecordr7acladdonmultiplier;
        fields['licDefaultValue'] = addOnFields.custrecordr7acladdon_defaultvalue;
        fields['licRecordId'] = memoizedLookupField('customrecordr7acladdoncomponents', addOnId, 'custrecordr7aclrecord_internalid', 'text');

        if (fields['licFieldType'] == 'date') { // if add on is a date, it should take effect immediatly
            startDate = nlapiDateToString(new Date());
        }
        else
            if (!isACLOrder) {
                endDate = arrAddOnDates['addOnMaxEndDate'];
            }
            else //end date for nondate features should be the current end date for product
                if (arrParentEndDates[activationKey] != '' && arrParentEndDates[activationKey] != null && arrParentEndDates[activationKey] != 'undefined') {
                    endDate = arrParentEndDates[activationKey];
                }


        var licenseInfo = findLicenseInfo(fields['activationKey'], null, fields['itemId']);     //fields['licRecordId']);

        fields['licenseId'] = licenseInfo[1];
        fields['licenseName'] = licenseInfo[2];


        if (fields['licFieldType'] == 'date' && fields['licValueId'] == 4 && !isACLOrder) {

            // do nothing, it is only an addOn purchase
        }
        else {
            var result = calculateAddOnValue(recOrder, fields);
            nlapiLogExecution('DEBUG', 'FMR result', result);

            if (result != 'noChange') {

                var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
                newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
                newFMRRecord.setFieldValue('custrecordr7licfmvalue', result);
                newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', orderId);
                newFMRRecord.setFieldValue('custrecordr7licfmstartdate', startDate);
                newFMRRecord.setFieldValue('custrecordr7licfmenddate', endDate);
                newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
                newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
                newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
                newFMRRecord.setFieldValue('custrecordr7licfmitemlineid', fields['lineId']);
                var id = nlapiSubmitRecord(newFMRRecord);
                if (id == null || id == '') {
                    failed = true;
                }
            }
        }
    }

    if (!failed) {
        return new Array(fields['licenseName'], true, fields['activationKey'], fields['licenseId']);
    }
    else {
        return new Array('XXX', false);
    }

}

function calculateAddOnValue(recOrder, fields) {

    var result;

    switch (fields['licValueId']) {
        case '1':
            result = 'T';
            break;
        case '2':
            result = 'F';
            break;
        case '3':
            result = recOrder.getLineItemValue('item', 'quantity', fields['lineNum']);
            break;
        case '4':
            result = recOrder.getLineItemValue('item', 'custcolr7enddate', fields['lineNum']);
            break;
        case '5':
            result = fields['licSpecificValue'];
            break;
        case '6':
            result = fields['licSpecificValue'];//array
            break;
        case '7':
            result = 'noChange';
            break;
        case '8':
            result = 'noChange';
            break;
        case '9':
            result = recOrder.getLineItemValue('item', 'custcolr7enddate', fields['lineNum']);
            break;
        case '10':
            result = recOrder.getLineItemValue('item', 'custcolr7_monthlydatalimit_gb', fields['lineNum']);
            break;
        // 6/2017 - TS - Added to support dynamic add-on values based on Item Quantity
        case '12':
            result = recOrder.getLineItemValue('item', 'quantity', fields['lineNum']) * fields['licMultiplierValue'];
            result = result.toFixed(0);
            break;
            // https://issues.corp.rapid7.com/browse/APPS-11647 add Data Retention Length and Data Center Location values and cases
            // 13 Data Retention Length
        case '13':
            result = recOrder.getLineItemValue('item', 'custcolr7dataretentionlengthdays', fields['lineNum']);
            break;
            // 14 Data Center Location
        case '14':
            result = recOrder.getLineItemValue('item', 'custcolr7datacenterlocation', fields['lineNum']);
            break;
        default:
            result = 'noChange';
    }

    if (result == null || result == '') {
        if(fields['licDefaultValue']) {
            result = fields['licDefaultValue'];
        } else {
            result = 'noChange';
        }
    }

    return result;

}

//TODO how to handle renewals, HOSD is not true on these
function createDedicatedHostedRecord(recOrder) {
    var orderId = recOrder.getId();
    var customerId = recOrder.getFieldValue('entity');
    /*Create New Dedicated Record
     *
     * Set Customer and Sales Order
     * Comment - timestamp and tranId
     */
    var recDedicated = nlapiCreateRecord('customrecordr7dedicatedhe');
    recDedicated.setFieldValue('custrecordr7dedicatedhecustomer', customerId);
    recDedicated.setFieldValue('custrecordr7dedicatedhesalesorder', orderId);
    var orderName = memoizedLookupField('salesorder', orderId, 'tranid');
    var today = new Date();
    var comments = nlapiDateToString(today) + ': Dedicate Hosted Created per ' + orderName + '.';
    recDedicated.setFieldValue('custrecordr7dedicatedhecomments', comments);
    var id = nlapiSubmitRecord(recDedicated, true, true);
    return id;
}

/**
 * APPS-17665 cmcaneney
 * @param {integer} itemId
 */
function checkIfLineItemIsService(itemId) {
    //get Item Fields : Item Name & Requires Event Registration
    var fields = ["itemid", "custitemr7itemrequireeventregistration"];
    var itemFields = nlapiLookupField('item', itemId, fields);
    var itemName = itemFields.itemid;
    var isService = false;

    nlapiLogExecution(
        "AUDIT",
        "Checking for Service/Training SKU",
        itemName + ":" + itemId
    );
    if (itemName.substring(0, 2) === "PS") {
        nlapiLogExecution("AUDIT", "Item is a PS SKU", itemName + ":" + itemId);
        var isOESku = itemFields.custitemr7itemrequireeventregistration;
        if (isOESku == "T") {
            nlapiLogExecution(
                "AUDIT",
                "Item Is Open Enrollment",
                itemName + ":" + itemId
            );
            isService = false;
        } else {
            nlapiLogExecution(
                "AUDIT",
                "Item Is Service/Training",
                itemName + ":" + itemId
            );
            isService = true;
        }
    }
    nlapiLogExecution(
        "AUDIT",
        "end checkIfLineItemIsService",
        "returning isService: " + isService
    );

    return isService;
}

// https://issues.corp.rapid7.com/browse/APPS-16781 Preventing Sales Orders from Provisioning 'Extra' IVM licenses
function recordsDeepCompare(recObjOld, recObjNew) {
    var diffObj = Array.isArray(recObjNew) ? [] : {}
    Object.getOwnPropertyNames(recObjNew).forEach(function(prop) {
        if (typeof recObjNew[prop] === 'object') {
            diffObj[prop] = recordsDeepCompare(recObjOld[prop], recObjNew[prop])
            if (Array.isArray(diffObj[prop]) && Object.getOwnPropertyNames(diffObj[prop]).length === 1 || Object.getOwnPropertyNames(diffObj[prop]).length === 0) {
                delete diffObj[prop]
            }
        } else if (!recObjOld || recObjOld[prop] !== recObjNew[prop]) {
            diffObj[prop] = recObjNew[prop]
        }
    });
    return diffObj
}

function setUnsavedDifferences(recordId, diffObj) {
    var recOrder = nlapiLoadRecord('salesorder', recordId);
    var props = Object.getOwnPropertyNames(diffObj);
    props.forEach(function(prop) {
        nlapiLogExecution('DEBUG', 'setting unsaved properties: ', JSON.stringify(prop))
        if (typeof diffObj[prop] === 'object') {
            if (prop === 'item') { // array of items
                diffObj[prop].forEach(function (itemProps, index) {
                    nlapiLogExecution('DEBUG', 'setting unsaved Item properties: ', JSON.stringify(itemProps))
                    Object.getOwnPropertyNames(itemProps).forEach(function (itemProp) {
                        if (itemProp === 'options') {
                            // exclusive for 'options' property aka itemOptionId which is individual for each license type
                            Object.getOwnPropertyNames(itemProps['options']).forEach(function(itemOptionId) {
                                recOrder.setLineItemValue('item', itemOptionId, index + 1, itemProps['options'][itemOptionId])
                            })
                        } else if (typeof itemProps[itemProp] === 'object') {
                            recOrder.setLineItemValue('item', itemProp, index + 1, itemProps[itemProp]['internalid'])
                        } else {
                            recOrder.setLineItemValue('item', itemProp, index + 1, itemProps[itemProp])
                        }
                    })
                })
            } else if (!Array.isArray(diffObj[prop])) {
                recOrder.setFieldValue(prop, diffObj[prop]['internalid']) 
            }
        } else if (typeof diffObj[prop] === 'boolean') {
            recOrder.setFieldValue(prop, diffObj[prop] ? 'T' : 'F')
        } else {
            recOrder.setFieldValue(prop, diffObj[prop])
        }
    })
    nlapiSubmitRecord(recOrder, true, true);
}

function getTemplateVersion(emailTemplateId) {
    return nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');
}

function isEmpty(value) {
    if (value === '' || value === ' ' || value === null) {
        return true;
    } else {
        return false;
    }
}

function generateValue(type) {
    if (type == 'productKey') {
        return (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4) + '-' 
            + (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4) + '-' 
            + (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4) + '-' 
            + (Math.random() * 0xfffff * 1000000).toString(16).toUpperCase().slice(0, 4);
    }
    if (type == 'randomNumber') {
        return Math.floor(Math.random() * 100000000000000000).toString(); //The maximum is exclusive and the minimum is inclusive
    }
    if(type == 'randomString') {
        var length = 16;
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var result = '';
        for (var i = length; i > 0; --i){
            result += chars[Math.floor(Math.random() * chars.length)];
        } 
        return result;
    }
}

function updateLicenseContact(fields){
    var acrId = fields['acrId'];
    var licType = arrProductTypes[acrId]['recordid'];
    var licContactFld = arrProductTypes[acrId]['contact'];

    var arrLicenseInfo = findLicenseInfo(fields['activationKey'], acrId);
    var licenseId = arrLicenseInfo[1];

    var licRec = nlapiLoadRecord(licType, licenseId);

    var newContact = fields['contact'];
    licRec.setFieldValue(licContactFld, newContact);
    nlapiSubmitRecord(licRec, false, true);
}

function updatePackageLicense(fields){
    var acrId = fields['acrId'];
    var acrProductTypeFields = arrProductTypes[acrId];
    var activationId = acrProductTypeFields['activationid'];
    var packageLicenseFieldId = acrProductTypeFields['packageLicense'];
    var licenseType = acrProductTypeFields['recordid'];
    var licenseHashField = acrProductTypeFields['createdFromLineHash'];
    var activationKey = fields['activationKey'];
    var orderPackageLicense = fields['packageLicense'];

    var arrLicenseInfo = findLicenseInfo(activationKey, acrId);
    var licenseId = arrLicenseInfo[1];

    //nexpose or insight platform or metasploit + oneprice
    if (acrId == 1 || acrId == 9 || acrId == 2){
        var licenseRecord = nlapiLoadRecord(licenseType, licenseId);
        var currentPackageLicense = licenseRecord.getFieldValue(packageLicenseFieldId);
        if(currentPackageLicense !== orderPackageLicense){
            licenseRecord.setFieldValue(packageLicenseFieldId, orderPackageLicense);
            nlapiSubmitRecord(licenseRecord, true, true);
        }
    }
}

function getOrderUpdatesObject(recOrder) {
    var orderUpdates = {
        id: recOrder.getId(),
        lines: {},
    }

    var lineCount = recOrder.getLineItemCount('item');

    // Create empty object for each line on the order so we don't have to check before every update
    for (var i = 1; i <= lineCount; i++) {
        orderUpdates.lines[i] = {};
    }

    return orderUpdates;
}