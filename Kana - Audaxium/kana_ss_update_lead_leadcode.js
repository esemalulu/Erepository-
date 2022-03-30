// BEGIN SCRIPT DESCRIPTION BLOCK  =================================================================================
/*
   	Script Name: 		kana_ss_udpate_lead_leadcode.js
	Author: 		Sagar Shah
	Date: 			17th Jan 2012
	Description:		Construct LeadCode for a Lead on lead creation event.
============================================================
	Change Name: 		CH#COPY_UTM_VALUES
	Author: 		Sagar Shah
	Date: 			17th feb 2012
	Description:		Copy the default UTM values into the custom fields if they all are blank.
============================================================
	Change Name: 		CH#UPDATED_LEADCODE_LOGIC
	Author: 		Sagar Shah
	Date: 			02nd Apr 2012
	Description:		Update LeadCode logic based on below new request:
	1.       Any instance where the first six fields are blank (e.g., NA_NA_NA_NA_NA_NA_) or lead code is None, should allow the lead code to be updated from Pardot
	2.       Any instance where the GTM code is NA in the Lead Code, we should allow update of the GTM code component of the Leadsource code
	3.       The same logic from #2 should be applied to the Industry code component of the Lead Code

	.*/
// END SCRIPT DESCRIPTION BLOCK  ===================================================================================
var adminEmail; 
var sNetsuiteEmailId = 24316; //marketing@kana.com

function updateLeadCode() {
	var id;
	var errorText;

	try
	{
		    adminEmail = nlapiGetContext().getSetting('SCRIPT', 'custscript_admin_email_leadcode_update');
			id = nlapiGetRecordId();
			if(id==-1)
				return;
			var leadRec = nlapiLoadRecord('customer', id);
			var assetType = kana_NVL(leadRec.getFieldText('custentity_pardot_offer_type'),'NA');
			var assetName = kana_NVL(leadRec.getFieldValue('custentity_pardot_asset_field'),'NA');
			var gtmTheme = kana_NVL(leadRec.getFieldText('custentity_pardot_gtm_theme'),'NA');
			var industryVertical = kana_NVL(leadRec.getFieldText('custentity_industry_vertical'),'NA');

			var leadCode = leadRec.getFieldValue('custentity_leadcode');//CH#UPDATED_LEADCODE_LOGIC

			if(kana_IsNull(leadCode) || leadCode.substr(0,18)=='NA_NA_NA_NA_NA_NA_') {
					//CH#COPY_UTM_VALUES - start

					var cTerm = leadRec.getFieldValue('custentity_campaign_term');
					var cMedium = leadRec.getFieldValue('custentity_campaign_medium');
					var cCampaign = leadRec.getFieldValue('custentity_campaign_name');
					var cSource = leadRec.getFieldValue('custentity_campaign_source');
					var cContent = leadRec.getFieldValue('custentity_campaign_content');

					//only when all the 5 custom fields are null, copy the corresponding values from the default UTM fields
					if(kana_IsNull(cTerm) && kana_IsNull(cMedium) && kana_IsNull(cCampaign) && kana_IsNull(cSource) && kana_IsNull(cContent)) {

							cTerm = leadRec.getFieldValue('custentitypi_utm_term');
							cMedium = leadRec.getFieldValue('custentitypi_utm_medium');
							cCampaign = leadRec.getFieldValue('custentitypi_utm_campaign');
							cSource = leadRec.getFieldValue('custentitypi_utm_source');
							cContent = leadRec.getFieldValue('custentitypi_utm_content');
							
							leadRec.setFieldValue('custentity_campaign_term', cTerm);
							leadRec.setFieldValue('custentity_campaign_medium', cMedium);
							leadRec.setFieldValue('custentity_campaign_name', cCampaign);
							leadRec.setFieldValue('custentity_campaign_source', cSource);
							leadRec.setFieldValue('custentity_campaign_content', cContent);				

					} 

					var kanaMedium = kana_NVL(cMedium,'NA');
					var kanaCampaign = kana_NVL(cCampaign,'NA');
					var kanaSource = kana_NVL(cSource,'NA');

					//CH#COPY_UTM_VALUES - end

					leadCode = kanaMedium.replace(/_/g,'-')+'_'+assetType.replace(/_/g,'-')+'_'+assetName.replace(/_/g,'-')+'_'+kanaCampaign.replace(/_/g,'-')+'_'+kanaSource.replace(/_/g,'-')+'_'+gtmTheme.replace(/_/g,'-')+'_'+industryVertical.replace(/_/g,'-');

					leadRec.setFieldValue('custentity_leadcode', leadCode);
					nlapiSubmitRecord(leadRec,false,true);
			}//end if
			else {
				//CH#UPDATED_LEADCODE_LOGIC - start
				var components = leadCode.split('_');
				var updateFlag=false;

				if(components[5]=='NA' && gtmTheme!='NA') {
					//update GTM Theme
					components[5] = gtmTheme.replace(/_/g,'-');
					updateFlag=true;
				}
				if(components[6]=='NA' && industryVertical!='NA') {
					//update Industry Vertical
					components[6] = industryVertical.replace(/_/g,'-');
					updateFlag=true;
				}
				
				leadCode='';
				if(updateFlag==true) {
					var i;
					for(i=0;i<6;i++) {
						leadCode += components[i];
						leadCode += '_'
					}
					leadCode += components[i];
					leadRec.setFieldValue('custentity_leadcode', leadCode);
					nlapiSubmitRecord(leadRec,false,true);
				}
				//CH#UPDATED_LEADCODE_LOGIC - end
			}

	} catch(exception) {
		// catch error if any other exception occurs
		errorText = 'UNEXPECTED ERROR: ATTEMPTING TO udpate LeadCode for Lead' + '\n\n' +
					'Script Name : kana_ss_update_lead_leadcode.js' + '\n' +
					'Lead Internal ID : ' + id + '\n' +
					'Error Details: ' + exception.toString();
		nlapiSendEmail(sNetsuiteEmailId, adminEmail, 'Error Message', errorText, null, null);
		return;
	}	
}
