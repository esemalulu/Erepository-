/**
 * User Event Functions
 */

function trxUnattachedBookingBeforeLoad(type, form, request) {
	
	//log('debug','type of unattach custom',type);
	//Assume this is deployed against Sales order and Quote transaction record.
	if ( (type=='create' || type=='edit' || type=='copy') && nlapiGetContext().getExecutionContext() == 'userinterface') {
	
		try {
			
			//Add in hidden checkbox to disable or enable Native Job drop down
			
			//var form = nlapiCreateForm('test', false);
			//get the item sublist
			var itemSublist = form.getSubList('item');
			var unattachfld = itemSublist.addField('custpage_unajobs', 'select', 'Unattached Booking', null);
			//unattachfld.setDisplayType('disabled');
			
			if (type == 'create' || type == 'copy')
			{
				//Ticket 6825 - Add EASY Button for adding ONLY on Create. >>> 
				//ES: Updated on April 20 2016 to include type == Copy due to "Make Copy" errors in pageInit
				//				Initially disabled and will become Enabled if there are more than 5 unattached booking record
				//				associated with selected client
				var easyBtn = form.addButton('custpage_proveasybtn','Add All Provisional Items','addAllProvBooking()');
				easyBtn.setDisabled(true);
			}
			
			
		} catch (unattbookingerror) {
			
			log('error','Error Unattached Booking', getErrText(unattbookingerror));
		}
	}
}

//Ticket 3849
function trxUnattachedBookingAfterSubmit(type)
{
	if (nlapiGetRecordType()=='estimate')
	{
		//Loop through each line and see if user set value for unattached booking.
		var clientServPtr = (nlapiGetFieldValue('custbody_clientservicespartnership')?nlapiGetFieldValue('custbody_clientservicespartnership'):'');
		var trainProgram = (nlapiGetFieldValue('custbody_so_trainingprogramme')?nlapiGetFieldValue('custbody_so_trainingprogramme'):'');
		var solutionSet = (nlapiGetFieldValue('custbody_op_solutionset')?nlapiGetFieldValue('custbody_op_solutionset'):'');
		
		for (var i=1; i <= nlapiGetLineItemCount('item'); i+=1)
		{
			if (nlapiGetLineItemValue('item','custpage_unajobs',i))
			{
				//custentity_clientservicespartnership
				var fldupd = [];
				var valupd = [];
				
				if (clientServPtr)
				{
					fldupd.push('custentity_clientservicespartnership');
					valupd.push(clientServPtr);
				}
				
				if (trainProgram)
				{
					fldupd.push('custentity_bo_trainingprogramme');
					valupd.push(trainProgram);
				}
				
				if (solutionSet)
				{
					fldupd.push('custentity_bo_trainingsolution');
					valupd.push(solutionSet);
				}
				
				if (fldupd.length > 0)
				{
					try 
					{
						nlapiSubmitField(
								'job', 
								nlapiGetLineItemValue('item','custpage_unajobs',i), 
								fldupd, 
								valupd, 
								true
						);
						
						log('debug','Updated Line '+i,'Unattached booking '+nlapiGetLineItemValue('item','custpage_unajobs',i));
						
					}
					catch (fldsyncerr)
					{
						log('error',
							'line '+i+' on Quote '+nlapiGetRecordId(),
							'Failed to sync values on booking ID '+nlapiGetLineItemValue('item','custpage_unajobs',i)
						);
					}
				}
			}
		}
	}
}


/***********************************************************/

/**
 * Client Script
 */

/**
 * JSON Returned from Suitelet; Format:
 * 	hasrecords = false;
	errmsg = '';
	records = {
		"internalid":{
			"entityid":booking name,
			"item":item id to add
		}
	allrecords = {
		"internalid":{
			"entityid":booking name,
			"item":item id to add,
			"enddate":booking end date map to (custcol_bo_date)
			"country":booking country map to (custcol_bo_country)
			"eventtime":booking event time map to (custcol_bo_time)
			"jobtype":booking job type map to (custcol_bo_job_type)
			"course":booking course map to (custcol_bo_course)
		}
		
	};
 */
var clientbljson = {};
var userActionType = '';

