/*
 Library of Commonly used Functions
 */

var DEBUG = nlapiGetContext().getPreference('custscript_tjinc_produce_logs').toString() === 'T';

var TJINC = TJINC || {};

TJINC.Log = {
    Debug: function (parms) {
        if (DEBUG) {
            nlapiLogExecution('DEBUG', parms.Title, parms.Details);
        }
    },
    Error: function (parms) {
        if (DEBUG) {
            nlapiLogExecution('ERROR', parms.Title, parms.Details);
        }
    }
};

//Returns the Month within the Months/Days Custom Record on Trajectory's account
function giveMonths(internalID) {
    var filters = new Array();
    filters [0] = new nlobjSearchFilter('internalid', null, 'is', internalID);
    var columns = new Array();
    columns [0] = new nlobjSearchColumn('custrecord_months');
    try {
        var Months = nlapiSearchRecord('customrecord_month', null, filters, columns);
        var month = Months [0].getValue('custrecord_months', null, null);
        return month;
    } catch (err) {
        return 0;
    }
}
// Returns the Day within the Months/Days Custom Record on Trajectory's account
function giveDays(internalID) {
    var filters = new Array();
    filters [0] = new nlobjSearchFilter('internalid', null, 'is', internalID);
    var columns = new Array();
    columns [0] = new nlobjSearchColumn('custrecord_days');
    try {
        var Days = nlapiSearchRecord('customrecord_month', null, filters, columns);
        var day = Days [0].getValue('custrecord_days', null, null);
        return day;
    } catch (err) {
        return 0;
    }
}
// Returns: Returns the Month within the Months/Days Custom Record on Trajectory's account
function frequencyGiveMonths(internalID) {
    var filters = new Array();
    filters [0] = new nlobjSearchFilter('internalid', null, 'is', internalID);
    var columns = new Array();
    columns [0] = new nlobjSearchColumn('custrecord_frmonths');
    try {
        var Months = nlapiSearchRecord('customrecord_frequency', null, filters, columns);
        var month = Months [0].getValue('custrecord_frmonths', null, null);
        return month;
    } catch (err) {
        return 0;
    }
}
// Returns a consecutive ID for the last RA transaction
function IssueRAId() {
    try {
        var LastRAID = nlapiLoadRecord('customrecord_globalvariables', '1');
        var lastID = parseFloat(LastRAID.getFieldValue('custrecord_racounter')) + 1;
        LastRAID.setFieldValue('custrecord_racounter', lastID);
        nlapiSubmitRecord(LastRAID, false, true);
        return lastID;
    } catch (err) {
        return 0;
    }
}

function getStringValue(fieldValue) {
    'use strict';
    return isNotBlank(fieldValue) ? fieldValue.toString() : null;
}

function getIntegerValue(fieldValue) {
    'use strict';
    return isNumber(fieldValue) ? parseInt(fieldValue, 10) : -1
}

function getFloatValue(fieldValue) {
    'use strict';
    return isNumber(fieldValue) ? parseFloat(fieldValue) : parseFloat(-1);
}

function isBlank(s) {
    'use strict';
    return s === undefined || s === null || s === '' || s.length < 1;
}

function isNotBlank(s) {
    'use strict';
    return !isBlank(s);
}

function isNumber(n) {
    'use strict';
    return isNotBlank(n) && !isNaN(parseInt(n, 10)) && isFinite(n);
}

