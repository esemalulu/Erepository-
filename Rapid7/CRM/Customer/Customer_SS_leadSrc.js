/*
 * @author suvarshi Known issue:
 *         https://usergroup.netsuite.com/users/showthread.php?t=16628
 *         
 *         Silverpop user Id: 111823
 */

function beforeSubmit(type){
	
	try {
		var userId = nlapiGetUser();
		
		if ((type == 'edit' || type == 'xedit') && true) {
		
			this.type = type;
			this.oldRecord = nlapiGetOldRecord();
			
			if (type == 'xedit') {
				this.updatedFields = nlapiGetNewRecord().getAllFields();
			}
			
			var leadSource = getNewFieldValue('leadsource');
			
			if (leadSource != null && leadSource != '') {
				var leadSourceInactive = nlapiLookupField('campaign', leadSource, 'isinactive');
				
				if (leadSourceInactive == 'F') {
				
					//stamp leadSourceOriginal
					var leadSourceOrginal = getNewFieldValue('custentityr7leadsourceoriginal');
					
					if (leadSourceOrginal == '' || leadSourceOrginal == null) {
					
						nlapiSetFieldValue('custentityr7leadsourceoriginal', leadSource);
						nlapiSetFieldValue('custentityr7leadsourceoriginaldate', nlapiDateToString(new Date()));
					}
					
					//stamp leadSourcePrimary
					var activeStatusFlipped = false;
					var leadSourceChanged = false;
					
					if (type != 'create' && oldRecord != null) {
						var oldActiveStatus = oldRecord.getFieldValue('custentityr7activestatus');
						var newActiveStatus = getNewFieldValue('custentityr7activestatus');
						
						if (oldActiveStatus == 'F' && newActiveStatus == 'T') {
							activeStatusFlipped = true;
						}
						
						var oldLeadSource = oldRecord.getFieldValue('leadsource');
						
						if (oldLeadSource != '' && oldLeadSource != null && oldLeadSource != leadSource && newActiveStatus == 'F') {
							nlapiSetFieldValue('custentityr7activestatus', 'T');
							activeStatusFlipped = true;
							leadSourceChanged = true;
						}
					}
					
					var leadSourceDirection = nlapiLookupField('campaign', leadSource, 'custeventr7direction');
					var primaryLeadSource = getNewFieldValue('custentityr7leadsourceprim');
					var primaryLeadSourceDate = getNewFieldValue('custentityr7leadsourceprimdate');
					var activeStatus = getNewFieldValue('custentityr7activestatus');
					
					//If either one of primary lead src or  date is empty
					if (primaryLeadSource == null || primaryLeadSource == '' || primaryLeadSourceDate == null || primaryLeadSourceDate == '') {
					
						//If Primary Lead Source is null set it regardless
						nlapiLogExecution('DEBUG', 'Setting PLS - empty', 'Customer: ' + nlapiGetRecordId() + '\nLdSource: ' + leadSource);
						//nlapiSendEmail(55011, 55011, 'Setting Primary Lead Source', 'primaryLeadSource was empty \nCustomer: ' + getNewFieldValue('companyname') + '\nLead Source: ' + leadSource + '\n\nContext: ' + nlapiGetContext().getExecutionContext());
						nlapiSetFieldValue('custentityr7leadsourceprim', leadSource);
						nlapiSetFieldValue('custentityr7leadsourceprimdate', nlapiDateToString(new Date()));
					}
					else {
						var dtToday = new Date();
						var dtPrimaryLeadSourceDate = nlapiStringToDate(primaryLeadSourceDate);
						var dtPrimaryLeadSourceDatePlus90 = nlapiAddDays(dtPrimaryLeadSourceDate, 90);
						
						if (dtToday > dtPrimaryLeadSourceDatePlus90) {
							if (leadSourceDirection != 4 || leadSource == 16854) { //LeadSource Direction is not neutral
								//outbound lead src is added on an inactive account
								if (activeStatus == 'F' && leadSourceChanged && leadSourceDirection == 2) {
									nlapiLogExecution('DEBUG', 'Setting PLS - not neutral or outbound and inactive', 'Customer: ' + nlapiGetRecordId() + '\nLdSource: ' + leadSource);
									//nlapiSendEmail(55011, 55011, 'Setting Primary Lead Source', 'OUTBOUND lead added to inactive account \nCustomer: ' + getNewFieldValue('companyname') + '\nLead Source: ' + leadSource + '\n\nContext: ' + nlapiGetContext().getExecutionContext());
									nlapiSetFieldValue('custentityr7leadsourceprim', leadSource);
									nlapiSetFieldValue('custentityr7leadsourceprimdate', nlapiDateToString(new Date()));
									
								}
								else //status flipped and prim ldsrc is not within last 90 days
 									if (activeStatus == 'T' && activeStatusFlipped) {
										nlapiLogExecution('DEBUG', 'Setting PLS - flipped active and primldsrc date !within 90 days', 'Customer: ' + nlapiGetRecordId() + '\nLdSource: ' + leadSource);
										//nlapiSendEmail(55011, 55011, 'Setting Primary Lead Source', 'flipped active and primldsrc date > 90 days ago \nCustomer: ' + getNewFieldValue('companyname') + '\nLead Source: ' + leadSource + '\n\nContext: ' + nlapiGetContext().getExecutionContext());
										nlapiSetFieldValue('custentityr7leadsourceprim', leadSource);
										nlapiSetFieldValue('custentityr7leadsourceprimdate', nlapiDateToString(new Date()));
									}
							}
						}
					}
				}
			}
		}
		
		if (type == 'create') {
		
			var leadSource = nlapiGetFieldValue('leadsource');
			
			if (leadSource != null && leadSource != '') {
				var leadSourceInactive = nlapiLookupField('campaign', leadSource, 'isinactive');
				
				if (leadSourceInactive != 'T') {
				
					var leadSourceOrginal = nlapiGetFieldValue('custentityr7leadsourceoriginal');
					if (leadSourceOrginal == '' || leadSourceOrginal == null) {
					
						nlapiSetFieldValue('custentityr7leadsourceoriginal', leadSource);
						nlapiSetFieldValue('custentityr7leadsourceoriginaldate', nlapiDateToString(new Date()));
					}
					
					var primaryLeadSource = nlapiGetFieldValue('custentityr7leadsourceprim');
					if (primaryLeadSource == null || primaryLeadSource == '') {
					
						//If Primary Lead Source is null set it regardless
						nlapiLogExecution('DEBUG', 'Setting PLS - empty', 'Customer: ' + nlapiGetRecordId() + '\nLdSource: ' + leadSource);
						//nlapiSendEmail(55011, 55011, 'Setting Primary Lead Source', 'primaryLeadSource was empty \nCustomer: ' + getNewFieldValue('companyname') + '\nLead Source: ' + leadSource + '\n\nContext: ' + nlapiGetContext().getExecutionContext());
						nlapiSetFieldValue('custentityr7leadsourceprim', leadSource);
						nlapiSetFieldValue('custentityr7leadsourceprimdate', nlapiDateToString(new Date()));
					}
				}
			}
		}
		
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error updating leadSources', 'Error: ' + e);
	}
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] === fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}


/*
DONE primary lead src is empty
outbound lead src is added on an inactive account
only when active flips from false to true ANDDDD not nuetral (except 37 cold call) &&  current primary lead src is not outbound within last 90 days 
*/
