/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 May 2018     brians
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function GD_Spiff_PageInit(type){
   
	if (IsDealerLoggedIn())
	{
		if(type == 'create')
		{
			//Change the Submit buttons texts to be "Save"
			var submitBtn = document.getElementById('submitter');
			if(submitBtn) submitBtn.value = 'Claim Spiff';
			var bottomSubmitBtn = document.getElementById('secondarysubmitter');
			if(bottomSubmitBtn) bottomSubmitBtn.value = 'Claim Spiff';
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function clientFieldChanged(type, name, linenum){
 
}
