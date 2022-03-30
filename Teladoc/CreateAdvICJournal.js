//last update date: 07/02/18 NS-172



function CreateAdvICJournal()
{
 try
 {
	 
       
        // Get the value of the Date parameter 
       var fromdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_lv_er_from_date');
       var todate = nlapiGetContext().getSetting('SCRIPT', 'custscript_lv_er_to_date');
       var icaracct = nlapiGetContext().getSetting('SCRIPT', 'custscript_lv_er_ic_ar_acct');
       var icapacct = nlapiGetContext().getSetting('SCRIPT', 'custscript_lv_er_ic_ap_acct');
       var jename = nlapiGetContext().getSetting('SCRIPT', 'custscript_lv_er_ic_jename');
       var acctg_period = nlapiGetContext().getSetting('SCRIPT', 'custscript_lv_er_ic_period');
       
       
      
       nlapiLogExecution('DEBUG','param-from date: '+fromdate) ;
       nlapiLogExecution('DEBUG','param-to date: '+todate) ;
       nlapiLogExecution('DEBUG','param-icaracct: '+icaracct) ;
       nlapiLogExecution('DEBUG','param-icapacct: '+icapacct) ;
        nlapiLogExecution('DEBUG','param-journal name: '+jename) ;
        nlapiLogExecution('DEBUG','param-acctg period: '+acctg_period) ;
 
       
	   var today = new Date();
	   var lineno = 0;
	   var prevdocno = null;
    
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('trandate', null, 'within', fromdate, todate  ); 
       arrFilter[1] = new nlobjSearchFilter('postingperiod', null, 'is', acctg_period  ); 
  
     
	
	   var searchresults = nlapiSearchRecord('transaction','customsearch_liv_rf_exp_rpts_reclass', arrFilter , null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 

               
			   var results=searchresults[z];
               var columns=results.getAllColumns();  
              
               var recordid = results.getValue(columns[0]); 
               var fromsubsidiary =results.getValue(columns[1]); 
               var fromsubsidiarytxt = results.getText(columns[1]);
               var tosubsidiary =results.getValue(columns[2]); 
               var tosubsidiarytxt = results.getText(columns[2]);
               var trandate =results.getValue(columns[3]); 
               var period = results.getValue(columns[4]);  
               var docno = results.getValue(columns[5]);
               var name = results.getValue(columns[6]);
               var department = results.getValue(columns[7]);
               var account = results.getValue(columns[8]);
               var memo = results.getValue(columns[9]);
               var currency = results.getValue(columns[10]);
               var foreignamount = results.getValue(columns[11]);
               var amount = results.getValue(columns[12]);
			   
      
	           if (z == 0)
			   {
				   prevdocno = docno;
			   }
			   if (docno == prevdocno)
			   {
	               lineno = lineno +1;
			   }
			   else
			   {
                    prevdocno = docno;	
                    lineno = 1;
			   }
			   
			   
               nlapiLogExecution('DEBUG','searchresults.length: '+searchresults.length) ;
			   nlapiLogExecution('DEBUG','docno: '+docno) ;
			   

		  
			  // Create intercompany journal
			  	try
		        {
		
			      //  var icrecord = nlapiCreateRecord('intercompanyjournalentry', {recordmode:'dynamic'});
			        var icrecord = nlapiCreateRecord('advintercompanyjournalentry', {recordmode:'dynamic'});
				
				    nlapiLogExecution('DEBUG','Start Create IC Journal') ;
				
				    // set journal header
				   
					
					var jememohdr = period+' Retrofit Expense Reports Reclass' ;
				    var jememo =  name+' '+docno ;
				    var externalid = 'ICER'+'.'+jename;
					
				
				    nlapiLogExecution('DEBUG','jename: '+jename) ;
				    nlapiLogExecution('DEBUG','externalid: '+externalid) ;

			     if (z == 0)
			     {
					icrecord.setFieldValue('tranid',jename);
				    icrecord.setFieldValue('trandate', trandate);		
	                icrecord.setFieldValue('externalid', externalid);
	                icrecord.setFieldValue('memo', jememohdr); 
				    icrecord.setFieldValue('subsidiary', fromsubsidiary);
				    icrecord.setFieldValue('tosubsidiary', tosubsidiary);
				    icrecord.setFieldValue('postingperiod', period);    
				 
				    
				
				  
                    if (amount >= 0)
					{
				    nlapiLogExecution('DEBUG','Amount >= 0') ;
				    // add journal line - from subsidiary (Debit)
			        icrecord.selectNewLineItem('line');
	                icrecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                    icrecord.setCurrentLineItemValue('line', 'account', icaracct);
					icrecord.setCurrentLineItemValue('line', 'entity', 3981);  // 01-03 Retrofit
			        icrecord.setCurrentLineItemValue('line', 'department', department);
                    icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                    icrecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                    icrecord.commitLineItem('line'); 
					
				    // add journal line - from subsidiary (Credit)
			        icrecord.selectNewLineItem('line');
	                icrecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                    icrecord.setCurrentLineItemValue('line', 'account', account);
			        icrecord.setCurrentLineItemValue('line', 'department', department);
                    icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                    icrecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                    icrecord.commitLineItem('line'); 

			   
			        // add journal line - to subsidiary charge (Debit)
			        icrecord.selectNewLineItem('line');
	                icrecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                    icrecord.setCurrentLineItemValue('line', 'account', account);
			        icrecord.setCurrentLineItemValue('line', 'department', department);
                    icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                    icrecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                    icrecord.commitLineItem('line'); 
			   
			        // add journal line - to subsidiary charge - (Credit)
			       icrecord.selectNewLineItem('line');
	               icrecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                   icrecord.setCurrentLineItemValue('line', 'account', icapacct);
				   icrecord.setCurrentLineItemValue('line', 'entity', 5904); // 03-01 Livongo
			       icrecord.setCurrentLineItemValue('line', 'department', department); 
                   icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                   icrecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                   icrecord.commitLineItem('line'); 
					}
					else
					{
				    nlapiLogExecution('DEBUG','Amount < 0') ;
                    // add journal line - from subsidiary (Credit)
			        icrecord.selectNewLineItem('line');
	                icrecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                    icrecord.setCurrentLineItemValue('line', 'account', icaracct);
					icrecord.setCurrentLineItemValue('line', 'entity',3981); //01-03 Retrofit
			        icrecord.setCurrentLineItemValue('line', 'department', department);
                    icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                    icrecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                    icrecord.commitLineItem('line'); 
					
				    // add journal line - from subsidiary (Debit)
			        icrecord.selectNewLineItem('line');
	                icrecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                    icrecord.setCurrentLineItemValue('line', 'account', account);
			        icrecord.setCurrentLineItemValue('line', 'department', department);
                    icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                    icrecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                    icrecord.commitLineItem('line'); 

			   
			        // add journal line - to subsidiary charge (Credit)
			        icrecord.selectNewLineItem('line');
	                icrecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                    icrecord.setCurrentLineItemValue('line', 'account', account);
			        icrecord.setCurrentLineItemValue('line', 'department', department);
                    icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                    icrecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                    icrecord.commitLineItem('line'); 
			   
			        // add journal line - to subsidiary charge - (Debit)
			       icrecord.selectNewLineItem('line');
	               icrecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                   icrecord.setCurrentLineItemValue('line', 'account', icapacct);
				   icrecord.setCurrentLineItemValue('line', 'entity', 5904); //03-01 Livongo
			       icrecord.setCurrentLineItemValue('line', 'department', department); 
                   icrecord.setCurrentLineItemValue('line', 'memo',  jememo);
                   icrecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                   icrecord.commitLineItem('line'); 


				    }
			  
			        var strRecID = nlapiSubmitRecord(icrecord, true, true);
			        
			        }
			        else // z!= 0
			        {
			           var jerecord = nlapiLoadRecord('advintercompanyjournalentry', strRecID, {recordmode: 'dynamic'});
			           
			           if (amount >= 0)
					   {
				          nlapiLogExecution('DEBUG','Amount >= 0') ;
				         // add journal line - from subsidiary (Debit)
			              jerecord.selectNewLineItem('line');
	                      jerecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                          jerecord.setCurrentLineItemValue('line', 'account', icaracct);
					      jerecord.setCurrentLineItemValue('line', 'entity', 3981);  // 01-03 Retrofit
			              jerecord.setCurrentLineItemValue('line', 'department', department);
                          jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                          jerecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                          jerecord.commitLineItem('line'); 
					
				          // add journal line - from subsidiary (Credit)
			              jerecord.selectNewLineItem('line');
	                      jerecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                          jerecord.setCurrentLineItemValue('line', 'account', account);
			              jerecord.setCurrentLineItemValue('line', 'department', department);
                          jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                          jerecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                          jerecord.commitLineItem('line'); 

			   
			              // add journal line - to subsidiary charge (Debit)
			              jerecord.selectNewLineItem('line');
	                      jerecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                          jerecord.setCurrentLineItemValue('line', 'account', account);
			              jerecord.setCurrentLineItemValue('line', 'department', department);
                          jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                          jerecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                          jerecord.commitLineItem('line'); 
			   
			              // add journal line - to subsidiary charge - (Credit)
			              jerecord.selectNewLineItem('line');
	                      jerecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                          jerecord.setCurrentLineItemValue('line', 'account', icapacct);
				          jerecord.setCurrentLineItemValue('line', 'entity', 5904); // 03-01 Livongo
			              jerecord.setCurrentLineItemValue('line', 'department', department); 
                          jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                          jerecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                          jerecord.commitLineItem('line'); 
					   }
					   else
					   {
				           nlapiLogExecution('DEBUG','Amount < 0') ;
                           // add journal line - from subsidiary (Credit)
			               jerecord.selectNewLineItem('line');
	                       jerecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                           jerecord.setCurrentLineItemValue('line', 'account', icaracct);
					       jerecord.setCurrentLineItemValue('line', 'entity',3981); //01-03 Retrofit
			               jerecord.setCurrentLineItemValue('line', 'department', department);
                           jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                           jerecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                           jerecord.commitLineItem('line'); 
					
				           // add journal line - from subsidiary (Debit)
			               jerecord.selectNewLineItem('line');
	                       jerecord.setCurrentLineItemValue('line','linesubsidiary',fromsubsidiary); 
                           jerecord.setCurrentLineItemValue('line', 'account', account);
			               jerecord.setCurrentLineItemValue('line', 'department', department);
                           jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                           jerecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                           jerecord.commitLineItem('line'); 

			   
			               // add journal line - to subsidiary charge (Credit)
			               jerecord.selectNewLineItem('line');
	                       jerecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                           jerecord.setCurrentLineItemValue('line', 'account', account);
			               jerecord.setCurrentLineItemValue('line', 'department', department);
                           jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                           jerecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                           jerecord.commitLineItem('line'); 
			   
			               // add journal line - to subsidiary charge - (Debit)
			               jerecord.selectNewLineItem('line');
	                       jerecord.setCurrentLineItemValue('line','linesubsidiary',tosubsidiary); 
                           jerecord.setCurrentLineItemValue('line', 'account', icapacct);
				           jerecord.setCurrentLineItemValue('line', 'entity', 5904); //03-01 Livongo
			               jerecord.setCurrentLineItemValue('line', 'department', department); 
                           jerecord.setCurrentLineItemValue('line', 'memo',  jememo);
                           jerecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                           jerecord.commitLineItem('line'); 
                           
				        } //(amount >= 0)
				        var updateRecID = nlapiSubmitRecord(jerecord, true, true);
			        
			        } // End z if
			        
			  
			       // End Create Intercompany Journal
			  
			       if (strRecID)
                   {
                   // Search vendor bill to update
                  
			          nlapiLogExecution('DEBUG','Start Search/Update expense report record') ;
			          
			       
                         var errecord = nlapiLoadRecord('expensereport', recordid, {recordmode: 'dynamic'});
                       
                         
                         errecord.setFieldValue('custbody_liv_adv_ic_je_name',strRecID);
                         errecord.setFieldValue('custbody_liv_adv_ic_je_creation_date',today);
                      
                          
                          var errUpdateID = nlapiSubmitRecord(errecord, true, true);
                          
                          nlapiLogExecution('DEBUG', 'VALUE', 'erUpdateID : '+errUpdateID);
                          
                    
                
                    } //strRecID
                    
                   
					nlapiLogExecution('DEBUG', 'VALUE', 'z value : '+z);
					
                }catch(error)
		        {
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'Intercompany journal creation error for expense report: '+docno, error.getCode() + ': ' + error.getDetails());
							
						
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected Intercompany journal creation for expense report : '+docno, error.toString());
							
							
					   }
		        }
		              
		          
		   
 
                // Check Usage
			

               // Get the remaining usage points of the scripts
                var usage = nlapiGetContext().getRemainingUsage();

               // If the script's remaining usage points are bellow 1,000 ...       
               if (usage < 1000) 
               {
	             // ...yield the script
	             var state = nlapiYieldScript();
	            // Throw an error or log the yield results
	             if (state.status == 'FAILURE')
		           throw "Failed to yield script";
	               else if (state.status == 'RESUME')
		           nlapiLogExecution('DEBUG','Resuming script');
                }
               
             } //for loop
        } // end if
  	
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		  nlapiLogExecution('DEBUG', 'Intercompany journal creation error for expense report: '+docno, error.getCode() + ': ' + error.getDetails());
		  throw nlapiCreateError('Create Intercompany Journal','',+docno,error.getCode(), error.toString());
	   }
	   else 
	   {    	
		  nlapiLogExecution('DEBUG', 'Unexpected Intercompany journal creation for expense report : '+docno, error.toString());
		  throw nlapiCreateError('Create Intercompany Journal ','',+docno,'Undefined Error Code', error.toString());
	   }
  }
  
  
  
} // end function  


function formatDate(strDate)
{
	if(strDate.indexOf('/') != -1)
	{
		return strDate;
	}
	return strDate.substring(0,2)+'/'+strDate.substring(2,4)+'/'+strDate.substring(4);
}

function nvl(value1, value2)
{
  if (value1 == null)
  {
    return value2;
  }
  else
  { 
    return value1 ;
  }
}
   


