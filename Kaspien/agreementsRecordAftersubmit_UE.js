function afterSubmitRecord(type) {
	if(type != 'edit' && type != 'xedit' && type != 'create') return false;
	
	try {
		nlapiLogExecution('DEBUG', "Start of Agreements After Submit Event", "Agreement Id: " + nlapiGetRecordId());
		
		var vendorId = nlapiGetFieldValue('custrecordagreement_partner');
		
		var latestAgreement = getParentLatestAgreement(vendorId);
		
		nlapiLogExecution('DEBUG', "Latest Agreements", JSON.stringify(latestAgreement));
		
		if(!latestAgreement.internalid) return false;
		
		nlapiLogExecution('DEBUG', "---Date---", nlapiGetFieldValue('custrecordagreement_start_date') + "----" + new Date(nlapiGetFieldValue('custrecordagreement_start_date')) + ' < ' + new Date(latestAgreement.start_created));
		
		if(new Date(nlapiGetFieldValue('custrecordagreement_start_date')) < new Date(latestAgreement.start_created)) return false;
		
		var vendorRecord = nlapiLoadRecord('vendor', vendorId);
		var partnershipDetails = nlapiGetFieldText('custrecord_agreement_other_pship_details');
		nlapiLogExecution('DEBUG', "partnershipDetails", partnershipDetails);
		
		if(partnershipDetails == 'Exclusive Seller') {
			vendorRecord.setFieldText('custentity_exclusivity', 'etailz only');
		} else if(partnershipDetails == 'Co-exclusive seller'){
			vendorRecord.setFieldText('custentity_exclusivity', 'Co-exclusive');
		} else {
			vendorRecord.setFieldText('custentity_exclusivity', '');
		}
		
		var marketplacesForParner = getMappedMarketplaces();
		nlapiLogExecution('DEBUG', "marketplacesForParner", marketplacesForParner);
		vendorRecord.setFieldValues('custentityebay_listed_c', marketplacesForParner);
		
		nlapiLogExecution('DEBUG', "End of Agreements After Submit Event", "Agreement Id: " + nlapiGetRecordId());
		
		nlapiSubmitRecord(vendorRecord, false, true);
	} catch(ex) {
		nlapiLogExecution('DEBUG', "ERROR::", ex.message);
	}
}

function getParentLatestAgreement(vendorId){
	var filters = [];
	var columns = [];
	filters[0] = new nlobjSearchFilter('custrecordagreement_start_date', null, 'isnotempty', null);
	filters[1] = new nlobjSearchFilter('custrecordagreement_partner', null, 'anyof', [vendorId]);
	
	columns[0] = new nlobjSearchColumn ('id', null, 'MAX');
	columns[1] = new nlobjSearchColumn ('custrecordagreement_start_date', null, 'MAX');
	var latestAgreements = nlapiSearchRecord('customrecordcustomrecordetailz_agreement', null, filters, columns);
	nlapiLogExecution('DEBUG', "Agreement Internal Id", latestAgreements[0].getValue('id', null,'MAX'));
	nlapiLogExecution('DEBUG', "custrecordagreement_start_date", latestAgreements[0].getValue('custrecordagreement_start_date',null,'MAX'));
	if(latestAgreements.length <= 0) return {'internalid': '', 'start_created': ''};
	return {'internalid': latestAgreements[0].getValue('id', null,'MAX'), 'start_created': latestAgreements[0].getValue('custrecordagreement_start_date',null,'MAX')};
}

function getMappedMarketplaces() {
	/*{
		'1. AMZ US': 'Amazon', '2. AMZ CA': 'Amazon - CA', '3. AMZ UK': 'Amazon - UK', '4. AMZ DE': 'Amazon - DE',
		'5. AMZ MX': 'Amazon - MX', '6. Walmart': 'Walmart', '7. Ebay US': 'eBay', '8. Google Express': 'Google Express',
		'9. Rakuten': 'Rakuten', '10. Overstock': 'Overstock', '11. Sears': 'Sears', '12. Shop.com': 'Shop', '13. Other': 'Other'
	}*/
	// mapping for marketplaces between Agreements and Partner fields
	var mappedMarketplaces = {
		'1': '5','2': '7','3': '13','4': '8','5': '11','6': '14','7': '1','8': '25','9': '26','10': '23','11': '2','12': '22','13': '27'
	};
	var marketplacesApproved = nlapiGetFieldValues('custrecord_agreement_marketplace');
	var marketplacesForParner = [];
	if(!marketplacesApproved) return marketplacesForParner;
	marketplacesApproved.forEach(function(value, key){if(mappedMarketplaces[value] !== undefined) marketplacesForParner.push(mappedMarketplaces[value]);});
	return marketplacesForParner;
}