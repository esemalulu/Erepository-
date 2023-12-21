/**
 * This script was provided by Starling Solutions.
 *
 * Library for the Excel Validation tool
 *
 *  Version     Date        	 Author              	Ticket         	Remarks
 *************************************************************************
 *  1.0         21 Oct 2020      Nicholas Bell          STP-146      	Initial Remarks
 *************************************************************************
 */

define(['N/file','N/record', 'N/search', 'N/task'],


	function (file, record, search,  task) {

		const SUBLIST_SUBRECORDS = {
			addressbook1 : {
				SUBLIST         : 'addressbook',
				SUBRECORD       : 'addressbookaddress',
				SUBREC_FIELDS   : {
					Address1_country : 'country',
					Address1_attention : 'attention',
					Address1_Addressee : 'addressee',
					Address1_phone : 'phone',
					Address1_line1 : 'addr1',
					Address1_line2 : 'addr2',
					Address1_line3 : 'addr3',
					Address1_city : 'city',
					Address1_state : 'state',
					Address1_zipcode : 'zip',
 				},
				SUBLIST_FIELDS  : {
					Address1_AddressName        : 'label',
					Address1_defaultBilling     : 'defaultbilling',
					Address1_defaultShipping    : 'defaultshipping',
				}
			},
			addressbook2 : {
				SUBLIST         : 'addressbook',
				SUBRECORD       : 'addressbookaddress',
				SUBREC_FIELDS   : {
					Address2_country : 'country',
					Address2_attention : 'attention',
					Address2_Addressee : 'addressee',
					Address2_phone : 'phone',
					Address2_line1 : 'addr1',
					Address2_line2 : 'addr2',
					Address2_line3 : 'addr3',
					Address2_city : 'city',
					Address2_state : 'state',
					Address2_zipcode : 'zip',
				},
				SUBLIST_FIELDS  : {
					Address2_AddressName        : 'label',
					Address2_defaultBilling     : 'defaultbilling',
					Address2_defaultShipping    : 'defaultshipping',
				}
			},
			addressbook3 : {
				SUBLIST         : 'addressbook',
				SUBRECORD       : 'addressbookaddress',
				SUBREC_FIELDS   : {
					Address3_country : 'country',
					Address3_attention : 'attention',
					Address3_Addressee : 'addressee',
					Address3_phone : 'phone',
					Address3_line1 : 'addr1',
					Address3_line2 : 'addr2',
					Address3_line3 : 'addr3',
					Address3_city : 'city',
					Address3_state : 'state',
					Address3_zipcode : 'zip',
				},
				SUBLIST_FIELDS  : {
					Address3_AddressName        : 'label',
					Address3_defaultBilling     : 'defaultbilling',
					Address3_defaultShipping    : 'defaultshipping',
				}
			}
		};

		// Todo this is dumb. You know what each field's linked record is...
		const REC_TYPE_MAP = {
			custrecord_blend_sds_file_group         : 'customrecord_blend_sds_group',
			custitem_blend_sds_item_group           : 'customrecord_blend_sds_group',
			custrecord_blend_sds_file               : 'file',
			custrecord_blend_shipid_shipping_group  : 'customrecord_blend_shipping_group',
			custrecord_blend_shipid_jurisdiction    : 'customrecord_blend_shipping_jurisdiction'
		};

		const ITEM_TYPE_MAP = {
			'Assembly'           : 'assemblyitem',
			'Inventory Item'     : 'inventoryitem',
			'Non-Inventory Item' : 'noninventoryitem',
			'Kit/Package'        : 'kititem',
			'Service'            : 'serviceitem',
			'Other Charge'       : 'otherchargeitem'
		};

		// Helper Functions

		/**
		 * Finds any sublist fields and sets their line values according to the constant above.
		 *
		 * @param {Object} data - The CSV row representing the record being created.
		 * @param {Array} fieldNames - A list of all applicable fieldNames to be iterated over.
		 * @param {Array} sublistColumns - A list of columns indicating which sublist the fields in the data belong to.
		 * @param {Record} thisRecord - The record to be updated.
		 * @since 2015.1
		 */
		function setSublistSubrecordValues( data, fieldNames, sublistColumns, thisRecord ) {

			log.debug({ title : 'Setting sublist/subrecord fields.' });
			log.debug({ title : 'SublistCols', details : sublistColumns });

			let sublistLines    = {}; //Array containing objects to be added to the sublist

			for ( let i=0; i<fieldNames.length; i++ ) {

				if ( !sublistColumns[i] ) {
					continue; //Only process columns that have a sublist name in them.
				}

				let sublistName = sublistColumns[i];
				//Determine if we have already set this line or not.  If we haven't create a new object and populate it with all relevant info.
				if ( SUBLIST_SUBRECORDS[sublistName] && !sublistLines[sublistName] ) {
					//initialize a new object for this sublist/subrec line.
					sublistLines[sublistName]                   = {};
					sublistLines[sublistName]['hasValue']       = false; //If no fields are added, this will stay false and won't run.
					sublistLines[sublistName]['sublist']        = SUBLIST_SUBRECORDS[sublistName].SUBLIST;
					sublistLines[sublistName]['subrecord']      = SUBLIST_SUBRECORDS[sublistName].SUBRECORD;
					sublistLines[sublistName]['subrec_fields']  = {};
					sublistLines[sublistName]['sublist_fields'] = {};

					let subrecFieldMap    = SUBLIST_SUBRECORDS[sublistName].SUBREC_FIELDS;
					let sublistFieldMap   = SUBLIST_SUBRECORDS[sublistName].SUBLIST_FIELDS;

					Object.keys( subrecFieldMap ).forEach(function(key) {
						let nsFieldId = subrecFieldMap[key];
						if ( data[key] || data[key] == 0 ) {
							sublistLines[sublistName]['subrec_fields'][nsFieldId] = data[key];
						}
					});

					Object.keys( sublistFieldMap ).forEach(function(key) {
						let nsFieldId = sublistFieldMap[key];
						if ( data[key] || data[key] == 0 ) {
							sublistLines[sublistName]['hasValue']                  = true; //Mark this as having values to set.
							sublistLines[sublistName]['sublist_fields'][nsFieldId] = data[key];
						}
					})

				}

			}

			//Now that all cells have been evaluated, set the sublist/subrecord.
			Object.keys( sublistLines ).forEach(function(sublistRef) {

				if ( !sublistLines[sublistRef]['hasValue'] ) {
					return; //If no values need to be set, skip this one.
				}

				let sublistName = sublistLines[sublistRef]['sublist']; //Get the name of the sublist to be worked on.
				let subrecName  = sublistLines[sublistRef]['subrecord']; //Get the name of the sublist to be worked on.
				let lastLine    = thisRecord.getLineCount({ sublistId : sublistName });

				Object.keys(sublistLines[sublistRef]['sublist_fields']).forEach(function (fieldId) {
					let thisValue = sublistLines[sublistRef]['sublist_fields'][fieldId];
					log.debug({ title : 'Value receieved', details : [ thisValue, fieldId ] });

					if (thisValue.toLowerCase() == 'true') {
						thisValue = true;
						log.debug({ title : 'Setting ' + fieldId, details : [thisValue, lastLine] });
					}
					else if (thisValue.toLowerCase() == 'false') {
						thisValue = false;
						log.debug({ title : 'Setting ' + fieldId, details : [thisValue, lastLine] });
					}
					if ( thisValue || thisValue === false ) {
						thisRecord.setSublistValue({
							sublistId : sublistName,
							fieldId   : fieldId,
							value     : thisValue,
							line      : lastLine
						});
					}

				});

				//Once the fields on the line are set, get the subrecord and set its fields.
				let subrecord    = thisRecord.getSublistSubrecord({ sublistId : sublistName, fieldId : subrecName, line: lastLine });
				let subrecValues = sublistLines[sublistRef]['subrec_fields'];

				//Once we've created the subrecord, set the fields.
				Object.keys(subrecValues).forEach(function(fieldId) {
					let thisValue = subrecValues[fieldId];

					if (thisValue.toLowerCase() == 'true') {
						thisValue = true;
					}
					else if (thisValue.toLowerCase() == 'false') {
						thisValue = false;
					}
					if ( thisValue || thisValue == false ) {
						subrecord.setValue({ fieldId : fieldId, value : thisValue });
					}

				});


				log.debug({ title : 'Default Shipping', details : thisRecord.getSublistValue({ sublistId : SUBLIST_SUBRECORDS.addressbook1.SUBLIST, fieldId : 'defaultshipping', line: 0 }) });

				// subrecord.save();

			});

		}

		/**
		 * Set sublist values for a one-to-many transaction.
		 *
		 * @param {Object} data - The CSV row representing the record being created.
		 * @param {Array} columns - A list of all applicable fieldNames to be iterated over.
		 * @param {Array} sublistCols - A list of columns indicating which sublist the fields in the data belong to.
		 * @param {Array} colTypes - The types of columns being sent to allow us to cast our values to the correct data type.
		 */
		function setSublistValues( data, columns, sublistCols, thisRecord, colTypes ) {
			log.debug({ title : 'Setting Sublist Values', details : columns });

			let currentSublist = '';
			let lastLine       = null;
			let numSublistCols = 0;
			for( let i=0; i < columns.length; i++ ) {

				if ( !sublistCols[i] ) {
					continue; //Only sublist columns need to be set.
				}

				if ( !numSublistCols && thisRecord.isDynamic ) {
					thisRecord.selectNewLine({ sublistId : currentSublist });

				}

				let thisValue  = castValueToType( data[columns[i]], colTypes[i] );
				currentSublist = sublistCols[i]; //There can potentially be multiple sublists, so always ensure we're working on the current one.
				lastLine       = (lastLine === null && !thisRecord.isDynamic) ? thisRecord.getLineCount({ sublistId : currentSublist }) : lastLine; //Ensure we're always setting the value on the last line.

				if ( thisRecord.isDynamic ) {
					thisRecord.setCurrentSublistValue({ sublistId : currentSublist, fieldId : columns[i], value : thisValue, line : lastLine });
				}
				else {
						thisRecord.setSublistValue({ sublistId : currentSublist, fieldId : columns[i], value : thisValue, line : lastLine });
				}

				if ( i == columns.length -1 && thisRecord.isDynamic ) {
					thisRecord.commitLine({ sublistId : currentSublist });
				}
			}
		}

		/**
		 * Create the map/reduce task to import the files based on the
		 *
		 * @param {Object} thisRecord - The current Excel Import Record to be read from.
		 * @param {Boolean} create - Is this on create?
		 * @param {Number} currentIndex - The index to reference in the array of CSV ids we've sent.
		 */
		function createTask( thisRecord, create, currentIndex ) {

			let fileIds     = thisRecord.getValue({ fieldId : 'custrecord_ss_excel_file_ids_remaining' }).split(',');
			let recTypes    = thisRecord.getValue({ fieldId : 'custrecord_ss_excel_record_types' }).split(',');
			let columnKeys  = thisRecord.getValue({ fieldId : 'custrecord_ss_excel_column_keys' });
			// If file ids were received in the url parameters, then create a new task to create the records.
			let newImport = task.create({
				taskType     : task.TaskType.MAP_REDUCE,
				scriptId     : 'customscript_ss_excel_import_map',
				deploymentId : 'customdeploy_ss_excel_import_map',
				params       : {
					custscript_ss_excel_file_ids        : fileIds[currentIndex],
					custscript_ss_excel_record_types    : recTypes,
					custscript_ss_excel_current_index   : currentIndex,
					custscript_ss_excel_col_types       : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_column_type' }),
					custscript_ss_excel_col_keys        : columnKeys,
					custscript_ss_excel_sublist_cols    : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_sublist_cols' }),
					custscript_ss_excel_num_cols        : JSON.parse(columnKeys)[recTypes[currentIndex]].length,
					custscript_ss_excel_in_progress     : true,
					custscript_ss_excel_record          : thisRecord.id,
					custscript_ss_excel_add             : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_add' }),
					custscript_ss_excel_update          : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_update' }),
					custscript_ss_excel_many_to_one     : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_many_to_one' }),
					custscript_ss_excel_foreign_key     : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_foreign_key' }),
					custscript_ss_excel_is_dynamic      : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_is_dynamic' }),
					custscript_ss_excel_is_sds_import   : thisRecord.getValue({ fieldId : 'custrecord_ss_excel_is_sds_import' }),
				}
			});

			try {
				let newTaskId = newImport.submit();
				//Record the task id on this record so that the map reduce can be referenced.
				if ( create ) {
					//Since this will run aftersubmit on create, the task id needs to be submitted, rather than just set.
					record.submitFields({
						type   : 'customrecord_ss_excel_import',
						id     : thisRecord.id,
						values : {
							custrecord_ss_excel_task_id : newTaskId
						}
					});
				}
				else {
					//On subsequent passes of the map/reduce, the record will be loaded, so we can set this value here, then just save it.
					thisRecord.setValue({ fieldId : 'custrecord_ss_excel_task_id', value : newTaskId });
				}
				log.audit({ title : 'Created Task', details : newTaskId });
			}
			catch(e) {
				log.error({ title : 'Error saving task', details : e });
			}

		}

		/**
		 * Values are received as strings at this stage.  Cast them to their appropriate data types before committing them
		 *
		 * @param {String} val - The value to be cast
		 * @param {Array} fieldNames - A list of all applicable fieldNames to be iterated over.
		 * @param {Array} sublistColumns - A list of columns indicating which sublist the fields in the data belong to.
		 * @param {Record} thisRecord - The record to be updated.
		 */
		function castValueToType( val, colType ) {

			if ( colType && colType.toLowerCase() == 'number' ) {
				return Number(val);
			}

			if ( colType && colType.toLowerCase() == 'boolean' ) {
				return (val.toLowerCase() == 'true');
			}

			if ( colType && colType.toLowerCase() == 'date' ) {
				return (new Date(val));
			}

			return val; //If none of these are true, we're probably setting a string.

		}


		/**
		 * Handle the special cases from the SDS Import if selected.
		 *
		 * @param {Object} sdsRec - The current SDS record being set up.
		 * @param {Object} currentData - The data that has already been set on the record. Necessary to avoid issues with getText on create.
		 * @param {Array} columns - The column names to reference the keys of the currentData object with.
		 * @param {Number} index - The column index we're currently on.
		 * @param {String} newListId - The internal id of a previously created record from this SDS import.
		 * @returns {Boolean} modified - Whether this has modified a row or not.
		 */
		function handleSdsImport (sdsRec, currentData, columns, index, newListId) {

			let recordType = sdsRec.type;
			let currentCol = columns[index];
			let value      = currentData[currentCol];
			let modified   = false;

			if (recordType == 'customrecord_blend_sds_group') {
				//The Blend SDS Group script will automatically create the folders necessary and stamp them accordingly.
				return modified;
			}

			if (recordType == 'customrecord_blend_sds_file' && currentCol == 'custrecord_blend_sds_file_group') {
				//If this is a file type and we're linking to the group, set both the internal id AND the file id here.
				let nextCol = columns[index + 1];
				let fileId  = currentData[nextCol];

				sdsRec.setValue({ fieldId : currentCol, value : newListId }); //Set the SDS Group internal id
				sdsRec.setValue({ fieldId : nextCol, value : fileId }); //Set the file id to the SDS File record.
				moveFileToGroup(newListId, fileId); //Move the file from wherever it sits to its new home.

				modified = true;

			}

			if (recordType == 'customrecord_blend_sds_file' && currentCol == 'custrecord_blend_sds_file') {
				modified = true; //Don't set this field this time, as we've already done it on the previous column.
			}

			if (recordType == 'assemblyitem' && currentCol == 'itemid') {
				//Find the item based on its name and do a record.submitFields on it to set it.
				let itemResults = getSearchResults(search.create({
						type    : 'item',
						filters :
							[
								['name', 'is', value]
							]
					})
				);

				if (!itemResults.length) {
					throw( 'No item called ' + value + ' found. Please ensure this name is an exact match.' );
				}

				let itemId     = itemResults[0].id;
				let itemType   = itemResults[0].recordType; //String of the record type to be used below.
				let sdsName    = currentData[columns[index + 1]]; //Find the data in the NEXT column. This is the name of the SDS Group.
				let sdsGroupId = findRecord('customrecord_blend_sds_group', 'custitem_blend_sds_item_group', sdsName, 'List');
				record.submitFields({
					type   : itemType,
					id     : itemId,
					values : {
						custitem_blend_sds_item_group : sdsGroupId //Todo this isn't right... Get the id.
					}
				});

			}

			return modified;

		}

		/**
		 * Move the SDS File from wherever it sits in the file cabinet to the newly created SDS Group folder.
		 *
		 * @param {String} sdsGroupId - The internal id of the SDS Group
		 * @param {String} fileId - The internal id of the file in the file cabinet.
		 */
		function moveFileToGroup (sdsGroupId, fileId) {
			if (!sdsGroupId) {
				throw ( 'No SDS Group Id provided. ' );
			}
			if (!fileId) {
				throw ( 'No SDS File Id Provided. Cannot move file into SDS Group.' );
			}

			log.debug({ title : 'Moving SDS File - ' + fileId, details : sdsGroupId });

			let sdsFile  = file.load({ type : 'file', id : fileId });
			let sdsGroup = search.lookupFields({
				type    : 'customrecord_blend_sds_group',
				id      : Number(sdsGroupId),
				columns : 'custrecord_blend_sds_group_folder_id'
			});

			if (!sdsGroup || !sdsGroup.custrecord_blend_sds_group_folder_id) {
				throw( 'SDS Group with id ' + sdsGroupId + ' not found, or misconfigured.  No matching folder found.' );
			}

			//Set the SDS File's folder to the internal id of the SDS Group's attached folder.
			sdsFile.folder = sdsGroup.custrecord_blend_sds_group_folder_id;
			sdsFile.save();
		}

		/**
		 * Finds a record based on its record type and name/internalid
		 *
		 * @param {String} recType - The type of record to search for.
		 * @param {String} colName - The column to match the results by.
		 * @param {String} value - Value to compare the column against.
		 * @param {String} colType - The type of column to search. Affects how filters are built.
		 * @returns {String}  The internal id of the record found by the search.
		 */
		function findRecord( recType, colName, value, colType ) {

			let allValues = value.split('|'); //If this is a multiselect, we need to convert it to an array.
			let filters    = [];
			if ( allValues.length = 1 ) {
				filters.push(['name', 'is', value]);
			}
			else {

				filters.push(['name', 'is', allValues[0]]);

				for ( let i=1; i < allValues.length; i++) {
					filters.push('OR');
					filters.push(['name', 'is', allValues[i]])
				}
			}


			let results = getSearchResults(search.create({
					type    : recType,
					filters : filters
				})
			);

			log.debug({ title : 'results', details : results });

			if (!results.length || results.length > 1) {
				//Return the results as an array.
				let resultsArr = [];
				results.forEach(function(result) {
					resultsArr.push(result.id);
				})

				return resultsArr.join('|'); //Return this as a string.  We'll convert it in the map.
			}

			//If this was a single result, return just the internal id of the result.
			return results[0].id;

		}

		/**
		 * 	Returns all the results of a search by grabbing them 1000 at a time.
		 *
		 * @param {Search} thisSearch - Object representation of a search
		 * @return {Result[]} results - Array of object representations of search results
		 */
		function getSearchResults (thisSearch) {

			var results   = [];
			var pagedData = thisSearch.runPaged({ pageSize : 1000 });

			if (pagedData.count == 0) {
				return results;
			}

			var page = pagedData.fetch({ index : 0 });
			results  = page.data;

			while (!page.isLast) {
				page    = page.next();
				results = results.concat(page.data);
			}

			return results;

		}



		return {
			SUBLIST_SUBRECORDS           : SUBLIST_SUBRECORDS,
			REC_TYPE_MAP                 : REC_TYPE_MAP,
			setSublistSubrecordValues    : setSublistSubrecordValues,
			setSublistValues             : setSublistValues,
			createTask                   : createTask,
			handleSdsImport              : handleSdsImport,
			findRecord                   : findRecord
		};

	});
