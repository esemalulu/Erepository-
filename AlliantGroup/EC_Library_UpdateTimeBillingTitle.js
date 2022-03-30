/**
 * Company            Explore Consulting
 * Copyright            2012 Explore Consulting, LLC
 * Type                NetSuite Library Script
 * Version            1.0.0.0
 * Description        Code to properly set values for an AlliantGroup TimeEntry
 **/

/* Function to automatically set billing schedule and project title.
 * Parameters - timeEntryObj: Object representing the time object record.  Load with nsdal using the following
 *                              properties:
 *                                     timeProps.push('customer');
 *                                     timeProps.push('employee');
 *                                     timeProps.push('custcol_bill_table_lookup_status');
 *                                     timeProps.push('custcol_time_entry_billing_rate_table');
 *                                     timeProps.push('custcol_time_entry_billing_title');
 *                                     timeProps.push('custcol_time_entry_billing_rate');
 *                                     timeProps.push('item');
 *                                     timeProps.push('class');
 *                                     timeProps.push('department');
 *                                     timeProps.push('location');
 *               projectObj: Object representing the project record for this time entry. Load with nsdal using
 *                              the following properties:
 *                                      projectProps.push('custentity_bill_rate_schedule');
 *                                      projectProps.push('custentity_project_class');
 *                                      projectProps.push('custentity_department');
 *                                      projectProps.push('custentity_location');
 */

var Settings =
{
    DefaultTimeEntryRateFields:
    {
        Rate:'375.00',
        Title:'24'
    },
    TimeEntryErrorValues:
    {
        Matched:'1',
        NoEntry:'2',
        DuplicateEntry:'3'
    }
};

function automateBillingAndTitle(timeEntryObj,billingRateTable,columns)
{
    var billRateResult = billingRateTable[timeEntryObj.employee];

    if ( !billRateResult )
    {
        timeEntryObj.custcol_bill_table_lookup_status = Settings.TimeEntryErrorValues.NoEntry;
        timeEntryObj.custcol_time_entry_billing_rate_table = '';
        timeEntryObj.custcol_time_entry_billing_title = Settings.DefaultTimeEntryRateFields.Title;
        timeEntryObj.custcol_time_entry_billing_rate = Settings.DefaultTimeEntryRateFields.Rate;
    }
    else if ( billRateResult === 'DUPLICATE' )
    {
        timeEntryObj.custcol_bill_table_lookup_status = Settings.TimeEntryErrorValues.DuplicateEntry;
        timeEntryObj.custcol_time_entry_billing_rate_table = '';
        timeEntryObj.custcol_time_entry_billing_title = Settings.DefaultTimeEntryRateFields.Title;
        timeEntryObj.custcol_time_entry_billing_rate = Settings.DefaultTimeEntryRateFields.Rate;
    }
    else
    {
        var tableEntryID = billRateResult.getId();
        var tableEntryTitle = billRateResult.getValue(columns[0]);
        var tableEntryRate = billRateResult.getValue(columns[1]);

        timeEntryObj.custcol_bill_table_lookup_status = Settings.TimeEntryErrorValues.Matched;
        timeEntryObj.custcol_time_entry_billing_rate_table = tableEntryID;
        timeEntryObj.custcol_time_entry_billing_title = tableEntryTitle;
        timeEntryObj.custcol_time_entry_billing_rate = tableEntryRate;
    }

    // Find the appropriate service item.  If project class is not specified, we cannot look up the service item.
    if ( timeEntryObj.class && timeEntryObj.class != '')
    {
        if ( billingRateTable.class && billingRateTable.class[timeEntryObj.class] )
        {
            timeEntryObj.item = billingRateTable.class[timeEntryObj.class];
        }
        else
        {
            var serviceItemFilters = [];
            serviceItemFilters.push(new nlobjSearchFilter('class',null,'anyof',timeEntryObj.class));
            serviceItemFilters.push(new nlobjSearchFilter('isinactive',null,'is','F'));

            var serviceItem = nlapiSearchRecord('serviceitem',null,serviceItemFilters);

            if ( serviceItem )  // There can be only 1
            {
                timeEntryObj.item = serviceItem[0].getId();

                if ( billingRateTable.class )
                    billingRateTable.class[timeEntryObj.class] = timeEntryObj.item;
            }
        }
    }
}