function isNotNull(checkThis) {
    if (checkThis == null)
        return false;
    else
        return (trim(checkThis != null) && (trim(checkThis) != ''));
}
function isNull(checkThis) {
    return !(isNotNull(checkThis));
}
function trim(stringToTrim) {
    if (stringToTrim == null)
        return stringToTrim;
    return stringToTrim.toString().replace(new RegExp("/^\s+|\s+$/g"), "");
}
function ltrim(stringToTrim) {
    if (stringToTrim == null)
        return stringToTrim;
    return stringToTrim.toString().replace(new RegExp("/^\s+/"), "");
}
function rtrim(stringToTrim) {
    if (stringToTrim == null)
        return stringToTrim;
    return stringToTrim.toString().replace(new RegExp("/\s+$/"), "");
}
function getErrorMsg(errorObj) {
    var errMessage = errorObj;
    if (errMessage == '[object nlobjError]')
        return trim(errMessage.getDetails() + errMessage.getStackTrace());
    else
        return errorObj;
}
function errText(_e) {
    try {
        _internalId = nlapiGetRecordId();
        if (!(typeof _internalId === 'number' && (_internalId % 1) === 0)) {
            _internalId = 0;
        }
    } catch(e){}
    var txt = '';
    if (_e instanceof nlobjError) {
        //this is netsuite specific error
        txt = 'NLAPI Error: Record ID :: ' + _internalId + ' :: ' + _e.getCode() + ' :: ' + _e.getDetails() + ' :: ' + _e.getStackTrace().join(', ');
    } else {
        //this is generic javascript error
        txt = 'JavaScript/Other Error: Record ID :: ' + _internalId + ' :: ' + _e.toString() + ' : ' + _e.stack;
    }
    return txt;
}

/*
 * @Function: getValueListRecord @Purpose: Get a values field for specific custom record field. @Parameters: record: Is the kind of record to make the search. recordid: Internal Id
 * of the record to do the search. fieldid: Internal id of the record to get the value. @Returns: Value of the field requested.
 */
function getValueListRecord(record, recordid, fieldid) {

    try {
        // General search for custom records list.
        return nlapiSearchRecord(record, null, new nlobjSearchFilter('internalid', null, 'is', recordid), new nlobjSearchColumn(fieldid)) [0]
            .getValue(fieldid);
    } catch (e) {
        nlapiLogExecution('DEBUG', 'Error when Searching a Field within a Record on getValueListRecord.', getErrorMsg(e));
        return '-1';
    }
}

/*
 * @Funtion: CalcLastInvoiceDate @Purpose: Defines the next Invoice date using the last invoice date (day within the month) and today's date @Parameters: i_daylstinvdt (Day within
 * the month - 1 to 31) @Returns: Returns the date of the invoice.
 */
function CalcLastInvoiceDate(i_daylstinvdt) {

    nlapiLogExecution('DEBUG', 'Running CalcLastInvoiceDate');
    var i_date = parseInt(new Date().getDate()).toFixed(0);
    var i_month = parseInt(new Date().getMonth()).toFixed(0);
    var i_year = parseInt(new Date().getFullYear()).toFixed(0);
    var i_nextinvoicedate = i_date;
    var i_nextinvoicemonth = i_month;
    var i_nextinvoiceyear = i_year;

    if (i_daylstinvdt >= i_date - 5) { // Lets invoice this month ensuring that invoices that might be on hold up to 5 days are still invoiced this month
        // By using a minimum date we ensure that months with 28, 29 or 30 days are not invoiced on the 31st (we invoice on the last day of the month)
        var i_lastdaythismonth = parseInt((new Date((new Date(i_year, i_month + 1, 1)) - 1)).getDate());
        i_nextinvoicedate = Math.min(i_daylstinvdt, i_lastdaythismonth);
        i_nextinvoicemonth = i_month;
        i_nextinvoiceyear = i_year;
    } else { // Lets invoice next month
        i_nextinvoicedate = parseInt(i_daylstinvdt);
        if (i_month == 11) {
            i_nextinvoiceyear = parseInt(i_year) + 1;
            i_nextinvoicemonth = 0;
        } else {
            i_nextinvoiceyear = parseInt(i_year);
            i_nextinvoicemonth = parseInt(i_month) + 1;
        }
    }
    nlapiLogExecution('DEBUG', 'Completed CalcLastInvoiceDate');
    return nlapiDateToString(new Date(i_nextinvoiceyear, i_nextinvoicemonth, i_nextinvoicedate));

}

