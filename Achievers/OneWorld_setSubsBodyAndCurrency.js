function beforeSubmitSubsidiaryAndCurrency()
{
	var ctx = nlapiGetContext();
    var executionType=ctx.getExecutionContext();

	if (executionType=='smbxml')
    {
		var currentTransBody = nlapiGetNewRecord();
		var TransBodySub = currentTransBody.getFieldValue("custbody_subsidiary");
		currentTransBody.setFieldValue("subsidiary", TransBodySub);
 
		var transBodyCompanyGet = currentTransBody.getFieldValue("entity");
		var transBodyCurrency = nlapiLookupField( 'customer', transBodyCompanyGet, 'currency');
		currentTransBody.setFieldValue("currencyname", transBodyCurrency);
	}
}

