/**
 * Event occurs when the page completes loading or when the form is reset
 */
function form_pageInit(type)
{
  switch (type.toLowerCase()) {
    case 'create':
    case 'edit':
      var entity = nlapiGetFieldValue('entity');
      if (entity) {
        hasClientAgreedToTerms();
      }
      break
  }
}

/**
 * Event occurs when the submit button is pressed but prior to the form being
 * submitted. Return value of false suppresses submission of the form.
 *
 * @return bool
 */
function form_saveRecord()
{
  var valid = true;
  valid = hasClientAgreedToTerms();
	return valid;
}

/**
 * Event occurs upon completion of an asynchronous sourcing request following
 * a field change. Enables fieldChange style functionality to occur once all
 * dependent field values have been set.
 */
function form_postSourcing(type, name)
{
  if (name == 'entity') { // Client field has changed
    hasClientAgreedToTerms();
  }
}

/**
 * Check if client has agreed to terms and conditions
 *
 * @param {Boolean} displayWarning (default: true)
 * @return bool
 */
function hasClientAgreedToTerms(displayWarning)
{
  if (displayWarning == null) {
    displayWarning = true; // Set default value
  }
  
  var termsAgreed = (nlapiGetFieldValue('custbody_cli_termsaccepted') == 'T');

  if (!termsAgreed && displayWarning) {
    message = "Client has not agreed to our Terms and Conditions.\n\nYou will not be able to create a Sales Order until they have.";
    alert(message);
	}

  return termsAgreed;
}
