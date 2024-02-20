/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Apr 2015     ibrahima
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function SetDealerWebsiteRoles_MassUpdate(recType, recId) 
{
	var dealer = nlapiLoadRecord(recType, recId);
	var roleMappingArray = GetRoleMappingArray();
	var hasChangedRole = false;
	if(roleMappingArray != null && roleMappingArray.length > 0)
	{
		var roleSublist = 'contactroles';
		for(var i = 1; i <= dealer.getLineItemCount(roleSublist); i++)
		{
			var currentRoleId = dealer.getLineItemValue(roleSublist, 'role', i);
			
			for(var j = 0; j < roleMappingArray.length; j++)
			{
				if((currentRoleId == roleMappingArray[j].oldRoleId) && dealer.getLineItemValue(roleSublist, 'giveaccess', i) == 'T')
				{
					dealer.selectLineItem(roleSublist, i);
					dealer.setCurrentLineItemValue(roleSublist, 'role', roleMappingArray[j].newRoleId);
					dealer.commitLineItem(roleSublist);
					
					hasChangedRole = true;
				}			
			}	
		}
		
		if(hasChangedRole) //at least one role was changed
		{
			try
			{
				nlapiSubmitRecord(dealer, false, true);	
			}
			catch(error)
			{
				var subject = 'Dealer: ' + dealer.getFieldValue('entityid') + ', ID: ' + recId;
				var body = 'The Mass Update was unable to update the dealer because of the following error: ' + error;
					//roles for the following dealer: ' + dealer.getFieldValue('entityid') + ', ID: ' + recId;
				nlapiLogExecution('debug', 'Error', error);
				//email error
				nlapiSendEmail('4', 'caseylo@solution-source.net', subject, body, 'rbritsch@solution-source.net');
			}

		}	
	}
}

/**
 * Gets json array with mapped dealer roles.
 * @returns {Array}
 */
function GetRoleMappingArray()
{
	var roleMappingArray = new Array();
	
	var role = new Object(); 
	role.oldRoleId = '1070'; //Grand Design Dealer Center Full Access
	role.newRoleId = '1078'; //Test GD Dealer Center Full Access
	roleMappingArray[roleMappingArray.length] = role;		
	
	role = new Object(); 
	role.oldRoleId = '1053'; //Grand Design Dealer Center Parts
	role.newRoleId = '1076'; //Test GD Dealer Center Parts
	roleMappingArray[roleMappingArray.length] = role;
	
	role = new Object(); 
	role.oldRoleId = '1054'; //Grand Design Dealer Center Parts View Registration
	role.newRoleId = '1077'; //Test GD Dealer Center Parts View Registration
	roleMappingArray[roleMappingArray.length] = role;
	
	role = new Object(); 
	role.oldRoleId = '1062'; //Grand Design Dealer Center Unit And Warranty
	role.newRoleId = '1073'; //Test GD Dealer Center Unit And Warranty
	roleMappingArray[roleMappingArray.length] = role;
	
	role = new Object(); 
	role.oldRoleId = '1056'; //Grand Design Dealer Center Warran
	role.newRoleId = '1072'; //Test GD Dealer Center Warran
	roleMappingArray[roleMappingArray.length] = role;
	
	role = new Object(); 
	role.oldRoleId = '1063'; //Grand Design Dealer Center Warranty & Parts
	role.newRoleId = '1071'; //Test GD Dealer Center Warranty & Parts
	roleMappingArray[roleMappingArray.length] = role;
	
	return roleMappingArray;	
}
