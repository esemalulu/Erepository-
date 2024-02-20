/**
 * 2.0 Common file for Grand Design
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 *
 */
define(['N/record', 'N/search', 'N/config', 'N/query', 'N/url', 'N/https'/*, 'N/file'*/],

function(record, search, config, query, url, https/*, file*/) {

	/**
	 * (For use in the dealer portal)
	 * Returns contact internal id given the dealerId and contact's e-mail address.
	 *
	 * @param {Number} dealerId
	 * @param {String} email
	 *
	 * @return contact ID
	 */
	function GetContactFromDealerAndEmail(dealerId, email)
	{
		if(email != '')
		{
			var contactSearch = search.create({
				type: search.Type.CONTACT,
				filters: [
				          ['isinactive','is','F'],
				          'AND',
				          ['custentitygd_portalaccessdealer', 'anyof', dealerId],
				          'AND',
				          ['email','is', email]
				         ]
			});
			var contacts = []
			contactSearch.run().each(function(result){
				contacts.push(result.id);
				return true;
			});

			if(contacts.length > 1)
				log.debug('Multiple Contact Error for dealerId: '+dealerId+' email: '+email,'contact results: '+contacts);

			if(contacts.length > 0)
				return contacts[0];
			else
				return null;
		}
		else
			return null;
	}

	/**
 	 * Returns an array of objects with a dealerID and dealerName.
 	 *
	 * If the given dealer does not belong to a dealer group, their dealer id will be the only item returned in the array.
	 *
	 * @param dealerId
	 * @returns (Array) an array of objects as follows: {id: XXX, name: XXX}
	 */
	function GetDealerGroupMembers(dealerId) {

		var dealerGroupMembers = new Array();
		//Get this dealer's dealer group
		var lookup = search.lookupFields({
		    type: search.Type.CUSTOMER,
		    id: dealerId,
		    columns: ['custentitygd_dealergroup','companyname']
		});
		var dealerGroupId = '';
		if(lookup.custentitygd_dealergroup && lookup.custentitygd_dealergroup[0])
			dealerGroupId = lookup.custentitygd_dealergroup[0].value;

		//If they have a dealer group, get the other dealers in that group.
		if(dealerGroupId != '')
		{
			var dealerSearch = search.create({
				type: search.Type.CUSTOMER,
				filters: [
				          ['isinactive','is','F'],
				          'AND',
				          ['custentityrvscreditdealer', 'is', 'F'],
				          'AND',
				          ['custentitygd_dealergroup','anyof', dealerGroupId]
				         ],
				columns: ['internalid','companyname']
			});

			dealerSearch.run().each(function(result){

				dealerGroupMembers.push({id: result.id, name: result.getValue({name: 'companyname'})});
				return true;
			});
		}
		else // This dealer has no dealer group. Sad. Return a single result.
		{
			dealerGroupMembers = [{id: dealerId, name: lookup.companyname}];
		}

		return dealerGroupMembers;
	}


	function ConvertNSFieldToFloat(value, blankIfNull)
	{
		if (blankIfNull)
		{
			if (value == null || value == '')
				return '';
			else
				return parseFloat(value);
		}
		else
		{
			if (value == null || value == '')
				return 0;
			else
				return parseFloat(value);
		}
	}

	/**
	 * Determines if the user has legal permission or not
	 *
	 * @param userId (string): The id of the current user
	 * @returns message (boolean): returns true if the user has legal permission and false if they don't.
	 */
	function CheckLegalPermission(userId)
	{
		var lookup = search.lookupFields({
			type: search.Type.EMPLOYEE,
		    id: userId,
		    columns: ['custentitygd_haslegalpermission']
		});
		return lookup.custentitygd_haslegalpermission;
	}

	/**
	 * Determines if the unit's legal flag is set or not.
	 *
	 * @param unitId (string): The id of the unit
	 * @returns message (boolean): returns true if the unit has a pending legal case and false if it doesn't.
	 */
	function CheckLegalFlag(unitId)
	{
		var lookup = search.lookupFields({
			type: 'customrecordrvsunit',
		    id: unitId,
		    columns: ['custrecordgd_legalcasepending']
		});
		return lookup.custrecordgd_legalcasepending;
	}

	/**
	 * Determines if a script is running.
	 *
	 * @param scriptId (string):
	 * @param deploymentId (string):
	 * @returns {Boolean}  - return true or false
	 */
	function isExecuting(scriptId, deploymentId) {
	  const executingStatuses = ["PENDING", "PROCESSING", "RESTART", "RETRY"];
	  return Boolean(search.create({
	    type: record.Type.SCHEDULED_SCRIPT_INSTANCE,
	    filters: [
	      ["status", search.Operator.ANYOF, executingStatuses], "AND",
	      ["script.scriptid", search.Operator.IS, scriptId], "AND",
	      ["scriptDeployment.scriptid", search.Operator.ISNOT, deploymentId]
	    ],
	    columns: ["script.internalid"]
	  }).runPaged().count);
	}

	/**
	 * Gets a company preference value
	 * 
	 * @param {string} preferenceId - the id of the preference field
	 * @returns {string} - The value of the company preference
	 */
	function GetCompanyPreference(preferenceId) {
		var preferencesRecord = config.load({
			type: config.Type.COMPANY_PREFERENCES
		});
		return preferencesRecord.getValue({fieldId: preferenceId});
	}

	/**
	 * left padding s with c to a total of n chars
	 * 
	 * @param {string} s - string to be padded
	 * @param {string} c - character to use for padding
	 * @param {string} n - total character count of final string
	 * @returns {string} left padded s string.
	 */
    function paddingLeft(s, c, n) {
        if (! s || ! c || s.length >= n) {
            return s;
        }

        var max = (n - s.length)/c.length;
        for (var i = 0; i < max; i++) {
            s = c + s;
        }

        return s;
    }

    /**
	 * right padding s with c to a total of n chars
	 * 
	 * @param {string} s - string to be padded
	 * @param {string} c - character to use for padding
	 * @param {string} n - total character count of final string
	 * @returns {string} right padded s string.
	 */
    function paddingRight(s, c, n) {
    if (! s || ! c || s.length >= n) {
        return s;
    }

    var max = (n - s.length)/c.length;
    for (var i = 0; i < max; i++) {
        s += c;
    }

    return s;
}

    /**
     * Formats a number string as though it were a currency value
     * 
     * @param {string} nStr - string made up of numeric characters
     * @returns {string} the formatted string
     */
    function addCommas(nStr)
    {
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    }

    /**
     * Converts a currency string to english words
     * 
     * @param {string} s - currency string
     * @returns {string} The currency string in English words
     */
    function convertCurrencyToEnglish(s)
    {
        // Convert numbers to words
        // copyright 25th July 2006, by Stephen Chapman http://javascript.about.com
        // permission to use this Javascript on your web page is granted
        // provided that all of the code (including this copyright notice) is
        // used exactly as shown (you can change the numbering system if you wish)
        
        // American Numbering System
        var th = ['','thousand','million', 'billion','trillion'];
        // uncomment this line for English Number System
        // var th = ['','thousand','million', 'milliard','billion'];
        
        var dg = ['zero','one','two','three','four', 'five','six','seven','eight','nine']; 
        var tn = ['ten','eleven','twelve','thirteen', 'fourteen','fifteen','sixteen', 'seventeen','eighteen','nineteen']; 
        var tw = ['twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety']; 
        
        // Convert numbers to words
        // copyright 25th July 2006, by Stephen Chapman http://javascript.about.com
        // permission to use this Javascript on your web page is granted
        // provided that all of the code (including this copyright notice) is
        // used exactly as shown (you can change the numbering system if you wish)

        // American Numbering System
        var th = ['','thousand','million', 'billion','trillion'];
        // uncomment this line for English Number System
        // var th = ['','thousand','million', 'milliard','billion'];

        s = s.toString(); s = s.replace(/[\, ]/g,''); if (s != parseFloat(s)) return 'not a number'; var x = s.indexOf('.'); if (x == -1) x = s.length; if (x > 15) return 'too big'; var n = s.split(''); var str = ''; var sk = 0; for (var i=0; i < x; i++) {if ((x-i)%3==2) {if (n[i] == '1') {str += tn[Number(n[i+1])] + ' '; i++; sk=1;} else if (n[i]!=0) {str += tw[n[i]-2] + ' ';sk=1;}} else if (n[i]!=0) {str += dg[n[i]] +' '; if ((x-i)%3==0) str += 'hundred ';sk=1;} if ((x-i)%3==1) {if (sk) str += th[(x-i-1)/3] + ' ';sk=0;}} if (x != s.length) {var y = s.length; str += 'point '; for (var i=x+1; i<y; i++) str += dg[n[i]] +' ';} return str.replace(/\s+/g,' ');
    }

	/**
     * Functions just like search.lookupFields, but uses the query module instead.
	 * NOTE: MultiSelect field values will be returned as a single string of comma
	 * seperated ids. Just perform a .split(", ") to get it to array form.
	 * This method returns an empty array if there is an error.
     * 
     * @param {string} recordType The type of record to perform the lookup on.
	 * @param {string} recordId The id of the record to perform the lookup on.
	 * @param {Array} fields An array composed of the ids of the fields to lookup.
     * @returns {Object} The object containing the field data from the record with the field ids as the keys.
     */
	function queryLookupFields(recordType, recordId, fields) {
		var suiteQLString = 'SELECT ' + fields.toString() + ' FROM ' + recordType + ' WHERE id = ' + recordId;

		try {
			return query.runSuiteQL({
				query: suiteQLString
			}).asMappedResults()[0];
		} catch (err) {
			log.error('Error performing query', err);
		}
		return [];
	}

	function getSCDomain() {
		var suiteQLString = "SELECT TOP 1"
		+ " custrecord_ns_scc_key"
		+ " FROM"
		+ " customrecord_ns_sc_configuration"
		+ " WHERE"
		+ " isinactive = 'F'";
		var results = query.runSuiteQL({query: suiteQLString}).asMappedResults();
		var splitKey = results[0]['custrecord_ns_scc_key'];
		splitKey = splitKey.split('|');
		var domain = 'http://' + splitKey[1];
		return domain;
	}

	/**
	 * Converts the itemType returned by query to the type needed by record.load()
	 * @param {String} itemType
	 * @returns {String} 
	 */
	function convertItemType(itemType) {
		switch (itemType) {
			case 'Assembly':
				return record.Type.ASSEMBLY_ITEM;
			case 'Description':
				return record.Type.DESCRIPTION_ITEM;
			case 'Discount':
				return record.Type.DISCOUNT_ITEM;
			case 'Group':
				return record.Type.ITEM_GROUP;
			case 'InvtPart':
				return record.Type.INVENTORY_ITEM;
			case 'NonInvtPart':
				return record.Type.NON_INVENTORY_ITEM;
			case 'OthCharge':
				return record.Type.OTHER_CHARGE_ITEM;
			default:
				return itemType;
		}
	}

	/**
	 * Trims the empty spaces on both ends of the string.
	 * @param {string} sString - the string to be trimmed.
	 * @return {string} Returns trimed string.
	 */
	function trim(sString) 
	{ 
		if(sString != null) {

			//convert any input to string
			sString = "" + sString;

			while (sString.substring(0,1) == ' ') { 
				sString = sString.substring(1, sString.length); 
			} 

			while (sString.substring(sString.length-1, sString.length) == ' ') { 
				sString = sString.substring(0,sString.length-1); 
			} 

			return sString; 	

		} else {
			return '';
		}
	};

	/**
	 * Gets company information as a json object using suitelet.
	 * We use suitelet to get this info because company information is only
	 * available for admins and our user that requests Restlet is not admin.
	 * @returns {string} companyInfo string.
	 */
	function getCompanyInfoJSON()
	{
		// Specify an array of headers for the Suitelet Call
		var headers = new Array();

		// Populate the array of headers
		headers['User-Agent-x'] = 'SuiteScript-Call';
		headers['Content-Type'] = 'text/plain';
		//headers['Method'] = 'GET';

		// The last parameter in this line indicates that we need the external url and 
		// not the internal because we want to use the restlet without logging in.
		var suiteletURL = url.resolveScript({
			scriptId: 'customscriptsuitelet_companyinfo',
			deploymentId: 'customdeploycompanyinfosuiteletdeploy',
			returnExternalUrl: true
		});

		// Get the data from the called suitelet
		var companyInfoResponse = https.get({
			url: suiteletURL,
			headers: headers
		});

		// Parse and set the company info
		var companyInfo = JSON.parse(companyInfoResponse.body);
		
		return companyInfo;
	};

	/**
	 * Returns today's date formatted as m/d/yyyy
	 */
	function getTodaysDate()
	{
		var currentDate = new Date();
		var dd = currentDate.getDate();
		var mm = currentDate.getMonth() + 1;
		var yyyy = currentDate.getFullYear();
		var today = mm + '/' + dd + '/' + yyyy;
		return today; 
	};

	return {
		GetContactFromDealerAndEmail: GetContactFromDealerAndEmail,
		GetDealerGroupMembers: GetDealerGroupMembers,
		ConvertNSFieldToFloat: ConvertNSFieldToFloat,
		CheckLegalPermission: CheckLegalPermission,
		CheckLegalFlag: CheckLegalFlag,
		isExecuting: isExecuting,
		GetCompanyPreference: GetCompanyPreference,
		paddingLeft: paddingLeft,
		paddingRight: paddingRight,
		addCommas: addCommas,
		convertCurrencyToEnglish: convertCurrencyToEnglish,
		queryLookupFields: queryLookupFields,
		getSCDomain: getSCDomain,
		convertItemType: convertItemType,
		trim: trim,
		getCompanyInfoJSON: getCompanyInfoJSON,
		getTodaysDate: getTodaysDate
    };

});
