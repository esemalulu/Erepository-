/**
 *@NApiVersion 2.0
 *@NScriptType ScheduledScript
 */
define(['N/sftp', 'N/file', 'N/record', 'N/search', 'N/email','N/runtime'],
function(sftp, file, record, search, email, runtime) 
{
	function execute() 
	{
		try
		{
			//Start Block: To get SFTP's Key Properties from script parameters
			var scriptObj = runtime.getCurrentScript();	
			var fileType = scriptObj.getParameter("custscript_file_type");
			var sftpFodler = '';
			var nsFolder = scriptObj.getParameter("custscript_ns_folder");
			
			if(fileType=='ACH'){
				sftpFodler = '/outbound/ACMEP679_RMGR_2/';
			}else if(fileType=='LOCKBOX'){
				sftpFodler = '/outbound/ACMEP679_RMGR_1/';
			}
			
			var exeEnvironment = runtime.envType;	//Get execution environment	
			//var templateId = scriptObj.getParameter({name: 'custscript_cp_email_template_id'});
			var sbHostKey  = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCxoT0iBaOmQ8eUOCxQq0QEyfFjOCEbGkVKCQUrHPgYnxYbwoqx2aXbZgBdfgn2V/NA+ytUtJ2HUy6tAdAgnRTXqP3Z7Xhg5L1KxkpxU0ZbvBkvSFrikOkmxaVIOof1YHD8/QgLManAVv1BcqHwKZH9PvuyEQLav4lPP49HW5K+EzKU1eABgBDX1daG3JY3/8jLh+pZek8Bf7bJN9e3B8GH8CwH3pKPLR5JP7/FTx50RSpdiVdCmYGcVN1VRLG/vlZYb7bBwgv5GX7DuI29I87edkednQ8/x559YoOVaw68RRpDQnm2d9cEjMA0HDDmpIBis27fF9GQ6weNRzDlBxeJ';			
			var prodHostKey  = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5';			
			
			log.debug("execute", "exeEnvironment: "+exeEnvironment);
			var downloadedFile = null;
			if(exeEnvironment=='SANDBOX') 
			{
				var connection = sftp.createConnection({
											username: 't9tx7jc8',
											passwordGuid: '6cb31b5c464b446d8bc3362efa8cf5ad',
											url: 'safetransvalidate.wellsfargo.com',		
											hostKey: sbHostKey,
											directory: '/',
											port: 22
									});
				log.debug('execute','SFTP Connection established successfully! MaxTimeOutLimit:'+connection.MAX_TRANSFER_TIMEOUT +',MaxFileSizeLimit: '+connection.MAX_FILE_SIZE);
				
				var fileName = 'D2103180758'+ getYYYYMMDD(new Date());
				fileName = 'D210318075806488714.TXT';
				log.debug('execute','fileName = '+fileName);				
				downloadedFile = connection.download({
		            directory: sftpFodler,
		            filename: fileName
		        });
				downloadedFile.folder = nsFolder;
				var downloadedFileId = downloadedFile.save();
				log.debug('execute','File downloaded successfully. fileName = '+fileName);
				log.debug('execute','downloadedFileId = '+downloadedFileId);
			}
			else if(exeEnvironment=='PRODUCTION')
			{
				var connection = sftp.createConnection({
										username: 'v6g1nl3l',
										passwordGuid: '5880485058ec4836b3befbe694dbe8cc',
										url: 'safetrans.wellsfargo.com',		
										hostKey: prodHostKey,
										directory: '/',
										port: 22
									});
				log.debug('execute','SFTP Connection established successfully! MaxTimeOutLimit:'+connection.MAX_TRANSFER_TIMEOUT +',MaxFileSizeLimit: '+connection.MAX_FILE_SIZE);
						
				var fileName = 'D2103180758'+ getYYYYMMDD(new Date());
				fileName = 'D210318075806488714.TXT';
				log.debug('execute','fileName = '+fileName);				
				downloadedFile = connection.download({
		            directory: sftpFodler,
		            filename: fileName
		        });
				downloadedFile.folder = nsFolder;
				var downloadedFileId = downloadedFile.save();
				log.debug('execute','File downloaded successfully. fileName = '+fileName);
				log.debug('execute','downloadedFileId = '+downloadedFileId);
			}//End check of exeEnvironment//End check of exeEnvironment
			
		}
		catch(ex) 
		{
			log.error('SFTP Connection Error', ex.message);
		}
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