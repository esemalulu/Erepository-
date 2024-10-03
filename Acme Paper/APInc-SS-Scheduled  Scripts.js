function itemFulfilmentsDateUpdate() 
{		
		
	//Parameter values are potentially dynamic variables that may change.
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct6081_lastprocid');
    nlapiLogExecution( 'error', 'paramLastProcId', paramLastProcId )
  
    var fulFilFilters = [new nlobjSearchFilter('type',null,'anyof', ['ItemShip']), 
		                new nlobjSearchFilter('mainline',null,'is', 'T'), 
		                //new nlobjSearchFilter('custbody_apinc_processed_by_ss',null,'is', 'F'),
                        new nlobjSearchFilter('trandate',null,'with in', ['04/01/2024','04/30/2024'])];	
  
    if (paramLastProcId)
    {
		//IF the search is sorted in ASC
		fulFilFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
    }			
   var fulFilColumns = [new nlobjSearchColumn('internalid').setSort()]; 
  
   //var fulFilpSrchResults = nlapiSearchRecord ('transaction', null, fulFilFilters, fulFilColumns);

  

	//Search result will be ordered either in ASC or DESC of internal ID
	var fulFilpSrchResults = nlapiSearchRecord(null, 'customsearch5968', null, null);




  

   //Process Search results for Item Fulfillments	
   for(var i=0; fulFilpSrchResults && i < fulFilpSrchResults.length; i++)
   {	
    nlapiLogExecution('error', 'ITEM FULFILMENT ', fulFilpSrchResults[i].getValue('tranid')); 

      
   //Load the Fulfillment Record

			var fulfilRec = nlapiLoadRecord(fulFilpSrchResults[i].getRecordType(), fulFilpSrchResults[i].getId(), {recordmode:'dynamic'});
   //Grab the Sales Order that the Fulfilment was Created From    
            var salesOrder = fulfilRec.getFieldValue('createdfrom');
            var isDropShip = fulfilRec.getFieldValue('custbody_dropship_order');
           
             nlapiLogExecution('error', 'isDropShip ', isDropShip); 

   //Find the most recent Invoice created from the Sales Order
            var maxInvFilters = [new nlobjSearchFilter('type', null,'anyof','CustInvc'),
                                 //new nlobjSearchFilter('status', null,'anyof',['CustInvc:B','CustInvc:A']),
                                 new nlobjSearchFilter('createdfrom',null,'anyof', salesOrder)];       
		    var maxInvColumns = [new nlobjSearchColumn('trandate', null, 'max'),];			
		    var maxInvSrch = nlapiSearchRecord ('transaction', null, maxInvFilters, maxInvColumns); 
 
             var maxInvDate =  maxInvSrch[0].getValue('trandate', null, 'max');
             var maxInvDateMnth = nlapiStringToDate(maxInvDate).getMonth();

     		 //break;

      

      
    //------------------------------------IF ISN'T DROPSHIP--------------------------------------------------  
    if(isDropShip == 'F' || isDropShip == null)  
    {
//Search for INVOICES to update TRANDATE to maxdate
      
            var itemShipFilters = [new nlobjSearchFilter('type',null,'anyof', ['ItemShip']),
                                     new nlobjSearchFilter('createdfrom', null,'anyof',salesOrder),
                                     new nlobjSearchFilter('mainline',null,'is', 'T')];                                 
		    var  itemShipColumns = [new nlobjSearchColumn('internalid'),
                                      new nlobjSearchColumn('type'),                                      
                                      new nlobjSearchColumn('trandate'),
                                      new nlobjSearchColumn('tranid'),
                                      new nlobjSearchColumn('datecreated').setSort(true)];	//in Descending Order so that we grab the most recent Item Fulfillment
      
		   var  itemShipSrchRslts = nlapiSearchRecord ('transaction', null, itemShipFilters, itemShipColumns);  
      

          //Grab the the most recent Item Fulfillment from the Search Results that are in Desending Order by date created

          var maxItemShipDate = itemShipSrchRslts[0].getValue(itemShipColumns[2]);
          nlapiLogExecution('error', 'RECENT ITEMSHIP DATE', maxItemShipDate); 
      
		   if(maxInvDate && maxInvDate != maxItemShipDate )  
		   {	                 
                     
                     nlapiLogExecution('error', 'TYPE ', itemShipSrchRslts[0].getRecordType());

			         var trxRec = nlapiLoadRecord(itemShipSrchRslts[0].getRecordType(), itemShipSrchRslts[0].getId() ); // {recordmode:'dynamic'} 
             
                     trxRec.setFieldValue('trandate', maxInvDate);
                     trxRec.setFieldValue('custbody_apinc_processed_by_ss', 'T')
					 nlapiSubmitRecord(trxRec);	 
             
			}  
            else if(maxInvDate == maxItemShipDate )
            {
                     fulfilRec.setFieldValue('custbody_apinc_processed_by_ss', 'T')
                     nlapiSubmitRecord(fulfilRec);              
            }



   
   }  

//------------------------------------IF DROPSHIP--------------------------------------------------  

   if(isDropShip == 'T')  
   {

 //CREATE SEARCH FOR ITEM FULLFILMENTS WHERE PURCHASE ORDER IS NOT PENDING BILL
     
//Search for PURCHASE ORDER associatted to salesOrder

            var PurchOrdFilters = [new nlobjSearchFilter('type',null,'anyof', ['PurchOrd']),
                                   new nlobjSearchFilter('createdfrom', null,'anyof',salesOrder),
                                   new nlobjSearchFilter('mainline',null,'is', 'T')];                                 
		    var PurchOrdColumns = [new nlobjSearchColumn('internalid')];			
		    var  PurchOrdSrch = nlapiSearchRecord ('transaction', null, PurchOrdFilters, PurchOrdColumns);   
                      
            if(PurchOrdId)   
            {

                   var PurchOrdId = PurchOrdSrch[0].getValue(PurchOrdColumns[0]); //Get Internal ID of PO
              
                   //Search for VENDOR BILLS associatted to the above PO Search
              
                   var VendBillFilters = [new nlobjSearchFilter('type',null,'anyof', ['VendBill']),
                                          new nlobjSearchFilter('createdfrom', null,'anyof',PurchOrdId),
                                          new nlobjSearchFilter('mainline',null,'is', 'T')];                              
		           var VendBillColumns = [new nlobjSearchColumn('type'),
                                          new nlobjSearchColumn('internalid'),
                                          new nlobjSearchColumn('trandate'),
                                          new nlobjSearchColumn('tranid'),
                                          new nlobjSearchColumn('datecreated').setSort(true)];	//in Descending Order so that we grab the most recent Item Fulfillment             
		           var VendBillSrch = nlapiSearchRecord ('transaction', null, VendBillFilters, VendBillColumns);

                  
                    if(VendBillSrch && maxInvDate && maxInvDate != maxVendBillDate ) 
				    {
                          //nlapiLogExecution('error', ' RECENT VENDBILL ', VendBillSrch[0].getValue(VendBillColumns[3]));
                          var maxVendBillDate = VendBillSrch[0].getValue(VendBillColumns[2]);
                         
                           var venBillRec = nlapiLoadRecord(VendBillSrch[0].getRecordType(), VendBillSrch[0].getId());  // {recordmode:'dynamic'} 
                               
                           venBillRec.setFieldValue('trandate', maxInvDate)
					       nlapiSubmitRecord(venBillRec);                      
                           nlapiLogExecution('error', 'VENBILL SUBMIT ', VendBillSrch[0].getValue(VendBillColumns[3]));  

                      
                           fulfilRec.setFieldValue('custbody_apinc_processed_by_ss', 'T')
                           nlapiSubmitRecord(fulfilRec);   
                    
                    }
                    else if(maxInvDate == maxVendBillDate )
                    {
                           nlapiLogExecution('error', 'DATE MATCH', VendBillSrch[0].getValue(VendBillColumns[3]));  
                           fulfilRec.setFieldValue('custbody_apinc_processed_by_ss', 'T')
                           nlapiSubmitRecord(fulfilRec);              
                    }       
           }
             


   
   }     


											
              nlapiLogExecution('error', 'ITERATION ', i); 
																
			//Set % completed of script processing			
			var pctCompleted = Math.round(((i+1) / fulFilpSrchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
					
			//AFter each record is processed, you check to see if you need to reschedule
			if ((i+1)== 1000 || ((i+1) < fulFilpSrchResults.length && nlapiGetContext().getRemainingUsage() < 200)) 
			{
				//reschedule
				nlapiLogExecution('audit','Getting Rescheduled at', fulFilpSrchResults[i].getValue('internalid'));
				var rparam = new Object();
				
				rparam['custscript_sct6081_lastprocid'] = fulFilpSrchResults[i].getValue('internalid');				
				//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}



     
  }
  
}




function generalUpdates() 
{		
		
	//Parameter values are potentially dynamic variables that may change.
/*
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct51_lastprocid');
	
	var flt = null;	
	if (paramLastProcId)
	{
		flt = [];
		//IF the search is sorted in ASC
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
	}
    
*/
	
	//Search result will be ordered either in ASC or DESC of internal ID
	var searchResults = nlapiSearchRecord(null, 'customsearch5616');
	
	for (var i=0; searchResults && i < searchResults.length; i++)
	{		     

			//var trxRec = nlapiLoadRecord(searchResults[i].getRecordType(), searchResults[i].getId(), {recordmode:'dynamic',customform: '322'}); 
			var trxRec = nlapiLoadRecord(searchResults[i].getRecordType(), searchResults[i].getId(), {recordmode:'dynamic',customform: '322'}); 


				var count = trxRec.getLineItemCount('item');
				
			    for (var l = 1; l <= count; l += 1)
				{
                     var qntyReturned = trxRec.getLineItemValue('item', 'custcol_sdb_quantity_returned	', l);
                     var unitCost = trxRec.getLineItemValue('item', 'custcol_acc_unitcost', l);                  
                     //trxRec.setLineItemValue('item', 'costestimatetype', l, 'CUSTOM'); 
                     trxRec.setLineItemValue('item', 'costestimate', l, qntyReturned * unitCost); 
                 

                }

      
            //trxRec.setFieldValue('custbody_apinc_processed_by_ss', 'T')
            nlapiLogExecution('error', 'TRX ID ', searchResults[i].getId()); 
			nlapiSubmitRecord(trxRec);

																														
			//Set % completed of script processing			
			var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
					
			//AFter each record is processed, you check to see if you need to reschedule
			if ((i+1)==1 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 200)) 
			{
				//reschedule
				nlapiLogExecution('audit','Getting Rescheduled at', searchResults[i].getValue('internalid'));
				var rparam = new Object();
				
				rparam['custscript_sct51_lastprocid'] = searchResults[i].getValue('internalid');				
				//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
	
	}
		
}
	
	

