
var paramLeadId = nlapiGetContext().getSetting('SCRIPT', 'custscript_171_wfparam_leadid');

function syncAddressWithLead() {
	log('debug','Inbound Lead Type', nlapiGetRecordType());
	log('debug','Inbound Lead Id', nlapiGetRecordId());
	
	log('debug','param Lead ID', paramLeadId);
	
	if (!paramLeadId)
	{
		return;
	}
	
	var countryText = nlapiGetFieldText('custrecord_ntcc_inb_lead_country');
	if (!countryText)
	{
		countryText = 'United Kingdom (GB)';
	}
	
	var addr1 = (nlapiGetFieldValue('custrecord_ntcc_imported_lead_addr1')?nlapiGetFieldValue('custrecord_ntcc_imported_lead_addr1'):'');
	var addr2 = (nlapiGetFieldValue('custrecord_ntcc_inb_lead_addr_line2')?nlapiGetFieldValue('custrecord_ntcc_inb_lead_addr_line2'):'');
	//var addr3 = (nlapiGetFieldValue('custrecord_ntcc_inb_lead_addr_line3')?nlapiGetFieldValue('custrecord_ntcc_inb_lead_addr_line3'):'');
	var city = (nlapiGetFieldValue('custrecord_ntcc_imported_lead_city')?nlapiGetFieldValue('custrecord_ntcc_imported_lead_city'):'');
	var stateCounty = (nlapiGetFieldValue('custrecord_ntcc_inb_lead_county')?nlapiGetFieldValue('custrecord_ntcc_inb_lead_county'):'');
	var zip = (nlapiGetFieldValue('custrecord_ntcc_imported_lead_postcode')?nlapiGetFieldValue('custrecord_ntcc_imported_lead_postcode'):'');
	
	//Load the lead record and attempt to create NEW address
	var leadRec = nlapiLoadRecord('customer', paramLeadId, {recordmode:'dynamic'});
	leadRec.selectNewLineItem('addressbook');
	leadRec.setCurrentLineItemValue('addressbook', 'defaultshipping', 'T');  //This field is not a subrecord field.
	leadRec.setCurrentLineItemValue('addressbook', 'defaultbilling', 'T');   //This field is not a subrecord field.
	leadRec.setCurrentLineItemValue('addressbook', 'label', ' ');  //This field is not a subrecord field.
	leadRec.setCurrentLineItemValue('addressbook', 'isresidential', 'F');    //This field is not a subrecord field.

    //create address subrecord
    var subrecord = leadRec.createCurrentLineItemSubrecord('addressbook', 'addressbookaddress');

    //set subrecord fields
    subrecord.setFieldText('country', countryText); //Country must be set before setting the other address fields
    subrecord.setFieldValue('addr1', addr1);
    subrecord.setFieldValue('addr2', addr2);
    subrecord.setFieldValue('city', city);
    subrecord.setFieldValue('state', stateCounty);
    if (!subrecord.getFieldValue('state'))
    {
    	subrecord.setFieldText('state', stateCounty);
    }
    subrecord.setFieldValue('zip', zip);

    //commit subrecord and line item
    subrecord.commit();
    leadRec.commitLineItem('addressbook');

    //submit record
    nlapiSubmitRecord(leadRec);
	

}