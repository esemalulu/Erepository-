/*
 * @author tsantos
 * 3/20/2017 - This is a duplication and modification of the original Migrate to NXENTALL button made by @efagone
 */

/**
 * Run Suitelet
 */
function opportunity_migrate_ivm_suitelet(request, response){

	var tranId = request.getParameter('custparam_tranid');
	var tranType = request.getParameter('custparam_trantype');
	
	try {
		nlapiLogExecution('AUDIT', 'Beginning upgrade process');
		upgradeOpportunity(tranId);
		
		return response.writeLine(JSON.stringify({
			success: true,
			error: null
		}));
	} 
	catch (e) {
		if (e.code) {
			return response.writeLine(JSON.stringify({
				success: false,
				error: 'Code: ' + e.code + '\nDetails: ' + e.details
			}));
		}
		else {
			return response.writeLine(JSON.stringify({
				success: false,
				error: e
			}));
		}
	}	
}

/**
 * Upgrades the opportunity to have the new InsightVM corresponding SKUs
 * @param oppId = the opportunity to be updated
 */
function upgradeOpportunity(oppId){
	
	nlapiLogExecution('AUDIT', 'Upgrade Opp', 'Opp ID: '+ oppId + '. Function Started');

	var recTran = nlapiLoadRecord('opportunity', oppId, {recordmode: 'dynamic'});
	var lineItemCount = recTran.getLineItemCount('item');
	
	nlapiLogExecution('AUDIT', 'Upgrade Opp', 'Opp ID: '+ oppId + '. Line Count: ' + lineItemCount);
	
	for (var i = 1; i <= lineItemCount; i++) {
		
		// InsightVM Licenses 
		if(recTran.getLineItemValue('item', 'item', i) == 1369) { //RNXENTALL : 1369
			modifyLine(recTran, i, 2245, 'T'); //RXMIG-RIVM : 2245

			nlapiLogExecution('AUDIT', 'IVM Line Created', 'Opp ID: ' + oppId + '. Line Item : ' + i);
		}
		
		// InsightVM Consoles
		if(recTran.getLineItemValue('item', 'item', i) == 1443) { //RNXENTALLCONS : 1443
			modifyLine(recTran, i, 2246, 'T'); //RXMIG-RIVMCONS : 2246
			nlapiLogExecution('AUDIT', 'IVM Console Line Created', 'Opp ID: ' + oppId + '. Line Item : ' + i);
		}
		
		// InsightVM Additional Consoles
		if(recTran.getLineItemValue('item', 'item', i) == 1456) { //RNXENTALLCONS-ADD : 1456
			modifyLine(recTran, i, 2247, 'T'); //RXMIG-RIVMCONS-ADD : 2247
			nlapiLogExecution('AUDIT', 'IVM Additional Console Line Created', 'Opp ID: ' + oppId + '. Line Item : ' + i);
		}
		
		// InsightVM Dedicated Hosted
		if(recTran.getLineItemValue('item', 'item', i) == 643) { //RNXHOSD : 643
			modifyLine(recTran, i, 2249, 'F'); //RXMIG-RIVMHOSD : 2249
			nlapiLogExecution('AUDIT', 'IVM Dedicated Hosted Line Created', 'Opp ID: ' + oppId + '. Line Item : ' + i);
		}
		
		// InsightVM Hosted 512
		if(recTran.getLineItemValue('item', 'item', i) == 1021) { //RNXHOS512 : 1021
			modifyLine(recTran, i, 2248, 'F'); //MIG-RIVMHOS512 : 2248
			nlapiLogExecution('AUDIT', 'IVM Hosted 512 Line Created', 'Opp ID: ' + oppId + '. Line Item : ' + i);
		}
		
		// InsightVM Additional IPs
		if(recTran.getLineItemValue('item', 'item', i) == 1371) { //RNXENTALLIP : 1371
			modifyLine(recTran, i, 2250, 'F'); //RXMIG-RIVMASSETS : 2250
			nlapiLogExecution('AUDIT', 'IVM Add IPs Line Created', 'Opp ID: ' + oppId + '. Line Item : ' + i);
		}
		
		
		else {
			nlapiLogExecution('AUDIT', 'No IVM SKU Replacement', 'Opp ID: ' + oppId + '. Line Item : ' + i);
		}
	}

	nlapiLogExecution('AUDIT', 'SUBMITTING OPP', 'Opp ID: ' + oppId);
	nlapiSubmitRecord(recTran, true, true);
}


