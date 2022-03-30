/*
==================================================================================
Change ID		:CH#LEAD_DISQUALIFICATION_REASON
Programmer	:Sagar Shah
Description		: Validate Disqualification Reason
Date					: 04/13/2011
==================================================================================
**/

function saveRecord()
{
	
	var disqualification_status = validateLeadDisqualificationReason();
	if(disqualification_status != true) {
		return false;
	}

	var stage = nlapiGetFieldText('entitystatus');		
	if(stage == 'PROSPECT-0 Unqualified') {
		nlapiSetFieldValue('custentity_assign_lead_to_marketing','T');		
	}

	return true;
}


function onFieldChange(type,name)
{
	

	if(name == 'custentity_reason_for_disqualification') 
	{
		if(nlapiGetFieldText('custentity_reason_for_disqualification') == 'Too late - vendor selected') {
			nlapiDisableField('custentity_vendor_name', false);
		} else {
			nlapiDisableField('custentity_vendor_name', true);
		}

		if(nlapiGetFieldText('custentity_reason_for_disqualification') == 'Other') {
			nlapiDisableField('custentity_explain', false);
		} else {
			nlapiDisableField('custentity_explain', true);
		}

	}
	
	return true;
}

function pageInit()
{
	//disble the two dependent fields
	//nlapiDisableField('custentity_vendor_name', true);
	//nlapiDisableField('custentity_explain', true);
        //For user role 'Pardot Role' set the default sub to 'Kana Software Inc'
        /*
       	var entityid = nlapiGetFieldValue('entityid');
	var roleid = nlapiGetContext().getRole();
       if(entityid=='To Be Generated' && roleid=='1163') {
		//if it is a brand new lead and user role is Pardot Role, populate default subsidiary value
		nlapiSetFieldText('subsidiary','Kana Software Inc');
	}
*/

}

