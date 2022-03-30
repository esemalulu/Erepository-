/**
 * Company            Explore Consulting
 * Copyright            2013 Explore Consulting, LLC
 * Type                NetSuite EC_Restlet_GetWork.js
 * Version            1.0.0.0
 * get  - Retrieve time entries queue records that need to be processed in parallel
 * post - receives queue record payload in parallel and processes their time entries
 **/

// create aliases for backwards compatibility for any shared libraries that still use Logger.Debug()
var Logger = Log;
Logger.Debug = Log.d;
Logger.Audit = Log.a;
Logger.Error = Log.e;

/** preserve script start time for use in outOfTime() or elsewhere */
EC.scriptStartTime = moment();

//region PUBLIC RESTLET API

/**
 * Represents the opaque work object that gets retrieved by the dispatcher (as a HTTP GET) and then passed back
 * as parallel HTTP POST operations
 */
var GetWorkResponse = {
    queueId: undefined,
    projectId: undefined,
    status:undefined
};

/**
 * The message type returned from the restlet when doing work
 * @type {{status: undefined, details: undefined}}
 */
var PostWorkResponse = {
    queueId:undefined,
    //@type {String}
    status:undefined,
    //@type {String}
    detail:undefined
};


/**
 * HTTP GET retrieves a batch of queue records for processing by the external message dispatcher
 * which calls back
 * @param {Number} input.max maximum number of work objects to return. Range 0-1000
 * @return GetWorkResponse request records
 */
EC.get = function(input) {
    var max = parseInt(input.max);
    // clamp max to 1000
    if ( isNaN(max) ) max = 50; // default to 50
    if ( max > 1000) throw nlapiCreateError("max_exceeded", "maximum records we can return is 1000");
    Log.d("max work items " + max);

    var workSearchStatuses = [queueStatuses.QueuedWipFromBillingTitle, queueStatuses.QueuedBillingTitle,
        queueStatuses.QueuedWipAdjustment];

    // get a batch, up to 1000 (NetSuite limit) of records
    var work = nlapiSearchRecord("customrecord_proj_wip_bill_queue", null,
        [new nlobjSearchFilter("custrecord_queue_status", null, "anyof", workSearchStatuses)],
        [new nlobjSearchColumn("custrecord_queue_project"),new nlobjSearchColumn("custrecord_queue_status")]);

    Log.d("search result", "found " + (work && work.length) + " records for processing");

    var mapped = _.chain(work).map(function (result) {
        // return the stuff the callback restlet needs to get themselves started
        // which queue record to use, which project (to save a lookup) and what the original status was
        return { payload:{
            queueId: result.getId(),
            projectId: result.getValue("custrecord_queue_project"),
            status:result.getValue("custrecord_queue_status")
            }
        }
    }).first(max).value();

    _.forEach(mapped,function(record) {
            // mark each we're returning from the restlet as "retrieved" so they are not picked up
            // by the next invocation if it occurs before the workers update the status themselves
            Log.d("record " + record.payload.queueId, "updating status to RetrievedForProcessing");
            nlapiSubmitField("customrecord_proj_wip_bill_queue",
            record.payload.queueId, "custrecord_queue_status", queueStatuses.RetrievedForProcessing);
    });

    Log.a("Returning " + mapped.length + " work items");
    return mapped;
};

/**
 * HTTP POST Receives work messages (in parallel) from the external messages dispatcher and processes them
 * @param {GetWorkResponse} input
 */
EC.post = function (input) {
    // route to the WIP or the billing title logic based on what status the input references
    //noinspection FallthroughInSwitchStatementJS
    switch (parseInt(input.status))
    {
        case queueStatuses.QueuedBillingTitle:
            return EC.startBillingTitleProcessing(input);
            break;
        case queueStatuses.QueuedWipAdjustment:
        case queueStatuses.QueuedWipFromBillingTitle:
            return EC.startWIPprocessing(input);
            // do WIP script
            break;
        default:
            //noinspection JSPotentiallyInvalidConstructorUsage
            throw new nlapiCreateError("Unexpected queue record status input received:", input.status );
    }
};
//endregion

//region utility functions

/**
 * returns true if we're out of units or out of time (time limit is fixed to 4 minutes)
 * @param [minimum] minimum governance threshhold (default 100)
 */
function outOfGovernance(minimum) { return outOfTime() || nlapiGetContext().getRemainingUsage() < (minimum || 100);}