function formatNumber(num, prefix) {
    prefix = prefix || '';
    num += '';
    var splitStr = num.split('.');
    var splitLeft = splitStr [0];
    var splitRight;
    if (splitStr.length > 1) {
        if ((splitStr [1].length) > 2)
            splitRight = '.' + splitStr [1].substring(0, 2);
        else
            splitRight = '.' + splitStr [1];
    } else
        splitRight = '.00';
    var regx = /(\d+)(\d{3})/;
    while (regx.test(splitLeft))
        splitLeft = splitLeft.replace(regx, '$1' + ',' + '$2');
    return prefix + splitLeft + splitRight;
}

// Date Related variables
var MONTH_NAMES = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec');
var DAY_NAMES = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri',
    'Sat');
function LZ(x) {
    return (x < 0 || x > 9 ? "" : "0") + x;
}

// ------------------------------------------------------------------
// formatDate (date_object, format)
// Returns a date in the output format specified.
// The format string can be of the following:
// ------------------------------------------------------------------
// These functions use the same 'format' strings as the
// java.text.SimpleDateFormat class, with minor exceptions.
// The format string consists of the following abbreviations:

// Field | Full Form | Short Form
// -------------+--------------------+-----------------------
// Year | yyyy (4 digits) | yy (2 digits), y (2 or 4 digits)
// Month | MMM (name or abbr.)| MM (2 digits), M (1 or 2 digits)
// | NNN (abbr.) |
// Day of Month | dd (2 digits) | d (1 or 2 digits)
// Day of Week | EE (name) | E (abbr)
// Hour (1-12) | hh (2 digits) | h (1 or 2 digits)
// Hour (0-23) | HH (2 digits) | H (1 or 2 digits)
// Hour (0-11) | KK (2 digits) | K (1 or 2 digits)
// Hour (1-24) | kk (2 digits) | k (1 or 2 digits)
// Minute | mm (2 digits) | m (1 or 2 digits)
// Second | ss (2 digits) | s (1 or 2 digits)
// AM/PM | a |

// NOTE THE DIFFERENCE BETWEEN MM and mm! Month=MM, not mm!
// Examples:
// "MMM d, y" matches: January 01, 2000
// Dec 1, 1900
// Nov 20, 00
// "M/d/yy" matches: 01/20/00
// 9/2/00
// "MMM dd, yyyy hh:mm:ssa" matches: "January 01, 2000 12:30:45AM"
// ------------------------------------------------------------------
function formatDate(date, format) {
    format = format + "";
    var result = "";
    var i_format = 0;
    var c = "";
    var token = "";
    var y = date.getYear() + "";
    var M = date.getMonth() + 1;
    var d = date.getDate();
    var E = date.getDay();
    var H = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();
    // var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,KK,K,kk,k;
    // Convert real date parts into formatted versions
    var value = new Object();
    if (y.length < 4) {
        y = "" + (y - 0 + 1900);
    }
    value ["y"] = "" + y;
    value ["yyyy"] = y;
    value ["yy"] = y.substring(2, 4);
    value ["M"] = M;
    value ["MM"] = LZ(M);
    value ["MMM"] = MONTH_NAMES [M - 1];
    value ["NNN"] = MONTH_NAMES [M + 11];
    value ["d"] = d;
    value ["dd"] = LZ(d);
    value ["E"] = DAY_NAMES [E + 7];
    value ["EE"] = DAY_NAMES [E];
    value ["H"] = H;
    value ["HH"] = LZ(H);
    if (H == 0) {
        value ["h"] = 12;
    } else if (H > 12) {
        value ["h"] = H - 12;
    } else {
        value ["h"] = H;
    }
    value ["hh"] = LZ(value ["h"]);
    if (H > 11) {
        value ["K"] = H - 12;
    } else {
        value ["K"] = H;
    }
    value ["k"] = H + 1;
    value ["KK"] = LZ(value ["K"]);
    value ["kk"] = LZ(value ["k"]);
    if (H > 11) {
        value ["a"] = "PM";
    } else {
        value ["a"] = "AM";
    }
    value ["m"] = m;
    value ["mm"] = LZ(m);
    value ["s"] = s;
    value ["ss"] = LZ(s);
    while (i_format < format.length) {
        c = format.charAt(i_format);
        token = "";
        while ((format.charAt(i_format) == c) && (i_format < format.length)) {
            token += format.charAt(i_format++);
        }
        if (value [token] != null) {
            result = result + value [token];
        } else {
            result = result + token;
        }
    }
    return result;
}

