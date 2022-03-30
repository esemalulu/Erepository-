
var testCustomer = nlapiGetContext().getSetting('SCRIPT', 'custscript_axtxov_testcustomer');
var testItem = nlapiGetContext().getSetting('SCRIPT', 'custscript_axtxov_testitem');


function trxTaxOverrideBeforeSubmit(type) {

	
	try {
		
		//ONLY fire for Sales Orderr, Opportunity and Estimate
		//DO NOT fire for Delete or inline Edits
		if (nlapiGetRecordType()!='salesorder' && nlapiGetRecordType()!='opportunity' && nlapiGetRecordType()!='estimate' && type !='delete' && type !='xedit') {
			log('debug','Trx Type Not Valid','Not part of Tax Override Trx Type: '+recordType);
			return;
		}
		
		//get shipping information 
		//NS Tax Code is based on zip code
		var shipCity = nlapiGetFieldValue('shipcity');
		var shipStateValue = nlapiGetFieldValue('shipstate');
		var shipZip = nlapiGetFieldValue('shipzip');

		//JSON that maps tax override States' resale number field on customoer
		var statejson = {
				'CA':'resalenumber',
				'NY':'custentity39',
				'CO':'custentity40',
				'FL':'custentity41',
				'GA':'custentity42',
				'IN':'custentity43'
			};
		
		
		//Only fire for Shipping State in tax override states
		if (!shipStateValue || !statejson[shipStateValue]) {
			log('debug','Shipping State: '+shipStateValue+' is empty or NOT one of tax override states');
			return;
		}
		
		//Make sure zipcode is provided since NS tax lookup is based on zipcode
		if (!shipZip) {
			log('error','Shipping Zipcode is Missing','Missing Zipcode. Can Not lookup Tax Code without it.');
			return;
		}
		
		//If End User Resale Number is provided, RETURN. NO NEED to Process
		if (nlapiGetFieldValue('custbody53')) {
			log('debug','Trx has End User Resale Number','Trx End User Resale Number: '+nlapiGetFieldValue('custbody53')+'. Do Not Process');
			return;
		}
		
		//get Taxable flag and states' resale number value of customer
		var customerTaxable = true;
		var hasStateResaleNumber = true;
		try {
			var lookupFld = new Array();
			lookupFld[0]='taxable';
			lookupFld[1] = statejson[shipStateValue];
			
			var lookupVal = nlapiLookupField('customer', nlapiGetFieldValue('entity'), lookupFld, false);
			
			log('debug','Customer Is Taxable:',lookupVal['taxable']);
			
			if (lookupVal['taxable']!='T') {
				customerTaxable = false;
			}
			
			log('debug',shipStateValue+' resale value on customer',lookupVal[statejson[shipStateValue]]);
			
			if (!strTrim(lookupVal[statejson[shipStateValue]])) {
				hasStateResaleNumber = false;
			}
			
		} catch (customertxerr) {
			log('error','Unable to check Customer Tax Status for entity ID: '+nlapiGetFieldValue('entity')+' on Trx type '+recordType, getErrText(customertxerr));
		}
		
		//ONLY execute when customer is NOT Taxable
		if (customerTaxable || hasStateResaleNumber) {
			log('debug','Customer is Marked as Taxable Or Has State Resale Value','Do Not Process');
			return;
		}
		
		log('debug','Ship City', shipCity);
		log('debug','Ship State Value', shipStateValue);
		log('debug','Ship Zip', shipZip);
		
		//create new Sales Order against test customer and set shipping address
		var sorec = nlapiCreateRecord('salesorder', {recordmode: 'dynamic'});
		sorec.setFieldValue('entity', testCustomer);
		sorec.setFieldValue('shipcity', shipCity);
		sorec.setFieldValue('shipstate', shipStateValue);
		sorec.setFieldValue('shipzip', shipZip);
		
		//add test item to the line item
		sorec.selectNewLineItem('item');
		sorec.setCurrentLineItemValue('item', 'item', testItem);
		
		log('debug','Tax Code',sorec.getCurrentLineItemValue('item', 'taxcode'));
		log('debug','Tax Code',sorec.getCurrentLineItemText('item', 'taxcode'));
		
		//var taxCodeText = sorec.getCurrentLineItemText('item', 'taxcode');
		var taxCodeId = sorec.getCurrentLineItemValue('item', 'taxcode');
		
		//go through all line item and set tax code
		if (taxCodeId) {
			var lineCount = nlapiGetLineItemCount('item');
			for (var i=1; i <= lineCount; i++) {
				nlapiSelectLineItem('item', i);
				
				var prevTaxCode = nlapiGetCurrentLineItemValue('item', 'taxcode');
				log('debug','line '+i, 'Original Tax Code: '+prevTaxCode+' // New Tax Code: '+taxCodeId);
				
				//Update ONLY when it's different
				if (taxCodeId != prevTaxCode) {
					nlapiSetCurrentLineItemValue('item', 'taxcode', taxCodeId, true, true);
					nlapiCommitLineItem('item');
				}		
			}
		}
		
	} catch (toerr) {
		log('error','Tax override', getErrText(toerr));
	}
	
}