/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/runtime', 'N/sftp', 'N/search', 'N/file'],
    
    (runtime, sftp, search, file) => {
        const execute = (scriptContext) => {
            try {
                let csvFileName = runtime.getCurrentScript().getParameter({name: 'custscript_sdb_file_name_scheduled'});
                let csvFileId = csvFileName != "" ? getFileIdByFileName(csvFileName) : '';
                log.debug("csvFileId",csvFileId);
                if(csvFileId != ''){
                    let fileObj = file.load(csvFileId);
                    log.debug("fileObj",fileObj);
                    if(fileObj){
                        // Establish a connection to a remote FTP server
                        let objConnection = getServerConnection();
                        log.debug('objConnection',objConnection);
                        var objConnection1 = objConnection.list({ path: '/' });   
                        log.debug("objConnection1",objConnection1)
  
                        uploadFileToServer(objConnection, getCredentials().DIRECTORY, csvFileName, fileObj);
                    }
                }
            } catch (error) {
                log.debug('error in execute', error);
            }
        }

        function uploadFileToServer(objConnection, directory, fileName, file) {
            try{
                if(objConnection!='' && directory!='' && fileName!='' && file!=''){
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
                const CREDENTIALS = getCredentials();
                let connection = sftp.createConnection({
                    username: CREDENTIALS.USER_NAME,
                    secret: CREDENTIALS.SECRET,
                    url: CREDENTIALS.URL,
                    directory: CREDENTIALS.DIRECTORY,
                    hostKey: CREDENTIALS.HOST_KEY
                });
                return connection;
            } catch (e) {
                log.error("error in getServerConnection", e);
            }
        }

        function getCredentials(){
            try {
                return {
                    USER_NAME:"AcmeAR652",
                    // PASSWORD_GUIDE: "a6a37c18e0834dc79448dfdfc35190bc",
                    HOST_KEY: "AAAAB3NzaC1yc2EAAAADAP//AAAAgQDXcjnI+qoNhxc/IBO3A0qIJRLqV19ropWsDWJSUPC5MblTlp47em8w8vnFEhYvwU8Cf1GY1Wy+r0tIMBL/gpr8WHDqmfpXH8Z13LRuw1m2Zgn6bRp1T0iZiwYFPNs0iF2szbiTErGY6By1oVCT1QOBhRwW9tGQ1wnityzbTMuzYw==",
                    SECRET: "custsecret_sdb_network_discrepancy_report",
                    URL: "transfer.networkdistribution.com",
                    // DIRECTORY: "/"
                }
            }catch (e) {
                log.error("error in getCredentials", e);
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
                                ["name","contains",fileName]
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