//Ticket 6825 
//Function to go through and add all provisional booking returned from search
//IMPORTANT
//	- THIS ONLY returns list of all provisional booking with end dates on or after 60 days AGO from Today
function addAllProvBooking()
{
	var acceptDelay = confirm('There are '+clientbljson.unattachedcount+' lines to add. \n'+
							  'This will freeze your window possibly up to 5 to 7 minutes until process is complete. \n\n'+
							  'Click OK to Proceed');
	
	if (acceptDelay)
	{
		for (var pb in clientbljson.records)
		{
			
			
			nlapiSelectNewLineItem('item');
	
			nlapiSetCurrentLineItemValue('item', 'job', pb, true, true);
			nlapiSetCurrentLineItemValue('item', 'amount', nlapiGetCurrentLineItemValue('item', 'rate'), true, true);
			nlapiCommitLineItem('item');
		}
		
		//Disable the button once complete
		nlapiDisableField('custpage_proveasybtn', true);
		alert('Please make sure you update the amounts on the line items before saving the record.');
	}
	
}










/** Page Init Client function **/
function trxUnattachedBookingPageInit(type) {
	//Only fire IF loaded by User
	if (nlapiGetContext().getExecutionContext() == 'userinterface') {
		//alert(type);
		userActionType = type;
		
		if (nlapiGetFieldValue('entity')) {
			getUnattachedBookingList('entity');
			
			//fire select new line item to trigger new line population.
			nlapiSelectNewLineItem('item');
			
			//Ticket 6925 + 9149 
			//8/10/2016 - had to add in copy action because when 
			//			  quote is created from opp. it fires copy action on client side
			

			
			if (userActionType == 'create' || userActionType == 'copy')
			{
				//Enable the Easy Button if more than 1 and less than 20
				//Ticket 9343 - 5/3/2016 - Enable it for 100
				//May 24 2016 - Remove 100 restriction by request.
				if (clientbljson.unattachedcount >=1)
				{
					nlapiDisableField('custpage_proveasybtn', false);
				}
				/**
				else if (clientbljson.unattachedcount > 100)
				{
					//let users know that there are more than 100 unattached bookings
					alert('We found more than 100 provisional bookings associated with this client. Button will be disabled');
					
				}
				else if (clientbljson.unattachedcount < 1)
				{
					alert('We found 0 provisional bookings associated with this client. Button will be disabled');
				}
				*/				
				//HTML Hack Workaround to Hide Secondary button.
				//When disable/enable is set, NS is not triggering the same for secondary button
				document.getElementById('tbl_secondarycustpage_proveasybtn').style.display = 'none';
								
			}
		}
	}	
}


