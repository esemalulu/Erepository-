nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 May 2016     Rafe Goldbach, SuiteLaunch LLC
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function splitItem(){
	
	//var masterItem = request.getParameter('item_to_split');
	var masterItem = 8265;
	var fields = new Array();	
	fields[0]= 'custitem_ifd_split_item_link';
	fields[1]= 'averagecost';
	//var columns = new Array();
	nlapiLogExecution('debug','masterItem',masterItem);
	// lookup split item
	var splitPn = nlapiLookupField('inventoryitem', masterItem, 'custitem_ifd_split_item_link');   	
   	var masterAvgCost = nlapiLookupField('inventoryitem', masterItem, 'averagecost');
   	
	
	nlapiLogExecution('debug','splitPn',splitPn);

	nlapiLogExecution('debug','masterAvgCost',masterAvgCost);
	
	//var casesToSplit = request.getParameter('cases_to_split');
	var casesToSplit =2;
	nlapiLogExecution('debug','cases_to_split',casesToSplit);
	
	// get conversion details on the split item
	var fields = new Array();	
	fields[0]= 'custitem_ifd_splitconversion';
	fields[1]= 'custitem_extra_handling_cost1';
	fields[2]= 'custitem_extra_handling_cost2';
	fields[3]= 'custitem_item_burden_percent';
	var columns = nlapiLookupField('inventoryitem', splitPn, fields);
	var conversion = parseFloat(columns.custitem_ifd_splitconversion);
	var extra1 = parseFloat(columns.custitem_extra_handling_cost1);
	var extra2 = parseFloat(columns.custitem_extra_handling_cost2);
	var burden = parseFloat(columns.custitem_item_burden_percent);
	burden = burden/100;
	nlapiLogExecution('debug','lookup data',conversion+'/'+extra1+'/'+extra2+'/'+burden);
	var totalEx = parseFloat(extra1)+parseFloat(extra2);
	nlapiLogExecution('debug','totalEx',totalEx);
	// begin creating the adjustment record
    var record = nlapiCreateRecord('inventoryadjustment');
    
    record.setFieldValue('subsidiary', '2');
    nlapiLogExecution('debug', 'set subsidiary', '2');
    
    record.setFieldValue('adjlocation', '1');
    nlapiLogExecution('debug', 'set adj location', '1');
    
    record.setFieldValue('department', '17');
    nlapiLogExecution('debug', 'department', 17);
    
    record.setFieldValue('account', '329');      
    nlapiLogExecution('debug', 'set account', '329');
    
    record.setFieldValue('custbody_ifd_adj_code', '22');
    nlapiLogExecution('debug', 'set adj code', '22');
    record.setFieldValue('memo', 'Inventory Split'); 

    
    //record.selectNewLineItem('inventory');
    var adjustQty = (parseInt(casesToSplit)*(-1));
    nlapiLogExecution('debug','adjustQty ',adjustQty);
    //record.selectLineItem('inventory','1');
    record.setLineItemValue('inventory', 'item', '1', masterItem);
    nlapiLogExecution('debug', 'set master item', masterItem);
    record.setLineItemValue('inventory', 'adjustqtyby','1',adjustQty);
    nlapiLogExecution('debug', 'set adjustQty', adjustQty);
    record.setLineItemValue('inventory', 'department','1','17');
    nlapiLogExecution('debug', 'set department on line', '17');
    record.setLineItemValue('inventory', 'location','1','1');
    nlapiLogExecution('debug', 'set location on line', '1');
    record.commitLineItem('inventory');
   // record.setLineItemValue('inventory', 'subsidiary','1','2');
    //var caseRate = parseFloat(record.getLineItemValue('inventory','unitcost','1'));
    
    // begin line 2
    var caseRate = masterAvgCost;
    nlapiLogExecution('debug','caseRate',caseRate);
    var splitRate = parseFloat(caseRate/conversion);
    splitRate = (splitRate+extra1+extra2)*(1+burden);
    nlapiLogExecution('debug','splitRate',splitRate);

    record.setLineItemValue('inventory', 'item', '2',splitPn);
    nlapiLogExecution('debug','set item 2',splitPn);
    
    var adjustby = parseInt(casesToSplit)*parseInt(conversion);
    record.setLineItemValue('inventory', 'adjustqtyby', '2',adjustby);
    nlapiLogExecution('debug','set adjustqtyby 2',adjustby);
   
    record.setLineItemValue('inventory', 'unitcost', '2',splitRate);
    nlapiLogExecution('debug','set unit cost 2',splitRate);
    
    record.setLineItemValue('inventory', 'department', '2','17');
    nlapiLogExecution('debug','set department','17');
    
    record.setLineItemValue('inventory', 'location','2','1');
    nlapiLogExecution('debug','set location','1');
           
    record.commitLineItem('inventory');
    nlapiLogExecution('debug','line committed','2');
    
    
    
    // Begin test for values
    nlapiLogExecution('debug', 'header sub', nlapiGetFieldValue('record.subsidiary'));
    nlapiLogExecution('debug', 'header loc', nlapiGetFieldValue('record.adjlocation'));
    nlapiLogExecution('debug', 'header dep', nlapiGetFieldValue('record.department'));
    nlapiLogExecution('debug', 'header acct', nlapiGetFieldValue('record.account'));
    
    
    
    
    
    
   // var id = nlapiSubmitRecord(record, true);
    //nlapiLogExecution('debug','record committed',id);
    
    
    
    
    //nlapiSetRedirectURL('RECORD','inventoryadjustment', id, false);
} 
