/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       02 Apr 2017     shraddhashah
 *
 */

/**
 * @returns {Void} Any or no return value
 */
function workflowAction() {
  try{
	 var SO_id = nlapiGetRecordId();
  nlapiLogExecution('DEBUG','PredeletePricing Record ID:'+ SO_id);
nlapiDeleteRecord('customrecord_item_pricing_cust',SO_id);
  nlapiLogExecution('DEBUG','Pricing Record ID:'+ SO_id);
}catch(e){
  throw e;
}
}
