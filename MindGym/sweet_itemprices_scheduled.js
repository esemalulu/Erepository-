var WEBSERVICE_URL = 'http://nscurrency-russell.dev.themindgym.com/currency.json';
var WEBSERVICE_USERNAME = 'ladybird';
var WEBSERVICE_PASSWORD = '2ksquare';

// Define the different pricing levels (gbp, usd, euro, aud, sgd)
var PRICINGLEVELS = new Array(
  'price1',   // GBP
  'price2',   // USD
  //'price3', // CAD
  'price4',   // EUR
  'price5',   // AUD
  //'price6', // JPY
  'price7',   // SGD
  'price8',   // INR
  'price9',   // IDR
  'price10',  // THB
  'price11',  // ZAR
  'price12',  // MXN
  'price13',  // ARS
  'price14'   // BRL
);

var EMAIL_BODY = '';

/**
 * Schedule suitelet to update all item prices based on daily exchange rates
 *
 * @param {String} type
 */
function scheduleUpdateItemPrices(type) {
  nlapiLogExecution('DEBUG', 'Start', 'scheduleUpdateItemPrices');
  EMAIL_BODY += "Starting script\n";
  
  // Check if there is an item Id specified
  var itemId = nlapiGetContext().getSetting('SCRIPT', 'custscript_itemid');
  
  if (itemId == null) {
    nlapiLogExecution('DEBUG', 'Getting all items');
    EMAIL_BODY += "Getting all items\n";
    var items = getAllItems();
  } else {
    nlapiLogExecution('DEBUG', 'Getting single item ' + itemId);
    EMAIL_BODY += "Getting single item\n";
    var items = getSingleItem(itemId);
  }
  
  var exchangeRates = getExchangeRates();
  
  if ((items != null) || (exchangeRates != null)) {
    updateItemPrices(items, exchangeRates);
  } else {
    nlapiLogExecution('ERROR', 'No items found to update');
    return false;
  }
  
  // Send notification email
  sendNotificationEmail();
  nlapiLogExecution('DEBUG', 'End', 'scheduleUpdateItemPrices');
  return true;
}

/**
 *  Perform search to get all saleable items
 *
 *  @return {Array}
 */
function getAllItems() {
  var items = new Array();
  
  var filters = new Array();
  filters.push(new nlobjSearchFilter('custitem_bc_enabled', null, 'is', 'T'));
  filters.push(new nlobjSearchFilter('type', null, 'anyof', new Array('Service', 'NonInvtPart')));
  
  var columns = new Array();
  columns.push(new nlobjSearchColumn('internalId'));
  
  var items = nlapiSearchRecord('item', null, filters, columns);
  items = items.sort(compareItems);
  return items;
}

/**
 * Callback function for Javascript Sort(), sort items
 *
 * @todo Obsolete?
 */
function compareItems(itemA, itemB) {
  return (Math.floor(Math.random()*3) - 1);
  
  var varA = itemB.getValue('internalid');
  var varB = itemA.getValue('internalid');
  
  if (varA == varB) {
    return 0;
  }
  
  return (varA < varB ? -1 : 1);
}

/**
 *  Perform search to get a single saleable items
 *
 *  @return {Array}
 */
function getSingleItem(itemId) {
  var items = new Array();
  
  var filters = new Array();
  filters.push(new nlobjSearchFilter('custitem_bc_enabled', null, 'is', 'T'));
  filters.push(new nlobjSearchFilter('type', null, 'anyof', new Array('Service', 'NonInvtPart')));
  filters.push(new nlobjSearchFilter('internalId', null, 'is', itemId));
  
  var columns = new Array();
  columns.push(new nlobjSearchColumn('internalId'));
  
  var items = nlapiSearchRecord('item', null, filters, columns);
  return items;
}

/**
 * Make a call to the nsCurrency webservice to get a currency exchange rate matrix
 *
 * @return {Array}
*/
function getExchangeRates() {
  var exchangeRates = new Object();
  var requestHeaders = new Array();
  //requestHeaders['Authorization'] = basicAuth.createAuthString(WEBSERVICE_USERNAME, WEBSERVICE_PASSWORD);
  
  // Make a get request to the nsCurrency webservice
  nsCurrencyResponse = nlapiRequestURL(WEBSERVICE_URL, null, requestHeaders);
  
  // Deal with the response code
  switch(parseInt(nsCurrencyResponse.getCode())) {
    case 200:
      nlapiLogExecution('DEBUG', 'Got exchange rates');
      break;
    default:
      nlapiLogExecution('DEBUG', 'Error getting exchange rates', nsCurrencyResponse.getBody());
      return null;
      break;
  }
  
  var response = nsCurrencyResponse.getBody(); // JSON
  
  // Convert JSON to object
  try {
    exchangeRates = YAHOO.lang.JSON.parse(response);
  } catch (e) {
    nlapiLogExecution('ERROR', 'Error parsing JSON');
    return null;
  }
  
  EMAIL_BODY += "Got exchange rates successfully\n";
  return exchangeRates;
}

