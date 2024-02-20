/**
 * Scheduled script that will insert a role into Suitelet deployments.
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 May 2019     nathanah
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function SSKB_InsertRoleInDeploy_Sch(type) 
{
	var roleId = nlapiGetContext().getSetting('SCRIPT', 'custscriptsskbsdf_insertrolesch_role');	
	var deploySearch = nlapiSearchRecord("scriptdeployment",null,
		[
		   ["script.scripttype","anyof","SCRIPTLET"]
		], 
		[
		   new nlobjSearchColumn("internalid")
		]
	);
	
	if (deploySearch != null && deploySearch.length > 0)
	{
		for (var i=0; i<deploySearch.length; i++)
		{	
			var deployId = deploySearch[i].getId();
			
			try
			{
				var deployRec = nlapiLoadRecord('scriptdeployment', deployId, null);
				var allRoles = deployRec.getFieldValue('allroles');
				if (allRoles == 'F')
				{
					var rolesArray = deployRec.getFieldValue('audslctrole') || '';
					
					if (rolesArray == '')
						rolesArray = new Array();
					else if (typeof rolesArray === 'string')
						rolesArray = [rolesArray];
					
					if (rolesArray.indexOf(roleId) == -1)
					{
						rolesArray.push(roleId);
						deployRec.setFieldValues('audslctrole', rolesArray);
						nlapiSubmitRecord(deployRec);
						
						if (nlapiGetContext().getRemainingUsage() < 50)
						{
							nlapiYieldScript();
						}
					}
				}
			}
			catch (ex)
			{
				nlapiLogExecution('ERROR', 'deployId', deployId + ' failed.');
			}
		}
	}
}
