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
        'N/email'],

function(record,  error, search, serverw, runtime, url, email) 
{

  function beforeLoad(context) 
  {        
    
        var thisRec = context.currentRecord;
        var recType = thisRec.type;
    
        var shipMethod = thisRec.getValue({ fieldId: "shipmethod" });

        var rec = record.load({type:recType, id:thisRec.id, isDynamic: true });
        rec.getField({ fieldId: "custbody_tagex_pallet_progress" }).display = false;



    
        
       
  }

   function beforeSubmit(context) 
   {
   }


  function afterSubmit(context) 
  {
      var thisRec = context.newRecord;
      var recType = thisRec.type;  

      var rec = record.load({'type':recType, 'id':thisRec.id });
      var lineCnt = rec.getLineCount({'sublistId':'apply'});
      log.error('ID', recType +':'+ thisRec.id ); 
    
  try 
  {
             
      if(recType == 'customerpayment' || recType == 'creditmemo')
      {
                  
          if(context.type == context.UserEventType.EDIT)
          {


                  //var typeArray = [];
  		
                  for (var i=0; lineCnt && i < lineCnt; i+=1)
                  {
                        var amountPaid = rec.getSublistValue({'sublistId':'apply', 'fieldId':'amount', 'line':i });
                        var amountDue = rec.getSublistValue({'sublistId':'apply', 'fieldId':'due', 'line':i });
                        var invTotal = rec.getSublistValue({'sublistId':'apply', 'fieldId':'total', 'line':i });
                        var invId = rec.getSublistValue({'sublistId':'apply', 'fieldId':'internalid', 'line':i });

                 
                      if(amountPaid == amountDue)
                      {

                          var invRec = record.load({
                              type: record.Type.INVOICE,
                              id : invId });
                        
                         var createdFrom = invRec.getValue({ fieldId: 'createdfrom' }); 
                         var invStatus = invRec.getValue({ fieldId: 'status' }); 
                        
                      
                          if(createdFrom )
                          {

                               log.error('INV STATUS'+invNo, invStatus );  
                         
                              var soRec = record.load({'type':'salesorder', 'id': createdFrom});
                              soRec.setValue({'fieldId': 'custbody_tagex_paymentstatus','value': '1'});
                              soRec.save();
                          }
                          
                      }
              
                    
                      if(amountPaid != amountDue)
                      {


                          var invRec = record.load({
                              type: record.Type.INVOICE,
                              id : invId });
                        
                         var createdFrom = invRec.getValue({ fieldId: 'createdfrom' });  
                         var invStatus = invRec.getValue({ fieldId: 'status' }); 
                         var invNo = invRec.getValue({ fieldId: 'tranid' }); 


                          //log.error('SO ID', createdFrom );  

                          if(createdFrom )
                          {

                             log.error('INV STATUS'+invNo , invStatus );  
                            
                              var soRec = record.load({'type':'salesorder', 'id': createdFrom });
                              soRec.setValue({'fieldId': 'custbody_tagex_paymentstatus','value': '2'});
                              soRec.save();
                          }
                          
                      }




                    

                        //typeArray.push(invId);
              }



/*

                   if(typeArray || typeArray.length > 0)
                    {

                      log.error('ARRAY', JSON.stringify(typeArray).replace(/[\[\]"]+/g,"") );
                    }

*/


            

/*
              var payRec = record.load({'type':recType , 'id': thisRec.id});        
              var payRecId = payRec.save();



            
              var newPayRec = record.load({'type':recType , 'id': payRecId});


                  for (var i=0; lineCnt && i < lineCnt; i+=1)
                  {
                        //var amountPaid = newPayRec.getSublistValue({'sublistId':'apply', 'fieldId':'amount', 'line':i });
                        //var amountDue = newPayRec.getSublistValue({'sublistId':'apply', 'fieldId':'due', 'line':i });
                        var newInvTotal = newPayRec.getSublistValue({'sublistId':'apply', 'fieldId':'total', 'line':i });
                        var newInvId = newPayRec.getSublistValue({'sublistId':'apply', 'fieldId':'internalid', 'line':i });

                        var newInvRec = record.load({
                        type: record.Type.INVOICE,
                        id : newInvId });
                    
                        var newRecId = newInvRec.getValue({ fieldId: 'internalid' });  
                        var newRecStatus = newInvRec.getValue({ fieldId: 'status' });  
                    
                        log.error('INV', payRecId.getValue({ fieldId: 'internalid' })  );
                        log.error('INV STATUS', newRecStatus );  



                    
                    
                  }




*/
  
          }


        
      }









      if(recType == 'salesorder' )
      {


           var palletProgress = thisRec.getValue({ fieldId: "custbody_tagex_pallet_progress" });
           var shipMethod = thisRec.getValue({ fieldId: "shipmethod" });

           var orderNum = thisRec.getValue({ fieldId: "tranid" });
        
            log.error('palletProgress' , palletProgress ); 
        
           var emailTempId = ''; // internal id of the email template created
        
           if(palletProgress == '1'){emailTempId = '94';} 
           if(palletProgress == '2'){emailTempId = '95';}
           if(palletProgress == '3'){emailTempId = '96';}
           if(palletProgress == '4'){emailTempId = '97';}  
           if(palletProgress == '5'){emailTempId = '98';}  
       
            log.error('emailTempId' , emailTempId ); 

		  var emailTemp = record.load({
			  type: record.Type.EMAIL_TEMPLATE,
			  id: emailTempId,
			  isDynamic: true,
			 });

            var content = emailTemp.getValue({fieldId: 'content'});
            content  = content.replace('${transaction.tranId}', orderNum )

			var emailSubj = emailTemp.getValue({'fieldId':'subject'});
			//var emailBody = emailTemp.getValue({'fieldId':'content'});

            if(shipMethod == '21866')
           {
			       email.send({
					author: 246871, 
				   	recipients: ['elijah@semalulu.com'], 
					subject: emailSubj,
					body: content,
					//attachments: [invoicePdf],
					relatedRecords: {transactionId: thisRec.id }
				  });
              
            }

        


        
        
      }
































    

          

  } 
  catch (e) 
  {
      log.error('Updating Payment Status', e);

      email.send({
	  'author':-5,
	  'recipients':'elijah@semalulu.com',
	  'subject':'Error Processing Payment  ',
	  'body':e
	  });         
  }




}


  

    return{
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit
        afterSubmit: afterSubmit
    	};

});
