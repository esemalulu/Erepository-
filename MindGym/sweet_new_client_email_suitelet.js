var SWEET_EMAIL_TEMPLATE_NEW_ACCOUNT_FORM = '2';
//Tix 3315
if (nlapiGetContext().getEnvironment()=='PRODUCTION')
{
	SWEET_EMAIL_TEMPLATE_NEW_ACCOUNT_FORM = '72';
}
else
{
	SWEET_EMAIL_TEMPLATE_NEW_ACCOUNT_FORM = '59';
}

/**
 * Send New Client Account Form Suitelet
 *
 * @function newClientAccountEmailForm
 * @param {Object} request
 * @param {Object} response
 */
function newClientAccountEmailForm(request, response)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::newClientAccountEmailForm');
  
  try {
  
    // Validate prospect id
    var prospectId = request.getParameter('prospect_id');
    if (!prospectId) {
      throw nlapiCreateError('SWEET_PROSPECT_REQD', 'Prospect or client field is required.', true);
    }
    
    //tix 3315 - Add in reference to manual override
    //This reference indicates it's ONLY requesting Billing Info ONLY
    var manualOverride = request.getParameter('manual');
    var subsidiary = request.getParameter('subsidiary');
    // Has form been submitted?
    if (request.getMethod() == 'POST') {
      
      // Validate Contact Id
      var contactId = request.getParameter('contact_id');
      if (!contactId) {
        throw nlapiCreateError('SWEET_CONTACT_REQD', 'Contact field is required.', true);
      }
      
      // Validate Author Id
      var authorId = request.getParameter('author_id');
      if (!authorId) {
        throw nlapiCreateError('SWEET_AUTHOR_REQD', 'From field is required.', true);
      }
      
      // Validate Receipt Id
      var receiptId = request.getParameter('receipt_id');
      if (!receiptId) {
        throw nlapiCreateError('SWEET_RECEIPTTO_REQD', 'Receipt To field is required.', true);
      }
      
      var bccId = request.getParameter('bcc_id');
      
      // Send email
      sendEmail(prospectId, contactId, authorId, receiptId, bccId, manualOverride, subsidiary, manualOverride);
      
      var form = nlapiCreateForm("Send New Account Form Email", true);
      var msgField = form.addField('terms', 'text');
      msgField.setDefaultValue('Successfully sent the message.');
      msgField.setDisplayType('inline');
      form.addButton('close', 'Close', 'window.close()');
      response.writePage(form);
      return;
    }
    
    // Build form
    var form = nlapiCreateForm("Send New Account Form Email", true);
    
    //tix 3315
    var manualOverrideFld = form.addField('manual','checkbox', null, null);
    manualOverrideFld.setDisplayType('hidden');
    manualOverrideFld.setDefaultValue(manualOverride);
    
    var subsidiaryFld = form.addField('subsidiary', 'text',null,null);
    subsidiaryFld.setDisplayType('hidden');
    subsidiaryFld.setDefaultValue(subsidiary);
    
    var stage = (request.getParameter("stage") == null) ? 'start' : request.getParameter("stage");

    var customerDetails = nlapiLookupField('customer', prospectId, ['custentity_cli_termsdoc', 'internalid']);  
nlapiLogExecution('DEBUG', 'customerDetails ', customerDetails); 
    var termsDoc = customerDetails.custentity_cli_termsdoc
 

/*
    //Script Optimization start
    var prospect = nlapiLoadRecord('prospect', prospectId);
    var termsDoc = prospect.getFieldValue('custentity_cli_termsdoc');
    //Script Optimization end
*/
    if (!termsDoc) {
      throw nlapiCreateError('SWEET_TERMSDOC_REQD', 'T&C document is required. Please update prospect or client record and then try again.', true);
    }    
    var termsFile = nlapiLoadFile(termsDoc);
    
    // Find prospect contacts
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('company', null, 'is', prospectId);
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('firstname');
    columns[1] = new nlobjSearchColumn('lastname');
    var contacts = nlapiSearchRecord('contact', null, filters, columns);
    
    // Get employee email
    var employeeEmail = nlapiLookupField('employee', nlapiGetUser(), 'email');
    
    // Prospect field
    var prospectField = form.addField('prospect_name', 'select', 'Prospect', 'customer');
    prospectField.setDefaultValue(customerDetails.internalid);
/*
    //Script Optimization start
    prospectField.setDefaultValue(prospect.getId());
    //Script Optimization end
*/
    prospectField.setDisplayType('inline');
    prospectField.setLayoutType('normal', 'startcol');

    // Contact field
    var contactField = form.addField('contact_id', 'select', 'Contact');
    contactField.addSelectOption('', 'Choose a contact');
    for (var i = 0; (contacts != null) && (i < contacts.length); i++) {
      contactId = contacts[i].getId();
      contactName = contacts[i].getValue('firstname') + ' ' + contacts[i].getValue('lastname');
      contactField.addSelectOption(contactId, contactName);
    }
    contactField.setMandatory(true);
    
    // T&C Document field
    var termsField = form.addField('terms', 'text', 'T&C Document');
    termsField.setDefaultValue(termsFile.getName());
    termsField.setDisplayType('inline');
    
    // Author field
    var authorField = form.addField('author_id', 'select', 'From', 'employee');
    authorField.setDefaultValue(nlapiGetUser());
    authorField.setMandatory(true);
    
    // Receipt To field
    var replyToField = form.addField('receipt_id', 'select', 'Receipt To', 'employee');
    replyToField.setDefaultValue(nlapiGetUser());
    replyToField.setMandatory(true);
    
    // Bcc
    var bccField = form.addField('bcc_id', 'select', 'Bcc', 'employee');
    
    // Prospect id (hidden) field
    var prospectIdField = form.addField('prospect_id','text');
    prospectIdField.setDefaultValue(prospectId);
    prospectIdField.setDisplayType('hidden');
    
    // Stage (hidden) field
    var stageField = form.addField('stage', 'text');
    stageField.setDefaultValue('process');
    stageField.setDisplayType('hidden');
    
    // Buttons
    form.addSubmitButton('Send');
    form.addButton('cancel', 'Cancel', 'window.close()');
    
    response.writePage(form);
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
    throw e;
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::newClientAccountEmailForm');
}

