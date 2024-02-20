/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/sftp', 'N/runtime', 'N/file', '../lib/GD_LIB_Constants'],
    /**
     * @param{search} search
     * @param{sftp} sftp
     * @param{runtime} runtime
     * @param{file} file
     * @param Constants
     */
    (search, sftp, runtime, file, Constants) => {
        const folderInfo = {
            vendorMaster: 0,
            itemMaster: 0,
            itemReceipt: 0,
            completed: 0
        }
        const getFolderIds = () => {
            const getParentFolderId = () => {
                const folderSearchObj = search.create({
                    type: 'folder',
                    filters:
                        [
                            ['name', 'startswith', 'WGO Exports']
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'internalid',
                                sort: search.Sort.ASC,
                                label: 'Internal ID'
                            }),
                            search.createColumn({name: 'name', label: 'Name'})
                        ]
                });
                const results = folderSearchObj.run().getRange({start: 0, end: 1});
                if (results.length > 0)
                    return results[0].id;
                return 0;
            }
            const parentId = getParentFolderId();
            if (!parentId) {
                log.audit('PARENT FOLDER NOT FOUND', 'Parent folder not found.');
                return folderInfo;
            }
            const folderSearchObj = search.create({
                type: 'folder',
                filters:
                    [
                        ['parent', 'anyof', parentId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: 'name',
                            sort: search.Sort.ASC,
                            label: 'Name'
                        }),
                        search.createColumn({name: 'internalid', label: 'Internal ID'})
                    ]
            });

            folderSearchObj.run().each((result) => {
                const folderName = result.getValue({name: 'name'});
                const folderId = result.id;
                switch (folderName) {
                    case 'Vendor Master':
                        folderInfo.vendorMaster = folderId;
                        break;
                    case 'Item Master':
                        folderInfo.itemMaster = folderId;
                        break;
                    case 'Item Receipt':
                        folderInfo.itemReceipt = folderId;
                        break;
                    case 'Completed':
                        folderInfo.completed = folderId;
                        break;
                }
                return true;
            });
            return folderInfo;
        }
        const getDocumentIds = (folderId) => {
            const fileSearchObj = search.create({
                type: 'file',
                filters:
                    [
                        ['folder', 'anyof', folderId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: 'name',
                            sort: search.Sort.ASC,
                            label: 'Name'
                        }),
                    ]
            });
            const documentIds = [];
            fileSearchObj.run().each((result) => {
                documentIds.push(result.id);
                return true;
            });
            return documentIds;
        }

        const createConnection = () => {
            try {
                const guid = runtime.envType === runtime.EnvType.SANDBOX ? '48e64b0618fa438b9b7c35e5230fd534' : 'c8e5ab13df4b41da932ff866bb6488fc';
                const connection = sftp.createConnection({
                    username: 'wgogdrvns.gdrvnetsuite',
                    passwordGuid: guid,
                    url: 'wgogdrvns.blob.core.windows.net',
                    port: 22,
                    hostKeyType: 'ecdsa',
                    hostKey: 'AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBN6KpNy9XBIlV6jsqyRDSxPO2niTAEesFjIScsq8q36bZpKTXOLV4MjML0rOTD4VLm0mPGCwhY5riLZ743fowWA='
                });
                if (connection) {
                    return connection;
                }
            } catch (e) {
                log.debug('CONNECTION FAILED', e.message);
                return null;
            }
            return null;
        }
        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            const deploymentId = runtime.getCurrentScript().deploymentId;
            log.debug('DEPLOYMENT ID', deploymentId);
            let folderPath;
            // Get the folder path based on the deployment
            switch (deploymentId) {
                case Constants.WGO_SCH_UPLOAD.vendorMaster:
                    folderPath = '/WGO Exports/Vendor Master/';
                    break;
                case Constants.WGO_SCH_UPLOAD.itemMaster:
                    folderPath = '/WGO Exports/Item Master/';
                    break;
                case Constants.WGO_SCH_UPLOAD.itemReceipt:
                    folderPath = '/WGO Exports/Item Receipt/';
                    break;
            }
            if (folderPath) {
                const folderInfo = getFolderIds();
                let documentIds = [];
                switch (deploymentId) {
                    case Constants.WGO_SCH_UPLOAD.vendorMaster:
                        documentIds = getDocumentIds(folderInfo.vendorMaster);
                        break;
                    case Constants.WGO_SCH_UPLOAD.itemMaster:
                        documentIds = getDocumentIds(folderInfo.itemMaster);
                        break;
                    case Constants.WGO_SCH_UPLOAD.itemReceipt:
                        documentIds = getDocumentIds(folderInfo.itemReceipt);
                        break;
                }
                log.debug('DOCUMENT IDS', documentIds);
                if (documentIds.length > 0) {
                    let objConnection = createConnection();
                    const path = '';
                    if (objConnection) {
                        log.debug('CONNECTED!', 'Connected.');
                        try {
                            documentIds.forEach((documentId) => {
                                const nsFile = file.load(documentId);
                                // upload the file
                                objConnection.upload({
                                    directory: path,
                                    filename: nsFile.name,
                                    file: nsFile,
                                    replaceExisting: true
                                });
                                log.audit('UPLOADED!', `Uploaded ${nsFile.name}.`);
                                nsFile.folder = folderInfo.completed;
                                nsFile.save();
                            });
                        } catch (e) {
                            if (e.name && e.name === 'FTP_INVALID_DIRECTORY')
                                log.error('DIRECTORY DOES NOT EXIST', 'The path ' + path + ' does not exist!');
                            else
                                log.error('ERROR CONNECTING OR DOWNLOADING', e);
                        }
                    }
                } else {
                    log.debug('NO FILES TO UPLOAD', 'No files to upload.');
                }
            }
        }

        return {execute}

    });
