/* Set Promotions on DWSO
* Update On, 21-Feb-2017
* By, Rajiv@mca140.com
*/
var Helper = new Object();
var PROMOTIONS1 = new Object();

function beforeLoad(type, form){
	setbackPromotionObject(); //get the PROMOTIONS1 object back from textarea field
}

/* before submit record*/
function beforeSubmit_DWSO(type){
	if(type == 'create'){
		if(nlapiGetFieldValue('custbody_sears_createdfrom_dware') == 'T'){
			//log('Demandware Sales Order');
			//setbackPromotionObject(); //get the PROMOTIONS1 object back from textarea field
			log('beforeSubmit_DWSO::PROMOTIONS1', JSON.stringify(beforeSubmit_DWSO));

			if(setPromotionsAndCouponCodes_DWSO()){
				//var result = addDiscountLineItems(result.promotionData);
				var result = addDiscountToLineItem();
				//createJournalEntry_MCA(transactionAmount, debitAccountId, creditAccountId, entityId, memo, transactionDate, currencyId, exchangeRate);
			}

			savePromotionsObject();
		}
	}
}

/* Set promotions & couponcodes */
function setPromotionsAndCouponCodes_DWSO(){
	//log('setPromotionsAndCouponCodes_DWSO()');
	var promotionName = '';
	var couponCode = '';
	var result = new Object();
	var promotionId = '';
	var distinctPromotions = new Array();
	var distinctCouponCodes = new Array();

	for(var i=1; i <= nlapiGetLineItemCount('item'); i++){
		if(nlapiGetLineItemValue('item', 'itemtype', i) == 'InvtPart'){
			promotionName = nlapiGetLineItemValue('item', 'custcol_promo_id', i);
			couponCode = nlapiGetLineItemValue('item', 'custcol_promo_code', i);
			log('promo & code: ', promotionName + ' code: ' + couponCode);
			//promotionId = getPromotionIdByName(promotionName);
			//log('promotion name: ' + promotionName);// + ', ' + promotionId);
			if(promotionName !== '' && promotionName !== null){
				// if(couponCode !== '' && couponCode !== null){
					promotionId = getPromotionIdByName(promotionName);
					isApplicable = true;//isPromotionApplicable(promotionId);
					log('isPromotionApplicable::', isApplicable);

					if(isApplicable){    ///********************
						if (!(promotionName in distinctPromotions)) {
						    distinctPromotions.push(promotionName);
						}
						if(couponCode !== '' && couponCode !== null){
							if (!(couponCode in distinctCouponCodes)) {
							    distinctCouponCodes.push(promotionId + ':' + couponCode);
							}
						}

						var discount_amount = nlapiGetLineItemValue('item', 'custcol_discount_amount', i);
						if(isNaN(parseFloat(discount_amount))) return result;
						log('PROMOTIONS1::' + typeof PROMOTIONS1);
						PROMOTIONS1[promotionId] = new Object({
							'promotionId': promotionId,
							'discountValue': nlapiGetLineItemValue('item', 'custcol_discount_amount', i),//'1.0',
							'discountedItems': [nlapiGetLineItemValue('item', 'item', i)],
							'applied': false
						});
					}
				// }else{
					// log('Error: Invalid coupon code: ' + couponCode);
				// }
			}else{
				log('Error:', ' Invalid promotion id: ' + promotionName);
			}
		}
	}
	log('Applied Promotions: ' + distinctPromotions + ', coupons: ' + distinctCouponCodes);
    result = setAppliedPromotions_DWSO(distinctPromotions, distinctCouponCodes);

    return result;
}

/* Setter: adds a single promotion row for given name*/
function setAppliedPromotions_DWSO(promotionNames, couponcodes) {
	//log('setAppliedPromotions_DWSO()');
	var result = false;

    if(promotionNames.length >= 1) {
		nlapiSetFieldValue("custbody_sf_selected_stackable_promos", uniq(promotionNames).join('\n').trim());
		nlapiSetFieldValue("custbody_sf_applied_stackable_promos", uniq(promotionNames).join('\n').trim());

        if(couponcodes.length >= 1) {
			nlapiSetFieldValue("custbody_sf_coupon_codes_applied", uniq(couponcodes).join('\n').trim());
		}
		if(nlapiGetFieldValue("custbody_sf_selected_stackable_promos") !== ''){
			result = true;
		}
    }else{
        log('promotionNames list is empty');
    }

    return result;
}

