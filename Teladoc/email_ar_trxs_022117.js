function emailRecords(type) {
//	  {
		    var fromId = 3; //Authors' Internal ID
            var sbj = 'Your Invoice from Livongo Health';
            var msg = 'Hello World Attached Sales Order PDF file';
            var invoiceId = 7043;
            
            
            var emailTempId = 2; // internal id of the email template created
            var emailTemp = nlapiLoadRecord('emailtemplate',emailTempId); 
            var emailSubj = emailTemp.getFieldValue('subject');
            var emailBody = emailTemp.getFieldValue('content');
            var records = new Object();
            //records['invoice'] = 7043; //internal id of the case record
            
            var invoiceRec = nlapiLoadRecord('invoice', 7043); 
            var renderer = nlapiCreateTemplateRenderer();
            renderer.addRecord('invoice', invoiceRec ); 
            renderer.setTemplate(emailSubj);
            renderSubj = renderer.renderToString();
            renderer.setTemplate(emailBody);
            renderBody = renderer.renderToString();
            
            
             if(type == 'scheduled')
             {
                 //Obtaining the context object and logging the remaining usage available
                 var context = nlapiGetContext();
                  nlapiLogExecution('DEBUG', 'Remaining usage at script beginning', context.getRemainingUsage());
              }
              else
              {
                  nlapiLogExecution('DEBUG', 'Inside Else if');
                  var pdfFile = nlapiPrintRecord('TRANSACTION',7043,'PDF',null);
                 // nlapiSendEmail(fromId, 'alim@livongo.com', sbj, msg, null, null, null, pdfFile);
                 nlapiSendEmail(fromId, 'alim@livongo.com', renderSubj, renderBody , null, null, pdfFile);
              }

}
