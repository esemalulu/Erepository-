/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     WORK-rehanlakhani
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function clientPageInit(type)
{
	if(type != 'copy')
	{
		// disables name field on load.
		// pi = Previous Record Internal Id
		// pr = Previous Record Rec Type ID
		nlapiDisableField('name', true);
		var url = window.location.toString();
		if(url)
		{
			var params = url.split('&');

			// if params.length == 1 that means that the user is creating a new record by going to the booking set custom record directly
			// if params.length > 1 that means that the user clicked the button from the training programme record.
			if(params)
			{
				if(params.length > 1)
				{
					var val1 = 'pi';
					var val2 = 'pr';
					var index1;
					var index2;

					for(var i  = 0; i < params.length; i+=1)
					{
						var val = params[i].toString();
						if(val.indexOf(val1) > -1)
						{
							index1 = i;
						}
						if(val.indexOf(val2) > -1)
						{
							index2 = i;
						}
					}

					var id = params[index1].split('=');

					if(index1 && index2)
					{
						var client = nlapiLookupField('customrecord_trainingprogramme', id[1],'custrecord_tp_clientaccount');
						nlapiSetFieldValue('custrecord_auxmg_bookingset_client', client);
					}
				}
			}
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @returns {Boolean} True to continue save, false to abort save
 */
function clientSaveRecord()
{
	// Get Booking Set Name from field.
	var bookingSetName = nlapiGetFieldValue('custrecord_auxmg_bookingset_name');

	// if Booking set is not empty set name field with text.
	if(bookingSetName)
	{
		nlapiSetFieldValue('name', bookingSetName);
		return true;
	}
	else
	{
		return false;
	}
}
