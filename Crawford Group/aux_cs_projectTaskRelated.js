/**
 * Client script for Project Task deployed at the record level
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Dec 2015     joe.son@audaxium.com
 *
 */


function projectTaskSaveRecord(){

	//Loop through each line on the Project (Engagement) Task Assignee list
	//	and error out if Unit Price is missing
	for (var i=1; i <=nlapiGetLineItemCount('assignee'); i+=1)
	{
		var unitPriceValue = nlapiGetLineItemValue('assignee', 'unitprice', i);
		if (!unitPriceValue || (unitPriceValue && parseFloat(unitPriceValue) <= 0))
		{
			alert('Greater $0 value must be provided for Unit Price Field on line '+i);
			return false;
		}
	}
	
    return true;
}


function projectTaskValidateLine(type){
 
	if (type == 'assignee')
	{
		var unitPriceValue = nlapiGetCurrentLineItemValue('assignee', 'unitprice');
		
		if (!unitPriceValue || (unitPriceValue && parseFloat(unitPriceValue) <= 0))
		{
			alert('Greater $0 value must be provided for Unit Price Field');
			return false;
		}
	}
		
    return true;
}
