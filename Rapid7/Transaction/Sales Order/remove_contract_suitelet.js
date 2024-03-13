/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Mar 2020     User
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet(request, response) {
  var orderId = request.getParameter('custparam_salesorder');
  var listContract = nlapiLookupField('salesorder', orderId, 'custbodyr7contractautomationrecs');
  if(listContract){
    var newString = listContract.replace(/[^0-9]/, ',');
    var arrContracts = newString.split(',');

    if(arrContracts.length) {
      for (var g = 0; g < arrContracts.length; g++) {
        nlapiSubmitField('customrecordr7contractautomation', arrContracts[g], 'isinactive', 'T');
      }
    }

    nlapiSubmitField('salesorder', orderId, 'custbodyr7contractautomationrecs', '');
  }

}
