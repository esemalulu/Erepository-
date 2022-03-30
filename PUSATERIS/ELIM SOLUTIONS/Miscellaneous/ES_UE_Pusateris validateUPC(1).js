function beforeLoad(type, form, request)
{
	if(type=="create" || type=="edit"){
		es_setFieldDisplay("custitem_es_unit_cost",	"disabled");
		es_setFieldDisplay("stockunit",	"disabled");
		es_setFieldDisplay("custitem_es_casepack",	"disabled");
	}


}

function es_setFieldDisplay(stFieldId, stDisplayType){
	try{
		var objFld = nlapiGetField(stFieldId);
		if(objFld) objFld.setDisplayType(stDisplayType);
		else nlapiLogExecution("DEBUG", thisifunctionname, "Failed to find field item -> "+stFieldId);
	}
	catch(error){}
}

function beforeSubmitItemMaintenance(stEvent)
{
	beforeSubmitSetCasePack(stEvent);
	beforeSubmitValidateUPC(stEvent);
	beforeSubmitSetPriceLevel(stEvent);
}


function beforeSubmitValidateUPC(stEvent)
{
	//Get New UPC


	//Search Item Records with Filter UPC==NEW UPC
	//If result != Null
	// Return Error THis UPC is used
	var funcName = 'beforeSubmitValidateUPC';

	if(stEvent != 'create' && stEvent != 'edit' && stEvent != 'xedit') return false;

	nlapiLogExecution('DEBUG',funcName, '===========START===========');
	
	var stNewUPC = nlapiGetFieldValue('upccode');
	var stId = nlapiGetRecordId();

	nlapiLogExecution('DEBUG',funcName, 'stNewUPC=' + stNewUPC);
	nlapiLogExecution('DEBUG',funcName, 'stId=' + stId);
	
	/*added by Richard on mar 4, 2016, to avoid empty filter error*/
	if(stNewUPC == undefined || stNewUPC == null || stNewUPC == ''){
		nlapiLogExecution('AUDIT', funcName, 'Empty UPC! No Need to check. Return now.');
		return;
	}
	
	var arrFilter = new Array();
	arrFilter.push(new nlobjSearchFilter('upccode',null,'is',stNewUPC));
	arrFilter.push(new nlobjSearchFilter('isinactive',null,'is','F'));
	if(stId != null && stId != '')
	{
		arrFilter.push(new nlobjSearchFilter('internalid',null,'noneof',[stId]));
	}
	
	var arrColumn = new Array();
	arrColumn.push(new nlobjSearchColumn('internalid',null,'COUNT'));
	
	var arrResults = nlapiSearchRecord('item',null,arrFilter,arrColumn);
	
	nlapiLogExecution('DEBUG',funcName, 'arrResults=' + arrResults);

	var bMatch = false;
	if(arrResults!=null)
	{
		if(arrResults.length > 0)
		{
			var iCnt = parseInt(arrResults[0].getValue('internalid',null,'COUNT'));
			if(isNaN(iCnt)) iCnt = 0;
			nlapiLogExecution('DEBUG',funcName, 'iCnt=' + iCnt);
			if(iCnt > 0)
			{
				bMatch = true;
			}
		}
	}
	nlapiLogExecution('DEBUG',funcName, 'bMatch=' + bMatch);
	
	if(bMatch)
	{
		throw nlapiCreateError('DUPLICATE_EXISTS','An Item with the same UPC Code:' +stNewUPC+' already exists.');
	}

	nlapiLogExecution('DEBUG',funcName, '============END============');
}

