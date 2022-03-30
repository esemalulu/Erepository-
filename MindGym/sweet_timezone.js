/**
 * Get time zones by country
 *
 * @param {Mixed} countryId (String or Array)
 * @param {String} selectedId (optional)
 * @param {Boolean} alwaysIncludeSelected even if it doesn't match country
 * @param {Array}
 */
function getTimeZonesByCountryId(countryId, selectedId, alwaysIncludeSelected) {

  if (typeof(countryId) == 'string') {
    var operator = 'is';
  } else {
    var operator = 'anyof'; // Assume it's an array
  }
  
  var filters = new Array();
  filters.push(new nlobjSearchFilter('custrecord_tz_country', null, operator, countryId));
  
  var columns = new Array();
  columns.push(new nlobjSearchColumn('name'));
  
  return _getTimeZones(filters, columns, selectedId, alwaysIncludeSelected);
}

/**
 * Get all time zones
 *
 * @param {String} selectedId (optional)
 * @param {Array}
 */
function getAllTimeZones(selectedId) {

  var columns = new Array();
  columns.push(new nlobjSearchColumn('name'));
  
  return _getTimeZones(null, columns, selectedId);
}

/**
 * Time zone helper function
 *
 * @param {Array} filters (optional)
 * @param {Array} columns (optional)
 * @param {String} selectedId (optional)
 * @param {Boolean} alwaysIncludeSelected even if it doesn't match country
 * @return {Void}
 */
function _getTimeZones(filters, columns, selectedId, alwaysIncludeSelected) {

  var timeZones = new Array();
  
  selectedId = selectedId || null; // Default none
  alwaysIncludeSelected = alwaysIncludeSelected || false;
  
  searchResults = nlapiSearchRecord('customrecord_timezone', null, filters, columns);
  
  var foundSelected = selectedId ? false : true;
  if (searchResults) {
    var i = 0, n = searchResults.length;
    for (; i < n; i++) {
      var timeZone = new Object();
      timeZone.id = searchResults[i].getId();
      timeZone.name = searchResults[i].getValue('name');
      timeZone.selected = timeZone.id == selectedId;
      timeZones.push(timeZone);
      foundSelected = timeZone.selected && selectedId ? true : false;
    }
  }
  
  // Does the list include the selected item?
  if (alwaysIncludeSelected && !foundSelected && selectedId) {
  
    // Nope, let's add it.
    var record = nlapiLoadRecord('customrecord_timezone', selectedId);
    var timeZone = new Object();
    timeZone.id = record.getId();
    timeZone.name = record.getFieldValue('name');
    timeZone.selected = true;
    timeZones.push(timeZone);
  }
  
  return timeZones;
}
