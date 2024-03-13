/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 May 2013     efagone
 *
 */

/*
 * MB: 10/14/15 - APTCM-129 - NetSuite-Nexpose License Integration Authentication Updates
 * The GES team is updating the authentication mechanism for the Nexpose Licensing Server (uadmin) to adhere to Rapid7's SSO policies.  
 * In order to ensure no interruption to Licensing processes in NetSuite all integration scripts need to be updated to support Basic Authentication and hyperlink fields must be updated to the new Uadmin URLs
 * The server endpoint and auth values have been moved to script parameters.
 */
/*
 * MB: 10/21/15 - Added Asset Linking per  Idea P-I-30: Add "nexpose.usage.cross.site.correlation" to Netsuite - Nexpose Usage data from UpdateInsight
 */
/*
 * MB: 5/26/16	- APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs
 * 		add "nexpose.usage.ea.enabled"
 * 
 * MB: 9/9/16 - APTCM-347 #30387 - Add new Nexpose product usage metrics to the license record in Netsuite in order to more effectively track customer adoption/usage
 * 		Adding 19 new NX Usage Metrics fields per Eric Reiners request - Samanage Incident 30387
 */

var ctx = nlapiGetContext();
var uadminAuth = '';
var endPoint = '';

//If sandbox enviornment use the sandbox specific endpoints to link to the Development Nexpose License Server
//--------------------- BEGIN ENVIRONMENT CHECK ---------------------

	if (ctx.getEnvironment() != 'PRODUCTION'){
		endPoint = ctx.getSetting('SCRIPT','custscriptnxendpoint_sandbox');
		uadminAuth = ctx.getSetting('SCRIPT','custscriptr7nx_uadminauth_sandbox');
	}
	else{
		endPoint = ctx.getSetting('SCRIPT','custscriptnxendpoint');
		uadminAuth =ctx.getSetting('SCRIPT','custscriptr7nx_uadminauth');
	}
//--------------------- END ENVIRONMENT CHECK ---------------------
	
	endPoint += '/uadmin';  // We're working with the Uadmin services so add to endpoint
	
var objDailyLicMap = getDailyLicenseMap(); // Get list of licenses accessed today

