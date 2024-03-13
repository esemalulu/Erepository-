//Category Inactive

/*
 * STEPS TO RUN 
 * 1 - Run customsearchr7_catpurch_cust_inactive in UI 
 * 2 - If hte result set is high - manipulate the arrYearsToRun()
 * 
 * customsearchr7_catpurch_cust_inactive - SCRIPT - Customer Category Purchased v2015 (Category Inactive)
 * 
 */

var timeLimitInMinutes = 40;
var timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
var startingTime = new Date().getTime();
var context = nlapiGetContext();
var rescheduleScript = false;
var arrYearsToRun = getYearsToRun();
var objCategoryPurchasedDetailMap = null;

var searchFields = ['custentityr7copiedfromllc', 'custentityr7linkedcustomer'];


function run_category_purchased_logic_sched() {

    try {
        //***********Lifetime and Active need to run BEFORE Inactive************
       // updateCustomerCategoryPurchased_NoTransactions();
       // updateCustomerCategoryPurchased_Lifetime_Active();
        updateCustomerCategoryPurchased_Inactive();
        updateCustomerStatus();

        nlapiLogExecution('AUDIT', 'Finished Script', 'Thank you and have a good day.');
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'SCRIPT FAILED', e);
        rescheduleScript = true;
    }

    if (rescheduleScript) {
        nlapiLogExecution('AUDIT', 'Rescheduling script (script/deploy id)', 'yup');
        var status = nlapiScheduleScript(context.getScriptId());
        nlapiLogExecution('DEBUG', 'Schedule Status', status);
    }


}

function updateCustomerCategoryPurchased_Inactive() {

    //customsearchr7_catpurch_cust_inactive - SCRIPT - Customer Category Purchased v2015 (Category Inactive) - Update script 
    if (rescheduleScript) {
        return;
    }

    for (var k = 0; k < arrYearsToRun.length && timeLeft() && unitsLeft(); k++) {

        nlapiLogExecution('AUDIT', 'Running Year: ' + arrYearsToRun[k], 'Now');

        var processbeginTime = new Date();
        var arrResults = getActiveInactiveSearchResults(k, null, 'customsearchr7_catpurch_cust_inactive');

        nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchr7_catpurch_cust_inactive for ' + arrYearsToRun[k], (new Date().getTime() - processbeginTime.getTime()) / 1000);

        if (!arrResults) {
            nlapiLogExecution('AUDIT', 'No results found (customsearchr7_catpurch_cust_inactive): ' + arrYearsToRun[k], 'moving on');
            continue;
        }

        nlapiLogExecution('AUDIT', 'Number of transactions results (customsearchr7_catpurch_cust_inactive): ' + arrYearsToRun[k], arrResults.length);

        var countProcessed = 0;
        for (var i = 0; arrResults != null && i < arrResults.length && timeLeft() && unitsLeft(); i++) {
            var columns = arrResults[i].getAllColumns();
            var customerId = arrResults[i].getValue(columns[0]);
            var strNewCatInactive = arrResults[i].getValue(columns[4]);
            var arrCustomersId = [];
                arrCustomersId.push(arrResults[i].getValue(columns[0]));
            var fieldsResults = nlapiLookupField('customer', arrResults[i].getValue(columns[0]), searchFields);
            // If linked customer field is not null, then we need to calculate catagory-active and category-lifetime for both customers
            if (fieldsResults.custentityr7linkedcustomer)
            {
                arrCustomersId.push(fieldsResults.custentityr7linkedcustomer);
                // Run the savedsearch on linked customer and get category-inactive for linked customer.
                var arrCatLifeTime = getActiveInactiveSearchResults(k, fieldsResults.custentityr7linkedcustomer, 'customsearchr7_catpurch_cust_inactive');
                var linkedStrNewInactive = '';
                if(arrCatLifeTime && arrCatLifeTime.length == 1)
                {
                    linkedStrNewInactive = arrCatLifeTime[0].getValue(columns[4]);
                }
                else
                {
                    linkedStrNewInactive = nlapiLookupField('customer', fieldsResults.custentityr7linkedcustomer, 'custentityr7categoryinactive');
                }
                //Concatenate results of linked customer and main(current) customer
                strNewCatInactive = strNewCatInactive + ',' + linkedStrNewInactive;
             
            }
            var arrNewCatInactive = (strNewCatInactive) ? unique(strNewCatInactive.split(',')) : [];
            nlapiLogExecution('DEBUG', 'Processing customer - cat purchased', customerId);
            
            var fields = [];
            fields[0] = 'custentityr7categoryinactive';
            fields[1] = 'custentityr7categoryactivelastchecked';

            var values = [];
            values[0] = arrNewCatInactive;
            values[1] = nlapiDateToString(getPSTDate(), 'datetimetz');

            for (var a = 0; a < arrCustomersId.length; a++)
            {
                try {
                    nlapiSubmitField('customer', arrCustomersId[a], fields, values);
                    countProcessed++;
                }
                catch (e) {
                    nlapiLogExecution('ERROR', 'Could not submit Categories Purchased for Customer ' + arrCustomersId[a], e);
                }
            }

            if (i == 999) {
                arrResults = nlapiSearchRecord('transaction', 'customsearchr7_catpurch_cust_inactive', arrFilters);
                i = -1;
            }
        }
        nlapiLogExecution('AUDIT', 'Number of transactions processed (customsearchr7_catpurch_cust_inactive): ' + arrYearsToRun[k], countProcessed);
    }
    return true;
}