/** Field change function **/
function trxUnattachedBookingFieldChanged(type, name, linenum) {
	
	if (nlapiGetContext().getExecutionContext() == 'userinterface') {
		
		//client change
		if (name == 'entity') {
			if (nlapiGetFieldValue(name)) {
				getUnattachedBookingList(name);
				
				//If there are no Lines, run initial population of custom drop down if it exists
				if (clientbljson && clientbljson.hasrecords) {
					//enable custom drop down
					nlapiDisableLineItemField('item', 'custpage_unajobs', false,1);
					
					//populate 
					nlapiRemoveLineItemOption('item', 'custpage_unajobs', null,1);
					nlapiInsertLineItemOption('item', 'custpage_unajobs', '', '', true,1);
					//loop through unattached list
					for (var booking in clientbljson.records) {
						nlapiInsertLineItemOption('item', 'custpage_unajobs', booking, clientbljson.records[booking].entityid, false,1);
					}
					nlapiSetLineItemValue('item', 'custpage_unajobs', 1, nlapiGetLineItemValue('item', 'job', 1));
				}	
				
				//Ticket 6925 + 9149
				//	- Odd NS behavior where when quote is created from Opportunity, it generates copy action on client side.
				//	  When quote is created from client, it generates create action on client side
				if (userActionType == 'create' || userActionType == 'copy')
				{
					//Enable the Easy Button if more than 1 and less than 20
					//Ticket 9343 - 5/3/2016 - Enable it for 100
					//May 24 2016 - Remove 100 restriction by request
					if (clientbljson.unattachedcount >=1)
					{
						nlapiDisableField('custpage_proveasybtn', false);
					}
				}
				
			}			
		}
		
		//Monitor Field Change on Native booking or custom
		if (type == 'item' && (name=='job' || name=='custpage_unajobs')) {
			
			/**
			 * "enddate":booking end date map to (custcol_bo_date)
			"country":booking country map to (custcol_bo_country)
			"state":booking state map to (custcol_bo_state)
			"eventtime":booking event time map to (custcol_bo_time)
			"jobtype":booking job type map to (custcol_bo_job_type)
			"course":booking course map to (custcol_bo_course)
			 */
			
			var itemFromBooking = '';
			//options
			var opdate='', opcountry='', opetime='', opjobtype='', opcourse='', opstate='';
			if (nlapiGetCurrentLineItemValue(type, name)) 
			{
				//Get ALL Records vs Records needs to be utilized properly.

				if (clientbljson.records[nlapiGetCurrentLineItemValue(type,name)]) 
				{
					itemFromBooking = clientbljson.records[nlapiGetCurrentLineItemValue(type,name)].item;
					opdate = clientbljson.records[nlapiGetCurrentLineItemValue(type,name)].enddate;
					opcountry = clientbljson.records[nlapiGetCurrentLineItemValue(type,name)].country;
					opstate = clientbljson.records[nlapiGetCurrentLineItemValue(type,name)].state;
					opetime = clientbljson.records[nlapiGetCurrentLineItemValue(type,name)].eventtime;
					opjobtype = clientbljson.records[nlapiGetCurrentLineItemValue(type,name)].jobtype;
					opcourse = clientbljson.records[nlapiGetCurrentLineItemValue(type,name)].course;
					
				}
				else if (clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)]) 
				{
					itemFromBooking = clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)].item;
					opdate = clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)].enddate;
					opcountry = clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)].country;
					opstate = clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)].state;
					opetime = clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)].eventtime;
					opjobtype = clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)].jobtype;
					opcourse = clientbljson.allrecords[nlapiGetCurrentLineItemValue(type,name)].course;
					
				}
				
				if (!itemFromBooking)
				{
					alert('Unable to properly match up Item information from Booking. Please notify Admin');
					return false;
				}
				
				//If Item is empty, set it, IF not confirm with User before changing
				if (nlapiGetCurrentLineItemValue(type, 'item') && nlapiGetCurrentLineItemValue(type, 'item') != itemFromBooking) {
					
					if (confirm("Item set is different from Item on Booking record.  Do you want to sync with Item on Booking Record?")) {
						nlapiSetCurrentLineItemValue(type, 'item', itemFromBooking, true, true);
						nlapiSetCurrentLineItemValue(type,'custcol_bo_date',opdate,true,true);
						nlapiSetCurrentLineItemValue(type,'custcol_bo_country',opcountry,true,true);
						nlapiSetCurrentLineItemValue(type,'custcol_bo_state',opstate,true,true);
						nlapiSetCurrentLineItemValue(type,'custcol_bo_time',opetime,true,true);
						nlapiSetCurrentLineItemValue(type,'custcol_bo_job_type',opjobtype,true,true);
						nlapiSetCurrentLineItemValue(type,'custcol_bo_course',opcourse,true,true);
					}
					
				} else {
					//auto set for user 
					nlapiSetCurrentLineItemValue(type, 'item', itemFromBooking, true, true);
					nlapiSetCurrentLineItemValue(type,'custcol_bo_date',opdate,true,true);
					nlapiSetCurrentLineItemValue(type,'custcol_bo_country',opcountry,true,true);
					nlapiSetCurrentLineItemValue(type,'custcol_bo_state',opstate,true,true);
					nlapiSetCurrentLineItemValue(type,'custcol_bo_time',opetime,true,true);
					nlapiSetCurrentLineItemValue(type,'custcol_bo_job_type',opjobtype,true,true);
					nlapiSetCurrentLineItemValue(type,'custcol_bo_course',opcourse,true,true);
				}
			}
			
			//sync up between the two booking drop downs
			if (name == 'custpage_unajobs') {
				nlapiSetCurrentLineItemValue(type, 'job', nlapiGetCurrentLineItemValue(type, name), false, true);
			} else {
				//reset it
				nlapiSetCurrentLineItemValue(type, 'custpage_unajobs', '', false, true);
			}		
		}
	}
}


