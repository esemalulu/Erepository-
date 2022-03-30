/* Set Promotions on DWSO
* Update On, 7-Jan-2017
* By, Rajiv@mca140.com
*/

/* before submit record*/
function beforeSubmit_DWSO(type){
	if(type == 'create'){
		if(nlapiGetFieldValue('custbody_sears_createdfrom_dware') == 'T'){
			//log('Demandware Sales Order');
			var result = setPromotionsAndCouponCodes_DWSO();
			if(result['result']){
				log('DW SO SUCCESS', 'Promotions & coupon codes have been set on Demandware Sales Order in Netsuite.');
				//applyMultipleDiscountOnItems_DWSO(result['promotionData']);
				//createJournalEntry_MCA(transactionAmount, debitAccountId, creditAccountId, entityId, memo, transactionDate, currencyId, exchangeRate);
			}
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
	var promotionData = new Array();

	for(var i=1; i <= nlapiGetLineItemCount('item'); i++){
		if(nlapiGetLineItemValue('item', 'itemtype', i) == 'InvtPart'){
			promotionName = nlapiGetLineItemValue('item', 'custcol_promo_id', i);
			couponCode = nlapiGetLineItemValue('item', 'custcol_promo_code', i);
			//promotionId = getPromotionIdByName(promotionName);
			//log('promotion name: ' + promotionName);// + ', ' + promotionId);
			if(promotionName !== '' && promotionName !== null){
				// if(couponCode !== '' && couponCode !== null){
					promotionId = getPromotionIdByName(promotionName);
					if (!(promotionName in distinctPromotions)) {
					    distinctPromotions.push(promotionName);
					}
					if(couponCode !== '' && couponCode !== null){
						if (!(couponCode in distinctCouponCodes)) {
						    distinctCouponCodes.push(promotionId + ':' + couponCode);
						}
					}
					//collecting promotion data
					promotionData.push(new Object({'itemId': nlapiGetLineItemValue('item', 'item', i),
													'itemName': nlapiGetLineItemText('item', 'item', i),
													'itemQuantity': nlapiGetLineItemValue('item', 'quantity', i),
													'itemRate': nlapiGetLineItemValue('item', 'rate', i),
													'itemAmount': nlapiGetLineItemValue('item', 'amount', i),
													'promotionId': promotionId,
													'promotionName': nlapiGetLineItemValue('item', 'custcol_promo_id', i),
													'promotionCode': nlapiGetLineItemValue('item', 'custcol_promo_code', i)
													}));


				// }else{
					// log('Error: Invalid coupon code: ' + couponCode);
				// }
			}else{
				log('Error: Invalid promotion id: ' + promotionName);
			}
		}
	}
	log('Applied Promotions: ' + distinctPromotions + ', coupons: ' + distinctCouponCodes);
    result['result'] = setAppliedPromotions_DWSO(distinctPromotions, distinctCouponCodes);
    result['promotionData'] = promotionData;

    return result;
}

/* Setter: adds a single promotion row for given name*/
function setAppliedPromotions_DWSO(promotionNames, couponcodes) {
	//log('setAppliedPromotions_DWSO()');
	var result = false;

    if(promotionNames.length >= 1) {
       // if(!isExistString("custbody_sf_selected_stackable_promos",promotionNames)) {
            nlapiSetFieldValue("custbody_sf_selected_stackable_promos", uniq(promotionNames).join('\n').trim());
       // }
       // if(!isExistString("custbody_sf_applied_stackable_promos",promotionNames)) {
            nlapiSetFieldValue("custbody_sf_applied_stackable_promos", uniq(promotionNames).join('\n').trim());
        //}
        if(couponcodes.length >= 1) {
           // if(!isExistString("custbody_sf_coupon_codes_applied",couponcodes)) {
                nlapiSetFieldValue("custbody_sf_coupon_codes_applied", uniq(couponcodes).join('\n').trim());
           // }
		}

		if(nlapiGetFieldValue("custbody_sf_selected_stackable_promos") !== ''){
			//if(nlapiGetFieldValue("custbody_sf_coupon_codes_applied") !== ''){
				result = true;
			//}
		}
    }else{
        log('Promtion list is empty');
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

//----------------- discounts processing
/* create discounts on promotion applied items*/
function applyMultipleDiscountOnItems_DWSO(promotionData){
	log('applyMultipleDiscountOnItems_DWSO()');
	log('promotionData', promotionData);
	var promotionId = '';
	var itemPromotions = new Array();
	var result = false;

	for(pd in promotionData){
		promotionId = promotionData[pd]['promotionId'];
	    var promotionObject = nlapiLoadRecord('promotioncode', promotionId);
	    var promotionsJson = convertJSON_DWSO(promotionObject);
	    itemPromotions.push(new Object({'promotionId': promotionId,
	    								'discountValue': getDiscountValue_DWSO(promotionsJson),
	    								'appliedCartItem': promotionData[pd]['itemId']
	    								}));
	}
	log('itemPromotions', JSON.stringify(itemPromotions));
	return itemPromotions;
}

function getDiscountValue_DWSO(promotionsJson) {
    log('getDiscountValue_DWSO()');
    log('promotionsJson', JSON.stringify(promotionsJson));
    var promotionData = promotionsJson;
    var discount_value = 0.00;
    var discount_type = null;
    var promotion_applied = false;
    var promotion_rule = promotionData['custrecord_pf_promotion_rule'];

    if (promotion_rule == 1) {
        var discountType = promotionData['custrecord_pf_promotion_discount_type'];

        if (discountType == 1) {
            log('simple discount');
            var discountsRate = jQuery.parseJSON(promotionData['custrecorddiscountsobject']);

            if ((typeof discountsRate).localeCompare("undefined") != 0) {
                if (discountsRate['discount_type'] == 'percentage') {
                    promotion_applied = true;
                    discount_type = 'percentage';
                    discount_value = discountsRate['percentage'];
                } else if (discountsRate['discount_type'] == 'amount') {
                    promotion_applied = true;
                    discount_type = 'amount';
                    discount_value = discountsRate['amount'];
                } else if (discountsRate['discount_type'] == 'free-shipping') {
                    promotion_applied = true;
                    discount_type = 'free-shipping';
                    discount_value = 0.0;
                } else if (discountsRate['discount_type'] == 'fixed-price') {
                    promotion_applied = true;
                    discount_type = 'fixed-price';
                    discount_value = discountsRate['fixed-price'];
                }
            }

            log('discount type: ', discount_type);
            log('discount rate: ', discount_value);

            return discount_value;

        } else if (discountType == 2) {
            log('discounts');
           // return getMulipleDiscountsValue(currentItemQuantity, currentItemAmount, promotionData, currentItemObj, totalItems);
        } else if (discountType == 3) {
           	log('bogo');
           // return getBogoDiscountValue(currentItemQuantity, promotionData, itemId, totalItems, currentItemObj);
        }
    } else if (promotion_rule == 3) {
        log('Shipping Promotion Rule');
        //return getDiscountForShippingPromotionRule(promotionData, currentItemObj, totalItems);
    }

    return discount_value;
}

/* convert netsuite promotion object to json object*/
function convertJSON_DWSO(data) {
    var jsonArray = JSON.stringify(data);
    var object = JSON.parse(jsonArray);

    return object;
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