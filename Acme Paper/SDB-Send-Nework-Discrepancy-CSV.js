/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/runtime', 'N/sftp', 'N/search', 'N/file'],
    
    (runtime, sftp, search, file) => {
        const execute = (scriptContext) => {
            try {
                let csvFileName = runtime.getCurrentScript().getParameter({name: 'custscript_sdb_file_name_scheduled'});
                log.debug("csvFileName",csvFileName)
                let csvFileId = csvFileName != "" ? getFileIdByFileName(csvFileName) : '';
                log.debug("csvFileId",csvFileId);
                var directory = runtime.getCurrentScript().getParameter({name: 'custscript_sdb_network_sftp_path'});
                if(csvFileId != ''){
                    let fileObj = file.load(csvFileId);
                    log.debug("fileObj",fileObj);
                    if(fileObj){
                        // Establish a connection to a remote FTP server
                        let objConnection = getServerConnection();
                        log.debug('objConnection',objConnection);
  
                        uploadFileToServer(objConnection, directory, csvFileName, fileObj);
                    }
                }
            } catch (error) {
                log.debug('error in execute', error);
            }
        }

        function uploadFileToServer(objConnection, directory, fileName, file) {
            try{
                if(objConnection && directory  && fileName  && file){
                    objConnection.upload({
                        directory: directory,
                        filename: fileName,
                        file: file,
                        replaceExisting: true
                    });
                }
            }catch (e) {
               log.error("error in uploadFileToServer", e);
            }
        }

        function getServerConnection(){
            try {
                let connection = sftp.createConnection({
                    username: runtime.getCurrentScript().getParameter({name: 'custscript_sdb_network_sftp_username'}),
                    secret: runtime.getCurrentScript().getParameter({name: 'custscript_sdb_network_sftp_secret'}),
                    url: runtime.getCurrentScript().getParameter({name: 'custscript_sdb_network_sftp_url'}),
                    //directory: runtime.getCurrentScript().getParameter({name: 'custscript_sdb_network_sftp_path'}),
                    hostKey: runtime.getCurrentScript().getParameter({name: 'custscript_sdb_network_sftp_hostkey'}),
                });
                return connection;
            } catch (e) {
                log.error("error in getServerConnection", e);
            }
        }

        function getFileIdByFileName(fileName) {
            try {
                if(fileName && fileName != ''){
                    let idFolder;
                    let fileSearchObj = search.create({
                        type: "file",
                        filters:
                            [
                                ["folder", "anyof", "-15"],
                                "AND",
                                ["name","is",fileName]
                            ],
                        columns:
                            [
                                search.createColumn({
                                    name: "name",
                                    sort: search.Sort.ASC,
                                    label: "Name"
                                }),
                                search.createColumn({ name: "internalid", label: "Internal ID" })
                            ]
                    });
                    fileSearchObj.run().each(function (result) {
                        idFolder = result.getValue('internalid');
                        return false;
                    });
                    return idFolder;
                }
            } catch (e) {
                log.error("error in getFileIdByFileName", e);
            }
        }

        return {execute}

    });