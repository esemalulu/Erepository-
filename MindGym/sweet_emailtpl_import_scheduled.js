/**
 * Eprompt Template Import script
 *
 * Script will import eprompt templates from Neocortex
 *
 */

/**
 * Main
 */
function main_scheduled()
{
  try {
    
    // Prepare mail webservice
    var baseUrl = 'http://neocortex.themindgym.com/api';
    var wsClient = new SWEET.REST.Client(baseUrl);
    wsClient.enableAuthorization('Andre Borgstrom', 'H3lsingb0rg');
    var context = nlapiGetContext();
    
    // Get email templates
    var templates = _getTemplates();
    var i = 0, n = templates.length;
    for (; i < n; i++) {
      var templateId = templates[i].getId();
      var epromptId = templates[i].getValue('custrecord_emailtpl_neoepromptid');
      
      if (!epromptId) {
        continue; // Skip
      }
      
      if (context.getRemainingUsage() < 50) {
        return; // Let's exit gracefully
      }
      
      // Get Eprompt record from Neocortex
      var eprompt = wsClient.show('eprompt', epromptId);
      var epromptId = eprompt.id;
      nlapiLogExecution('DEBUG', 'Info', 'template.internal_id=' + templateId);
      nlapiLogExecution('DEBUG', 'Info', 'eprompt.id=' + epromptId);
      
      if (!epromptId) {
        throw nlapiCreateError('SWEET_SHOW_EPROMPT_FAILED', 'Failed to get eprompt record.');
      }
      
      var subject = _replaceTags(eprompt.subject);
      if (typeof(subject) != 'string' || subject.replace(/ /gi, '').length < 1) {
        nlapiLogExecution('DEBUG', 'Info', 'Subject is missing');
        continue; // Skip
      }
      
      var plain = _replaceTags(eprompt.textTemplate);
      if (typeof(plain) != 'string' || plain.replace(/ /gi, '').length < 1) {
        nlapiLogExecution('DEBUG', 'Info', 'Text body is missing');
        continue; // Skip
      }
      
      var html = _replaceTags(eprompt.htmlTemplate, true);
      if (typeof(html) != 'string' || html.replace(/ /gi, '').length < 1) {
        nlapiLogExecution('DEBUG', 'Info', 'HTML body is missing');
        continue; // Skip
      }
      
      // Update template record
      var template = nlapiLoadRecord('customrecord_emailtemplate', templateId);
      template.setFieldValue('custrecord_emailtpl_subject', subject);
      template.setFieldValue('custrecord_emailtpl_plaintext', plain);
      template.setFieldValue('custrecord_emailtpl_html', html);
      template.setFieldValue('custrecord_emailtpl_custom1', _replaceTags(eprompt.regLinkText));
      template.setFieldValue('custrecord_emailtpl_custom2', _replaceTags(eprompt.moreLinkText));
      template.setFieldValue('custrecord_emailtpl_sync', 'F');
      nlapiSubmitRecord(template);
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
    throw e;
  }
  
  /**
   * Get email templates
   *
   * @return {Array}
   */
  function _getTemplates()
  {
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_emailtpl_sync', null, 'is', 'T'));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    columns.push(new nlobjSearchColumn('custrecord_emailtpl_neoepromptid'));
    
    var result = nlapiSearchRecord('customrecord_emailtemplate', null, filters, columns);
    
    return (result ? result : new Array());
  }  
  
  /**
   * Helper function to replace tags that are no longer needed
   *
   * @param {String} text
   * @param {Boolean} isHtml
   * @return {String}
   */
  function _replaceTags(text, isHtml)
  {
    isHtml = typeof(isHtml) != 'undefined' ? isHtml : false;
    
    if (isHtml) {
      return text.replace(/\[%pound%\]/gi, '&pound;');
    }
    
    return text.replace(/\[%pound%\]/gi, String.fromCharCode(163));
  }
}
