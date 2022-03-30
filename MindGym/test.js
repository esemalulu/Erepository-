function pageInit() {

    nlapiDisableField('custentity_web_services_test',true);
}

function fieldChanged(type, name) {
    
    if(name == 'custentity_job_category') {
        
        jobCategoryValue = nlapiGetFieldValue(name);
        jobCategoryText = nlapiGetFieldText(name);
        
        nlapiSetFieldValue('title',jobCategoryText);
        
        if(jobCategoryValue == 1) {
            nlapiSetFieldValue('salutation','Emperor');
        }
    }
}

function pageSave() {
    
    var returnValue = true;
    
    // phone, custentity_mobile_phone
    phone = nlapiGetFieldValue('phone');
    mobilePhone = nlapiGetFieldValue('custentity_mobile_phone');
    
    if(phone.length < 1) {
        alert('Please enter a main phone number');
        returnValue = false;
    }
    
    if(mobilePhone.length < 1) {
        alert('Please enter a mobile phone number');
        returnValue = false;
    }
    
    return returnValue;
}