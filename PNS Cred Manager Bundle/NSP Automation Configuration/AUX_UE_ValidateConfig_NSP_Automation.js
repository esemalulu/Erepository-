
var configobj = {};

function nspAutoConfigBeforeLoad(type, form, request){
	
	if (nlapiGetContext().getExecutionContext()=='userinterface' && type != 'view') {
		loadActiveConfigs();
		
		//add InlineHTML Field that contains nspAutoJson
		var inlineFld = form.addField('custpage_nspautoconfigjson', 'inlinehtml', '', null, null);
		inlineFld.setDefaultValue('<script language="JavaScript">'+
								  'var nspc = '+JSON.stringify(configobj)+';'+
								  '</script>');

		//form.addField('custpage_nspautoconfigtest', 'textarea', '', null, null).setDefaultValue(JSON.stringify(configobj));
		
	}
	
	
}

function nspAutoConfigBeforeSubmit(type) {
	
	//prevent users from Inline Editing
	if (type == 'xedit') {
		throw new nlobjError('NSP_CONFIG_ERROR', 'Inline Editing is not allowed for NSP Automation Configuration Records');
		return false;
	}
	
	if (type != 'delete') {
		loadActiveConfigs();
		
		//make sure this config is Unique:
		//Unique Config is Record Type + Field Tracked + Is Person + Is Company
		//reference nspc 
		if (configobj[nlapiGetFieldText('custrecord_nspc_rec_type')]) {
		
			var rfld = nlapiGetFieldText('custrecord_nspc_track_fld');
			var rind = (nlapiGetFieldValue('custrecord_nspc_isperson')=='T')?'T':'F';
			var rcomp = (nlapiGetFieldValue('custrecord_nspc_is_company')=='T')?'T':'F';
			
			if (nlapiGetFieldText('custrecord_nspc_track_fld')=='Contact Records') {
				for (var key in configobj[nlapiGetFieldText('custrecord_nspc_rec_type')]) {
					if (key != nlapiGetRecordId()) {
						var cfgel = configobj[nlapiGetFieldText('custrecord_nspc_rec_type')][key];
						if (rfld == cfgel.trackfld) {
							throw new nlobjError('NSP_CONFIG_ERROR', 'This configuration for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' Already Exists. Existing Record ID is '+key);
							return false;
							break;
						}
					}					
				}
			} else {
				
				var hasBoth = false;
				var bothLineMsg = '';
				
				var hasInd = false;
				var indLineMsg = '';
				
				var hasComp = false;
				var compLineMsg = '';
				
				for (var ckey in configobj[nlapiGetFieldText('custrecord_nspc_rec_type')]) {
					if (ckey != nlapiGetRecordId()) {
						var ccfgel = configobj[nlapiGetFieldText('custrecord_nspc_rec_type')][ckey];
						
						if (rfld == ccfgel.trackfld) {
						
							if (ccfgel.isperson=='T' && ccfgel.iscompany=='T') {
								hasBoth = true;
								bothLineMsg = 'Configuration ID '+ckey+' for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' applies to both Is Person and Is Company Types';
							} else if (ccfgel.isperson=='T') {
								hasInd = true;
								indLineMsg = 'Configuration ID '+ckey+' for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' apply to Is Person Type';
							} else if (ccfgel.iscompany=='T') {
								hasComp = true;
								compLineMsg = 'Configuration ID '+ckey+' for '+nlapiGetFieldText('custrecord_nspc_rec_type')+' apply to Is Company Type';
							}
							
						}
					}					
				}
				
				if (hasBoth && (rind=='T' || rcomp=='T')) {
					throw new nlobjError('NSP_CONFIG_ERROR',bothLineMsg);
					return false;
				} else if (hasInd && rind=='T') {
					throw new nlobjError('NSP_CONFIG_ERROR',indLineMsg);
					return false;
					
				} else if (hasComp && rcomp=='T') {
					throw new nlobjError('NSP_CONFIG_ERROR',compLineMsg);
					return false;
				}
			}
		}
	}
}

function loadActiveConfigs() {
	//get list of all ACTIVE NSP Automation Configs
	var cflt = [new nlobjSearchFilter('isinactive',null,'is','F')];
	//rec type, isperson, iscompany and track field makes it unique
	var ccol = [new nlobjSearchColumn('custrecord_nspc_rec_type'), //Record type
	            new nlobjSearchColumn('custrecord_nspc_isperson'),
	            new nlobjSearchColumn('custrecord_nspc_is_company'),
	            new nlobjSearchColumn('CUSTRECORD_NSPC_TRACK_FLD')];
	var crslt = nlapiSearchRecord('customrecord_aux_nsp_config', null, cflt, ccol);
	
	for (var i=0; crslt && i < crslt.length; i++) {
		var rectypetxt = crslt[i].getText('custrecord_nspc_rec_type');
		if (!configobj[rectypetxt]) {
			configobj[rectypetxt]={};
		}
		
		configobj[rectypetxt][crslt[i].getId()]={
			"trackfld":crslt[i].getText('CUSTRECORD_NSPC_TRACK_FLD'),
			"isperson":((crslt[i].getValue('custrecord_nspc_isperson')=='T')?'T':'F'),
			"iscompany":((crslt[i].getValue('custrecord_nspc_is_company')=='T')?'T':'F')
		};
	}
	return;
}