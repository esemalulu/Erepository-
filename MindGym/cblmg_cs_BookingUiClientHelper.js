/**
 * 16/1/2015 - Audaxium Update
 * Based on Spicework Ticket #421, David as asked to merge the Form level client functionalities into Record level client script.
 * Scripts from Sweet_job_form.js has been merged into THIS Record level client side booking script. 
 *  
 */
//16/1/2015 - Variable from sweet_job_form.js
var isItemChaned = false;
var oldItemValue = '';

//23/4/2015 - Update "Feedback Processing Date" when "Processing Location" is updated
var oldFeedBackLoc = '';


//16/1/2015 - Legacy form to trigger legacy business logics merged from sweet_job_form.js
//Script level parameter on CBL:CS: Booking UI Client Helper
var paramLegacyForms = nlapiGetContext().getSetting('SCRIPT','custscript_sct188_legacyformids');
if (paramLegacyForms) {
	paramLegacyForms = paramLegacyForms.split(',');
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */

var origShipToValue = '',

	//Added Apr. 14 2016 - Support Parent Booking to Child coach override
	originalCoachValue = '';

//16/1/2015 - Function modified to take parameter.
//			  This function can be triggered from BUTTON Click OR via field change.
//			  Parameter will decide if it is triggered from Button to generate CONFIRM message
function resetPackFields(_fromButton) {
	
	//If called from field changed trigger, it's assumed user already confirmed it
	var resetFields = true;
	if (_fromButton) {
		//IF triggered from button, use confirmation provided from user as resetFields value
		resetFields = confirm('You are about to reset this booking record back to Fulfill Pack Stage. \n Do you wish to continue?');
	}
		
	if (resetFields) {
		nlapiSetFieldValue('custentity_bo_isinproduction', 'F', false, true);
		nlapiSetFieldValue('custentity_bo_packproductiondate','', false, true);
		nlapiSetFieldValue('custentity_cbl_packffloc', '', false, true);
		
		nlapiSetFieldValue('custentity_bo_ispackshipped','F',false, true);
		nlapiSetFieldValue('custentity_bo_packshippingdate','',false, true);
		nlapiSetFieldValue('custentity_bo_packorderno','',false, true);
		nlapiSetFieldValue('custentity_bo_packtracking','',false, true);
		nlapiSetFieldValue('custentity_bo_packstatus','',false, true);
		nlapiSetFieldValue('custentity_bo_packtracking_url2','',false, true);
		nlapiSetFieldValue('custentity_bo_packtracking_url','',false, true);

		//16/1/2015 - Added from legacy field changed
        nlapiSetFieldValue('custentity_bo_isprepackshipped', 'F', false, true);
        nlapiSetFieldValue('custentity_bo_prepackshippingdate', '', false, true);
		
	}
}

function resetFeedbackFields() {
	var proceedWithReset = confirm('You are about to reset this booking record back to Fulfill Feedback Stage. \n Do you wish to continue?');
	if (proceedWithReset) {
		nlapiSetFieldValue('custentity_cbl_feedbackffloc', '', false, true);
		nlapiSetFieldValue('custentity_bo_feedbackprocessingdate','', false, true);
		nlapiSetFieldValue('custentity_bo_feedbackstatus', '', false, true);
	}
}

//Ticket 3475
function toggleShippingAddress()
{
	//Ticket 3475 
	//Initially disable Shipping Address
	nlapiDisableField('custentity_bo_shippingaddress', true);
	//THIS SHOULD ONLY be executed if enddate is > Today
	if (isInFuture()) 
	{
		//If shipto value is sset to Other, enable it
		if (nlapiGetFieldValue('custentity_bo_pack_shipto') == '4') {
			nlapiDisableField('custentity_bo_shippingaddress', false);
		}
	}
}

//Ticket 3475
function isInFuture() 
{
	if (!nlapiGetFieldValue('enddate') || (nlapiGetFieldValue('enddate') && nlapiStringToDate(nlapiGetFieldValue('enddate')).getTime() >= (new Date()).getTime()) ) 
	{
		return true;
	}
	return false;
}

//16/1/2015 - Merged function localform_pageInit() from sweet_job_form.js
function bookingUiPageInit(type) {
	
	/*
	// Added this to fix the 'Pending Brief' status issue with workflows.
	  var isBriefEntered = sweet_job_lib_isSet(nlapiGetFieldValue('custentity_bo_coachbrief'));
	  if(isBriefEntered){
	    nlapiSetFieldValue('custentity_coach_brief_isempty', 'T');
	  } else {
	    nlapiSetFieldValue('custentity_coach_brief_isempty', 'F');
	  }
	*/
	
	oldFeedBackLoc = nlapiGetFieldValue('custentity_cbl_feedbackffloc');
	
	oldItemValue = nlapiGetFieldValue('custentity_bo_item');
	
	origShipToValue = nlapiGetFieldValue('custentity_bo_pack_shipto');
	var adrval = '';
	//onload, if ship to is set but no shipping address, attempt to default source the value
	var shipto = nlapiGetFieldValue('custentity_bo_pack_shipto');
	
	if (shipto && !nlapiGetFieldValue('custentity_bo_shippingaddress')) {
		if (shipto == '1') {
			
			var coachId = nlapiGetFieldValue('custentity_bo_coach');
			if (coachId) {
				adrval = getAddress('vendor', coachId,'');
			}
			
		} else if (shipto == '2') {
			adrval = getDeliveryAddress();
		} else if (shipto == '3') {
			var buyerId = nlapiGetFieldValue('custentity_bo_buyer');
			if (buyerId) {
				adrval = getAddress('contact', buyerId,'');
				
			}				
		}
		else if (shipto == '16')
		{
			adrval = getAddress('','','16');
		}
		
		nlapiSetFieldValue('custentity_bo_shippingaddress',adrval);
	}
	
	//Ticket 3475
	toggleShippingAddress();
	
	//Apr. 14 2016 - parent to child coach override support
	originalCoachValue = nlapiGetFieldValue('custentity_bo_coach');
	
}




function bookingUiOnSave() {
	
	//Apr. 15 2016 - Check to make sure user selected atleast ONE value if override on child is checked
	if (nlapiGetFieldValue('custpage_coachoverride')=='T' && !nlapiGetFieldValue('custpage_childoverridelist'))
	{
		alert('You must select atleast ONE or ALL Child Booking to sync with');
		return false;
	}
	
	//Ticket 3475
	if (isInFuture() && nlapiGetFieldValue('custentity_bo_pack_shipto') == '4' && !strTrim(nlapiGetFieldValue(('custentity_bo_shippingaddress'))))
	{
		alert('You must provide Shipping Address');
		return false;
	}
	
	//23/4/2015 - Update "Feedback Processing Date" ONLY when "Processing Location" is changed
	
	var newFeedBackLoc= nlapiGetFieldValue('custentity_cbl_feedbackffloc');
	var date_time_value = nlapiDateToString(new Date(), 'datetimetz');
	
	if(newFeedBackLoc != oldFeedBackLoc ){

		nlapiSetFieldValue('custentity_bo_feedbackprocessingdate',date_time_value);
		
	}

	
	
	//16/1/2015 - Check to see if the form is legacy and IF So execute business logic merged from FORM level sweet_job_form.js 
	if (paramLegacyForms && paramLegacyForms.contains(nlapiGetFieldValue('customform'))) {
		// Update address fields
		//16/1/2015 - Does this need to trigger for EVERY save? and Why?
		sweet_job_lib_updateAddressFields();
		  
		// State field is mandatory if country is United States
		if (nlapiGetFieldValue('custentity_bo_eventcountry') == SWEET_COUNTRY_UNITED_STATES) {
			var state = nlapiGetFieldValue('custentity_bo_eventstate');
		    if (state == undefined || (String(state).length < 1)) {
		    	alert('State field is a mandatory field when country is set to United States.');
		    	return false;
		    }
		}
		  
		// Time zone field is mandatory when the exact time is known
		if (nlapiGetFieldValue('custentity_bo_eventtime') && !nlapiGetFieldValue('custpage_timezone')) {
			alert('Time zone field is mandatory when the exact time is known.');
		    return false;
		}

		if(isItemChaned){
			//custpage_transsublist is dynamically added by sweet_job_server.js user event
			var transactions  = nlapiGetLineItemCount('custpage_transsublist');

			if ((transactions >= 1) && (nlapiGetFieldValue('entitystatus') == '66')) {
				var answer = confirm("Changing an item will also change the line item of the respective quote. This may reset price and quote amount. Are you sure you want to make this change? Speak to Finance if you are unsure");
				if (!answer){
					return false;
				}
			}
			
			if ((transactions >= 1) && (nlapiGetFieldValue('entitystatus') != '66')) {
				var answer = confirm("Changing an item will also change the line item of the respective sales order. This may reset price and sales order amount. Are you sure you want to make this change? Speak to Finance if you are unsure");
				if (!answer){
					return false;
				}
			} 
		} 
	}
	//-------------------End Legacy Form Logic -----------------------------------------
	
	//Validation to make sure pack shipping address sourced correctly
	if ( !nlapiGetFieldValue('custentity_bo_shippingaddress') && 
		 (nlapiGetFieldValue('custentity_bo_pack_shipto')=='1' ||
		  nlapiGetFieldValue('custentity_bo_pack_shipto')=='2' ||
		  nlapiGetFieldValue('custentity_bo_pack_shipto')=='3')) {
		
		alert('Ship to address is missing. Please make sure shipping address is sourced correctly');
		return false;
		
	}
	
	//3/21/2015 Ticket 2184
	//Ship To ONLY becomes required IF and ONLY if Coach is set AND Is Pack Ship is NOT checked
	
	//Nov 24/2015 - Tix 5398
	//	Check to also make sure optpack is Checked before firing
	if (nlapiGetFieldValue('custentity_bo_ispackshipped') !='T' && 
		nlapiGetFieldValue('custentity_bo_coach') && 
		!nlapiGetFieldValue('custentity_bo_pack_shipto') &&
		nlapiGetFieldValue('custentity_bo_optpack') == 'T') {
		
		alert('You must select Ship To option to send pack to');
		return false;
		
	}
	
	return true;
}

/**
 * Post Source trigger
 * @param type
 * @param name
 */
function bookingUiPostSource(type, name) {
	//ONLY Trigger this during UI
	if (nlapiGetContext().getExecutionContext()!='userinterface') {
		return;
	}
	//16/2/2015 - Auto Set Job Type when Item field changes.
	//When item field changes hidden field custentity_sourceditemjobtype will change
	if (name == 'custentity_bo_item') {
		nlapiSetFieldValue('jobtype', nlapiGetFieldValue('custentity_sourceditemjobtype'));
	}
}
















function bookingUiFldChanged(type, name, linenum){
	//16/1/2015 - Check to see if the form is legacy and IF So execute business logic merged from FORM level sweet_job_form.js 
	if (paramLegacyForms && paramLegacyForms.contains(nlapiGetFieldValue('customform'))) {
		
		
		if (name == 'custentity_bo_item'){
			if (!isItemChaned)  {
				isItemChaned = true;
			}
		
			if (oldItemValue == nlapiGetFieldValue('custentity_bo_item')){
				isItemChaned = false;
			}
		}
		
		//16/1/2015 - THIS Needs to be reviewed. JobType can be changed at any point in time. 
		//			  WHEN it's changed, it inline edits jobtype to selected and null out entitystatus and RESETS the custom form.
		//			  When custom form is saved, record is RELOADED losing all the reference to changes you made on the current form.
		//			  MODIFYING THE LOGIC so that 1) Confirmation screen is show and 2)Code is more logical
		
		if(name == 'custentity_booking_status') {
			nlapiSetFieldValue('entitystatus', nlapiGetFieldValue('custentity_booking_status'));
		}
		
		// Update address text if location field is changed
		if (name == 'custentity_bo_eventlocation')  {
			sweet_job_lib_updateAddressFields();
		}
		
		// Update time zone if country is changed and event is not virtual
		var optVirtualEvent = (nlapiGetFieldValue('custentity_bo_virtualevent') == 'T'); // Virtual event
		
		if (name == 'custentity_bo_eventcountry' )//&& optVirtualEvent) 
		{
			var countryId = nlapiGetFieldValue('custentity_bo_eventcountry');
			//custpage_timezone is dynamically by sweet_job_server.js
		    nlapiRemoveSelectOption('custpage_timezone', null); // Reset time zone list
		    var timeZones = getTimeZonesByCountryId(countryId);
		    
		    if (!timeZones) { // If country has no entry in the time zone table...
		      timeZones = getAllTimeZones(timeZoneId); // ...show all entries
		    }
		    
		    var selected = timeZones.length == 1; // If single choice, select this by default
		    if (!selected) {
		      nlapiInsertSelectOption('custpage_timezone', '', ' - Select time zone - ', true);
		    }
		    
		    var i = 0, n = timeZones.length;
		    for (; i < n; i++) {
		    	nlapiInsertSelectOption('custpage_timezone', timeZones[i].id, timeZones[i].name, selected);
		    }
		}
		
		//Spicework Ticket #421 core changes aredone on below three logic
		// Reset pack flags if coach is changed
		if (name == 'custentity_bo_coach') {
			
		    if (nlapiGetFieldValue('custentity_bo_eventtimezone') == '') {
		    	alert('Please enter a Time Zone, without a Time Zone this booking wont appear in the Coaches Calendar');
		    }
		    		    
		    //11/2/2015 - Logic change requested by DA 
		    if ((nlapiGetFieldValue('custentity_bo_isinproduction')=='T' || nlapiGetFieldValue('custentity_bo_ispackshipped')=='T') && nlapiGetFieldValue('custentity_bo_isdelivered')!='T') {
		    	var answer = confirm("Pack has already been sent.\n\nShould a new pack be sent to the new coach?\n\nPress OK for Yes, or Cancel for No.");
		    	if (answer){
		    		//16/1/2015 - Call resetPackFields with parameter of false to indicated it was NOT triggered by Button
		    		resetPackFields(false);
		    	}
		    }
		}

		// Reset pack flags if Course is changed
		if (name == 'custentity_bo_course') {
			//11/2/2015 - Logic change requested by DA 
		    if ((nlapiGetFieldValue('custentity_bo_isinproduction')=='T' || nlapiGetFieldValue('custentity_bo_ispackshipped')=='T') && nlapiGetFieldValue('custentity_bo_isdelivered')!='T') {
		    	var answer = confirm("Pack has already been sent.\n\nShould a new pack be sent with the new course materials?\n\nPress OK for Yes, or Cancel for No.");
		    	if (answer){
		    		//16/1/2015 - Call resetPackFields with parameter of false to indicated it was NOT triggered by Button
		    		resetPackFields(false);
		    	}
		    }
		}
		  
		// Display warning if time is outside business hours (9:00 am to 6:00 pm)
		if (name == 'custentity_bo_eventtime') {
			var startDate = nlapiGetFieldValue('enddate');
		    var startTime = nlapiGetFieldValue('custentity_bo_eventtime');
		    var time = nlapiStringToDate(startDate + ' ' + startTime);
		    var firstBusinessHour = nlapiStringToDate(startDate);
		    if (firstBusinessHour) {
		    	firstBusinessHour.setHours(9);
			    firstBusinessHour.setMinutes(0);
			    var lastBusinessHour = nlapiStringToDate(startDate);
			    lastBusinessHour.setHours(18);
			    lastBusinessHour.setMinutes(0);
			    
			    if (time < firstBusinessHour || time > lastBusinessHour) {
			    	alert("Warning: Time is outside business hours.");
			    }
		    }
		    
		}
		
	}
	
	//-------------------End Legacy Form Logic -----------------------------------------
	
	//fire ONLY for UI
	if (nlapiGetContext().getExecutionContext()=='userinterface') {
		if (name == 'custpage_ftbuyer') {
			//sync value to real Buyer field.
			nlapiSetFieldValue('custentity_bo_buyer', nlapiGetFieldValue(name), true, true);
		}
		
		//********************* Parent/Child Related Coach field change ****************************/
		//Apr. 14 2016 - parent to child coach override support
		if (name == 'custentity_bo_coach' && nlapiGetFieldValue('custentity_bookingset_child'))
		{
			//Trigger ONLY when coach field is changed and the Value is Different from original and  has child booking.
			//1. Enable custpage_coachoverride check box (Override Coach On Child)
			if (nlapiGetFieldValue('custentity_bo_coach') != originalCoachValue)
			{
				nlapiDisableField('custpage_coachoverride', false);
				
				//auto check it IF original is empty
				if (!originalCoachValue)
				{
					nlapiSetFieldValue('custpage_coachoverride','T',true,true);
				}
				
			}
			//If it's same, revert back values and disable them
			else
			{
				nlapiSetFieldValue('custpage_coachoverride','F');
				nlapiDisableField('custpage_coachoverride', true);
			}
			
		}
		
		//If user changed Override Coach On Child Box
		if (name == 'custpage_coachoverride')
		{
			//If checked, enable the Override Child Selection
			if ( nlapiGetFieldValue('custpage_coachoverride')=='T')
			{
				nlapiDisableField('custpage_childoverridelist', false);
				
				//Go through and auto select ALL child and set matches
				nlapiSetFieldValues('custpage_childoverridelist', nlapiGetFieldValues('custentity_bookingset_child'), true, true);
				
				
			}
			
			//If NOt Checked, deselect and disable
			else
			{
				nlapiDisableField('custpage_childoverridelist', true);
				nlapiSetFieldValue('custpage_childoverridelist', '', true, true);
			}
		}
		
		//********************* Parent/Child Related Coach field change ****************************/
	}
		
	//Fulfillment Module Changes
	if (name=='custentity_bo_pack_shipto') {
		
		//1 = Coach Addr
		// 2 = Delivery addr
		// 3 = Client/Buyer Addr
		// 4 = Other
		// Nov 30 2015
		// 16 = Alphaprint
		var shipto = nlapiGetFieldValue(name);
		var adrval = '';
		//1 = get Coach shipping address
		//2 = get Address from Address tab
		//3 = get Buyer shipping address
		//16 = get default location address of Alphaprint
		if (shipto == '1') 
		{
			
			var coachId = nlapiGetFieldValue('custentity_bo_coach');
			if (coachId) {
				adrval = getAddress('vendor', coachId,'');
				if (!adrval) {
					alert('No Shipping address is set for Coach. Please make sure Coach record has default shipping address set');
					nlapiSetFieldValue(name, origShipToValue, false,true);
				}
			} else {
				alert('Coach is not set. Please set coach field and try again');
				//return;
			}
			
		} 
		else if (shipto == '2') 
		{
			adrval = getDeliveryAddress();
			if (!adrval) {
				alert('No Delivery address is set. Make sure address is filled in on this record');
				nlapiSetFieldValue(name, origShipToValue, false,true);
			}
		} 
		else if (shipto == '3') 
		{
			
			var buyerId = nlapiGetFieldValue('custentity_bo_buyer');
			if (buyerId) {
				adrval = getAddress('contact', buyerId,'');
				if (!adrval) {
					alert('No Shipping address is set for Buyer. Please make sure Buyer record has default shipping address set');
					nlapiSetFieldValue(name, origShipToValue, false,true);
				}
			} else {
				alert('Buyer is not set. Please set buyer field and try again');
				//return;
			}				
		}
		else if (shipto == '4') 
		{
			//Other blank out shipping address
			adrval = '';
			
			//Ticket 3475
			toggleShippingAddress();
		}
		//Updated August 23, 2016 -- ELI
		//MindGym Ship To Locations London and New York were added to list
		//Previous "MindGym" selection (9) was changed to MindGym London
		// MindGym NYC (19) was a newly created list item 
		else if (shipto == '9') 
		{
			adrval = nlapiGetContext().getSetting('SCRIPT','custscript_aux_mindgym_london');
		}
		else if (shipto == '19') 
		{
			adrval = nlapiGetContext().getSetting('SCRIPT','custscript_aux_mindgym_nyc');

		}					
		else if (shipto == '16')
		{
			//Added Nov 30 2015-tix 5515 
			adrval = getAddress('','','16');
			
		}
		
		nlapiSetFieldValue('custentity_bo_shippingaddress',adrval);
	}

	
	//Logic to handle shipping address when address subtab field changes
	if (name == 'custentity_bo_coach' || name == 'custentity_bo_buyer' || 
		name == 'custentity_bo_eventaddress1' || name=='custentity_bo_eventaddress2' || name=='custentity_bo_eventcity' ||
		name == 'custentity_bo_eventpostcode' || name == 'custentity_bo_eventstate' || name == 'custentity_bo_eventcountry' || 
		name == 'custentity_bo_sitecontact') {
		
		//Dev mode. Fire ONLY for Sandbox
		//if (nlapiGetContext().getEnvironment() != 'SANDBOX') {
		//	return;
		//}
		//alert(name);
		
		if (name == 'custentity_bo_coach' || name == 'custentity_bo_buyer') {
			var recType ='vendor';
			var checkShipType = '1';
			
			if (name == 'custentity_bo_buyer') {
				recType = 'contact';
				checkShipType = '3';
			}
			
			syncShippingAddress(name, recType, checkShipType);
		} else {
			syncShippingAddress(null, null, '2');
		}
	}
}



//Fulfillment Module Change
//Function checks to see if we need to update shipping address based on Ship To related field change
function syncShippingAddress(name, recType, shipType) {
	
	//Dev mode. Fire ONLY for Sandbox
	//if (nlapiGetContext().getEnvironment() != 'SANDBOX') {
	//	return;
	//}
	
	if (!shipType) {
		//can sync without ship type 
		return;
	}
	
	var shipToVal = nlapiGetFieldValue('custentity_bo_pack_shipto');
	//alert('sync ship: '+shipToVal+' // shipType: '+shipType);
	if (shipType != shipToVal) {
		//no need to process
		return;
	}

	//Ship to field is set and it matches changes made to related field
	
	if (name && recType) {
		
		if (!nlapiGetFieldValue(name)) {
			alert('Ship To and Shipping Address will reset to blank due to missing required info. Make sure you REVIEW info under Packs subtab before saving');
			nlapiSetFieldValue('custentity_bo_pack_shipto','',true,true);
		} else {
			//alert('Updating shipping address for '+recType);
			nlapiSetFieldValue('custentity_bo_shippingaddress',getAddress(recType, nlapiGetFieldValue(name)),true,true);
		}
		
	} else {
		//alert('about to set del addr');
		nlapiSetFieldValue('custentity_bo_shippingaddress',getDeliveryAddress(),true,true);
	}
}

/**
 * returns formatted address value from fields from address or location subtab
 * @returns {String}
 */
//Fulfillment Module Change
function getDeliveryAddress() {
	
	
	var ad = '';
	
	if (nlapiGetFieldValue('custentity_bo_sitecontact')) {
		ad += nlapiGetFieldValue('custentity_bo_sitecontact') + '\n';
	}
	
	if (nlapiGetFieldValue('custentity_bo_eventaddress1')) {
		ad += nlapiGetFieldValue('custentity_bo_eventaddress1')+'\n';
	} 
	//alert(ad);
	if (nlapiGetFieldValue('custentity_bo_eventaddress2')) {
		ad += nlapiGetFieldValue('custentity_bo_eventaddress2')+'\n';
	} 
	//alert(ad);
	if (nlapiGetFieldValue('custentity_bo_eventcity')) {
		ad += nlapiGetFieldValue('custentity_bo_eventcity')+' ';
	} 
	//alert(ad);
	if (nlapiGetFieldValue('custentity_bo_eventstate')) {
		ad += nlapiGetFieldValue('custentity_bo_eventstate')+' ';
	} 
	//alert(ad);
	if (nlapiGetFieldValue('custentity_bo_eventpostcode')) {
		ad += nlapiGetFieldValue('custentity_bo_eventpostcode')+' ';
	} 
	//alert(ad);
	if (nlapiGetFieldText('custentity_bo_eventcountry')) {
		ad += '\n'+nlapiGetFieldText('custentity_bo_eventcountry');
	} 
	
	//alert(ad);
	
	return ad;
}

//Fulfillment Module Change
//Modified Nov 30 2015 for tix 5515. Ability to handle location ID
function getAddress(_type, _id, _locid) {
	
	if (!_locid && (!_type || !_id)) {
		alert('Error: Unable to look up shipping address due to missing info');
		return '';
	}
	
	var ad = '';
	
	try {
		var adrLookupSlUrl = nlapiResolveURL('SUITELET', 'customscript_cbl_sl_getshipaddressforrec', 'customdeploy_cbl_sl_getshipaddressforrec', 'VIEW')+
										     '&rectype='+_type+
										     '&recid='+_id+
										     '&locid='+_locid;

		var retjson = eval('('+nlapiRequestURL(adrLookupSlUrl).getBody()+')');
		
		if (!retjson.status) {
			alert('Error looking up shipping address: '+retjson.err);
			return '';
		}
		
		if (retjson.address.attn) {
			ad += retjson.address.attn+'\n';
		}
		
		if (retjson.address.adree) {
			ad += retjson.address.adree+'\n';
		}
		
		if (retjson.address.phone) {
			ad += retjson.address.phone+'\n';
		}
		
		if (retjson.address.adr1) {
			ad += retjson.address.adr1+'\n';
		}
		
		if (retjson.address.adr2) {
			ad += retjson.address.adr2+'\n';
		}
		
		if (retjson.address.adr3) {
			ad += retjson.address.adr3+'\n';
		}
		
		if (retjson.address.city) {
			ad += retjson.address.city+' ';
		}
		
		if (retjson.address.state) {
			ad += retjson.address.state+' ';
		}
		
		if (retjson.address.zip) {
			ad += retjson.address.zip+' ';
		}
		
		if (retjson.address.country) {
			ad += '\n'+retjson.address.country;
		}
		
	} catch (adlookuperr) {
		alert('Error getting shipping address\n\n'+getErrText(adlookuperr));
	}
	
	return ad;
	
}