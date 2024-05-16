define(
	[
		'N/error',
		'N/record',
		'N/search', 'N/file'
	],
	function (error, recordModule, search, file) {
		const CONSTANTS = {
			workflowIdOnExtendFiles: 'customworkflow_extend_kit_cm_up_extfile',
			extendFile: {
				recordType: 'customrecord_extend_files_aut',
				field: {
					url: 'custrecord_extfile_link',
					fileName: 'custrecord_extfile_filename',
					fileType: 'custrecord_extfile_type_system',
					signedUrl: 'custrecord_extend_file_pre_sign_url',
					previewSignedUrl: 'custrecord_extend_file_prev_pre_sign_url',
					thumbnailSignedUrl: 'custrecord_extend_file_pre_sign_thum_url',
					systemFileType: 'custrecord_extfile_type_system',
					fileCabinetRef: 'custrecord_extfile_file_cabinet',
					isPrivate: 'custrecord_extend_files_private_url',
					fileSizeInBytes: 'custrecord_extfile_file_size'
				},
			},

			extendFileQueue: {
				recordType: 'customrecord_extendfiles_job_queue',
				field: {
					integrationName: 'custrecord_extendfiles_job_integ_name',
					queueData: 'custrecord_extendfiles_job_data',
				}
			},

			QUEUE_RECORD_INTEGRATION_NAME: 'eXtendFiles Upload From URL',

			CONTENT_TYPES: {
				"application/x-autocad": "AUTOCAD",
				"image/x-xbitmap": "BMPIMAGE",
				"text/csv": "CSV",
				"application/vnd.ms-excel": "EXCEL",
				"application/​x-​shockwave-​flash": "FLASH",
				"image/gif": "GIFIMAGE",
				"application/​x-​gzip-​compressed": "GZIP",
				"text/html": "HTMLDOC",
				"image/ico": "ICON",
				"text/javascript": "JAVASCRIPT",
				"image/jpeg": "JPGIMAGE",
				"message/rfc822": "MESSAGERFC",
				"audio/mpeg": "MP3",
				"video/mpeg": "MPEGMOVIE",
				"application/vnd.ms-project": "MSPROJECT",
				"application/pdf": "PDF",
				"image/pjpeg": "PJPGIMAGE",
				"text/plain": "PLAINTEXT",
				"image/x-png": "PNGIMAGE",
				"image/png": "PNGIMAGE",
				"application/postscript": "POSTSCRIPT",
				"application/​vnd.​ms-​powerpoint": "POWERPOINT",
				"video/quicktime": "QUICKTIME",
				"application/rtf": "RTF",
				"application/sms": "SMS",
				"text/css": "STYLESHEET",
				"image/tiff": "TIFFIMAGE",
				"application/vnd.visio": "VISIO",
				"application/msword": "WORD",
				"text/xml": "XMLDOC",
				"application/zip": "ZIP",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "WORD"
			},
		};

		//#endregion

		//#region This section is for creating the eXtendFiles record from queue record.
		/**
		 * @param    {Object} args
		 * @property {String} args.fileId
		 * @property {String} args.extendFileId
		 */
		const isValidDataToCreateExtendRecord = (args) => {
			if (!args.extendFileId && !args.queueRecord) {
				throw error.create({
					name: 'Missing Required Param',
					message: 'extendFileId or queueRecord(one of them) is required.'
				});
			}
		}

		/**
		 * @param    {Object} args
		 * @property {String} args.extendFileId
		 * @property {Object} args.queueRecord
		 */
		const getFileDataFromQueueRecord = (args) => {
			let extendFileId = args.extendFileId;
			let queueRecord = args.queueRecord;
			let queueId;
			let queueData;

			if (queueRecord) {
				queueId = queueRecord.id;
				queueData = queueRecord.getValue({ fieldId: CONSTANTS.extendFileQueue.field.queueData }) || '';
			} else {
				let queueRecordSearchFilters = [];
				let queueRecordSearchColumns = [
					{ name: 'lastmodified', sort: search.Sort.DESC },
					{ name: CONSTANTS.extendFileQueue.field.queueData }
				];
				log.debug({
					title: 'getFileDataFromQueueRecord data',
					details: {
						extendFileId
					}
				});

				queueRecordSearchFilters = [
					['isinactive', search.Operator.IS, false],
					'AND',
					[CONSTANTS.extendFileQueue.field.integrationName, search.Operator.IS, CONSTANTS.QUEUE_RECORD_INTEGRATION_NAME]
				];

				queueRecordSearchFilters.push(
					'AND',
					[CONSTANTS.extendFileQueue.field.queueData, search.Operator.CONTAINS, `"extendFilesRecordId":${extendFileId}`]
				);


				log.debug({ title: 'Queue Record Search Filters', details: queueRecordSearchFilters });
				log.debug({ title: 'Queue Record Search Columns', details: queueRecordSearchColumns });
				const queueRecordSearchResults = search.create({
					type: CONSTANTS.extendFileQueue.recordType,
					filters: queueRecordSearchFilters,
					columns: queueRecordSearchColumns
				}).run().getRange({ start: 0, end: 1 });

				if (queueRecordSearchResults.length === 0) {
					throw error.create({
						name: 'Queue Record Not Found',
						message: `eXtendFiles record not yet created on the server.`
					});
				}

				queueId = queueRecordSearchResults[0].id;
				queueData = queueRecordSearchResults[0].getValue({ name: CONSTANTS.extendFileQueue.field.queueData }) || '';
			}

			try {
				queueData = JSON.parse(queueData);
			} catch (ex) {
				log.error({ title: 'Invalid Data For Files Information', details: queueData });
				log.error({ title: 'Invalid Data For Files Information At', details: ex.stack });
				throw error.create({
					name: 'Invalid Data For Files Information',
					message: queueData
				})
			}

			let fileUrl = (queueData && queueData.data && queueData.data.fileUrl) || '';
			let fileName = (queueData && queueData.data && queueData.data.name) || '';
			let fileType = (queueData && queueData.data && queueData.data.type) || '';
			let isPrivate = (queueData && queueData.data && queueData.data.isPrivate) || false;
			let fileSize = (queueData && queueData.data && queueData.data.fileSize) || '';
			let dataset = queueData.dataset || {};
			let additionalData = dataset.additionalData || {};

			let finalObject = {
				fileUrl,
				fileName,
				fileType,
				fileSize,
				isPrivate,
				dataset,
				additionalData,
				queueId
			};

			log.debug({ title: 'Final Data Object', details: finalObject });
			return finalObject;
		}

		/**
		 * @param    {Object} args
		 * @property {String} args.extendFileId
		 * @property {String} args.fileId
		 * @property {Object} args.filesRecordData
		 */
		const updateExtendFilesRecord = (args) => {
			let filesRecordData = args.filesRecordData || {};
			let additionalData = filesRecordData.additionalData || {};
			log.debug({ title: 'Files Record Data', details: filesRecordData });
			log.debug({ title: 'Files Additional Data', details: additionalData });
			let filesRecordId = '';
			let filesRecordObject;
			if (args.extendFileId) {
				filesRecordId = args.extendFileId;
			} else if (additionalData.extendFilesRecordId) {
				filesRecordId = additionalData.extendFilesRecordId;
			} else {
				filesRecordObject = recordModule.create({
					type: CONSTANTS.extendFile.recordType,
					isDynamic: true,
				});
			}

			if (!filesRecordObject) {
				filesRecordObject = recordModule.load({
					type: CONSTANTS.extendFile.recordType,
					id: filesRecordId,
					isDynamic: true
				});
			}

			filesRecordObject.setValue({ fieldId: 'name', value: filesRecordData.fileName });
			filesRecordObject.setValue({ fieldId: CONSTANTS.extendFile.field.url, value: filesRecordData.fileUrl });
			filesRecordObject.setValue({ fieldId: CONSTANTS.extendFile.field.fileName, value: filesRecordData.fileName });
			filesRecordObject.setValue({ fieldId: CONSTANTS.extendFile.field.fileType, value: filesRecordData.fileType });
			filesRecordObject.setValue({ fieldId: CONSTANTS.extendFile.field.isPrivate, value: filesRecordData.isPrivate });
			filesRecordObject.setValue({ fieldId: CONSTANTS.extendFile.field.fileSizeInBytes, value: filesRecordData.fileSize });
			Object.keys(additionalData).forEach((additionalDataKey) => {
				if (!additionalData[additionalDataKey] || additionalDataKey.indexOf('custrecord') === -1) {
					return;
				}
				filesRecordObject.setValue({ fieldId: additionalDataKey, value: additionalData[additionalDataKey] });
			});

			filesRecordObject.save({ ignoreMandatoryFields: true });
			return filesRecordObject;
		}


		/**
		 *
		 * @param {Object} param0
		 * @prop  {String} fileId
		 * @returns
		 */
		const updateFileInFileCabinet = ({ fileId }) => {
			const fileRecord = file.load({ id: fileId });

			fileRecord.isOnline = false;

			return fileRecord.save();
		}

		/**
		 * @param    {Object} args
		 * @property {String} args.extendFileId
		 * @property {Object} args.queueRecord
		 */
		const updateExtendFilesRecordFromQueueRecord = (args) => {
			isValidDataToCreateExtendRecord(args);

			let filesRecordData = getFileDataFromQueueRecord(args) || {};
			let filesRecordObject = updateExtendFilesRecord({
				...args,
				filesRecordData
			});

			if (filesRecordData.dataset.isPrivate) {
				updateFileInFileCabinet(filesRecordData.dataset);
			}

			if (args.queueRecord) {
				args.queueRecord.setValue({ fieldId: 'isinactive', value: true });
			} else if (filesRecordData.queueId) {
				recordModule.submitFields({
					type: CONSTANTS.extendFileQueue.recordType,
					id: args.queueId || filesRecordData.queueId,
					values: { isinactive: true }
				});
			}
			return filesRecordObject;
		}
		//#endregion

		const exports = {
			// createFileQueueRecordFromFiles,
			updateExtendFilesRecordFromQueueRecord
		};
		return exports;
	}
);