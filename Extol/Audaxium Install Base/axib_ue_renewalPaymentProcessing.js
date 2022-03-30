
1/13/2016 - Karen and I talked, Validate with customer if Payment record is always created against invoices.



function ibRenewalPaymentProc(type) {
	
	//For testing ONLY; list out what process is triggering this script
	log('audit','Type // Execution Context', type+' // '+nlapiGetContext().getExecutionContext());
	
	if (type != 'create' && type !='edit') {
		return;
	}
	
	
}