/**
 * Returns true if the script has been executing more than 4 minutes.
 * This is used to avoid SSS_TIME_LIMIT_EXCEEDED errors in a single run, and I'd rather have these HTTP calls
 * end in a shorter timeframe than NetSuite's limit from a best practice perspective
 */
function outOfTime() {
    var runtime = moment().diff(EC.scriptStartTime,"minutes");
    var result = runtime >= 4;
    if ( result ) Log.a("Execution time exceeded", "outOfTime() returning false. Actual runtime:" + runtime);
    return result;
}

/**
 * Saves the current state of the script to the queue record so we can pick up where we left off on the next invocation
 * @param state javascript object to persist to the queue record
 * @param queueId the queue record we're working with
 */
EC.saveScriptState = function(queueId, state)
{
    var qRecord = nsdal.loadObject("customrecord_proj_wip_bill_queue", queueId, ["custrecord_stored_state"]);
    qRecord.custrecord_stored_state = JSON.stringify(state);
    qRecord.save();
};

/**
 * Loads the current state of the script from the queue record so we can pick up where we left off
 * @param queueId the queue record internal id to load
 * @return javascript object representing the previously persisted state or null if not found
 */
EC.loadScriptState = function(queueId) {
    var queue = nsdal.loadObject("customrecord_proj_wip_bill_queue", queueId,
                                ["custrecord_stored_state"]);
    var storedState = queue.custrecord_stored_state;
    Log.a("loaded script state", storedState);
    if ( storedState ) return JSON.parse(storedState);
    else return null;
};

/**
 * Set queue status and return response to send back to restlet caller
 * @param {queueStatuses} queueStatus status to set on the record
 * @param {String} msg a note about how/why we're finishing
 * @param queueId the queue record we're working with
 */
function finish(msg, queueId, queueStatus)
{
    nlapiSubmitField("customrecord_proj_wip_bill_queue", queueId, "custrecord_queue_status", queueStatus);
    var result = { queueId:queueId, status:msg, detail: "queue status set to " + queueStatus };
    Log.a("returning to caller", result);
    return { queueId:queueId, status:msg, detail: "queue status set to " + queueStatus };
}
//endregion

//region Billing title and rate

/**
 * Does billing title and rate processing
 * @param {GetWorkResponse} input object containing the queue record we should process
 * @return {PostWorkResponse}
 */