function updateCustomerStatus() {

    //customsearchr7_customerstatusautomation - SCRIPT - Customer Status Automation v2015
    if (rescheduleScript) {
        return;
    }

    var processbeginTime = new Date();
    var arrResults = nlapiSearchRecord('customer', 'customsearchr7_customerstatusautomation');
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchr7_customerstatusautomation', (new Date().getTime() - processbeginTime.getTime()) / 1000);

    if (!arrResults) {
        nlapiLogExecution('AUDIT', 'No results found (customsearchr7_customerstatusautomation)', 'moving on');
        return true;
    }

    nlapiLogExecution('AUDIT', 'Number of customer results (customsearchr7_customerstatusautomation)', arrResults.length);

    var countProcessed = 0;
    for (var i = 0; arrResults != null && i < arrResults.length && timeLeft() && unitsLeft(); i++) {

        var columns = arrResults[i].getAllColumns();
        var customerId = arrResults[i].getValue(columns[0]);
        var currentStatusId = arrResults[i].getValue(columns[6]);
        var newStatusId = arrResults[i].getValue(columns[7]);

        nlapiLogExecution('DEBUG', 'Processing customer status', customerId);

        var fields = [];
        fields[0] = 'entitystatus';
        fields[1] = 'custentityr7lastcustomerstatus';
        fields[2] = 'custentityr7customerstatuslastmodified';

        var values = [];
        values[0] = newStatusId;
        values[1] = currentStatusId;
        values[2] = nlapiDateToString(getPSTDate(), 'datetimetz');

        try {
            nlapiSubmitField('customer', customerId, fields, values);
            countProcessed++;
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'Could not submit Customer status for customer ' + customerId, e);
        }

        if (i == 999) {
            arrResults = nlapiSearchRecord('customer', 'customsearchr7_customerstatusautomation');
            i = -1;
        }
    }
    nlapiLogExecution('AUDIT', 'Number of customers processed (customsearchr7_customerstatusautomation)', countProcessed);

    return true;
}


function getYearsToRun() {

    var arrYears = []; //Can manipulate this

    //adding a day just in case of any timezone issues,dont want to lose a year
    var now = nlapiAddDays(new Date(), 1);
    var currentYear = now.getFullYear();

    for (var y = 2006; y <= currentYear; y++) {
        arrYears.push(y.toString());
    }

    return arrYears;
}


/*
 * Params:
 * k - year
 * linkedCustomerId - id of customer from linked field
 * searchName - name of saved seach. Possible values are:
 *  1. customsearchr7_catpurch_cust_life_active - SCRIPT - Customer Category Purchased v2015 (Category Lifetime, Active)
 *  2. customsearchr7_catpurch_cust_inactive - SCRIPT - Customer Category Purchased v2015 (Category Inactive)
 * Description:
 * This function calls savedsearch and returns results.
 */
function getActiveInactiveSearchResults(k, linkedCustomerId, searchName)
{
    var arrFilters = [];
    if (k == 0 && !linkedCustomerId) {
        arrFilters.push(new nlobjSearchFilter('datecreated', 'customermain', 'onorbefore', '12/31/' + arrYearsToRun[k]));
    }
    else if (!linkedCustomerId) {
        arrFilters.push(new nlobjSearchFilter('datecreated', 'customermain', 'within', '1/1/' + arrYearsToRun[k], '12/31/' + arrYearsToRun[k]));
    }
    if (linkedCustomerId)
    {
        arrFilters.push(new nlobjSearchFilter('internalid', 'customermain', 'is', linkedCustomerId));
    }
    arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'F'));
    arrFilters.push(new nlobjSearchFilter('taxline', null, 'is', 'F'));
    arrFilters.push(new nlobjSearchFilter('cogs', null, 'is', 'F'));
    arrFilters.push(new nlobjSearchFilter('shipping', null, 'is', 'F'));
    arrFilters.push(new nlobjSearchFilter('isvsoealloc', null, 'is', 'F'));
    return nlapiSearchRecord('transaction', searchName, arrFilters);
}

function timeLeft() {
    var presentTime = new Date().getTime();
    if (rescheduleScript || presentTime - startingTime > timeLimitInMilliseconds) {
        nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
        rescheduleScript = true;
        return false;
    }
    return true;
}

function unitsLeft() {
    var unitsLeft = context.getRemainingUsage();
    if (rescheduleScript || unitsLeft <= 100) {
        nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
        rescheduleScript = true;
        return false;
    }
    return true;
}

function getPSTDate() {
    var now = new Date();
    now.setHours(now.getHours() + 3);
    return now;
}

/*
 * Params:
 * a - array of some values
 * Description:
 * Th function returns array with unique values
 */
function unique(a) {
    a.sort();
    for (var i = 0; i < a.length; ) {
        if (a[i - 1] == a[i] || !a[i]) {
            a.splice(i, 1);
        }
        else {
            i++;
        }
    }
    return a;
}
