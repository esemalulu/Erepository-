function process(email) 
{
       nlapiLogExecution('DEBUG', 'EMAIL PLUGIN TRIGGERED');
       var attachments = email.getAttachments();
       if (attachments != null) {
           for (var a in attachments) {
               var attachment = attachments[a];
               attachment.setFolder(2745); // Folder Id
               var fileId = nlapiSubmitFile(attachment);
           }
       }
}