/**
 * Send email
 *
 * @function sendEmail
 * @param {String} prospectId
 * @param {String} contactId
 * @param {String} authorId
 * @param {String} receiptId
 * @param {String} bccId
 * Added Sep. 22 2015
 * @param {String} manualOverride 
 * 		- manualOverride when T indicates if email being generated is for Billing Info ONLY
 */
function sendEmail(prospectId, contactId, authorId, receiptId, bccId, manualOverride,subsidiary,manualOverride)
{

/*
    //Script Optimization start
    var prospect = nlapiLoadRecord('prospect', prospectId);
    var contact = nlapiLoadRecord('contact', contactId);
    var author = nlapiLoadRecord('employee', authorId);
    //Script Optimization end
*/

  var employeeDetails = nlapiLookupField('employee', authorId, ['firstname', 'lastname']);  

  // Validate contact email
/*
    //Script Optimization start
    var contactEmail = contact.getFieldValue('email');
    //Script Optimization end
*/
    var contactEmail = nlapiLookupField('contact', contactId, 'email');

  if (!contactEmail) {
    throw nlapiCreateError('SWEET_CONTACT_EMAIL_REQD', 'Contact email is required. Please update contact record and then try again.', true);
  }
  
/*
    //Script Optimization start
    // Receipt To
    prospect.setFieldValue('custentity_cli_receipttoemployee', receiptId);
    //Script Optimization end
*/
  
  // Bcc
  var bcc = bccId ? nlapiLookupField('employee', bccId, 'email') : null;
  
/*
    //Script Optimization start
    Save the employee who sent the client the email
    prospect.setFieldValue('custentity_cli_accountformemployee', nlapiGetUser());
    nlapiSubmitRecord(prospect, true);
    //Script Optimization end
*/
  nlapiSubmitField('customer', prospectId, ['custentity_cli_receipttoemployee', 'custentity_cli_accountformemployee'], [receiptId, nlapiGetUser()],true);
  
  //tix 3315 - Depending on Subsidiary, show different file ID
  var fileId = '666520'; //Ltd (UK), MENA or APAC 
  if (subsidiary == '3')
  {
	  fileId = '666521'; //For US
  }
  
  // Set some custom fields for the email template
  var registrationURL = nlapiResolveURL('SUITELET', 48, 1, true) + 
  						'&prospect_id=' + 
  						prospectId + 
  						'&contact_id=' +
  						contactId + 
  						'&manual=' + 
  						manualOverride+
  						'&fileid=' + fileId;
  customFields = new Array();
  customFields['NLCUSTOMLINK'] = registrationURL;
  customFields['NLCUSTOMEMPLOYEENAME'] = employeeDetails.firstname + ' ' + employeeDetails.lastname;
  
  //Ticket 3315 - Convert the template referenced to scriptable template
  //#NLCUSTOMLINK# = NLCUSTOMLINK
  
  var templateMerger = nlapiCreateEmailMerger(SWEET_EMAIL_TEMPLATE_NEW_ACCOUNT_FORM);
  templateMerger.setEntity('contact', contactId);
  
  var template = templateMerger.merge();
  var body = '<html><body>'+template.getBody().replace('#NLCUSTOMLINK#', registrationURL)+'</body></html>';
  var subject = template.getSubject();
  //Sept 22 2015 - Ticket 3315
  //Add in distinction between T&C email and BIlling Info Email
  if (manualOverride == 'T')
  {
	  subject += ' (Billing Info Request)';
  }
  
  // Associate this email with prospect
  var records = new Array();
  records['entity'] = prospectId;
  
  // Send email
  nlapiSendEmail(authorId, contactId, subject, body, null, bcc, records);
}
