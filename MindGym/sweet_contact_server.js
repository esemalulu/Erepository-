/**
 * Defines
 */
var USER_CATEGORY_CLIENT = '3';

/**
 * Before Load
 *
 * @param {String} type
 * @param {String} form
 */
function userevent_beforeLoad(type, form) 
{
	// Are we in UI mode?
	var currentContext = nlapiGetContext();
	if (currentContext.getExecutionContext() != 'userinterface') 
	{
		return; // Nope, do nothing.
	}
  
	type = type.toLowerCase();
  
	if (type == 'edit' || type == 'view') 
	{
		// Create 'New Opportunity Form' link
		var linkURL = nlapiResolveURL('RECORD', 'opportunity');

		// Source the client
		var clientId = nlapiGetFieldValue('company');   
		if (clientId) 
		{
			linkURL += '?entity=' + clientId;
		}
    
		// Source the contact
		var contactId = nlapiGetRecordId();   
		if (contactId) 
		{
			linkURL += '&custbody_buyer=' + contactId;
		}
		
		var onClick = "window.location.href='" + linkURL + "';";

		// Create a custom button
		form.addButton('custpage_new_opportunity', 'New Opportunity', onClick);
	}
  
	//aux: ticket 2567 - Filter Timezone field value to be filtered based on billing country selected.
	//Because this field is shared by both Booking and Contact AND most importantly, because booking has different way of filtering the field,
	//Contact record filtering must be implemented using script methode.
	
	//1. Hide/disable existing timzezone drop down field.
	//2. insert brand new timezone that will house filtered list.
	//3. if billing country exist, pre-populate with the value
	//4. Add in client side JSON object for client function to trigger re-population
	//FOR TESTING ONLY
	/**
	if (nlapiGetUser() != '167520')
	{
		return;
	}
	*/
	
	if (type == 'edit' || type == 'create')
	{
		var originalTimeZoneField = form.getField('custentity_bo_eventtimezone');
		originalTimeZoneField.setDisplayType('hidden');
		
		//add in new field
		var dynamicTimeZoneField = form.addField('custpage_timezone', 'select', 'Time Zone', '', null);
		dynamicTimeZoneField.addSelectOption('', '', true);
		
		var curDynTzFld = form.addField('custpage_currtzcountry','text','','',null);
		curDynTzFld.setDefaultValue(nlapiGetFieldValue('custentity_bo_eventtimezone'));
		curDynTzFld.setDisplayType('hidden');
		
		form.insertField(dynamicTimeZoneField, 'custentity_bo_eventtimezone');
		
		nlapiLogExecution('debug','billing country', nlapiGetFieldValue('billcountry'));
		
		var countryJson = {};
		
		var tzflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var tzcol = [new nlobjSearchColumn('internalid'),
		             new nlobjSearchColumn('name'),
		             new nlobjSearchColumn('custrecord_tz_country'),
		             new nlobjSearchColumn('custrecord_country_code', 'custrecord_tz_country')];
		var tzrs = nlapiSearchRecord('customrecord_timezone', null, tzflt, tzcol);
		
		for (var tz=0; tzrs && tz < tzrs.length; tz+=1)
		{
			var countryAbbr = tzrs[tz].getValue('custrecord_country_code', 'custrecord_tz_country');
			var tzName = tzrs[tz].getValue('name');
			if (!countryJson[countryAbbr])
			{
				countryJson[countryAbbr] = {};
			}
			
			countryJson[countryAbbr][tzName] = tzrs[tz].getValue('internalid');
			
			//IF current country matches, add it to the list.
			if (countryAbbr == nlapiGetFieldValue('billcountry'))
			{
				dynamicTimeZoneField.addSelectOption(tzrs[tz].getValue('internalid'), tzName, false);
			}
		}
		
		//set default value of dynamic time zone field based on original time zone field
		dynamicTimeZoneField.setDefaultValue(nlapiGetFieldValue('custentity_bo_eventtimezone'));
		
		//Add a new inline HTML to house countryJson
		var jsonHtml = form.addField('custpage_ctrjson', 'inlinehtml', null, null, null);
		jsonHtml.setDefaultValue('<script language="JavaScript">'+
								 'var countryJson = '+JSON.stringify(countryJson)+';'+
								 '</script>');
		
	}
	
}

