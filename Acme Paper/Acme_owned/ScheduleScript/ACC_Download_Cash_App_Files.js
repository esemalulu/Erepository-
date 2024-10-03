/**
 *@NApiVersion 2.0
 *@NScriptType ScheduledScript
 */
define(['N/sftp', 'N/file', 'N/record', 'N/search', 'N/email', 'N/runtime', 'N/task'],
	function (sftp, file, record, search, email, runtime, task) {
		function execute() {
			var scriptObj = runtime.getCurrentScript();
			var fileType = scriptObj.getParameter("custscript_file_type");
			var sftpFodler = '';
			var nsFolder = scriptObj.getParameter("custscript_ns_folder");
			var mappingId = '';
			var fileName = '';
			var date = new Date();
			var index = date.getDay() == 1 ? 3 : 1;
			var yesterdayDate = getYYYYMMDD(date.setDate(date.getDate() - index));
			log.debug("execute() yesterdayDate is: ", yesterdayDate);
			if (fileType == 'ACH') {
				sftpFodler = '/outbound/ACMEP679_RMGR_2/';
				mappingId = '411';
				fileName = 'ACH_wellsfargo_' + yesterdayDate;
			} else if (fileType == 'LOCKBOX') {
				sftpFodler = '/outbound/ACMEP679_RMGR_1/';
				mappingId = '194';
				fileName = 'wellsfargo_' + yesterdayDate;
			}
			fileName += '.txt';
			log.debug('execute', 'fileName = ' + fileName);

			var exeEnvironment = runtime.envType;	//Get execution environment	
			//var templateId = scriptObj.getParameter({name: 'custscript_cp_email_template_id'});
			var sbHostKey = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCxoT0iBaOmQ8eUOCxQq0QEyfFjOCEbGkVKCQUrHPgYnxYbwoqx2aXbZgBdfgn2V/NA+ytUtJ2HUy6tAdAgnRTXqP3Z7Xhg5L1KxkpxU0ZbvBkvSFrikOkmxaVIOof1YHD8/QgLManAVv1BcqHwKZH9PvuyEQLav4lPP49HW5K+EzKU1eABgBDX1daG3JY3/8jLh+pZek8Bf7bJN9e3B8GH8CwH3pKPLR5JP7/FTx50RSpdiVdCmYGcVN1VRLG/vlZYb7bBwgv5GX7DuI29I87edkednQ8/x559YoOVaw68RRpDQnm2d9cEjMA0HDDmpIBis27fF9GQ6weNRzDlBxeJ';
			var prodHostKey = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5';	//'AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5';			
			/*
			safetrans.wellsfargo.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5
   
			*/
			log.debug("execute", "exeEnvironment: " + exeEnvironment);
			var downloadedFile = null;
			var downloadedFiles = [];
			if (exeEnvironment == 'SANDBOX') {
				try {
					var connection = sftp.createConnection({
						username: 't9tx7jc8',
						passwordGuid: '6cb31b5c464b446d8bc3362efa8cf5ad',
						url: 'safetransvalidate.wellsfargo.com',
						hostKey: sbHostKey,
						directory: '/',
						port: 22
					});
					log.debug('execute', 'SFTP Connection established successfully! MaxTimeOutLimit:' + connection.MAX_TRANSFER_TIMEOUT + ',MaxFileSizeLimit: ' + connection.MAX_FILE_SIZE);
				}
				catch (ex) {
					log.error('SFTP Error', 'Unable to establish connection: ' + ex.message);
				}
			}
			else if (exeEnvironment == 'PRODUCTION') {
				try {
					var connection = sftp.createConnection({
						username: 'a1fug2i3',
						passwordGuid: '6c62dba07c84467eb6a25298e8a5572e',
						url: 'safetrans.wellsfargo.com',
						hostKey: prodHostKey,
						directory: '/',
						port: 22
					});
					log.debug('execute', 'SFTP Connection established successfully! MaxTimeOutLimit:' + connection.MAX_TRANSFER_TIMEOUT + ',MaxFileSizeLimit: ' + connection.MAX_FILE_SIZE);
				}
				catch (ex) {
					log.error('SFTP Error', 'Unable to establish connection: ' + ex);
				}

			}
			try {
				var arrayFilesInfo = connection.list({
					path: sftpFodler
				});
				log.debug("execute() arrayFilesInfo is: ", arrayFilesInfo);
				var length = arrayFilesInfo ? arrayFilesInfo.length : 0;
				for (var i = 0; i < length; i++) {
					var fileName = arrayFilesInfo[i].name;
					//Check if filename contains substring for current date = 1, not taking into account the time
					if (fileName.indexOf(yesterdayDate) != -1) {
						downloadedFile = connection.download({
							directory: sftpFodler,
							filename: arrayFilesInfo[i].name
						});
						downloadedFile.folder = nsFolder;
						var downloadedFileId = downloadedFile.save();
						downloadedFiles.push(downloadedFileId);
						log.debug('execute', 'File downloaded successfully. fileName = ' + fileName);
						log.debug('execute', 'downloadedFileId = ' + downloadedFileId);
					}
				}
			}
			catch (ex) {
				log.error('SFTP Error', 'Unable to download file: ' + ex.message);
			}
			//Convert to CSV
			try {
				for (var i = 0; i < downloadedFiles.length; i++) {
					var downloadedFileId = downloadedFiles[i];
					var txtFileObj = file.load({ id: downloadedFileId });
					log.debug('execute', 'Downloaded File Name = ' + txtFileObj.name);
					//Checking for name with commas
					var lines = txtFileObj.getContents().split('\n');
					var newContent = [];
					newContent.push(lines[0]);
					var columnsCount = lines[0].split(',').length;
					log.debug('columnsCount', columnsCount);
					for (var j = 1; j < lines.length; j++) {
						var line = lines[j];
						if (line.indexOf(',') != -1) {
							if (line && fileType == "ACH") line = updateName(line);
						}
						newContent.push(line);
					}
					newContent = newContent.join('\n');

					//END CHECK
					var csvFileName = txtFileObj.name.replace(".txt", ".csv");
					log.debug('execute', 'csvFileName = ' + csvFileName);

					var csvFileObj = file.create({
						name: csvFileName,
						fileType: file.Type.CSV,
						contents: newContent
					});
					csvFileObj.folder = nsFolder;
					var csvFileId = csvFileObj.save();
					log.debug('execute', 'CSV File saved successfully.');
					log.debug('execute', 'csvFileId = ' + csvFileId);
				}
			}
			catch (ex) {
				log.error('File Conversion Error SBX', 'Unable to convert to CSV file: ' + ex.message);
			}//End check of exeEnvironment//End check of exeEnvironment
			//Import CSV
			try {
				var csvImportTask = task.create({ taskType: task.TaskType.CSV_IMPORT });
				csvImportTask.mappingId = mappingId;
				var csvFile = file.load(csvFileId);
				csvImportTask.importFile = csvFile;
				var csvImportTaskId = csvImportTask.submit();
				log.debug({ title: 'execute', details: 'CSV Import Task Submitted. csvImportTaskId = ' + csvImportTaskId });
			}
			catch (ex) {
				log.error('CSV File Import Error', 'Unable to import CSV file: ' + ex.message);
			}

		}
		function getYYYYMMDD(date) { //! PROBLEM
			var d = new Date(date),
				month = '' + (d.getMonth() + 1),
				day = '' + d.getDate(),
				year = d.getFullYear();

			if (month.length < 2)
				month = '0' + month;
			if (day.length < 2)
				day = '0' + day;

			return [year, month, day].join('');
		}

		function updateName(strLine) {
			try {
				var arr_char = strLine.split(',');
				var has_8_comas = arr_char.length <= 8;
				if (has_8_comas) return strLine;
				arr_char = strLine.split('');
				arr_char = removeSecondComma(arr_char)
				strLine = arr_char.join('');
				arr_char = strLine.split(',');
				var has_8_comas = strLine.length <= 8;
				return has_8_comas ? has_8_comas : updateName(strLine);

			} catch (error) {
				log.error('updateName', error);
				return strLine
			}
		}

		function removeSecondComma(charArray) {
			try {
				var commaCount = 0;
				for (var i = 0; i < charArray.length; i++) {
					if (charArray[i] === ',') {
						commaCount++;
						if (commaCount === 2) {
							charArray.splice(i, 1);
							break;
						}
					}
				}
				return charArray;

			} catch (error) {
				log.error('removeSecondComma', error);
			}

		}

		return {
			execute: execute
		};
	});