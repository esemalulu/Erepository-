/**
 * Client script deployed against CR-Contract (customrecord_axcr_contract)
 * to validate to make sure termination related fields are provided
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Jul 2016     json
 *
 */

//Company Level Preference
var paramActiveStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctractiveid'),
	paramPendingRenewalStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrpendrenewid'),
	paramRenewedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrrenewedid'),
	paramDelayedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrexpiredid'),
	paramTerminatedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrterminatedid');



/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function ctrSaveRecord()
{
	//Check to see if user decided to terminate this contract
	if (nlapiGetFieldValue('custrecord_crc_status') == paramTerminatedStatusId)
	{
		//We check to see if user has provided both reason and date
		var termDate = nlapiGetFieldValue('custrecord_crc_terminationdate'),
			termReason = nlapiGetFieldValue('custrecord_crc_terminationreason');
		
		if (!termDate || !termReason)
		{
			alert(
				'Before you can Terminate this contract, you MUST '+
				'provide both Termination Date and Termination Reason'
			);
			
			return false;
		}
		
		//Request User to Confirm their Action.
		var termConf = confirm(
							'You are about Terminate this contract. \n\n'+
							'ARE YOU SURE?'
					   );
		
		if (!termConf)
		{
			return false;
		}
							
	}
	
    return true;
}

/**
 * 
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}

function clientFieldChanged(type, name, linenum){
 
}
 */