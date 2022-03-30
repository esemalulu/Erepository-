//last update date: New - Create revenue snapshot in custom record 

function createRevSnapshotMain(type)
{
    /* script parameters */  
    var snapshotdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_rev_snapshot_date');
    var fromdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_rev_date_from');
    var todate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_rev_date_to');
       
       
    // Search record existence in custom record
    var arrFilter = new Array(); 
      
    nlapiLogExecution('DEBUG','param-snapshot date: '+snapshotdate) ;
    nlapiLogExecution('DEBUG','param-from date: '+fromdate) ;
    nlapiLogExecution('DEBUG','param-to date: '+todate) ;
    
 /*
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_rev_snapshot_date', null, 'on', snapshotdate  ); 
    arrFilter[1] = new nlobjSearchFilter('custrecord_liv_rev_date', null, 'within', fromdate, todate  ); 

	//Define search columns
	
	var arrColumns = new Array();
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_rev_composite_id'));
	
	//Execute search
	    
	var arrResult = nlapiSearchRecord('customrecord_liv_revenue_snapshot', null, arrFilter, arrColumns);
		

    if(arrResult) //  found - delete records first
        {

         for (var i = 0;  i < arrResult.length; i++)
         {
           nlapiLogExecution('DEBUG','arrResult:'+ arrResult.length) ;
        
           var current_rec = arrResult[i];
           var rec_id = current_rec.getId();
           var compositeid = current_rec.getValue('custrecord_liv_rev_composite_id');
       
           nlapiLogExecution('DEBUG','Composite ID:'+ compositeid) ;
           nlapiLogExecution('DEBUG','Delete record with Internal ID+Line Id : '+compositeid) ;
           
           nlapiDeleteRecord('customrecord_liv_revenue_snapshot', rec_id);
                
           nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
           processRecords(type, fromdate, todate) ;
          
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
              
         }  //end for loop

        }
      //  else
      //  {
      
      */
           nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
           processRecords(type, fromdate, todate) ;
           
              
             // Get the remaining usage points of the scripts
                var usage = nlapiGetContext().getRemainingUsage();
                nlapiLogExecution('DEBUG','Remaining Usage Main'+ usage) ;
           
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
            
          
       // }

} // end function

