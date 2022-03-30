/**
 * Quote User Event Script
 *
 * @require  sweet_quote_lib.js
 */

var SWEET_CLIENT_STATUS_CLOSED_LOST = '14';


/**
 * AfterSubmit hook
 *
 * @param {String} type
 * @return {Void}
 */
function userevent_afterSubmit(type) {
     // Schedule script to calculate opportunity totals
   var params = new Array();
   params['custscript_opportunity'] = nlapiGetFieldValue('opportunity');
   nlapiScheduleScript('customscript_opportunity_calc_Totals', null, params);
}

/******************************** Depreated Code ******************************/
/**
 * BeforeLoad hook
 *
 * @param {String} type
 * @param {Object} form
 * @return {Void}
 */
function userevent_beforeLoad(type, form)  {
  
   // Are we in UI mode?
  var currentContext = nlapiGetContext();
  if (currentContext.getExecutionContext() != 'userinterface') {
    return; // Nope, do nothing.
  }

//uncomment below code to reset Opportunity field value
//  var fld = form.getField('opportunity');
//    fld.setDisplayType('normal');

  /**
   *TODO:  Should REmove customscript_quote_provisional_suitelet Suitelet as well
  type = type.toLowerCase();
  
  if (type == 'view') {

    // Create 'Provosional' link
    var linkURL = nlapiResolveURL('SUITELET', 'customscript_quote_provisional_suitelet', 'customdeploy_quote_provisional_suitelet', null) + '&quote=' + nlapiGetRecordId();
    var onClick = "window.location.href='" + linkURL + "';";
    
    // Add custom button
    form.addButton('custpage_quote_provisional', 'Create Provisional Bookings', onClick);
  }
  */
}

/**
 * BeforeSubmit hook
 *
 * @param {String} type
 * @param {Object} form
 * @return {Void}
 */
function userevent_beforeSubmit(type, form) {
	//3/6/2015 - custbody_opp_winlossreason IS NO LONGER AVAILABLE
	/**
  // If status is NOT Lost, reset Win/Loss reason field
  var entityStatus = nlapiGetFieldValue('entitystatus');
  if (entityStatus != SWEET_CLIENT_STATUS_CLOSED_LOST) {
    nlapiSetFieldValue('custbody_opp_winlossreason', null); // Reset field
  }
  	*/
}