/**
 * Before Loaod function to block users (userinterface) from creating and copying
 * Script will simply error out depending on the type.
 * Script should be deployed to records you wish to block users from creating and copying
 * @param type
 * @param form
 * @param request
 */
function blockUserCreateCopy(type, form, request) {
	
	if (nlapiGetContext().getExecutionContext()=='userinterface' && (type=='create' || type=='copy')) {
		
		//Make sure this is ONLY fired for License and Location
		if (nlapiGetRecordType() == 'customrecord_lmslic' || nlapiGetRecordType() == 'customrecord_lmsl')
		{
			throw nlapiCreateError('LMS-BLOCKED-ACTION', 'LMS Module Rel1: You are Not able to '+type+' this record. It can ONLY be done from Rcopia', true);
		}
	}
}

/**
 * Before submit, make sure delete is blocked if it's user event
 * @param type
 */
function beforeSubmitBlockUserDelete(type)
{
	log('audit','Type // Execute type', type+' // '+nlapiGetContext().getExecutionContext());
	
	if (nlapiGetContext().getExecutionContext()=='userinterface' && type == 'delete')
	{
		throw nlapiCreateError('LMS-BLOCKED-ACTION', 'LMS Module Rel1: You are Not able to '+type+' this record.', true);
	}
	
	//11/16/2015 - Modification added to track UI create/changed 
	//1/28/2016 - Allow CSV import process to also trigger this process
	//3/24/2016 - MOVED to After Submit to properly track inline edit of fields being modified.
	//			CODE Moved to AFter Submit
}


/**
 * Process relating after submit process
 * @param type
 */
function afterSubmitLmsProcessor(type)
{

	if (type == 'edit' && nlapiGetRecordType() == 'customrecord_lmsp')
	{
		//grab old and new record and compare the value of contract reference
		var oldRec = nlapiGetOldRecord();
		var newRec = nlapiGetNewRecord();
		
		//Contract change monitor
		if (newRec.getFieldValue('custrecord_lmsp_contract') && oldRec.getFieldValue('custrecord_lmsp_contract') != newRec.getFieldValue('custrecord_lmsp_contract'))
		{
			log('debug','Queue up Practice for update','Practice ID: '+nlapiGetRecordId()+' // New Contract ID: '+newRec.getFieldValue('custrecord_lmsp_contract'));
			//reference to contract changed on THIS practice.
			//Queue up UNSCHEDULED script to go through ALL linceses linked to THIS Practice and update their contract ID
			
			try 
			{
				var rparam={
					'custscript_sb137_updpracticeid':nlapiGetRecordId(),
					'custscript_sb137_newcontractid':newRec.getFieldValue('custrecord_lmsp_contract')
				};
				
				var status = nlapiScheduleScript(
					'customscript_axlms_ss_updcntronlicforprc', 
					null, 
					rparam
				);
				
				log('debug','queue status', status+' // '+JSON.stringify(rparam));
			}
			catch(queueerr)
			{
				log('error','Error Queuing Practice ID '+nlapiGetRecordId(),getErrText(queueerr));
			}
		}
		
		//Billing Type change monitor
		/**
		 * 4/27/2016 - Taken out.
		 * Scheduled script will now be scheduled instead of triggered via user EDIT.
		 * 
		 * 
		if (newRec.getFieldValue('custrecord_lmsp_billtype') && oldRec.getFieldValue('custrecord_lmsp_billtype') != newRec.getFieldValue('custrecord_lmsp_billtype'))
		{
			try
			{
				var rdparam = {
						'custscript_sb139_updpracticeid':nlapiGetRecordId()
				};
				
				var status = nlapiScheduleScript(
					'customscript_auxlms_ss_calcstartenddate', 
					null, 
					rdparam
				);
					
				log('debug','queue status customscript_auxlms_ss_calcstartenddate', status+' // '+JSON.stringify(rdparam));
			}
			catch(datequeueerr)
			{
				log('error','Error Searching for Licenses Practice ID '+nlapiGetRecordId(), getErrText(datequeueerr));
			}
		}
		*/
	}
	
	/**
	 * 3/25/2016 - UI Updated checkbox logic moved to After Submit 
	 * 			   to base it on specific field modifications.
	 * 			   This is being done on AFTER SUBMIT to properly track changes
	 * 			   made via inline EDIT
	 */
	if ( (nlapiGetContext().getExecutionContext()=='userinterface' || 
		  nlapiGetContext().getExecutionContext()=='csvimport' || 
		  (type=='xedit' && nlapiGetContext().getExecutionContext()=='userevent')) && 
		 type != 'view' && type != 'delete')
	{
		var fieldId = '',
			fieldValue = 'T',
			updateField = false;
			
		if (type == 'create')
		{
			updateField = true;
		}
		else
		{
			//ONLY trigger for none create updates.
			//Grab old and new record just before saving
			var oldRec = nlapiGetOldRecord(),
				newRec = nlapiGetNewRecord();
			
			//Load it if it is xedit
			if (type == 'xedit')
			{
				newRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			}
			
			//record types sync fields
			//Location is excluded from Syncing
			var ctrFlds = ['name',
			               'custrecord_lmsct_activestatus',
			               'custrecord_lmsct_accessregion',
			               'custrecord_lmsct_availregions',
			               'custrecord_lmsct_ctmanager',
			               'custrecord_lmsct_type',
			               'custrecord_lmsct_startdate',
			               'custrecord_lmsct_endate',
			               'custrecord_lmsct_contactfname',
			               'custrecord_lmsct_contactlname',
			               'custrecord_lmsct_contactemail',
			               'custrecord_lmsct_istest'],
				praFlds = ['custrecord_lmsp_contract',
				           'custrecord_lmsp_istest'],
				licFlds = ['custrecord_lmslc_status',
				           'custrecord_lmslc_lossreason',
				           'custrecord_lmslc_enablereason',
				           'custrecord_lmslc_startdt',
				           'custrecord_lmslc_enddt',
				           'custrecord_lmslc_istest',
				           'custrecord_lmslc_contract'],
				fldsByRecType = null;
		
			if (nlapiGetRecordType() == 'customrecord_lmsc')
			{
				fldsByRecType = ctrFlds;
				fieldId = 'custrecord_lmsct_uiupdateddt';
			}
			else if (nlapiGetRecordType() == 'customrecord_lmslic')
			{
				fldsByRecType = licFlds;
				fieldId = 'custrecord_lmslc_uiupdatedt';
			}
			else if (nlapiGetRecordType() == 'customrecord_lmsp')
			{
				fldsByRecType = praFlds;
				fieldId = 'custrecord_lmsp_uiupdateddt';
			}
			
			//ONLY check when there is need to. Location is excluded from this list
			if (fldsByRecType)
			{
				//Go through monitor fields and check value
				for (var br=0; br < fldsByRecType.length; br+=1)
				{
					log('debug','Old Value',oldRec.getFieldValue(fldsByRecType[br]));
					log('debug','New Value',newRec.getFieldValue(fldsByRecType[br]));
					
					if (oldRec.getFieldValue(fldsByRecType[br]) != newRec.getFieldValue(fldsByRecType[br]))
					{
						updateField = true;
						break;
					}
				}
			}
			
		}
		
		if (fieldId && updateField)
		{
			log('debug','UI '+type+' changes','Update UI Changed');
			//set the UI update/date time value
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), fieldId, fieldValue, false);
		}	
	}
}