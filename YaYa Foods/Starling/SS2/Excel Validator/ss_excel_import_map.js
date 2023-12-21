/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * This script was provided by Starling Solutions.
 *
 * Receives file ids of CSV files generated in the Excel Validation Interface and imports each line as a new record.
 *
 *  Version		Date		Author		Ticket		    Remarks
 *************************************************************************
 *  1.0			16 Oct 2020		Nicholas Bell	STP-146		Initial Version
 *************************************************************************
 */

define([ 'N/email','N/record', 'N/search', 'N/runtime', 'N/file', './CSVtoJSON.js', './ExcelLibrary.js', 'N/url'],

	/**
	 * @param {record} record
	 * @param {search} search
	 */
	function (email,record, search, runtime, file, CSVtoJSON, excelLib, url) {

		/**
		 * Marks the beginning of the Map/Reduce process and generates input data.
		 *
		 * @typedef {Object} ObjectRef
		 * @property {number} id - Internal ID of the record instance
		 * @property {string} type - Record type id
		 *
		 * @return {Array|Object|Search|RecordRef} inputSummary
		 * @since 2015.1
		 */
		function getInputData () {

			log.debug({ title : '** START **', details : '******' });

			let thisScript     = runtime.getCurrentScript();
			let fileId         = thisScript.getParameter({ name : 'custscript_ss_excel_file_ids' }); //Get the file and load it.
			let isSds          = thisScript.getParameter({ name : 'custscript_ss_excel_is_sds_import' }); //Check if this is an SDS file
			let currentIndex   = Number(thisScript.getParameter({ name : 'custscript_ss_excel_current_index' }));
			let scriptRecTypes = thisScript.getParameter({ name : 'custscript_ss_excel_record_types' }).split(',');

			//If this is an SDS import, we need to disable the script that normally runs on the SDS File Records. Once complete, we'll turn it back on.
			if ( isSds == 'true' && scriptRecTypes[currentIndex] == 'customrecord_blend_sds_file') {
				//Turn off the deployment on SDS Revision (nee File) records.  This will stop errors from occurring.
				toggleSdsDeployment(true);

			}

			log.debug({ title : 'File Ids', details : fileId });

			let importFile = file.load({ id : fileId });
			let fileContents = importFile.getContents(); //Todo investigate how to do this with iterator instead to get around 10mb limit

			let fileObject = CSV2JSON(fileContents);

			return JSON.parse( fileObject );
		}

		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		function map (context) {
			log.debug({ title : 'Processing result ' + context.key, details : 'Value: ' + context.value });
			var currentData = JSON.parse(context.value);

			if ( context.key < 11 ) {
				return; //Record data is always found AFTER the 10th line.
			}

			// log.debug({ title : 'Adding record...', details : context.value });

			let thisScript            = runtime.getCurrentScript();
			let currentIndex          = Number(thisScript.getParameter({ name : 'custscript_ss_excel_current_index' }));
			let scriptRecTypes        = thisScript.getParameter({ name : 'custscript_ss_excel_record_types' });
			let scriptColumns         = thisScript.getParameter({ name : 'custscript_ss_excel_col_keys' });
			let scriptColTypes        = thisScript.getParameter({ name : 'custscript_ss_excel_col_types' });
			let scriptSubCols         = thisScript.getParameter({ name : 'custscript_ss_excel_sublist_cols' });
			let scriptNumCols         = thisScript.getParameter({ name : 'custscript_ss_excel_num_cols' });
			let scriptAdRecord        = thisScript.getParameter({ name : 'custscript_ss_excel_add' });
			let scriptUpdateRecord    = thisScript.getParameter({ name : 'custscript_ss_excel_update' });
			let scriptOneToMany       = thisScript.getParameter({ name : 'custscript_ss_excel_many_to_one' });
			let foreignKey            = thisScript.getParameter({ name : 'custscript_ss_excel_foreign_key' });
			let scriptIsDynamic       = thisScript.getParameter({ name : 'custscript_ss_excel_is_dynamic' });
			let scriptIsSds           = thisScript.getParameter({ name : 'custscript_ss_excel_is_sds_import' });

			if ( !scriptRecTypes || !scriptColumns || !scriptColTypes || !scriptSubCols || !scriptNumCols ) {
				log.debug({ title : 'Forget anything?...', details : [ scriptRecTypes, scriptColumns, scriptColTypes, scriptSubCols, scriptNumCols] })
				return;
			}

			log.audit({title : 'Params', details : [ scriptAdRecord, scriptUpdateRecord, scriptOneToMany, foreignKey, scriptIsDynamic ]});

			let recordType   = JSON.parse(scriptRecTypes)[currentIndex];
			let columns      = JSON.parse(scriptColumns)[recordType];
			let colTypes     = JSON.parse(scriptColTypes)[recordType];
			let sublistCols  = JSON.parse(scriptSubCols)[recordType];
			let numCols      = Number(scriptNumCols.split(',')[0]);

			//Checkbox params are received as 'true' or 'false'. Cast them to booleans.
			let addRecord    = scriptAdRecord     == 'true';
			let updateRecord = scriptUpdateRecord == 'true';
			let oneToMany    = scriptOneToMany    == 'true';
			let isDynamic    = scriptIsDynamic    == 'true';
			let isSdsImport  = scriptIsSds        == 'true';
			let isItemStage  = isSdsImport && recordType == 'item';

			//Check to see if this line has ANY values. If not, just return.  CSVs can sometimes just send extra rows that have no
			//values in them, and if the record has no mandatory fields, it'll just create a bunch of blank records.
			if ( !isValidLine(currentData, columns ) ) {
				return;
			}

			//Set some settings on the record.
			let ignoreMandatory = true; //This may need to be set via script later or need a special exemption
			let enableSourcing  = false;

			if ( (Object.keys(currentData).length -2) != numCols ) {
				log.debug({ title : 'Numcols Do not match', details : Object.keys(currentData).length });
				return; //Some garbage rows sometimes come in with data in only one cell. This will stop them from being processed.
			}
			let recordToUpdate = null;
			let thisRecord     = null;

			//During the SDS Import, we need to set the record type to assembly item to create a record. We won't use this record,
			//but we need to bypass this stage to get into the next one where we can simply set the SDS Group as we wish.
			if ( isItemStage ) {
				recordType = 'assemblyitem';
			}

			let recordLoaded = false;

			if ( updateRecord ) {
				//Find foreign key
				let foreignKeyCol = columns.indexOf(foreignKey);
				recordToUpdate    = excelLib.findRecord( recordType, foreignKey, currentData[foreignKey],colTypes[foreignKeyCol] );
			}

			if ( updateRecord && recordToUpdate ) {
				thisRecord   = record.load({ type : recordType, id : recordToUpdate, isDynamic : isDynamic });
				recordLoaded = true;  //Downstream we may need to know if a record was loaded.
			}
			else if ( addRecord ) {
				thisRecord  = record.create({ type : recordType, isDynamic : isDynamic });
			}
			else {
				throw('No matching record found. Enable Add Record to create a new one, or ensure that the value in the key column matches an existing NS record. ')
			}


			//Set body level fields based on received data
			for ( let j=0; j < numCols; j++ ) {

				let value = currentData[columns[j]];

				if (!value || sublistCols.includes(columns[j])) {
					//If no data, or we're dealing with a sublist/subrec field, then continue. Sublists dealt with below.
					continue;
				}

				if ( isItemStage ) {
					//If this is an SDS Import and we're on the item stage, find the record via a different method.
					excelLib.handleSdsImport(thisRecord, currentData, columns, j, null);
					continue; //Stop processing here. We should never set any values below here, as handleSDS will do this for us.
				}

				if (currentData[columns[j]].toLowerCase() == 'true') {
					thisRecord.setValue({ fieldId : columns[j], value : true });
					continue;
				}
				else if (currentData[columns[j]].toLowerCase() == 'false') {
					thisRecord.setValue({ fieldId : columns[j], value : false });
					continue;
				}

				if (colTypes[j] == 'Date') {
					thisRecord.setValue({ fieldId : columns[j], value : new Date(currentData[columns[j]]) });
					continue;
				}

				if (updateRecord && columns[j] == foreignKey && recordLoaded) {
					continue; //The foreign key is used as an identifier, and should never need to be set.
				}

				//If this was a previous record type that was created on a previous sheet, it will still be in string form.
				//Find its new id and use THAT to populate this field.
				let newListId = '';

				if ( colTypes[j].toLowerCase() == 'list' && isNaN(Number(value)) ) {

					log.audit({ title : 'Setting list Id from ', details : value });

					//Todo find the linked row name

					if ( !excelLib.REC_TYPE_MAP[columns[j]] ) {
						throw(`${columns[j]} is not mapped to REC_TYPE_MAP in Excel Library.  Unable to find Internal Id.`)
					}

					newListId = excelLib.findRecord( excelLib.REC_TYPE_MAP[columns[j]], columns[j], value.trim(), colTypes[j] );
					log.audit({ title : 'New List Id', details : newListId });

					if ( !newListId ) {
						continue; //If nothing was found, just don't set anything.  This may cause a failure, but it may be because a previous rec wasn't created.
					}

					value = newListId;
				}

				//Handle SDS-Specific cases here. This may set values ahead of the current rows and do some processing
				if (isSdsImport) {
					let sdsSpecific = excelLib.handleSdsImport(thisRecord, currentData, columns, j, newListId);
					if ( sdsSpecific ) {
						continue;  //Setting the value will happen in handleSdsImport, do not allow the normal one to set below.
					}
				}

				if ( colTypes[j].toLowerCase() == 'list') {
					//Lists can contain either select or multiselect types. If this is a list, see if we can split it into an array first.
					thisRecord.setValue({ fieldId : columns[j], value : value.includes('|') ? value.split('|') : value });
				}
				else {
					//If this isn't a list, just set the value.
					thisRecord.setValue({ fieldId : columns[j], value : value });
				}

				log.debug({ title : 'Setting ' +  columns[j], details : value });



			}

			if ( isItemStage ) {
				return; //No need to save the dummy record.
			}

			//Set any sublist fields if identified in the document.
			if ( oneToMany ) {
				excelLib.setSublistValues( currentData, columns, sublistCols, thisRecord, colTypes );
			}
			else {
				excelLib.setSublistSubrecordValues( currentData, columns, sublistCols, thisRecord );
			}



			try {
				let newId = thisRecord.save({ ignoreMandatoryFields : ignoreMandatory, enableSourcing : enableSourcing});
				log.debug({ title : 'Saved Record', details : [recordType, newId] });

			}
			catch(e) {
				log.error({ title : 'Error', details : e });
				throw ( e.message );
			}


		}


		/**
		 * Executes when the reduce entry point is triggered and applies to each group.
		 *
		 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		 * @since 2015.1
		 */
		function reduce (context) {

		}


		/**
		 * Executes when the summarize entry point is triggered and applies to the result set.
		 *
		 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		 * @since 2015.1
		 */
		function summarize (summary) {
			log.debug({ title : 'Summary', details : JSON.stringify(summary) });

			let thisScript     = runtime.getCurrentScript();
			let sheetName      = thisScript.getParameter({ name : 'custscript_ss_excel_record_types' });
			let scriptOrigin   = thisScript.getParameter({ name : 'custscript_ss_excel_record' });
			let currentIndex   = Number(thisScript.getParameter({ name : 'custscript_ss_excel_current_index' }));
			let scriptRecTypes = thisScript.getParameter({ name : 'custscript_ss_excel_record_types' }).split(',');
			let isSds          = thisScript.getParameter({ name : 'custscript_ss_excel_is_sds_import' }); //Check if this is an SDS file

			//If this is an SDS import, we need to disable, then re-enable the script that normally runs on the SDS File Records. Once complete, we'll turn it back on.
			if ( isSds == 'true' && scriptRecTypes[currentIndex] == 'customrecord_blend_sds_file') {
				//This script was un-deployed during the file map, turn it back on once finished to ensure it it on afterwards.
				toggleSdsDeployment(false); //Turn the SDS revision script back on.
			}

			let errors        = {};
			let numErrors     = 0;
			errors[sheetName] = []; //create an array to push each error into.

			summary.mapSummary.errors.iterator().each(function (key, error, executionNo) {
				log.error({
					title   : 'Map error for key: ' + key + ', execution no.  ' + executionNo,
					details : error
				});

				numErrors++;
				let rowNumber = Number(key) + 4; //The keys of the rows are offset by 4. Correct that here to sync up the CSV file.

				errors[sheetName].push( `Error on row ${rowNumber}:  ${JSON.parse(error).message}` );
				return true;
			});

			let originRecord  = record.load({ type : 'customrecord_ss_excel_import', id : scriptOrigin });
			let currentErrors = originRecord.getValue({ fieldId : 'custrecord_ss_excel_error_info' });
			let allErrors     = Number( originRecord.getValue({ fieldId : 'custrecord_ss_excel_num_errors' }) );

			//Add the number of errors encountered in the current sheet to the total number of errors for the whole import.
			allErrors += numErrors;

			//Write each error into the errors text area, so they can all be emailed to the user when the import is complete.
			if ( !currentErrors ) {
				log.debug({ title : 'Writing init errors', details : errors });
				originRecord.setValue({ fieldId : 'custrecord_ss_excel_error_info', value : JSON.stringify( errors ) });
			}
			else {
				//If errors have previously been set, parse them into an object and append the new errors to it. Then re-write the field.
				let importErrors        =  JSON.parse( currentErrors );
				importErrors[sheetName] = errors[sheetName];
				originRecord.setValue({ fieldId : 'custrecord_ss_excel_error_info', value : JSON.stringify( importErrors ) });

			}

			originRecord.setValue({ fieldId : 'custrecord_ss_excel_num_errors', value : allErrors });

			/* To determine whether or not we need to create another task, check to see if we are on the last record type to be imported.
			If we haven't hit the last record type, create another map/reduce task.
			 */

			let nextSheet = (currentIndex != ( scriptRecTypes.length -1 ) );

			log.debug({ title : 'Another Sheet?', details : [currentIndex, scriptRecTypes.length, nextSheet]})

			if ( nextSheet ) {
				excelLib.createTask( originRecord, false, currentIndex + 1 );
			}

			originRecord.save();

			if ( !nextSheet ) {
				//If there is not another sheet to be processed, send an email to the user letting them know the import is done.
				sendEmail( scriptOrigin );
			}

			log.debug({ title : `** END ${currentIndex + 1} of ${scriptRecTypes.length} **`, details : '******' });
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
		 * 	In order to move on to the next sheet to be imported, we need to shift the first entry in each field, then send the new task.
		 *
		 * @param {String} exccelImportId - The record that was used to import the csv files.
		 */
		function sendEmail( excelImportId ) {

			log.audit({ title : 'Sending completion email', details : 'Excel Import Record Id: ' + excelImportId });

			let excelInfo = search.lookupFields({
				type    : 'customrecord_ss_excel_import',
				id      : excelImportId,
				columns : ['custrecord_ss_excel_num_errors', 'custrecord_ss_excel_error_info']
			});

			let numErrors = 0;
			let allErrors = '';
			let hasErrors = true;
			let importUrl = url.resolveRecord({
				recordType  : 'customrecord_ss_excel_import',
				recordId    : excelImportId
			});

			if ( !excelInfo || !excelInfo.custrecord_ss_excel_num_errors || !excelInfo.custrecord_ss_excel_error_info ) {
				hasErrors = false;
			}

			numErrors = Number(excelInfo.custrecord_ss_excel_num_errors);
			allErrors = excelInfo.custrecord_ss_excel_error_info;

			let emailOptions = {
				author      : runtime.getCurrentUser().id, //Todo Make the sender the system
				recipients  : runtime.getCurrentUser().id,
				subject     : `Excel Import Completed With ${numErrors > 0 ? numErrors : 'No'} Errors.`,
				body        : `
					Your excel import has completed with ${numErrors > 0 ? numErrors : 'No'} Errors. <br />
					<br />
					Please follow the link below to view the Excel Import Record.
					<a href ="${importUrl}">Excel Import ${excelImportId} </a>
				`
			};

			if ( !hasErrors ) {
				email.send( emailOptions );
				return;
			}

			//If there are errors, build a table from the error object on the record and output it as an unordered list.
			let errorObject = JSON.parse( allErrors );
			let errorList   = ''; //HTML string to hold all of the errors in a table.

			Object.keys(errorObject).forEach(function(recordType) {

				errorList += `Errors for ${recordType}: <br /> <ul> `;

				let currentErrors = errorObject[recordType];

				currentErrors.forEach(function(errorMessage) {
					errorList += `<li>${errorMessage}</li>`;
				});

				errorList += `</ul> <br />`

			});

			emailOptions.body += errorList;

			//Send the email to the user.
			email.send( emailOptions );

		}

		/**
		 * Sets customdeploy_blend_sds_revision_use as either active (beginning) or inactive (end) to ensure the script does
		 * not throw errors while we are importing the SDS Groups and SDS Revisions.
		 *
		 * @param {Boolean} inactive - Whether we want to set inactive or not.
		 */
		function toggleSdsDeployment (inactive) {
			let deploymentSearch = getSearchResults(search.create({
					type    : 'scriptdeployment',
					filters :
						[
							['scriptid', 'is', 'customdeploy_blend_sds_revision_use']
						]
				})
			);
			if (!deploymentSearch || !deploymentSearch.length) {
				throw( 'No SDS deployment found.' );
			}

			let deploymentId = deploymentSearch[0].id;

			record.submitFields({
				type       : record.Type.SCRIPT_DEPLOYMENT,
				id         : deploymentId,
				isInactive : inactive
			});
		}

		/**
		 * Checks the current row to make sure it actually contains a value.
		 *
		 * @param {Object} currentData - The current row of information in the CSV
		 * @param {Array} columns - The keys for the currentData object
		 * @returns {Boolean} isValid - Whether or not we actually found a value in this row.
		 */
		function isValidLine (currentData, columns) {
			let isValid = false;
			for (let i = 0; i < columns.length; i++) {

				let value = currentData[columns[i]];
				if (value) {
					isValid = true;
					break;
				}

			}
			return isValid;
		}




		return {
			getInputData : getInputData,
			map          : map,
			// reduce       : reduce,
			summarize    : summarize
		};

	});