/** Line Init function to disable/enable and populate custom if needed */
function trxUnattachedBookingLineInit(type) {
	
	if (nlapiGetContext().getExecutionContext() == 'userinterface') {
		//alert('line init called');
		if (type == 'item') {
			//there are unattached booking records available
			if (clientbljson && clientbljson.hasrecords) {
				
				//enable custom drop down
				nlapiDisableLineItemField(type, 'custpage_unajobs', false);
				
				//populate 
				nlapiRemoveLineItemOption(type, 'custpage_unajobs', null);
				nlapiInsertLineItemOption(type, 'custpage_unajobs', '', '', true);
				//loop through unattached list
				for (var booking in clientbljson.records) {
					nlapiInsertLineItemOption(type, 'custpage_unajobs', booking, clientbljson.records[booking].entityid, false);
				}
				nlapiSetCurrentLineItemValue(type, 'custpage_unajobs', nlapiGetCurrentLineItemValue(type, 'job', false, true), false, true);
				
			} else {
				nlapiDisableLineItemField(type, 'custpage_unajobs', true);
			}			
		}		
	}
}










/**
 * Function to call CBL:SL Get Unattached Booking JSON Suitelet which returns JSON object that contains list of Unattached bookings for THIS customer
 */
function getUnattachedBookingList(_fld) {
	
	//alert(_fld+': '+nlapiGetFieldValue(_fld));
	
	if (!nlapiGetFieldValue(_fld)) {
		return;
	}
	
	//Call Suitelet and get the JSON object
	//customscript_cbl_sl_getuna_bookinglist  
	//customdeploy_cbl_sl_getuna_bookinglist  
	
	var ubres = nlapiRequestURL(
					nlapiResolveURL('SUITELET', 'customscript_cbl_sl_getuna_bookinglist', 'customdeploy_cbl_sl_getuna_bookinglist', 'VIEW')+'&client='+nlapiGetFieldValue(_fld)
				);
	clientbljson = eval('('+ubres.getBody()+')');
	
	//Set Message Display to tell user if client has unattached booking records.
	if (clientbljson.hasrecords) {
		nlapiSetFieldValue('custbody_cbl_hasunattbookingmsg','<b>Customer has Unattached Booking Records and they are available for selection under <i>Unattached Booking column</i></b>');
	} else {
		nlapiSetFieldValue('custbody_cbl_hasunattbookingmsg','No Unattached Booking Records Found');
	}
	
}














/***********************************************************/

/**
 * Suitelet Function called by client script when Client field changes.
 * Purpose of this Suitelet is run the search of unattached booking record and populate the custpage_unajobs list.
 */