function replaceAll(streng, soeg, erstat) {
    var st = streng;
    if (soeg.length == 0)
        return st;
    var idx = st.indexOf(soeg);
    while (idx >= 0) {
        st = st.substring(0, idx) + erstat + st.substr(idx + soeg.length);
        idx = st.indexOf(soeg);
    }
    return st;
}

/*
 * @Funtion: prepareEmailToSend @Purpose: Prepares the information required for an email for either an Invoice (Action = 1) or a Sales Order/Opportunity (Action = 2) @Parameters:
 * CustomerId, JobId, SalesOrderId, InvoiceId, email body, type and action @Returns: Returns true if the process was ok, or false if there are a problem.
 */
function prepareEmailToSend(s_customerId, s_jobId, s_salesorderid, s_invoiceid, s_body1, s_type, i_action) {

    try {
        nlapiLogExecution('DEBUG', 'Running prepareEmailToSend');

        // var arr_filters = new Array();
        // var arr_column = new Array();
        var arr_emailcc = new Array();
        var s_recipientEmail;
        var s_contact = '';
        var s_salesRepId;
        var s_projcrep;
        // var o_search;
        var SENDER_EMAIL = '15526'; // This is the Employee, what we use to send the email to our customers.
        var s_subject = 'Invoice Acknowledgment';
        var s_body = 'This customer does not have a contact to send the Invoice.';
        var b_invoice = true;

        // We are processing an Invoice (It has a Template, PDF and will be sent to the Customer with cc to Sales Rep & Project Manager)
        if (i_action == 1) {
            // Lets find the Contact(s) that should be copied on the invoice email

            var arr_result = searchByType(7, s_salesorderid);
            if (arr_result.length > 1) { // We got at least one contact, lets define recipient and cc.
                // HP- s_recipientEmail = arr_result[0]; // Contact email
                s_recipientEmail = arr_result [1]; // Contact Internal ID
                s_contact = arr_result [1]; // Contact Internal ID
                for (var i = 2; i < arr_result.length; i++)
                    arr_emailcc.push(arr_result [i]); // Array of emails
            } else {
                // HP- s_recipientEmail = 'aolano@trajectoryin.com';
                s_recipientEmail = '-5';
                s_subject += ' - This Record does not have an active contact to send the Invoice.';
                s_body = 'Dear Sales Rep, <br/><br/>This is the invoice created by the billing automation process.<br/> this Invoice should be forwarded to the customer. <br/> Regards, <br/><br/>Billing Process';
                b_invoice = false;
            }

            // Lets find out who is the Sales Rep for this customer and lets add its email to the Array to be cc
            s_salesRepId = searchByType(2, s_customerId);
            if ((s_salesRepId == '-1') || (isNull(s_salesRepId)))
                s_salesRepId = '-5'; // There is NO Sales Rep, The email will be sent from the General Admon email (aolano@kuspide.com)

            arr_emailcc.push(searchByType(5, s_salesRepId)); // Add Sales Rep email as a cc

            // Lets find out who is the Project Manager for the Job
            s_projcrep = searchByType(3, s_jobId);
            if ((s_projcrep != '-1') && (isNotNull(s_projcrep)))
                arr_emailcc.push(s_projcrep); // Add Project Manager as a cc

            arr_emailcc.push('aolano@trajectoryinc.com'); // Alex likes to be copyied of everything :(

            nlapiLogExecution('DEBUG', 'To Send the Email:', 'SENDER_EMAIL: ' + SENDER_EMAIL + ' s_recipientEmail: ' + s_recipientEmail
                + ' s_subject : ' + s_subject);
            nlapiLogExecution('DEBUG', 'Body Email:', 's_body: ' + s_body);
            nlapiLogExecution('DEBUG', 'To Send the Email:', 'arr_emailcc: ' + arr_emailcc + ' s_invoiceid: ' + s_invoiceid + ' s_contact : '
                + s_contact);

            if (b_invoice) // There are Contacts that will receive the invoice... Let's send the invoice direclty to the customer
                return mySendEmail(SENDER_EMAIL, s_recipientEmail, s_subject, s_body, arr_emailcc, s_invoiceid, s_contact, 1);
            else
            // Something is wrong, lets send an error email to the Sales Rep
                return mySendEmail(SENDER_EMAIL, s_recipientEmail, s_subject, s_body, arr_emailcc, s_invoiceid, s_contact, 2);

        }
        // We are processing a Sales Order or an Opportunity (The email does not have a Template/PDF and will be sent to the Sales Rep)
        else if (i_action == 2) {

            var i_salesRepId = searchByType(4, s_salesorderid);
            if ((i_salesRepId != '-1') && (isNotNull(i_salesRepId))) {
                s_recipientEmail = searchByType(5, i_salesRepId); // Sales Rep email
                if (s_recipientEmail != '-1') {
                    nlapiLogExecution('DEBUG', 'Completed prepareEmailToSend');
                    return mySendEmail('-5', s_recipientEmail, 'New ' + s_type + ' Record. ', s_body1, null, s_invoiceid, null, 2);
                } else {
                    nlapiLogExecution('DEBUG', 'Failure to send the email, The process does not find a valid email to the Sales Rep.');
                    return false;
                }
            }

            return false;
        }
    } catch (e) {

        nlapiLogExecution('AUDIT', 'Failure to send the email to: ' + s_customerId, getErrorMsg(e));
        nlapiLogExecution('ERROR', 'Failure to send the email to: ' + s_customerId, getErrorMsg(e));
        return false;
    }
}

