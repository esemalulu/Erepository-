
function tmg_opportunity_pageInit(type)
{
  if (type.toLowerCase() == 'edit') {
    try {
      //var customform_id = nlapiGetFieldValue('customform');
      var customform_name = nlapiGetFieldText('customform');
      nlapiSetFieldValue('custbody_opportunity_type', customform_name, false);
    } catch (err) {
      // Do nothing
    }
  }
}