function processRecords(type,fromdate, todate)
{  
try
{
       //get data from saved search
       
       var arrFilter = new Array(); 
       
       arrFilter[0] = new nlobjSearchFilter('trandate', null, 'within', fromdate, todate  ); 
       var arrResult = nlapiSearchRecord('transaction','customsearch_liv_rev_snapshot', arrFilter , null);
       nlapiLogExecution('DEBUG','arrResult.length:'+ arrResult.length) ;
	   
	   
        if(arrResult)
        {
          for (var i = 0;  i < arrResult.length; i++)
           {
           
              // Get the remaining usage points of the scripts
              var usage = nlapiGetContext().getRemainingUsage();
              nlapiLogExecution('DEBUG','Remaining Usage'+ usage) ;

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
                 
               var results=arrResult[i];
               var columns=results.getAllColumns();  
               
               var snapshotdate      = results.getValue(columns[0]); 
               var subsidiary        = results.getValue(columns[1]); 
               var compositeid       = results.getValue(columns[2]);
               var trandate          = results.getValue(columns[3]);
               var period            = results.getText(columns[4]);
               var periodyear        = results.getValue(columns[5]);
               var sortorder         = results.getValue(columns[6]);
               var type              = results.getText(columns[7]);
               var docno             = results.getValue(columns[8]);
               var contractno        = results.getValue(columns[9]);
               var btcompanyname     = results.getValue(columns[10]);
               var btcustomerorig    = results.getValue(columns[11]);
               var btsfaccountid     = results.getValue(columns[12]);
               var stcustomer        = results.getValue(columns[13]);
               var stcompanyname     = results.getValue(columns[14]);
               var stcustomerorig    = results.getValue(columns[15]);
               var stsfaccountid     = results.getValue(columns[16]);
               var clientcode        = results.getValue(columns[17]);
               var item              = results.getValue(columns[18]);
               var account           = results.getValue(columns[19]);
               var quantity          = results.getValue(columns[20]);
               var memo              = results.getValue(columns[21]);
               var amount            = results.getValue(columns[22]);
               var invbtstate        = results.getValue(columns[23]);
               var qbnamemapped      = results.getValue(columns[24]);
               
               nlapiLogExecution('AUDIT','arrResult.length:'+ arrResult.length) ;
               nlapiLogExecution('DEBUG','Snapshot Date:'+ snapshotdate) ;
               nlapiLogExecution('DEBUG','Subsidiary:'+ subsidiary) ;
               nlapiLogExecution('DEBUG','Composite ID:'+ compositeid) ;
               nlapiLogExecution('DEBUG','Date:'+ trandate) ;
               nlapiLogExecution('DEBUG','Period:'+ period) ;
               nlapiLogExecution('DEBUG','Period Year:'+ periodyear) ;
               nlapiLogExecution('DEBUG','Sort Order:'+ sortorder) ;
               nlapiLogExecution('DEBUG','Type:'+ type) ;
               nlapiLogExecution('DEBUG','Docno:'+ docno) ;
               nlapiLogExecution('DEBUG','Contract No:'+ contractno) ;
               nlapiLogExecution('DEBUG','BT Company Name:'+ btcompanyname) ;
               nlapiLogExecution('DEBUG','BT Customer Orig:'+ btcustomerorig) ;
               nlapiLogExecution('DEBUG','BT SF Account ID:'+ btsfaccountid) ;
               nlapiLogExecution('DEBUG','ST Customer:'+ stcustomer) ;
               nlapiLogExecution('DEBUG','ST Company Name:'+ stcompanyname) ;
               nlapiLogExecution('DEBUG','ST Customer Orig:'+ stcustomerorig) ;
               nlapiLogExecution('DEBUG','ST SF Account ID:'+ stsfaccountid) ;
               nlapiLogExecution('DEBUG','Client Code:'+ clientcode) ;
               nlapiLogExecution('DEBUG','Item:'+ item) ;
               nlapiLogExecution('DEBUG','Account:'+ account) ;
               nlapiLogExecution('DEBUG','Quantity:'+ quantity) ;
               nlapiLogExecution('DEBUG','Memo:'+ memo) ;
               nlapiLogExecution('DEBUG','Amount:'+ amount) ;
               nlapiLogExecution('DEBUG','Inv BT State:'+ invbtstate) ;
               nlapiLogExecution('DEBUG','QB Name Mapped:'+ qbnamemapped) ;

               var record = nlapiCreateRecord('customrecord_liv_revenue_snapshot', {recordmode:'dynamic'});
 
	           record.setFieldValue('custrecord_liv_rev_snapshot_date', snapshotdate);
	           record.setFieldValue('custrecord_liv_rev_composite_id', compositeid);
	           record.setFieldValue('custrecord_liv_rev_subsidiary', subsidiary);
	           record.setFieldValue('custrecord_liv_rev_date', trandate);
	           record.setFieldValue('custrecord_liv_rev_period', period);
	           record.setFieldValue('custrecord_liv_rev_period_year', periodyear); 
	           record.setFieldValue('custrecord_liv_rev_sort_order', sortorder);
	           record.setFieldValue('custrecord_liv_rev_type', type);
	           record.setFieldValue('custrecord_liv_rev_document_number', docno);
	           record.setFieldText('custrecord_liv_rev_bt_company_name', btcompanyname);
	           record.setFieldValue('custrecord_liv_rev_bt_customer_orig', btcustomerorig);
	           record.setFieldValue('custrecord_liv_rev_bt_sf_account_id', btsfaccountid);
	           record.setFieldText('custrecord_liv_rev_st_customer', stcustomer);
	           record.setFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
	           record.setFieldValue('custrecord_liv_rev_st_customer_orig', stcustomerorig);
	           record.setFieldValue('custrecord_liv_rev_st_sf_account_id', stsfaccountid);
	           record.setFieldValue('custrecord_liv_rev_st_contract_number', contractno);
	           record.setFieldValue('custrecord_liv_rev_client_code', clientcode);
	           record.setFieldValue('custrecord_liv_rev_item', item);
	           record.setFieldValue('custrecord_liv_rev_account', account);
	           record.setFieldValue('custrecord_liv_rev_memo', memo);
	           record.setFieldValue('custrecord_liv_rev_amount', amount);
	           record.setFieldValue('custrecord_liv_rev_qb_name_mapped', qbnamemapped);
	           
	           
	           var strRecID = nlapiSubmitRecord(record, true, true);
	             

            
            
	       
               
            } // end for loop
            
                // Get the remaining usage points of the scripts
                var usage = nlapiGetContext().getRemainingUsage();
                nlapiLogExecution('DEBUG','Remaining Usage'+ usage) ;

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
            
            
         } //if(arrResult)
         
         

 }catch(error) 
 {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for Internal ID+Line ID: '+compositeid, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('Create Invoice','',compositeid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Internal ID+Line ID : '+compositeid, error.toString());
			throw nlapiCreateError('Create Revenue Snapshot ','',+compositeid,'Undefined Error Code', error.toString());
	   }
  }



} // end function processRecords



