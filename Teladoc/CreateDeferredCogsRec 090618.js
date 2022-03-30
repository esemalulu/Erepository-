//New: 04/18/18
//9/5/18 - Add amortization template parameter


function CreateDeferredCogsRec()
{
 try
 {
 
       // Search Deferred COGS
       
        // Get the value of the Date parameter 
       var fromdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_from_date');
       var todate = nlapiGetContext().getSetting('SCRIPT', 'custscript_to_date');
       var p_account = nlapiGetContext().getSetting('SCRIPT', 'custscript_cogs_account');
       var p_contraaccount = nlapiGetContext().getSetting('SCRIPT', 'custscript_contra_cogs_account');
       var p_deferredcogsacct = nlapiGetContext().getSetting('SCRIPT', 'custscript_def_cogs_account');
       var p_amorttemplate = nlapiGetContext().getSetting('SCRIPT', 'custscript_def_cogs_amort_template');
       
       nlapiLogExecution('DEBUG','param-from date: '+fromdate) ;
       nlapiLogExecution('DEBUG','param-to date: '+todate) ;
       nlapiLogExecution('DEBUG','deferred cogs acct: '+p_deferredcogsacct) ;
       nlapiLogExecution('DEBUG','account: '+p_account) ;
       nlapiLogExecution('DEBUG','account: '+p_amorttemplate) ;
 
       
	   var today = new Date();
	   var lineno = 0;
	   var prevdocno = null;
    
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('trandate', null, 'within', fromdate, todate  ); 
     
	
	   var arrResult = nlapiSearchRecord('transaction','customsearch_liv_deferred_cogs_shipments', arrFilter , null);
  
  	
  		nlapiLogExecution('DEBUG', 'VALUE', 'Start Script');
  
        var deferredcogsid = 0;
        
  		if(arrResult)
  		{
    		for (var i = 0;  i < arrResult.length; i++)

      		{
      		    nlapiLogExecution('DEBUG', 'VALUE', 'counter i : '+i);
      		    
      		    var customrecord = arrResult[i];
                var columns =customrecord.getAllColumns(); 
      		 
                var invadjustmentid = customrecord.getValue(columns[0]); 
                nlapiLogExecution('DEBUG', 'VALUE', 'invadjustmentid : '+invadjustmentid);
      		    
             	
             	               
                deferredcogsid = createRec(customrecord, p_deferredcogsacct, p_contraaccount, p_account, p_amorttemplate ) ;   
             	
             	nlapiLogExecution('DEBUG', 'VALUE', 'deferredcogsid : '+deferredcogsid);
             	
             	/*
             	if(partnercommid)
             	{
             	   var bsrecord = nlapiLoadRecord('customrecord_liv_billing_summary',recordid, {recordmode: 'dynamic'});
             	   bsrecord.setFieldValue('custrecord_liv_bs_ns_partner_comm_id', partnercommid) ;
             	   var bsrecid = nlapiSubmitRecord(bsrecord, true, true);
             	   nlapiLogExecution('DEBUG', 'VALUE', 'bsrecid : '+bsrecid);
             	   
             	} 
                */
            
             	nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);

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
   

       		} //end for loop
   		 } // arrResult
  
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for Inv Adjustment Internal ID : '+invadjustmentid, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('Create Deferred Cogs Error','',invadjustmentid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Inv Adjustment Internal ID : '+invadjustmentid, error.toString());
			throw nlapiCreateError('Create Deferred Cogs Error','',+invadjustmentid,'Undefined Error Code', error.toString());
	   }
  }
} // end 

