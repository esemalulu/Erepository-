/* Last Updated: 15-Jun-2017 */
/* 08/02/17 - comment out mtd attrition and mtd lapsed from save search */
/* 04/12/18 - NS146 - update jira key, sign date, launch date */
/* 09/24/18 - NS-214 - update current enrolled */
/* 11/12/18 - NS-236 - retrieve pricing and billing attributes from Contracts custom record */
/* 05/07/19 - Enhance to support SF fields */

function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
      
      // Search record existence in custom record
       var arrFilter = new Array(); 
      // var period = nlapiGetFieldValue('custrecord_liv_enrm_period');
      // var pccode = nlapiGetFieldValue('custrecord_liv_enrm_client_code');
      
      var period = nlapiGetFieldValue('custrecord_liv_enrm_period');
      var contractnumber = nlapiGetFieldValue('custrecord_liv_enrm_contract_number');
      var program = nlapiGetFieldValue('custrecord_liv_enrm_program');
       
       nlapiLogExecution('DEBUG','Period value:'+ period) ;
       nlapiLogExecution('DEBUG','Contract Number:'+ contractnumber) ;
       nlapiLogExecution('DEBUG','Program:'+ program) ;
    
	   arrFilter[0] = new nlobjSearchFilter('custrecord_liv_enrm_period', null, 'is',  period ); 
	   arrFilter[1] = new nlobjSearchFilter('custrecord_liv_enrm_contract_number', null, 'is',  contractnumber ); 
	   arrFilter[2] = new nlobjSearchFilter('custrecord_liv_enrm_program', null, 'is',  program ); 

	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('custrecord_liv_enrm_period'));
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_enrollment', null, arrFilter, arrColumns);
		
		nlapiLogExecution('DEBUG','Period value:'+ period) ;
	
		

       if(arrResult) //  found - delete records first
        {
           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
           nlapiDeleteRecord('customrecord_liv_enrollment', rec_id);

         }
         
        
        
        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
        processRecords(type) ;
   

  }

} // end function beforeSumit




