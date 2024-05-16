/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 01 April 2021 Suite Professionals LLC Copyright 2015, Suite Professionals LLC, All rights reserved.
 * 
 * This software is confidential and proprietary information of Suite Professionals LLC - ("Confidential Information"). You shall not disclose such
 * Confidential Information and shall use it only in accordance with the terms of the license agreement you entered into with Suite Professionals.
 * 
 */

function fieldChangeRebate(type,name){
  
  if (name == 'custrecord_rebate_items_rebate_cost') {
	  
    var rebateCost = nlapiGetFieldValue('custrecord_rebate_items_rebate_cost');
	 
	 
	
		if(rebateCost){
		nlapiDisableField('custrecord_acme_rebate_item_doll_pcase',true);
		nlapiDisableField('custrecord_rebate_discount_pct',true);
		
		}else{
		 nlapiDisableField('custrecord_acme_rebate_item_doll_pcase',false);
		 nlapiDisableField('custrecord_rebate_discount_pct',false);
			
		}
	
  }
	
	
	if (name == 'custrecord_acme_rebate_item_doll_pcase') {
		var dollarsPerCase = nlapiGetFieldValue('custrecord_acme_rebate_item_doll_pcase');
			if(dollarsPerCase){
		nlapiDisableField('custrecord_rebate_items_rebate_cost',true);
		nlapiDisableField('custrecord_rebate_discount_pct',true);
		
		}else{
		nlapiDisableField('custrecord_rebate_items_rebate_cost',false);
		nlapiDisableField('custrecord_rebate_discount_pct',false);
			
		}
		
	}
	
	if (name == 'custrecord_rebate_discount_pct') {
		 var discountPercent = nlapiGetFieldValue('custrecord_rebate_discount_pct');
			if(discountPercent){
		nlapiDisableField('custrecord_rebate_items_rebate_cost',true);
		nlapiDisableField('custrecord_acme_rebate_item_doll_pcase',true);
		
		}else{
			
		nlapiDisableField('custrecord_rebate_items_rebate_cost',false);
		nlapiDisableField('custrecord_acme_rebate_item_doll_pcase',false);
		}
		
	}
	

   
}

function beforeLoad(type, form)
{
	
	if(nlapiGetFieldValue('custrecord_rebate_items_rebate_cost')){
		form.getField('custrecord_acme_rebate_item_doll_pcase').setDisplayType('disabled');
		form.getField('custrecord_rebate_discount_pct').setDisplayType('disabled');
	}
	
	if(nlapiGetFieldValue('custrecord_acme_rebate_item_doll_pcase')){
		form.getField('custrecord_rebate_items_rebate_cost').setDisplayType('disabled');
		form.getField('custrecord_rebate_discount_pct').setDisplayType('disabled');
	}
	
	if(nlapiGetFieldValue('custrecord_rebate_discount_pct')){
		form.getField('custrecord_rebate_items_rebate_cost').setDisplayType('disabled');
		form.getField('custrecord_acme_rebate_item_doll_pcase').setDisplayType('disabled');
	}
    
}