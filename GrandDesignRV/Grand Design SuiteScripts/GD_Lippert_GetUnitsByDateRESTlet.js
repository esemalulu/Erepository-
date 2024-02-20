/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Oct 2016     brians
 *
 */

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function getUnitsByDateRESTlet(dataIn) {
	
	var unitsArray = new Array();
	
	if(dataIn != undefined && dataIn != null && dataIn.startdate != undefined && dataIn.enddate != undefined)
	{
		var startdate = dataIn.startdate;
		var enddate = dataIn.enddate;
		
		//Create the filters for our search
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('date', 'systemnotes', 'onorbefore', enddate);
		filters[filters.length] = new nlobjSearchFilter('date', 'systemnotes', 'onorafter', startdate);
		filters[filters.length] = new nlobjSearchFilter('field', 'systemnotes', 'anyof', ['CUSTRECORDUNIT_RETAILPURCHASEDDATE', 'CUSTRECORDUNIT_ACTUALOFFLINEDATE']);

		//Create the columns for our search
		var columns = new Array();
		columns[columns.length] = new nlobjSearchColumn('name');
		columns[columns.length] = new nlobjSearchColumn('custrecordunit_series');
		columns[columns.length] = new nlobjSearchColumn('custrecordunit_model');
		columns[columns.length] = new nlobjSearchColumn('custrecordunit_actualofflinedate');
		columns[columns.length] = new nlobjSearchColumn('custrecordunit_retailpurchaseddate');
		
		var unitResults =  nlapiSearchRecord('customrecordrvsunit', null, filters, columns);
		
		if(unitResults != null && unitResults.length > 0)
		{
			var unit = '';
			for(var i = 0; i < unitResults.length; i++)
			{
				unit = new Object();
				unit.vin = trim(unitResults[i].getValue('name'));
				unit.make = trim(unitResults[i].getText('custrecordunit_series'));
				unit.model = trim(unitResults[i].getText('custrecordunit_model'));
				unit.offlineDate = trim(unitResults[i].getValue('custrecordunit_actualofflinedate'));
				unit.purchaseDate = trim(unitResults[i].getValue('custrecordunit_retailpurchaseddate'));
				unit.retailName = trim(getRetailCustomer(unitResults[i].getId()));
				
				//Add our unit object to the array
				unitsArray.push(unit);
			}
		}
	}
	return unitsArray;
}

/**
 * getRetailCustomer - gets the Unit Retail Customer, if one exists, based on the vin
 * @param vin
 * @returns [String] the Retail Customer name, or 'No Customer Found' if there is no customer
 */
function getRetailCustomer(vin) {
	//Source Retail Customer when vin is changed.
	var fils = new Array();
	fils[fils.length] = new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', vin, null);
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('internalid'));
	cols.push(new nlobjSearchColumn('name'));
	cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_currentcust'));
	cols[0].setSort(true); //sort by most recent retail customer records
	
	var unitRetailCusResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, fils, cols);
	var hasCurrentCustomer = false; //stores whether or not the unit has current customer.
	
	if (unitRetailCusResults != null && unitRetailCusResults.length > 0)
	{
		for(var k = 0; k < unitRetailCusResults.length; k++) //loop through and find the retail customer marked as "Current Customer"
		{
			if(unitRetailCusResults[k].getValue('custrecordunitretailcustomer_currentcust') == 'T')
			{
				hasCurrentCustomer = true;
				return unitRetailCusResults[k].getValue('name');
			}
		}
		
		//there is no retail customer marked as "Current", so set it to be the most recent retail customer for this unit.
		if(!hasCurrentCustomer)
		{
			return unitRetailCusResults[0].getValue('name');
		}
	}
	else
		return 'No Customer Found';
}
