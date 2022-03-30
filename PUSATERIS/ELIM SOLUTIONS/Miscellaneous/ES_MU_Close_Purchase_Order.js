/**
 * Copyright (c) 2008-2016 Elim Solutions Inc.
 * 50 McIntosh Drive, Suite 110, Markham, ON, Canada
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Elim Solutions ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Elim Solutions.
 *
 * SVN :: $
 *
 * Project :: Elim Solutions - Gateway
 * Filename :: ES_MU_Close_Purchase_Order.js
 * Created :: 16-04-22
 * Author :: Richard Cai
 *
 * Notes ::
 *
 */

function closePurchaseOrder(stRecType, stRecId){

	//var objRecord = nlapiLoadRecord(stRecType, stRecId, {customform: 98});////standard po form: 98
	var objRecord = nlapiLoadRecord(stRecType, stRecId);
	nlapiLogExecution('DEBUG','closePurchaseOrder','stRecType: '+stRecType+'||stRecId: '+stRecId);
	////-------------------------- expense tab
	var intExpenseLength = objRecord.getLineItemCount('expense');
	nlapiLogExecution('DEBUG','closePurchaseOrder','expense line: '+intExpenseLength);

	var intExpenseClosed = 0;
	if(intExpenseLength>0){
		for(var i=1; i<=intExpenseLength; i++){
			objRecord.setLineItemValue('expense', 'isclosed', i, "T");
			intExpenseClosed++;
		}
	}
	nlapiLogExecution('DEBUG','closePurchaseOrder','expense closed: '+intExpenseClosed);
	////-------------------------- item tab
	var intItemLength = objRecord.getLineItemCount('item');
	nlapiLogExecution('DEBUG','closePurchaseOrder','item line: '+intItemLength);

	var intItemClosed = 0;
	if(intItemLength>0){
		for(var i=1; i<=intItemLength; i++){
			objRecord.setLineItemValue('item', 'isclosed', i, "T");
			intItemClosed++;
		}
	}
	nlapiLogExecution('DEBUG','closePurchaseOrder','item closed: '+intItemClosed);
	////-------------------------- submit
	nlapiSubmitRecord(objRecord, false, false);
	nlapiLogExecution('AUDIT','closePurchaseOrder','Rec: '+stRecId+'||expense closed: '+intExpenseClosed+'/'+intExpenseLength+'||item closed: '+intItemClosed+'/'+intItemLength);
}