function pageInit()
{
    if (nlapiGetFieldValue('custpage_result'))
    {
        alert('MIGRATION RESULTS:\n' + nlapiGetFieldValue('custpage_result'));
    }
}

function saveRecord()
{
    var customerToId = nlapiGetFieldValue('custpage_customertoid')
    if (!customerToId) {
        alert('There is no customer selected! Please select a customer to attach the messages to.');
        return false;
    }
    var selectedCount = nlapiGetLineItemCount('custpage_messages');
    var bSelected = false;
    for (var i = 1; i <= selectedCount; i++) {
        var selected = nlapiGetLineItemValue('custpage_messages', 'custpage_checkbox', i);
        if (selected == 'T') {
            bSelected = true;
        }
    }
    if (!bSelected) {
        alert('There are no masseges to migrate. Please mark a required message(-s)!');
        return false;
    }
    else
    {
       if(confirm('Are you sure you want to migrate those messages?'))
       {
           return true;
       }
       else
       {
           return false;
       }
    }
    return true;
}

function closeWindow() {
    window.close();
}

// Field Change event. Sets subsidiary of choosen customer
function fieldChanged(type, name, linenum) {
    if (name == 'custpage_customertoid') {
        var customerId = nlapiGetFieldValue('custpage_customertoid');
        if (!customerId)
            return;
        nlapiSetFieldValue('custpage_customertosubsidiary', nlapiLookupField('customer', customerId, 'subsidiary'));
    }
}

// Field Validate event. Prevent to choose customer that you migrate files.
function fieldValidate(type, name)
{
    if (name == 'custpage_customertoid') {
        var customerId = nlapiGetFieldValue('custpage_customertoid');
        if (customerId == nlapiGetFieldValue('custpage_customerid'))
        {
            alert('Customer that you migrate messages from and customer that you migrate messages to can not be the same. Please select another customer!');
            return false;
        }
    }
    return true;
}

function popUpWindow(url, width, height) {
    var params = '';
    if (width != null && width != '' && height != null && height != '') {
        var left = (screen.width - width) / 2;
        var top = (screen.height - height) / 2;
        params += 'width=' + width + ', height=' + height;
        params += ', menubar=yes';
        params += ', status=yes';
        params += ', scrollbars=yes';
    }
    newwin = window.open(url, null, params);
    if (window.focus) {
        newwin.focus();
    }
    return false;
}

function replaceWindow(url) {
    window.location = url;
    return false;
}