EC.startBillingTitleProcessing = function(input)
{
    /**
     * Bag of program state we need to persist in order to pick up and carry on between restlet executions
     * @type {{timebillid: number}}
     */
    var initialProgramState = {
        timebillid: 0,
        stateFor: "Billing Title Processing"
    };

    if ( input.status != queueStatuses.QueuedBillingTitle ){
        //noinspection JSPotentiallyInvalidConstructorUsage
        throw new nlapiCreateError("invalid status",
            "trying to run the Billing Rate and Title processing with a status other than " + queueStatuses.QueuedBillingTitle);
    }

    // Closure variables
    var projectObj,billingLookupTable,employeesWithTimeArray = null,billRateTableColumns,queueId;

    queueId = input.queueId;

    Log.a('Processing Queue Record',queueId+' // '+JSON.stringify(input));

    var projectID = input.projectId;

    temporarilyAllowNonAssignedTimeEntries(null,projectID);

    Log.a('Temp. Allow Time Entries', 'Successfully set '+projectID+' to allow time entries');
    
    // Set active entry to "Processing"
    nlapiSubmitField('customrecord_proj_wip_bill_queue',input.queueId,'custrecord_queue_status',
                        queueStatuses.ProcessingBillingTitle);

    Log.d('Project ID',projectID);

    var projectProps = [
        'custentity_bill_rate_schedule',
        'custentity_project_class',
        'custentity_department',
        'custentity_location',
        'custentity_rate_schedule_last_changed_by',
        'companyname',
        'custentity_last_rate_schedule_update',
        'custentity58',
        'custentity_legacy_update_finished'
    ];

    projectObj = nsdal.loadObject('job',projectID,projectProps);
    // We will use this to store a map: employeeID -> billingRateSearchResult
    billingLookupTable = {
        class:{}
    };

    // 1. Find all employees who have time entries for this project.
    setupProjectEmployeeArray();

    Log.d('Employees with time',JSON.stringify(employeesWithTimeArray));

    if ( !employeesWithTimeArray )
    {
        return finish("no employees with time", queueId, queueStatuses.QueuedWipFromBillingTitle);
    }

    // 2. Find all of the bill rate table entries for employees on this project and this project's bill rate.  Build
    //    an object such that obj[employeeID] = tableEntry.
    billRateTableColumns = [
        new nlobjSearchColumn('custrecord_billing_title'),
        new nlobjSearchColumn('custrecord_bill_rate'),
        new nlobjSearchColumn('custrecord_employee')
    ];

    buildBillRateLookupTable();

    Log.d('Bill rate lookup table',JSON.stringify(billingLookupTable));

    // 2.a pick up where we left off if applicable else start with default starting state
    var previousState = EC.loadScriptState(queueId) || initialProgramState;

    // 3. Go through all time entries greater than the last one processed
    var filters = [
        new nlobjSearchFilter('customer',null,'anyof',projectID),
        new nlobjSearchFilter('internalidnumber',null,'greaterthan',previousState.timebillid)
    ];


    var columns = [new nlobjSearchColumn('internalid').setSort(false)];   // Ascending order

    // Iterate through time entries for this project.
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

    // transform search results into a collection of time entry internal ids
    var searchResults = nlapiSearchRecord("timebill",null,filters,columns);
    var timebillIds = _.map(searchResults, function(t){ return t.getId(); });

    // set to true if we need to run again due to processing a batch of the max 1000 records
    var shouldRunAgain = timebillIds.length == 1000;

    // process each time entry until we're done or out of governance
    _.each(timebillIds, function (timebillId,index,collection) {
        Log.d('Next TimeEntry','ProjectID: ' + projectID + ', TimeEntryID: ' + timebillId);
        var timeObj = nsdal.loadObject('timebill',timebillId, timeProps); // 5 units

        automateBillingAndTitle(timeObj,billingLookupTable,billRateTableColumns); // 20 units
        var id = timeObj.save();
        Log.d("saved timeObj id " + id);
        if ( outOfGovernance() ) {
            Log.a("reached governance limit", "on record " + index + " of a batch of " + collection.length );
            EC.saveScriptState(queueId, { timebillid:timebillId });
            return false; // to stop processing.
        }
    });

    // Use nlapiSubmitField instead of nlapiSubmitRecord to avoid Record Has Been Changed error.
    // When timeObj is saved above, the onAfterSubmit function in EC_UserEvent_TimeEntry.js is executed
    // and that function updates the project record.

    // projectObj.custentity_last_rate_schedule_update = nlapiDateToString(now);
    // projectObj.save();

    // TODO: Jon uncomment 'custentity_remaining_wip' and 'projectObj.custentity58'
    // Last rate schedule, remaining WIP
    var now = new Date();
    var fieldsToSubmit = ['custentity_last_rate_schedule_update' /*,'custentity_remaining_wip'*/];
    // Today's date and time, Adjusted Fee Cap
    var valuesToSubmit = [nlapiDateToString(now)/*,projectObj.custentity58*/];

    nlapiSubmitField('job', projectID, fieldsToSubmit,valuesToSubmit);

    // if we're out of governance, restore status to queued so we run again. Otherwise set to next status in the workflow
    if ( outOfGovernance() )
        return finish("continued for governance", queueId, queueStatuses.QueuedBillingTitle);
    else if ( shouldRunAgain )
        return finish("continued for 1000 record limit", queueId, queueStatuses.QueuedBillingTitle);
    else
    {
        Log.a("clearing script continuation state");
        // ensure we clear script state as we are done processing
        EC.saveScriptState(queueId, null);
        return finish("Billing Rate/Title complete",queueId, queueStatuses.QueuedWipFromBillingTitle);
    }

    function setupProjectEmployeeArray()
    {
        employeesWithTimeArray = [];

        var filters = [new nlobjSearchFilter('customer',null,'anyof',projectID)];

        var columns = [new nlobjSearchColumn('employee',null,'group')];

        var employeesWithTimeResults = nlapiSearchRecord('timebill',null,filters,columns);

        if ( !employeesWithTimeResults )
        {
            employeesWithTimeArray = null;
            return;
        }

        for ( var i=0; i < employeesWithTimeResults.length; i++ )
        {
            if ( employeesWithTimeArray.indexOf(employeesWithTimeResults[i].getValue(columns[0])) == -1 )
                employeesWithTimeArray.push(employeesWithTimeResults[i].getValue(columns[0]));
        }
    }

    function buildBillRateLookupTable()
    {
        var filters = [
            new nlobjSearchFilter('custrecord_employee',null,'anyof',employeesWithTimeArray),
            new nlobjSearchFilter('isinactive',null,'is','F')
        ];

        if ( projectObj.custentity_bill_rate_schedule )
            filters.push( new nlobjSearchFilter('custrecord_billing_schedule',null,'anyof',
                projectObj.custentity_bill_rate_schedule) );
        else
            filters.push(new nlobjSearchFilter('custrecord_billing_schedule',null,'anyof','11'));   // Default billing schedule

        var billRateResults = nlapiSearchRecord('customrecord_bill_rate_table',null,filters,billRateTableColumns);

        if ( !billRateResults )
        {
            return finish("no bill rates found", queueId, queueStatuses.QueuedWipFromBillingTitle);
        }

        var curEmployee = '';
        for ( var i=0; i < billRateResults.length; i++ )
        {
            curEmployee = billRateResults[i].getValue(billRateTableColumns[2]);
            if ( billingLookupTable[curEmployee] )
                billingLookupTable[curEmployee] = 'DUPLICATE';
            else
                billingLookupTable[curEmployee] = billRateResults[i];
        }
        nlapiLogExecution('DEBUG','Billing Rate Lookup Table',JSON.stringify(billingLookupTable));
    }
};
//endregion