function updateLicense(objLicense, isManual, timeStop){

	//Parsing the Content of the license being sent
	try {
	
		//License Info
		var productKey = (objLicense.hasOwnProperty('productKey')) ? objLicense['productKey'] : null;
		
		if (objDailyLicMap.hasOwnProperty(productKey) && !isManual) {
			//product key wasnt already processed today
			nlapiLogExecution('DEBUG', 'License already updated today - skipping', productKey);
			return false;
		}
		
		//Get License To Perform Update
		var nsLicenseId = grabNSLicenseId(productKey);
		if (nsLicenseId == null || nsLicenseId == '') {
			nlapiLogExecution('DEBUG', 'Could not find product key', productKey);
			return false;
		}
		
		var os = (objLicense.hasOwnProperty('os')) ? objLicense['os'] : null;
		var dbms = (objLicense.hasOwnProperty('dbms')) ? objLicense['dbms'] : null;
		var dbmsVersion = (objLicense.hasOwnProperty('dbmsVersion')) ? objLicense['dbmsVersion'] : null;
		var freeRAM = (objLicense.hasOwnProperty('freeRAM')) ? objLicense['freeRAM'] : null;
		var totalRAM = (objLicense.hasOwnProperty('totalRAM')) ? objLicense['totalRAM'] : null;
		var upTime = (objLicense.hasOwnProperty('uptime')) ? objLicense['uptime'] : null;
		var jreVersion = (objLicense.hasOwnProperty('jreVersion')) ? objLicense['jreVersion'] : null;
		var diskStats = (objLicense.hasOwnProperty('diskStats')) ? objLicense['diskStats'] : null;
		var numberOfCPUCores = (objLicense.hasOwnProperty('numberOfCores')) ? objLicense['numberOfCores'] : null;
		var cpuSpeedMhz = (objLicense.hasOwnProperty('cpuSpeedMhz')) ? objLicense['cpuSpeedMhz'] : null;
		var ipAddresses = (objLicense.hasOwnProperty('ipAddresses') && objLicense['ipAddresses'] != null) ? objLicense['ipAddresses'].replace(new RegExp(",", "g"), ",\n") : null;
		var serialNumber = (objLicense.hasOwnProperty('serialNumber')) ? objLicense['serialNumber'] : null;
		var productVersionId = (objLicense.hasOwnProperty('lastUpdateVersionId')) ? objLicense['lastUpdateVersionId'] : null;
		var productVersionDesc = (objLicense.hasOwnProperty('lastUpdateVersionDesc')) ? objLicense['lastUpdateVersionDesc'] : null;
		var isActivated = (objLicense.hasOwnProperty('isActivated') && (objLicense['isActivated'] == '1' || objLicense['isActivated'] == 'true')) ? 'T' : 'F';
		var content_update_id = (objLicense.hasOwnProperty('content.update.id')) ? objLicense['content.update.id'] : null;
		var nexpose_auto_update_enabled = (objLicense.hasOwnProperty('nexpose.auto.update.enabled') && objLicense['nexpose.auto.update.enabled'] == 'true') ? 'T' : 'F';
		var nexpose_db_major_version = (objLicense.hasOwnProperty('nexpose.db.major.version')) ? objLicense['nexpose.db.major.version'] : null;
		var nexpose_db_schema_version = (objLicense.hasOwnProperty('nexpose.db.schema.version')) ? objLicense['nexpose.db.schema.version'] : null;
		var nexpose_db_size = (objLicense.hasOwnProperty('nexpose.db.size')) ? objLicense['nexpose.db.size'] : null;
		var nexpose_license_used_hosted = (objLicense.hasOwnProperty('nexpose.license.used.hosted')) ? objLicense['nexpose.license.used.hosted'] : null;
		var nexpose_license_used_scanengines = (objLicense.hasOwnProperty('nexpose.license.used.scanengines')) ? objLicense['nexpose.license.used.scanengines'] : null;
		var nexpose_license_asset_link = (objLicense.hasOwnProperty('nexpose.usage.cross.site.correlation') && objLicense['nexpose.usage.cross.site.correlation'] == 'true') ? 'T' : 'F'; // MB: 10/21/15 - Added Asset Linking per  Idea P-I-30: Add "nexpose.usage.cross.site.correlation" to Netsuite - Nexpose Usage data from UpdateInsight		
		var nexpose_license_ea_enabled = (objLicense.hasOwnProperty('nexpose.usage.ea.enabled') && objLicense['nexpose.usage.ea.enabled'] == 'true') ? 'T' : 'F'; // MB: 5/26/16 - APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs add "nexpose.usage.ea.enabled"
		var nexpose_license_used_total = (objLicense.hasOwnProperty('nexpose.license.used.total')) ? objLicense['nexpose.license.used.total'] : null;
		var nexpose_license_range_total = (objLicense.hasOwnProperty('nexpose.license.range.total')) ? objLicense['nexpose.license.range.total'] : null;
		var nexpose_usage_custom_policies = (objLicense.hasOwnProperty('nexpose.usage.custom.policies')) ? objLicense['nexpose.usage.custom.policies'] : null;
		var nexpose_usage_custom_report_templates = (objLicense.hasOwnProperty('nexpose.usage.custom.report.templates')) ? objLicense['nexpose.usage.custom.report.templates'] : null;
		var nexpose_usage_custom_scan_templates = (objLicense.hasOwnProperty('nexpose.usage.custom.scan.templates')) ? objLicense['nexpose.usage.custom.scan.templates'] : null;
		var nexpose_usage_risk_model = (objLicense.hasOwnProperty('nexpose.usage.risk.model')) ? objLicense['nexpose.usage.risk.model'] : null;
		var nexpose_usage_scan_engines = (objLicense.hasOwnProperty('nexpose.usage.scan.engines')) ? objLicense['nexpose.usage.scan.engines'] : null;
		var nexpose_usage_scanned_addresses = (objLicense.hasOwnProperty('nexpose.usage.scanned.addresses')) ? objLicense['nexpose.usage.scanned.addresses'] : null;
		var nexpose_usage_scans = (objLicense.hasOwnProperty('nexpose.usage.scans')) ? objLicense['nexpose.usage.scans'] : null;
		var nexpose_usage_web_scans = (objLicense.hasOwnProperty('nexpose.usage.web.scans')) ? objLicense['nexpose.usage.web.scans'] : null;
		var nexpose_version = (objLicense.hasOwnProperty('nexpose.version')) ? objLicense['nexpose.version'] : null;
		var product_update_id = (objLicense.hasOwnProperty('product.update.id')) ? objLicense['product.update.id'] : null;
		var nexpose_usage_assets_with_policy_or_vuln_results = (objLicense.hasOwnProperty('nexpose.usage.assets.with.policy.or.vuln.results')) ? objLicense['nexpose.usage.assets.with.policy.or.vuln.results'] : null;
		var nexpose_usage_assets_with_policy_results = (objLicense.hasOwnProperty('nexpose.usage.assets.with.policy.results')) ? objLicense['nexpose.usage.assets.with.policy.results'] : null;
		var nexpose_usage_assets_with_vuln_results = (objLicense.hasOwnProperty('nexpose.usage.assets.with.vuln.results')) ? objLicense['nexpose.usage.assets.with.vuln.results'] : null;
		var nexpose_usage_shared_credentials = (objLicense.hasOwnProperty('nexpose.usage.shared.credentials')) ? objLicense['nexpose.usage.shared.credentials'] : null;
		
		//NEW ATTRIBUTES
		var db_schema_size_asset_manager_default = (objLicense.hasOwnProperty('db.schema.size.asset_manager_default')) ? objLicense['db.schema.size.asset_manager_default'] : null;
		var db_schema_size_centrics = (objLicense.hasOwnProperty('db.schema.size.centrics')) ? objLicense['db.schema.size.centrics'] : null;
		var db_schema_size_nxadmin = (objLicense.hasOwnProperty('db.schema.size.nxadmin')) ? objLicense['db.schema.size.nxadmin'] : null;
		var db_schema_size_nxglobal = (objLicense.hasOwnProperty('db.schema.size.nxglobal')) ? objLicense['db.schema.size.nxglobal'] : null;
		var db_schema_size_nxsilo_default = (objLicense.hasOwnProperty('db.schema.size.nxsilo_default')) ? objLicense['db.schema.size.nxsilo_default'] : null;
		var geoIp_city = (objLicense.hasOwnProperty('geoIp.city')) ? objLicense['geoIp.city'] : null;
		var geoIp_continent = (objLicense.hasOwnProperty('geoIp.continent')) ? objLicense['geoIp.continent'] : null;
		var geoIp_country = (objLicense.hasOwnProperty('geoIp.country')) ? objLicense['geoIp.country'] : null;
		var geoIp_state = (objLicense.hasOwnProperty('geoIp.state')) ? objLicense['geoIp.state'] : null;
		var nexpose_db_local = (objLicense.hasOwnProperty('nexpose.db.local') && objLicense['nexpose.db.local'] == 'true') ? 'T' : 'F';

		/*
		 * MB: 9/9/16 - APTCM-347 #30387 - Add new Nexpose product usage metrics to the license record in Netsuite in order to more effectively track customer adoption/usage
		 * 		Adding 19 new NX Usage Metrics fields per Eric Reiners request - Samanage Incident 30387
		 */
		var nexpose_usage_needs_activation = (objLicense.hasOwnProperty('activatedTimeNeeded') && objLicense['activatedTimeNeeded'] == 'true') ? 'T' : 'F';
		var nexpose_usage_backups_sched = (objLicense.hasOwnProperty('nexpose.usage.backup.scheduled') && objLicense['nexpose.usage.backup.scheduled'] == 'true') ? 'T' : 'F';
		var nexpose_usage_maint_sched = (objLicense.hasOwnProperty('nexpose.usage.maintenance.scheduled') && objLicense['nexpose.usage.maintenance.scheduled'] == 'true') ? 'T' : 'F';
		var nexpose_usage_calendar_subscription = (objLicense.hasOwnProperty('nexpose.usage.calendar.subscription.enabled') && objLicense['nexpose.usage.calendar.subscription.enabled'] == '1') ? 'T' : 'F';
		var nexpose_usage_engine_alerts_enabled = (objLicense.hasOwnProperty('nexpose.usage.engine.alerts.enabled') && objLicense['nexpose.usage.engine.alerts.enabled'] == 'true') ? 'T' : 'F';
		var nexpose_usage_engine_pools_interleaved = (objLicense.hasOwnProperty('nexpose.usage.scan.pools.interleaving.count')) ? objLicense['nexpose.usage.scan.pools.interleaving.count'] : null;
		var nexpose_usage_engines_loadbalanced = (objLicense.hasOwnProperty('nexpose.usage.scan.pools.loadbalanced.count')) ? objLicense['nexpose.usage.scan.pools.loadbalanced.count'] : null;
		var nexpose_usage_engines_pools_roundrobin = (objLicense.hasOwnProperty('nexpose.usage.scan.pools.roundrobin.count')) ? objLicense['nexpose.usage.scan.pools.roundrobin.count'] : null;
		var nexpose_usage_silo_count = (objLicense.hasOwnProperty('nexpose.usage.silo.count')) ? objLicense['nexpose.usage.silo.count'] : null;
		var nexpose_usage_sites_using_local = (objLicense.hasOwnProperty('nexpose.usage.sites.localEngine')) ? objLicense['nexpose.usage.sites.localEngine'] : null;
		var nexpose_usage_uses_activesynch = (objLicense.hasOwnProperty('nexpose.usage.usesActiveSync') && objLicense['nexpose.usage.usesActiveSync'] == 'true') ? 'T' : 'F';
		var nexpose_usage_uses_aws = (objLicense.hasOwnProperty('nexpose.usage.usesAws') && objLicense['nexpose.usage.usesAws'] == 'true') ? 'T' : 'F';
		var nexpose_usage_uses_data_export = (objLicense.hasOwnProperty('nexpose.usage.usesDatabaseExport') && objLicense['nexpose.usage.usesDatabaseExport'] == 'true') ? 'T' : 'F';
		var nexpose_usage_uses_warehousing = (objLicense.hasOwnProperty('nexpose.usage.usesDatawarehouseExport') && objLicense['nexpose.usage.usesDatawarehouseExport'] == 'true') ? 'T' : 'F';
		var nexpose_usage_uses_dhcp = (objLicense.hasOwnProperty('nexpose.usage.usesDhcp') && objLicense['nexpose.usage.usesDhcp'] == 'true') ? 'T' : 'F';
		var nexpose_usage_uses_vasset_disc = (objLicense.hasOwnProperty('nexpose.usage.usesVAssetDiscovery') && objLicense['nexpose.usage.usesVAssetDiscovery'] == 'true') ? 'T' : 'F';
		var nexpose_usage_uses_vsphere = (objLicense.hasOwnProperty('nexpose.usage.usesVSphere') && objLicense['nexpose.usage.usesVSphere'] == 'true') ? 'T' : 'F';
		var nexpose_usage_uses_remote_enablement = (objLicense.hasOwnProperty('nexpose.usage.windows.services.enabled') && objLicense['nexpose.usage.windows.services.enabled'] == 'true') ? 'T' : 'F';
		var nexpose_usage_assets_tagged = (objLicense.hasOwnProperty('nexpose.usage.tags.assets')) ? objLicense['nexpose.usage.tags.assets'] : null;
		var nexpose_usage_uses_adaptive = (objLicense.hasOwnProperty('adaptive.security.workflow.summary') && objLicense['adaptive.security.workflow.summary']) ? 'T' : 'F';	
		
		//Time attributes
		var lastContactTime = (objLicense.hasOwnProperty('lastContactTime')) ? objLicense['lastContactTime'] : null;
		var firstContactTime = (objLicense.hasOwnProperty('firstContactTime')) ? objLicense['firstContactTime'] : null;
		var lastUpdateTime = (objLicense.hasOwnProperty('lastUpdateTime')) ? objLicense['lastUpdateTime'] : null;
		var activatedTime = (objLicense.hasOwnProperty('activatedTime')) ? objLicense['activatedTime'] : null;
		var nexpose_usage_last_scan_time = (objLicense.hasOwnProperty('nexpose.usage.last.scan.time')) ? objLicense['nexpose.usage.last.scan.time'] : null;
		var nexpose_usage_last_user_login_time = (objLicense.hasOwnProperty('nexpose.usage.last.user.login.time')) ? objLicense['nexpose.usage.last.user.login.time'] : null;
		//NS Time Conversion
		var lastContactDateNS = (lastContactTime != null && lastContactTime != '') ? nlapiDateToString(getPSTDate(createDateObject(lastContactTime))) : null;
		var firstContactDateNS = (firstContactTime != null && firstContactTime != '') ? nlapiDateToString(getPSTDate(createDateObject(firstContactTime))) : null;
		var lastUpdateDateNS = (lastUpdateTime != null && lastUpdateTime != '') ? nlapiDateToString(getPSTDate(createDateObject(lastUpdateTime))) : null;
		var activatedTimeNS = (activatedTime != null && activatedTime != '') ? nlapiDateToString(getPSTDate(createDateObject(activatedTime)), 'datetimetz') : null;
		var lastLoginTimeNS = (nexpose_usage_last_user_login_time != null && nexpose_usage_last_user_login_time != '') ? nlapiDateToString(getPSTDate(createDateObject(nexpose_usage_last_user_login_time)), 'datetimetz') : null;
		var lastScanTimeNS = (nexpose_usage_last_scan_time != null && nexpose_usage_last_scan_time != '') ? nlapiDateToString(getPSTDate(createDateObject(nexpose_usage_last_scan_time)), 'datetimetz') : null;
		
		//JSON attributes
		var nexpose_usage_asset_groups = (objLicense.hasOwnProperty('nexpose.usage.asset.groups')) ? objLicense['nexpose.usage.asset.groups'] : null;
		var nexpose_usage_features_enabled = (objLicense.hasOwnProperty('nexpose.usage.features.enabled')) ? objLicense['nexpose.usage.features.enabled'] : null;
		var nexpose_usage_reports_per_template = (objLicense.hasOwnProperty('nexpose.usage.reports.per.template')) ? objLicense['nexpose.usage.reports.per.template'] : null;
		var nexpose_usage_site_per_scan_template = (objLicense.hasOwnProperty('nexpose.usage.site.per.scan.template')) ? objLicense['nexpose.usage.site.per.scan.template'] : null;
		var nexpose_usage_users_per_role = (objLicense.hasOwnProperty('nexpose.usage.users.per.role')) ? objLicense['nexpose.usage.users.per.role'] : null;
		
		var controls_insight_enabled_controls = (objLicense.hasOwnProperty('controls.insight.enabled.controls')) ? objLicense['controls.insight.enabled.controls'] : null;
		var controls_insight_user_login = (objLicense.hasOwnProperty('controls.insight.user.login')) ? objLicense['controls.insight.user.login'] : null;
		
		//Parse JSON VARS
		var nexpose_usage_features_enabled_text = '';
		var nexpose_usage_reports_per_template_text = '';
		var nexpose_usage_site_per_scan_template_text = '';
		var nexpose_usage_users_per_role_text = '';
		var controls_insight_enabled_controls_text = '';
		var controls_insight_user_login_text = '';
		var nexpose_usage_dynamic_asset_groups = null;
		var nexpose_usage_static_asset_groups = null;
		var nexpose_usage_site_count = '';
		var nexpose_usage_user_count = '';
		var nexpose_usage_report_count = '';
		
		if (nexpose_usage_features_enabled != null && nexpose_usage_features_enabled != '') {
			var obj_nexpose_usage_features_enabled = JSON.parse(nexpose_usage_features_enabled);
			for (key in obj_nexpose_usage_features_enabled) {
				if (obj_nexpose_usage_features_enabled[key] == 1) {
					nexpose_usage_features_enabled_text += key + '\n';
				}
			}
		}

		if (controls_insight_enabled_controls != null && controls_insight_enabled_controls != '') {
			var obj_controls_insight_enabled_controls = JSON.parse(controls_insight_enabled_controls);
			var arrEnabledFeatures = obj_controls_insight_enabled_controls.controls;
			for (var k = 0; arrEnabledFeatures != null && k < arrEnabledFeatures.length; k++) {
				controls_insight_enabled_controls_text += arrEnabledFeatures[k] + '\n';
			}
		}
		
		if (controls_insight_user_login != null && controls_insight_user_login != '') {
			var arr_controls_insight_user_login = JSON.parse(controls_insight_user_login);
			if (arr_controls_insight_user_login != null) {
				for (var j = 1, k = arr_controls_insight_user_login.length - 1; k >= 0 && j <= 10; j++, k--) {
					var objLogin = JSON.parse(arr_controls_insight_user_login[k]);
					controls_insight_user_login_text += objLogin.date_collected.substr(0, 10) + ': userid ' + objLogin.user_id + ' (' + objLogin.role + ')\n';
				}
			}
		}
		
		if (nexpose_usage_reports_per_template != null && nexpose_usage_reports_per_template != '') {
			nexpose_usage_report_count = 0;
			var obj_nexpose_usage_reports_per_template = JSON.parse(nexpose_usage_reports_per_template);
			for (key in obj_nexpose_usage_reports_per_template) {
				if (obj_nexpose_usage_reports_per_template[key] == null || obj_nexpose_usage_reports_per_template[key] == '') {
					continue;
				}
				nexpose_usage_reports_per_template_text += key + ': ' + obj_nexpose_usage_reports_per_template[key] + '\n';
				nexpose_usage_report_count += parseInt(obj_nexpose_usage_reports_per_template[key]);
			}
		}
		
		if (nexpose_usage_site_per_scan_template != null && nexpose_usage_site_per_scan_template != '') {
			nexpose_usage_site_count = 0;
			var obj_nexpose_usage_site_per_scan_template = JSON.parse(nexpose_usage_site_per_scan_template);
			for (key in obj_nexpose_usage_site_per_scan_template) {
				if (obj_nexpose_usage_site_per_scan_template[key] == null || obj_nexpose_usage_site_per_scan_template[key] == '') {
					continue;
				}
				nexpose_usage_site_per_scan_template_text += key + ': ' + obj_nexpose_usage_site_per_scan_template[key] + '\n';
				nexpose_usage_site_count += parseInt(obj_nexpose_usage_site_per_scan_template[key]);
			}
		}
		
		if (nexpose_usage_users_per_role != null && nexpose_usage_users_per_role != '') {
			nexpose_usage_user_count = 0;
			var obj_nexpose_usage_users_per_role = JSON.parse(nexpose_usage_users_per_role);
			for (key in obj_nexpose_usage_users_per_role) {
				if (obj_nexpose_usage_users_per_role[key] == null || obj_nexpose_usage_users_per_role[key] == '') {
					continue;
				}
				nexpose_usage_users_per_role_text += key + ': ' + obj_nexpose_usage_users_per_role[key] + '\n';
				nexpose_usage_user_count += parseInt(obj_nexpose_usage_users_per_role[key]);
			}
		}
		
		if (nexpose_usage_asset_groups != null && nexpose_usage_asset_groups != '') {
			var obj_nexpose_usage_asset_groups = JSON.parse(nexpose_usage_asset_groups);
			nexpose_usage_dynamic_asset_groups = (obj_nexpose_usage_asset_groups.hasOwnProperty('dynamic')) ? obj_nexpose_usage_asset_groups['dynamic'] : 0;
			nexpose_usage_static_asset_groups = (obj_nexpose_usage_asset_groups.hasOwnProperty('static')) ? obj_nexpose_usage_asset_groups['static'] : 0;
		}
		
		// now update the license
		try {
		
			var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', nsLicenseId);
			recLicense.setFieldValue('custrecordr7nxlicense_nosendserver', 'T'); //prevents license script from kicking
			if (!isManual) {
				// IMPORTANT: do not update timestamp field for manual syncs
				//recLicense.setFieldValue('custrecordr7nxlicense_lastcontacttimesta', lastContactTime);
				recLicense.setFieldValue('custrecordr7nxlicense_lastcontacttimesta', timeStop); // 11/7/14 changed to timeStop as lastContact wasn't working anymore
			}
			
			var currentFirstAccessDate = recLicense.getFieldValue('custrecordr7nxfirstaccessdate');
			if (currentFirstAccessDate == null || currentFirstAccessDate == '') {
				recLicense.setFieldValue('custrecordr7nxfirstaccessdate', firstContactDateNS);
			}
			else 
				if (firstContactDateNS != null && firstContactDateNS != '' && nlapiStringToDate(currentFirstAccessDate) > nlapiStringToDate(firstContactDateNS)) {
					recLicense.setFieldValue('custrecordr7nxfirstaccessdate', firstContactDateNS);
				}
			
			//usage
			recLicense.setFieldValue('custrecordr7nxliccontentupdateid', content_update_id);
			recLicense.setFieldValue('custrecordr7nxlicautoupdateenabled', nexpose_auto_update_enabled);
			recLicense.setFieldValue('custrecordr7nxliclastscantime', lastScanTimeNS);
			recLicense.setFieldValue('custrecordr7nxliclastuserlogintime', lastLoginTimeNS);
			recLicense.setFieldValue('custrecordr7nxlicdbmajorversion', nexpose_db_major_version);
			recLicense.setFieldValue('custrecordr7nxlicdbschemaversion', nexpose_db_schema_version);
			recLicense.setFieldValue('custrecordr7nxlicnexposedbsize', nexpose_db_size);
			recLicense.setFieldValue('custrecordr7nxlichostedipsused', nexpose_license_used_hosted);
			recLicense.setFieldValue('custrecordr7nxlicscanenginesused', nexpose_license_used_scanengines);
			recLicense.setFieldValue('custrecordr7nxlicassetlinking', nexpose_license_asset_link); // MB: 10/21/15 - Added Asset Linking per  Idea P-I-30: Add "nexpose.usage.cross.site.correlation" to Netsuite - Nexpose Usage data from UpdateInsight
			recLicense.setFieldValue('custrecordr7nxliceaenabled', nexpose_license_ea_enabled); // MB: 5/26/16 - APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs add "nexpose.usage.ea.enabled"
			recLicense.setFieldValue('custrecordr7nxlictotalipsused', nexpose_license_used_total);
			recLicense.setFieldValue('custrecordr7nxlictotalipsrange', nexpose_license_range_total);
			recLicense.setFieldValue('custrecordr7nxliccustompoliciescount', nexpose_usage_custom_policies);
			recLicense.setFieldValue('custrecordr7nxliccustomreporttemplates', nexpose_usage_custom_report_templates);
			recLicense.setFieldValue('custrecordr7nxliccustomscantemplates', nexpose_usage_custom_scan_templates);
			recLicense.setFieldValue('custrecordr7nxlicriskmodel', nexpose_usage_risk_model);
			recLicense.setFieldValue('custrecordr7nxlicenginesusedscans', nexpose_usage_scan_engines);
			recLicense.setFieldValue('custrecordr7nxlicnumscannedaddresses', nexpose_usage_scanned_addresses);
			recLicense.setFieldValue('custrecordr7nxlicnumberofscansrun', nexpose_usage_scans);
			recLicense.setFieldValue('custrecordr7nxlicnumwebscansrun', nexpose_usage_web_scans);
			recLicense.setFieldValue('custrecordr7nxlicnexposeversion', nexpose_version);
			recLicense.setFieldValue('custrecordr7nxlicproductupdateid', product_update_id);
			recLicense.setFieldValue('custrecordr7nxlicfeaturesenabled', nexpose_usage_features_enabled_text);
			recLicense.setFieldValue('custrecordr7nxlicstaticassetgroups', nexpose_usage_static_asset_groups);
			recLicense.setFieldValue('custrecordr7nxlicdynamicassetgroups', nexpose_usage_dynamic_asset_groups);
			recLicense.setFieldValue('custrecordr7nxlicassetswpolicyorvulnresu', nexpose_usage_assets_with_policy_or_vuln_results);
			recLicense.setFieldValue('custrecordr7nxlicassetswpolicyresults', nexpose_usage_assets_with_policy_results);
			recLicense.setFieldValue('custrecordr7nxlicassetswvulnresults', nexpose_usage_assets_with_vuln_results);
			recLicense.setFieldValue('custrecordr7nxlicreportspertemplate', nexpose_usage_reports_per_template_text);
			recLicense.setFieldValue('custrecordr7nxlicsitesperscantemplate', nexpose_usage_site_per_scan_template_text);
			recLicense.setFieldValue('custrecordr7nxlicusersperrole', nexpose_usage_users_per_role_text);
			recLicense.setFieldValue('custrecordr7nxlicnumberofsites', nexpose_usage_site_count);
			recLicense.setFieldValue('custrecordr7nxlicnumberofusersused', nexpose_usage_user_count);
			recLicense.setFieldValue('custrecordr7nxlicnumberofreportsused', nexpose_usage_report_count);
			recLicense.setFieldValue('custrecordr7nxlicsharedcredentials', nexpose_usage_shared_credentials);
			recLicense.setFieldValue('custrecordr7nxlicenseactivated', isActivated);
			
			//usage
			recLicense.setFieldValue('custrecordr7nxlicense_activationdate', activatedTimeNS);
			recLicense.setFieldValue('custrecordr7nxlicense_lastupdatedate', lastUpdateDateNS);
			recLicense.setFieldValue('custrecordr7nxlastaccessed', lastContactDateNS);
			recLicense.setFieldValue('custrecordr7nxos', os);
			recLicense.setFieldValue('custrecordr7nxcpucores', numberOfCPUCores);
			recLicense.setFieldValue('custrecordr7nxcpumhz', cpuSpeedMhz);
			recLicense.setFieldValue('custrecordr7nxfreeram', freeRAM);
			recLicense.setFieldValue('custrecordr7nxtotalram', totalRAM);
			recLicense.setFieldValue('custrecordr7nxdiskstats', diskStats);
			recLicense.setFieldValue('custrecordr7nxjre', jreVersion);
			recLicense.setFieldValue('custrecordr7nxlicense_lastupdateverid', productVersionId);
			recLicense.setFieldValue('custrecordr7nxlicense_lastupdateverdesc', productVersionDesc);
			recLicense.setFieldValue('custrecordr7nxuptime', upTime);
			recLicense.setFieldValue('custrecordr7nxdbms', dbms);
			recLicense.setFieldValue('custrecordr7dbmsv', dbmsVersion);
			recLicense.setFieldValue('custrecordr7nxassociatedips', ipAddresses);
			recLicense.setFieldValue('custrecordr7nxproductserialnumber', serialNumber);
			recLicense.setFieldValue('custrecordr7nxlicense_city', geoIp_city);
			recLicense.setFieldValue('custrecordr7nxlicense_continent', geoIp_continent);
			recLicense.setFieldValue('custrecordr7nxlicense_country', geoIp_country);
			recLicense.setFieldValue('custrecordr7nxlicense_state', geoIp_state);
			recLicense.setFieldValue('custrecordr7nxlicense_dbsizeamdefault', db_schema_size_asset_manager_default);
			recLicense.setFieldValue('custrecordr7nxlicense_dbsizecentrics', db_schema_size_centrics);
			recLicense.setFieldValue('custrecordr7nxlicense_dbsizenxadmin', db_schema_size_nxadmin);
			recLicense.setFieldValue('custrecordr7nxlicense_dbsizenxglobal', db_schema_size_nxglobal);
			recLicense.setFieldValue('custrecordr7nxlicense_dbsizenxsilo', db_schema_size_nxsilo_default);
			recLicense.setFieldValue('custrecordr7nxlicense_usgdatabaselocal', nexpose_db_local);
			recLicense.setFieldValue('custrecordr7nxlicense_cicontrolsenabled', controls_insight_enabled_controls_text);
			recLicense.setFieldValue('custrecordr7nxlicense_ciuserlastlogin', controls_insight_user_login_text);
			
			/*
			 * MB: 9/9/16 - APTCM-347 #30387 - Add new Nexpose product usage metrics to the license record in Netsuite in order to more effectively track customer adoption/usage
			 * 		Adding 19 new NX Usage Metrics fields per Eric Reiners request - Samanage Incident 30387
			 */	
			recLicense.setFieldValue('custrecordr7nxlicenseneedsactivatedtime', nexpose_usage_needs_activation);
			recLicense.setFieldValue('custrecordr7nxlicensescheduledbackups', nexpose_usage_backups_sched);
			recLicense.setFieldValue('custrecordr7nxlicensescheduledmaint', nexpose_usage_maint_sched);
			recLicense.setFieldValue('custrecordr7nxlicenecalendarsubscription', nexpose_usage_calendar_subscription);
			recLicense.setFieldValue('custrecordr7nxlicenseenginealertsenabled', nexpose_usage_engine_alerts_enabled);
			recLicense.setFieldValue('custrecordr7nxlicenseenginepoolsinterlea', nexpose_usage_engine_pools_interleaved);
			recLicense.setFieldValue('custrecordr7nxlicenseenginepoolsloadbal', nexpose_usage_engines_loadbalanced);
			recLicense.setFieldValue('custrecordr7nxlicenseenginepoolsroundrob', nexpose_usage_engines_pools_roundrobin);
			recLicense.setFieldValue('custrecordr7nxlicensesilocount', nexpose_usage_silo_count);
			recLicense.setFieldValue('custrecordr7nxlicensesitesusinglocaleng', nexpose_usage_sites_using_local);
			recLicense.setFieldValue('custrecordr7nxlicenseusesactivesync', nexpose_usage_uses_activesynch);
			recLicense.setFieldValue('custrecordr7nxlicenseusesaws', nexpose_usage_uses_aws);
			recLicense.setFieldValue('custrecordr7nxlicenseusesdatabaseexport', nexpose_usage_uses_data_export);
			recLicense.setFieldValue('custrecordr7nxlicenseusesdatawarehouse', nexpose_usage_uses_warehousing);
			recLicense.setFieldValue('custrecordr7nxlicenseusesvassetdiscovery', nexpose_usage_uses_vasset_disc);
			recLicense.setFieldValue('custrecordr7nxlicenseusesvsphere', nexpose_usage_uses_vsphere);
			recLicense.setFieldValue('custrecordr7nxlicenseusesremoteservice', nexpose_usage_uses_remote_enablement);
			recLicense.setFieldValue('custrecordr7nxlicenseassetstagged', nexpose_usage_assets_tagged);
			recLicense.setFieldValue('custrecordr7nxlicenseusesadaptive', nexpose_usage_uses_adaptive);
			
			//temp - can remove after data refresh complete
			recLicense.setFieldValue('custrecordr7nxlicense_tempdatarefreshcom', 'T');
			
			nlapiSubmitRecord(recLicense);
			return true;
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not submit license - NX Data Integration', 'LicenseID: ' + nsLicenseId + '\nError: ' + e);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not submit license - NX Data Integration', 'LicenseID: ' + nsLicenseId + '\nError: ' + e);
			return false;
		}
		
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Problem parsing response - nx lic data', err);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Problem parsing response - nx lic data', 'Error: ' + err);
		return false;
	}
	
	return false;
}

