/* Set Promotions on DWSO Helper Library
* Update On, 18-Jan-2017
* By, Rajiv@mca140.com
*/
var Helper = new Object();
var PROMOTIONS = new Object();

function main(){
	log('Add Discount Line', Helper.addDiscountLineItem('10.00', '380', ['24'], '1403', []));
}

/* New function: Insert New Line Discount Item Or update existing line item*/
Helper.addDiscountLineItem = function(discountRate, accountId, appliedCartItems, promotionId, qualifyingCartItems, promoName, promoCode) {
    var result = false;

    if(!Helper.isEmptyObject(appliedCartItems)){
	    if(accountId !== '' && accountId !== undefined){
		    if (Helper.isNumeric(discountRate)) {
		    	var isDiscountItemExists = Helper.isDiscountItemExistsForPromotion(promotionId);
		    	if(isDiscountItemExists['found'] == true){ // if already exists then Update
		    		updateResult = Helper.updateDiscountLineItem(discountRate, isDiscountItemExists['discountItemId'], appliedCartItems, promotionId, qualifyingCartItems);
		    		if(updateResult == true){
		    			Helper.removeDiscountItemOnUpdate(isDiscountItemExists['discountItemId'], isDiscountItemExists['position']);
		    			result = true;
		    		}
		    	}else{ // create new discount item & then line
		    		var newDiscountItemId = Helper.createDiscountItem(discountRate, accountId, appliedCartItems);
		    		if(newDiscountItemId !== '' && newDiscountItemId !== undefined){
		            	result = Helper.insertDiscountLineItem(newDiscountItemId, appliedCartItems, promotionId, qualifyingCartItems, promoName, promoCode);
		        	}
		    	}
		    }
		}
	}
	if(result){
		PROMOTIONS[promotionId] = new Object({'promotionId': promotionId,
												'discountValue': discountRate,
												'discountedItems': appliedCartItems});
	}

	return result;
};

/* Create a new discount type item for given rate & account*/
Helper.createDiscountItem = function(discountItemRate, accountId) {
    var New_Discount_Item_Id = false;

	if(accountId !== '' && accountId !== undefined){
		if(discountItemRate  !== '' && discountItemRate !== undefined){
		    newDiscountItem = nlapiCreateRecord('discountitem');
		    newDiscountItem.setFieldValue('itemid', 'Discount Item'+ "_t" + Helper.getTimeStamp() + "_u" + nlapiGetContext().user); //name format: <discount-item-name>_i<iteminternalid>_t<timestamp>_u<userid>
		    newDiscountItem.setFieldValue('rate', discountItemRate);
		    newDiscountItem.setFieldValue('account', accountId);
		    New_Discount_Item_Id = nlapiSubmitRecord(newDiscountItem, true);
		}
	}

	return New_Discount_Item_Id;
};

/* Insert New Line Discount Item*/
Helper.insertDiscountLineItem = function(discountItemId, appliedCartItems, promotionId, qualifyingCartItems, promoName, promoCode) {
	var result = false;

    if(!Helper.isEmptyObject(appliedCartItems)){
	    if(discountItemId !== "" && discountItemId !== undefined){
	    	var linesCount = nlapiGetLineItemCount('item');
		    nlapiSelectNewLineItem('item');
		    nlapiSetCurrentLineItemValue('item', 'item', discountItemId, true, true);
		    nlapiSetCurrentLineItemValue('item', 'custcol_discount_memo', 'DI', true, true);
		    nlapiSetCurrentLineItemValue('item', 'custcol_sf_discount_parent_items_flag', appliedCartItems.join(','), true, true); //parent items
		    nlapiSetCurrentLineItemValue('item', 'custcol_sf_discount_promotion_id_flag', promotionId, true, true); //applied promotion id
			nlapiSetCurrentLineItemValue('item', 'custcol_promo_id', promoName, true, true);
			nlapiSetCurrentLineItemValue('item', 'custcol_promo_code', promoCode, true, true);
		    nlapiCommitLineItem('item');
		    //update applied card item's promotion id flag
		    for(var i = 1; i <= nlapiGetLineItemCount('item'); i++){
		    	if(nlapiGetLineItemValue('item', 'itemtype', i) == 'InvtPart'){
			    	if(appliedCartItems.indexOf(nlapiGetLineItemValue('item', 'item', i)) !== -1){
			    		nlapiSelectLineItem('item', i);
			    		nlapiSetCurrentLineItemValue('item', 'custcol_discount_memo', 'PI', true, true);
			    		nlapiSetCurrentLineItemValue('item', 'custcol_sf_discount_promotion_id_flag', promotionId, true, true);
			    		nlapiCommitLineItem('item');
			    	}
		    	}
		    }
		    //if only the current item line count is greater than the before insert line count, that means discount item inserted
		    if(linesCount < nlapiGetLineItemCount('item')){
		    	result = true;
		    }
		}
	}

	return result;
};