/**
 * BeforeSubmit event
 *
 * @param {String} type
 * @return void
 */
function userevent_beforeSubmit(type) {
	
  switch (type.toLowerCase()) {
    case 'edit':
    // case 'xedit':
    case 'create':

      var firstName = nlapiGetFieldValue('firstname');
      var lastName = nlapiGetFieldValue('lastname');
      
      // Trim first name
      firstName = sweet_trim(firstName);
      nlapiSetFieldValue('firstname', firstName);
      
      // Trim last name
      lastName = sweet_trim(lastName);
      nlapiSetFieldValue('lastname', lastName);
      
      // Set entity ID (on create only)
      if (type.toLowerCase() == 'create') {
        nlapiSetFieldValue('entityid', (firstName + ' ' + lastName));
      }
      
      // If firstname and lastname fields are missing
      if ((!firstName && !lastName) || (firstName.length < 1 && lastName.length < 1)) {
        
        // Get the entity Name/ID
        var entityId = nlapiGetFieldValue('entityid');
        if (typeof(entityId) == 'string') {
          var splitAt = entityId.indexOf(' ');
          
          // Split the string on first space
          if (splitAt > 0) {
            var firstName = entityId.substring(0, splitAt);
            var lastName = entityId.substring(splitAt + 1, entityId.length);
            nlapiSetFieldValue('firstname', firstName);
            nlapiSetFieldValue('lastname', lastName);
          }
        }
      }

			// User record
		//	_createOrUpdateUser();
      break;
		case 'delete':
			// nlapiSetFieldValue('custentity_user', null);
			break;
    default:
      // Do nothing
  }
}

/**
 * AfterSubmit event
 *
 * @param {String} type
 * @return void
 */
function userevent_afterSubmit(type) {
		
	switch (type.toLowerCase()) {
		case 'create':
		case 'edit':
			break;
		case 'delete':
			_deleteUser();
			break;
	}
}

/**
 * Delete associated user record
 *
 * @return {Void}
 */
function _deleteUser() {
	
	// Delete user record if exists	
	var record = nlapiGetOldRecord();	
	var userId = record.getFieldValue('custentity_user');	
	if (userId) {
		nlapiDeleteRecord('customrecord_user', userId);
	}	
}

/**
 * Delete assoicated user record
 *
 * @return {Void}
 */
function _createOrUpdateUser() {
	
	var userId = nlapiGetFieldValue('custentity_user');
	var access = nlapiGetFieldValue('custentity_co_clientportal_access');

	// Load record if exists otherwise create new
	if (userId) {
		var user = nlapiLoadRecord('customrecord_user', userId);
	} else {
		if (access == 'F') {
			return; // Do nothing
		}
		var user = nlapiCreateRecord('customrecord_user');
	}
	
	// First name
	var firstName = nlapiGetFieldValue('firstname');
	if (!firstName) {
		throw nlapiCreateError('SWEET_ERROR_FIRSTNAME_REQD', 'First name is a required field.');
	}
	user.setFieldValue('custrecord_user_first_name', firstName);
	
	// Last name
	var lastName = nlapiGetFieldValue('lastname');
	if (!lastName) {
		throw nlapiCreateError('SWEET_ERROR_LASTNAME_REQD', 'Last name is a required field.');		
	}
	user.setFieldValue('custrecord_user_last_name', lastName);
	
	// Email and Login
	var email = nlapiGetFieldValue('email');
	if (!email) {
		throw nlapiCreateError('SWEET_ERROR_EMAIL_REQD', 'Email is a required field.');
	}
	user.setFieldValue('custrecord_user_email', email);
	user.setFieldValue('custrecord_user_login', email);
	
	// User category
	user.setFieldValue('custrecord_user_category', USER_CATEGORY_CLIENT);
	
	// Client portal access
	user.setFieldValue('custrecord_user_clientportal_access', access);
	
	// Send email notification
	user.setFieldValue('custrecord_user_clientportal_sendemail',  nlapiGetFieldValue('custentity_co_clientportal_sendemail'));
	
	// Save
	var userId = nlapiSubmitRecord(user);
	nlapiSetFieldValue('custentity_user', userId);
}

/**
 * Trim
 *
 * @param {String} str
 * @return {String}
 */
function sweet_trim(str) {
  if (str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  }
  return str;
}
