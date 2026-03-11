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

  function beforeLoad(context) 
  {
          var thisRec = context.newRecord;
          var recType = thisRec.type;  
          var customForm = thisRec.getValue({fieldId: 'customform'});
          var approvalStatus = thisRec.getValue({fieldId: 'approvalstatus'});
    
         if(thisRec.type == 'purchaseorder' && approvalStatus == 1 && customForm == 139 )
         {

           
/*
           if(context.type == context.UserEventType.VIEW)
            var currentForm = context.form;
            currentForm.clientScriptModulePath = '/SuiteScripts/1clck_cs_transactions.js';

             currentForm.addButton({
             id: 'custpage_approve_po',
             label: 'Approve',
		     functionName : 'toSuitelet(\''+ thisRec.type+ '\', \''+ thisRec.id+ '\');'
             });   
*/
         }
    
  }


  function beforeSubmit(context)
  {

        var thisRec = context.newRecord;    
        var customForm = thisRec.getValue({fieldId: 'customform'});

        if(context.type == context.UserEventType.CREATE && thisRec.type == 'purchaseorder'  )
        {
            //Approve all Orders Not Using The "1Click | Technician Purchase Order" (139) Form 
            if(customForm != 139)
            {
                thisRec.setValue({fieldId: 'approvalstatus', value:2});  //APPROVED                                    
            }
            else
            {                   
              thisRec.setValue({fieldId: 'approvalstatus', value:1}); //PENDING APPROVAL
              thisRec.setValue({fieldId: 'nextapprover', value:40093}); //BEN
            }  
                                                    
        }
     
  }

  

  function afterSubmit(context) 
  {

        var thisRec = context.newRecord;
        log.error( 'thisRec.id', thisRec.id )
	   
       try 
       {
              if(context.type == context.UserEventType.CREATE && thisRec.type == 'purchaseorder'  )
             {

                  var customForm = thisRec.getValue({fieldId: 'customform'});
                  var vendorId = thisRec.getValue({fieldId: 'entity'});
                  var totalAmnt = thisRec.getValue({fieldId: 'total'});

                  var vendorRec = record.load({ type: record.Type.VENDOR, id: vendorId,isDynamic: true,});            
                  var vendorName = vendorRec.getValue({fieldId: 'entityid'});                 
                             
                  var user = thisRec.getValue({fieldId: 'nluser'}); 
                  var employeeRec = record.load({type: record.Type.EMPLOYEE, id : user });                
                  var userName = employeeRec.getValue({ fieldId: 'entityid' }); 
               
                  var vendorRec = record.load({type: record.Type.PURCHASE_ORDER, id : thisRec.id });                
                  var orderId = vendorRec.getValue({fieldId: 'tranid'});

                  var html = '<h1 style="color:black; font-size:12px;">Purchase Order To Approve</h1>';
				  html += '<p><b>Vendor: </b>'+vendorName+'</p>';
				  html += '<p><b>Order Number: </b>'+orderId+'</p>';
				  html += '<p><b>Created By: </b>'+userName+'</p>';
				  html += '<p><b>Amount: </b>'+totalAmnt+'</p>';
				  html += '<a href="https://7662002.app.netsuite.com/app/accounting/transactions/purchord.nl?id='+thisRec.id +'&e=T" >View Record</a><br>';

               
               
                    if(customForm == 139)
                    {
                      email.send({
	    		      'author':754043,
	    		      'recipients':['btiernan@1clickheat.com'],
	    		       //'bcc':['esemalulu@1clickheat.com'],
	    		       'subject':'Purchase Order Approval Required : '+ orderId,
	    		       'body':html


	    	            });                     
                    }             
             }

        } 
        catch (e) 
        {
        log.error('Error Sending PO Approval : '+ thisRec.type+' / '+thisRec.id, e);
        }	   
	   
    
  }
  

    return{
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
    	  };

});
