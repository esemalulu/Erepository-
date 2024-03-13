function startAttach() {

    var customerToId = nlapiGetFieldValue('custpage_customertoid')
    if (!customerToId) {
        alert('There is no customer selected! Please select a customer to attach the files to.');
        return;
    }
    if (confirm('Are you sure you want to migrate those files?')) {
        var selectedCount = nlapiGetLineItemCount('custpage_files');
        var bSelected = false;
        var filesArr = new Array();
        //Getting all selected files from web form.
        for (var i = 1; i <= selectedCount; i++) {
            var selected = nlapiGetLineItemValue('custpage_files', 'custpage_checkbox', i);
            if (selected == 'T') {
                filesArr.push(nlapiGetLineItemValue('custpage_files', 'custpage_fileid', i));
                bSelected = true;
            }
        }
        if (!bSelected) {
            alert('There are no files to migrate. Please mark a required file(-s)!');
            return;
        }
        var params = new Array();
        params['custparam_filesids'] = filesArr;
        params['custparam_customertoid'] = customerToId;
        // Call r7_customer_migrate_files_suitelet. Method is POST
        var migrateFilesSuiteletUrl = nlapiResolveURL('SUITELET', 'customscript_r7migratefilessuitelet', 'customdeploy_r7migratefilessuitelet', false);
        var reqResp = nlapiRequestURL(migrateFilesSuiteletUrl, params);
        // Redirect to customer or stay at form
        if (confirm('Migration results:' + reqResp.getHeader('Custom-Header-ANSWER') + '\n Do you want to go to the customer record?'))
        {
            window.location = getRiderectUrl(customerToId);
        }
        else
        {
            window.location = migrateFilesSuiteletUrl;
        }
    }
}
function getMigrateUrl() {
    var migrateFilesSuiteletUrl = nlapiResolveURL('SUITELET', 'customscript_r7migratefilessuitelet', 'customdeploy_r7migratefilessuitelet', false);
    migrateFilesSuiteletUrl += '&custparam_customer=' + nlapiGetFieldValue('custpage_customerid');
    migrateFilesSuiteletUrl += '&custparam_customertoid=' + nlapiGetFieldValue('custpage_customertoid');
    migrateFilesSuiteletUrl += '&custparam_customertosubsidiary=' + nlapiGetFieldValue('custpage_customertosubsidiary');
    return migrateFilesSuiteletUrl;
}
function getRiderectUrl(customerId) {
    var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
    var url = '';
    if (nlapiGetContext().getEnvironment() == 'PRODUCTION') {
        url = toURL+'/app/common/entity/custjob.nl?id=' + customerId;
    }
    else
    {
        url = toURL+'/app/common/entity/custjob.nl?id=' + customerId;
    }
    return url;
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
    if(name == 'custpage_customertoid'){
        var customerId = nlapiGetFieldValue('custpage_customertoid');
        if(customerId == nlapiGetFieldValue('custpage_customerid'))
        {
            alert('Customer that you migrate files from and customer that you migrate files to can not be the same. Please select another customer!');
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
        params +=', scrollbars=yes';
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