function getUnattachedBookingForClient(req, res) {
	var bjson = new Object();
	bjson.hasrecords = false;
	bjson.errmsg = '';
	bjson.records = {};
	bjson.allrecords = {};
	//Ticket 6825 - EASY Button for adding ALL provisional (Unattached) booking Items on the line
	bjson.unattachedcount = 0;

	try {
		if (req.getParameter('client')) {
			log('debug','client id',req.getParameter('client'));
			//job searc
			//filters
			//	enddate onorafter 1/4/2013
			//	custentity_bo_item anyof 1570
			//		Parent Gym
			//	custentity_bo_iscancelled is F
			//	category :: custentity_bo_coach anyof 5
			//	removed
			//		Coach - Mind Gym
			//	type :: transaction noneof SalesOrd
			//	customer <User Selection>
			
			//columns
			//internalid
			//entityid
			//custentity_bo_item
			
			
			//Modification: 2/12/2014
			//initial search works if Booking record ONLY has Sales Order as tranction.
			//If it has other, including Sales order, it excludes SO only.
			
			//Ticket 1434 - Change the filter to return booking with end date that is on or after today - 60 days
			var sixtyDaysAgoToday = nlapiDateToString(nlapiAddDays(new Date(), -60));
			
			//Add Initial Search FOR THose Jobs WITH Sales Order to be excluded programmatically on th e
			var abflt = [new nlobjSearchFilter('enddate', null, 'onorafter', sixtyDaysAgoToday),
			             //new nlobjSearchFilter('custentity_bo_item', null, 'noneof', '1570'),
			             new nlobjSearchFilter('custentity_bo_iscancelled', null, 'is','F'),
			             //new nlobjSearchFilter('category', 'custentity_bo_coach', 'anyof', '5'),
			             new nlobjSearchFilter('type', 'transaction', 'anyof', 'SalesOrd'),
			             new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			             new nlobjSearchFilter('customer', null, 'anyof', req.getParameter('client'))];
			
			var abcol = [new nlobjSearchColumn('internalid')];
			var abrs = nlapiSearchRecord('job', null, abflt, abcol);
			
			var abjson = {};
			
			//loop through and build boooking ID of those WITH sales Order
			for (var j=0; abrs && j < abrs.length; j++) {
				abjson[abrs[j].getValue('internalid')] = abrs[j].getValue('internalid');
			}
		
			var ubflt = [new nlobjSearchFilter('enddate', null, 'onorafter', sixtyDaysAgoToday),
			             //new nlobjSearchFilter('custentity_bo_item', null, 'noneof', '1570'),
			             new nlobjSearchFilter('custentity_bo_iscancelled', null, 'is','F'),
			             //new nlobjSearchFilter('category', 'custentity_bo_coach', 'anyof', '5'),
			             new nlobjSearchFilter('type', 'transaction', 'noneof', 'SalesOrd'),
			             new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			             new nlobjSearchFilter('customer', null, 'anyof', req.getParameter('client'))];
			
			var ubcol = [new nlobjSearchColumn('internalid'), 
			             new nlobjSearchColumn('entityid'),
			             new nlobjSearchColumn('custentity_bo_item'),
			             new nlobjSearchColumn('enddate'),
			             new nlobjSearchColumn('custentity_bo_eventcountry'),
			             new nlobjSearchColumn('custentity_bo_eventstate'),
			             new nlobjSearchColumn('custentity_bo_eventtime'),
			             new nlobjSearchColumn('jobtype'),
			             new nlobjSearchColumn('custentity_bo_course')];
			
			var unars = nlapiSearchRecord('job', null, ubflt, ubcol);
			if (unars && unars.length > 0) {
				
				for (var i=0; i < unars.length; i++) {
					
					//make sure result record isn't included in abjson
					if (abjson[unars[i].getValue('internalid')]) {
						continue;
					}
					
					bjson.hasrecords = true;
					
					//Ticket 6825 - Total count of unattached booking records associated with THIS
					bjson.unattachedcount = parseInt(bjson.unattachedcount) + 1; 
					
					bjson.records[unars[i].getValue('internalid')] = {
						"entityid":unars[i].getValue('entityid'),
						"item":unars[i].getValue('custentity_bo_item'),
						"enddate":unars[i].getValue('enddate'),
						"country":unars[i].getValue('custentity_bo_eventcountry'),
						"state":unars[i].getValue('custentity_bo_eventstate'),
						"eventtime":unars[i].getValue('custentity_bo_eventtime'),
						"jobtype":unars[i].getValue('jobtype'),
						"course":unars[i].getValue('custentity_bo_course')
					};
				}
			}
		
			//get ALL booking for this record so that item can be sourced
			var abflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			             new nlobjSearchFilter('customer', null, 'anyof', req.getParameter('client'))];
			
			var abrs = nlapiSearchRecord('job', null, abflt, ubcol);
			for (var j=0; abrs && j < abrs.length; j++) {
					bjson.allrecords[abrs[j].getValue('internalid')] = {
						"entityid":abrs[j].getValue('entityid'),
						"item":abrs[j].getValue('custentity_bo_item'),
						"enddate":abrs[j].getValue('enddate'),
						"country":abrs[j].getValue('custentity_bo_eventcountry'),
						"state":abrs[i].getValue('custentity_bo_eventstate'),
						"eventtime":abrs[j].getValue('custentity_bo_eventtime'),
						"jobtype":abrs[j].getValue('jobtype'),
						"course":abrs[j].getValue('custentity_bo_course')
					};
			}
			
		} else {
			bjson.errmsg = 'Missing Client ID to search';
		}
	} catch (unaerr) {
		bjson.errmsg = 'Error occured while looking for unattached booking reocrds: '+getErrText(unaerr);
	}
	log('debug','bjson',JSON.stringify(bjson));
	res.write(JSON.stringify(bjson));
}