function beforeSubmitSetCasePack(stEvent)
{
	var funcName = 'beforeSubmitSetCasePack';

	if(stEvent != 'create' && stEvent != 'edit' && stEvent != 'xedit') return false;

	nlapiLogExecution('DEBUG',funcName, '===========START===========');
	
	var stPurchaseUnit = nlapiGetFieldValue('purchaseunit');
	var stSaleUnit = nlapiGetFieldValue('saleunit');
	var stSaleUnitType = nlapiGetFieldValue('saleunit');
	var flPurchPrice = parseFloat(nlapiGetFieldValue('cost'));
	var arrUnits = loadUnits();
	var intPurchUnitConversion = arrUnits[stPurchaseUnit];
	var intSaleUnitConversion = arrUnits[stSaleUnit];
	if	(validUnit(intPurchUnitConversion) && validUnit(intSaleUnitConversion))
	{
		//Set Case Pack
		var fltCasePack = parseFloat(intPurchUnitConversion/intSaleUnitConversion);
		nlapiSetFieldValue('custitem_es_casepack',fltCasePack.toFixed(2));
		
		
	}
	if (validUnit(intPurchUnitConversion) && validUnit(intSaleUnitConversion) && validUnit(flPurchPrice))
	{
		//Set Unit Cost
		var fltUnitCost = parseFloat((flPurchPrice/intPurchUnitConversion)*intSaleUnitConversion);
		nlapiSetFieldValue('custitem_es_unit_cost',fltUnitCost.toFixed(2));
		nlapiSetFieldValue('transferprice',fltUnitCost.toFixed(2));
	}
	if (validUnit(stSaleUnitType))
	{
		//Set Stock Unit
		nlapiSetFieldValue('stockunit',stSaleUnitType);
		
	}
	
}
function validUnit(val) {
	if(val != null && val != 'undefined' && val != '')
		return true;
	
	return false;
	
}

/**
 * get unit type rate information
 * @returns {object} 
 */
function loadUnits() {
	var id = nlapiGetFieldValue('unitstype');
	var output = {};
	if (id) {
		var record = nlapiLoadRecord('unitstype', id);
		var count = record.getLineItemCount('uom');
		for (var l = 1; l <= count; l += 1) {
			output[record.getLineItemValue('uom', 'internalid', l)] = record.getLineItemValue('uom', 'conversionrate', l);
		}
	}
	return output;
}
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmitSetPriceLevel(type){
	if (type == 'edit' || type == 'create') {
		//var basePrice = nlapiGetFieldValue('custitem_es_retail_price');
		//if (basePrice) {
			var sakesDiscount = nlapiGetFieldValue('custitem_es_saks_discount_hds');
			var employeeDiscount = nlapiGetFieldValue('custitem_es_employee_discount_hds');
			
		//}
		for (var p = 1; p <= 5; p += 1) {
			var group = 'price' + p;
			var count = nlapiGetLineItemCount(group);
			if (count > 0) {
				var detail = [];
				for (var l = 1; l <= count; l += 1) {
					if (nlapiGetLineItemValue(group, 'pricelevel', l) == 1) { //Retail
						for (var cl = 1; cl <= 100; cl += 1) {
							var value = nlapiGetLineItemMatrixValue(group, 'price', l, cl);
							if (value === null) {
								break;
							}
							detail.push(value);
						}
						
					}
				}
				if (sakesDiscount || sakesDiscount === 0) {
					for (var l = 1; l <= count; l += 1) {
						if (nlapiGetLineItemValue(group, 'pricelevel', l) == 7) { //Sakes
							nlapiSelectLineItem(group, l);
							for (var i = 0; i < detail.length; i += 1) {
								if (detail[i] || detail[i] === 0) {
									nlapiSetCurrentLineItemMatrixValue(group, 'price', i + 1, parseFloat(detail[i]) * (1 - parseFloat(sakesDiscount) / 100));
								}
							}
							nlapiCommitLineItem(group);
						}
					}
				}
				if (employeeDiscount || employeeDiscount === 0) {
					for (var l = 1; l <= count; l += 1) {
						if (nlapiGetLineItemValue(group, 'pricelevel', l) == 2) { //Employee
							nlapiSelectLineItem(group, l);
							for (var i = 0; i < detail.length; i += 1) {
								if (detail[i] || detail[i] === 0) {
									nlapiSetCurrentLineItemMatrixValue(group, 'price', i + 1, parseFloat(detail[i]) * (1 - parseFloat(employeeDiscount) / 100));
								}
							}
							nlapiCommitLineItem(group);
						}
					}
				}

			}
		}
	}
}