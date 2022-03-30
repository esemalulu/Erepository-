/**
 * Credit Note User Event Script
 *
 */

/**
 * BeforeLoad hook
 *
 * @param {String} type
 * @param {Object} form
 * @return {Void}
 */
function userevent_beforeLoad(type, form)  {
nlapiLogExecution('DEBUG', 'Event', 'beforeLoad');
var field = nlapiGetField('department');
field.setMandatory(false);
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
    // Enter code here...
}
