/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error',
        'N/file', 
        'N/record', 
        'N/runtime', 
        'N/search', 
        'N/task',
        'N/format',
        'N/email'],
/**
 * @param {error} error
 * @param {file} file
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {transaction} transaction
 */
function(error, file, record, runtime, search, task, format, email) 
{
   	
function executeScript(context) 
{
            //if NB - Single Family Residence -> Program = 15 
            //if NS - Single Family Residence -> Program = 14  
            //if NL - Single Family Residence -> Program = 16   

            // NB    [interval:10, template:112] 
            // NB    Need Last Email Sent Date & Variance of App Date vs Today Fields 
        
            // NL NS [init_interval:30] Need Last Email Sent Date -> 30 Day Template
            // NL NS [final_interval:30] Need Last Email Sent Date -> 90 Day Template
            // NL NS [application date + 90 Days] Need Last Email Sent Date -> 90 Day Template

  var rsProcessedCount = 0;	    	
  try
  {

	     var orderSearch = search.load({id: 'customsearch2849'}).run().getRange({
                                      start: 0,
                                      end: 1000
                                      });		

         for (var i=0; orderSearch && i < orderSearch.length; i+=1)
        {

          rsProcessedCount++;

              var internalId = orderSearch[i].getValue({'name' : 'internalid'});
            
              var accountInProcess = orderSearch[i].getValue({'name' : 'custbody_account_in_grant_process'});
              //var applicationDate = new Date(orderSearch[i].getValue({'name' : 'custbody_application_date'}));
              var applicationDate = format.parse({value: orderSearch[i].getValue({'name' : 'custbody_application_date'}), type: format.Type.DATE});

          
              var program = orderSearch[i].getValue({'name' : 'class'});
              var entityId = orderSearch[i].getValue({'name' : 'entity'});
              var lastEmailDate = orderSearch[i].getValue({'name' : 'custbody_1clck_last_scheduled_email'});
              var today = new Date();    
			  var emailTempId = ''; // internal id of the email template created

              log.error('applicationDate',  applicationDate);
              log.error('lastEmailDate',  lastEmailDate);
              log.error('Program',  program);
               
              //var strTodaysDate = format.format({ 'type':format.Type.DATE, 'value':new Date() });
              //log.error('strTodaysDate', strTodaysDate );
            
             var clientRec = record.load({
			     type: record.Type.CUSTOMER,
				 id: entityId,
				  isDynamic: true,
				  });      
                
            var clientName = clientRec.getText({fieldId: 'companyname'});
            var clientProv = clientRec.getValue({fieldId: 'billstate'});
            var clientEmail = clientRec.getValue({fieldId: 'email'});
            
            //var NB10 = 112; //NB - 10 Day Scheduled Email  = 112
            
            if(program == 15) //NB - Single Family Residence 
            {
              
                if(isEmpty(lastEmailDate)) //Initial Send Date
                { 
               

                   var nbDiffInMsEmpty = today.getTime() - applicationDate.getTime();                 
                   var nbDiffInDaysEmpty = Math.round(nbDiffInMsEmpty / (1000 * 60 * 60 * 24));
                  
                   var nbTotalDiffMsEmpty = today.getTime() - applicationDate.getTime();
                   var nbTotalDiffInDaysEmpty = Math.round(nbTotalDiffMsEmpty / (1000 * 60 * 60 * 24));

                   log.error('diffInDays for NB Empty', nbDiffInDaysEmpty );

                   if(nbDiffInDaysEmpty == 10)
                   {
                      emailTempId = 112;
                     loadTempAndEmail(emailTempId, clientName, clientEmail, nbDiffInDaysEmpty, internalId, nbTotalDiffInDaysEmpty)
                   };
                }

               
              
                if(lastEmailDate) //Incremental Send Date
                { 

                   var nbLastEmailDateOj = new Date(lastEmailDate)
                   var nbDiffInMsNot = today.getTime() - nbLastEmailDateOj.getTime();                 
                   var nbDiffInDaysNot = Math.round(nbDiffInMsNot / (1000 * 60 * 60 * 24));

                   var nbTotalDiffMsNot = today.getTime() - applicationDate.getTime();
                   var nbTotalDiffInDaysNot = Math.round(nbTotalDiffMsNot / (1000 * 60 * 60 * 24));
                  
                   log.error('diffInDays for NB Not Empty', clientName );
                   log.error('totalDiffInDays for NB Not Empty', nbTotalDiffInDaysNot );
                     
                   if(nbDiffInDaysNot == 10 )
                   {
                      emailTempId = 112;
                      loadTempAndEmail(emailTempId, clientName, clientEmail, nbDiffInDaysNot, internalId, nbTotalDiffInDaysNot)
                   };
                                   
                              
                }


            }



            var NS30 = 111; //NS30 Day Scheduled Email = 111  
            var NS60 = 116; //NS - 60 Day Scheduled Email = 116
            var NS90 = 117; //NS - 90 Day Scheduled Email= 117

            if(program == 14) //NS - Single Family Residence 
            {
               
                     
                if(isEmpty(lastEmailDate)) //Initial Send Date
                { 
                   var nsDiffInMsEmpty = today.getTime() - applicationDate.getTime();                 
                   var nsDiffInDaysEmpty = Math.round(nsDiffInMsEmpty / (1000 * 60 * 60 * 24));

                   var nsTotalDiffMsEmpty = today.getTime() - applicationDate.getTime();
                   var nsTotalDiffInDaysEmpty = Math.round(nsTotalDiffMsEmpty / (1000 * 60 * 60 * 24));
                  
                   log.error('FIRST CALCULATION for NS Empty', clientName );
                   log.error('diffInDays for NS Empty', nsDiffInDaysEmpty );
                   log.error('totalDiffInDays for NS Not Empty', nsTotalDiffInDaysEmpty );

                   if(nsDiffInDaysEmpty == 30)
                   {
                     emailTempId = 111;
                     loadTempAndEmail(emailTempId, clientName, clientEmail, nsDiffInDaysEmpty, internalId, nsTotalDiffInDaysEmpty)
                   };

                  if(nsDiffInDaysEmpty = 60 )
                  {
                      emailTempId = 116;
                      loadTempAndEmail(emailTempId, clientName, clientEmail, nsDiffInDaysEmpty, internalId, nsTotalDiffInDaysEmpty)
                  };
                 
                  if(nsDiffInDaysEmpty == 90 )
                  {
                      emailTempId = 117;
                      loadTempAndEmail(emailTempId, clientName, clientEmail, nsDiffInDaysEmpty, internalId, nsTotalDiffInDaysEmpty)
                  };
                  
                  
                }

              
                if(lastEmailDate) //Incremental Send Date
                { 
                   var nslastEmailDateOjNot = new Date(lastEmailDate)
                   var nsDiffInMsNot = today.getTime() - nslastEmailDateOjNot.getTime();                 
                   var nsDiffInDaysNot = Math.round(nsDiffInMsNot / (1000 * 60 * 60 * 24));

                   var nsTotalDiffMsNot = today.getTime() - applicationDate.getTime();
                   var nsTotalDiffInDaysNot = Math.round(nsTotalDiffMsNot / (1000 * 60 * 60 * 24));
                  
                   log.error('FIRST CALCULATION for NS NOT', clientName );
                   log.error('diffInDays for NS Not Empty', nsDiffInDaysNot );
                   log.error('totalDiffInDays for NS Not Empty', nsTotalDiffInDaysNot );

                  

                         if(nsTotalDiffInDaysNot = 60 )
                         {
                           emailTempId = 116;
                           loadTempAndEmail(emailTempId, clientName, clientEmail, nsDiffInDaysNot, internalId, nsTotalDiffInDaysNot)
                         };
                 
                         if(nsTotalDiffInDaysNot == 90 )
                         {
                           emailTempId = 117;
                           loadTempAndEmail(emailTempId, clientName, clientEmail, nsDiffInDaysNot, internalId, nsTotalDiffInDaysNot)
                         };

                         if(nsTotalDiffInDaysNot > 90 && nsDiffInDaysNot == 30 )
                         {
                           emailTempId = 117;
                           loadTempAndEmail(emailTempId, clientName, clientEmail, nsDiffInDaysNot, internalId, nsTotalDiffInDaysNot)
                         };                  
                    

                }                  
                              
          }


            var NL30 = 109;//NL - 30 Day Scheduled Email = 109  
            var NL60 = 113; //NL - 60 Day Scheduled Email = 113
            var NL90 = 114; //NL - 90 Day Scheduled Email= 114 
              
          if(program == 16) //NL - Single Family Residence 
          {
                                   
                if(isEmpty(lastEmailDate)) //Initial Send Date
                { 
                   var nlDiffInMsEmpty = today.getTime() - applicationDate.getTime();                 
                   var nlDiffInDaysEmpty = Math.round(nlDiffInMsEmpty / (1000 * 60 * 60 * 24));

                   var nlTotalDiffMsEmpty = today.getTime() - applicationDate.getTime();
                   var nlTotalDiffInDaysEmpty = Math.round(nlTotalDiffMsEmpty / (1000 * 60 * 60 * 24));

                   log.error('FIRST CALCULATION for NL EMPTY', clientName );
                   log.error('diffInDays for NL Empty', nlDiffInDaysEmpty );
                   log.error('totalDiffInDays for NL Not Empty', nlTotalDiffInDaysEmpty );

                   if(nlTotalDiffInDaysEmpty == 30)
                   {
                     emailTempId = 109;
                     loadTempAndEmail(emailTempId, clientName, clientEmail, nlDiffInDaysEmpty, internalId, nlTotalDiffInDaysEmpty)
                   };
                  
                  if(nlTotalDiffInDaysEmpty == 60 )
                  {
                      emailTempId = 113;
                      loadTempAndEmail(emailTempId, clientName, clientEmail, nlDiffInDaysNot, internalId, nlTotalDiffInDaysEmpty)
                  };
                 
                  if(nlTotalDiffInDaysEmpty == 90 )
                  {
                      emailTempId = 114;
                      loadTempAndEmail(emailTempId, clientName, clientEmail, nlDiffInDaysNot, internalId, nlTotalDiffInDaysEmpty)
                  };  






                  
                  
                }

              
              if(lastEmailDate) //Incremental Send Date
              { 
                   var nlLastEmailDateOjNot = new Date(lastEmailDate)
                   var nlDiffInMsNot = today.getTime() - nlLastEmailDateOjNot.getTime();                 
                   var nlDiffInDaysNot = Math.round(nlDiffInMsNot / (1000 * 60 * 60 * 24));

                   var nlTotalDiffMsNot = today.getTime() - applicationDate.getTime();
                   var nlTotalDiffInDaysNot = Math.round(nlTotalDiffMsNot / (1000 * 60 * 60 * 24));
                
                   log.error('FIRST CALCULATION for NL NOT', clientName );
                   log.error('diffInDays for NL Not Empty', nlDiffInDaysNot );
                   log.error('totalDiffInDays for NL Not Empty', nlTotalDiffInDaysNot );


                       if(nlTotalDiffInDaysNot == 60 )
                       {
                         emailTempId = 113;
                         loadTempAndEmail(emailTempId, clientName, clientEmail, nlDiffInDaysNot, internalId, nlTotalDiffInDaysNot)
                       };
                 
                       if(nlTotalDiffInDaysNot == 90 )
                       {
                         emailTempId = 114;
                         loadTempAndEmail(emailTempId, clientName, clientEmail, nlDiffInDaysNot, internalId, nlTotalDiffInDaysNot)
                       };

                       if(nlTotalDiffInDaysNot > 90 && nlDiffInDaysNot == 30 )
                       {
                         emailTempId = 114;
                         loadTempAndEmail(emailTempId, clientName, clientEmail, nlDiffInDaysNot, internalId, nlTotalDiffInDaysNot)
                       };                   
                     
              }                  
                              
        }


    			var pctCompleted = Math.round(((i+1) / orderSearch.length) * 100);
        		runtime.getCurrentScript().percentComplete = pctCompleted;
    			
    			//Reschedule logic here
    			if ((i == 50) || runtime.getCurrentScript().getRemainingUsage() < 500)
                //(i+1 == orderSearch.length) 
    			//if (i == 50)
    			{
    				var schSctTask = task.create({
    					'taskType':task.TaskType.SCHEDULED_SCRIPT
    				});
    				schSctTask.scriptId = runtime.getCurrentScript().id;
    				schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
    				//schSctTask.params = {'custscript_151_lastid':lpcId};

    				//schSctTask.submit();
    				
    				log.audit('Rescheduled at', lpcId);

    				break;
    			} 
              
               log.error('UNITS LEFT', runtime.getCurrentScript().getRemainingUsage() );

            

         

          

  }







    

        	
          
    	}
    	catch (err)
    	{
    		log.error('Error Process File ', err);
    		

    		
    	}
    	
}

  
  function loadTempAndEmail(emailTempId, clientName, clientEmail, DiffInDays, internalId, totalDays) 
  {
    
    	var emailTemp = record.load({
            type: record.Type.EMAIL_TEMPLATE,
			id: emailTempId,
			isDynamic: true,
			});

        var emailSubj = emailTemp.getValue({fieldId: 'subject'});
            emailSubj  = emailSubj.replace('${transaction.entity}', clientName );
                  
        var content = emailTemp.getValue({fieldId: 'content'});
        content  = content.replace('${transaction.entity}', clientName);
        //content  = content.replace('${salesrep.Name}', salesRepName ); 
        content  = content.replace('${transaction.memo}', totalDays);

        email.send({
		author: '752333', // Emails coming fron "1Click Heating and Cooling Inc." Employee Record
		//recipients: ['esemalulu@1clickheat.com'], 
		recipients: [clientEmail], 
        bcc:['esemalulu@1clickheat.com', 'alex@1clickheat.com', 'm.azrak@1clickheat.com' ],
		subject: emailSubj,
	    body: content,
		//attachments: [pdfFile],
		relatedRecords: {transactionId: internalId }
		});
    
        log.error('EMAIL SENT FOR'+ clientName );
        var orderRec = record.load({'type':record.Type.SALES_ORDER, 'id':internalId });
    
        orderRec.setValue({fieldId: 'custbody_1clck_last_scheduled_email', value: new Date()});    
        orderRec.save({'enableSourcing':true, 'ignoreMandatoryFields':true});
           
  }




  function isEmpty(stValue)
  {
            if ((stValue == '') || (stValue == null) || (stValue == undefined))
            {
                return true;
            }
            else
            {
                if (stValue instanceof String)
                {
                    if ((stValue == ''))
                    {
                        return true;
                    }
                }
                else if (stValue instanceof Array)
                {
                    if (stValue.length == 0)
                    {
                        return true;
                    }
                }
                return false;
            }
  }


  

    return {
        execute: executeScript
    };
    
});
