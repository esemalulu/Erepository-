/**
 * Invoice User Event Script
 *
 * @require  sweet_opportunity_lib.js
 */

/**
 * BeforeLoad hook
 *
 * @param {String} type
 * @param {Object} form
 * @return {Void}
 */
function userevent_beforeLoad(type, form)  {
//uncomment below code to reset 'Opportunity' field value
//    var fld = form.getField('opportunity');
//    fld.setDisplayType('normal');

//uncomment below code to reset 'Created From' field value
//    var fld = form.getField('createdfrom');
//    fld.setDisplayType('normal');
}

/**
 * BeforeSubmit hook
 *
 * @param {String} type
 * @param {Object} form
 * @return {Void}
 */
function userevent_beforeSubmit(type, form) {
  // Enter code here...
}

/**
 * AfterSubmit hook
 *
 * @param {String} type
 * @return {Void}
 */
function userevent_afterSubmit(type) {
  /**
	* 3/6/2015 JS@Aux
	* Removed Reference NO Longer Necessary.
	* 
  */
  //type = type.toLowerCase();
  //SWEET.Opportunity.updateStatus(nlapiGetFieldValue('opportunity'));
}