function updateFieldIfBlank(recLicense, fieldId, newValue){
	if (isBlank(recLicense.getFieldValue(fieldId))) {
		recLicense.setFieldValue(fieldId, newValue);
	}
	return recLicense;
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}

function grabLicenseDetails(operation, productKey, intervalMinutes){

	var endpointForQueries = '';
	switch (operation) {
		case 'getLicenses':
			//Endpoint for queries
			endpointForQueries = endPoint + '/command?op=getLicenses';
			
			//We have updated information till this timestamp
			var arrTimestamps = obtainTimestampsForUpdate(intervalMinutes);
			endpointForQueries += '&timeStart=' + arrTimestamps[0];
			endpointForQueries += '&timeStop=' + arrTimestamps[1];

			var objResponse = getServerResponse(endpointForQueries);
			var arrLicenses = objResponse.licenses;
			arrLicenses = arrLicenses.sort(myCustomTimeSort);
			return [arrLicenses, arrTimestamps[0], arrTimestamps[1]];
			break;
		case 'getLicense':
			endpointForQueries = endPoint + '/command?op=getLicense&productKey=' + productKey;
			var objLicense = getServerResponse(endpointForQueries);
			return objLicense;
			break;
	}
	
	if (endpointForQueries == null || endpointForQueries == '') {
		return null;
	}
	
}

