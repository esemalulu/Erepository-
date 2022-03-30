/**
 * Attach/Remove file attachments to Job record
 *
 * @function sweet_suitelet
 * @param {Object} request
 * @param {Object} response
 * @return {Void}
 */
function sweet_suitelet(request, response)
{
  // Validate job id
  var jobId = request.getParameter('job_id');
  if (!jobId) {
    throw nlapiCreateError('SWEET_JOB_REQD', 'Job ID is required.', true);
  }
  
  // Has form been submitted?
  if (request.getMethod() == 'POST') {
    
    var action = request.getParameter('action');
    
    // Attach file
    if (action == 'attach') {
    
      var file = request.getFile('file')
      
      if (file) {
        
        var parentFolderId = 498; // DO NOT CHANGE
        
        // Does folder exist?
        var filters = new Array();
        filters.push(new nlobjSearchFilter('name', null, 'is', jobId));
        filters.push(new nlobjSearchFilter('parent', null, 'is', parentFolderId));
        var folders = nlapiSearchRecord('folder', null, filters, null);
        
        if (folders) {
        
          // Use existing folder
          var folderId = folders[0].getId();
          
        } else {
        
          // Create new folder
          var folder = nlapiCreateRecord('folder');
          folder.setFieldValue('name', jobId);
          folder.setFieldValue('parent', parentFolderId);
          var folderId = nlapiSubmitRecord(folder);
        }
        
        file.setFolder(folderId); // Place file in folder
        file.setIsOnline(true); // Make file available without login
        
        // Save file
        var fileId = nlapiSubmitFile(file);
        
        // Load file to get public URL
        var file = nlapiLoadFile(fileId);
        
        // Does attachment already exist? (this happens when a file is overwritten)
        var filters = new Array();
        filters.push(new nlobjSearchFilter('custrecord_jat_job', null, 'is', jobId));
        filters.push(new nlobjSearchFilter('custrecord_jat_file', null, 'is', fileId));
        var attachments = nlapiSearchRecord('customrecord_jobattachment', null, filters, null);
        
        if (!attachments) {
        
          // No, let's create a new attachment record
          var attachment = nlapiCreateRecord('customrecord_jobattachment');
          attachment.setFieldValue('custrecord_jat_job', jobId);
          attachment.setFieldValue('custrecord_jat_file', fileId);
          attachment.setFieldValue('custrecord_jat_name', file.getName());
          attachment.setFieldValue('custrecord_jat_url', 'https://system.netsuite.com' + file.getURL());
          
          // Save attachment
          nlapiSubmitRecord(attachment);
        }
      }
    }
    
    // Remove files
    if (action == 'remove') {
      
      var attachments = request.getParameterValues('attachments[]');
      
      if (attachments) {
        var i = 0, n = attachments.length;
        for (; i < n; i++) {
          var attachmentId = attachments[i];
          var attachment = nlapiLoadRecord('customrecord_jobattachment', attachmentId);
          
          // Delete the file
          try {
            var fileId = attachment.getFieldValue('custrecord_jat_file');
            if (fileId) {
              nlapiDeleteFile(fileId);
            }
          } catch (e) {
            if (e instanceof nlobjError && e.getCode() == 'RCRD_DSNT_EXIST') {
              // Continue, most likely the file was manually deleted from the file cabinet
            } else {
              throw e;
            }
          }
          
          // Delete the attachment record
          nlapiDeleteRecord('customrecord_jobattachment', attachmentId);
        }
      }
    }
  }
  
  // Display the page
  
  echoHeader();
  
  // Display new attachments form
  echo('<form enctype="multipart/form-data" method="POST">')
  echo('<h3>Attach file</h3>')
  echo('<input type="file" name="file" size="40" />')
  echo('<input type="submit" value="Attach" />')
  echo('<input type="hidden" name="action" value="attach" />')
  echo('</form>')
  
  // Display existing file attachments
  echo('<form method="POST">')
  echo('<h3>Current file attachments</h3>')
  
  // Get list of attachment associated with this job
  var filters = new Array();
  filters.push(new nlobjSearchFilter('custrecord_jat_job', null, 'is', jobId));
  var columns = new Array();
  columns.push(new nlobjSearchColumn('custrecord_jat_file'));
  columns.push(new nlobjSearchColumn('custrecord_jat_name'));
  columns.push(new nlobjSearchColumn('custrecord_jat_url'));
  var attachments = nlapiSearchRecord('customrecord_jobattachment', null, filters, columns);
  var javascript = new Array();
  
  if (attachments) {
  
    echo('<table>');
    echo('<tbody>');
    
    var i = 0, n = attachments.length;
    for (; i < n; i++) {
      echo('<tr>');
      var attachmentId = attachments[i].getId();
      var fileName = attachments[i].getValue('custrecord_jat_name');
      var fileUrl = attachments[i].getValue('custrecord_jat_url');
      echo('<td><input type="checkbox" id="attachment_' + attachmentId + '" name="attachments[]" value="' + attachmentId + '" /></td>');
      echo('<td><label for="attachment_' + attachmentId + '">'+ fileName + '</label></td>');
      echo('<tr>');
      
      javascript.push('attachments.push({name:\'' + fileName + '\', url:\'' + fileUrl + '\'});');
    }
    
    echo('</tbody>');
    echo('</table>');
    
    echo('<script type="text/javascript">');
    echo(javascript.join('\n'));
    echo('</script>');
  }
  
  // Update attachment list in parent window
  echo('<script type="text/javascript">');
  echo('updateAttachments();');
  echo('</script>');
  
  echo('<input type="hidden" name="action" value="remove" />')
  echo('<input id="remove-btn" type="submit" value="Remove" />')
  echo('<input id="close-btn" type="button" value="Close window" onclick="javascript:self.close()" />')
  
  echo('</form>')
  
  echoFooter();
}

/**
 * A simple alias to response.writeLine
 *
 * @param {String} string
 * @return {Void}
 */
function echo(string)
{
  response.writeLine(string);
}

/**
 * Output html header
 *
 * @return {Void}
 */
function echoHeader()
{
  echo('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">');
  echo('<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">');
  echo('<head>');
  echo('<title>Attachments</title>');
  
  // Basic stylesheet
  echo('<style type="text/css">');
  echo('body {font-family: verdana, arial, sans-serif; font-size: 11px; margin-left: 15px}');
  echo('h3 {margin-top: 2em;}');
  echo('#remove-btn {float: left;}');
  echo('#close-btn {float: right;}');
  echo('</style>');
  
  // Javascript code that updates attachment list in parent window
  echo('<script type="text/javascript">');
  echo('var attachments = new Array();');
  echo('function updateAttachments() {');
  echo('  var innerHTML = new Array();');
  echo('  var i = 0; n = attachments.length;');
  echo('  for ( ; i < n; i++) {');
  echo('    innerHTML.push(\'<a href="\' + attachments[i].url + \'" target="_blank">\' + attachments[i].name + \'</a>\');');
  echo('  }');
  echo('  try {');
  echo('    var element = window.opener.document.getElementById(\'sweet-attachments\');');
  echo('    element.innerHTML = innerHTML.join(\', \');');
  echo('  } catch (e) {}');
  echo('}');
  echo('</script>');
  
  echo('</head>');
  echo('<body>');
}

/**
 * Output html footer
 *
 * @return {Void}
 */
function echoFooter()
{
  echo('</body></html>');
}
