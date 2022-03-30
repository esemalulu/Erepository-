/* last updated date : 11/13/18 - NS-236 */
function afterSubmit(type)
{

  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'suitelet'))
  {
  
      var recordid= nlapiGetRecordId();

      var soldtocustomer = nlapiGetFieldValue('custrecord_liv_cm_sold_to_customer');
      var boxurl = nlapiGetFieldValue('custrecord_liv_cm_box_contract_url');
      var jirakey = nlapiGetFieldValue('custrecord_liv_cm_jira_key');
      var contractnumber = nlapiGetFieldValue('custrecord_liv_cm_contract_number');
      var clientcodeid = nlapiGetFieldValue('custrecord_liv_cm_client_code');
      var clientcodetxt =  nlapiGetFieldTexts('custrecord_liv_cm_client_code');
      var category = nlapiGetFieldValue('custrecord_liv_cm_pricing_model');
      var medicalclaims = nlapiGetFieldValue('custrecord_liv_cm_medical_claims_billing');
      
      
      nlapiLogExecution('DEBUG','recordid ', recordid);
      nlapiLogExecution('DEBUG','soldtocustomer ', soldtocustomer);
      
      var custrecord= nlapiLoadRecord('customer', soldtocustomer, {recordmode: 'dynamic'});
      
      custrecord.setFieldValue('custentity_liv_box_contract_url', boxurl);
      custrecord.setFieldValue('custentity_liv_jira_key', jirakey);
      custrecord.setFieldValue('custentity_liv_contract_number', contractnumber);
      custrecord.setFieldValue('custentity_liv_contract_record_id', recordid);
      custrecord.setFieldValue('custentity_liv_pccode', clientcodeid);
      custrecord.setFieldValue('category', category);
     // custrecord.setFieldValue('custentity_liv_medical_claims_billing', medicalclaims);
      
      nlapiSubmitRecord(custrecord);
  }
  
    
   if ( (type == 'edit') &&  (nlapiGetContext().getExecutionContext() == 'userinterface'))
  {
      var arrclientcode = new Array(); 
      var recordid= nlapiGetRecordId();
      var soldtocustomer = nlapiGetFieldValue('custrecord_liv_cm_sold_to_customer');
     
      var clientcodeid = nlapiGetFieldValue('custrecord_liv_cm_client_code');
      
  //    var clientcodetxt =  nlapiGetFieldTexts('custrecord_liv_cm_client_code');
  
       arrclientcode = nlapiGetFieldTexts('custrecord_liv_cm_client_code');
    
       
       
      
      var administrator =  nlapiGetFieldValue('custrecord_liv_cm_administrator');
      var adminfee =  nlapiGetFieldValue('custrecord_liv_cm_admin_fee');
      var partner =  nlapiGetFieldValue('custrecord_liv_cm_partner');
      var partnerfee =  nlapiGetFieldValue('custrecord_liv_cm_partner_fee');
      var category =  nlapiGetFieldValue('custrecord_liv_cm_pricing_model');
      
      
      
      nlapiLogExecution('DEBUG','recordid ', recordid);
      nlapiLogExecution('DEBUG','soldtocustomer ', soldtocustomer);
      
      var custrecord= nlapiLoadRecord('customer', soldtocustomer, {recordmode: 'dynamic'});
     

  
      custrecord.setFieldTexts('custentity_liv_pccode', arrclientcode);
      //custrecord.setFieldValue('custentity_liv_pccode', clientcodeid);
      custrecord.setFieldValue('custentity_liv_administrator', administrator);
      custrecord.setFieldValue('custentity_liv_referral_fee', adminfee);
      custrecord.setFieldValue('custentity_liv_partner', partner);
      custrecord.setFieldValue('custentity_liv_partner_fee', partnerfee);
      custrecord.setFieldValue('category', category);
      
      nlapiSubmitRecord(custrecord);
  }
  
}  