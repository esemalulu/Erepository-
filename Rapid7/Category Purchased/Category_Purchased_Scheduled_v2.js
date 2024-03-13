/*
 * @author efagone
 */

/*
 * DEPLOYMENT
 * 
 * - skulock new category fields on tran columns
 * - update incorrect cat purchased lines due to maintenance express/perpetual (https://system.sandbox.netsuite.com/app/common/search/searchresults.nl?searchid=18975)
 * 
 * 
 */

var timeLimitInMinutes = 100;
var timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
var startingTime = new Date().getTime();
var context = nlapiGetContext();
var rescheduleScript = false;
var arrYearsToRun = getYearsToRun();
var objCategoryPurchasedDetailMap = null;

/*
 * custentityr7copiedfromllc - Copied from R7 LLC
 * custentityr7linkedcustomer - Linked Customer
 */
var searchFields = ['custentityr7copiedfromllc', 'custentityr7linkedcustomer'];

function run_category_purchased_logic_sched() {

    try {
        //***********Lifetime and Active need to run BEFORE Inactive************
        updateCustomerCategoryPurchased_NoTransactions();
        updateCustomerCategoryPurchased_Lifetime_Active();
       // updateCustomerCategoryPurchased_Inactive();
      //  updateCustomerStatus();

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

function updateCustomerCategoryPurchased_NoTransactions() {

    //customsearchzc_scriptcatpurch_custwotran - SCRIPT - Category Purchased: Customers w/o Transactions          
    if (rescheduleScript) {
        return;
    }

    nlapiLogExecution('AUDIT', 'Running updateCustomerCategoryPurchased_NoTransactions', 'Now');
    var processbeginTime = new Date();
    var arrResults = nlapiSearchRecord('customer', 'customsearchzc_scriptcatpurch_custwotran');
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchzc_scriptcatpurch_custwotran for all years', (new Date().getTime() - processbeginTime.getTime()) / 1000);
    nlapiLogExecution('AUDIT', 'Number of transactions results (customsearchzc_scriptcatpurch_custwotran):', (arrResults) ? arrResults.length : 0);

    var countProcessed = 0;
    for (var i = 0; arrResults != null && i < arrResults.length && timeLeft() && unitsLeft(); i++) {

        var columns = arrResults[i].getAllColumns();
        var customerId = arrResults[i].getValue(columns[0]);
        var arrCustomersId = [];
        arrCustomersId.push(customerId);
        var arrNewCatLifetime = '';
        var arrNewCatActive = '';
        var fieldsResults = nlapiLookupField('customer', customerId, searchFields);
        var status;
        // Check,if current customer was copied from R7 LLC and linked customer(old customer) has any cash sales or invoices
        if (fieldsResults.custentityr7copiedfromllc === 'T' && !getSearchResults(fieldsResults.custentityr7linkedcustomer))
        {
            // Linked customer has cashsales or invoice, then lets check if we need to recalculate category-active and category-lifetime.
            // If getCategoryActiveArray() function will return some values, then use them, if will not, then copy values from linked customer
            // It means that linked customer has actual values in those fields and there is no need to recalculate them
            var arrCatLifeTime = getCategoryActiveArray(fieldsResults.custentityr7linkedcustomer, 0);
            if (arrCatLifeTime)
            {
                arrNewCatLifetime = (arrCatLifeTime.strNewCatLifetime) ? arrCatLifeTime.strNewCatLifetime.split(',') : [];
                arrNewCatActive = (arrCatLifeTime.strNewCatActive) ? arrCatLifeTime.strNewCatActive.split(',') : [];
                arrCustomersId.push(fieldsResults.custentityr7linkedcustomer);
                status = nlapiLookupField('customer', fieldsResults.custentityr7linkedcustomer, 'entitystatus');
            }
            else
            {
                var values = nlapiLookupField('customer', fieldsResults.custentityr7linkedcustomer, ['custentityr7categorylifetime', 'custentityr7categoryactive', 'entitystatus']);
                arrNewCatLifetime = (values.custentityr7categorylifetime) ? values.custentityr7categorylifetime.split(',') : [];
                arrNewCatActive = (values.custentityr7categoryactive) ? values.custentityr7categoryactive.split(',') : [];
                status = values.entitystatus;
            }
        }

        var fields = [];
        fields[0] = 'custentityr7categoryinactive';
        fields[1] = 'custentityr7categorylifetime';
        fields[2] = 'custentityr7categoryactive';
        fields[3] = 'custentityr7categoryactivelastchecked';

        var values = [];
        values[0] = '';
        values[1] = arrNewCatLifetime;
        values[2] = arrNewCatActive;
        values[3] = nlapiDateToString(getPSTDate(), 'datetimetz');
        // Set status to customers
        if (status)
        {
            fields[4] = 'entitystatus';
            values[4] = status;
        }

        // Update values in fields for both customers(linked and main)
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
            arrResults = nlapiSearchRecord('customer', 'customsearchzc_scriptcatpurch_custwotran');
            i = -1;
        }
    }
    nlapiLogExecution('AUDIT', 'Number of transactions processed (customsearchzc_scriptcatpurch_custwotran):', countProcessed);
    return true;
}
/*
 * Params:
 * linkedCustomerId - id of customer from linked field
 * Description:
 * This function calls saved search SCRIPT - Category Purchased: Customers w/o Transactions for linked customer.
 * If serach returns any results, it means that linked customre hasn't any cashsales or invoices
 */
function getSearchResults(linkedCustomerId)
{
    if (!linkedCustomerId)
    {
        return false;
    }
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', null, 'is', linkedCustomerId));
    var results = nlapiSearchRecord('customer', 'customsearchzc_scriptcatpurch_custwotran', arrFilters);
    if (results && results.length > 0)
    {
        return true;
    }
    return false;
}

function updateCustomerCategoryPurchased_Lifetime_Active() {

    //customsearchr7_catpurch_cust_life_active - SCRIPT - Customer Category Purchased v2015 (Category Lifetime, Active)
    if (rescheduleScript) {
        return;
    }
    for (var k = 0; k < arrYearsToRun.length && timeLeft() && unitsLeft(); k++) {

        nlapiLogExecution('AUDIT', 'Running Year: ' + arrYearsToRun[k], 'Now');
        var processbeginTime = new Date();
        var arrResults = getActiveInactiveSearchResults(k, null, 'customsearchr7_catpurch_cust_life_active');
        nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchr7_catpurch_cust_life_active for ' + arrYearsToRun[k], (new Date().getTime() - processbeginTime.getTime()) / 1000);

        if (!arrResults) {
            nlapiLogExecution('AUDIT', 'No results found (customsearchr7_catpurch_cust_life_active): ' + arrYearsToRun[k], 'moving on');
            continue;
        }

        nlapiLogExecution('AUDIT', 'Number of transactions results (customsearchr7_catpurch_cust_life_active): ' + arrYearsToRun[k], arrResults.length);

        var countProcessed = 0;
        for (var i = 0; arrResults != null && i < arrResults.length && timeLeft() && unitsLeft(); i++) {

            var columns = arrResults[i].getAllColumns();
            var arrCustomersId = [];
            arrCustomersId.push(arrResults[i].getValue(columns[0]));
            var strNewCatLifetime = arrResults[i].getValue(columns[3]);
            var strNewCatActive = arrResults[i].getValue(columns[7]);

            var fieldsResults = nlapiLookupField('customer', arrResults[i].getValue(columns[0]), searchFields);
            // If linked customer field is not null, then we need to calculate catagory-active and category-lifetime for both customers
            if (fieldsResults.custentityr7linkedcustomer)
            {
                arrCustomersId.push(fieldsResults.custentityr7linkedcustomer);
                // Run the savedsearch on linked customer and get category-active and category-lifetime for linked customer.
                var arrCatLifeTime = getCategoryActiveArray(fieldsResults.custentityr7linkedcustomer, k);
                var linkedStrNewCatLifetime = '';
                var linkedStrNewCatActive = '';
                if (arrCatLifeTime)
                {
                    linkedStrNewCatLifetime = arrCatLifeTime.strNewCatLifetime;
                    linkedStrNewCatActive = arrCatLifeTime.strNewCatActive;
                }
                else
                {
                    var values = nlapiLookupField('customer', fieldsResults.custentityr7linkedcustomer, ['custentityr7categorylifetime', 'custentityr7categoryactive']);
                    linkedStrNewCatLifetime = values.custentityr7categorylifetime;
                    linkedStrNewCatActive = values.custentityr7categoryactive;
                }

                //Concatenate results of linked customer and main(current) customer
                strNewCatLifetime = strNewCatLifetime + ',' + linkedStrNewCatLifetime;
                strNewCatActive = strNewCatActive + ',' + linkedStrNewCatActive;
            }

            var arrNewCatLifetime = (strNewCatLifetime) ? unique(strNewCatLifetime.split(',')) : [];
            var arrNewCatActive = (strNewCatActive) ? unique(strNewCatActive.split(',')) : [];

            var fields = [];
            fields[0] = 'custentityr7categorylifetime';
            fields[1] = 'custentityr7categoryactive';
            fields[2] = 'custentityr7categoryactivelastchecked';

            var values = [];
            values[0] = arrNewCatLifetime;
            values[1] = arrNewCatActive;
            values[2] = nlapiDateToString(getPSTDate(), 'datetimetz');

            // Update category-active and category-lifetime for both customers(linked and main)
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
                arrResults = getActiveInactiveSearchResults(k, null, 'customsearchr7_catpurch_cust_life_active');
                i = -1;
            }
        }
        nlapiLogExecution('AUDIT', 'Number of transactions processed (customsearchr7_catpurch_cust_life_active): ' + arrYearsToRun[k], countProcessed);
    }

    return true;
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
/*
 * Description:
 * This function get results from savedsearch and returns array with category-active's and category-lifetime's ids 
 */
function getCategoryActiveArray(linkedCustomerId, k)
{
    var resultes = getActiveInactiveSearchResults(k, linkedCustomerId, 'customsearchr7_catpurch_cust_life_active');
    if (resultes && resultes.length === 1) {
        var columns = resultes[0].getAllColumns();
        return {strNewCatLifetime: resultes[0].getValue(columns[3]),
            strNewCatActive: resultes[0].getValue(columns[7])};
    }
    return null;
}

function updateCustomerCategoryPurchased_Inactive() {

    //customsearchr7_catpurch_cust_inactive - SCRIPT - Customer Category Purchased v2015 (Category Inactive)
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

    var arrYears = [];

    //adding a day just in case of any timezone issues,dont want to lose a year
    var now = nlapiAddDays(new Date(), 1);
    var currentYear = now.getFullYear();

    for (var y = 2006; y <= currentYear; y++) {
        arrYears.push(y.toString());
    }

    return arrYears;
}

function grabCategoryPurchasedDetailMap() {

    if (objCategoryPurchasedDetailMap) {
        return objCategoryPurchasedDetailMap;
    }

    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('internalid'));
    arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_custstatusmap'));
    arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_expirationfield'));
    arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_daystillexpire'));
    arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_daystoremaininactiv'));
    arrColumns.push(new nlobjSearchColumn('custrecordr7catpurch_excludecuststatus'));

    var arrResults = nlapiSearchRecord('customrecordr7categorypurchased', null, null, arrColumns);

    objCategoryPurchasedDetailMap = {};

    for (var i = 0; arrResults != null && i < arrResults.length; i++) {

        var objCategory = {};

        objCategory.internalid = arrResults[i].getValue('internalid');
        objCategory.custrecordr7catpurch_custstatusmap = arrResults[i].getValue('custrecordr7catpurch_custstatusmap');
        objCategory.custrecordr7catpurch_expirationfield = arrResults[i].getValue('custrecordr7catpurch_expirationfield');
        objCategory.custrecordr7catpurch_daystillexpire = parseInt(arrResults[i].getValue('custrecordr7catpurch_daystillexpire') || 0);
        objCategory.custrecordr7catpurch_daystoremaininactiv = parseInt(arrResults[i].getValue('custrecordr7catpurch_daystoremaininactiv') || 0);
        objCategory.custrecordr7catpurch_excludecuststatus = arrResults[i].getValue('custrecordr7catpurch_excludecuststatus');

        objCategoryPurchasedDetailMap[objCategory.internalid] = objCategory;
    }

    return objCategoryPurchasedDetailMap;
}

function getPSTDate() {
    var now = new Date();
    now.setHours(now.getHours() + 3);
    return now;
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