function beforeLoad(type, form) {
    log('beforeLoad', 'type = ' + type + ', form = ' + form);
    if (type == 'edit' || type == 'view') {
        var isPerson = nlapiGetFieldValue('isperson');
        log('beforeLoad', 'isPerson = ' + isPerson);
        // If the company is not an individual / person hide all of the CASL fields that aren't relevant
        if (isPerson == 'F') {
            log('beforeLoad', 'attempting to hide fields');
            form.getField('custentity_canemail').setDisplayType('hidden');
            form.getField('custentity_emailconsentexpirydate').setDisplayType('hidden');
            form.getField('custentity_casl_explicitconsentdate').setDisplayType('hidden');
            form.getField('custentity_lastinquirydate').setDisplayType('hidden');
            form.getField('custentity_lastpurchasedate').setDisplayType('hidden');
        }
    }
}

function log(title, details) {
    nlapiLogExecution('DEBUG',title,details);
}
