/**
 * Remittance library
 *
 */

var SWEET = SWEET || {};
SWEET.Remittance = SWEET.Remittance || {};

var SWEET_DEFAULT_REMITTANCE_TEMPLATE = '1';

/**
 * Set remittance fields
 *
 * @param {String} subsidaryId
 * @param {String} currencyId
 * @return {nlapiRecord or null}
 */
SWEET.Remittance.findBySubsidiaryAndCurrency = function(subsidiaryId, currencyId) {
  var filters = new Array();
  filters.push(new nlobjSearchFilter('custrecord_remit_subsidiary', null, 'is', subsidiaryId));
  filters.push(new nlobjSearchFilter('custrecord_remit_currency2', null, 'is', currencyId));
  var searchResults = nlapiSearchRecord('customrecord_remittance', null, filters);
  return (searchResults ? nlapiLoadRecord('customrecord_remittance', searchResults[0].getId()) : null);
}
