function customRecordBeforeLoadUE(type, form)
{
  var currentContext = nlapiGetContext();
  if (currentContext.getExecutionContext() == 'userinterface')
  {
	var formName = nlapiGetFieldText("customform");
	if(formName == 'Amazon Coupon Code') nlapiSetFieldValue("custrecordcustomrecord_contentprojecttyp", 8, null, true);
	else if(formName == 'Amazon Giveaway') nlapiSetFieldValue("custrecordcustomrecord_contentprojecttyp", 9, null, true);
	else if(formName == 'Influencer Campaign') nlapiSetFieldValue("custrecordcustomrecord_contentprojecttyp", 1, null, true);
	else if(formName == 'Social Ad Campaign') nlapiSetFieldValue("custrecordcustomrecord_contentprojecttyp", 2, null, true);
  }   
}