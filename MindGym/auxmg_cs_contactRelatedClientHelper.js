
function contactFldChanged(type, name, linenum)
{
	//add it in to trigger for UI ONLY
	if (nlapiGetContext().getExecutionContext() != 'userinterface')
	{
		return;
	}
	//custpage_currtzcountry
	
	//If field changed defaultbilling OR addressbookaddress_text start the process
	if (type == 'addressbook' && (name == 'defaultbilling' || name == 'addressbookaddress_text'))
	{
		if (nlapiGetCurrentLineItemValue(type, 'defaultbilling') != 'T')
		{
			buildDropDown();
			nlapiSetFieldValue('custpage_currtzcountry','');
		}
		else
		{
			if (nlapiGetFieldValue('custpage_currtzcountry') != nlapiGetCurrentLineItemValue(type,'country'))
			{
				buildDropDown(nlapiGetCurrentLineItemValue(type,'country'));
				nlapiSetFieldValue('custpage_currtzcountry',nlapiGetCurrentLineItemValue(type,'country'));
			}
		}
			
	}

	//If changed field value is custpage_timezone, sync it with custentity_bo_eventtimezone
	if (name == 'custpage_timezone')
	{
		nlapiSetFieldValue('custentity_bo_eventtimezone', nlapiGetFieldValue('custpage_timezone'));
	}
	
}

function buildDropDown(_countryAbbr)
{
	//Clear ALL option value
	nlapiRemoveSelectOption('custpage_timezone');
	nlapiInsertSelectOption('custpage_timezone', '', '', true);
	nlapiSetFieldValue('custpage_timezone','');

	if (_countryAbbr)
	{
		if (countryJson[_countryAbbr])
		{
			for (var tz in countryJson[_countryAbbr])
			{
				nlapiInsertSelectOption('custpage_timezone', countryJson[_countryAbbr][tz], tz, false);
			}
		}
	} 

}