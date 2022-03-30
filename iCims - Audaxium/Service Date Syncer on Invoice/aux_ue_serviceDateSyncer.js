/**
 * User event deployed against Invoice to sync up Rev. Start and Rev. End date to service start and end date body level fields.
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Aug 2015     json
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord invoice
 * 
 * @param {String} type Operation types: create, copy
 * @returns {Void}
 */
function ueInvBeforeSubmit(type){
	if (type == 'create' || type == 'copy')
	{
		try
		{
			var origSerStartDate = nlapiGetFieldValue('custbody2'),
				origSerEndDate = nlapiGetFieldValue('custbody3'),
				lineRevStartDate = '',
				lineRevEndDate = '';
		
			if (!origSerStartDate && !origSerEndDate)
			{
				log('audit','No Processing required','Service Start and End Dates are Empty');
				return;
			}
			
			//loop through each line and find the first LINE with both Rev Start and Rev End Dates
			var itemLineCount = nlapiGetLineItemCount('item');
			for (var i=1; i <= itemLineCount; i+=1)
			{
				if (nlapiGetLineItemValue('item','revrecstartdate',i) && nlapiGetLineItemValue('item','revrecenddate',i))
				{
					lineRevStartDate = nlapiGetLineItemValue('item','revrecstartdate',i);
					lineRevEndDate = nlapiGetLineItemValue('item','revrecenddate',i);
					break;
				}
			}
			
			//Print them out.
			log('debug',
				'Before Submit of '+type,
				'Orig. Ser. Start Date: '+origSerStartDate+' // '+
				'Orig. Ser. End Date: '+origSerEndDate+' // '+
				'Line Rev. Start Date: '+lineRevStartDate+' // '+
				'Line Rev. End Date: '+lineRevEndDate+' // '
			);
			
			if (origSerStartDate != lineRevStartDate || origSerEndDate != lineRevEndDate)
			{
				//For testing purposes, set it on the temporary field value.
				//For Production, This will change the actual Serv. Date field values
				
				//Production: Serv. Start Date
				//custbody2
				nlapiSetFieldValue('custbody2', lineRevStartDate);
				
				//Production: Serv. End Date
				//custbody3
				nlapiSetFieldValue('custbody3', lineRevEndDate);
			}
			
		}
		catch (bferr)
		{
			log('error','Error serv. date syncer before submit', getErrText(bferr));
		}
		
	}
}

