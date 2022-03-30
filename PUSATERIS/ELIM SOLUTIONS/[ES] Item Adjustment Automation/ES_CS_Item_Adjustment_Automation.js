/**thisifilename="ES_CS_Item_Adjustment_Automation.js";*/
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Jan 2016     Richard Cai
 * 1.01       10 Feb 2016     Richard Cai	updated validated field to assit Search & Suggest
 *
 */

ES_Item_Adjustment_Automation_Constants();

var OBJ_ADJUSTMENT_TYPE = {};
var B_FLD_DESTINATION_DEPARTMENT_MANDATORY = false;
var ST_FLD_DEPARTMENT_INID = null;
var ST_FLD_ADJUSTMENT_TYPE_INID = null;
/*
 * ES_ITEM_SET = {
 * 	"<item internalid>" : {
 * 			"inid" : "", //internalid
 * 			"type" : "", //item type
 * 			"qty" : "", //quantity
 * 			"ln" : "" //line number on this sublist
 * 	}
 * }
 */
var ES_ITEM_SET = {};
var ES_PAGE_TYPE = {};

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function ES_ITAA_PageInit(type){
	ES_PAGE_TYPE = type;
	////-----------------------------------------------get current Adjustment Type internalid
	var objdURLParamSet = getURLParams();
	var stAdjustmentTypeInidURL = (objdURLParamSet && !isNOE(objdURLParamSet["esAT"])) ? objdURLParamSet["esAT"] : null;
	if(!isNOE(stAdjustmentTypeInidURL)){
		ST_FLD_ADJUSTMENT_TYPE_INID = stAdjustmentTypeInidURL;
	}
	else{
		ST_FLD_ADJUSTMENT_TYPE_INID = nlapiGetFieldValue(ESAdjItemAdjustment.FIELD.AdjustmentType);
	}

	////-----------------------------------------------get current Adjustment Type object if there is an internalid
	if(!isNOE(ST_FLD_ADJUSTMENT_TYPE_INID)){
		OBJ_ADJUSTMENT_TYPE = getAdjustmentType(ST_FLD_ADJUSTMENT_TYPE_INID);
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function ES_ITAA_SaveRecord(){
	////---------------------------------------validate body field
	if(B_FLD_DESTINATION_DEPARTMENT_MANDATORY){
		var stDepartmentInid = nlapiGetFieldValue(ESAdjItemAdjustment.FIELD.DestinationDepartment);
		if(isNOE(stDepartmentInid)){
			alert("Field 'Destination Department' is mandatory!");
			return false;
		}
	}
	////---------------------------------------validate sublist item
	var intLineCount = nlapiGetLineItemCount(SUBLIST_ITEM);
	if(intLineCount==0){
		alert("Must input at least one line of Item!");
		return false;
	}
	for(var iLine=1; iLine<=intLineCount; iLine++){
		if(!validateItemCurrentLine(iLine)) return false;////error message will be shown in validateItemCurrentLine
	}
	////---------------------------------------all done
	
	return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Boolean} True to continue changing field value, false to abort value change
 */
function ES_ITAA_ValidateField(type, name, linenum){

	if(type){////if a sublist
		//console.log("ES_ITAA_FieldChanged if(type==SUBLIST_ITEM){");
		if (name == ESAdjItemAdjustmentLine.FIELD.ItemNDT){
			var stSourceDepartmentId = nlapiGetFieldValue(ESAdjItemAdjustment.FIELD.Department);
			var stItemInid = nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT);
			var stItemDepartmentId = nlapiLookupField("item", stItemInid, "department");
			
			if(stSourceDepartmentId != stItemDepartmentId){
				var stSourceDepartmentText = nlapiGetFieldText(ESAdjItemAdjustment.FIELD.Department);
				var stItemDepartmentText = nlapiLookupField("item", stItemInid, "department", true);
				
				alert("You cannot set this Item to 'Item (NDT)'.\nItem's Department mismatches with Source Department.\nItem Department: "+stSourceDepartmentText+"\nSource Department: "+stItemDepartmentText);
				return false;
			}
		}
	}//if(type)
	else{////body
		if (name == ESAdjItemAdjustment.FIELD.AdjustmentType){ //click on AdjustmentType
			if(!confirm("Changing Adjustment Type will reset current page.\nDo you want to continue?")){
				return false;
			}
		}////AdjustmentType
	}////else
	return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function ES_ITAA_FieldChanged(type, name, linenum){
	//console.log("ES_ITAA_FieldChanged type: "+type+"||name: "+name+"||linenum: "+linenum);

	if(type){////if a sublist
		//console.log("ES_ITAA_FieldChanged if(type)");
		if(type==SUBLIST_ITEM){
			//console.log("ES_ITAA_FieldChanged if(type==SUBLIST_ITEM){");
			if (name == ESAdjItemAdjustmentLine.FIELD.ItemNDT  )
			{
				if(ST_FLD_ADJUSTMENT_TYPE_INID != ESAdjAdjustmentType.VALUE.DepartmentTransfer){
					/*
					 * for NOT department transfer, need to copy the item from column "ItemNDT" to column field "Item"
					 */
					var stItemInid = nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT);
					nlapiSetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Item, stItemInid, false);
				}
				
			}
			if (name == ESAdjItemAdjustmentLine.FIELD.Item)
			{
				if(ST_FLD_ADJUSTMENT_TYPE_INID != ESAdjAdjustmentType.VALUE.DepartmentTransfer)
				{
					var stBlank = nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT);					
					//if(stBlank == null || stBlank =="")
					if(true)
					{
						var stItemInid = nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Item);
						nlapiSetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT, stItemInid, false);
					}
				}

			}
		}
	}//if(type)
	else{////body
		if (name == ESAdjItemAdjustment.FIELD.AdjustmentType){ //click on AdjustmentType
			processAdjustmentTypeLogic();
		}
		else if (name == ESAdjItemAdjustment.FIELD.Department){ //click on Department
			processBodyDepartmentChangeLogic();
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @returns {Void}
 */
function ES_ITAA_PostSourcing(type, name) {
   
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Void}
 */
function ES_ITAA_LineInit(type) {
	
	//console.log("ES_ITAA_LineInit type: "+type);
	if(ST_FLD_ADJUSTMENT_TYPE_INID != ESAdjAdjustmentType.VALUE.DepartmentTransfer){
		//only process the logic when Adjustment Type is not Department Transfer
		//otherwise, default the department column field, sourcing from the "Department" body field (notice not the Destination Department)
		var stDepartmentInid = nlapiGetFieldValue(ESAdjItemAdjustment.FIELD.Department);
		var stDepartmentFilterInid = nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.DepartmentFilter);
		if(isNOE(stDepartmentFilterInid) && !isNOE(stDepartmentInid)){
			nlapiSetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.DepartmentFilter, stDepartmentInid, false, true);//firefieldchanged: false, synchronous: true
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to save line item, false to abort save
 */
function ES_ITAA_ValidateLine(type){
	if(type==SUBLIST_ITEM){
		if(!validateItemCurrentLine()) return false;
	}////if(type==SUBLIST_ITEM)
    return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Void}
 */
function ES_ITAA_Recalc(type){
 
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to continue line item insert, false to abort insert
 */
function ES_ITAA_ValidateInsert(type){
  
    return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to continue line item delete, false to abort delete
 */
function ES_ITAA_ValidateDelete(type){
   
    return true;
}
////----------------------------------------------------------------------------------------------------------Support Functions
////---------------------------------------------------------------------------------processAdjustmentTypeLogic
function processAdjustmentTypeLogic(){
	//console.log("processAdjustmentTypeLogic start");
	try{
		var stMessage = "";
		////-------------------------------------------------------------reset
		OBJ_ADJUSTMENT_TYPE = {};
		////-------------------------------------------------------------update
		setWindowChanged(window, false);
		ST_FLD_ADJUSTMENT_TYPE_INID = nlapiGetFieldValue(ESAdjItemAdjustment.FIELD.AdjustmentType);

		var stURLold = window.location.href;
		stMessage += "\nstURLold: "+stURLold;
		var stURLnew = removeParam("esAT", window.location.href) + "&esAT="+ST_FLD_ADJUSTMENT_TYPE_INID;
		stMessage += "\nstURLnew: "+stURLnew;
		//alert(stMessage);
		window.location.href = stURLnew;
	}
	catch(error){
		var stMessage = getErrorMessage(error);
		console.log("error: processAdjustmentTypeLogic stMessage: "+stMessage);
	}
}//processAdjustmentTypeLogic

function processBodyDepartmentChangeLogic(){
	//console.log("processBodyDepartmentChangeLogic, start");
	////---------------------------------------------------------remove lines if there is any
	var intLineCount = nlapiGetLineItemCount(SUBLIST_ITEM);
	if(intLineCount>0){
		if(!confirm("If you change Department, then all existing Item Lines will be removed.\nBecause items are restricted to the Department.\n\nDo you want to continue?")){
			nlapiSetFieldValue(ESAdjItemAdjustment.FIELD.Department, ST_FLD_DEPARTMENT_INID);////reset to previous department
		}
		else{
			for(var iLine=intLineCount; iLine>0; iLine--){
				nlapiRemoveLineItem(SUBLIST_ITEM, iLine);
			}
		}
	}
	////---------------------------------------------------------update
	ST_FLD_DEPARTMENT_INID = nlapiGetFieldValue(ESAdjItemAdjustment.FIELD.Department);
	////-------
	nlapiCancelLineItem(SUBLIST_ITEM);////reset 1st line in edit
}////processBodyDepartmentChangeLogic

/*
 * if intLineNum is empty, then it is for current line
 */
function validateItemCurrentLine(intLineNum){
	var bCurrentLine = (isNaN(intLineNum) || isNOE(intLineNum));
	var stMessageAppend = (bCurrentLine) ? "" : ("\n@line: "+intLineNum);
	//console.log("validateItemCurrentLine, start ||intLineNum: "+intLineNum);
	////-------------------------------- Body -> Adjustment Type
	var stAdjustmentTypeInid = nlapiGetFieldValue(ESAdjItemAdjustment.FIELD.AdjustmentType);
	if(isNOE(stAdjustmentTypeInid)){
		alert("Error! Please first set the body field 'Adjustment Type' in order to detemine the logic applied to the item lines!");
	}
	////-------------------------------- Sublist: Items -> Field: ItemNDT
	var stItemInid = null;
	var stItemName = null;
	if(ST_FLD_ADJUSTMENT_TYPE_INID != ESAdjAdjustmentType.VALUE.DepartmentTransfer){
		stItemInid = (bCurrentLine)	? nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT)
									: nlapiGetLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT, intLineNum);
		stItemName = (bCurrentLine)	? nlapiGetCurrentLineItemText(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT)
									: nlapiGetLineItemText(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemNDT, intLineNum);
		if(isNOE(stItemInid)){
			alert("Error! Item (NDT) for Non-Department Transfer cannot be empty!"+stMessageAppend);
			return false;
		}
	}
	////-------------------------------- Sublist: Items -> Field: Item
	//console.log("validateItemCurrentLine, Sublist: Items -> Field: Item");
	var stItemInid = null;
	var stItemName = null;
	stItemInid = (bCurrentLine)	? nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Item)
								: nlapiGetLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Item, intLineNum);
	stItemName = (bCurrentLine)	? nlapiGetCurrentLineItemText(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Item)
								: nlapiGetLineItemText(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Item, intLineNum);
	if(isNOE(stItemInid)){
		alert("Error! Item cannot be empty!"+stMessageAppend);
		return false;
	}
	else{
		////-------------- check any duplicated
		var intCurrentLineIndex = (bCurrentLine) ? nlapiGetCurrentLineItemIndex(SUBLIST_ITEM) : intLineNum;
		var intLineCount = nlapiGetLineItemCount(SUBLIST_ITEM);
		if(intLineCount>0){
			for(var iLine=1; iLine<=intLineCount; iLine++){
				if(iLine == intCurrentLineIndex) continue;////no need to check with itself
				
				var stItemCurrent = nlapiGetLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Item, iLine);
				if(stItemInid == stItemCurrent){
					alert("Error! Found duplicated item:\nItem Name: "+stItemName+" (internalid: "+stItemInid+")"+"\n@line:"+intCurrentLineIndex+"\n@line: "+iLine+"\nYou may re-enter these lines and check again.");
					return false;
				}
			}
		}

		////-------------- check if if saleunit != stockunit 
		////only run when check one (current) line, if checking all lines, there will be a lot searches, so avoid it
		if(bCurrentLine){
			var stRecordId = "item";
			var filters=[
			             ["internalid", "anyof", stItemInid]
			             ];
			var columns=[
				   new nlobjSearchColumn('internalid').setSort(),
				   new nlobjSearchColumn('name'),
				   new nlobjSearchColumn('saleunit'),
				   new nlobjSearchColumn('stockunit'),
				   new nlobjSearchColumn('type')
			];
			var results = nlapiSearchRecord(stRecordId,null,filters,columns);
	
			var objItem = {};
			if(results !=null && results.length!=0){
				var result		= results[ 0 ];
				
				objItem.internalid	= result.getValue('internalid');
				objItem.name 		= result.getValue('name');
				objItem.saleunit	= result.getValue('saleunit');
				objItem.saleunit_t	= result.getText('saleunit');
				objItem.stockunit	= result.getValue('stockunit');
				objItem.stockunit_t	= result.getText('stockunit');
				objItem.type		= result.getValue('type');
			}
			/*
			 * change request by Stanley on Feb 1, 2016
			 * Since Non-Inventory items have no "Stock Unit", do not verify the matching of Sale & Stock Unit.
			 */
			if(objItem.type!="NonInvtPart" && objItem.saleunit!=objItem.stockunit){
				alert("Error! For Item " +objItem.name+" (internalid: "+objItem.internalid+")"+stMessageAppend
						+"\n'Sale Unit': "+objItem.saleunit_t+" (id: "+objItem.saleunit+")"
						+"\nmismatch"
						+"\n'Stock Unit': "+objItem.stockunit_t+" (id: "+objItem.stockunit+")"
						+"\n\nPlease edit and correct the Item record first."
					);
				return false;
			}
		}
	}
	////-------------------------------- Sublist: Items -> Field: Quantity
	//console.log("validateItemCurrentLine, Sublist: Items -> Field: Quantity");
	var stQuantity = (bCurrentLine)	? nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Quantity)
									: nlapiGetLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.Quantity, intLineNum);
	var fltQuantity = (!isNOE(stQuantity)) ? parseFloat(stQuantity) : 0;
	if(fltQuantity==0){
		alert("Error! Quantity cannot be 0!"+stMessageAppend);
		return false;
	}
	else{
		if(OBJ_ADJUSTMENT_TYPE.bPositveQuantityOnly && fltQuantity<0){
			alert("Error! You cannot input a negative number!\nCurrent Adjustment Type is configured with 'Positve Quantity Only'."+stMessageAppend);
			return false;
		}
	}
	////-------------------------------- Sublist: Items -> Field: Item Department (validate only for types of Department Transfer)
	if(ST_FLD_ADJUSTMENT_TYPE_INID != ESAdjAdjustmentType.VALUE.DepartmentTransfer){
		//console.log("validateItemCurrentLine, Sublist: Items -> Field: ItemDepartment");
		var stDepartmentInid = (bCurrentLine)	? nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemDepartment)
												: nlapiGetLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemDepartment, intLineNum);
		if(isNOE(stDepartmentInid)){
			alert("Error! Item Department cannot be empty!"+stMessageAppend
					+"\n\nPlease edit and correct the Item record first."
				);
			return false;
		}
	}
	////-------------------------------- Sublist: Items -> Field: Item Price
	//console.log("validateItemCurrentLine, Sublist: Items -> Field: ItemPrice");
	var stItemPrice = (bCurrentLine)	? nlapiGetCurrentLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemPrice)
										: nlapiGetLineItemValue(SUBLIST_ITEM, ESAdjItemAdjustmentLine.FIELD.ItemPrice, intLineNum);
	if(isNOE(stItemPrice)){
		alert("Error! Item Price cannot be empty!"+stMessageAppend
				+"\n\nPlease edit and correct the Item record first."
			);
		return false;
	}
	////-------------------------------- all checked
	return true;
}////validateItemCurrentLine

