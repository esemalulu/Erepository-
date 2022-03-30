//noinspection JSUnusedGlobalSymbols
/**
 * Company            Explore Consulting
 * Copyright            2012 Explore Consulting, LLC
 * Type                NetSuite EC_UserEvent_TimeEntry
 * Version            1.0.0.0
 * Description        Boilerplate startup code for a NetSuite RESTlet.
 **/


/**
 * returns true if execution context is appropriate for running the script before/after submit logic
 */
function isDesiredScriptContext() {
    var exCtx = nlapiGetContext().getExecutionContext();
    // allow also webservices because Celigo has a suiteflex integration that expects this script to run
    return exCtx == 'userinterface' || exCtx == 'webservices';
}


function onBeforeLoad(type, form, request) {

}


//noinspection JSUnusedGlobalSymbols
function onBeforeSubmit(type)
{
	var startdt = new Date(),
	enddt = null;
	
    // only execute in the context of the NS user interface
    if ( (type == 'create' || type == 'edit') && isDesiredScriptContext())
    {
        var timeEntryRecord = nlapiGetNewRecord();

        var timeProps = [
            'customer',
            'employee',
            'custcol_bill_table_lookup_status',
            'custcol_time_entry_billing_rate_table',
            'custcol_time_entry_billing_title',
            'custcol_time_entry_billing_rate',
            'item',
            'class',
            'department',
            'location'
        ];

        var timeEntryObj = nsdal.fromRecord(timeEntryRecord,timeProps);

        var projectProps = [
            'custentity_bill_rate_schedule',
            'custentity_project_class',
            'custentity_department',
            'custentity_location'
        ];

        var projectObj = nsdal.loadObject('job',timeEntryObj.customer,projectProps);

        // Source Values from Project on Time Entry script task
        timeEntryObj.class =  projectObj.custentity_project_class;
        //timeEntryObj.item = timeEntryObj.class;
        timeEntryObj.department = projectObj.custentity_department;
        timeEntryObj.location = projectObj.custentity_location;

        // Billing and Title Automation script task
        var filters = [];
        filters.push(new nlobjSearchFilter('custrecord_employee',null,'anyof',timeEntryObj.employee));
        filters.push(new nlobjSearchFilter('isinactive',null,'is','F'));
        if ( projectObj.custentity_bill_rate_schedule && projectObj.custentity_bill_rate_schedule != '' )
            filters.push( new nlobjSearchFilter('custrecord_billing_schedule',null,'anyof',
                projectObj.custentity_bill_rate_schedule) );
        else
            filters.push(new nlobjSearchFilter('custrecord_billing_schedule',null,'anyof','11'));   // Default billing schedule

        var billRateTableColumns = [];
        billRateTableColumns.push(new nlobjSearchColumn('custrecord_billing_title'));
        billRateTableColumns.push(new nlobjSearchColumn('custrecord_bill_rate'));
        billRateTableColumns.push(new nlobjSearchColumn('custrecord_employee'));

        var billRateResults = nlapiSearchRecord('customrecord_bill_rate_table',null,filters,billRateTableColumns);

        var billingLookupTable = {};
        var curEmployee = '';

        if ( billRateResults )
        {
            for (var i=0; i < billRateResults.length; i++ )
            {
                curEmployee = billRateResults[i].getValue(billRateTableColumns[2]);
                if ( billingLookupTable[curEmployee] )
                    billingLookupTable[curEmployee] = 'DUPLICATE';
                else
                    billingLookupTable[curEmployee] = billRateResults[i];
            }
        }

        automateBillingAndTitle(timeEntryObj,billingLookupTable,billRateTableColumns);
    }
    
    enddt = new Date();
    nlapiLogExecution('audit','Befor Submit Start/End/',startdt+' // '+enddt);
}