/* check whether the discount line item is already added for given promotion*/
Helper.isDiscountItemExistsForPromotion = function(promotionId){
	var result = new Object();
	result['found'] = false;

	if(promotionId !== '' && promotionId !== undefined){
		for(var i = 1; i <= nlapiGetLineItemCount('item'); i++){
			if(nlapiGetLineItemValue('item', 'itemtype', i) == 'Discount'){
				if(nlapiGetLineItemValue('item', 'custcol_sf_discount_promotion_id_flag', i) == promotionId){
					result['found']  = true;
					result['discountItemId'] = nlapiGetLineItemValue('item', 'item', i);
					result['position'] = i;
					break;
				}
			}
		}
	}

	return result;
};

/* updating discount line-item on Item rate updation*/
Helper.updateDiscountLineItem = function(discountItemRate, discountItemId, appliedCartItems, promotionId, qualifyingCartItems, promoName, promoCode) {
    var result = false;

    if(promotionId !== '' && promotionId !== undefined){
	    if(!Helper.isEmptyObject(appliedCartItems)){
		    if(discountItemId !== '' && discountItemId !== undefined){
			    if (Helper.isNumeric(discountItemRate)) {
			    	// * can not access some of the fields of 'discountitem' record using nlapiLookupField so here used nlapiLoadRecord call
			        var discountItemObj = nlapiLoadRecord('discountitem', discountItemId);
			        discountItemObj.setFieldValue('rate', discountItemRate + '');
			        var isUpdated = nlapiSubmitRecord(discountItemObj, true, false);
			        if(Helper.isNumeric(isUpdated)){
			        	result = Helper.insertDiscountLineItem(isUpdated, appliedCartItems, promotionId, qualifyingCartItems, promoName, promoCode);
			        }
			    }
			}
		}
	}
		
    return result;
};

/* remove an existing discount item on success of update discount item*/
Helper.removeDiscountItemOnUpdate = function(oldDiscountItemId, position){
	var result = false;

	if(oldDiscountItemId !== '' && oldDiscountItemId !== undefined){
		if(Helper.isNumeric(position)){
			if(nlapiGetLineItemValue('item', 'item', position) == oldDiscountItemId){
				nlapiRemoveLineItem('item', position);
				nlapiCancelLineItem('item');
				result = true;
			}
		}
	}

	return true;
}

/* get discount item account-id*/
Helper.getAccountIdByPromotionId = function(promotionId){
    if(promotionId!=='' && typeof promotionId !== 'undefined'){
        // nlapiLookupField call returns the "STRING VALUE" not the ID, so to avoid dropdown option text to id, we used nlapiLoadRecord
        var discountId = nlapiLoadRecord('promotioncode', promotionId).getFieldValue('discount');
        //can not access the account field from 'discountitem' record using lookupField so here used loadRecord
        var accountId = nlapiLoadRecord('discountitem', discountId).getFieldValue('account');
        return (accountId !== null && accountId !== undefined) ? accountId : false;
    }else{
        alert('Invalid promotion id');
        return false;
    }
};

/* check whether the object is empty or not*/
Helper.isEmptyObject = function(obj){
	return Object.keys(obj).length > 0 ? false : true;
}

/* check whether the object is empty or not*/
Helper.isNumeric = function(n){
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/* get the current timestamp value*/
Helper.getTimeStamp = function(){
	return (new Date).getTime();
}

/* gives the array elements as unique*/
Helper.unique = function(arr) {
   return arr.filter (function (value, index, array) { 
   		return array.indexOf (value) == index;
	});
}

/* server log*/
function log(title, msg, level){
	level = level || "DEBUG";
	nlapiLogExecution(level, title, msg);
}

//---------------new approach, only calculate item amount by applying the discount value






function addDiscountValueToDiscountItem(discountValue, promotionId, discountedItems, qualifyingItems){
	log('addDiscountValueToDiscountItem()');
	if(!Helper.isNumeric(discountValue)){
		return false;
	}
	if(!Helper.isNumeric(promotionId)){
		return false;
	}

	var promotionObj = {
		promotionId: promotionId,
		DiscountValue: discountValue
	};

	if(canApplyPromotion(promotionObj)){
		PROMOTIONS[promotionId] = new Object({
			'promotionId': promotionId,
			'discountValue': discountValue,
			'discountedItems': discountedItems,
			'qualifyingItems': qualifyingItems,
			'applied': false
		});

		return true;
	}

	return false;
}

/* Update promotions flag in PROMOTIONS global variable*/
function canDiscountBeApplied(promotionObj){
	var result = false;
	if(!Helper.isEmptyObject(promotionObj)){
		if(!Helper.isEmptyObject(PROMOTIONS)){
			var pid = promotionObj['promotionId'];
			if(promotionObj['applied']){
				if(parseFloat(promotionObj['discountValue']) !== parseFloat(PROMOTIONS[pid]['discountValue'])){
					result = true; //Info: promotion with different discount value
				}
			}else{
				result = true; //Info: new promotion coming, so allow to add in PROMOTIONS
			}
		}else{
			result = true;
		}
	}
	log('canDiscountBeApplied: ' + result);
	return result;
}