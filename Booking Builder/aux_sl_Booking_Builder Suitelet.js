/** 
 * Modified by joe.son@audaxium.com
 * Desc:
 * 
 * 
 * 
 * 
 */

var nsform = null;
function bookingBuilder(req, res){

	nsform = nlapiCreateForm('Booking Builder', true);
	nsform.setScript('customscript_aux_cs_job_build_helper');
		
	//add message display 
	var msgFld = nsform.addField('custpage_procmsg', 'textarea', '', null, null);
	msgFld.setLayoutType('outsideabove');
	msgFld.setDisplayType('inline');
	
	
	var clientCurrency = req.getParameter('currency')?req.getParameter('currency'):'',
		clientSubsidiary = req.getParameter('subsidiary')?req.getParameter('subsidiary'):'',
		subsidiaryCurrency = req.getParameter('subscurrency')?req.getParameter('subscurrency'):'',		
		custId = req.getParameter('clientid')?req.getParameter('clientid'):'',	
		
		userId = req.getParameter('user')?req.getParameter('user'):'',
		//bcoordntr = req.getParameter('custpage_coordinator')?req.getParameter('custpage_coordinator'):'',

		
		qty = req.getParameter('custpage_qty')?req.getParameter('custpage_qty'):'',
						
		itemSelect = req.getParameter('custpage_item')?req.getParameter('custpage_item'):'',	
		jbType = req.getParameter('custpage_jbtype')?req.getParameter('custpage_jbtype'):'',		
		
		courseSelect = req.getParameter('custpage_course')?req.getParameter('custpage_course'):'',
		progrmmeSelect = req.getParameterValues('custpage_programme')?req.getParameterValues('custpage_programme'):'',		
		solutnSelect = req.getParameter('custpage_solution')?req.getParameter('custpage_solution'):'',
		
		bookingSetSelect = req.getParameter('custpage_bookingset')?req.getParameter('custpage_bookingset'):'',		
	
		bdate = req.getParameter('custpage_date')?req.getParameter('custpage_date'):'',
		baptime = req.getParameter('custpage_time')?req.getParameter('custpage_time'):'',		
		bbuyer = req.getParameter('custpage_buyer')?req.getParameter('custpage_buyer'):'',
	
		bcontact = req.getParameter('custpage_sitecontacts')?req.getParameter('custpage_sitecontacts'):'',
		bcoach = req.getParameter('custpage_coach')?req.getParameter('custpage_coach'):'',		
		bstakes = req.getParameter('custpage_stakes')?req.getParameter('custpage_stakes'):'',
		bfeedbck = req.getParameter('custpage_feedback')?req.getParameter('custpage_feedback'):'',		
		bfeedbckreq = req.getParameter('custpage_feedbackreq')?req.getParameter('custpage_feedbackreq'):'',
		provsnl = req.getParameter('custpage_provisional')?req.getParameter('custpage_provisional'):'',	
		
		outsrcer = req.getParameter('custpage_outsourcer')?req.getParameter('custpage_outsourcer'):'',	

		tmezne = req.getParameter('custpage_timezone')?req.getParameter('custpage_timezone'):'',			

		baddrss1 = req.getParameter('custpage_addrss1')?req.getParameter('custpage_addrss1'):'',
		baddrss2 = req.getParameter('custpage_addrss2')?req.getParameter('custpage_addrss2'):'',
		bcity = req.getParameter('custpage_city')?req.getParameter('custpage_city'):'',
		bzip = req.getParameter('custpage_postal')?req.getParameter('custpage_postal'):'',
		bstate = req.getParameter('custpage_state')?req.getParameter('custpage_state'):'',
		bcountry = req.getParameter('custpage_country')?req.getParameter('custpage_country'):'',
		
		shipTo = req.getParameter('custpage_shipto')?req.getParameter('custpage_shipto'):'';	
				
		
	try 
	{
		nsform.addFieldGroup('nmber', ' Number of Bookings', null);	
				
		var qtyFld = nsform.addField('custpage_qty', 'integer', 'Bookings to Create',null, 'nmber');
		qtyFld.setMandatory(true);
		qtyFld.setLayoutType('startrow' , 'startcol' );
		qtyFld.setDisplaySize(20);
		qtyFld.setDefaultValue(qty);		
		if (req.getMethod()=='POST')
		{
			qtyFld.setDisplayType('hidden');
		}
		
		var helpFld = nsform.addField('custpage_itemhelp','inlinehtml','',null,'nmber');
		helpFld.setLayoutType('outsidebelow' , 'startcol' );
		helpFld.setDefaultValue(
			'<span style="font-size: 10px;">'+
			'* MAX number of Bookings = 10.<br/><br/>'+
			'</span>'
		);		
		if (req.getMethod()=='POST')
		{
			helpFld.setDisplayType('hidden');
		}
	
//add result grouping
		nsform.addFieldGroup('custpage_a', 'Booking Info');
		
//Look up subsidiary currency here
		if (!subsidiaryCurrency && clientSubsidiary)
		{
			subsidiaryCurrency = nlapiLookupField('subsidiary', clientSubsidiary, 'currency');
		}

		
		if (req.getMethod()=='GET')
		{
			nsform.addSubmitButton('Create List of Bookings');
		}
			
//Column A ---------------------
		
//Client Name
		var custNameFld = nsform.addField('clientid','select','Client Name', 'customer', 'custpage_a');	
		custNameFld.setDefaultValue(custId);
		custNameFld.setDisplayType('inline');
		custNameFld.setBreakType('startcol');		
		if (req.getMethod()=='POST')
		{
			custNameFld.setDisplayType('hidden');
		}
//User ID pulled from system
		var coordinator = nsform.addField('user', 'select', 'Co-Ordinator ', 'employee', 'custpage_a');
		coordinator.setDefaultValue(userId);
		coordinator.setDisplayType('inline');
		if (req.getMethod()=='POST')
		{
			coordinator.setDisplayType('hidden');
		}				
//Client Currency
		var cliCurFld = nsform.addField('currency','select','Client Currency','currency','custpage_a');
		cliCurFld.setDefaultValue(clientCurrency);
		cliCurFld.setDisplayType('disabled');
		if (req.getMethod()=='POST')
		{
			cliCurFld.setDisplayType('hidden');
		}
		
		var cliSubsFld = nsform.addField('subsidiary','select','Client Subsidiary','subsidiary','custpage_a');
		cliSubsFld.setDefaultValue(clientSubsidiary);
		cliSubsFld.setDisplayType('hidden');
		
		var cliSubsCurFld = nsform.addField('subscurrency','select','Subsidiary Currency','currency','custpage_a');
		cliSubsCurFld.setDefaultValue(subsidiaryCurrency);
		cliSubsCurFld.setDisplayType('disabled');
		if (req.getMethod()=='POST')
		{
			cliSubsCurFld.setDisplayType('hidden');
		}
		
					
		var itemList = nsform.addField('custpage_item', 'select', 'Item', 'item', 'custpage_a');
		itemList.setDefaultValue(itemSelect);
		itemList.setMandatory(true);		
		if (req.getMethod()=='POST')
		{
			itemList.setDisplayType('hidden');
		}

		var jobTypeList = nsform.addField('custpage_jbtype', 'select', 'Booking Type', 'jobtype', 'custpage_a');
		jobTypeList.setDefaultValue(itemSelect);
		jobTypeList.setMandatory(true);
		jobTypeList.setDisplayType('disabled');		
		if (req.getMethod()=='POST')
		{
			jobTypeList.setDisplayType('hidden');
		}

				
		var courseList = nsform.addField('custpage_course', 'select', 'Course', 'customrecord_course', 'custpage_a');
		courseList.setDefaultValue(courseSelect);
		if (req.getMethod()=='POST')
		{
			courseList.setDisplayType('hidden');
		}		
		
	
		var filters = [new nlobjSearchFilter('custrecord_tp_clientaccount', null, 'anyof', custId )];									   
		var columns = [new nlobjSearchColumn('internalid'),
					   new nlobjSearchColumn('name')];					   
		var tpRsts = nlapiSearchRecord('customrecord_trainingprogramme', null, filters, columns);	
		
		var progrmeList = nsform.addField('custpage_programme', 'select', 'Programme', '', 'custpage_a');
			progrmeList.addSelectOption('','',true);
		
		for (var t=0;tpRsts && t < tpRsts.length; t+=1)		
		{
			var id = tpRsts[t].getValue('internalid');	
			var displyname = tpRsts[t].getValue('name');
			progrmeList.addSelectOption(id, displyname, false); 
		}
		
		progrmeList.setDefaultValue(progrmmeSelect);	
				
		if (req.getMethod()=='POST')
		{
			progrmeList.setDisplayType('hidden');
		}		


		var bookingSet = nsform.addField('custpage_bookingset', 'select', 'Booking Set ', '', 'custpage_a');
		bookingSet.setDefaultValue(bookingSetSelect);
		if (req.getMethod()=='POST')
		{
			bookingSet.setDisplayType('hidden');
		}		
		
		
		
		var solutionSet = nsform.addField('custpage_solution', 'select', 'Solution Set ', 'customrecord_bookinggroupsolution', 'custpage_a');
		solutionSet.setDefaultValue(solutnSelect);
		if (req.getMethod()=='POST')
		{
			solutionSet.setDisplayType('hidden');
		}			

		
		var bookingDate = nsform.addField('custpage_date', 'date', 'Date', null,'custpage_a');
		bookingDate.setDisplaySize(25);
		bookingDate.setBreakType('startcol');
		bookingDate.setDefaultValue(bdate);
		bookingDate.setMandatory(true);	
		if (req.getMethod()=='POST')
		{
			bookingDate.setDisplayType('hidden');
		}		
		
		exactTime = nsform.addField('custpage_time', 'timeofday', 'Time', null, 'custpage_a'); 
		exactTime.setDefaultValue(baptime);
		if (req.getMethod()=='POST')
		{
			exactTime.setDisplayType('hidden');
		}	
		
		var timeZone = nsform.addField('custpage_timezone', 'select', 'Time Zone',  null, 'custpage_a');
		timeZone .addSelectOption('', '-Select Country First-', false); 
		timeZone.setDefaultValue(tmezne );
		if (req.getMethod()=='POST')
		{
			timeZone.setDisplayType('hidden');
		}		
					
						
		var buyerList = nsform.addField('custpage_buyer', 'select', 'Buyer ', 'contact', 'custpage_a');
		buyerList.setDefaultValue(bbuyer);
		buyerList.setMandatory(true);
		if (req.getMethod()=='POST')
		{
			buyerList.setDisplayType('hidden');
		}		


		var contactsList = nsform.addField('custpage_sitecontacts', 'text', 'Site Contacts ', null, 'custpage_a');
		contactsList.setDefaultValue(bcontact);
		if (req.getMethod()=='POST')
		{
			contactsList.setDisplayType('hidden');
		}
				
		var coachList = nsform.addField('custpage_coach', 'select', 'Coach ', 'vendor', 'custpage_a');
		coachList.setDefaultValue(bcoach);
		if (req.getMethod()=='POST')
		{
			coachList.setDisplayType('hidden');
		}		

		var stakesList = nsform.addField('custpage_stakes', 'select', 'High Stakes ', 'customlist_booking_high_stakes', 'custpage_a');
		stakesList.setDefaultValue(bstakes);
		if (req.getMethod()=='POST')
		{
			stakesList.setDisplayType('hidden');
		}		

		var feedbackList = nsform.addField('custpage_feedback', 'select', 'Feedback Requirments ', 'customlist346', 'custpage_a');
		feedbackList.setDefaultValue(bfeedbck);
	
		if (req.getMethod()=='POST')
		{
			feedbackList.setDisplayType('hidden');
		}		
	
		var requiredFeedback = nsform.addField('custpage_feedbackreq', 'checkbox', 'Is Feedback Required', null, 'custpage_a');
		requiredFeedback.setDefaultValue(bfeedbckreq);
		if (req.getMethod()=='POST')
		{
			requiredFeedback.setDisplayType('hidden');
		}		

	
		var isProvisional = nsform.addField('custpage_provisional', 'checkbox', 'Is Provisional', null, 'custpage_a');
		isProvisional.setDefaultValue('T');		
		isProvisional.setDisplayType('disabled');
		if (req.getMethod()=='POST')
		{
			isProvisional.setDisplayType('hidden');
		}		
				
		
		var webexOutsourcer = nsform.addField('custpage_outsourcer', 'checkbox', 'Requires TMG Channel (OUTSOURCER)', null, 'custpage_a');
		webexOutsourcer.setDefaultValue(outsrcer);	
		if (req.getMethod()=='POST')
		{
			webexOutsourcer.setDisplayType('hidden');
		}

		
				
		
		nsform.addFieldGroup('grpa', ' Address', null);	
		
		var cAddrss1 = nsform.addField('custpage_addrss1', 'text', 'Address1', null,'grpa');
		cAddrss1.setDisplaySize(25);
		cAddrss1.setDefaultValue(baddrss1);
		if (req.getMethod()=='POST')
		{
			cAddrss1.setDisplayType('hidden');
		}		
		
		var cAddrss2 = nsform.addField('custpage_addrss2', 'text', 'Address2', null,'grpa');
		cAddrss2.setDisplaySize(25);
		cAddrss2.setDefaultValue(baddrss2);
		if (req.getMethod()=='POST')
		{
			cAddrss2.setDisplayType('hidden');
		}


		var cCity = nsform.addField('custpage_city', 'text', 'City', null,'grpa');
		cCity.setDisplaySize(25);
		cCity.setDefaultValue(bcity);
		if (req.getMethod()=='POST')
		{
			cCity.setDisplayType('hidden');
		}
		
		var cPostal = nsform.addField('custpage_postal', 'text', 'Postal Code', null,'grpa');
		cPostal.setDisplaySize(25);
		cPostal.setDefaultValue(bzip);
		if (req.getMethod()=='POST')
		{
			cPostal.setDisplayType('hidden');
		}
		
		var cState = nsform.addField('custpage_state', 'select', 'State', null,'grpa');		
		cState.setDefaultValue(bstate);	
		cState.addSelectOption('', '-Select Country First-', false); 		
		if (req.getMethod()=='POST')
		{
			cState.setDisplayType('hidden');
		}
		
		
		var cCountry = nsform.addField('custpage_country', 'select', 'Country', 'customrecord_country','grpa');
		cCountry.setDefaultValue(bcountry);
		cCountry.setMandatory(true);
		if (req.getMethod()=='POST')
		{
			cCountry.setDisplayType('hidden');
		}
		


	
		var cShipTo = nsform.addField('custpage_shipto', 'select', 'Ship To', 'customrecord_ship_to', 'grpa');
		cShipTo.setDefaultValue(shipTo);
		if (req.getMethod()=='POST')
		{
			cShipTo.setDisplayType('hidden');
		}

		var steps = nsform.addField('custpage_step', 'text', 'Steps', null, 'grpa');
		steps.setDisplayType('hidden');
		steps.setDefaultValue('step1');
		if (req.getMethod()=='POST')
		{
			steps.setDisplayType('hidden');
		}		

//----------------------------------------------------------------------------------------------------------------------------------------	
		if (req.getMethod()=='POST')
		{
							
			if(req.getParameter('custpage_step') == 'step1')
			{
				nsform.addFieldGroup('custpage_view','Bookings to be created' );
				steps.setDefaultValue('step2');
				nsform.addSubmitButton('Create Bookings');	

				nsform.addButton('custpage_goback','Back to Create Bookings', 'backtoBookingBuild();');			
				nsform.addButton('custpage_closebtn', 'Cancel/Close', 'CancelClose();');
				
				var warngFld = nsform.addField('custpage_warning','inlinehtml','', null, 'custpage_view');
					warngFld.setLayoutType('outsidebelow' , 'startcol')
					warngFld.setDefaultValue(				
						'<span style=" color: red; font-size: 13px;">'+
						'* Depending on number Bookings created this process will freeze your window until creation is completed <br/>'+
						'</span>'
					);
									
				var jobList = nsform.addSubList('custpage_joblist','list','Bookings to Create');				
											
				var cliA = jobList.addField('job_client', 'select','Client', 'customer');	
				cliA.setDisplayType('hidden');		
				
				var sbsid = jobList.addField('job_subisdiiary', 'select','Subsidiary', 'subsidiary');				
				sbsid.setDisplayType('hidden');
				
				jobList.addField('job_item', 'select','Item', 'item');
				jobList.addField('job_jbtype', 'select','Booking Type', 'jobtype');				
				jobList.addField('job_course','select','Course', 'customrecord_course');
				jobList.addField('job_programme', 'select','Programme', 'customrecord_trainingprogramme');	
				jobList.addField('job_solution', 'select','Solution Set', 'customrecord_bookinggroupsolution');								
				jobList.addField('job_bookingset', 'select','Booking Set', 'customrecord_auxm_bookingset');					
				jobList.addField('job_date', 'date','Date',  null).setDisplayType('entry');			
				jobList.addField('job_time', 'timeofday',' Time', null).setDisplayType('entry');				
				jobList.addField('job_coordinator', 'select','Cordinator','employee');
				jobList.addField('job_buyer', 'select','Buyer','contact');			
				jobList.addField('job_siteconact', 'text','Site Contact', null).setDisplayType('entry');
				jobList.addField('job_coach', 'select','Coach','vendor');				
				jobList.addField('job_stakes', 'select','High Stakes','customlist_booking_high_stakes');
				jobList.addField('job_feedback', 'select','Feedback Requirements','customlist346');			
				jobList.addField('job_feedbackreq', 'checkbox','Is Feedback Required', null).setDisplayType('entry');		
				jobList.addField('job_provisional', 'checkbox','Is Provisional', null).setDisplayType('entry');		
				
				jobList.addField('job_outsourcer', 'checkbox','Requires TMG Channel(OUTSOURCER)', null).setDisplayType('entry');				
				
				jobList.addField('job_timezone', 'select','Time Zone', 'customrecord_timezone');
				
				jobList.addField('job_addrss1','text','Address1', null).setDisplayType('entry');
				jobList.addField('job_addrss2','text','Address2', null).setDisplayType('entry');				
				jobList.addField('job_city','text','City', null).setDisplayType('entry');
				jobList.addField('job_zip','text','Postal Code', null).setDisplayType('entry');	
				
			    jobList.addField('job_state','select','State','customrecord_state');				
				jobList.addField('job_country','select','Country','customrecord_country');
				
				jobList.addField('job_shipto','select','Ship To','customrecord_ship_to');	
	
				var newLine = 1;
				
											
				for (var j=0; j < qty; j+=1)
				{
										
					jobList.setLineItemValue('job_client', newLine, custId);
					jobList.setLineItemValue('job_subisdiiary', newLine, clientSubsidiary);
					
					
					jobList.setLineItemValue('job_item', newLine, itemSelect);
					jobList.setLineItemValue('job_jbtype', newLine, jbType);					
					jobList.setLineItemValue('job_course', newLine, courseSelect);
					jobList.setLineItemValue('job_programme', newLine, progrmmeSelect);
					jobList.setLineItemValue('job_solution', newLine, solutnSelect);					
					jobList.setLineItemValue('job_bookingset', newLine, bookingSetSelect);					
					jobList.setLineItemValue('job_date', newLine, bdate);
					jobList.setLineItemValue('job_time', newLine, baptime);
					jobList.setLineItemValue('job_coordinator', newLine, userId);
					jobList.setLineItemValue('job_buyer', newLine, bbuyer);
					jobList.setLineItemValue('job_siteconact', newLine, bcontact);
					jobList.setLineItemValue('job_coach', newLine, bcoach);
					jobList.setLineItemValue('job_stakes', newLine, bstakes);				
					jobList.setLineItemValue('job_feedback', newLine, bfeedbck);
					jobList.setLineItemValue('job_feedbackreq', newLine, bfeedbckreq);
					jobList.setLineItemValue('job_provisional', newLine, provsnl);
					
					jobList.setLineItemValue('job_outsourcer', newLine, outsrcer);					
					
					jobList.setLineItemValue('job_timezone', newLine, tmezne);													
					jobList.setLineItemValue('job_addrss1', newLine, baddrss1);
					jobList.setLineItemValue('job_addrss2', newLine, baddrss2);
					jobList.setLineItemValue('job_city', newLine, bcity);				
					jobList.setLineItemValue('job_zip', newLine, bzip);
					jobList.setLineItemValue('job_state', newLine, bstate);
					jobList.setLineItemValue('job_country', newLine, bcountry);
					
					jobList.setLineItemValue('job_shipto', newLine, shipTo);								
					newLine++;
					
					
				}

				
			}
			else
			{
				nsform.addFieldGroup('custpage_final','Bookings Created' );

				//bookingBuildAlert();
				nsform.addButton('custpage_goback','Back to Create Bookings', 'backtoBookingBuild();');
				nsform.addButton('custpage_closebtn', 'Cancel/Close', 'CancelClose();');
				

				var arBookings = [];				
				var linecnt = req.getLineItemCount('custpage_joblist');	
				
				//loop through and build array of bookings to push back to client script
				for (var i=1; i <= linecnt; i+=1)
				{
					var bookingObj = 
					{
						'clt':req.getLineItemValue('custpage_joblist','job_client', i),
						'subsid':req.getLineItemValue('custpage_joblist','job_subisdiiary', i),
						
						'itemid':req.getLineItemValue('custpage_joblist','job_item', i),
						'bkingtype':req.getLineItemValue('custpage_joblist','job_jbtype', i),						
						'courseid':req.getLineItemValue('custpage_joblist','job_course',i),
						'progrmme':req.getLineItemValue('custpage_joblist','job_programme', i),
						'solution':req.getLineItemValue('custpage_joblist','job_solution', i),

						'bkingset':req.getLineItemValue('custpage_joblist','job_bookingset', i),
						
						'date':req.getLineItemValue('custpage_joblist','job_date', i),
						'aptime':req.getLineItemValue('custpage_joblist','job_time', i),
						'coordinator':req.getLineItemValue('custpage_joblist','job_coordinator', i),
						'buyer':req.getLineItemValue('custpage_joblist','job_buyer', i),
						'sitecontact':req.getLineItemValue('custpage_joblist','job_siteconact', i),
						'coach':req.getLineItemValue('custpage_joblist','job_coach', i),		
						'stakes':req.getLineItemValue('custpage_joblist','job_stakes', i),			
						'feedback':req.getLineItemValue('custpage_joblist','job_feedback', i),
						'feedbackreq':req.getLineItemValue('custpage_joblist','job_feedbackreq', i),
						'provisional':req.getLineItemValue('custpage_joblist','job_provisional', i),
						
						'wbxoutsourcer':req.getLineItemValue('custpage_joblist','job_outsourcer', i),						
						
						'timezone':req.getLineItemValue('custpage_joblist','job_timezone', i),
						
						'addrss1':req.getLineItemValue('custpage_joblist','job_addrss1', i),
						'addrss2':req.getLineItemValue('custpage_joblist','job_addrss2', i),		
						'city':req.getLineItemValue('custpage_joblist','job_city', i),			
						'zip':req.getLineItemValue('custpage_joblist','job_zip', i),
						'state':req.getLineItemValue('custpage_joblist','job_state', i),			
						'cntry':req.getLineItemValue('custpage_joblist','job_country', i),	
						
						'shipto':req.getLineItemValue('custpage_joblist','job_shipto', i)


						

						
					};
					
					arBookings.push(bookingObj);
						
				}							
		
				
				var createdJobs = [];				
				for (var l=0; l < arBookings.length; l+=1) 
				{
					var custForm = '124';
					//Going to have to build logic based on job type and form to use
					
					var rec = nlapiCreateRecord( 'job', {recordmode:'dynamic', customform: custForm});						
					rec.setFieldValue('custentity_aux_createdbybuilder','T');						
					
					rec.setFieldValue('parent', arBookings[l].clt);					
					rec.setFieldValue('subsidiary', arBookings[l].subsid);
					
					rec.setFieldValue('custentity_bo_item', arBookings[l].itemid);
					rec.setFieldValue('jobtype', arBookings[l].bkingtype);					
					rec.setFieldValue('custentity_bo_course',arBookings[l].courseid);							
					rec.setFieldValue('custentity_bo_trainingprogramme',arBookings[l].progrmme);
					rec.setFieldValue('custentity_bo_trainingsolution',arBookings[l].solution);				
					rec.setFieldValue('custentity_ax_bookingset',arBookings[l].bkingset);													
					rec.setFieldValue('enddate',arBookings[l].date);			
					rec.setFieldValue('custentity_bo_eventtime',arBookings[l].aptime);						
					rec.setFieldValue('custentity_bo_owner',arBookings[l].coordinator);						
					rec.setFieldValue('custentity_bo_buyer',arBookings[l].buyer);
					rec.setFieldValue('custentity_bo_sitecontact',arBookings[l].sitecontact);
					rec.setFieldValue('custentity_bo_coach',arBookings[l].coach);									
					rec.setFieldValue('custentity_bo_feedbackrequirements',arBookings[l].feedback);			
					rec.setFieldValue('custentity_bo_optimfeedback',arBookings[l].feedbackreq);			
					rec.setFieldValue('custentity_bo_isprovisional',arBookings[l].provisional);						
					rec.setFieldValue('custentity_bo_requirestmgchannel',arBookings[l].wbxoutsourcer);											
					rec.setFieldValue('custentity_bo_eventtimezone',arBookings[l].timezone);	
					
					if(arBookings[l].provisional == 'T')
					{	// If "Is Provivisional" is checked off then set the status to Provisional (66)
						rec.setFieldValue('entitystatus','66');		
					}						
					
					rec.setFieldValue('custentity_bo_eventaddress1',arBookings[l].addrss1);							
					rec.setFieldValue('custentity_bo_eventaddress2',arBookings[l].addrss2);	
					rec.setFieldValue('custentity_bo_eventcity',arBookings[l].city);							
					rec.setFieldValue('custentity_bo_eventpostcode',arBookings[l].zip);	
					rec.setFieldValue('custentity_bo_eventcountry',arBookings[l].cntry);						
					rec.setFieldValue('custentity_bo_eventstate',arBookings[l].state);																								
					rec.setFieldValue('custentity_bo_pack_shipto',arBookings[l].shipto);	
						
					var id = nlapiSubmitRecord(rec, true, true); 																		
					
					createdJobs.push(id);	
										
				}	
								
				var field = '<ul>';				
				for (c = 0; c < createdJobs.length; c++) 
				{
					var entityId = nlapiLookupField('job', createdJobs[c], 'entityid', false);					
					field += '<br><li><a href="https://system.netsuite.com/app/accounting/project/project.nl?id='+createdJobs[c]+'" target="_blank">'+entityId+'</a></li>';	
				}
				field += '</ul>';
								
				nsform.addField('custpage_p1', 'inlinehtml', '', null, 'custpage_final').setDefaultValue("<td style='font-size:17px'>"+field+"</td>");
				
				var context = nlapiGetContext();
				var usageRemaining = context.getRemainingUsage();
					
				log('error','Remaining Units', usageRemaining )
				
				try 
				{
					nlapiSendEmail(nlapiGetContext().getUser() , nlapiGetContext().getUser(), 'Bookings you created using Booking Builder', '<ul>'+field+'</ul>' , null, null, null, null, true, null, null);													
				}
				catch (jobsCreated)
				{							
					log('error','Error sending Booking Builder email', getErrText(jobsCreated));					
				}				
																					 				   					   	
			}

				var context = nlapiGetContext();
				var usageRemaining = context.getRemainingUsage();
					
				log('error','Remaining Units', usageRemaining )
		}	
		
		
		
		var context = nlapiGetContext();
		var usageRemaining = context.getRemainingUsage();		
		log('error','Remaining Units', usageRemaining )			
	
	} 
	catch (jobConfigErr) 
	{
		log('error','Booking Builder Error', getErrText(jobConfigErr));
		
		msgFld.setDefaultValue(getErrText(jobConfigErr));
	}
	
	res.writePage(nsform);
	
		
}
