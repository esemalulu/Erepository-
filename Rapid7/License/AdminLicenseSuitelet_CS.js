
function pageInit() {

    disableAllFields();
}

function fieldChanged(type, name, linenum) {

    if (name == 'custpage_operation') {

        switch (nlapiGetFieldValue('custpage_operation')) {
            case '1':
                disableAllFields();
                nlapiDisableField('custpage_nexposelicense', false);
                nlapiDisableField('custpage_startdate', false);
                nlapiDisableField('custpage_enddate', false);
                //nlapiDisableField('custpage_salesorder', false);
                break;
            case '2':
                disableAllFields();
                nlapiDisableField('custpage_nexposelicense', false);
                nlapiDisableField('custpage_startdate', false);
                nlapiDisableField('custpage_enddate', false);
                //nlapiDisableField('custpage_salesorder', false);
                nlapiDisableField('custpage_assetcount', false);
                break;
            case '3':
                disableAllFields();
                nlapiDisableField('custpage_nexposelicense', false);
                nlapiDisableField('custpage_startdate', false);
                nlapiDisableField('custpage_enddate', false);
                //nlapiDisableField('custpage_salesorder', false);
                nlapiDisableField('custpage_assetcount', false);
                break;
            case '4':
                disableAllFields();
                nlapiDisableField('custpage_nexposelicense', false);
                nlapiDisableField('custpage_nexposelicense2', false);
                nlapiDisableField('custpage_startdate', false);
                nlapiDisableField('custpage_enddate', false);
                //nlapiDisableField('custpage_salesorder', false);
                nlapiDisableField('custpage_assetcount', false);
                break;
            case '5':
                disableAllFields();
                nlapiDisableField('custpage_nexposelicense', false);
                break;
            case '6':
                disableAllFields();
                nlapiDisableField('custpage_nexposelicense', false);
                break;
            case '7':
                disableAllFields();
                nlapiDisableField('custpage_nexposelicense', false);
                break;
            default:
                disableAllFields();
        }
    }
}

function disableAllFields() {
    nlapiSetFieldValue('custpage_nexposelicense', '');
    nlapiSetFieldValue('custpage_nexposelicense2', '');
    nlapiSetFieldValue('custpage_startdate', '');
    nlapiSetFieldValue('custpage_enddate', '');
    //nlapiSetFieldValue('custpage_salesorder', '');
    nlapiSetFieldValue('custpage_assetcount', '');
    nlapiDisableField('custpage_nexposelicense', true);
    nlapiDisableField('custpage_nexposelicense2', true);
    nlapiDisableField('custpage_startdate', true);
    nlapiDisableField('custpage_enddate', true);
    //nlapiDisableField('custpage_salesorder', true);
    nlapiDisableField('custpage_assetcount', true);
}