/**
 * Going through all items and update all the price levels
 *
 * @param {Array} items
 * @param {Array} exchangeRates
 * @return {Void}
 */
function updateItemPrices(items, exchangeRates) {
  nlapiLogExecution('DEBUG', 'Items to update', items.length);
  EMAIL_BODY += "Updating item prices\n";
  
  var startDate = new Date();
  var context = nlapiGetContext();
  nlapiLogExecution('DEBUG', 'Starting time', startDate.toLocaleString());
  
  for (var i = 0; i < items.length; i++) {
    updateItemPriceLevels(items[i], exchangeRates);
    
    EMAIL_BODY += "\n";
    nlapiLogExecution('DEBUG', 'Updated item', (i+1) + '/' + items.length);
    EMAIL_BODY += "Updated item " + (i+1) + '/' + items.length + "\n";
    
    var currentDate = new Date();
    nlapiLogExecution('DEBUG', 'Current time', currentDate.toLocaleString());
    nlapiLogExecution('DEBUG', 'Usage remaining', context.getRemainingUsage());
    
    // @todo: Reschedule if usage is running low
  }
  
  return true;
}

/**
 * Update all price levels for an item. Update all prices based on the base price and exchange rates
 *
 * @param {Object} item
 * @param {Array} exchangeRates
 * @return {Boolean}
 */
function updateItemPriceLevels(item, exchangeRates) {
  var itemId = item.getId();
  var itemType = item.getRecordType();
  
  nlapiLogExecution('DEBUG', 'Updating item', itemType + ' ' + itemId);
  EMAIL_BODY += "\nUpdating item " + itemId + "\n";
  
  var itemRecord = nlapiLoadRecord(itemType, itemId);
  
  // Don't update items when the income account is the same as the expense account
  if (itemRecord.getFieldValue('itemtype') == 'Service') {
    if (itemRecord.getFieldValue('incomeaccount') == itemRecord.getFieldValue('expenseaccount')) {
      return false;
    }
  }
  
  // Get base currency
  var baseCurrency = itemRecord.getFieldValue('custitem_bc_currency');
  var basePriceLevelName = 'price' + baseCurrency;
  
  // Make sure we have a base currency
  if (baseCurrency == null) {
    return false;
  }
  
  // Get the base price from which all currency conversions are done
  var basePrice = itemRecord.getLineItemValue('price' + baseCurrency, 'price' + baseCurrency + 'price_1_', 1);
  EMAIL_BODY += "Base currency/price " + baseCurrency + '/' + basePrice + "\n";
  
  // For each price list
  for (pricing in PRICINGLEVELS) {
    var priceLevelName = PRICINGLEVELS[pricing];
    var currency = itemRecord.getLineItemValue(priceLevelName, priceLevelName + 'currency', 1);
    var exchangeRate = exchangeRates[currency][baseCurrency]; 
    var levelsCount = itemRecord.getLineItemCount(priceLevelName); // Number of price levels
    
    if (levelsCount > 0) {
      for (var j = 1; j <= levelsCount; j++) {
        var newPrice  = 0;
        
        // Example: discount -10%
        var discount = itemRecord.getLineItemValue(priceLevelName, priceLevelName + 'discount', j);
        
        // Optional
        var price = itemRecord.getLineItemValue(priceLevelName, priceLevelName + 'price_1_', j);
        var name = itemRecord.getLineItemValue(priceLevelName, priceLevelName + 'name', j);
        
        if (discount != null) {
          discount = (parseInt(discount) / 100); // Convert to 0.10
          discount = (1 + discount); // Convert discount into a percentage
          newPrice = ((basePrice * discount) * exchangeRate).toFixed(2); // Calculate the new price
        } else {
          
          // We have a fixed price, do not calculate based on base currency base price
          if (currency != baseCurrency) {
            var tempBasePrice = 0;
            
            // Get the base price for the fixed price from the base currency
            tempBasePrice = itemRecord.getLineItemValue(basePriceLevelName, basePriceLevelName + 'price_1_', j);
            
            // Calculate the new price
            newPrice = (tempBasePrice * exchangeRate).toFixed(2);
          }
        }
        
        // Update the price level line value
        if (newPrice != 0) {
          EMAIL_BODY += 'Updating ' + name + ', currency ' + currency + ', new price ' + newPrice + "\n";
          itemRecord.setLineItemValue(priceLevelName, priceLevelName + 'price_1_', j, newPrice);
        }
      }
    }
  }
  
  // Save item record
  nlapiSubmitRecord(itemRecord, false);
  return true;
}

/**
 * Send email notification
 *
 * @return {Void}
 */
function sendNotificationEmail() {
  nlapiSendEmail(16799, 'andre.borgstrom@themindgym.com', 'Item price update notification', EMAIL_BODY);
}