function createRec(customrecord,p_deferredcogsacct, p_contraaccount, p_account, p_amorttemplate)
/********************************************************************************************/
/*** Purpose: Create Deferred COGS       Record function                                  ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createRec Started...');
	    
	    var today = new Date();
	    
	    var columns=customrecord.getAllColumns();  
	    
	    var deferredcogsacct = p_deferredcogsacct;
	    var cogsacct = p_account;
	    var contracogsacct = p_contraaccount;
	    var amorttemplate = p_amorttemplate;

               var invadjustmentid =customrecord.getValue(columns[0]); 
			   var trandate =customrecord.getValue(columns[1]); 
               var period = customrecord.getText(columns[2]);  ;   
               var trantype = customrecord.getValue(columns[3]);  ; 
               var docno = customrecord.getValue(columns[4]);  ;
               var clientcode = customrecord.getValue(columns[5]);  ;
               var name = customrecord.getValue(columns[6]); 
               var category = customrecord.getValue(columns[7]);
               var account = customrecord.getValue(columns[8]);
               var accounttext = customrecord.getText(columns[8]);
               var memo = customrecord.getValue(columns[9]);
			   var item = customrecord.getValue(columns[10]);
               var itemdesc = customrecord.getValue(columns[11]);
			   var location = customrecord.getValue(columns[12]);
			   var adjtype = customrecord.getValue(columns[13]);
			   var quantity = customrecord.getValue(columns[14]);
			   var amount = customrecord.getValue(columns[15]);
			   var billable = customrecord.getValue(columns[16]);
			   var subsidiary = customrecord.getValue(columns[17]);
			   
			   var accountnum = accounttext.substr(0,5);
			   var jename = 'DFC Amort. - '+period+'-'+trantype+' '+invadjustmentid ;
			   
			   var newdate = new Date(trandate);
			   var year = newdate.getFullYear();
               var startdate = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + "/01/" +year ;
               nlapiLogExecution('DEBUG', 'VALUE', 'startdate : '+startdate);
			/*   
			   if ((billable <> '0') || (billable <> '1'))
			   {
			      billable = '0' ; 
			   }
			   */
	
	     nlapiLogExecution('DEBUG', 'VALUE', 'invadjustmentid : '+invadjustmentid);
	     nlapiLogExecution('DEBUG', 'VALUE', 'trandate : '+trandate);
	     nlapiLogExecution('DEBUG', 'VALUE', 'period : '+period);
	     nlapiLogExecution('DEBUG', 'VALUE', 'trantype : '+trantype);
	     nlapiLogExecution('DEBUG', 'VALUE', 'docno : '+docno);
	     nlapiLogExecution('DEBUG', 'VALUE', 'clientcode : '+clientcode);
	     nlapiLogExecution('DEBUG', 'VALUE', 'name : '+name);
	     nlapiLogExecution('DEBUG', 'VALUE', 'category : '+category);
	     nlapiLogExecution('DEBUG', 'VALUE', 'account : '+account);
	     nlapiLogExecution('DEBUG', 'VALUE', 'accounttext : '+accounttext);
	     nlapiLogExecution('DEBUG', 'VALUE', 'memo : '+memo);
	     nlapiLogExecution('DEBUG', 'VALUE', 'item : '+item);
	     nlapiLogExecution('DEBUG', 'VALUE', 'itemdesc : '+itemdesc);
	     nlapiLogExecution('DEBUG', 'VALUE', 'location : '+location);
	     nlapiLogExecution('DEBUG', 'VALUE', 'adjtype : '+adjtype);

             
         var record = nlapiCreateRecord('customrecord_liv_deferred_cogs', {recordmode:'dynamic'});
         
       
		try
		{
		
	        record.setFieldValue('externalid', invadjustmentid+'-'+location);
	        record.setFieldValue('custrecord_liv_dfc_inv_adj_id', invadjustmentid);
	        record.setFieldValue('custrecord_liv_dfc_date', formatDate(trandate));
	        record.setFieldValue('custrecord_liv_dfc_period', period);
	        record.setFieldValue('custrecord_liv_dfc_type', trantype);
	        record.setFieldValue('custrecord_liv_dfc_doc_number', docno); 
	        record.setFieldText('custrecord_liv_dfc_client_code',clientcode);
	        record.setFieldValue('custrecord_liv_dfc_name', name) ;
	        record.setFieldValue('custrecord_liv_dfc_category', category) ;
	        record.setFieldValue('custrecord_liv_dfc_account', cogsacct) ;
	        record.setFieldValue('custrecord_liv_dfc_deferred_cogs_acct', deferredcogsacct) ;
	        record.setFieldValue('custrecord_liv_dfc_contra_account', contracogsacct) ;
	        record.setFieldValue('custrecord_liv_dfc_memo', memo ) ;
	        record.setFieldValue('custrecord_liv_dfc_item', item) ;
	        record.setFieldValue('custrecord_liv_dfc_item_desc', itemdesc) ;
	        record.setFieldValue('custrecord_liv_dfc_location', location) ;
	        record.setFieldValue('custrecord_liv_dfc_adj_type', adjtype) ;
	        record.setFieldValue('custrecord_liv_dfc_qty', quantity) ;
	        record.setFieldValue('custrecord_liv_dfc_amount', amount) ;
	        record.setFieldValue('custrecord_liv_dfc_billable', billable) ;
	        record.setFieldValue('custrecord_liv_dfc_amort_je_name', jename) ;
	        //record.setFieldValue('custrecord_liv_dfc_amort_template', 'Deferred COGS 24mon') ;
	        record.setFieldValue('custrecord_liv_dfc_amort_template', amorttemplate) ;
	        record.setFieldValue('custrecord_liv_dfc_amort_start_date', startdate) ;
	        record.setFieldValue('custrecord_liv_dfc_subsidiary', subsidiary) ;
	   
            var strRecID = nlapiSubmitRecord(record, true, true);
                
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'create Record Ended Sucessfully');
	
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);

		}catch(error)
		{
			if (error.getDetails != undefined) 
			{
				nlapiLogExecution('DEBUG', 'Record creation error for inv adjustment internal id: '+invadjustmentid, error.getCode() + ': ' + error.getDetails());
                throw error;
			}
			else 
			{    
				nlapiLogExecution('DEBUG', 'Unexpected record creation error for inv adjustment internal id : '+invadjustmentid, error.toString());
                throw error;
			}
		}

        return (strRecID) ;
        
        
	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createRec Ended Sucessfully');
}

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
   
function convertdate(inputdate, inputformat) 
{


  var newdate = new Date(inputdate);
   
    
   if (inputformat == 'MMDDYY')
   {
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + ("0" + newdate.getDate().toString()).substr(-2)  +  (newdate.getFullYear().toString()).substr(2);
 
     return datestring ;
   }  
   if (inputformat == 'MM/DD/YY')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + "/" + ("0" + newdate.getDate().toString()).substr(-2)  + "/" + (newdate.getFullYear().toString()).substr(2);
     
     return datestring ;
   }  
   if (inputformat == 'YYYY-MM')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var year = newdate.getFullYear();
     var datestring = year + "-" + ("0" + (newdate.getMonth() + 1).toString()).substr(-2) 

      nlapiLogExecution('DEBUG','datestring : '+ datestring) ;
     
     return datestring ;
   }  
   if (inputformat == 'MONTHYY')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;

     var monthNames = [
     "January", "February", "March",
     "April", "May", "June", "July",
     "August", "September", "October",
     "November", "December"
        ];

     var day = newdate.getDate();
     var monthIndex = newdate.getMonth();
     var year = newdate.getFullYear();
     
     var datestring =  monthNames[monthIndex] + ' ' + year;
     
     return datestring ;
   }  


}



