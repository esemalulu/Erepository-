/**
 * This script will be deprecated. The functions here have been moved to GrandDesignCommon.js
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Oct 2016     brians
 *
 */

/*
 * Returns an array of members in a dealer group, given a dealer id.
 * If the given dealer does not belong to a dealer group, their dealer id will be the only item returned in the array.
 * @param dealerId
 * @returns (Array) an array of group members
 */
function getDealerGroupMembers (dealerId) {
	if(dealerId != null && dealerId != '')
	{
		var vinDealers = new Array(); 	//stores dealers that can register vins
		
		//Get the dealer's group.  If there is one, add its members to the vinDealers array
		var dealerGroupId = ConvertNSFieldToString(nlapiLookupField('customer', dealerId, 'custentitygd_dealergroup', false));
		if(dealerGroupId != '')
		{
			var cols = new Array();
			cols.push(new nlobjSearchColumn('internalid', null, null));
			cols.push(new nlobjSearchColumn('custentitygd_dealergroup', null, null));
			
			var filters = new Array();
			filters.push(new nlobjSearchFilter('custentitygd_dealergroup', null, 'anyof', dealerGroupId));
			filters.push(new nlobjSearchFilter('custentityrvscreditdealer', null, 'is', 'F'));
			filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			
			var groupMembers = nlapiSearchRecord('customer', null, filters, cols);	
			
			//Add dealers in the group to the vinDealers array.
			//We will use vinDealers array to filter vins that can be registered. 
			if(groupMembers != null && groupMembers.length > 0)
			{
				for(var i = 0; i < groupMembers.length; i++)
				{
					vinDealers.push(groupMembers[i].getId());
				}
			}
		}
		else
		{
			vinDealers.push(dealerId);		//The dealer is able to register their own units
		}
		return vinDealers;
	}
	return [];
}

/**
 * Returns whether or not the specified dealer can register the specified unit.
 * @param vin
 * @param dealerId
 * @returns {Boolean}
 */
function CanDealerRegisterVin(vin, dealerId)
{
	var _canRegister = false;
	var vinResults = GetVinToRegisterSearchResults(vin, dealerId);
	
	if(vinResults != null && vinResults.length == 1)
		_canRegister = true;
	
	return _canRegister;
}

/**
 * Runs a search to determine if the specified dealer can register the specified unit.
 * @param vin
 * @param dealerId
 * @returns nlobjSearchResults
 */
function GetVinToRegisterSearchResults(vin, dealerId) {
	
	if(vin != null && vin != '')
	{
		var filterExp = '';
		
		if(dealerId != null && dealerId != '')
		{
			var vinDealers = getDealerGroupMembers(dealerId);
			
			filterExp = [['name', 'is', vin],
		        'and',
		        [
		           ['custrecordunit_dealer.internalid', 'anyof', vinDealers],
		           'and',
		           ['custrecordunit_dealer.custentityrvscreditdealer', 'is', 'F'],
		           'and',
		           ['custrecordunit_dealer.isinactive', 'is', 'F']
		          
		        ],
		        'and',
		        ['custrecordunit_receiveddate', 'isempty', null],
		        'and',
		        ['isinactive', 'is', 'F'],
		        'and',
		        ['custrecordunit_shippingstatus', 'anyof', 'UNIT_SHIPPING_STATUS_SHIPPED']
	        ];	
		}
		else
		{
			filterExp = [['name', 'is', vin],
	            'and',
	            ['custrecordunit_receiveddate', 'isempty', null],
	            'and',
	            ['isinactive', 'is', 'F'],
	            'and',
	            ['custrecordunit_shippingstatus', 'anyof', 'UNIT_SHIPPING_STATUS_SHIPPED']		                 
			];	
		}
		
		var columns = new Array();
		columns.push(new nlobjSearchColumn('internalid'));
		columns.push(new nlobjSearchColumn('name'));
		
		return nlapiSearchRecord('customrecordrvsunit', null, filterExp, columns);
	}
}