/*
 * @Funtion: mySendEmail @Purpose: Sends three types of emails: 1 = With Template and PDF, 2 = With PDF, 3 = Just the email @Parameters: from, to, subject, body, cc email, Invoice
 * InternalID, Contact InternalID and Action to be performed (1, 2 or 3) @Returns: Returns true if the process was ok, or false if there are a problem.
 */
function mySendEmail(s_employee, s_recipient, s_subject, o_body, o_cc, o_invoiceid, o_contactid, i_action) {
    try {
        nlapiLogExecution('DEBUG', 'MSE_1 Running mySendEmail', 's_employee: ' + s_employee + ' s_recipient : ' + s_recipient + ' s_subject : '
            + s_subject + ' o_invoiceid :' + o_invoiceid + ' i_action: ' + i_action);
        var o_file = null;
        var o_records = null;
        if (o_invoiceid == null)
            i_action = 0;
        if (isNotNull(o_cc) && (o_cc.length == 0))
            o_cc = null;

        nlapiLogExecution('DEBUG', 'MSE_2  O_CC Validation');
        // We are using an email template
        if ((i_action == 1) && (isNotNull(o_invoiceid)) && (isNotNull(o_contactid))) {
            nlapiLogExecution('DEBUG', 'MSE_3 Start Action 1 ');
            var o_fields = new Object();
            o_fields ['NLFIRSTNAME'] = o_contactid;
            o_fields ['NLTRANID'] = o_invoiceid;
            o_fields ['NLCOMPANY'] = o_contactid;
            o_body = nlapiMergeRecord('4', 'invoice', o_invoiceid, 'contact', o_contactid, o_fields);
            o_body = o_body.getValue();

            o_records = new Object();
            o_records ['transaction'] = o_invoiceid;

            nlapiLogExecution('DEBUG', 'MSE_4 END Action 1 ');
        }

        // We are sending a Transaction in PDF form
        if ((i_action == 1) || (i_action == 2)) {
            try {
                nlapiLogExecution('DEBUG', 'MSE_5 Print Record Default ');
                o_file = nlapiPrintRecord('TRANSACTION', o_invoiceid, 'DEFAULT', null);
            } catch (e) {
                nlapiLogExecution('DEBUG', 'MSE_6 Print Record HTM');
                o_file = nlapiPrintRecord('TRANSACTION', o_invoiceid, 'HTML', null);
            }
        }

        nlapiLogExecution('DEBUG', 'MSE_7 Before Send Email');
        // Lets send the email
        nlapiSendEmail(s_employee, s_recipient, s_subject, o_body, o_cc, null, o_records, o_file);

        nlapiLogExecution('DEBUG', 'MSE_8 Completed mySendEmail');
        return true;
    } catch (e) {
        nlapiLogExecution('ERROR', 'MSE_9 Failure process mySendEmail, email to: ' + s_recipient, 'ERROR: ' + getErrorMsg(e));
        return false;
    }
}

