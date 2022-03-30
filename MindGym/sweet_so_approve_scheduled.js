/**
 * Sales Order Approve Script
 *
 * Script will approve sales order.
 *
 */

var LINE_INCREMENT = 1; // Default
var JOB_STATUS_CANCELLED = '37';
var SWEET_COUNTRY_UNITED_STATES = '229';
var SWEET_SUBSIDIARY_THEMINDGYM_UK = '2';
var SWEET_JOB_STATUS_PENDING_ZONE = '43';
var SWEET_JOB_SCHEDULED_THRESHOLD = 20;
/**
 * Main
 */

//7/2/2015 - JS: Track over all process
var hasError = false,
	msgError = '',
	createdBookingLog = '';

//Sept. 23 2015 - Adding flag to identify if this NEEDS rescheduled
var needToReschedule = false,
	rescheduleLineNumber = '',
	previousHasErrors = false,
	
	//JSON object to house sales order Line Number to Generated Booking ID
	/**
	 * line number:booking id
	 */
	soLineBookingId = {};

function sweet_so_approve_scheduled() 
{
	nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_approve_scheduled');
	var context = nlapiGetContext();
	var salesOrder = null;
	var employeeId = '';
	var salesOrderId = '';
	
	//initialize for function start
	needToReschedule = false;
	rescheduleLineNumber = context.getSetting('SCRIPT','custscript_sct98_lastprocline') || '';
	//set Prevous Has Error flag
	if (context.getSetting('SCRIPT','custscript_sct98_prevrunhaserrors') == 'T')
	{
		previousHasErrors = true;
	}
	
	//14/2/2015
	//This Variable keeps track of Job Type per Item
	var jobtypeByItem = {};
	
	try 
	{
	    salesOrderId = context.getSetting('SCRIPT', 'custscript_salesorder');
	    if (!salesOrderId) 
	    {
	      throw nlapiCreateError('SWEET_SALESORDER_REQD', 'Sales order field is required.');
	    }
	    
	    // Load sales order record
	    salesOrder = nlapiLoadRecord('salesorder', salesOrderId);

	    // Load Employee First Name
	    employeeId = salesOrder.getFieldValue('custbody_so_approvedby');
	    //var employeeFirstName = nlapiLookupField('employee', employeeId, 'firstname');
    
	    //3/20/2015 - Check for sales team on the sales order
	    var salesTeamCount = salesOrder.getLineItemCount('salesteam');
	    if (salesTeamCount <= 0) 
	    {
	    	nlapiLogExecution('error','No Sales Team on Sales Order #'+salesOrder.getFieldValue('tranid'),'No Sales Team defined');
	    	throw nlapiCreateError('SOAPPR-ERR','No Sales Team on Sales Order #'+salesOrder.getFieldValue('tranid'), false);
	    }
	    else 
	    {
	    	//If there are salesTeam set, make sure there is Primary set
	    	var hasPrimarySalesRep = false;
	    	for (var pr=1; pr <= salesTeamCount; pr++) 
	    	{
	    		if (salesOrder.getLineItemValue('salesteam', 'isprimary', pr)=='T') 
	    		{
	    			hasPrimarySalesRep = true;
	    			break;
	    		}
	    	}
	    	
	    	if (!hasPrimarySalesRep) 
	    	{
	    		//Throw error indicating there is NO Primary Sales Rep defined
	    		nlapiLogExecution('error','No Primary Sales Rep on Sales Order #'+salesOrder.getFieldValue('tranid'),'No Primary Sales Rep defined');
		    	throw nlapiCreateError('SOAPPR-ERR','No Primary Sales Rep on Sales Order #'+salesOrder.getFieldValue('tranid'), false);
	    	}
	    }
	    
	    //10/17/2014 - Review list of items on the SO and kick it out of THIS queue if it contains inactive items.
	    var aritem = [],
	    	arcourses = [];
	    
	    //look up item inactivity
	    for (var t=1; t <= salesOrder.getLineItemCount('item'); t++) 
	    {
	    	if (aritem.indexOf(salesOrder.getLineItemValue('item','item',t)) < 0) 
	    	{
	    		aritem.push(salesOrder.getLineItemValue('item','item',t));
	    	}
	    	
	    	//Sept. 23 2015 - add unique courses
	    	nlapiLogExecution('debug','line '+t+' course',salesOrder.getLineItemValue('item','custcol_bo_course',t));
	    	if (salesOrder.getLineItemValue('item','custcol_bo_course',t) && 
	    		arcourses.indexOf(salesOrder.getLineItemValue('item','custcol_bo_course',t)) < 0) 
	    	{
	    		arcourses.push(salesOrder.getLineItemValue('item','custcol_bo_course',t));
	    	}
	    }
	    //alert(aritem);
	    var iiflt = [new nlobjSearchFilter('internalid', null, 'anyof', aritem)];
	    var iicol = [new nlobjSearchColumn('internalid'),
	                 new nlobjSearchColumn('itemid'),
	                 new nlobjSearchColumn('isinactive'),
	                 //14/2/2015 - Add in Search for JobType on item record
	                 new nlobjSearchColumn('custitem_itm_bookingtype')];
	    var iirs = nlapiSearchRecord('item', null, iiflt, iicol);
	    
	    //7/2/2015 - Instead of breaking, Go through and Identify all Lines with Inactive items and THROW error to terminate the script
	    for (var ii=0; iirs && ii < iirs.length; ii++) 
	    {
	    	//Add in JobType if set
	    	if (iirs[ii].getValue('custitem_itm_bookingtype')) 
	    	{
	    		jobtypeByItem[iirs[ii].getValue('internalid')] = iirs[ii].getValue('custitem_itm_bookingtype');
	    	}
	    	
	    	if (iirs[ii].getValue('isinactive') == 'T') 
	    	{
	    		hasError = true;
	    		msgError += iirs[ii].getValue('itemid')+' ('+iirs[ii].getValue('internalid')+') Is INACTIVE<br/>';
	    	}
	    }
	    
	    if (hasError) 
	    {
	    	//THROW Error to Terminate the Script
	    	nlapiLogExecution('error','Contains Inactive Items', msgError);
	    	throw nlapiCreateError('SOAPPR-ERR','Contains Inactive Items on the Line',false);
	    }
    
	    //Sept. 23 2015 - Add in Inactive Course Check
	    //NEED to add in Course check
	    //Sept. 25 2015 - Check for courses being set on the line.
	    nlapiLogExecution('debug','courses',arcourses.length);
	    if (arcourses.length > 0)
	    {
	    	var crFlt = [new nlobjSearchFilter('internalid', null, 'anyof', arcourses)],
	    	crCol = [new nlobjSearchColumn('internalid'),
	    	         new nlobjSearchColumn('isinactive'),
	    	         new nlobjSearchColumn('name')],
			crrs = nlapiSearchRecord('customrecord_course', null, crFlt, crCol);
		
			for (var c=0; crrs && c < crrs.length; c+=1)
			{
				if (crrs[c].getValue('isinactive') == 'T') 
		    	{
		    		hasError = true;
		    		msgError += crrs[c].getValue('name')+' ('+crrs[c].getValue('internalid')+') Is INACTIVE<br/>';
		    	}
			}
	    }
	    
	    
		//If it has inactive reset flags and turn it back to user
	    if (hasError) 
	    {
	    	//THROW Error to Terminate the Script
	    	nlapiLogExecution('error','Contains Inactive Courses', msgError);
	    	throw nlapiCreateError('SOAPPR-ERR','Contains Inactive Courses on the Line',false);
	    }
		
	    //----------------------- 7/2/2015 - Modified Version to go through and Each line instead of calling on the Function
	    //go through each line and process the in try/catch block.
	    
	    //Sept. 23 2015 - If value is passed for rescheduleLineNumber, 
	    //	use rescheduleLineNumber+1 as value of K
	    var k = 1;
	    if (rescheduleLineNumber && !isNaN(rescheduleLineNumber))
	    {
	    	k = parseInt(rescheduleLineNumber) + 1;
	    	
	    	//Set the value of created Booking Log to state continuation
	    	createdBookingLog += '<span style="color: blue">Continue Processing starting from SO Line '+k+'</span><br/>';
	    	
	    	//Sept. 23 2015 - If it was rescheduled and previous iteration has error, 
		    //	set hasError = true;
	    	if (previousHasErrors)
	    	{
	    		hasError = true;
	    		msgError += 'Previous iteration up to Line '+rescheduleLineNumber+' had Errors<br/>';
	    	}
	    }
	    
		for (k; k <= salesOrder.getLineItemCount('item'); k++) 
		{
			
			//check to see if line item is JOB creation item
			var isJob = (salesOrder.getLineItemValue('item', 'custcol_job_isjob', k) == 'T');
			nlapiLogExecution('DEBUG', 'Var', 'Line '+k+' isJob=' + isJob);
	    
			//check to see if LINE is already processed
			var hasJob = (salesOrder.getLineItemValue('item', 'job', k))?true:false;
			nlapiLogExecution('DEBUG', 'Var', 'Line '+k+' hasJob=' + hasJob);
	    
			nlapiLogExecution('debug','has Job is true: Line '+k,'Job ID: '+salesOrder.getLineItemValue('item', 'job', k));
			
			try {
				// Is this item a job?
				if (isJob) {
		    
					// Has a job already been assigned to it?
					if (hasJob) {
						
						// Is it provisional?
						var jobId = salesOrder.getLineItemValue('item', 'job', k);
						
						//Sept. 23 2015 - Add to soLineBookingId 
						soLineBookingId[k] = jobId;
						
						var isProvisional = nlapiLookupField('job', jobId, 'custentity_bo_isprovisional');
						
						nlapiLogExecution('DEBUG', 'isProvisional  ', isProvisional );
						
						//If provisional, update booking record with to NOT be provisional and status of Pending Zone
						if (isProvisional == 'T') {
							nlapiSubmitField('job', jobId, ['custentity_bo_isprovisional', 'entitystatus'], ['F', SWEET_JOB_STATUS_PENDING_ZONE]);
						}
						nlapiLogExecution('debug','skipping','line '+k);
						
						//Add on to createdBookingLog 
						createdBookingLog += '<span style="color: blue">Line '+k+' Booking ID EXISTS - SKIPPING: '+salesOrder.getLineItemText('item', 'job', k)+' (Internal ID: '+jobId+')</span><br/>';
						
						continue; // Skip
					}
		      
					//Does NOT have Booking Created, Create one
					//------------------------------------------------------------------------------------------------------------------------
					//nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_lib_createJobFromItem');
					//nlapiLogExecution('DEBUG', 'Var', 'salesOrderId=' + salesOrder.getId());
					///nlapiLogExecution('DEBUG', 'Var', 'lineNumber=' + k);
				  
					var itemId = salesOrder.getLineItemValue('item', 'item', k);
					//nlapiLogExecution('DEBUG', 'Var', 'itemId=' + itemId);
				  
					var lineId = salesOrder.getLineItemValue('item', 'custcol_lineid', k);
					//nlapiLogExecution('DEBUG', 'Var', 'itemLineId=', lineId);

					// Create new job
					//Ticket 3765 - Request to  record in 85 Development Form IF Sales Order Line Type is Design
					//6/13/2015 - Additional Detail Provided by DA
					/**
					1. If type = design or development THEN show development form

					2.
					If type = project THEN show project form

					3.
					If type = product THEN show product form

					4.
					If type = Parent Gym THEN show Parent Gym form

					5.
					Otherwise show booking form
					*/
					var bookingFormToUse = '124'; //Default Booking Form 
					var jobType = salesOrder.getLineItemValue('item', 'custcol_col_jobtype', k);
					//based on jobType, change the form.
					if (jobType == '20' || jobType=='16')
					{
						//JobType is Design (20) or Development (16)
						bookingFormToUse = '85'; //Development Form
					}
					else if (jobType == '15')
					{
						//JobType is Project (15)
						bookingFormToUse = '87'; //Project Form
					}
					else if (jobType == '18')
					{
						//JobType is Product (18)
						//TODO: Need to update once confirmed
						bookingFormToUse = '133'; //Product Form. 
					}
					else if (jobType == '14')
					{
						//JobType is Parent Gym
						bookingFormToUse = '125'; //Parent Gym - Booking
					}
					
					//Use initialization method to set customform
					var job = nlapiCreateRecord('job', {customform:bookingFormToUse});
					//job.setFieldValue('customform', bookingFormToUse);
					job.setFieldValue('entitystatus', SWEET_JOB_STATUS_PENDING_ZONE);
				  
					// Set fields
					job.setFieldValue('parent', salesOrder.getFieldValue('entity')); // Client
					job.setFieldValue('custentity_bo_item', itemId); // Item
					
					//14/2/2015 - Set Job Type field from Item
					if (jobtypeByItem[itemId]) {
						nlapiLogExecution('debug','Setting Job Type from item', itemId + ' // Job Type: '+jobtypeByItem[itemId]);
						job.setFieldValue('jobtype',jobtypeByItem[itemId]);
					}
					
					job.setFieldValue('companyname', ' '); // BUGFIX: Avoid To Be Generated
					job.setFieldValue('custentity_bo_buyer', salesOrder.getFieldValue('custbody_buyer')); // Buyer
					job.setFieldValue('custentity_bo_course', salesOrder.getLineItemValue('item', 'custcol_bo_course', k)); // Course
					job.setFieldValue('enddate', salesOrder.getLineItemValue('item', 'custcol_bo_date', k)); // Date
					job.setFieldValue('custentity_bo_eventaddress1', salesOrder.getLineItemValue('item', 'custcol_bo_address1', k)); // Address 1
					job.setFieldValue('custentity_bo_eventaddress2', salesOrder.getLineItemValue('item', 'custcol_bo_address2', k)); // Address 2
					job.setFieldValue('custentity_bo_eventpostcode', salesOrder.getLineItemValue('item', 'custcol_bo_postcode', k)); // Postcode
					job.setFieldValue('custentity_bo_eventcity', salesOrder.getLineItemValue('item', 'custcol_bo_city', k)); // City
					job.setFieldValue('custentity_bo_approxtime', salesOrder.getLineItemValue('item', 'custcol_bo_approxtime', k)); // Approx. Time
					job.setFieldValue('custentity_bo_owner', salesOrder.getFieldValue('custbody_owner')); // Owner
					job.setFieldValue('custentity_bo_licensecontract', salesOrder.getFieldValue('custbody_so_licensingcontract')); // License contract
					
					//Ticket 3849 - Request to pull additional body fields from Sales Order
					//Client Service Partnership
					job.setFieldValue('custentity_clientservicespartnership', salesOrder.getFieldValue('custbody_clientservicespartnership'));
					
					//Training Programme
					job.setFieldValue('custentity_bo_trainingprogramme', salesOrder.getFieldValue('custbody_so_trainingprogramme'));
					
					//4/26/2016 - Set Booking Set on Booking Record IF both training program and parent is set
					if (salesOrder.getFieldValue('custbody_so_trainingprogramme') && 
						salesOrder.getFieldValue('custbody_ax_bookingset'))
					{
						job.setFieldValue('custentity_ax_bookingset', salesOrder.getFieldValue('custbody_ax_bookingset'))
					}
					
					//Solution Set
					job.setFieldValue('custentity_bo_trainingsolution', salesOrder.getFieldValue('custbody_op_solutionset'));
					
					// Country
					var country = salesOrder.getLineItemValue('item', 'custcol_bo_country', k);
					var countryCode = nlapiLookupField('customrecord_country', country, 'custrecord_country_code');
					job.setFieldValue('custentity_bo_eventcountry', country);
					job.setFieldValue('billcountry', countryCode);
					job.setFieldValue('shipcountry', countryCode);
					job.setFieldValue('shipping_country', countryCode);
				  
					// State (US specific)
					if (country == SWEET_COUNTRY_UNITED_STATES) {
						var state = salesOrder.getLineItemValue('item', 'custcol_bo_state', k);
						var stateCode = nlapiLookupField('customrecord_state', state, 'custrecord_state_code');
						job.setFieldValue('custentity_bo_eventstate', state);
						job.setFieldValue('billstate', stateCode);
						job.setFieldValue('shipstate', stateCode);
					}
				  
					// Time
					var time = salesOrder.getLineItemValue('item', 'custcol_bo_time', k);
					if (time) {
						job.setFieldValue('custentity_bo_eventtime', time);
					}
				  
					// Time Zone
					if (country) {
						var timeZones = getTimeZonesByCountryId(country);
						// If single choice, select this by default
						if (timeZones.length == 1) {
							job.setFieldValue('custentity_bo_eventtimezone', timeZones[0].id);
						}
					}
				  
					// Subsidiary
					var subsidiary = nlapiLookupField('customer', salesOrder.getFieldValue('entity'), 'subsidiary');
					subsidiary = sweet_so_lib_validate_isEmpty(subsidiary) ? SWEET_SUBSIDIARY_THEMINDGYM_UK : subsidiary;
					job.setFieldValue('subsidiary', subsidiary);
				  
					//9/10/2014 - Prior to Saving the record, FIRE to set the ID correctly
					var bookingIdToUse = '';
					try 
					{
						var clientAccountEntityId = nlapiLookupField('customer', salesOrder.getFieldValue('entity'), 'entityid', false)+'-J';
						nlapiLogExecution('debug','clientAccountEntityId', clientAccountEntityId+' // Current Booking Endity ID: '+job.getFieldValue('entityid'));
						
						var bkflt = [new nlobjSearchFilter('customer', null, 'anyof', salesOrder.getFieldValue('entity')),
							         //Assume client entity ID value is set ONLY return those booking with ID that contains [Client Entity ID]-J
							         new nlobjSearchFilter('entityid', null, 'startswith', clientAccountEntityId)];
							
						//Try grabbing Max Number
						var formulaCol = new nlobjSearchColumn('formulanumeric', null, 'max');
						formulaCol.setFormula("TO_NUMBER(REPLACE(REPLACE({entityid}, '"+clientAccountEntityId+"'),''''))");
							
						var bkcol = [formulaCol];
							
						//Saved search will grab any booking record that starts with (instead of contains) with format.
						//	- Replace the first string value as well as single quote and convert the value to Number
						//	- Search will then grab maximum amount.
						var bkrs = nlapiSearchRecord('job', null, bkflt, bkcol);
							
						//Build new Booking Entity ID. Booking ID should be generated based on following Format: [Client Entity ID]-J[NUMBER].
						//New booking id should be [NUMBER] + 1.  IF THere are NOT booking matching above format, new booking ID is [Client Entity ID]-J1
						var latestValue = bkrs[0].getValue(formulaCol);
							
						if (!latestValue) 
						{
							bookingIdToUse = clientAccountEntityId+'1';
						} 
						else 
						{
							//TEST for Number
							if (!isNaN(latestValue)) 
							{
								//Increment the number by 1 and create new bookingId
								bookingIdToUse = clientAccountEntityId+(parseInt(latestValue)+1);
							}
						}
					} 
					catch (generr) 
					{
						
						if (generr instanceof nlobjError) 
						{
							nlapiLogExecution('error','Error Booking ID line '+k, 'Exception: '+generr.getCode() + '\n' + generr.getDetails());
						} 
						else 
						{
							nlapiLogExecution('error','Error Booking ID line '+k, 'Exception: '+generr.toString());
						}
						
					}
				  
					nlapiLogExecution('debug','SO LIB Booking ID To Use', bookingIdToUse);
					// Save record
					var jobId = nlapiSubmitRecord(job,true,true);
				    
					//Sept. 23 2015 - Add to soLineBookingId 
					soLineBookingId[k] = jobId;
					
					nlapiLogExecution('debug','jobId',jobId);
					//See if we can update after submit. Before Submit on this code doesn't seem to work
					if (bookingIdToUse) 
					{
						nlapiSubmitField('job', jobId, 'entityid', bookingIdToUse, true);
						nlapiLogExecution('debug','Update Entity ID to '+bookingIdToUse,'Update Entity for Booking Internal ID '+jobId);
					}
				  
					//update current line with job id
					salesOrder.setLineItemValue('item', 'job', k, jobId);
					//THIS initializes the Face To Face Booking Workflow
					//Sep 30 2015
					//Remove initiation process since Larry's new workflow must grab them
					//nlapiInitiateWorkflow('job', jobId , 'customworkflow_facetoface_booking');
					nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_lib_createJobFromItem');
					
					//Set the process Job ID
					createdBookingLog += '<span style="color: green">Line '+k+' Booking ID Created: '+bookingIdToUse+' (Internal ID: '+jobId+')</span><br/>';
					
					//------------------------------------------------------------------------------------------------------------------------
					
				}
			} 
			catch (procjobline) 
			{
				hasError = true;
				nlapiLogExecution('error','Error Occured for line '+k, procjobline.getCode()+' // '+procjobline.getDetails());
				if (procjobline instanceof nlobjError) 
				{
					msgError += '<br/>Line '+k+' Failed Due to '+procjobline.getCode()+'. Detail: '+procjobline.getDetails()+'. ';
					if (procjobline.getCode() && procjobline.getCode().indexOf('INVALID_KEY_OR_REF') != -1) 
					{
						
						//Do rough estimated result based on KNOWN field
						if (procjobline.getDetails().indexOf('custentity_bo_course') > -1) 
						{
							msgError += 'One of your transaction lines has an Inactive Course';
						} 
						else if (procjobline.getDetails().indexOf('custentity_bo_owner') > -1) 
						{
							msgError += 'Your sales order is assigned to an owner who Maybe Inactive OR is not part of the Client Services Team and therefore an error occurring';
						} 
						else if (procjobline.getDetails().indexOf('custentity_bo_item') > -1) 
						{
							msgError += 'One of your transaction lines has an Inactive Item.';
						}
						else if (procjobline.getDetails().indexOf('custentity_bo_country') > -1) 
						{
							msgError += 'One of your transaction address lines is set to an Incorrect or Inactive Country';
						}
						else if (procjobline.getDetails().indexOf('custentity_bo_state') > -1) 
						{
							msgError += 'One of your transaction address lines is set to an Incorrect or Inactive State or a State is Missing';
						}
						else 
						{
							msgError += 'Field ID shown above is referencing value that is Inactive or No longer available.';
						}
					}
				} 
				else 
				{
					msgError += '<br/>Line '+k+' Failed Due to '+procjobline.toString();
				}
				msgError = '<span style="color: red">'+msgError+'</span>';
			}
			
			//Sept. 23 2015 - Adding in Reschedule Logic 
			//This one is slightly different. It checks to see if it needs to reschedule and simply SETS the flags
			//	needToReschedule = true and rescheduleLineNumber = k (current line)
			//  and BREAK out of this loop.
			//We still need to have it go through and save the sales order properly up to this point before rescheduling for 
			//next execution.
			//When checking for reschedlue: make sure there are more lines to process 
			//AND
			//There are atleast 400 gov units left 
			if (k < salesOrder.getLineItemCount('item') && nlapiGetContext().getRemainingUsage() <= 400)
			{
				needToReschedule = true;
				rescheduleLineNumber = k;
				
				nlapiLogExecution(
					'audit',
					'Tagged for Rescheduling after processing Line '+k,
					'Remaining Usage: '+nlapiGetContext().getRemainingUsage()
				);
				
				break;
			}
		}
		//--------------------------------------------------------------------------------------------------------------------------
	} 
	catch (e) 
	{
		var errmsg = '';
		if (e instanceof nlobjError) 
		{
			errmsg = 'Exception: '+e.getCode() + '// ' + e.getDetails();
		} 
		else 
		{
			errmsg = 'Exception: '+e.toString();
		}
		
		nlapiLogExecution('error','Exception',errmsg+' // '+msgError);
		
		hasError = true;
		msgError = '<span style="color: red">'+errmsg+'<br/><br/>'+msgError+'</span>';
	}
  
	// Save sales order
	try {
		nlapiLogExecution('debug','has error', hasError);
		nlapiLogExecution('debug','createdBookingLog',createdBookingLog+' ERROR: '+msgError);
	    // Reset flags
		//Sept. 23 2015 - Reset logic change.
		//ONLY Reset The record IF it does NOT have Errors
		//	AND
		//DOES NOT need to reschedule
		if (!hasError && !needToReschedule) 
		{
			salesOrder.setFieldValue('custbody_locked','F');
			salesOrder.setFieldValue('custbody_so_approvalinprogress','F');
			salesOrder.setFieldValue('custbody_show_message','F');
			salesOrder.setFieldValue('custbody_ax_soapprerr','');
			nlapiLogExecution('debug','Unlocking Sales Order','No errors');
		} 
		else 
		{
			//check to see if something was created.
			if (createdBookingLog.length == 0) 
			{
				msgError = '<span style="color: red">NO Bookings were created due to errors. </span>'+msgError;
			} 
			else if (!hasError && needToReschedule) 
			{
				msgError = '<span style="color: red">'+
						   'One/More Bookings were created but due to large number of lines, '+
						   'script has been rescheduled at line '+rescheduleLineNumber+
						   '</span><br/>'+
						   createdBookingLog+
						   msgError;
			}
			else if (hasError && needToReschedule)
			{
				
				msgError = '<span style="color: red">'+
						   'One/More Bookings were created while others FAILED due to Errors. In addition, due to large number of lines, '+
						   'script has been rescheduled at line '+rescheduleLineNumber+
						   '</span><br/>'+
						   createdBookingLog+
						   msgError;
			}
			else
			{
				msgError = '<span style="color: red">One/More Bookings were created but Failed to be saved</span><br/>'+
						   createdBookingLog+
						   msgError;
			}
			
			//Sept. 23 2015 - If this was Rescheduled, grab previous value on the SO record and append it
			if (rescheduleLineNumber)
			{
				msgError = salesOrder.getFieldValue('custbody_ax_soapprerr')+
						   '<br/>'+
						   msgError;
			}
			
			salesOrder.setFieldValue('custbody_ax_soapprerr',msgError);
		}

		//nlapiLogExecution('audit','About to Save SO ID: '+salesOrder.getId(),'About to save SO #'+salesOrder.getFieldValue('tranid'));
		nlapiSubmitRecord(salesOrder, false, true);
		
		//Sept. 23 2015 - Send Out notice ONLY if it doesn't need to be rescheduled
		if (!needToReschedule)
		{
			//nlapiLogExecution('audit','Finished Save SO ID: '+salesOrder.getId(),'Finished save SO #'+salesOrder.getFieldValue('tranid'));
			// Send email notification
		    subject = 'Sales Order #' + salesOrder.getFieldValue('tranid') + ' is Approved';
		    //body = employeeFirstName + ', \n\n';
		    if (!hasError) {
		    	body = 'Good news. The sales order (' + salesOrder.getFieldValue('tranid') + ') that you approved is now ready.\n\n';
		    } else {
		    	
		    	//Ticket #10608 - Modify the subject and message 
		    	subject = 'Sales order approval failed';
		    	
		    	var soUrl = 'https://system.netsuite.com'+
		    				nlapiResolveURL('RECORD', 'salesorder', salesOrder.getId(), 'VIEW');
		    	body = 'We\'re sorry but we encountered some issues while processing the '+
		    		   'sales order ('+ salesOrder.getFieldValue('tranid') +') that you approved. '+
		    		   'It is still in Locked State. If you click the '+
		    		   '<a href="'+soUrl+'" target="_blank">link to the sales order here</a> you will '+
		    		   'receive a helpful error message which describes how to unlock the sales order '+
		    		   'and have it process correctly \n\n';
		    }
		    
		    nlapiSendEmail(employeeId, employeeId, subject, body, null, null, null, null, true);
		    
		    nlapiLogExecution('audit','Email Sent SO ID: '+salesOrder.getId(),'Email Sent SO #'+salesOrder.getFieldValue('tranid'));
		    
			//Trigger Rev Rec ONLY when success
			/**
			 * Sept. 23 2015 - Removed.
			 * This Function defined on sweet_so_revrec.js; depends on custbody_so_linkedinvoice//Linked Invoice field value defiend on the Sales Order 
			 * IF not set, function simply returns.
			 * This field as of current date is NOT shown on ANY Transaction record.
			 * AND
			 * Last time this field value was set was back in Jan 19 2015 on SO63438
			 * The function is doing modification against Rev. Rec. Record associated with the Invoice. 
			 * Until instructed by Client (David A. COO) This is commented it out.
		    if (!hasError) {
				// Update recevenue recognition
			    sweet_so_revrec_fillSchedule(salesOrderId);
			}
			*/
		}
		
		
	} 
	catch (savesoerr) 
	{
		
		if (savesoerr instanceof nlobjError) {
			if (savesoerr.getCode() && savesoerr.getCode().indexOf('RCRD_HAS_BEEN_CHANGED') != -1) {
				/**
				subject = 'Error occurred while Saving Sales Order #' + salesOrder.getFieldValue('tranid');
			    body = 'Exception code: RCRD_HAS_BEEN_CHANGED' + ' \n\n';
			    body += 'Error Message: \n'+msgError+'\n\n';
			    body += 'Created Booking Log: \n'+createdBookingLog;
			    var recipients = 'helpdesk@themindgym.com';
			    //nlapiSendEmail(employeeId, recipients, subject, body);
				*/
			    nlapiLogExecution('audit','Record was changed, calling recovery','Recover called');
			    
			    recoverFromException(salesOrder);
			} else {
				//createdBookingLog
				//Update the SO soapprerr and throw termination error
				try {
					nlapiSubmitField('salesorder', salesOrder.getId(), 
							'custbody_ax_soapprerr', '<span style="color: red">One/More Bookings were created but Failed to be saved</span><br/>'+createdBookingLog+'<br/><br/>'+savesoerr.getDetails(), false);
				} catch (criticalerr) {
					var criticalErrMsg = 'Critical Error occured while processing SO #'+salesOrder.getValue('tranid')+' With Creation Process log of: '+createdBookingLog+' // '+criticalerr.getDetails();
					//Sept 23 2015 - Add in So Line to Booking ID Map
					throw nlapiCreateError(
						'SOAPPR_CRITICAL', 
						criticalErrMsg+' // '+JSON.stringify(soLineBookingId), 
						false
					);
				}
			}
			
		} else {
			nlapiLogExecution('error','Exception Saving: ',savesoerr.toString());
			throw nlapiCreateError(
				'SOAPPR_CRITICAL', 
				'Unexpected JavaScript error while processing SO #'+salesOrder.getValue('tranid')+' With Creation Process log of: '+
				createdBookingLog+
				' // '+
				savesoerr.toString()+
				' // '+
				JSON.stringify(soLineBookingId), false
			);
		}
	}
	//nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_approve_scheduled');
	
	//---------------------- Trigger reschedule Here if it needs to -----------------------------------------
	if (needToReschedule)
	{
		var rparam = {
			'custscript_salesorder':context.getSetting('SCRIPT', 'custscript_salesorder'),
			'custscript_sct98_lastprocline':rescheduleLineNumber,
			'custscript_sct98_prevrunhaserrors':(previousHasErrors?'T':'F')
		};
		
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), rparam);
		
		nlapiLogExecution(
			'audit',
			'Rescheduled after processing Line '+rescheduleLineNumber,
			'Queue Status: '+status+
			' // Remaining Usage: '+nlapiGetContext().getRemainingUsage()
		);
	}
}

