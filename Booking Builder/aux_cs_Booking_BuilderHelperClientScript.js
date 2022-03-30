/**
 * Author: joe.son@audaxium.com(Eli)
 * Mod Date: May. 20 2016
 * Desc:
 * Client script to support Suitelet 
 */
function configSlPageInit(type, name) {
	
		nlapiSetFieldDisplay('custpage_outsourcer', false);		
	
}


function configSlFieldChange(type, name, linenum) 
{
	
	if (name == 'custpage_item' )
	{
		var itemSelection = nlapiGetFieldValue('custpage_item');		
		var bookingType = nlapiLookupField('item', itemSelection, 'custitem_itm_bookingtype', false);
		
		nlapiSetFieldValue( 'custpage_jbtype', bookingType);
				
	}	
	
	
	
	
	if (name == 'custpage_coordinator'  && nlapiGetFieldValue('custpage_coordinator'))
	{
		var coord = nlapiGetFieldValue('custpage_coordinator');		
		var dept = nlapiLookupField('employee', coord, 'department', false);
		/**
		10	Client Services
		5	Finance
		11	Parent Gym
		15	Production Operations
		2	Talent Network				
		*/
		
		if(dept != 10 && dept != 5 && dept != 11 && dept != 15 && dept != 2)
		{
			alert('The selected Co-ordinator does not belong to any of the following Departments: Client Services, Finance, Parent Gym, Production Operations, Talent Network. Please select a Co-Ordinator that belongs to one of the above Departments');
			return ;
		}
				
	}

	
	if (name == 'custpage_coach' && nlapiGetFieldValue('custpage_coach'))
	{
		var coach = nlapiGetFieldValue('custpage_coach');		
        var categ = nlapiLookupField('vendor', coach, 'category', false);
		var stat = nlapiLookupField('vendor', coach, 'custentity_coach_coachstatus', false);
		var sub = nlapiLookupField('vendor', coach, 'subsidiary', false);
/**		   
		9	Coach-CLient license
		5	Coach-Mind Gym
		15	Coach-Mind Gym Affiliate
		12	Coach-Mind Gym In-House
		8	Coach-Parent Gym

		3 	Coach
		6	Placholder
		8	Probabtion
		2	Scholar
*/
		   		
		if(categ != 9 && categ != 5 && categ != 15 && categ != 12 && categ != 8)
		{			
			if(stat != 3 && stat != 6 && stat != 8 && stat != 2 )
			{
				alert('The slected Coach does not belong to any of the following Categories: Coach-CLient license, Coach-Mind Gym, Coach-Mind Gym Affiliate, Coach-Mind Gym In-House, Coach-Parent Gym. They also do not have any of the following Coach Status: Coach, Placholder, Probabtion, Scholar. Please select a Coach with the correct Category and Coach Status');
				return false;
				
			}													
		}
	

	}
	
		
if (name == 'custpage_country' && nlapiGetFieldValue('custpage_country'))
{	
	nlapiRemoveSelectOption('custpage_state', null);
	nlapiInsertSelectOption('custpage_state', '', '', true);
		
	var filters = [new nlobjSearchFilter('custrecord_state_country', null, 'is', nlapiGetFieldValue('custpage_country') )];
	var columns = [new nlobjSearchColumn('internalid'),
				   new nlobjSearchColumn('custrecord_state_code'),				   
				   new nlobjSearchColumn('name')];					   
	var results = nlapiSearchRecord('customrecord_state', null, filters, columns);
		
	for (var i=0; results && i < results.length; i++)		
	{
		var id = results[i].getValue('internalid');	
		var displyname = results[i].getValue('name');
		nlapiInsertSelectOption('custpage_state', id, displyname, false); 
	}			


//---------------------------------------------------------------------------------------------------	

	nlapiRemoveSelectOption('custpage_timezone', null);
	nlapiInsertSelectOption('custpage_timezone', '', '', true);
	
	var tzfilters = [new nlobjSearchFilter('custrecord_tz_country', null, 'is', nlapiGetFieldValue('custpage_country') )];
	var tzcolumns = [new nlobjSearchColumn('internalid'),
				   new nlobjSearchColumn('custrecord_tz_timezone'),				   
				   new nlobjSearchColumn('name')];					   
	var tzresults = nlapiSearchRecord('customrecord_timezone', null, tzfilters, tzcolumns);		
	
	for (var j=0; tzresults && j < tzresults.length; j++)		
	{
		var tzid = tzresults[j].getValue('internalid');	
		var tzdisplyname = tzresults[j].getValue('name');
		nlapiInsertSelectOption('custpage_timezone', tzid, tzdisplyname, false); 
	}


}


if (name == 'custpage_qty' && nlapiGetFieldValue('custpage_qty') > 25)
{

alert('Please add a quantity of 25 or less');
return false;

}



if (name == 'custpage_programme' && nlapiGetFieldValue('custpage_programme'))
{	
	nlapiRemoveSelectOption('custpage_bookingset', null);
	nlapiInsertSelectOption('custpage_bookingset', '', '', true);
		
	var filters = [new nlobjSearchFilter('custrecord_auxmg_bookingset_programme', null, 'is', nlapiGetFieldValue('custpage_programme') )];
	
	var columns = [new nlobjSearchColumn('internalid'),				   
				   new nlobjSearchColumn('name')];					   
	var results = nlapiSearchRecord('customrecord_auxm_bookingset', null, filters, columns);
		
	for (var i=0; results && i < results.length; i++)		
	{
		var id = results[i].getValue('internalid');	
		var displyname = results[i].getValue('name');
		nlapiInsertSelectOption('custpage_bookingset', id, displyname, false); 
	}

}


if (name == 'custpage_item' && nlapiGetFieldValue('custpage_item'))
{
	if(nlapiGetFieldValue('custpage_jbtype') == '13')
	{
		//nlapiSetFieldValue('custpage_outsourcer', 'T');	
		nlapiSetFieldDisplay('custpage_outsourcer', true);	
	}
	else
	{
		//nlapiSetFieldValue('custpage_outsourcer', 'F');	
		nlapiSetFieldDisplay('custpage_outsourcer', false);	
	}	
	
}


}


function backtoBookingBuild()
{
	window.ischanged = false;
	
	selUrl = nlapiResolveURL(
			'SUITELET',
			'customscript_ax_sl_booking_build_config',
			'customdeploy_ax_sl_booking_build_config'
		)+
		'&currency='+nlapiGetFieldValue('currency')+
		'&subsidiary='+nlapiGetFieldValue('subsidiary')+
		'&subscurrency='+nlapiGetFieldValue('subscurrency')+
		'&clientname='+nlapiGetFieldValue('parent')+
		'&user='+nlapiGetUser();
	
	window.location.href = 'https://'+window.location.hostname+selUrl;
}


function CancelClose() {
	window.ischanged = false;
	window.close();
}
