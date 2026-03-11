 /**
 * 
 * Version    Date            	Author           			Remarks
 * 1.00       15 OCT 2025     e.semalulu@1clickheat.com
 *
 */
function scheduledEmails()
{


  try
  {

/*
        var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct445_lastprocessed');

		var trxFilters = [new nlobjSearchFilter('type', null, 'anyof', 'Journal')];
        if (paramLastProcId)
        {
          trxFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
        }
        var trxColumns = [new nlobjSearchColumn('internalid').setSort(false)];
        var searchResults = nlapiSearchRecord('transaction', null, null, trxColumns)
*/    
    
	  var searchResults = nlapiSearchRecord(null, 'customsearch2849'); //Real Customer Search

      for (var i=0; searchResults && i < searchResults.length; i++)
      {
//-------------------------------------------------------------------------------------------------------------------------------
    		nlapiLogExecution('ERROR','Transaction ID', searchResults[i].getId());

            var trxRec = nlapiLoadRecord(searchResults[i].getRecordType(), searchResults[i].getId());

            var accountInProcess = trxRec.getFieldValue('custbody_account_in_grant_process');
            var applicationDate = trxRec.getFieldValue('custbody_application_date');
        
			var emailTempId = ''; // internal id of the email template created
        
            var program = trxRec.getFieldValue('class');
            //if NB - Single Family Residence -> Program = 15 
            //if NS - Single Family Residence -> Program = 14  
            //if NL - Single Family Residence -> Program = 16   

            // NB    [interval:10, template:112] 
            // NB    Need Last Email Sent Date & Variance of App Date vs Today Fields 
        
            // NL NS [init_interval:30] Need Last Email Sent Date -> 30 Day Template
            // NL NS [final_interval:30] Need Last Email Sent Date -> 90 Day Template
            // NL NS [application date + 90 Days] Need Last Email Sent Date -> 90 Day Template


            // Email Templates
            //NB - 10 Day Scheduled Email  = 112 
        
            //NL - 30 Day Scheduled Email = 109  
            //NL - 60 Day Scheduled Email = 113
            //NL - 90 Day Scheduled Email= 114 
        
            //NS - 30 Day Scheduled Email = 111  
            //NS - 60 Day Scheduled Email = 116
            //NS - 90 Day Scheduled Email= 117 
      
            if(program == 15) //NB - Single Family Residence 
            {
              emailTempId = '112'
              
               var emailTemplate = nlapiLoadRecord('emailtemplate', emailTempId);

              var emailSubj = emailTemplate.getFieldValue('subject');
                  //emailSubj = emailSubj.replace('${transaction.entity}', clientName );              
              var content = emailTemplate.getFieldValue('content');
                  //content = content.replace('${transaction.entity}', clientName);
                  //content = content.replace('${salesrep.Name}', salesRepName ); 
                           


              var appCompleteDate = new Date(applicationDate);
              var today = new Date();

              var diffInMs = today.getTime() - appCompleteDate.getTime();
              const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

             nlapiLogExecution('ERROR','DAYS FROM APP DATE', diffInDays);

              
              
            }

        
        



              //Set % completed of script processing
              var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
              nlapiGetContext().setPercentComplete(pctCompleted);

              //AFter each record is processed, you check to see if you need to reschedule
              if ((i+1)== 1 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 200))
              {
                //reschedule
                //log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));
              	//var rparam = {'custscript_sct445_lastprocessed':searchResults[i].getValue('internalid')};
              	//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
              	//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId()); 
                //break;

              }

      }
  }
  catch(procerr)
  {

       nlapiLogExecution('ERROR','ERROR PROCESSSING', procerr);

  }



	nlapiLogExecution('ERROR','Remaining', nlapiGetContext().getRemainingUsage());

function sendEmail(emailTempId)
{


  
}





  

}




