/**
 * Sept 23 2015 Modification added to support rescheduling logic
 * @param salesOrderToRecover
 */
function recoverFromException(salesOrderToRecover)
{
    var context = nlapiGetContext();

    var salesOrderId = context.getSetting('SCRIPT', 'custscript_salesorder');

    var salesOrder = nlapiLoadRecord('salesorder', salesOrderId );
    nlapiLogExecution('DEBUG', 'Recover', 'Recovering SO ' + salesOrderId );

    if(salesOrder) {

        nlapiLogExecution('DEBUG', 'Recover', 'Recovering SO : Loaded...');

        var i = 1, n = salesOrder.getLineItemCount('item') + 1;
        nlapiLogExecution('DEBUG', 'Recover', 'Number of items=' + (n - 1));
  
        for (i; i < n; i++) 
        {
            var isJob = (salesOrder.getLineItemValue('item', 'custcol_job_isjob', i) == 'T');
            nlapiLogExecution('DEBUG', 'Recover', 'isJob=' + isJob);
    
            var hasJob = (salesOrder.getLineItemValue('item', 'job', i) != null);
            nlapiLogExecution('DEBUG', 'Recover', 'hasJob=' + hasJob);
            var currentJobId = salesOrder.getLineItemValue('item', 'job', i);
            nlapiLogExecution('DEBUG', 'Recover', 'Current JobId=' + currentJobId);
    
            // Is this item a job?
            if (isJob) {
                jobId = salesOrderToRecover.getLineItemValue('item', 'job', i);
                
                //Sept. 23 2015 - If not set on the line check against soLineBookingId JSON object to see if it was set during execution
                if (!jobId)
                {
                	if (soLineBookingId[i])
                	{
                		jobId = soLineBookingId[i];
                		nlapiLogExecution('debug','Recover','Line '+i+' had no Job set. Looking in soLineBookingId object: '+soLineBookingId[i]);
                	}
                	
                }
                
                if (jobId)
                {
                	salesOrder.setLineItemValue('item', 'job', i, jobId);
                    nlapiLogExecution('DEBUG', 'Recover', 'Updating Job ID=' + jobId);
                }
                
             }
        }
        
        
        
        if (!hasError && !needToReschedule)
        {
        	salesOrder.setFieldValue('custbody_locked','F');
    		salesOrder.setFieldValue('custbody_so_approvalinprogress','F');
    		salesOrder.setFieldValue('custbody_show_message','F');
    		salesOrder.setFieldValue('custbody_ax_soapprerr','');
        } 
        else
        {
        	//Sept. 23 2015 - If this was Rescheduled, grab previous value on the SO record and append it
			if (rescheduleLineNumber)
			{
				msgError = (salesOrder.getFieldValue('custbody_ax_soapprerr')?salesOrder.getFieldValue('custbody_ax_soapprerr'):'')+
						   '\n'+
						   msgError;
			}
        	salesOrder.setFieldValue('custbody_ax_soapprerr',msgError);
        }
        
        // Save sales order
        nlapiSubmitRecord(salesOrder, false, true);
        // Send email notification

        if (!needToReschedule)
		{
	        subject = 'Sales Order #' + salesOrder.getFieldValue('tranid') + ' is Approved';
		    //body = employeeFirstName + ', \n\n';
		    if (!hasError) {
		    	body = 'Good news. The sales order (' + salesOrder.getFieldValue('tranid') + ') that you approved is now ready.\n\n';
		    } else {
		    	//Ticket #10608 - Modify the subject and message 
		    	subject = 'Sales order approval failed';
		    	
		    	var soUrl = 'https://system.netsuite.com'+
		    				nlapiResolveURL('RECORD', 'salesorder', salesOrder.getId(), 'VIEW');
		    	body = 'We\'re sorry but we encountered some issues while processing the '+
		    		   'sales order ('+ salesOrder.getFieldValue('tranid') +') that you approved. '+
		    		   'It is still in Locked State. If you click the '+
		    		   '<a href="'+soUrl+'" target="_blank">link to the sales order here</a> you will '+
		    		   'receive a helpful error message which describes how to unlock the sales order '+
		    		   'and have it process correctly \n\n';
		    	
		    	
		    }
		    var employeeId = salesOrder.getFieldValue('custbody_so_approvedby');
		    nlapiSendEmail(employeeId, employeeId, subject, body, null, null, null, null, true);
	        
		    /**
			 * Sept. 23 2015 - Removed.
			 * This Function defined on sweet_so_revrec.js; depends on custbody_so_linkedinvoice//Linked Invoice field value defiend on the Sales Order 
			 * IF not set, function simply returns.
			 * This field as of current date is NOT shown on ANY Transaction record.
			 * AND
			 * Last time this field value was set was back in Jan 19 2015 on SO63438
			 * The function is doing modification against Rev. Rec. Record associated with the Invoice. 
			 * Until instructed by Client (David A. COO) This is commented it out.
	        // Update recevenue recognition
	        //sweet_so_revrec_fillSchedule(salesOrderId);
	        */
		}
   }

}