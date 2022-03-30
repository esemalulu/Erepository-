var SWEET_COUNTRY_UNITED_STATES = '229';

/**
 * SaveRecord hook
 *
 * @return bool
 */
function localform_saveRecord()
{
  if (nlapiGetFieldValue('custrecord_ad_country') == SWEET_COUNTRY_UNITED_STATES) {
    var state = nlapiGetFieldValue('custrecord_ad_state');
    if (state == undefined || (String(state).length < 1)) {
      alert('State is a mandatory field when country is United States');
      return false;
    }
  }

  return true;
}