function processRecords(type)
{   

      var newId = nlapiGetRecordId();
      var newType = nlapiGetRecordType();
      var clientcode = nlapiGetFieldValue('custrecord_liv_enrm_client_code');
      var period = nlapiGetFieldValue('custrecord_liv_enrm_period');
      var mtd_enrollees = nlapiGetFieldValue('custrecord_liv_enrm_mtd_enrollees');
      var ltd_enrollees = nlapiGetFieldValue('custrecord_liv_enrm_cum_enrollees');
      var jira_key = nlapiGetFieldValue('custrecord_liv_enrm_jira_key'); //NS-146
      var sign_date = nlapiGetFieldValue('custrecord_liv_enrm_sign_date'); //NS-146
      var launch_date = nlapiGetFieldValue('custrecord_liv_enrm_launch_date'); //NS-146
      var enrollment_method = nlapiGetFieldValue('custrecord_liv_enrm_enrollment_method'); //NS-146
      var client_type = nlapiGetFieldValue('custrecord_liv_enrm_client_type'); //NS-146
      var eligible_pwds = nlapiGetFieldValue('custrecord_liv_enrm_eligible_pwds'); //NS-146
      var current_enrolled = nlapiGetFieldValue('custrecord_liv_enrm_current_enrolled'); //NS-214
      var contractnumber = nlapiGetFieldValue('custrecord_liv_enrm_contract_number');
      
      var name = nlapiGetFieldValue('name');
      
      nlapiLogExecution('DEBUG','<Before Submit Script> type:'+type+', RecordType: '+newType+', Id:'+newId);
      nlapiLogExecution('DEBUG','Client Code value:'+ clientcode) ;
      
      if (clientcode == null)
      { 
         clientcode = 'N/A' ;
       }
    
       
      //var pccodeID = getPromoCodeId(clientcode) ;  05/07/19
      
     // nlapiLogExecution('DEBUG','PCCodeID value:'+ pccodeID) ;
      

  
      
// Search for Client in Contracts

       var arrFilter = new Array(); 
    
	 //  arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'anyof',  [pccodeID] ); // Internal ID PromoCode in Custom List
	 arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cm_contract_number', null, 'is',  contractnumber ); 
       var arrResult = nlapiSearchRecord('customrecord_liv_contracts','customsearch_liv_contracts', arrFilter, null);
       
	   
	    //Execute contract search
	    
		 var arrResult = nlapiSearchRecord('customrecord_liv_contracts','customsearch_liv_contracts', arrFilter, null);
	 	//nlapiLogExecution('DEBUG', 'VALUE', 'Customer Search Result: '+arrResult.length)
		
        if(arrResult)
        {
          for (var i = 0;  i < arrResult.length; i++)
           {
               
             var custrecord = arrResult[i];
             var columns=custrecord.getAllColumns();  

             var custrecordid = custrecord.getId();
             
             var bundleprice       = custrecord.getValue(columns[6]);
             var upfrontprice      = custrecord.getValue(columns[8]);
             var replacementprice  = custrecord.getValue(columns[11]);
             var clienttype        = custrecord.getValue(columns[23]);
             var soldtocustomer    = custrecord.getValue(columns[21]);
             var pricingmodel      = custrecord.getValue(columns[25]);
             var clientcode      = custrecord.getValue(columns[3]);
             var htnprice         = custrecord.getValue(columns[58]);
             var contractstatus         = custrecord.getValue(columns[83]);
    
       
      
         
               nlapiLogExecution('DEBUG', 'VALUE', 'Client type: '+clienttype); 
               nlapiLogExecution('DEBUG', 'VALUE', 'Sold To Customer: '+soldtocustomer);
               nlapiLogExecution('DEBUG', 'VALUE', 'Category/Pricing Model: '+pricingmodel); 
               nlapiLogExecution('DEBUG', 'VALUE', 'Bundle Price: '+bundleprice); 
               nlapiLogExecution('DEBUG', 'VALUE', 'Upfront Price: '+upfrontprice); 
               nlapiLogExecution('DEBUG', 'VALUE', 'Replacement Price: '+replacementprice); 

              nlapiSetFieldValue('custrecord_liv_enrm_ns_customer', soldtocustomer);
              nlapiSetFieldValue('custrecord_liv_enrm_ns_category', pricingmodel);
              nlapiSetFieldValue('custrecord_liv_enrm_ns_client_type', clienttype); 
              nlapiSetFieldValue('custrecord_liv_enrm_ns_pppm_price', Math.abs(parseFloat(bundleprice)));
              nlapiSetFieldValue('custrecord_liv_enrm_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
              nlapiSetFieldValue('custrecord_liv_enrm_ns_htn_pppm_price', Math.abs(parseFloat(htnprice)));
              nlapiSetFieldValue('custrecord_liv_enrm_client_code', clientcode);
              nlapiSetFieldValue('custrecord_liv_enrm_contract_status', contractstatus);
              

              // Update customer record with cumulative enrollment
              
                nlapiLogExecution('DEBUG', 'VALUE', 'Contract Record ID: '+custrecordid); 
              
              	var updaterec = nlapiLoadRecord('customrecord_liv_contracts', custrecordid);  //10 units
              	
              	updaterec.setFieldValue('custrecord_liv_cm_cumulative_enrollment', ltd_enrollees);
              	updaterec.setFieldValue('custrecord_liv_cm_launch_date', launch_date); 
              	updaterec.setFieldValue('custrecord_liv_cm_current_enrolled', current_enrolled); 
              	updaterec.setFieldValue('custrecord_liv_cm_eligible_pwds', eligible_pwds); 
              	updaterec.setFieldValue('custrecord_liv_cm_jira_key', jira_key); 
              	
             
              	
              	nlapiSubmitRecord(updaterec); //20 units
	
            }
          } // arrResult
          
        

} //end processRecords

function getPromoCodeId(pccode) //get internal id for Multi-Select custom list
{
     var col = new Array();
     var arrFilter = new Array(); 
   
     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Custom List');
     nlapiLogExecution('DEBUG','Custom List PCCode value:'+ pccode) ;
     
	 arrFilter[0] = new nlobjSearchFilter('name', null, 'is',  pccode );
	 
     col[0] = new nlobjSearchColumn('internalid');
  
     
     var results = nlapiSearchRecord('customlist_liv_pccode', null, arrFilter, col);
     
     for ( var i = 0; results != null && i < results.length; i++ )
     {
        var res = results[i];
        var listID = (res.getValue('internalId'));
  
        nlapiLogExecution('DEBUG','Custom List PCCode ID value:'+ listID) ;
        
        return listID ;
      } 
      
}

function asofdate() 
{
var asofdate = new Date();
asofdate.setDate(0); 
var tdate = asofdate.getDate();
var month = asofdate.getMonth() + 1; // jan = 0
var year = asofdate.getFullYear();
return newDate = month + '/' + tdate + '/' + year;
}
   

   