/*
 * @Funtion: searchByType @Purpose: There are too many ID's, emails and Arrays searches going on, This function will be used for all those cases i_type = 1 Customer Search - Return
 * an Array of emails for all Contacts marked for a given a Customer i_type = 2 Customer Search - Returns Sales Rep (Employee) Internal ID i_type = 3 Job Search - Returns Remote
 * Administrator email i_type = 4 Sales Order Search - Returns the Sales Rep ID (assigned to the Sales Order) i_type = 5 Employee Search - Returns the Employee email i_type = 6 Job
 * Search - Returns Remote Administrator (Employee) Internal ID @Parameters: i_type is the case, s_value filter field to do the search. @Returns: The resul of the result search in
 * case of error returns a -1.
 */
function searchByType(i_type, s_value) {

    try {
        nlapiLogExecution('DEBUG', 'Running searchByType');

        var o_search;
        var arr_filters = new Array();
        var arr_column = new Array();

        if (i_type == 1) { // i_type = 1 Customer Search - Return an Array of emails for all Contacts marked for a given a Customer

            arr_filters.push(new nlobjSearchFilter('company', null, 'is', s_value));
            arr_filters.push(new nlobjSearchFilter('custentity_sendinvoice', null, 'is', 'T'));
            arr_column.push(new nlobjSearchColumn('email'));
            o_search = nlapiSearchRecord('contact', null, arr_filters, arr_column);

            var arr_result = new Array();

            if (o_search != null) {
                arr_result.push(o_search [0].getValue('email'));
                arr_result.push(o_search [0].getId());
                for (var i = 1; i < o_search.length; i++)
                    arr_result.push(o_search [i].getValue('email'));
            }

            nlapiLogExecution('DEBUG', 'Completed searchByType');
            return arr_result;
        } else if (i_type == 2) { // i_type = 2 Customer Search - Returns Sales Rep (Employee) Internal ID

            arr_filters.push(new nlobjSearchFilter('internalid', null, 'is', s_value));
            arr_column.push(new nlobjSearchColumn('salesrep'));
            o_search = (nlapiSearchRecord('customer', null, arr_filters, arr_column));

            nlapiLogExecution('DEBUG', 'Completed searchByType');
            if (o_search != null)
                return o_search [0].getValue('salesrep');
            else
                return '-1';
        } else if (i_type == 3) { // i_type = 3 Job Search - Returns Remote Administrator email

            arr_filters.push(new nlobjSearchFilter('internalid', null, 'is', s_value));
            arr_column.push(new nlobjSearchColumn('custentity_remoteadministrator'));
            o_search = (nlapiSearchRecord('job', null, arr_filters, arr_column));

            nlapiLogExecution('DEBUG', 'Completed searchByType');

            if (o_search != null) { // Lets find the email
                var s_projcrep = o_search [0].getValue('custentity_remoteadministrator');
                if (isNotNull(s_projcrep))
                    return (nlapiSearchRecord('employee', null, (new nlobjSearchFilter('internalid', null, 'is', s_projcrep)),
                        (new nlobjSearchColumn('email')))) [0].getValue('email');
                else
                    return '-1';
            } else
                return '-1';
        } else if (i_type == 4) { // i_type = 4 Sales Order Search - Returns the Sales Rep ID (assigned to the Sales Order)

            arr_filters.push(new nlobjSearchFilter('internalid', null, 'is', s_value));
            arr_column.push(new nlobjSearchColumn('salesrep'));
            var salesID = (nlapiSearchRecord('salesorder', null, arr_filters, arr_column));

            nlapiLogExecution('DEBUG', 'Completed searchByType');
            if (isNotNull(salesID))
                return salesID [0].getValue('salesrep');
            else
                return '-1';
        } else if (i_type == 5) { // i_type = 5 Employee Search - Returns the Employee email

            arr_filters.push(new nlobjSearchFilter('internalid', null, 'is', s_value));
            arr_column.push(new nlobjSearchColumn('email'));
            var s_recipient = (nlapiSearchRecord('employee', null, arr_filters, arr_column)) [0].getValue('email');

            nlapiLogExecution('DEBUG', 'Completed searchByType');
            if (isNotNull(s_recipient))
                return s_recipient;
            else
                return '-1';
        } else if (i_type == 6) { // i_type = 6 Job Search - Returns Remote Administrator (Employee) Internal ID

            arr_filters.push(new nlobjSearchFilter('internalid', null, 'is', s_value));
            arr_column.push(new nlobjSearchColumn('custentity_remoteadministrator'));
            o_search = (nlapiSearchRecord('job', null, arr_filters, arr_column));

            nlapiLogExecution('DEBUG', 'Completed searchByType');
            if (o_search != null)
                return s_projcrep = o_search [0].getValue('custentity_remoteadministrator');
            else
                return '-1';
        } else if (i_type == 7) {// When i_type is = to 7, we have to look into the sales order and get the billing contact.

            var arr_result = new Array();
            var s_soContacts = nlapiLookupField('salesorder', s_value, 'custbody_billingcontacts');
            if (isNotNull(s_soContacts)) {

                a_result = s_soContacts.split(',');
                arr_filters.push(new nlobjSearchFilter('internalid', null, 'anyof', a_result));
                arr_column.push(new nlobjSearchColumn('email'));
                o_search = nlapiSearchRecord('contact', null, arr_filters, arr_column);

                if (o_search != null) {
                    arr_result.push(o_search [0].getValue('email'));
                    arr_result.push(o_search [0].getId());
                    for (var i = 1; i < o_search.length; i++)
                        arr_result.push(o_search [i].getValue('email'));
                }

            }
            return arr_result;
        } else if (i_type == 8) { // i_type = 3 Job Search - Returns Remote Administrator email

            arr_filters.push(new nlobjSearchFilter('internalid', null, 'is', s_value));
            arr_column.push(new nlobjSearchColumn('custentity_remoteadministrator'));
            o_search = (nlapiSearchRecord('job', null, arr_filters, arr_column));

            nlapiLogExecution('DEBUG', 'Completed searchByType');

            if (o_search != null) { // Lets find the email
                return s_projcrep = o_search [0].getValue('custentity_remoteadministrator');
            } else
                return '-1';
        }
    } catch (e) {
        nlapiLogExecution('AUDIT', 'Error with searchByType', getErrorMsg(e));
        nlapiLogExecution('ERROR', 'Error with searchByType', getErrorMsg(e));
        return '-1';
    }
}