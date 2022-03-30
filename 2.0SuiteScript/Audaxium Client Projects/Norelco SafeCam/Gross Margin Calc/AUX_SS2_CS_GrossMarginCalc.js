/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
 
/**
* SCRIPT EXPLANATION:
*  - The purpose of this script is to display line level Gross Margin as the user enters an item line.
*  - A temporary (Store Value = F) custom column field will display the Gross Margin.
*/ 
define([],

function(){
	
	function pageInit(context) {
		var currentRecord = context.currentRecord;
		
		//Loop through the item list
		var intCount = currentRecord.getLineCount({
			sublistId: 'item'
		});
		
		for(var i = 0; i < intCount; i++){
			
			currentRecord.selectLine({
				sublistId: 'item',
				line: i
			});
			
			calculateGrossMargin(currentRecord);
			
			currentRecord.commitLine({
				sublistId: 'item'
			});
		}
	}
	
	function fieldChanged(context) {
		var arFields = ['rate', 'amount', 'costestimate', 'quantity'];
		processField(context, arFields);
	}
	
	function postSourcing(context){
		var arFields = ['pricelevels', 'costestimatetype'];
		processField(context, arFields);
	}
	
	function processField(context, arFields){
		
		var currentRecord = context.currentRecord;
		var sublistName = context.sublistId;
		var sublistFieldName = context.fieldId;
		var line = context.line;
		
		if(sublistName === 'item' && arFields.indexOf(sublistFieldName) > -1){
			calculateGrossMargin(currentRecord);					
		}
	}
	
	function calculateGrossMargin(currentRecord){
		var amount = currentRecord.getCurrentSublistValue({
				sublistId: 'item',
				fieldId: 'amount'
			});
			
		var cost = currentRecord.getCurrentSublistValue({
				sublistId: 'item',
				fieldId: 'costestimate'
			});
			
		var grossMargin = (amount ? parseFloat(amount) : 0) - (cost ? parseFloat(cost) : 0);
		
		/*
		//Set gross margin in temporary column fields
		currentRecord.setCurrentSublistValue({
			sublistId: 'item',
			fieldId: 'custcol_grossmargin_live',
			value: grossMargin
		});*/
			
		//Gross Margin Percent
		var grossMarginPercent = (amount ? (parseFloat(amount) != 0 ? parseFloat(((grossMargin/parseFloat(amount))*100).toFixed(4)).toString()+'%' : '') : '');
		currentRecord.setCurrentSublistValue({
			sublistId: 'item',
			fieldId: 'custcol_grossmargin_live',
			value: grossMarginPercent
		});
	}

    return {
		//pageInit : pageInit,		//commented out for now as it makes the record load slower; may be reinstated if client requests it
        fieldChanged : fieldChanged,
		postSourcing : postSourcing
    };

});
