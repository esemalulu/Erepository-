function pageInit() {

    if (nlapiGetFieldValue('isperson') == 'F') {
        // Using undocumented non-supported function. See Joe Son's blog post below
        // nlapiSetFieldDisplay('[FIELD INTERNAL ID]',false);
        // https://usergroup.netsuite.com/users/forum/platform-areas/customization/suitescript-custom-code/37099-show-hide-form-fields-in-client-script

        nlapiSetFieldDisplay('custentity_canemail', false);
        nlapiSetFieldDisplay('custentity_emailconsentexpirydate', false);
        nlapiSetFieldDisplay('custentity_casl_explicitconsentdate', false);
        nlapiSetFieldDisplay('custentity_lastpurchasedate', false);
        nlapiSetFieldDisplay('custentity_lastinquirydate', false);

    }
}