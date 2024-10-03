/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @desc
 * WorkFlow Description
 *    Triggers Type: After Record Submit
 *    Events:  Create Or Update
 * Action Description: 
 */
define(
	[
		'N/error', 'N/search', 'N/runtime',
		'./extend_mod_update_extendfiles'
	],
	function (error, search, runtime, ModUpdateFiles) {
		const exports = {};

		/**
		 * @param {Object} context
		 */
		const _onAction = (context) => {
			let newRecord = context.newRecord;
			let recordType = newRecord.type;
			let contextType = context.type;
			let recordId = newRecord.id;

			log.debug({
				title: 'Entry Data',
				details: {
					recordType,
					recordId,
					contextType
				}
			});

			if (recordType === 'customrecord_extendfiles_job_queue' && recordId) {
				ModUpdateFiles.updateExtendFilesRecordFromQueueRecord({
					queueRecord: newRecord,
				});
				return 'T';
			}

			return 'F';
		}

		/**
		 * @param {Object} context
		 */
		const onAction = (context) => {
			try {
				return _onAction(context);
			} catch (ex) {
				log.error({ title: 'CUSTOM_MODULE_UPDATE_FILE_ERROR', details: (ex.message || ex.name) });
				log.error({ title: 'CUSTOM_MODULE_UPDATE_FILE_ERROR_AT', details: ex.stack });
				return 'F';
			}
		}

		exports.onAction = onAction;
		return exports;
	}
);