function onAfterSubmit(type)
{
    if ( !isDesiredScriptContext() ) return;
    //
    // Calculate Remaining WIP for Project based on Time Entry records
    // Also set the billable status of the timeEntryRecord
    //
    var projectInternalID = nlapiGetFieldValue('customer');

    var remainingWIP, timeEntryRecord, currentHours, currentRate, currentAmount, cachedValue, previousAmount,
        oldProjectInternalID;

    if ( type == 'create' || type == 'edit' )
    {
        timeEntryRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
        projectInternalID = timeEntryRecord.getFieldValue('customer');
    }
    else
    {
        timeEntryRecord = nlapiGetNewRecord();
    }

    //timeEntryRecord = nlapiGetNewRecord();
    
    remainingWIP = parseFloat(nlapiLookupField('job',projectInternalID,'custentity_remaining_wip')) || 0.00;
    currentHours = ConvertTimeToDecimal(timeEntryRecord.getFieldValue('hours'));
    currentRate = parseFloat(timeEntryRecord.getFieldValue('custcol_time_entry_billing_rate'));
    currentRate = currentRate ? currentRate : Settings.DefaultTimeEntryRateFields.Rate;

    currentAmount = currentHours * currentRate;

    cachedValue = parseFloat(timeEntryRecord.getFieldValue('custcol_cached_total_amount'));
    previousAmount = cachedValue ? cachedValue : 0.00;

    oldProjectInternalID = getOldProjectID(timeEntryRecord);

    
    /**
     * Audaxium Mod:
     * Queue up Time Entry modification to "Time Entry WIP Queue" custom record
    */
    /**
    try
    {
    	var queuerec = nlapiCreateRecord('customrecord_ax_timeentrywipqueue');
    	queuerec.setFieldValue('custrecord_tewq_timeinternalid', nlapiGetRecordId());
    	queuerec.setFieldValue('custrecord_tewq_action', type);
    	queuerec.setFieldValue('custrecord_tewq_projectinternalid', projectInternalID);
    	queuerec.setFieldValue('custrecord_tewq_oldprojectinternalid', oldProjectInternalID);
    	queuerec.setFieldValue('custrecord_tewq_currentamt', currentAmount);
    	queuerec.setFieldValue('custrecord_tewq_prevamount', previousAmount);
    	var queueid = nlapiSubmitRecord(queuerec, true, true);
    	
    	//Queue it up
    	var rparam = {
    		'custscript_sb159_queueid':queueid
    	};
    	var ssQueue = nlapiScheduleScript('customscript_ax_ss_proctimeentrywipqueue', null, rparam);
    	log('debug','SS queued up',ssQueue);
    	
    }
    catch (inserr)
    {
    	//Log it and generate email to triggering user
    	nlapiLogExecution(
    		'error',
    		'Error creating Time Entry WIP Queue', 
    		'Error occured while trying to create Time Entry WIP Queue for Time Entry ID '+
    			nlapiGetRecordId()+
    			' for action of '+
    			type+
    			' // '+
    			getErrText(inserr)
    	);
    	
    	nlapiSendEmail(
    		-5, 
    		nlapiGetUser(), 
    		'Error Time Entry WIP Queue', 
    		'Error occured while trying to create Time Entry WIP Queue for Time Entry ID '+
				nlapiGetRecordId()+
				' for action of '+
				type+
				' // '+
				getErrText(inserr)
		);
    }
    */
    /**
     * Starting below line, move to scheduled script
     */
    if( type == 'create' || (type == 'edit' && !oldProjectInternalID) )
    {
        var WIPDifference = currentAmount - previousAmount;

        var isBillable = updateWIP(projectInternalID,remainingWIP,WIPDifference);
        if ( isBillable != 'NO SET' )
            timeEntryRecord.setFieldValue('custcol_billable_status',isBillable);

        timeEntryRecord.setFieldValue('custcol_cached_total_amount',currentAmount);
    }

    // If we're re-assigning this time entry to another project, do a negative update on the old value for the old
    // project (re-adding it to remaining WIP, or recalculating if no WIP remains).  Then do a positive update on the
    // NEW value for the NEW project, since the old value will not have been logged against the new project.
    if ( type == 'edit' && oldProjectInternalID )
    {
        var oldProjectRemainingWIP =
            parseFloat(nlapiLookupField('job',oldProjectInternalID,'custentity_remaining_wip')) || 0.00;
        updateWIP(projectInternalID,remainingWIP,currentAmount);
        updateWIPNegative(oldProjectInternalID,oldProjectRemainingWIP,previousAmount);
    }


    // If we're deleting this record, add its value back into its project's remaining WIP. If the project has no
    // remaining WIP, we'll do a full recalculate
    if ( type == 'delete' )
    {
        updateWIPNegative(projectInternalID,remainingWIP,currentAmount);
    }
    else
    {
        timeEntryRecord.setFieldValue('custcol_ec_cached_timebill_project',projectInternalID);
        Logger.Debug('Create or edit TimeEntry.  projectInternalID ', projectInternalID);
        nlapiSubmitRecord(timeEntryRecord, false, true);
    }  
}