/* PreData-Script: discountsData
 * Params reqrd.: discount amount, discount percentage(if needed)
 * discount data: 	promotionId: {
					}
 */
/* Add discount line item for given promotion*/
function addDiscountLineItems(discountsData){
	log('addDiscountLineItems()::discountsData', JSON.stringify(discountsData));
	var result = false;
	var discountsAdded = new Array();

	if(discountsData.length > 0){
		for(var i=0; i < discountsData.length; i++){
			var discount = discountsData[i];

			if(Object.keys(discount).length > 0){
				if(discount.discountValue > 0.00){
					var addedPromotionId = insertDiscountLineItem(discount);
					if(addedPromotionId){
						discountsAdded.push(discount.promotionId);
					}
				}
			}
		}
	}

	if(discountsAdded.length == discountsData.length){
		result = true;
	}

	return result;
}

/* Insert a discount line item to the item sublist*/
function insertDiscountLineItem(discount){
	//log('insertDiscountLineItem()');
	var result = false;
	var EMPTY_ARRAY = [];

	if(Object.keys(discount).length > 0){
		var accountId = Helper.getAccountIdByPromotionId(discount.promotionId);
		 result = Helper.addDiscountLineItem(discount.discountValue, accountId, [discount.itemId], discount.promotionId, EMPTY_ARRAY, discount.promotionName, discount.promotionCode);
	}

	return result;
}

function uniq(arr) {
   return arr.filter (function (value, index, array) { 
   		return array.indexOf (value) == index;
	});
}

function isExistString(fieldName,stringToTest) {
    var existedString = nlapiGetFieldValue(fieldName);
    existedString = (existedString !== null && existedString !== '') ? existedString.trim() : '';
    existedString = existedString.split("\n");
    stringToTest = (stringToTest !== null && stringToTest !== '') ? stringToTest.trim() : '';

    if(existedString.indexOf(stringToTest) >= 0) {
        return true;
    }
    else {
        return false;
    }
}

/* logger shorthand*/
function log(name, message) {
    nlapiLogExecution('DEBUG', name, message);
}

/* get promotion id by promotion name*/
function getPromotionIdByName(promotionName) {
    if (promotionName !== '' && promotionName !== null) {
        result = nlapiSearchRecord('promotioncode', null, [new nlobjSearchFilter('name', null, 'is', promotionName.trim())], null);
        return result !== null ? result[0].getId() : false;
    } else {
        return false;
    }
}

/* Journal Entry Creation*/
 /* adding debit amount line item*/
function debitAmount_MCA(je, debitAccountId, transactionAmount, memo, entityId){
	je.selectNewLineItem('line');
	je.setCurrentLineItemValue('line', 'account', debitAccountId);
	je.setCurrentLineItemValue('line', 'debit', transactionAmount);
	je.setCurrentLineItemValue('line', 'entity', entityId);
	je.setCurrentLineItemValue('line', 'memo', memo);
	je.commitLineItem('line');
}

 /* adding credit amount line item*/
function creditAmount_MCA(je, creditAccountId, transactionAmount, memo){
	je.selectNewLineItem('line');
	je.setCurrentLineItemValue('line', 'account', creditAccountId);
	je.setCurrentLineItemValue('line', 'credit', transactionAmount);
	je.setCurrentLineItemValue('line', 'memo', memo);
	je.commitLineItem('line');
}

/* create journal entries*/
function createJournalEntry_MCA(transactionAmount, debitAccountId, creditAccountId, entityId, memo, transactionDate, currencyId, exchangeRate){
	try{
		var je = nlapiCreateRecord('journalentry');
		je.setFieldValue('trandate', transactionDate);
		je.setFieldValue('currency', currencyId);
		je.setFieldValue('exchangerate', exchangeRate);
		if(debitAccountId !== '' && debitAccountId !== undefined && debitAccountId !== null && debitAccountId !== undefined){
			debitAmount_MCA(je, debitAccountId, transactionAmount, memo, entityId);
		}
		if(creditAccountId !== '' && creditAccountId !== undefined && creditAccountId !== null && creditAccountId !== undefined){
			creditAmount_MCA(je, creditAccountId, transactionAmount, memo);
		}

		return nlapiSubmitRecord(je, true, false);
	}catch(e){
		if(e instanceof nlobjError){
			log(e.getDetails());
		}else{
			log(e);
		}
	}
}

