function fieldChanged(type, name) {

	switch (name) {
		case 'custcol_expense_mileage':
			calculate_mileage();
			break;
		case 'custcol_expense_mileage_unit':
			calculate_mileage();
			break;
	}
}

function calculate_mileage() {
	mileage = nlapiGetCurrentLineItemValue('expense', 'custcol_expense_mileage');
	mileage_unit = nlapiGetCurrentLineItemValue('expense', 'custcol_expense_mileage_unit');
	mileage_unit_text = nlapiGetCurrentLineItemText('expense', 'custcol_expense_mileage_unit');
	currency = nlapiGetCurrentLineItemValue('expense', 'currency');
	mileage_value = 0;
	valid_mileage_unit = false;
	
	switch (mileage_unit) {
		case '1': // Km
			mileage_value = mileage * 0.3; // EUR
			valid_mileage_unit = true;
			break;
			
		case '2': // Miles (UK)
			mileage_value = mileage * 0.4; // GBP
			valid_mileage_unit = true;
			break;

		case '3': // Miles (US)
			mileage_value = mileage * 0.2; // USD
			valid_mileage_unit = true;
			break;
			
		default:
			nlapiSetCurrentLineItemValue('expense', 'amount', 0);
	}
	
	if (valid_mileage_unit) {
		nlapiSetCurrentLineItemValue('expense', 'amount', mileage_value);
	}
}