/**
 * Audaxium Modification:
 * After Submit will simply add new "Time Entry WIP Queue" custom record with required values and exit.
 * This Scheduled Script will execute every 30 min; FIFO order; and process WIP for each
 */
function triggerWipForQueuedTimeEntry()
{

	//This value passed in as script parameter.
	//	Have the script queue up processing right away as soon as 
	//	WIP Queue is created.
	var paramQueueToProcess = nlapiGetContext().getSetting('SCRIPT','custscript_sb159_queueid');
	try
	{
		//1. Grab list of all Time Entry WIP Queue to process.
		//	 Sort it by Internal ID ASC order to allow FIFO processing
		var pcflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
		             new nlobjSearchFilter('custrecord_tewq_isproc', null, 'is', 'F')];
		
		if (paramQueueToProcess)
		{
			pcflt = [new nlobjSearchFilter('internalid', null, 'anyof', paramQueueToProcess)];
		}
		
		var pccol = [new nlobjSearchColumn('internalid').setSort(),
		             new nlobjSearchColumn('custrecord_tewq_timeinternalid'),
		             new nlobjSearchColumn('custrecord_tewq_action'),
		             new nlobjSearchColumn('custrecord_tewq_projectinternalid'),
		             new nlobjSearchColumn('custrecord_tewq_oldprojectinternalid'),
		             new nlobjSearchColumn('custrecord_tewq_currentamt'),
		             new nlobjSearchColumn('custrecord_tewq_prevamount')];
		
		var pcrs = nlapiSearchRecord('customrecord_ax_timeentrywipqueue', null, pcflt, pccol);
		
		for (var i=0; pcrs && i < pcrs.length; i+=1)
		{
			var procLog = '';
			log('debug','running',pcrs[i].getValue('internalid'));
			try
			{
				var oldProjectInternalID = pcrs[i].getValue('custrecord_tewq_oldprojectinternalid') || '',
					projectInternalID = pcrs[i].getValue('custrecord_tewq_projectinternalid') || '',
					remainingWIP = nlapiLookupField('job',projectInternalID,'custentity_remaining_wip') || 0.00,
					currentAmount = pcrs[i].getValue('custrecord_tewq_currentamt') || 0.00,
					previousAmount = pcrs[i].getValue('custrecord_tewq_prevamount') || 0.00,
					timeEntryId = pcrs[i].getValue('custrecord_tewq_timeinternalid'),
					type = pcrs[i].getValue('custrecord_tewq_action'),
					WIPDifference = parseFloat(currentAmount) - parseFloat(previousAmount);
				log('debug','start','start');
				if (type == 'delete')
				{
					updateWIPNegative(
						projectInternalID,
						parseFloat(remainingWIP),
						parseFloat(currentAmount)
					);
					
					procLog +='<li>Update WIP Negative For Deleted Time Entry Project</li>';
				}
				else
				{
					log('debug','loaind te',timeEntryId);
					var timeEntryRecord = nlapiLoadRecord('timebill', timeEntryId);
					log('debug','loading te','loaded ');
					if( type == 'create' || (type == 'edit' && !oldProjectInternalID) )
				    {

				        var isBillable = updateWIP(
				        					projectInternalID,
				        					parseFloat(remainingWIP),
				        					parseFloat(WIPDifference)
				        				 );
				        
				        procLog +='<li>Is Billable: '+isBillable+'</li>';
				        
				        if ( isBillable != 'NO SET' )
				        {
				            timeEntryRecord.setFieldValue('custcol_billable_status',isBillable);
				        	timeEntryRecord.setFieldValue('custcol_cached_total_amount',currentAmount);				        	
				        }
				    }

				    // If we're re-assigning this time entry to another project, do a negative update on the old value for the old
				    // project (re-adding it to remaining WIP, or recalculating if no WIP remains).  Then do a positive update on the
				    // NEW value for the NEW project, since the old value will not have been logged against the new project.
				    if ( type == 'edit' && oldProjectInternalID )
				    {
				        var oldProjectRemainingWIP = nlapiLookupField('job',oldProjectInternalID,'custentity_remaining_wip') || 0.00;
				        updateWIP(
				        	projectInternalID,
				        	parseFloat(remainingWIP),
				        	parseFloat(currentAmount)
				        );
				        
				        updateWIPNegative(
				        	oldProjectInternalID,
				        	parseFloat(oldProjectRemainingWIP),
				        	parseFloat(previousAmount)
				        );
				        
				        procLog +='<li>Old Projects Remaining WIP: '+oldProjectRemainingWIP+'</li>';
				    }

				    timeEntryRecord.setFieldValue('custcol_ec_cached_timebill_project',projectInternalID);
				    log('debug','Create or edit TimeEntry.  projectInternalID ', projectInternalID);
				    nlapiSubmitRecord(timeEntryRecord, false, true);
				    
				    procLog +='<li>Updated Time Entry</li>';
				    
				    procLog = '<li>SUCCESS</li>'+
				    		  procLog;
				}
			}
			catch (looperr)
			{
				//Update the record with ERROR and mark as processed
				procLog ='<li>ERROR Processing: '+getErrText(looperr)+'</li>'+
						 procLog;
			}
			
			//Update Queue Record
			var updfld = ['custrecord_tewq_isproc','custrecord_tewq_proclog'];
			var updval = ['T',
			              '<ul>'+procLog+'</ul>'];
			nlapiSubmitField(
				'customrecord_ax_timeentrywipqueue', 
				pcrs[i].getValue('internalid'), 
				updfld,
				updval, 
				true
			);
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / pcrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//reschedule if gov is running low or legnth is 1000
			if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 200)) {
				log('audit','Getting Rescheduled','TEWIPQ internal ID '+pcrs[i].getValue('internalid'));
				nlapiScheduleScript(
					nlapiGetContext().getScriptId(), 
					nlapiGetContext().getDeploymentId(), 
					null
				);
			}
		}
	}
	catch (procerr)
	{
		//Throw custom error
		throw nlapiCreateError(
			'Time Entry WIP Queue ERROR', 
			'Error while processing Time Entry WIP Queue: '+getErrText(procerr), 
			false
		);
	}
}