function removeParam(key, sourceURL){
    var rtn = sourceURL.split("?")[0],
        param,
        params_arr = [],
        queryString = (sourceURL.indexOf("?") !== -1) ? sourceURL.split("?")[1] : "";
    if (queryString !== "") {
        params_arr = queryString.split("&");
        for (var i = params_arr.length - 1; i >= 0; i -= 1) {
            param = params_arr[i].split("=")[0];
            if (param === key) {
                params_arr.splice(i, 1);
            }
        }
        rtn = rtn + "?" + params_arr.join("&");
    }
    return rtn;
}
function resetStatusItemAdjustment (){
	nlapiSetFieldValue(ESAdjItemAdjustment.FIELD.Status, ESAdjProcessStatus.VALUE.Pending);
}

function deleteAndRefresh(){
	var stMessage = "";
	var arrTransactionSet = nlapiGetFieldValues(ESAdjItemAdjustment.FIELD.TransactionsCreated);
	if(typeof(arrTransactionSet)!=="undefined" && arrTransactionSet!==null && arrTransactionSet!==""){
		if(!confirm("Transactions generated from this record will be cleaned up.\nAre you sure to continue?")){
			return;
		}
		if(Object.prototype.toString.call(arrTransactionSet)!=="[object Array]") arrTransactionSet=[arrTransactionSet];
		//console.log("arrTransactionSet: "+JSON.stringify(arrTransactionSet));
		if(arrTransactionSet){
			for(var i=0;i<arrTransactionSet.length;i++){
				var stTransactionInid = arrTransactionSet[i];
				var stTransactionType = nlapiLookupField("transaction", stTransactionInid, "recordtype");
				//console.log("@i:"+i+"||deleting "+stTransactionType+" : "+stTransactionInid);
				nlapiDeleteRecord(stTransactionType, stTransactionInid);
				//console.log("@i:"+i+"||deleted");
				stMessage+="\nDeleted: "+stTransactionType+" (internalid: "+stTransactionInid+")";
			}
		}
	}
	alert(stMessage);
	location.reload();
}////deleteAndRefresh
