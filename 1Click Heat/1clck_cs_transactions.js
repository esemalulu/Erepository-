/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(['N/record',
        'N/error',
        'N/search',
        'N/format',
        'N/url',
        'N/runtime'],

function(record, error, search,format, url, runtime, custDate)
{


    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2 
     */


function pageInit(context)
{

    var thisRec = context.currentRecord;
    var recType = thisRec.type;
    var user = runtime.getCurrentUser();


  if(recType == 'lead' )
  {

       var deadNotInterestedReason = thisRec.getField({ fieldId: "custentity7" });
       var deadNotInterestedComments = thisRec.getField({ fieldId: "custentity_dead_not_interested_comments" });
       var leadStatus = thisRec.getValue({ fieldId: "entitystatus" });
       var heatPumpType = thisRec.getValue({ fieldId: "custentity_1clck_heatpump_type" });

      


      if( leadStatus != '23' || leadStatus != '22')
      {
          thisRec.getField({ fieldId: "custentity7" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity_dead_not_interested_comments" }).isDisplay = false; 
      }
     
      if( leadStatus == '23' || leadStatus == '22')
      {
          thisRec.getField({ fieldId: "custentity7" }).isDisplay = true;
          thisRec.getField({ fieldId: "custentity_dead_not_interested_comments" }).isDisplay = true; 
      }
      
      if(isEmpty(heatPumpType) )
      {
          thisRec.getField({ fieldId: "custentity8" }).isDisplay = false; 
          thisRec.getField({ fieldId: "custentity9" }).isDisplay = false;         
      }



       var province = thisRec.getValue({ fieldId: "custentity_province" });
 

      if(isEmpty(province))
      {
          thisRec.getField({ fieldId: "custentity10" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity11" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity12" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity13" }).isDisplay = false;
      
      }
     
      
  }

	
    if(recType == 'invoice' || recType == 'salesorder' ) 
    {
      
         //(1013) 1Click | Sales Person OR (1045)	1Click | Sales Team Lead 
      
        if(user.role == '1013' || user.role == '1045' )
        {
          thisRec.getField({fieldId: 'trandate'}).isDisabled = true;
        }

    }


  
    if(recType == 'salesorder')
    {
          
       var cancelReason = thisRec.getValue({ fieldId: "custbody_reason_for_cancellation" });
       var cancelComment = thisRec.getValue({ fieldId: "custbody_reason_for_cancel_comments" });
       var accountStatus = thisRec.getValue({ fieldId: "custbody_suitecrm_account_status" });
         

      if(accountStatus != '21' )
      { 
       thisRec.getField({ fieldId: "custbody_reason_for_cancellation" }).isDisplay = false;
       thisRec.getField({ fieldId: "custbody_reason_for_cancel_comments" }).isDisplay = false; 

      }
      else
      { 
       thisRec.getField({ fieldId: "custbody_reason_for_cancellation" }).isDisplay = true;
       thisRec.getField({ fieldId: "custbody_reason_for_cancel_comments" }).isDisplay = true; 

      } 


      var custForm = thisRec.getValue({ fieldId: "customform" });

      if(custForm == '140') // 1 Click | Service Call Sales Order” (140)	
      {
         thisRec.setValue({'fieldId':'custbody_suitecrm_account_status', 'value': '' });              
      }

      
    }  


    if(recType == 'purchaseorder' )
    {      
         log.error( 'user.role', user.role )

         if( user.role == '3')  // Administrator Role = 3
         {
            thisRec.getField({fieldId: 'approvalstatus'}).isDisabled = false;
            thisRec.getField({fieldId: 'nextapprover'}).isDisabled = false;
         }
         else
         {
            thisRec.getField({fieldId: 'approvalstatus'}).isDisabled = true;
            thisRec.getField({fieldId: 'nextapprover'}).isDisabled = true;        
         }
    }





}



function fieldChanged(context) 
{

    var thisRec = context.currentRecord;
    var recType = thisRec.type;
    var user = runtime.getCurrentUser();
        
            //log.error('user', user) 

 

    if(recType == 'lead' )
    {


       if(context.fieldId == "entitystatus")
	   {

          var leadStatus = thisRec.getValue({ fieldId: "entitystatus" });
         
          if(  leadStatus == '23' || leadStatus == '22' )
          {
              thisRec.getField({ fieldId: "custentity7" }).isDisplay = true;
              thisRec.getField({ fieldId: "custentity_dead_not_interested_comments" }).isDisplay = true;
          }
         else
          {
              thisRec.getField({ fieldId: "custentity7" }).isDisplay = false;
              thisRec.getField({ fieldId: "custentity_dead_not_interested_comments" }).isDisplay = false; 

              thisRec.setValue({'fieldId':'custentity7', 'value': '' });
              thisRec.setValue({'fieldId':'custentity_dead_not_interested_comments', 'value': '' });          
          }
       }






      
   var heatPumpType = thisRec.getValue({ fieldId: "custentity_1clck_heatpump_type" }); 
      
      if(context.fieldId == "custentity_1clck_heatpump_type" && (user.department == 6 || user.department == 9 ) )
      {


      

           if(isEmpty(heatPumpType ))
           {
              thisRec.getField({ fieldId: "custentity8" }).isDisplay = false; 
              thisRec.getField({ fieldId: "custentity9" }).isDisplay = false;
              thisRec.setValue({'fieldId':'custentity8', 'value': '' });
              thisRec.setValue({'fieldId':'custentity9', 'value': '' });  
            
           }        

           if(heatPumpType == 1)
           {
              thisRec.getField({ fieldId: "custentity8" }).isDisplay = true; 
            
           }
        
           if(heatPumpType == 2)
           {
              thisRec.getField({ fieldId: "custentity8" }).isDisplay = true; 
              thisRec.getField({ fieldId: "custentity9" }).isDisplay = true; 

           }
        
      }
      

      var province = thisRec.getValue({ fieldId: "custentity_province" }); 


      if(context.fieldId == "custentity_province" )
      {

        
          if(province == '5') //New Brunswick
         {
          thisRec.getField({ fieldId: "custentity12" }).isDisplay = true;
           
          thisRec.getField({ fieldId: "custentity11" }).isDisplay = false; 
          thisRec.getField({ fieldId: "custentity10" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity13" }).isDisplay = false;             

         }   

         if(province == '7') //Newfoundland
         {
          thisRec.getField({ fieldId: "custentity11" }).isDisplay = true;

           thisRec.getField({ fieldId: "custentity12" }).isDisplay = false;          
          thisRec.getField({ fieldId: "custentity10" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity13" }).isDisplay = false;            
         }

         if(province == '4') //Nova Scotia
         {
          thisRec.getField({ fieldId: "custentity10" }).isDisplay = true;
           
          thisRec.getField({ fieldId: "custentity11" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity12" }).isDisplay = false;  
          thisRec.getField({ fieldId: "custentity13" }).isDisplay = false;            

         }

         if(province == '3') //Ontario
         {
          thisRec.getField({ fieldId: "custentity13" }).isDisplay = true; 

          thisRec.getField({ fieldId: "custentity10" }).isDisplay = false; 
          thisRec.getField({ fieldId: "custentity11" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity12" }).isDisplay = false; 
         }


         if(isEmpty(province)) //EMPTY
         {
          thisRec.getField({ fieldId: "custentity10" }).isDisplay = false ;         
          thisRec.getField({ fieldId: "custentity11" }).isDisplay = false;
          thisRec.getField({ fieldId: "custentity12" }).isDisplay = false;  
          thisRec.getField({ fieldId: "custentity13" }).isDisplay = false;            
         }

        
      }

















      


      
    
     }



    if(recType == 'salesorder' )
    {


       if(context.fieldId == "custbody_suitecrm_account_status")
	   {

          var accountStatus = thisRec.getValue({ fieldId: "custbody_suitecrm_account_status" });
         
          if(  accountStatus == '21'  )
          {
             thisRec.getField({ fieldId: "custbody_reason_for_cancellation" }).isDisplay = true;
             thisRec.getField({ fieldId: "custbody_reason_for_cancel_comments" }).isDisplay = true;
          }
           else
          {         
              thisRec.getField({ fieldId: "custbody_reason_for_cancellation" }).isDisplay = false;
              thisRec.getField({ fieldId: "custbody_reason_for_cancel_comments" }).isDisplay = false;  

              thisRec.setValue({'fieldId':'custbody_reason_for_cancellation', 'value': '' });
              thisRec.setValue({'fieldId':'custbody_reason_for_cancel_comments', 'value': '' }); 
          }

  return true;       

       }




       if(context.fieldId == "customform")
	   {
             var custForm = thisRec.getValue({ fieldId: "customform" });

             if(custForm == '140')
             {
                  thisRec.setValue({'fieldId':'custbody_suitecrm_account_status', 'value': '' });
               
             }
         
       }




      

    
  }

  return true;    
 
    
}


  
function validateLine(context) 
{
        var thisRec = context.currentRecord;
        var recType = thisRec.type;
        var sublistName = context.sublistId;
  
        if(recType == 'vendorbill')
        {
          var accountID = thisRec.getCurrentSublistValue({sublistId: sublistName,fieldId: 'account'});
         
           if (sublistName == 'expense')
           {
               if (accountID == '225')
               {
   					  alert('DO NOT POST EXPENSES TO ASSET ACCOUNT. USE ITEM CODE INSTEAD');
					  return false;           
                }             
           }
       
        }
      
  return true;    
} 




function saveRecord(context) 
{
    var thisRec = context.currentRecord;
    var recType = thisRec.type;
    var user = runtime.getCurrentUser();


    if(recType == 'lead' )
    {
           var leadStatus = thisRec.getValue({ fieldId: "entitystatus" });
           var reasonList = thisRec.getValue({ fieldId: "custentity7" });     
           var reasonComments = thisRec.getValue({ fieldId: "custentity_dead_not_interested_comments" });
      
           var heatPumpType = thisRec.getValue({ fieldId: "custentity_1clck_heatpump_type" });
           var tonnageToInstal = thisRec.getValue({ fieldId: "custentity8" });
           var numberOfHeads = thisRec.getValue({ fieldId: "custentity9" });

      
       	   if(leadStatus == '23' || leadStatus == '22' )
		   {

               if(!reasonList && !reasonComments )
               {
                 alert('Please Enter " DEAD OR NOT INTERESTED REASON " and "COMMENTS" ');
                 return false;  
               }
           } 



         if(user.department == 6 ) //Sales Department
         //if(user.department == 6 || user.department == 9 ) 
         {
             if(isEmpty(heatPumpType))
             {
                 alert('Please Enter "DESIRED HEAT PUMP TYPE" Under HOME INFORMATION');
                 return false;             
             }

             if(heatPumpType == 1 && isEmpty(tonnageToInstal))
             {
                 alert('Please Enter "TOTAL TONNAGE TO INSTALL IN HOME"');
                 return false;             
             }

      
             if(heatPumpType == 2 && isEmpty(tonnageToInstal) && isEmpty(numberOfHeads) )
             {
                 alert('Please Enter "NUMBER OF INDOOR HEADS TO INSTALL"');
                 return false;             
             }             
         }
    


      
    }
  


  

    if(recType == 'customer' )
    {
           var custProgram = thisRec.getValue({ fieldId: "custentity6" });

       	   if(!custProgram )
		   {

                 alert('Please Enter A Value for "PROGRAM" ');
                 return false;  

           }      
    }









  

  
    if(recType == 'salesorder' )
    {



           var accountStatus = thisRec.getValue({ fieldId: "custbody_suitecrm_account_status" });
           var cancelReason =  thisRec.getValue({ fieldId: "custbody_reason_for_cancellation" });
           var cancelComments = thisRec.getValue({ fieldId: "custbody_reason_for_cancel_comments" });
     
      
       	   if(accountStatus == '21')
		   {
               if(!cancelReason || !cancelComments )
               {
                 alert('Please Enter "REASON FOR CANCELLATION " and "COMMENTS" ');
                 return false;      
               }          
           } 





        if(user.department == 6 || user.department == 9 ) 
       {
             var childProg = thisRec.getText({ fieldId: "class" });         
       
             if(childProg.startsWith('Residential'))
             {
                log.error('childProg', childProg );
             
                var partnerCashDeal = thisRec.getValue({ fieldId: "custbody_financing_partnercash_deal" });
                var initDepTaken = thisRec.getValue({ fieldId: "custbody_initial_deposit_taken" });               
                var initDepAmount = thisRec.getValue({ fieldId: "custbody_initial_deposit_amount" });
                var initDepDate = thisRec.getValue({ fieldId: "custbody_initial_deposit_date" });

                var cashDealTaken = thisRec.getValue({ fieldId: "custbodycash_deal_50_deposit" });
                var cashDealTakenAmt = thisRec.getValue({ fieldId: "custbody_50_deposit_amount" });
                var cashDealTakenDate = thisRec.getValue({ fieldId: "custbody_50_deposit_date" });


                var amountFinanced = thisRec.getValue({ fieldId: "custbody_amount_financed" });
                var loanNumber = thisRec.getValue({ fieldId: "custbody_loan_number" });
                var typeOfFinance = thisRec.getValue({ fieldId: "custbody_type_of_finance_offer" });
                var financeOffer = thisRec.getValue({ fieldId: "custbody_finance_offer" });

                var auditComplete = thisRec.getValue({ fieldId: "custbodyaudit_complete" });
                var auditDate = thisRec.getValue({ fieldId: "custbody_date_audit_booked" });
                var serrviceOrg = thisRec.getValue({ fieldId: "custbody_service_organization" });


                if(!partnerCashDeal )
               {
                  alert('Please Enter "FINANCING PARTNER/CASH DEAL" under ORDER INFORMATION ');
                  return false;      
               }
               if(isEmpty(initDepTaken ))
               {
                  alert('Please Make a Selection for "INITIAL DEPOSIT TAKEN" under ORDER INFORMATION ');
                  return false;      
               }     
            

               if(initDepTaken == 1 && !initDepAmount )
               {
                  alert('Please Enter "INITIAL DEPOSIT AMOUNT" under ORDER INFORMATION ');
                  return false;      
               }

               if(initDepTaken == 1 && initDepAmount && !initDepDate  )
               {
                  alert('Please Enter "INITIAL DEPOSIT DATE" under ORDER INFORMATION ');
                  return false;      
               }

            

               if(cashDealTaken == true && !cashDealTakenAmt  )
               {
                  alert('Please Enter "50% DEPOSIT AMOUNT" under ORDER INFORMATION ');
                  return false;      
               }

               if(cashDealTaken == true && cashDealTakenAmt && !cashDealTakenDate )
               {
                  alert('Please Enter "50% DEPOSIT DATE" under ORDER INFORMATION ');
                  return false;      
               }               



//PARTNER CASH DEAL CONDITIONAL LOGIC
               
                if(partnerCashDeal != 3 && isEmpty(amountFinanced) )
               {
                  alert('Please Enter "AMOUNT FINANCED" under ORDER INFORMATION ');
                  return false;      
               }

                if(partnerCashDeal != 3 && amountFinanced && isEmpty(loanNumber) )
               {
                  alert('Please Enter "LOAN NUMBER" under ORDER INFORMATION ');
                  return false;      
               }
            
                if(partnerCashDeal != 3 && amountFinanced && loanNumber && isEmpty(typeOfFinance)  )
               {
                  alert('Please Enter "TYPE OF FINANCE OFFER" under ORDER INFORMATION ');
                  return false;      
               }
  
                if(partnerCashDeal != 3 && amountFinanced && loanNumber && typeOfFinance  && isEmpty(financeOffer) )
               {
                  alert('Please Enter "FINANCE OFFER TERMS" under ORDER INFORMATION');
                  return false;      
               }


//AUDIT CONDITIONAL LOGIC
               
                if(auditComplete == true && !auditDate  )
               {
                  alert('Please Enter "AUDIT DATE" under ORDER INFORMATION  > AUDITS  ');
                  return false;   
                 
               }

                if(auditComplete == true && auditDate && isEmpty(serrviceOrg) )
               {
                  alert('Please Enter "SERVICE ORGANIZATION" under ORDER INFORMATION  > AUDITS ');
                  return false;   
                 
               }
                                
               
           }
           
       }


   
     }


       return true;    

  
}


 function toSuitelet(recType,recId)
 {

    var user = runtime.getCurrentUser(); 
            
     var empRec = record.load({
		 type: record.Type.EMPLOYEE,
		id: user.id,
		isDynamic: true,
        });
            
      var userEmail = empRec.getValue({'fieldId':'email'});


   
     var suitletURL = url.resolveScript({
         scriptId: 'customscript_1clck_sl_download_pics',
         deploymentId: 'customdeploy_1clck_sl_download_pics',
         returnExternalUrl: false
            });
        suitletURL += '&recType=' + recType;
        suitletURL += '&recId=' + recId;
        alert('An Email Will Be Sent To "'+userEmail+'" To Download Zip File.  Click OK To Proceed.');            
        window.location = suitletURL;
            
 } 



function refreshPage(ID, sub, addy)
{
    
      var smdSlUrl = url.resolveRecord({
          recordType: 'invoice',
          recordId: ID,
          isEditMode: true
        });

	    smdSlUrl +=	'&subsid='+ sub +'&address='+ addy;
	    window.ischanged = true;
	    window.location = smdSlUrl;
}



function getParameterFromURL()
{
      var query = window.location.search.substring(1);
          var vars = query.split("&");

          for (var i=0;i<vars.length;i++) 
          {
            var pair = vars[i].split("=");
            if(pair[0] == param){
             return decodeURIComponent(pair[1]);} 
          }
          return(false);
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
                if ((stValue == '')){return true;}
            }
            else if (stValue instanceof Array)
            {
                    if (stValue.length == 0){return true;}
            }
                return false;
        }
}



    return {
    	pageInit: pageInit,
      	fieldChanged: fieldChanged,
        validateLine: validateLine,
        saveRecord: saveRecord,
        toSuitelet: toSuitelet
    };

});