function getServerResponse(endpointForQueries){

	endpointForQueries = encodeURI(endpointForQueries);
	nlapiLogExecution('AUDIT', 'Server Request URL', endpointForQueries);
	//Obtain response from NX server, by passing in a timestamp
	//The webservice returns all licenses that have touched server since timeStart
	try
	{
		var authHeaders = [];
		authHeaders['Authorization'] = uadminAuth;
		queryResponse = nlapiRequestURL(endpointForQueries, null, authHeaders);
	}
	catch (err) {
		nlapiLogExecution('ERROR', err.name, err.message);
		throw nlapiCreateError(err.name, err, false);
	}

	//Get Body of Response
	var body = queryResponse.getBody();


	if (body == null || body.length <= 1) {
		throw nlapiCreateError("INVALIDRESPONSE", body, false);
	}
    
	//Attempt to parse JSON text returned
	try {
		/*if (nlapiGetUser() == 340932) {
			nlapiSendEmail(55011, 340932, 'Update Stats NX', 'endpointForQueries: ' + endpointForQueries + '\nResponse: \n\n' + body);
		}*/

		var objResponse = JSON.parse(body);
		return objResponse;
	}
	catch (err) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'JSON Body of Response', 'ERROR: \n\n' + err.name + ' : ' + err.message + '\n\nEndpoint: ' + endpointForQueries + '\n\nResponse body from server: \n\n' + body);
		nlapiLogExecution('ERROR', err.name, 'ERROR: ' + err.message + '\n\Response body from server: \n\n' + body);
		throw nlapiCreateError("Error parsing response JSON", err, false);
	}
	return null;
}

