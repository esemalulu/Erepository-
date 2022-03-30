/**
 * Company            Explore Consulting
 * Copyright          2015 Explore Consulting, LLC
 * Type               Scheduled
 * ID				  customscript_
 * Deployments		  customdeploy_
 * Version            1.0.0.0
 * Description
 * Dependencies       TODO: NSDal
 **/

if (typeof EC == "undefined" || !EC) {
	var EC = {};
}

EC.afterSubmit = function (type)
{
	EC.processLicenses(type);
};

EC.processLicenses = function(type)
{
	var ifInternalID = nlapiGetRecordId();
	if(type == 'create' || ifInternalID == '359290' || ifInternalID == '359289')
	{
		EC.enableLazySearch();
		var ifRecord = nsdal.loadObject(nlapiGetRecordType(), ifInternalID, ['tranid','orderid','custbody_ec_test_lac_response','custbody_licenseintegrationstatus','custbody_licenseintegrationmessage','custbody_licenseintegrationid'])
			.withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date','quantity','custcol_licenseintegrationstatus','custcol_licenseintegrationmessage','custcol_item_category','custcol1','custcol_xformationitem']);
		var soRecord = nsdal.loadObject('salesorder', ifRecord.orderid, ['tranid','custbody_order_type','entity','trandate','custbody_end_user'])
			.withSublist('item',['item', 'custcol_prodcode','custcol_swe_contract_end_date','custcol_item_category']);

		logContext = 'SO: ' + soRecord.tranid + ', IF: ' + ifRecord.tranid + ': ';

		if(soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractNew || soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractUpsell || soRecord.custbody_order_type == EC.LicenseSettings.OrderType.ContractRenewal)
		{
			var authToken = EC.getAuthToken(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.AuthTokenAPIPath);

			if (!authToken) {
				// TODO: Send error message, log error, return
				ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Error;
				ifRecord.custbody_licenseintegrationmessage = 'An error occurred obtaining an Auth Token';
			}
			else
			{
				var customerRecord = nsdal.loadObject('customer', soRecord.entity, ['entityid','isperson','companyname','firstname','middlename','lastname','phone'])
					.withSublist('addressbook', ['defaultbilling','defaultshipping','addr1','addr2','city','state','zip','country']);
				var requestBody = EC.buildLicenseRequestBody(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.LicenseAPIPath, authToken, ifRecord, customerRecord, soRecord);
				Log.d('EC.processLicenses: ' + logContext + ': requestBody',requestBody);
				
				if(requestBody.status == EC.LicenseSettings.LicenseIntegrationStatus.Error)
				{
					ifRecord.custbody_licenseintegrationstatus = requestBody.status;
					ifRecord.custbody_licenseintegrationmessage = requestBody.message;
				}
				else
				{
					var response = EC.submitLicenseRequest(EC.LicenseSettings.APIBaseURL + EC.LicenseSettings.LicenseAPIPath, authToken, requestBody.body);
					var responseCode = response.getCode();
					var responseBodyString = response.getBody();
					Log.d('EC.processLicenses', logContext + 'Response Code: ' + responseCode);
					Log.d('EC.processLicenses', logContext + 'Response Body: ' + responseBodyString);

					if(responseCode == '200' || responseCode == '202')
					{
						// Request was processed (200) or request was accepted but is still processing (202).
						ifRecord.custbody_ec_test_lac_response =  responseBodyString;
						var responseBody = JSON.parse(responseBodyString);
						ifRecord.custbody_licenseintegrationid = responseBody._id;
						//responseBody.status = 'pending'; // Testing

						if(responseBody.status == 'processed')
						{
							//
							// Need to create licenses for ContractNew orders
							// Need to update licenses for ContractUpsell and ContractRenewal orders
							//
							EC.createOrUpdateLicenses(responseBody, ifRecord, soRecord);
							ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Success;
							ifRecord.custbody_licenseintegrationmessage = '';
						}
						else if(responseBody.status == 'pending' || responseBody.status == 'processing')
						{
							// Flag fulfillment to be processed again by scheduled script
							ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Pending;
							ifRecord.custbody_licenseintegrationmessage = '';
						}
						else
						{
							ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Error;
							ifRecord.custbody_licenseintegrationmessage = 'The response status was: ' + responseBody.status;
						}
					}
					else
					{
						// Must be an an error responseCode
						ifRecord.custbody_licenseintegrationstatus = EC.LicenseSettings.LicenseIntegrationStatus.Error;
						ifRecord.custbody_licenseintegrationmessage = 'Licensing API Response Code: ' + responseCode + ', Response Body: ' + responseBodyString;
					}
				}
			}

			ifRecord.save();
		}
	}
};
