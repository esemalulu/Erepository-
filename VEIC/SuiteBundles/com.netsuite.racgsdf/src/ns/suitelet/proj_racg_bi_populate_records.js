/**
 * @NApiVersion 2.x
 * @NScriptType SDFInstallationScript
 */
define(
	['N/log', 'N/record', 'N/search', 'N/error', 'N/runtime'],
	function (nLog, nRecord, nSearch, nError, nRuntime) {
		var joinMap = {};

		function debug(title, message) {
			nLog.debug({
				title: title,
				details: message
			});
		}

		function checkGovernanceWithError(governanceLimit) {
			var currentGovernance = nRuntime.getCurrentScript().getRemainingUsage();
			if (currentGovernance <= governanceLimit) {
				throw('ERROR: Not enough governance: ' + currentGovernance);
			}
		}

		function copyRecords(sourceId, targetId, searchFilters, fieldNameMap, mapTheIds) {
			var MINIMAL_REQUIRED_GOVERNANCE = 10;
			var SAVE_AND_CREATE_GOVERNANCE_CONSUMPTION = 6;

			checkGovernanceWithError(MINIMAL_REQUIRED_GOVERNANCE);

			var searchObject = nSearch.create({
				type: sourceId,
				filters: searchFilters,
				columns: ['internalid'].concat(Object.keys(fieldNameMap))
			});

			var resultSet = searchObject.run();

			var i = 0;
			var j = null;
			var searchIndex = 0;
			var searchStep = 1000;
			var searchResult = resultSet.getRange({
				start: searchIndex,
				end: searchStep
			});

			while (searchResult.length) {
				checkGovernanceWithError(MINIMAL_REQUIRED_GOVERNANCE + searchResult.length * SAVE_AND_CREATE_GOVERNANCE_CONSUMPTION);
				debug('Result chunk retrieved', 'Chunk size=' + searchResult.length);

				for (i in searchResult) {
					var result = searchResult[i];

					var record = nRecord.create({type: targetId});
					var keys = Object.keys(fieldNameMap);
					for (j in keys) {
						var key = keys[j];
						var value = result.getValue(key);

						if (typeof fieldNameMap[key] === 'object' && fieldNameMap[key] !== null) {
							value = joinMap[fieldNameMap[key].mapTo][value];
						}

						record.setValue({
							fieldId: (fieldNameMap[key].target) ? fieldNameMap[key].target : fieldNameMap[key],
							value: value
						});
					}

					record.setValue({
						fieldId: 'owner',
						value: result.getValue('owner')
					});

					var newId = record.save();

					if (mapTheIds) {
						if (!joinMap[targetId]) {
							joinMap[targetId] = {};
						}
						joinMap[targetId][result.getValue('internalid')] = newId;
					}

					debug('Setting saved', JSON.stringify(record));
				}
				searchIndex += searchStep;
				searchResult = resultSet.getRange({
					start: searchIndex,
					end: searchIndex + searchStep
				});
			}
		}

		function copySettings() {
			var fieldNameMap = {
				'custrecord_entity_id': 'custrecord_proj_racg_entity_id',
				'custrecord_entity_type': 'custrecord_proj_racg_entity_type',
				'custrecord_allocate_by': 'custrecord_proj_racg_allocate_by',
				'custrecord_show_numbers': 'custrecord_proj_racg_show_numbers',
				'custrecord_include_all_resources': 'custrecord_proj_racg_show_numbers',
				'custrecord_availability_color_1': 'custrecord_proj_racg_avail_color_1',
				'custrecord_availability_color_2': 'custrecord_proj_racg_avail_color_2',
				'custrecord_availability_color_3': 'custrecord_proj_racg_avail_color_3',
				'custrecord_availability_color_4': 'custrecord_proj_racg_avail_color_4',
				'custrecord_availability_color_5': 'custrecord_proj_racg_avail_color_5',
				'custrecord_show_hovers': 'custrecord_proj_racg_show_hovers',
				'custrecord_show_project_tasks': 'custrecord_proj_racg_show_tasks',
				'custrecord_include_shared': 'custrecord_proj_racg_include_shared',
				'custrecord_selected_filter': 'custrecord_proj_racg_selected_filter',
				'custrecord_include_rejected': 'custrecord_proj_racg_include_rejected',
				'custrecord_chart_density': 'custrecord_proj_racg_chart_density',
				'custrecord_name_counter': 'custrecord_proj_racg_name_counter',
				'custrecord_expand_filter_summary': 'custrecord_proj_racg_expand_filters',
				'custrecord_hidden_columns': 'custrecord_proj_racg_hidden_columns',
				'custrecord_last_used_mode': 'custrecord_proj_racg_last_used_mode',
				'custrecord_limit_decimal_places': 'custrecord_proj_racg_decimal_places',
				'custrecord_expanded_allocations': 'custrecord_proj_racg_expanded_allocs',
				'custrecord_view_preset': 'custrecord_proj_racg_view_preset',
				'custrecord_ra_setting_inc_template': 'custrecord_proj_racg_inc_template'
			};

			var searchFilter = nSearch.createFilter({
				name: 'isinactive',
				join: "custrecord_entity_id",
				operator: nSearch.Operator.IS,
				values: ['F']
			});

			copyRecords('customrecord_ra_ui_setting', 'customrecord_proj_racg_ui_setting', searchFilter, fieldNameMap);
			debug('Settings copied');
		}

		function copyFilters() {
			var fieldNameMap = {
				'name': 'name',
				'owner': 'owner',
				'custrecord_racg_filter_is_shared': 'custrecord_proj_racg_filter_is_shared',
				'custrecord_racg_filter_view_by_type': 'custrecord_proj_racg_filter_view_by_type',
				'custrecord_racg_filter_is_default': 'custrecord_proj_racg_filter_is_default',
				'custrecord_racg_filter_record1': 'custrecord_proj_racg_filter_record1',
				'custrecord_racg_filter_field1': 'custrecord_proj_racg_filter_field1',
				'custrecord_racg_filter_record2': 'custrecord_proj_racg_filter_record2',
				'custrecord_racg_filter_field2': 'custrecord_proj_racg_filter_field2',
				'custrecord_racg_filter_record3': 'custrecord_proj_racg_filter_record3',
				'custrecord_racg_filter_field3': 'custrecord_proj_racg_filter_field3',
				'custrecord_racg_filter_record4': 'custrecord_proj_racg_filter_record4',
				'custrecord_racg_filter_field4': 'custrecord_proj_racg_filter_field4',
				'custrecord_racg_filter_record5': 'custrecord_proj_racg_filter_record5',
				'custrecord_racg_filter_field5': 'custrecord_proj_racg_filter_field5',
				'custrecord_racg_filter_record6': 'custrecord_proj_racg_filter_record6',
				'custrecord_racg_filter_field6': 'custrecord_proj_racg_filter_field6',
				'custrecord_racg_filter_record7': 'custrecord_proj_racg_filter_record7',
				'custrecord_racg_filter_field7': 'custrecord_proj_racg_filter_field7',
				'custrecord_racg_filter_record8': 'custrecord_proj_racg_filter_record8',
				'custrecord_racg_filter_field8': 'custrecord_proj_racg_filter_field8'
			};

			copyRecords('customrecord_racg_filter', 'customrecord_proj_racg_filter', null, fieldNameMap, true);
			debug('Filters copied');
		}

		function copyFilterValues() {
			var fieldNameMap = {
				'owner': 'owner',
				'custrecord_racg_filter': {target: 'custrecord_proj_racg_filter', mapTo: 'customrecord_proj_racg_filter'},
				'custrecord_racg_filter_values_json': 'custrecord_proj_racg_filter_values_json'
			};

			copyRecords('customrecord_racg_filter_values', 'customrecord_proj_racg_filter_values', null, fieldNameMap);
			debug('Filters copied');
		}

		function createDefaultFilters(context) {
			var defaultSettings = [
				{ // id=1
					name: '- Customer Default -',
					custrecord_proj_racg_filter_view_by_type: "2",
					custrecord_proj_racg_filter_is_default: true,
					custrecord_proj_racg_filter_record1: "Allocation",
					custrecord_proj_racg_filter_field1: "customer",
					custrecord_proj_racg_filter_record2: "Allocation",
					custrecord_proj_racg_filter_field2: "project",
					custrecord_proj_racg_filter_record3: "Resource",
					custrecord_proj_racg_filter_field3: "name",
					custrecord_proj_racg_filter_record4: "Allocation",
					custrecord_proj_racg_filter_field4: "startdate",
				}, { // id=2
					name: '- Resource Default -',
					custrecord_proj_racg_filter_view_by_type: "1",
					custrecord_proj_racg_filter_is_default: true,
					custrecord_proj_racg_filter_record1: "Resource",
					custrecord_proj_racg_filter_field1: "name",
					custrecord_proj_racg_filter_record2: "Resource",
					custrecord_proj_racg_filter_field2: "type",
					custrecord_proj_racg_filter_record3: "Allocation",
					custrecord_proj_racg_filter_field3: "allocationtype",
					custrecord_proj_racg_filter_record4: "Allocation",
					custrecord_proj_racg_filter_field4: "allocationlevel",
					custrecord_proj_racg_filter_record5: "Allocation",
					custrecord_proj_racg_filter_field5: "startdate",
				}, { // id=3
					name: '- Project Default -',
					custrecord_proj_racg_filter_view_by_type: "3",
					custrecord_proj_racg_filter_is_default: true,
					custrecord_proj_racg_filter_record1: "Allocation",
					custrecord_proj_racg_filter_field1: "project",
					custrecord_proj_racg_filter_record2: "Resource",
					custrecord_proj_racg_filter_field2: "name",
					custrecord_proj_racg_filter_record3: "Allocation",
					custrecord_proj_racg_filter_field3: "startdate",
				}
			];

			var filterPresets = [null, null, null];
			for (var i = 0; i < filterPresets.length; i++) { // Load filters if they exist, or create new ones
				try {
					filterPresets[i] = record.load({
						type: 'customrecord_proj_racg_filter',
						id: i + 1
					});
				} catch (ex) {
					log.debug('Failed to load filter1. Creating new instance', ex.toString());
				}

				if (!filterPresets[i]) {
					filterPresets[i] = nRecord.create({
						type: 'customrecord_proj_racg_filter',
						id: i
					});
				}
			}

			for (var i = 0; i < defaultSettings.length; i++) {
				var fields = defaultSettings[i];
				var keys = Object.keys(fields);
				for (var j = 0; j < keys.length; j++) {
					var key = keys[j];
					filterPresets[i].setValue({
						fieldId: key,
						value: fields[key]
					});
				}
				filterPresets[i].save();
			}
		}

		function isFreshInstall() {
			// if this is only an update, then at least the default filters are already present
			var searchObject = nSearch.create({
				type: 'customrecord_proj_racg_filter',
				columns: ['internalid']
			});

			var resultSet = searchObject.run();

			var searchResult = resultSet.getRange({
				start: 0,
				end: 1
			});

			if (searchResult.length) {
				debug('Found filter records; assuming this is just a version update');
				return false;
			} else {
				debug('No filter records found; Assuming this is a fresh installation');
				return true;
			}
		}

		function isVersionUpgrade() {
			try {
				var searchObject = nSearch.create({
					type: 'customrecord_racg_filter',
					columns: ['internalid']
				});

				var resultSet = searchObject.run();

				var searchResult = resultSet.getRange({
					start: 0,
					end: 10
				});

				debug('Found results for old records; assuming previous version is present');
				return true;
			} catch (ex) {
				debug('Previous version search raised exception; assuming it does not exist', JSON.stringify(ex));
				return false;
			}
		}

		function run(context) {
			if (!isFreshInstall()) {
				debug('Installation script ignored');
				return true;
			}

			// is RACG installed?
			if (isVersionUpgrade()) {
				debug('Copying data from previous RACG');
				copyFilters();
				copyFilterValues();
				try {
					//Intentionally catching only copySettings. Failure of copy of filters and filter values is critical.
					//Not copying setting is not a critical problem
					copySettings();
				} catch (ex) {
					nLog.error(ex);
				}
			} else {
				debug('Setting up default data');
				createDefaultFilters();
			}

		}

		return {
			run: run
		};
	}
);
