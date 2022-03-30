//New: 04/18/18
//9/5/18 - Add amortization template parameter
//last update date: 10/02/18 - Add Save Search Parameter
//last update date: 11/26/18 - change setFieldText to setFieldValue for clientcode
//last update date: 12/04/18 - add contract number
//07/07/2020: Added searchAllRecord function

function CreateDeferredRevRec()
{
 try
 {
 
       // Search Deferred Revenue
       
        // Get the value of the Date parameter 
       var fromdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_dfr_from_date');
       var todate = nlapiGetContext().getSetting('SCRIPT', 'custscript_dfr_to_date');
       var p_account = nlapiGetContext().getSetting('SCRIPT', 'custscript_rev_account');
       var p_contraaccount = nlapiGetContext().getSetting('SCRIPT', 'custscript_contra_rev_account');
       var p_deferredrevacct = nlapiGetContext().getSetting('SCRIPT', 'custscript_def_rev_account');
       var p_amorttemplate = nlapiGetContext().getSetting('SCRIPT', 'custscript_amort_template');
       var p_savedsearchid = nlapiGetContext().getSetting('SCRIPT', 'custscript_def_rev_saved_search_id');
       
       nlapiLogExecution('DEBUG','param-from date: '+fromdate) ;
       nlapiLogExecution('DEBUG','param-to date: '+todate) ;
       nlapiLogExecution('DEBUG','deferred cogs acct: '+p_deferredrevacct) ;
       nlapiLogExecution('DEBUG','account: '+p_account) ;
       nlapiLogExecution('DEBUG','amort template: '+p_amorttemplate) ;
       nlapiLogExecution('DEBUG','saved search id: '+p_savedsearchid) ;
 
       
	   var today = new Date();
	   var lineno = 0;
	   var prevdocno = null;
    
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('trandate', null, 'within', fromdate, todate  ); 
     
	
	   //var arrResult = nlapiSearchRecord('transaction','customsearch_liv_deferred_rev_script', arrFilter , null);
	   //var arrResult = nlapiSearchRecord('transaction',p_savedsearchid, arrFilter , null);
	   var arrResult = searchAllRecord('transaction',p_savedsearchid, arrFilter , null);
	     	
  		nlapiLogExecution('DEBUG', 'VALUE', 'Start Script');
  
        var deferredrevid = 0;
        
  		if(arrResult)
  		{
    		for (var i = 0;  i < arrResult.length; i++)

      		{
      		    nlapiLogExecution('DEBUG', 'VALUE', 'counter i : '+i);
      		    
      		    var customrecord = arrResult[i];
                var columns =customrecord.getAllColumns(); 
      		 
                var recordid = customrecord.getValue(columns[0]); 
                nlapiLogExecution('DEBUG', 'VALUE', 'recordid : '+recordid);
      		    
             	
             	               
                deferredrevid = createRec(customrecord, p_deferredrevacct, p_contraaccount, p_account, p_amorttemplate ) ;   
             	
             	nlapiLogExecution('DEBUG', 'VALUE', 'deferredrevid : '+deferredrevid);
             	
            
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
		   nlapiLogExecution('DEBUG', 'Process Error for Invoice Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('Create Deferred Rev Error','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Invoice Internal ID : '+invadjustmentid, error.toString());
			throw nlapiCreateError('Create Deferred Rev Error','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end 

function createRec(customrecord,p_deferredrevacct, p_contraaccount, p_account, p_amorttemplate)
/********************************************************************************************/
/*** Purpose: Create Deferred Revenue       Record function                               ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createRec Started...');
	    
	    var today = new Date();
	    
	    var columns=customrecord.getAllColumns();  
	    
	    var deferredrevacct = p_deferredrevacct;
	    var revacct = p_account;
	    var contrarevacct = p_contraaccount;
	    var amorttemplate = p_amorttemplate;

               var recordid =customrecord.getValue(columns[0]); 
			   var trandate =customrecord.getValue(columns[1]); 
               var period = customrecord.getText(columns[2]);  ;   
               var trantype = customrecord.getValue(columns[3]);  ; 
               var docno = customrecord.getValue(columns[4]);  ;
               var clientcode = customrecord.getText(columns[5]);  ;
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
			   var lineno = customrecord.getValue(columns[18]);
			   var contractnumber = customrecord.getValue(columns[19]);
			   
			   var accountnum = accounttext.substr(0,5);
			   var jename = 'DFR Amort. - '+period+'-'+docno+'-'+name+'-'+lineno ;
			   
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
	
	     nlapiLogExecution('DEBUG', 'VALUE', 'contractnumber : '+contractnumber);
	     nlapiLogExecution('DEBUG', 'VALUE', 'recordid : '+recordid);
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

             
         var record = nlapiCreateRecord('customrecord_liv_deferred_revenue', {recordmode:'dynamic'});
         
       
		try
		{
		
	        record.setFieldValue('externalid', recordid+'.'+lineno);
	        record.setFieldValue('custrecord_liv_dfr_inv_id', recordid);
	        record.setFieldValue('custrecord_liv_dfr_date', formatDate(trandate));
	        record.setFieldValue('custrecord_liv_dfr_period', period);
	        record.setFieldValue('custrecord_liv_dfr_type', trantype);
	        record.setFieldValue('custrecord_liv_dfr_doc_number', docno); 
	        //record.setFieldText('custrecord_liv_dfr_client_code',clientcode);
	        record.setFieldValue('custrecord_liv_dfr_client_code',clientcode);  //112618
	        record.setFieldValue('custrecord_liv_dfr_name', name) ;
	        record.setFieldValue('custrecord_liv_dfr_category', category) ;
	        record.setFieldValue('custrecord_liv_dfr_account', revacct) ;
	        record.setFieldValue('custrecord_liv_dfr_deferred_rev_acct', deferredrevacct) ;
	        record.setFieldValue('custrecord_liv_dfr_contra_account', contrarevacct) ;
	        record.setFieldValue('custrecord_liv_dfr_memo', memo ) ;
	        record.setFieldValue('custrecord_liv_dfr_item', item) ;
	        record.setFieldValue('custrecord_liv_dfr_item_desc', itemdesc) ;
	        record.setFieldValue('custrecord_liv_dfr_qty', quantity) ;
	        record.setFieldValue('custrecord_liv_dfr_amount', amount) ;
	        record.setFieldValue('custrecord_liv_dfr_amort_je_name', jename) ;
	        //record.setFieldValue('custrecord_liv_dfr_amort_template', 'Deferred Rev 24mon') ;
	        record.setFieldValue('custrecord_liv_dfr_amort_template', amorttemplate) ;
	        record.setFieldValue('custrecord_liv_dfr_amort_start_date', startdate) ;
	        record.setFieldValue('custrecord_liv_dfr_subsidiary', subsidiary) ;
	        record.setFieldValue('custrecord_liv_dfr_contract_number', contractnumber) ;
	   
            var strRecID = nlapiSubmitRecord(record, true, true);
                
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'create Record Ended Sucessfully');
	
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);

		}catch(error)
		{
			if (error.getDetails != undefined) 
			{
				nlapiLogExecution('DEBUG', 'Record creation error for invoice internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
                throw error;
			}
			else 
			{    
				nlapiLogExecution('DEBUG', 'Unexpected record creation error for invoice internal id : '+recordid, error.toString());
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

function searchAllRecord (recordType, searchId, searchFilter, searchColumns)
{
	var arrSearchResults = [];
	var count=1000, min=0, max=1000;

	var searchObj = false;

	if (searchId) 
	{
		searchObj = nlapiLoadSearch(recordType, searchId);
		if (searchFilter)
		{
			searchObj.addFilters(searchFilter);
		}
			
		if (searchColumns)
		{
			searchObj.addColumns(searchColumns);
		}			
	} 
	else 
	{
		searchObj = nlapiCreateSearch(recordType, searchFilter, searchColumns);
	}

	var rs = searchObj.runSearch();

	while( count == 1000 )
	{
		var resultSet = rs.getResults(min, max);
		arrSearchResults = arrSearchResults.concat(resultSet);
		min = max;
		max+=1000;
		count = resultSet.length;
	}

	if(arrSearchResults)
	{
		nlapiLogExecution('DEBUG', 'searchAllRecord', 'Total search results('+recordType+'): '+arrSearchResults.length);
	}
	return arrSearchResults;		
}