function getPSTDate(dateObject){
	
	if (dateObject != null) {
		var currentOffSet = findCurrentPSTOffset();
		dateObject.setHours(dateObject.getHours() - currentOffSet + 3); //for some reason it is storing on EST time even tho servers are in SanFran.. adjusting to compensate
		return dateObject;
	}
	return null;
}

function findCurrentPSTOffset(){

	//this is assuming that NS datacenters stay in SanFran
	var currentOffSet = (new Date().getTimezoneOffset()) / (60);
	return currentOffSet;
}

function createDateObject(strDate){

	//2013-04-21 17:14:06
	//new Date(yy,mm,dd,hh,mm,ss)
	
	if (strDate != null && strDate != '') {
		var yy = strDate.substr(0, 4);
		var mm = strDate.substr(5, 2) - 1;
		var dd = strDate.substr(8, 2);
		var hh = strDate.substr(11, 2);
		var mi = strDate.substr(14, 2);
		var ss = strDate.substr(17, 2);
		
		return new Date(yy, mm, dd, hh, mi, ss);
	}
	
	return null;
}

function createUTCDateObject(strDate){

	//2013-04-21 17:14:06
	//new Date(yy,mm,dd,hh,mm,ss)
	
	if (strDate != null && strDate != '') {
		var yy = strDate.substr(0, 4);
		var mm = strDate.substr(5, 2) - 1;
		var dd = strDate.substr(8, 2);
		var hh = strDate.substr(11, 2);
		var mi = strDate.substr(14, 2);
		var ss = strDate.substr(17, 2);
		
		return Date.UTC(yy, mm, dd, hh, mi, ss);
	}
	
	return null;
}

