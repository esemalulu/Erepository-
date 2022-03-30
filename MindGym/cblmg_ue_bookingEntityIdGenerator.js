
function bookingIdGenBeforeSubmit(type)
{
	log('debug','before submit type',type);
	//Ticket 5158
	//Only trigger if action is type
	if ((type == 'copy' || type == 'create') && nlapiGetFieldValue('entityid'))
	{
		//Before saving, modify the entityID so that it is unique in the system. 
		//	This will prevent errors from being thrown
		nlapiSetFieldValue('entityid', 'Temp Unique '+(new Date().getTime()));
		
	}

}

function bookingIdeGenAfterSubmit(type) 
{
	//ONLY fire for CREATE or COPY action
	if (type =='delete' || type=='xedit') 
	{
		return;
	}
	
	try 
	{
		if (!nlapiGetFieldValue('parent')) {
			log('error','Unable to Generate ID due to missing Client Account','Unable to Generate ID due to missing Client Account');
			return;
		}
		
		//Assume the "-J" is added to client status.
		var clientAccountEntityId = nlapiLookupField('customer', nlapiGetFieldValue('parent'), 'entityid', false)+'-J';
		log('debug','clientAccountEntityId', clientAccountEntityId+' // Current Booking Endity ID: '+nlapiGetFieldValue('entityid'));
		
		//Since this is firing AFTER Submit, RETURN OUT if booking ID contains correctly formatted Booking ID
		//Modified to support Make A Copy
		if (nlapiGetFieldValue('entityid') && nlapiGetFieldValue('entityid').indexOf(clientAccountEntityId) > -1) {
			log('debug','NO Need to Process Generator','Booking Entity ID already in format: '+nlapiGetFieldValue('entityid'));
			return;
		}
		
		var bkflt = [new nlobjSearchFilter('customer', null, 'anyof', nlapiGetFieldValue('parent')),
		             //Assume client entity ID value is set ONLY return those booking with ID that contains [Client Entity ID]-J
		             new nlobjSearchFilter('entityid', null, 'startswith', clientAccountEntityId)];
		
		//Try grabbing Max Number
		var formulaCol = new nlobjSearchColumn('formulanumeric', null, 'max');
		if (clientAccountEntityId.indexOf('\'') > -1) {
			clientAccountEntityId = clientAccountEntityId.replace('\'','\'\'');
		}
		formulaCol.setFormula("TO_NUMBER(REPLACE(REPLACE({entityid}, '"+clientAccountEntityId+"'),''''))");
		
		var bkcol = [formulaCol];
		
		//Saved search will grab any booking record that starts with (instead of contains) with format.
		//	- Replace the first string value as well as single quote and convert the value to Number
		//	- Search will then grab maximum amount.
		var bkrs = nlapiSearchRecord('job', null, bkflt, bkcol);
		
		//Build new Booking Entity ID. Booking ID should be generated based on following Format: [Client Entity ID]-J[NUMBER].
		//New booking id should be [NUMBER] + 1.  IF THere are NOT booking matching above format, new booking ID is [Client Entity ID]-J1
		var bookingIdToUse = '';
		
		var latestValue = bkrs[0].getValue(formulaCol);
		
		log('debug','latestValue', latestValue);
		
		if (clientAccountEntityId.indexOf('\'\'') > -1) {
			clientAccountEntityId = clientAccountEntityId.replace('\'\'','\'');
		}
		
		if (!latestValue) {
			bookingIdToUse = clientAccountEntityId+'1';
			//Before Submit version
			//nlapiSetFieldValue('entityid',bookingIdToUse);
		} else {
			//TEST for Number
			if (!isNaN(latestValue)) {
				//Increment the number by 1 and create new bookingId
				bookingIdToUse = clientAccountEntityId+(parseInt(latestValue)+1);
				log('debug','New Booking ID', bookingIdToUse);
				//Before Submit version
				//nlapiSetFieldValue('entityid',bookingIdToUse);
			} else {
				//LOG Error and send notification
				//TODO Send Email Notification
				log('error','Error generating ID', 'Unable to grab numerical value and increment by 1');
			}
		}
		
		if (bookingIdToUse) {
			//submit changes to THIS record
			//This is done on after submit because entityid doesn't update during create. 
			//Ticket 5926 - Also set altname and companyname
			//	- altname can not be changed or alterned due to auto-gen. 
			//	  this is NS behavior at the moment becuase entityid is being overriden.
			//	  currently have ticket open with NS (Ticket Opened Nov 29 2015)
			var bookUpdFlds = ['entityid','companyname'],
				bookUpdVals = [bookingIdToUse,bookingIdToUse];
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), bookUpdFlds, bookUpdVals, true);
		}
		
	} catch (generr) {
		
		log('error','Gen Booking ID Generation', getErrText(generr));
		
	}
	
}

/**
 * both value of companyname and entityid exists when searched.
 * They are simply not displayed.
 * This is temp scheduled script to go through all face to face and virtual booking
 * and update the value to be synced on UI DISPLAY
 */
function legacyBookUpdate()
{

	var paramLastSynced = nlapiGetContext().getSetting('SCRIPT', 'custscript_424_lastid');
	
	var flt = [new nlobjSearchFilter('jobtype', null, 'anyof',['11','13']), //face to face and virtual
	           new nlobjSearchFilter('isinactive', null, 'is', 'F')];
	var col = [new nlobjSearchColumn('internalid').setSort(true),
	           new nlobjSearchColumn('entityid')];
	if (paramLastSynced) 
	{
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastSynced));
	}
	
	var jobrs = nlapiSearchRecord('job', null, flt, col);
	
	for (var i=0; jobrs && i < jobrs.length; i+=1)
	{
	
		//log('debug','updating Booking','booking id '+ jobrs[i].getValue('internalid'));
		var jrec = null;
		try
		{
			jrec = nlapiLoadRecord('job', jobrs[i].getValue('internalid'));
			//ONLY update when the value is missing
			if (!jrec.getFieldValue('companyname'))
			{
				try
				{
					
					jrec.setFieldValue('companyname', jobrs[i].getValue('entityid'));
					nlapiSubmitRecord(jrec, false, true);
				}
				catch (upderr)
				{
					log('error','Error Updating Booking','Booking Internal ID '+jobrs[i].getValue('internalid')+' Update Error // '+getErrText(upderr));
				}
				
			}
		}
		catch (loaderr)
		{
			log('error','Error Loading Booking','Booking Internal ID '+jobrs[i].getValue('internalid')+' Load Error // '+getErrText(loaderr));
		}
		
		//log('debug','updated',jobrs[i].getValue('internalid') +' with '+jobrs[i].getValue('entityid'));
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / jobrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((i+1)==1000 || ((i+1) < jobrs.length && nlapiGetContext().getRemainingUsage() < 500)) {
			//reschedule
			nlapiLogExecution('audit','Getting Rescheduled at', jobrs[i].getId());
			var rparam = new Object();
			rparam['custscript_424_lastid'] = jobrs[i].getId();
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
}