//----------------- discounts new approch

/* Add discount line item for given promotion*/
function addDiscountToLineItem(){
	log('addDiscountToLineItem()::PROMOTIONS1', JSON.stringify(PROMOTIONS1));
	var result = false;
	var discountsAdded = new Array();
	var itemIndexDic = new Object();

	for(var i = 1; i <= nlapiGetLineItemCount('item'); i++){
	    itemIndexDic[nlapiGetLineItemValue('item', 'item', i)] = i;
	}

	if(!Helper.isEmptyObject(PROMOTIONS1)){
		for(i in PROMOTIONS1){
			var discount = PROMOTIONS1[i];
			var lineNumber;

			if(!Helper.isEmptyObject(discount)){
				if(discount.discountValue > 0.00){
					for(item in discount.discountedItems){
						if(discount.discountedItems[item] in itemIndexDic){
							lineNumber = itemIndexDic[discount.discountedItems[item]];
							break;
						}
					}
					var canBeApplied = canDiscountBeApplied(discount);

					if(canBeApplied){
						var result = recalculateDiscountedAmount(discount, lineNumber);
						if(result){
							discount['applied'] = true;
							discountsAdded.push(discount.promotionId);
						}
					}
				}
			}
		}
	}
	log('addDiscountLineItems::Discount Line Items Added', discountsAdded);

	if(Object.keys(PROMOTIONS1).length == discountsAdded.length){
		result = true;
	}

	return result;
}

/*recalculate the discounted amount of the line item*/
function recalculateDiscountedAmount(promotion, currentItemIndex){
    var itemId = nlapiGetLineItemValue('item', 'item', currentItemIndex);
    var itemAmount = parseFloat(nlapiGetLineItemValue('item', 'amount', currentItemIndex));
	var finalAmount = itemAmount - promotion['discountValue']; log("discounted item Amount: " + finalAmount);

	if(finalAmount < 0){
	    log('recalculateDiscountedAmount::ERROR', 'Inventory items must have a positive amount.');
	    return false;
	}
	nlapiSetLineItemValue('item', 'amount', currentItemIndex,finalAmount.toFixed(2));
	nlapiSetLineItemValue('item', 'custcol_discount_amount', currentItemIndex, parseFloat(promotion['discountValue']).toFixed(2));

	return true;
}

/* Update promotions flag in PROMOTIONS1 global variable*/
function canDiscountBeApplied(promotionObj){
	var result = false;
	if(!Helper.isEmptyObject(promotionObj)){
		if(!Helper.isEmptyObject(PROMOTIONS1)){
			var pid = promotionObj['promotionId'];
			if(promotionObj['applied']){
				if(parseFloat(promotionObj['discountValue']) !== parseFloat(PROMOTIONS1[pid]['discountValue'])){
					result = true; //Info: promotion with different discount value
				}
			}else{
				result = true; //Info: new promotion coming, so allow to add in PROMOTIONS1
			}
		}else{
			result = true;
		}
	}

	return result;
}

/* Save promotions object data*/
function savePromotionsObject(){
    var promotionsObject = JSON.stringify(PROMOTIONS1);
    nlapiSetFieldValue('custbody_promotions_object', promotionsObject);
}

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

/* retrieve PROMOTIONS1 object data back from textarea field*/
function setbackPromotionObject(){
    var promotionsObject = nlapiGetFieldValue('custbody_promotions_object');
    if(promotionsObject === ''){
        return;
    }
    PROMOTIONS1 = JSON.parse(promotionsObject);
}

/*To find whether the promotion id & promo code is applied or not*/
function isPromotionApplicable(promotionId){
	log('promotionId: ' + promotionId);
	log('PROMOTIONS1: ', JSON.stringify(PROMOTIONS1));
	if(!(promotionId in PROMOTIONS1)){
		log('promotionId is new');
		return true;
	}else if(!PROMOTIONS1[promotionId]['applied']){
		log('promotionId already applied');
		return true;
	}

	return false;
}