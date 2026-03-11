/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record',
        'N/error',
        'N/search',
        'N/ui/serverWidget',
        'N/runtime',
        'N/url',
        'N/email',
        'N/file',
        'N/render'],

function(record,  error, search, serverw, runtime, url, email, file, render) 
{

  function afterSubmit(context) 
  {

            var thisRec = context.newRecord;
            var recType = thisRec.type;    
    
            log.error( 'thisRec.id', thisRec.id )
   
       try {

              var user = runtime.getCurrentUser();
              log.error( 'user', user.department )


            if(user.department == '6' )  

              //if(recType == 'salesorder' && context.type == context.UserEventType.EDIT) //UPON EDIT
              if(recType == 'salesorder' && context.type == context.UserEventType.CREATE) //UPON CREATE
              {
                  
                 var rec = record.load({'type':recType, 'id':thisRec.id });
      		     var lineCnt = rec.getLineCount({'sublistId':'item'});
                
                var accountStatus = rec.getValue({fieldId: 'custbody_suitecrm_account_status'}); 
                var introEmailSent = rec.getValue({fieldId: 'custbody_intro_email_sent'}); 
    
                var provLookUp = search.lookupFields({
                'type':'customer',
                'id':rec.getValue({'fieldId':'entity'}),
                'columns':['billstate', 'salesrep']
                })

				var prov = provLookUp.billstate[0].value 
                log.error( 'PROVINCE', provLookUp.billstate[0].value )

                var salesRepId = provLookUp.salesrep[0].value 
                log.error( 'salesRepId', provLookUp.salesrep[0].value )
                
                var introEmailSent = rec.getValue({fieldId: 'custbody_intro_email_sent'}); 
                log.error( 'Intro Email', introEmailSent )                

                
                if((prov == 'NL' || prov == 'NS' || prov == 'NB' || prov == 'ON') && accountStatus == '41' && introEmailSent == false )   
                {  

                    var status = rec.getValue({fieldId: 'status'});
                    var grantProcess  = rec.getValue({fieldId: 'custbody_account_in_grant_process'});
                    var applicationDate  = rec.getValue({fieldId: 'custbody_application_date'});  

                  
                
					var emailTempId = ''; // internal id of the email template created
                  
 					var empRec = record.load({
						type: record.Type.EMPLOYEE,
						id: salesRepId,
						isDynamic: true,
					});

                    var salesRepEmail = empRec.getValue({fieldId: 'email'});
                    var salesRepID = empRec.getValue({fieldId: 'id'});
                    var salesRepName = empRec.getValue({fieldId: 'entityid'});

                    var NSphone = empRec.getValue({fieldId: 'mobilephone'})
                    var NLphone = empRec.getText({fieldId: 'officephone'})
                    var NBphone = empRec.getText({fieldId: 'phone'}) 
                    var ONphone = empRec.getText({fieldId: 'homephone'}) 
                  
                   log.error( 'NSphone', NSphone );
                   log.error( 'NLphone', NLphone );
                   log.error( 'NBphone', NBphone );
                   log.error( 'ONphone', ONphone );
                  
                    log.error( 'SalesRepEmail', salesRepEmail );

                  
 					var clientRec = record.load({
						type: record.Type.CUSTOMER,
						id: rec.getValue({'fieldId':'entity'}),
						isDynamic: true,
					});      

                    var clientName = clientRec.getText({fieldId: 'companyname'});
                    var clientProv = clientRec.getValue({fieldId: 'billstate'});
                    var clientEmail = clientRec.getValue({fieldId: 'email'});
                  

                     // ID 4 = Intro Email - NS
                     // ID 7 = Intro Email - NB                
                     // ID 3 = Intro Email - NL  --> Hydro  (Program Based - Take Charge)             
                     // ID 5 = Intro Email - No Rebates --> custbody_account_in_grant_process (from client record) TRUE = REBATES /FALSE= NO REBATES 
                     // ID 6 = Intro Email - 0% Loan  --> Is this customer applying for grants? THEN 

                    log.error( 'GRANT PROCESS', grantProcess );

                    if(grantProcess == false || grantProcess == 'null')
                    {emailTempId = '5'} 
                  
                    if(grantProcess == true && clientProv == 'NS' )
                    {emailTempId = '4'}
                  
                    if(grantProcess == true && clientProv == 'NL' )
                    {emailTempId = '3'}    
                  
                    if(grantProcess == true && clientProv == 'NB' )
                    {emailTempId = '7'} 

                    if(grantProcess == true && clientProv == 'ON' )
                    {emailTempId = '8'} 
                  
                    //if(clientProv == 'ON'){emailTempId = ''}
                    //if(clientProv == 'BC'){emailTempId = ''}


					var emailTemp = record.load({
						type: record.Type.EMAIL_TEMPLATE,
						id: emailTempId,
						isDynamic: true,
					});

                   var emailSubj = emailTemp.getValue({fieldId: 'subject'});
                   emailSubj  = emailSubj.replace('${transaction.entity}', clientName );
                  
                   var content = emailTemp.getValue({fieldId: 'content'});
                   content  = content.replace('${transaction.entity}', clientName);
                   content  = content.replace('${salesrep.Name}', salesRepName );  


                   //PHONE NUMBER REPLACMENTS
                  if(clientProv == 'NS' && NSphone )
                  {
                    content  = content.replace('${salesrep.phone}', NSphone.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4'));
                  }                   
                  else if (clientProv == 'NL' && NLphone )
                  {
                     content  = content.replace('${salesrep.phone}', NLphone.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4'));
                  }
                  else if(clientProv == 'NB' && NBphone  )
                  {
                    content  = content.replace('${salesrep.phone}', NBphone.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4'));
                  }
                  else if(clientProv == 'ON' && ONphone  )
                  {
                    content  = content.replace('${salesrep.phone}', ONphone.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4'));
                  }
                    
                  else         
                  {
                    content  = content.replace('${salesrep.phone}', '1-800-458-1289'); 
                  }

                 
                  //if(clientProv == 'ON'){content.replace('${salesrep.phone}',         ) };
                  //if(clientProv == 'BC'){content.replace('${salesrep.phone}',         ) };
                                
					var pdfFile = file.load('Attachments to Send/Email Automation/1Click Welcome Package.pdf');                                                              
/*

					//var emailSubj = emailTemp.getValue({'fieldId':'subject'});
					//var emailBody = emailTemp.getValue({'fieldId':'content'});

                    
					var renderer = render.create();
					renderer.templateContent = xmlTemplateFile.getContents();
                    
					renderer.addRecord('record', record.load({
						type: record.Type.SALESORDER,
						id: salesOrderId
					}));

					var invoicePdf = renderer.renderAsPdf();
*/

                if(grantProcess == true && applicationDate  )
                {
                	email.send({
					author: salesRepID, // Emails coming fron "1Click Heating and Cooling Inc." Employee Record
					recipients: [clientEmail], 
                    //bcc:[salesRepEmail, 'esemalulu@1clickheat.com', 'alex@1clickheat.com' ],
                    bcc:[salesRepEmail],
					subject: emailSubj,
					body: content,
					attachments: [pdfFile],
					relatedRecords: {transactionId: thisRec.id }
				  });

                  rec.setValue({fieldId: 'custbody_intro_email_sent', value: true});                     
                  log.error( 'Intro Email v2', introEmailSent )    
                }
                 

           }

          rec.save(); 

               
          }


        } 
        catch (e) 
        {
        log.error('Error Sending Intro Email : '+ recType+' / '+thisRec.id, e);
        }	   
	   



      
  }


  

    return{
            afterSubmit: afterSubmit
    	  };

});
