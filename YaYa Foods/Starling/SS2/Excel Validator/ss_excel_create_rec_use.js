/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * This script was provided by Starling Solutions.
 *
 * Creates the map/reduce script when a record is created from the excel import, then updates the user on the status of the map.
 *
 *  Version     Date         Author              Ticket         Remarks
 *************************************************************************
 *  1.0         03 Nov 2020      Nicholas Bell             SFP-3      Initial Remarks
 *************************************************************************
 */

define(['N/search', 'N/task', './ExcelLibrary.js'],

	function (search, task, excelLib) {

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {string} scriptContext.type - Trigger type
		 * @param {Form} scriptContext.form - Current form
		 * @param {Request} scriptContext.request - Request object
		 * @Since 2015.2
		 */
		function beforeLoad (scriptContext) {
			log.debug({ title : 'Before load on ' + scriptContext.type, details : 'ID: ' + scriptContext.newRecord.id });

		}


		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		function beforeSubmit (scriptContext) {
			log.debug({ title : 'Before submit on ' + scriptContext.type, details : 'ID: ' + ( scriptContext.newRecord || scriptContext.oldRecord ).id });

		}


		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		function afterSubmit (scriptContext) {
			log.debug({ title : 'After submit on ' + scriptContext.type, details : 'ID: ' + ( scriptContext.newRecord || scriptContext.oldRecord ).id });
			if ( scriptContext.type != scriptContext.UserEventType.CREATE ) {
				return; //Once the map reduce is started, this record will be re-submitted to, and the map will control other iterations.
			}

			let taskId = scriptContext.newRecord.getValue({ fieldId : 'custrecord_ss_excel_task_id' });

			if ( taskId ) {
				return; //Once started, this will submit the task id after submit. Don't try to create a task again.
			}

			//Create the first map/reduce task via the library script.
			excelLib.createTask( scriptContext.newRecord, true, 0 );

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


		return {
			// beforeLoad   : beforeLoad,
			// beforeSubmit : beforeSubmit,
			afterSubmit  : afterSubmit
		};

	});
