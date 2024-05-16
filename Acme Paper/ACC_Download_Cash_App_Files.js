/**
 *@NApiVersion 2.0
 *@NScriptType ScheduledScript
 */
 define(['N/sftp', 'N/file', 'N/record', 'N/search', 'N/email','N/runtime','N/task'],
 function(sftp, file, record, search, email, runtime, task) 
 {
	 function execute() 
	 {
		 var scriptObj = runtime.getCurrentScript();	
		 var fileType = scriptObj.getParameter("custscript_file_type");
		 var sftpFodler = '';
		 var nsFolder = scriptObj.getParameter("custscript_ns_folder");
		 var mappingId = '';
		 var fileName = '';
		 var date = new Date();

		 if(fileType=='ACH'){
			 sftpFodler = '/outbound/ACMEP679_RMGR_2/';
			 mappingId = '411';
			 fileName = 'ACH_wellsfargo_'+ getYYYYMMDD(date.setDate(date.getDate() - 1));
		 }else if(fileType=='LOCKBOX'){
			 sftpFodler = '/outbound/ACMEP679_RMGR_1/';
			 mappingId = '194';
			 fileName = 'LBX_wellsfargo_'+ getYYYYMMDD(date.setDate(date.getDate() - 1));
		 }
		 fileName += '.txt';
		 log.debug('execute','fileName = '+fileName);
		 
		 var exeEnvironment = runtime.envType;	//Get execution environment	
		 //var templateId = scriptObj.getParameter({name: 'custscript_cp_email_template_id'});
		 var sbHostKey  = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCxoT0iBaOmQ8eUOCxQq0QEyfFjOCEbGkVKCQUrHPgYnxYbwoqx2aXbZgBdfgn2V/NA+ytUtJ2HUy6tAdAgnRTXqP3Z7Xhg5L1KxkpxU0ZbvBkvSFrikOkmxaVIOof1YHD8/QgLManAVv1BcqHwKZH9PvuyEQLav4lPP49HW5K+EzKU1eABgBDX1daG3JY3/8jLh+pZek8Bf7bJN9e3B8GH8CwH3pKPLR5JP7/FTx50RSpdiVdCmYGcVN1VRLG/vlZYb7bBwgv5GX7DuI29I87edkednQ8/x559YoOVaw68RRpDQnm2d9cEjMA0HDDmpIBis27fF9GQ6weNRzDlBxeJ';			
		 var prodHostKey  = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5';	//'AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5';			
		 /*
		 safetrans.wellsfargo.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5

		 */
		 log.debug("execute", "exeEnvironment: "+exeEnvironment);
		 var downloadedFile = null;
		 if(exeEnvironment=='SANDBOX') 
		 {
			 try{
				 var connection = sftp.createConnection({
											 username: 't9tx7jc8',
											 passwordGuid: '6cb31b5c464b446d8bc3362efa8cf5ad',
											 url: 'safetransvalidate.wellsfargo.com',		
											 hostKey: sbHostKey,
											 directory: '/',
											 port: 22
									 });
				 log.debug('execute','SFTP Connection established successfully! MaxTimeOutLimit:'+connection.MAX_TRANSFER_TIMEOUT +',MaxFileSizeLimit: '+connection.MAX_FILE_SIZE);
			 }
			 catch(ex) 
			 {
				 log.error('SFTP Error', 'Unable to establish connection: '+ex.message);
			 }
			 
			 try{
				 downloadedFile = connection.download({
					 directory: sftpFodler,
					 filename: fileName
				 });
				 downloadedFile.folder = nsFolder;
				 var downloadedFileId = downloadedFile.save();
				 log.debug('execute','File downloaded successfully. fileName = '+fileName);
				 log.debug('execute','downloadedFileId = '+downloadedFileId);
			 }
			 catch(ex) 
			 {
				 log.error('SFTP Error', 'Unable to download file: '+ex.message);
			 }
						 
			 //var downloadedFileId = 26417;
			 //Convert to CSV
			 try{
				 var txtFileObj = file.load({ id: downloadedFileId });
				 log.debug('execute','Downloaded File Name = '+txtFileObj.name);
				 var csvFileName = txtFileObj.name.replace(".txt",".csv");
				 log.debug('execute','csvFileName = '+csvFileName);
				 
				 var csvFileObj = file.create({
					 name: csvFileName,
					 fileType: file.Type.CSV,
					 contents: txtFileObj.getContents()
				 });
				 csvFileObj.folder = nsFolder;
				 var csvFileId = csvFileObj.save();
				 log.debug('execute','CSV File saved successfully.');
				 log.debug('execute','csvFileId = '+csvFileId);
			 }
			 catch(ex) 
			 {
				 log.error('File Conversion Error', 'Unable to convert to CSV file: '+ex.message);
			 }
			 
			 //Import CSV
			 /*try{
				 var csvImportTask = task.create({taskType: task.TaskType.CSV_IMPORT});	    	
				 csvImportTask.mappingId = mappingId; 	    	
				 var csvFile = file.load(csvFileId);	    		    	
				 csvImportTask.importFile = csvFile;	    	
				 var csvImportTaskId = csvImportTask.submit();	    	
				 log.debug({title: 'execute', details: 'CSV Import Task Submitted. csvImportTaskId = '+csvImportTaskId});
			 }
			 catch(ex) 
			 {
				 log.error('CSV File Import Error', 'Unable to import CSV file: '+ex.message);
			 }*/
		 }
		 else if(exeEnvironment=='PRODUCTION')
		 {
			 try{
				 var connection = sftp.createConnection({
					 username: 'a1fug2i3', //v6g1nl3l
					 passwordGuid: '22099ff9984f429cb812ce3bc97336a5',//'bbfc228190bc42dbbbe18335c1597848',//'906df5c125134d659b4447ce47a682ec', // 5880485058ec4836b3befbe694dbe8cc // tee1nee9173#
					 url: 'safetrans.wellsfargo.com',		
					 hostKey: prodHostKey,
					 directory: '/',
					 port: 22
				 });
				 log.debug('execute','SFTP Connection established successfully! MaxTimeOutLimit:'+connection.MAX_TRANSFER_TIMEOUT +',MaxFileSizeLimit: '+connection.MAX_FILE_SIZE);
			 }
			 catch(ex) 
			 {
				 log.error('SFTP Error', 'Unable to establish connection: '+ex);
			 }				
			 
			 try{
				var arrayFilesInfo = connection.list({
					path: sftpFodler
				});
				log.debug("execute() arrayFilesInfo is: ", arrayFilesInfo);
				var length = arrayFilesInfo ? arrayFilesInfo.length : 0;
				for(var i = 0 ; i < length; i++){
					downloadedFile = connection.download({
						directory: sftpFodler,
						filename: arrayFilesInfo[i].name
					});
					downloadedFile.folder = nsFolder;
					var downloadedFileId = downloadedFile.save();
					log.debug('execute','File downloaded successfully. fileName = '+fileName);
					log.debug('execute','downloadedFileId = '+downloadedFileId);
				}
				 
			 }
			 catch(ex) 
			 {
				 log.error('SFTP Error', 'Unable to download file: '+ex.message);
			 }			
			 
			 //Convert to CSV
			 try{
				 var txtFileObj = file.load({ id: downloadedFileId });
				 log.debug('execute','Downloaded File Name = '+txtFileObj.name);
				 var csvFileName = txtFileObj.name.replace(".txt",".csv");
				 log.debug('execute','csvFileName = '+csvFileName);
				 
				 var csvFileObj = file.create({
					 name: csvFileName,
					 fileType: file.Type.CSV,
					 contents: txtFileObj.getContents()
				 });
				 csvFileObj.folder = nsFolder;
				 var csvFileId = csvFileObj.save();
				 log.debug('execute','CSV File saved successfully.');
				 log.debug('execute','csvFileId = '+csvFileId);
			 }
			 catch(ex) 
			 {
				 log.error('File Conversion Error', 'Unable to convert to CSV file: '+ex.message);
			 }
			 
			 //Import CSV
			 try{
				 var csvImportTask = task.create({taskType: task.TaskType.CSV_IMPORT});	    	
				 csvImportTask.mappingId = mappingId; 	    	
				 var csvFile = file.load(csvFileId);	    		    	
				 csvImportTask.importFile = csvFile;	    	
				 var csvImportTaskId = csvImportTask.submit();	    	
				 log.debug({title: 'execute', details: 'CSV Import Task Submitted. csvImportTaskId = '+csvImportTaskId});
			 }
			 catch(ex) 
			 {
				 log.error('CSV File Import Error', 'Unable to import CSV file: '+ex.message);
			 }
		 }//End check of exeEnvironment//End check of exeEnvironment
		 
	 }
	 function getYYYYMMDD(date) {
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
	 
	 return {
		 execute: execute
	 };
 });