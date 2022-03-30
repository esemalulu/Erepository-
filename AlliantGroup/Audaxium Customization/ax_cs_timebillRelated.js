/**
 * Client script deployed against timebill to toggle availability of phase field.
 * Workflow did not have timebill record type exposed. 
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Nov 2015     json
 *
 */

//Company Level Preference
var paramEnablePhasePrjClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_sb158_enablephaseprjclass'),
	paramNaPhaseValue = nlapiGetContext().getSetting('SCRIPT','custscript_sb158_naphasevalue');

function timebillPageInit(type)
{
	
	if (nlapiGetContext().getExecutionContext()=='userinterface')
	{
		//Disable the Phase Field each load
		nlapiDisableField('custcol_adx_project_phase', true);
	
		//convert class IDs into an array
		if (paramEnablePhasePrjClassIds)
		{
			if (typeof paramEnablePhasePrjClassIds == 'string')
			{
				paramEnablePhasePrjClassIds = paramEnablePhasePrjClassIds.split(',');
			}
			
			for (var p=0; p < paramEnablePhasePrjClassIds.length; p+=1)
			{
				//Go through each and remove any empty spaces since user may have added comma and space
				paramEnablePhasePrjClassIds[p] = strTrim(paramEnablePhasePrjClassIds[p]);
			}
		}
		else
		{
			paramEnablePhasePrjClassIds = new Array();
		}
		
		//If project Class value is set, run logic to enable/disable Phase field
		if (nlapiGetFieldText('custcol_adx_project_class') && 
			paramEnablePhasePrjClassIds.contains(nlapiGetFieldValue('custcol_adx_project_class')))
		{
			nlapiDisableField('custcol_adx_project_phase', false);
		}
		
		if (type=='create')
		{
			//3/1/2016 - If class isn't set or class is NOT one of trigger phase class default it to NA phase
			if (!nlapiGetFieldText('custcol_adx_project_class') ||
				(
					nlapiGetFieldText('custcol_adx_project_class') &&
					!paramEnablePhasePrjClassIds.contains(nlapiGetFieldValue('custcol_adx_project_class'))
				)
			   )
			{
				nlapiSetFieldValue('custcol_adx_project_phase', paramNaPhaseValue);
			}
		}
		
	}
}

//2/8/2016 - Client Requested item #2: Parameterize comma separated list of departments too
//			 Exclude from phase requirements. 
var paramPhaseExclusion = nlapiGetContext().getSetting('SCRIPT','custscript_sb158_excludephasereqdept');
if (paramPhaseExclusion)
{
	paramPhaseExclusion = paramPhaseExclusion.split(',');
}

function timeBillOnSave()
{
	//If project Class value is set, run logic to enable/disable Phase field
	if (nlapiGetFieldText('custcol_adx_project_class') && 
		paramEnablePhasePrjClassIds.contains(nlapiGetFieldValue('custcol_adx_project_class')) )
	{
		//Execute ONLY if the user is Craig Or Patric or Harris
		//if (nlapiGetUser()=='130772' || nlapiGetUser()=='46574' || nlapiGetUser()=='7')
		//{
		
			//If there are no exclusion list defined OR there are exclusion list but the 
			//		currently logged in users' department is NOT one of them
			
			//alert(paramPhaseExclusion+' // '+nlapiGetFieldValue('custcol_adx_project_phase'));
			
			if (paramPhaseExclusion==0 || (paramPhaseExclusion.length > 0 && !paramPhaseExclusion.contains(nlapiGetDepartment())))
			{
				//At this point, we need to check if user provided phase
				if (!nlapiGetFieldValue('custcol_adx_project_phase') ||
					nlapiGetFieldValue('custcol_adx_project_phase') == paramNaPhaseValue)
					
				{
					alert('Phase is a required field. N/A is not a proper phase value');
					return false;
				}
				
				
			}
		//}
	}
	
	return true;
		
}

/**
 * Post sourcing function
 */
function timebillPostSourcing(type, name)
{

	//Only trigger if user is entering time
	if (nlapiGetContext().getExecutionContext()=='userinterface')
	{
		if (name=='customer')
		{
			//If project Class value is set, run logic to enable/disable Phase field
			if (nlapiGetFieldText('custcol_adx_project_class') && 
				(paramPhaseExclusion.length > 0 && paramPhaseExclusion.contains(nlapiGetDepartment()) ||
				 paramEnablePhasePrjClassIds.contains(nlapiGetFieldValue('custcol_adx_project_class')) 
				)
			   )
			{
				nlapiDisableField('custcol_adx_project_phase', false);
				//If the value is N/A, empty it out
				if (nlapiGetFieldValue('custcol_adx_project_phase') == paramNaPhaseValue)
				{
					nlapiSetFieldValue('custcol_adx_project_phase','',true,true);
				}
			}
			else
			{
				//Clear out the value and disable it
				//2/17/2016 - Odd NS behavior when attempting to set the field to NULL on disabled field
				nlapiSetFieldValue('custcol_adx_project_phase',paramNaPhaseValue,true,true);
				
				nlapiDisableField('custcol_adx_project_phase', true);
			}
		}

	}
	
}