//Returns the timestamp till which Netsuite data
//is perfectly synced with the NX Licensing server
function obtainTimestampsForUpdate(intervalMinutes){
	
	if (intervalMinutes == null || intervalMinutes == '' || intervalMinutes <= 0){
		intervalMinutes = 60;
	}
	
	var startTimestamp = null;
	var endTimestamp = null;
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7nxlicense_lastcontacttimesta', null, 'isnotempty');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7nxlicense_lastcontacttimesta', null, 'max');
	arrSearchColumns[1] = new nlobjSearchColumn('formulatext', null, 'max');
	arrSearchColumns[1].setFormula("to_char({today}, 'YYYY-MM-DD') || 'T' || to_char({today}, 'HH24:MI:SS')");
	arrSearchColumns[2] = new nlobjSearchColumn('formulatext', null, 'max');
	arrSearchColumns[2].setFormula("LEAST(MAX(to_char({today}, 'YYYY-MM-DD') || 'T' || to_char({today}, 'HH24:MI:SS')), MAX({custrecordr7nxlicense_lastcontacttimesta}))");
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrSearchFilters, arrSearchColumns);
	if (arrSearchResults != null) {
		startTimestamp = arrSearchResults[0].getValue(arrSearchColumns[0]);	
		if (!isBlank(startTimestamp)){
			startTimestamp = startTimestamp.replace(' ', 'T');
		}
	}
	
	endTimestamp = addMinutesToNexposeDateString(startTimestamp, intervalMinutes);
	
	var dtEndTimestamp = createDateObject(endTimestamp);
	var dtNow = new Date();
	var dtNow_utc = new Date(dtNow.getUTCFullYear(), dtNow.getUTCMonth(), dtNow.getUTCDate(),  dtNow.getUTCHours(), dtNow.getUTCMinutes(), dtNow.getUTCSeconds());
	var dtNow_utc_5_min_ago = new Date(dtNow_utc.getTime() - 5 * 60000);
	
	nlapiLogExecution('AUDIT', 'endTimestamp - orig', endTimestamp);
	nlapiLogExecution('AUDIT', 'dtNow_utc_5_min_ago', dtNow_utc_5_min_ago);
	nlapiLogExecution('AUDIT', 'dtEndTimestamp', dtEndTimestamp);
	
	if (dtNow_utc_5_min_ago.getTime() < dtEndTimestamp.getTime()){
		
		var yy = dtNow_utc_5_min_ago.getFullYear();
		var mm = dRound(dtNow_utc_5_min_ago.getMonth() + 1);
		var dd = dRound(dtNow_utc_5_min_ago.getDate());
		var hh = dRound(dtNow_utc_5_min_ago.getHours());
		var mi = dRound(dtNow_utc_5_min_ago.getMinutes());
		var ss = dRound(dtNow_utc_5_min_ago.getSeconds());
		
		var newDateString = yy + '-' + mm + '-' + dd + 'T' + hh + ':' + mi + ':' + ss;
		
		endTimestamp = newDateString;
	}
	
	nlapiLogExecution('AUDIT', 'endTimestamp - using', endTimestamp);
	return new Array(startTimestamp, endTimestamp);
}