function updateWIP(projID,remainingWIP,updateAmount)
{
    if ( !remainingWIP || remainingWIP - updateAmount <= 0.00 )
    {
        Logger.Debug('Setting ' + projID + ' to zero WIP');
        nlapiSubmitField('job',projID,'custentity_remaining_wip',0.00);
        return '2'; // Not Billable
    }
    else
    {
        Logger.Debug('Setting ' + projID + ' to ' + (remainingWIP - updateAmount));
        nlapiSubmitField('job',projID,'custentity_remaining_wip',remainingWIP - updateAmount);
        if ( remainingWIP > 0.00 )
            return '1'; // Billable
        else
            return 'NO SET'; // Not Billable
    }
}

// Use when a time entry is removed from a project, either through re-assigning it to a different project or
// deleting it.
function updateWIPNegative(projID,remainingWIP,updateAmount)
{
    if ( (!remainingWIP || remainingWIP <= 0.00) && getAllWipDetails(projID) )
    {
        makeProjectQueueEntry(projID,queueStatuses.PendingWipAdjustment);
        calculateRemainingWIP(projID);
    }
    else
    {
        nlapiSubmitField('job',projID,'custentity_remaining_wip',remainingWIP + updateAmount);
    }
}

// Try to use the cache field and the old record to get the old project ID.  If we fail, return null.
// If the old project ID matches the current project ID, return null
function getOldProjectID(timeEntryObj)
{
    var cachedProject = timeEntryObj.getFieldValue('custcol_ec_cached_timebill_project');
    var currentProject = timeEntryObj.getFieldValue('customer');
    if ( cachedProject && cachedProject != '' && cachedProject != currentProject )
        return cachedProject;

    var oldRecord = nlapiGetOldRecord();
    var oldProject = oldRecord && oldRecord.getFieldValue('customer');
    if ( oldProject && oldProject != '' && oldProject != currentProject )
        return oldProject;

    return null;
}
