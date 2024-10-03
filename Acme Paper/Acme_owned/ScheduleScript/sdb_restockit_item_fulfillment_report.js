/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/file', 'N/search', 'N/sftp', 'N/runtime'],
    /**
 * @param{file} file
 * @param{search} search
 * @param{sftp} sftp
 */
    (file, search, sftp, runtime) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const USER = "custscript_sdb_restockit_user";
        const PASSGUID = "custscript_sdb_restockit_pass_guid";
        const URL = "custscript_sdb_restockit_integration_url";
        const HOSTKEY = "custscript_sdb_restockit_host_key";
        const DIRECTORY = "custscript_sdb_restockit_sftp_directory";
        const SS = "custscript_sdb_restockit_saved_search";
        const FILEFOLDER = "custscript_sdb_restockit_file_folder";

        const execute = (scriptContext) => {
            try {
                var user = runtime.getCurrentScript().getParameter({ name: USER });
                var passGuid = runtime.getCurrentScript().getParameter({ name: PASSGUID });
                var url = runtime.getCurrentScript().getParameter({ name: URL });
                var hostkey = runtime.getCurrentScript().getParameter({ name: HOSTKEY });
                var dir = runtime.getCurrentScript().getParameter({ name: DIRECTORY });
                var ss = runtime.getCurrentScript().getParameter({ name: SS });
                var fileFolder = runtime.getCurrentScript().getParameter({ name: FILEFOLDER });
                var fileName = 'ASN_' + Date.now() + '.csv';

                log.debug("execute() Script params are:", {
                    user, passGuid, url, hostkey, dir, ss
                });
                var fileID = createFileUsingSearch(ss, fileName, fileFolder);

                var connection = sftp.createConnection({
                    url: url,
                    passwordGuid: passGuid,
                    hostKey: hostkey,
                    username: user,
                    port: 22,
                });

                // Test connection
                var listElements = connection.list({
                    path: dir,
                });
                log.debug("execute() listElements is : ", listElements);
                var fileCreated =file.load({
                    id: fileID
                });
                connection.upload({
                    directory: dir,
                    file: fileCreated,
                    replaceExisting: true
                });


            } catch (executeError) {
                log.error("execute() ERROR", executeError);
            }
        }

        function createFileUsingSearch(ss, fileName, fileFolder) {
            try {
                var loadedSearch = search.load({
                    id: ss,
                });
                var columns = loadedSearch.columns;
                log.debug("createFileUsingSearch() columns are: ", columns);
                var fileContent = '';
                for (var i = 0; i < columns.length; i++) {
                    var column = columns[i];
                    fileContent += i < columns.length - 1 ? column.label + ',' : column.label + '\n';
                }
                loadedSearch.run().each(function (result) {
                    for(var i = 0; i < columns.length ; i++){
                        var column = columns[i];
                       fileContent += i < columns.length - 1 ? result.getValue(column).replace(/<BR>/g, ' | ') + ',' : result.getValue(column).replace(/<BR>/g, ' | ') + '\n';
                      //fileContent += i < columns.length - 1 ? result.getValue(column) + ',' : result.getValue(column) + '\n';
                    }
                    return true;
                });
                log.debug("createFileUsingSearch() fileContent is: ", fileContent);
                var fileId = file.create({
                    name: fileName,
                    fileType: file.Type.CSV,
                    contents: fileContent,
                    folder: fileFolder,
                }).save();

                log.debug("createFileUsingSearch() File ID is: ", fileId);

                return fileId;
            } catch (createFileUsingSearch) {
                log.error("createFileUsingSearch() ERROR", createFileUsingSearch);
            }
        }

        return { execute }

    });
