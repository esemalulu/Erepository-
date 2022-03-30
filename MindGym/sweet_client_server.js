/**
 * Before load event
 *
 * @param {String} type
 * @param {Object} form
 * @return {Void}
 */
function userevent_beforeLoad(type, form) {

  // Are we in UI mode?
  var currentContext = nlapiGetContext();
  if (currentContext.getExecutionContext() != 'userinterface') {
    return; // Nope, do nothing.
  }
  
  type = type.toLowerCase();
  
  if (type == 'edit' || type == 'view')) {
  
    // Create 'New Account Form' link
    var linkField = form.addField('custpage_cli_newaccformlink','inlinehtml', null, null, null);
    
    // Define the parameters of the Suitelet that will be executed.
    var linkURL = nlapiResolveURL('SUITELET', 49, 1, null) + '&clientid=' + nlapiGetRecordId();
    
    // Create a link to launch the Suitelet.
    linkField.setDefaultValue('Click <a href="' + linkURL +'">here</a> to send the form.');
  }  
}
