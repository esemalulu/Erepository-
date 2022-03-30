//SCRIPT DEPRECATED as of Sept. 21 2015
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to save line item, false to abort save
 */
function stateCheckOnSave()
{

	for (var i=1; i <= nlapiGetLineItemCount('item'); i+=1)
	{
		var optionString = nlapiGetLineItemValue('item','options',i);
		var arOptions = optionString.split(String.fromCharCode(4));
		if (arOptions && arOptions.length > 0)
		{
			var hasState = false;
			var hasUsCountry = false;
			//Loop through each elements and make sure we have a value
			for (var e=0; e < arOptions.length; e+=1)
			{
				var arOptionElements = arOptions[e].split(String.fromCharCode(3));
				//0=field ID, 1=T/F, 2=Label, 3=Value of the field, 4=Text of the field
				//ONLY validate to make sure state is there if country is US
				//alert(arOptionElements[0]+' // '+arOptionElements[1]+' // '+arOptionElements[2]+' // '+arOptionElements[3]+' // '+arOptionElements[4]);
				if (arOptionElements[0].toLowerCase() == 'custcol_bo_country' && ( arOptionElements[4]=='United States' || arOptionElements[4]=='229') )
				{
					hasUsCountry = true;
				}
				
				if (arOptionElements[0].toLowerCase() == 'custcol_bo_state' && arOptionElements[3])
				{
					hasState = true;
				}
			}
			
			//Check to make sure we have valid state
			if (hasUsCountry && !hasState)
			{
				alert('Line Item '+i+' is missing required State value for Country of United States. Please set State and try again');
				return false;
			}			
		}
	}

	return true;

}