//region WIP adjustment

/**
 * Does WIP processing
 * @param {GetWorkResponse} input object containing the queue record we should process
 * @return {PostWorkResponse}
 */
EC.startWIPprocessing = function(input) {
	
	nlapiLogExecution('audit', 'input data',JSON.stringify(input));
	
    var governance = new Governance();
    var WipProcessingOutOfGovernance = _.partial(outOfGovernance, 200);

    var projectID = input.projectId;
    /**
     * Bag of program state we need to persist in order to pick up and carry on between restlet executions
     * @type {{timebillid: number,wip: number}}
     */
    var initialProgramState = {
         timebillid: 0,
         // wip starts from the value on the project record
         wip: parseFloat(nlapiLookupField('job', projectID, 'custentity58'))
    };

    if ( input.status != queueStatuses.QueuedWipAdjustment &&
         input.status != queueStatuses.QueuedWipFromBillingTitle)
    {
        //noinspection JSPotentiallyInvalidConstructorUsage
        throw new nlapiCreateError("invalid status",
            "trying to run the WIP processing with unexpected billing status " + input.status);
    }

    //  pick up where we left off if applicable else start with default starting state
    var previousState = EC.loadScriptState(input.queueId) || initialProgramState;

    if ( input.status == queueStatuses.QueuedWipAdjustment )
        temporarilyAllowNonAssignedTimeEntries(null,projectID);

    // Set active entry to "Processing"
    nlapiSubmitField('customrecord_proj_wip_bill_queue',input.queueId,'custrecord_queue_status',
        queueStatuses.ProcessingWipAdjustment);

   // only select time entries starting with where we left off from the last run (or 0 if this isn't a continuation)
   var filters = [
        new nlobjSearchFilter('customer',null,'anyof',projectID),
        new nlobjSearchFilter('internalidnumber',null,'greaterthan',previousState.timebillid)
    ];

    var columns = [
        new nlobjSearchColumn('date'),
        new nlobjSearchColumn('hours'),
        new nlobjSearchColumn('custcol_time_entry_billing_rate'),
        new nlobjSearchColumn('internalid').setSort(false) // Ascending
    ];

    var fields = [],values = [];
    // pickup where we left off, else from the initial state on the record, else zero.
    var adjustedRemainingWIP = previousState.wip || 0.00;

   // return { status:"testing", queueId:input.queueId, detail:"work in progress... testing" } ;
    Log.a("searching for time entries...");
    // transform search results into a collection of time entry internal ids
    var searchResults = nlapiSearchRecord("timebill",null,filters,columns);
    Log.a("found time entries", (searchResults ? searchResults.length : 0) + " time entries");

    // map search results to real javascript objects so we can more easily work with them in the iteration function
    // as well as more easily serialize the state if we run out of governance
    var records = _.map(searchResults, function(r) {
        return {
            id: r.getId(),
            date: r.getValue("date"),
            hours: r.getValue("hours"),
            billRate: r.getValue("custcol_time_entry_billing_rate")
        };
    });
    // set to true if we need to run again due to processing a batch of the max 1000 records
    var gotMaxRecords = records.length == 1000;

    // the meat of the processing is here
    _.each(records,processTimeEntry);

    Log.d('Initial remaining WIP as float',adjustedRemainingWIP);


    /**
     * Handles a single time entry, iterator used across all searched records above
     * @param {{id,date,hours,billRate}} r
     * @param index the index of record r from collection
     * @param collection the collection we're iterating itself
     */
    function processTimeEntry(r, index, collection)
    {
        var timeEntryInternalID = r.id;
        var tranDate = r.date;
        var hours = ConvertTimeToDecimal(r.hours);
        var rate = isNaN(parseFloat(r.billRate)) ? 0.00 : parseFloat(r.billRate);
        var totalValue = hours * rate;

        Log.d("Project, TranDate, InternalID, Hours, Rate, TotalValue","ProjectID: " +
            projectID + ", Trandate: " + tranDate + ", InternalID: " + timeEntryInternalID + ", Hours: " + hours +
            ", Rate: " + rate + ", TotalValue: " + totalValue);

        var updateBillableStatus = null;

        if(totalValue <= adjustedRemainingWIP)
        {
            updateBillableStatus = billableStatus.billable;
            adjustedRemainingWIP -= totalValue;
            Log.d("Billable.  adjustedRemainingWIP:",adjustedRemainingWIP);
        }
        else
        {
            updateBillableStatus = billableStatus.notBillable;
            adjustedRemainingWIP = 0;
            Log.d("Not Billable.  adjustedRemainingWIP:",adjustedRemainingWIP);
        }

        fields = ['custcol_billable_status','custcol_cached_total_amount'];
        values = [updateBillableStatus,totalValue];

        Log.d("Updating Time bill", 'Internal ID: ' + timeEntryInternalID + ', Fields: (' + fields.join(',') +
            '), Values: (' + values.join(',') + ')');

        nlapiSubmitField('timebill', timeEntryInternalID, fields, values);

        // save our spot if we're about to run out of governance
        if ( WipProcessingOutOfGovernance() ) {
            Log.a("reached governance limit", "on record " + index + " of a batch of " + collection.length );
            EC.saveScriptState(input.queueId, { timebillid:timeEntryInternalID, wip:adjustedRemainingWIP });
            return false; // to stop processing.
        }
    }

    // Fire "done" logic if we have processed all time entries.  Because the script quits when it reschedules itself,
    // we know we're done once we reach this point.

    fields = ['custentity_rate_schedule_last_changed_by','companyname','custentity_ec_limit_time_cached_value'];
    var projectObj = nlapiLookupField('job',projectID,fields);
    // When all entries are done, send an e-mail and set the last rate schedule update
    var subject = 'Rate schedule update';
    var body = 'All time entries for project ' + projectObj.companyname + ' have been updated to reflect the new ' +
        'rate schedule';

    if ( !projectObj.custentity_rate_schedule_last_changed_by ||
        projectObj.custentity_rate_schedule_last_changed_by.trim() == '' )
        nlapiSendEmail('24','laura.thornton@alliantgroup.com',subject,body, null, null, null, null, true);
    else
    {
        Log.d('Recipient',projectObj.custentity_rate_schedule_last_changed_by);
        try
        {
        	nlapiSendEmail('24',projectObj.custentity_rate_schedule_last_changed_by,subject,body, null, null, null, null, true);
        }
        catch(emailerr)
        {
        	body = body + '<br/><br/>ERROR occured while attempting to send email to Employee ID '+projectObj.custentity_rate_schedule_last_changed_by+
        				  '<br/>Default email notification to laura.thornton@alliantgroup.com';
        	
        	nlapiSendEmail('24','laura.thornton@alliantgroup.com',subject,body, null, null, null, null, true);
        	
         }
        
    }

    fields = ['custentity_updatetimeentrybillablestatus','custentity_remaining_wip','limittimetoassignees'];
    values = ['F',adjustedRemainingWIP,projectObj.custentity_ec_limit_time_cached_value];
    Log.d('Setting job record fields:', _.zip(fields,values));
    nlapiSubmitField('job', projectID, fields, values);

    Log.a("remaining governance",governance.remainingUsage());

    // if we're out of governance or we got a result set matching the max allowed by NetSuite,
    // restore status to queued so we run again. Otherwise set to next status in the workflow
    if ( WipProcessingOutOfGovernance() )
        return finish("continued for governance", input.queueId, input.status);
    else if ( gotMaxRecords ) // not out of governance but did receive a maximum record batch - need to ask for another batch
        return finish("continued by 1000 record limit", input.queueId, input.status);
    else
    {
        // be sure to clear the queue state snapshot
        EC.saveScriptState(input.queueId,null);
        return finish("WIP processing completed", input.queueId, queueStatuses.Done);
    }
};
//endregion

Log.AutoLogMethodEntryExit();
