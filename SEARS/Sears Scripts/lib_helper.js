var Helper =
{
	/**
	 * Add ability for a search to return more than 1000 results
	 *
	 * @param {String} recordType
	 * @param {String} Search id
	 * @param {Array} search filters
	 * @param {Array} search columns
	 * @returns {nlobjSearchResults}
	 */
	searchAllRecord : function(recordType, searchId, searchFilter, searchColumns)
	{
		var arrSearchResults = [];
		var count = 1000, init = true, min = 0, max = 1000;

		var searchObj = false;

		if (searchId)
		{
			searchObj = nlapiLoadSearch(recordType, searchId);
			if (searchFilter)
			{
				searchObj.addFilters(searchFilter);
			}
			if (searchColumns)
			{
				searchObj.addColumns(searchColumns);
			}
		}
		else
		{
			searchObj = nlapiCreateSearch(recordType, searchFilter, searchColumns);
		}

		var rs = searchObj.runSearch();

		while (count == 1000)
		{
			var resultSet = rs.getResults(min, max);
			arrSearchResults = arrSearchResults.concat(resultSet);
			min = max;
			max += 1000;
			count = resultSet.length;
		}

		return arrSearchResults;
	},
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 *
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author bfelciano, mmeremilla
	 */
	isEmpty : function(stValue)
	{
		return ((stValue == null) || (stValue == undefined) ||
				( typeof stValue == 'string' && stValue == '') ||
				( typeof stValue == 'object' && (stValue.length == 0 || stValue.length == 'undefined')));
	},

	/**
	 * Evaluate if the given string is an element of the array
	 *
	 * @param {String} stValue - String value to find in the array
	 * @param {Array} arrValue - Array to be check for String value
	 * @returns {Boolean} - true if string is an element of the array, false if not
	 */
	inArray : function(stValue, arrValue)
	{
		var bIsValueFound = false;
		for (var i = 0; i < arrValue.length; i ++)
		{
			if (stValue == arrValue[i])
			{
				bIsValueFound = true;
				break;
			}
		}

		return bIsValueFound;
	},


	/**
	 * Checks governance then calls yield
	 *
	 * @param {Integer} myGovernanceThreshold
	 * @returns {Void}
	 * @author memeremilla
	 */
	lastRemainingUsage : 0,
	lastTimestamp : 0,
	checkGovernance : function(myGovernanceThreshold)
	{
		var context = nlapiGetContext();

		var usageReport = {};
		usageReport.remainingUsage = context.getRemainingUsage();
		usageReport.timestamp = (new Date()).getTime();

		usageReport.usage_delta = this.lastRemainingUsage ? usageReport.remainingUsage - this.lastRemainingUsage : usageReport.remainingUsage;
		usageReport.tstamp_delta = this.lastTimestamp ? this.lastTimestamp - usageReport.timestamp : 0;

		usageReport.threshold = myGovernanceThreshold;

		nlapiLogExecution('AUDIT', '###Usage Report###', JSON.stringify(usageReport));

		this.lastRemainingUsage = usageReport.remainingUsage;
		this.lastTimestamp = usageReport.timestamp;

		return (context.getRemainingUsage() < myGovernanceThreshold);
	},

	yieldScript: function ()
	{
		var state = nlapiYieldScript();
		if (state.status == 'FAILURE')
		{
			nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
			throw "Failed to yield script";
		}
		else if (state.status == 'RESUME')
		{
			nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ".  Size = " + state.size);
		}

	},

	/**
	 * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
	 * @param {String} stRecordType - record type of the item
	 * @return {String} stRecordTypeInLowerCase - record type internal id
	 */
	toItemInternalId : function(stRecordType)
	{
		if (this.isEmpty(stRecordType))
	    {
	        throw nlapiCreateError('10003', 'Item record type should not be empty.');
	    }

	    var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();

	    switch (stRecordTypeInLowerCase)
	    {
	        case 'invtpart':
	            return 'inventoryitem';
            case 'description':
                return 'descriptionitem';
            case 'assembly':
                return 'assemblyitem';
            case 'discount':
                return 'discountitem';
            case 'group':
                return 'itemgroup';
            case 'markup':
                return 'markupitem';
            case 'noninvtpart':
                return 'noninventoryitem';
            case 'othcharge':
                return 'otherchargeitem';
            case 'payment':
                return 'paymentitem';
            case 'service':
                return 'serviceitem';
            case 'subtotal':
                return 'subtotalitem';
            case 'giftcert':
                return 'giftcertificateitem';
            case 'dwnlditem':
                return 'downloaditem';
            case 'kit':
                return 'kititem';
	        default:
	            return stRecordTypeInLowerCase;
	    }
	}
};