/**
 * Removes the old transaction line from the Opportunity and creates a new corresponding one
 * @param recTran The transaction ID of the opportunity to be modified
 * @param oldLineNum The line number of the transaction to be updated
 * @param newSkuId This is the ID of the new SKU to be replacing the old one
 * @param createLicense Boolean value to whether this should set the ACL as true or false
 */
function modifyLine(recTran, oldLineNum, newSkuId, createLicense) {
	
	// Get transaction line column values
	var quantity = recTran.getLineItemValue('item', 'quantity', oldLineNum);
	var rate = recTran.getLineItemValue('item', 'rate', oldLineNum); 
	var amount = recTran.getLineItemValue('item', 'amount', oldLineNum);
	var startdate = recTran.getLineItemValue('item', 'custcolr7startdate', oldLineNum);
	var enddate = recTran.getLineItemValue('item', 'custcolr7enddate', oldLineNum);
	var contact = recTran.getLineItemValue('item', 'custcolr7translinecontact', oldLineNum);
	var createdfrom = recTran.getLineItemValue('item', 'custcolr7createdfromra', oldLineNum);
	var location = recTran.getLineItemValue('item', 'location', oldLineNum);
	var contractrenewal = recTran.getLineItemValue('item', 'custcolr7contractrenewal', oldLineNum);
	var renewaltotal = recTran.getLineItemValue('item', 'custcolr7opamountrenewalbaseline', oldLineNum);
	var renewalcoterm = recTran.getLineItemValue('item', 'custcolr7opamountrenewalcotermline', oldLineNum);
	var renewalmultiyear = recTran.getLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', oldLineNum);
	var iscoterm = recTran.getLineItemValue('item', 'custcolr7iscotermline', oldLineNum);
	var renewalbasetermdays = recTran.getLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', oldLineNum);
	var shiptocode = recTran.getLineItemValue('item', 'custcol_ava_shiptousecode', oldLineNum);
	var renewalacvamount = recTran.getLineItemValue('item', 'custcolr7acvamount', oldLineNum);
	var createdfrom_line = recTran.getLineItemValue('item', 'custcolr7createdfromra_lineid', oldLineNum);
	var monthlygbamount = recTran.getLineItemValue('item', 'custcolr7_monthlydatalimit_gb', oldLineNum);
	var itemproductkey = recTran.getLineItemValue('item', 'custcolr7itemmsproductkey', oldLineNum);
	
	// var sku = nlapiLoadRecord('item', newSkuId);
	// var categorypurchased = sku.getFieldValue('custitemr7categorypurchaseditem');

	//Insert the new Item SKU
	recTran.selectLineItem('item', oldLineNum);
	
	recTran.setCurrentLineItemValue('item', 'item', newSkuId); // Set new SKU
	recTran.setCurrentLineItemValue('item', 'price', -1);
	recTran.setCurrentLineItemValue('item', 'quantity', quantity);
	recTran.setCurrentLineItemValue('item', 'rate', rate);
	recTran.setCurrentLineItemValue('item', 'amount', amount);
	recTran.setCurrentLineItemValue('item', 'custcolr7startdate', startdate);
	recTran.setCurrentLineItemValue('item', 'custcolr7enddate', enddate);
	recTran.setCurrentLineItemValue('item', 'custcolr7transautocreatelicense', createLicense);  // Set to create new license
	recTran.setCurrentLineItemValue('item', 'custcolr7translinecontact', contact);
	recTran.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdfrom); 
	recTran.setCurrentLineItemValue('item', 'custcolr7translicenseid', null);   // Set license ID text to null
	recTran.setCurrentLineItemValue('item', 'location', location);	
	recTran.setCurrentLineItemValue('item', 'custcolr7contractrenewal', contractrenewal);
	recTran.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', renewaltotal);
	recTran.setCurrentLineItemValue('item', 'custcolr7opamountrenewalcotermline', renewalcoterm);
	recTran.setCurrentLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', renewalmultiyear);
	recTran.setCurrentLineItemValue('item', 'custcolr7iscotermline', iscoterm);
	recTran.setCurrentLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', renewalbasetermdays);
	recTran.setCurrentLineItemValue('item', 'custcol_ava_shiptousecode', shiptocode);
	recTran.setCurrentLineItemValue('item', 'custcolr7acvamount', renewalacvamount);
	recTran.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdfrom_line);	
	recTran.setCurrentLineItemValue('item', 'custcolr7_monthlydatalimit_gb', monthlygbamount);
	recTran.setCurrentLineItemValue('item', 'custcolr7itemmsproductkey', itemproductkey);
	recTran.commitLineItem('item');
	
	recTran.setLineItemValue('item', 'custcolr7itemmsproductkey', oldLineNum, '');

}