function addMinutesToNexposeDateString(strDate, minutesToAdd){

	//2013-04-21 17:14:06
	//new Date(yy,mm,dd,hh,mm,ss)
	
	if (strDate != null && strDate != '' && minutesToAdd != null && minutesToAdd != '') {
		var yy = strDate.substr(0, 4);
		var mm = strDate.substr(5, 2) - 1;
		var dd = strDate.substr(8, 2);
		var hh = strDate.substr(11, 2);
		var mi = strDate.substr(14, 2);
		var ss = strDate.substr(17, 2);
		
		var dtObject = new Date(yy, mm, dd, hh, mi, ss);
		dtObject.setMinutes(dtObject.getMinutes() + parseInt(minutesToAdd));
		
		yy = dtObject.getFullYear();
		mm = dRound(dtObject.getMonth() + 1);
		dd = dRound(dtObject.getDate());
		hh = dRound(dtObject.getHours());
		mi = dRound(dtObject.getMinutes());
		ss = dRound(dtObject.getSeconds());
		
		var newDateString = yy + '-' + mm + '-' + dd + 'T' + hh + ':' + mi + ':' + ss;
		
		return newDateString;
	}
	
	return null;
}

function dRound(value){
	value = value + '';
	if (value.length == 1) {
		value = '0' + value;
	}
	return value;
}

function grabNSLicenseId(productKey){

	var searchFilters = new Array(new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey));
	
	var searchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, searchFilters);
	
	if (searchResults != null) {
		return searchResults[0].getId();
	}
	
	return null;
}

/*
 * Get list of licenses accessed today
 */
function getDailyLicenseMap(){

	var objDailyLicMap = new Object();
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7nxlastaccessed', null, 'on', 'today');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7nxlicense_activationdate', null, 'isnotempty');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custrecordr7nxproductkey');

	var savedsearch = nlapiCreateSearch('customrecordr7nexposelicensing', arrFilters, arrColumns);
	
	var resultSet = savedsearch.runSearch();

	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			objDailyLicMap[resultSlice[rs].getValue(arrColumns[1])] = resultSlice[rs].getId(); // add id to map
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objDailyLicMap;
	
}

function myCustomTimeSort(a, b){
	var timeA = a.lastContactTime;
	var timeB = b.lastContactTime;
	if (timeA < timeB) //sort string ascending
		return -1;
	if (timeA > timeB) 
		return 1;
	return 0; //default return value (no sorting)
}
