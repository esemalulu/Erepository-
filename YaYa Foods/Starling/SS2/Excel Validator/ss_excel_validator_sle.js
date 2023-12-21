/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * This script was provided by Starling Solutions.
 *
 * Provides a UI to upload and validate excel spreadsheets prior to import into Netsuite.
 *
 *  Version     Date            Author              Ticket         Remarks
 ***********************************************************************************************************************
 *  1.0         23 Sep 2020     Nicholas Bell       STP-146        Initial Version
 ***********************************************************************************************************************
 */

define(['N/search', 'N/ui/serverWidget', 'N/file', 'N/task', 'N/ui/message', './CSVtoJSON.js', 'N/record', './ExcelLibrary.js', 'N/runtime'],

	function ( search, serverWidget, file, task, message,CSVtoJSON, record, excelLib, runtime ) {

		// Array of email address domains which have permissions to use this tool.
		const VALID_USER_LIST = [
			'@starlingsolutions.com',
			'@conexussg.com',
		];

		const CLS_PATH          = './ss_excel_validator_cls.js'; //Client script module path
		const COLUMN_TYPE_ROW   = 6; //The row in the excel file which contains the column type.
		const SUBLIST_FIELD_ROW = 2; //The row which indicates whether a field is applied to a sublist or not.

		//Set the following values via script parameters below.
		let INTERFACE_HTML      = ''; //Starling Account
		let CSV_IMPORT_FOLDER   = 0; //Validated CSVs

		const COLUMN_NAME_MAP   = {
			vendor  : 'legalname'
		};

		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		function onRequest (context) {
			log.debug({ title : 'Request Method ' + context.request.method, details : 'Parameters ' + JSON.stringify(context.request.parameters) });

			let form 	        = serverWidget.createForm({title: 'Excel Import Tool', hideNavBar: false});
			let req		        = context.request;
			let params	        = req ? req.parameters : null;

			//Set the interface url and csv import folder. Should be done automatically by the SDF install script.
			INTERFACE_HTML    = runtime.getCurrentScript().getParameter({ name : 'custscript_ss_excel_interface_url' });
			CSV_IMPORT_FOLDER = runtime.getCurrentScript().getParameter({ name : 'custscript_ss_excel_csv_import_folder' });

			form.clientScriptModulePath = CLS_PATH;

			if ( context.request.method == 'GET' ) {

				const isValidUser  = getIsValidUser();

				if (!isValidUser) {
					let errorForm = serverWidget.createForm({ title : 'In order to prevent accidental data corruption, this tool is only available to Starling employees and partners.' });

					context.response.writePage({ pageObject : errorForm });

					return;
				}

				if ( !params || !params.action ) {

					//Create the form to allow the user to upload their Excel file.
					let submitButton        = form.addSubmitButton({ label : 'Submit Import Data' });
					submitButton.isHidden   = true; //Hide the submit button.  We'll click it from the DOM if the file passes validation.

					//This is where the html file will be displayed.
					let interfaceField = form.addField({
						id    : 'custpage_excel_interface',
						label : 'Excel Upload',
						type  : serverWidget.FieldType.INLINEHTML
					});

					interfaceField.defaultValue = '<iframe id="excel-validator" style="height:1000px; width:100%; border-style: none;" src="' + INTERFACE_HTML + '"></iframe>';

					context.response.writePage(form);
					return;
				}

				if ( params.action == 'importFiles' ) {

					//Make sure we have files listed in the params to import.
					if ( !params.fileIds || !params.recTypes ) {
						context.response.write({ output : 'No Netsuite File Ids were provided. Cannot import files.'});
						return;
					}

					let allFiles    = params.fileIds.split(','); //Get all of the files, load them and set params on the map.
					let numFiles    = allFiles.length;
					let recTypes    = params.recTypes.split(','); //Get all record types to be imported.
					let addRecs     = params.add;
					let updateRecs  = params.update;
					let manyToOne   = params.manyToOne;
					let foreignKey  = params.foreignKey;
					let isDynamic   = params.isDynamic;
					let isSdsImport = params.isSdsImport;
					let columnKeys  = {};
					let columnTypes = {};
					let sublists    = {};
					let lengths     = [];

					for ( let i=0; i < numFiles; i++ ) {
						let importFile   = file.load({ id : allFiles[i] });
						let fileContents = importFile.getContents(); //Todo investigate how to do this with iterator instead to get around 10mb limit

						let fileObj      = JSON.parse(CSV2JSON(fileContents));
						let numLines     = fileObj.length;
						let colKeys      = Object.keys( fileObj[2] );
						let colTypes     = Object.values(fileObj[COLUMN_TYPE_ROW]);
						let sublistCols  = Object.values(fileObj[SUBLIST_FIELD_ROW]);

						log.debug({ title : 'Sublist Cols', details : sublistCols });

						//Get rid of the first and last lines on each row.  These are our reserved columns and don't need to be used.
						colKeys.shift();
						colTypes.shift();
						sublistCols.shift();
						colKeys.pop();
						colTypes.pop();
						sublistCols.pop();

						columnKeys[recTypes[i]]  = colKeys;
						columnTypes[recTypes[i]] = colTypes;
						sublists[recTypes[i]]    = sublistCols;
						// columnKeys.push(colKeys.join(','));
						// columnTypes.push(colTypes.join(','));
						lengths.push(colKeys.length);

					}

					//Create a new excel import file and record all necessary fields.
					let newExcelFile = record.create({ type : 'customrecord_ss_excel_import' });

					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_file_ids_remaining', value : allFiles.join(',') });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_current_sheet',      value : String( allFiles[0] ) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_record_types',       value : recTypes.join(',') });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_column_type',        value : JSON.stringify(columnTypes) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_column_keys',        value : JSON.stringify(columnKeys) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_sublist_cols',       value : JSON.stringify(sublists) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_num_cols',           value : lengths.join(',') });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_add',                value : ( addRecs == 'true' ) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_update',             value : ( updateRecs == 'true' ) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_many_to_one',        value : ( manyToOne == 'true' ) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_foreign_key',        value : foreignKey });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_is_dynamic',         value : ( isDynamic == 'true' ) });
					newExcelFile.setValue({ fieldId : 'custrecord_ss_excel_is_sds_import',      value : ( isSdsImport == 'true' ) });

					try{
						//Set the task id on the custom record. Then save it.
						newExcelFile.save();

					}
					catch(e) {
						context.response.write({ output : 'The following error occurred when trying to process your file(s) ' + e.message });
						return;
					}

					form.addPageInitMessage({
						type    : message.Type.CONFIRMATION,
						title   : 'Files Submitted',
						message : 'Your worksheet has been submitted for processing.  When complete, you will receive an email with the results. <br /> You may close this window.'
					});

					context.response.writePage(form);
					return;

				}



			}
			else {
				//POST
				log.debug({ title : 'Post Body', details : context.request.body });

				let body        = JSON.parse(context.request.body);

				if ( !body ) {
					context.response.write({ output : 'No body attached to post. Aborting.' });
					log.debug({ title : 'No body...'});
					return;
				}

				let action      = body.action; //Determine what action needs to be taken by the SLE.
				log.debug({ title : 'Action: ' + action });

				if ( action == 'sendCsvData' ) {

					let res         = { fileId : null, recordType : null, errors : null };//Create a response object to send back.
					let newCsvFile  = file.create({
						name        : body.fileName,
						fileType    : file.Type.CSV,
						folder      : CSV_IMPORT_FOLDER });

					let csvArray    = body.csvString.split('\n');
					log.debug({ title : 'CSV Length', details : csvArray.length });

					//Get the record type by looking at the first column and second row.
					let recordText = csvArray[0].split(',')[0];
					let recordType = recordText.toLowerCase().split(' ')[0];
					log.debug({ title : 'Record Type', details : recordType });

					res.recordType = recordType;

					//Append each line in the csv array into the CSV file missing the first few.  We need the first line to be fieldIDs
					for ( let i=2; i < csvArray.length; i++ ) {
						//Skip any blank lines.  SheetJS also leaves a \n at the end of the file, so this will stop us from
						//attempting and failing to write a blank line at the end of every array as well.
						if ( csvArray[i] ) {
							newCsvFile.appendLine({ value : csvArray[i] });
						}
					}

					try {
						let newId   = newCsvFile.save();
						res.fileId  = newId;
						context.response.write(JSON.stringify(res));
						return;
					}
					catch(e) {
						res.errors  = e.message;
						context.response.write(JSON.stringify(res));
						return;
					}

				}

				else if ( action == 'validateList' ) {
					//Validate lists in here...
					let res         = { fileId : null, recordType : null, errors : null };
					let recordType  = body.recordType;
					let lookup      = body.lookupList;
					let sheetName   = body.sheetName;
					let recordTypes = body.recordTypes;

					if ( !recordType || !lookup ) {
						context.response.write({ output : 'Unrecognized action. Aborting' });
						return;
					}

					let fieldIds = Object.keys(lookup); //Get an array of all field values.
					let dummyRec = record.create({ type : recordType, isDynamic : true }); //getSelectOptions only works in dynamic mode.

					for ( let i=0; i < fieldIds.length; i++ ) {
						let thisField        = fieldIds[i];
						let linkedRec        = lookup[thisField].linkedRec; //Check to see if this has a linked sheet.
						let fieldToValidate  = null;

						//If this field refers to a record that was created in a previous sheet, exclude it from the validation.
						//There will be no NS entries for that record yet, but a search via name will occur in the map stage.
						if (recordTypes.includes(linkedRec)) {

							let fieldValues = lookup[thisField].values;
							//For each value, make skipValidation true. This will allow us to find nothing, but return no error.
							for (let name in fieldValues) {
								fieldValues[name].skipValidation = true;
							}

							continue;
						}

						fieldToValidate = findFieldToValidate( lookup, thisField, dummyRec );

						if (!fieldToValidate) {
							continue;
						}

						let selectOptions    = fieldToValidate.getSelectOptions();

						if ( selectOptions && selectOptions.length && selectOptions.length != 1000 ) { //If there are more than 1000 options, getSelectOptions will return []
							validateListValues( selectOptions, lookup[thisField] );
							continue; //If this worked we don't need to do the other two steps.
						}

						if ( lookup[fieldIds[i]].searchType ) {
							//If too many results showed up in the field select options and a search type is specified, we can search for it here.
							let currentType = lookup[fieldIds[i]].searchType;
							let nameAlias   = COLUMN_NAME_MAP[currentType] ? COLUMN_NAME_MAP[currentType] : 'name';

							let listResults = getSearchResults(search.create({
									type    : lookup[fieldIds[i]].searchType,
									columns : [ nameAlias ]
								})
							);

							if ( listResults && listResults.length ) {
								let selectOptions = [];
								listResults.forEach(function(result) {
									selectOptions.push({ text : result.getValue({ name : nameAlias }), value : result.id });
								});

								validateListValues( selectOptions, lookup[thisField] );
								continue; //If this worked, then we don't need to move on to the next fallback.

							}

						}

						if ( lookup[fieldIds[i]].searchId ) {
							//If we got too many results to populate the list, we can run a search instead.
							let listResults = getSearchResults(search.load({ id : lookup[fieldIds[i]].searchId }));
							if ( listResults && listResults.length ) {
								let selectOptions = [];
								listResults.forEach(function(result) {
									selectOptions.push({ text : result.getValue({ name : 'name' }), value : result.id });
								});

								validateListValues( selectOptions, lookup[thisField] );
								continue;

							}
						}


					}

					log.debug({ title : 'Lookup', details : lookup });
					let response = { sheetName : sheetName, lookup : lookup };
					context.response.write(JSON.stringify(response));
					return;
				}
				else {
					context.response.write({ output : 'Unrecognized action. Aborting' });
					return;
				}



			}

		}


		// Helper Functions

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

		/**
		 * 	Validates lists based on whether or not they're already found within netsuite. Will add internal ids to each found value, and add errors for ones that aren't found.
		 *
		 * @param {Array} selectOptions - An array of objects in the format { text : 'abc', value : '123' }
		 * @param {Object} fieldValues - An object containing the field values as keys to be validated against
		 */
		function validateListValues( selectOptions, fieldValues ) {
			log.debug({ title : 'Select Options', details : selectOptions });

			//Turn the list into an object to make finding them easier.
			let nsOptionsText   = {}; //Text value options
			let nsOptionsId     = {}; //Internal Id options

			selectOptions.forEach(function(option) {
				nsOptionsText[option.text] = option.value;
				nsOptionsId[option.value]  = option.text;
			});

			//Step through each key and find out whether it exists in the select options object we just made.
			Object.keys(fieldValues.values).forEach(function(inputValue) {
				let selectValues = inputValue.split('|'); //If the list value is a multiselect, split it up into an array.
				let foundValues  = null; //If we don't find any values, this should be null and return an error.
				for ( let i=0; i < selectValues.length; i++ ) {
					let currentValue = selectValues[i].trim();
					if ( nsOptionsText[currentValue] ) {
						foundValues = foundValues ? foundValues : []; //Initialize the array if not already done.
						foundValues.push(nsOptionsText[currentValue]);
					}
					else if ( nsOptionsId[currentValue] ) {
						foundValues = foundValues ? foundValues : []; //Initialize the array if not already done.
						foundValues.push(String(nsOptionsId[inputValue])); //Use the same internal id, but convert to a string if it's a number
					}

				}

				if ( !foundValues ) {
					fieldValues.error = 'List mismatch. Cells that have been highlighted red have at least one value with no matching value or id in Netsuite.';
					return;
				}

				fieldValues.values[inputValue].internalId = foundValues.join('|');

			});
			log.debug({ title : 'Field Values', details : fieldValues });

		}

		/**
		 * 	Finds the field to be
		 *
		 * @param {Array} selectOptions - An array of objects in the format { text : 'abc', value : '123' }
		 * @param {Object} fieldValues - An object containing the field values as keys to be validated against
		 */
		function findFieldToValidate( lookup, thisField, dummyRec ) {

			let fieldToValidate = null;

			if ( lookup[thisField].sublistId ) {
				let sublistRef = excelLib.SUBLIST_SUBRECORDS[lookup[thisField].sublistId] || null;
				//If we find our field in the one of the sublist/subrec constants, get the field associated from either the sublist or subrecord.
				if ( sublistRef && sublistRef.SUBLIST_FIELDS[thisField] ) {
					//Sublist field found, simply load the sublist field and get its select options.
					dummyRec.selectNewLine({ sublistId : sublistRef.SUBLIST });
					fieldToValidate = dummyRec.getSublistField({
						sublistId : sublistRef.SUBLIST,
						fieldId : sublistRef.SUBLIST_FIELDS[thisField] });
				}
				else if ( sublistRef && sublistRef.SUBREC_FIELDS[thisField] ) {
					dummyRec.selectNewLine({ sublistId : sublistRef.SUBLIST });
					let subRecord = dummyRec.getCurrentSublistSubrecord({
						sublistId : sublistRef.SUBLIST,
						fieldId   : sublistRef.SUBRECORD
					});
					fieldToValidate = subRecord.getField({
						fieldId : sublistRef.SUBREC_FIELDS[thisField]
					});
				}
				else {
					log.debug({ title : 'No sublist or subrecord field found...'});
					//If we didn't find a match for this field, we cannot validate its list.
					lookup[thisField].errors += 'No sublist "' + lookup[thisField].sublistId + '" found.';
				}
			}

			if ( !fieldToValidate ) {
				//If we haven't set a field to Validate yet, then we're dealing with a body field.
				fieldToValidate = dummyRec.getField({ fieldId : thisField });
			}

			return fieldToValidate;

		}

		/**
		 * Determine if a user is a valid user.
		 *
		 * @returns {Boolean} - If the user has a valid domain in the whitelist.
		 */
		function getIsValidUser() {
			const userEmail        = runtime.getCurrentUser().email;
			const validUserOptions = VALID_USER_LIST.filter(function(userEmailDomain) {
				return userEmail.toLowerCase().includes(userEmailDomain);
			});
			return validUserOptions.length === 1;
		}


		return {
			onRequest : onRequest
		};

	});
