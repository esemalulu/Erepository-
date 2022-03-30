//NET-135 Start
			function afterSubmit(){
			if(type == 'create') {
				var recordType = nlapiGetNewRecord().getRecordType();				
				if(recordType == 'customrecorddiscounts') {
					var discount_type = nlapiGetFieldValue('custrecordetailzdiscount_type');
					nlapiLogExecution('DEBUG', 'Create Type', 'discount_type ' + discount_type);
					if(discount_type == 30) { //Request to ship direct to AMZ
						nlapiLogExecution('DEBUG', 'Create Type', 'Creating PE');
						var vendor = nlapiGetFieldValue('custrecordvendor_discount_c');
						var pe_name = 'Partner Switch Pitch';
						var update_pe_fields = ['custrecordvendor_stripping2_c', 'name', 'custrecordcustomrecord_reqsource','custrecordstripping_project_stat1'];
						var update_pe_values = [vendor, pe_name, 13, 15];
						var pe_project = nlapiCreateRecord('customrecordetailz_stripping_2');
						for(var i = 0; i < update_pe_fields.length; i++) {
							pe_project.setFieldValue(update_pe_fields[i], update_pe_values[i]);
						}
						var pe_project_id = nlapiSubmitRecord(pe_project);
						nlapiLogExecution('DEBUG', 'Create Type', 'Created PE with ID = ' + pe_project_id);
					}
				}
			}
			}
		//NET-135 End