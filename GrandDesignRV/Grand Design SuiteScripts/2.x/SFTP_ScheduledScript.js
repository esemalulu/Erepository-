/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/log', 'N/format', 'N/file', 'N/https', 'N/query', 'N/record', 'N/runtime', 'N/sftp', 'N/task', 'N/url', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
    /**
     * @param{file} file
     * @param{https} https
     * @param{query} query
     * @param{record} record
     * @param{runtime} runtime
     * @param{sftp} sftp
     * @param{task} task
     * @param{url} url
     */
    (log, format, file, https, query, record, runtime, sftp, task, url, SSLib_Task) => {

        var processResultSet = [];

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            //get the environment and only run the STFP connection in Production.
            var enviType = JSON.stringify(runtime.envType);
            log.audit('Environment', 'Environment for current user: ' + enviType);
            // Load the Configuration Record
            var config_SuiteQLStatement = `SELECT * FROM customrecordgd_saferide_config WHERE id = 1`;
            var config_ResultSet = query.runSuiteQL({
                query: config_SuiteQLStatement
            }).asMappedResults();

            var createdFileList = createFiles(config_ResultSet);
            if (createdFileList == true) {
                sftpExecute(config_ResultSet);
                processOutboundRecords(config_ResultSet, processResultSet);
            }
            //TODO - Not implemented Yet, This will be implemented after move to live
            //processInboundRecords(config_ResultSet);
            archiveFileCleanup(config_ResultSet);
            log.audit('SFTP Process End', `;)`);
        }

        /**
         * Prcesses SuiteQL to get the records to create the CSV File.
         * @since 2015.2
         */
        const createFiles = (config_ResultSet) => {
            //get the environment and only run the STFP connection in Production.
            var enviType = JSON.stringify(runtime.envType);
            // Converts Date to YYYYMM and YYYYMMDD
            var x = new Date();
            var y = x.getFullYear().toString();
            var m = (x.getMonth() + 1).toString();
            var d = x.getDate().toString();
            (d.length == 1) && (d = '0' + d);
            (m.length == 1) && (m = '0' + m);
            var yyyymmddDate = y + m + d;
            var yyyymmDate = y + m;

            try {
                //Membership file
                var Membership_suiteQL = `SELECT  "id", "custrecordgd_sftp_clientid", "custrecordgd_sftp_formatversion", "custrecordgd_sftp_transactioncode", "custrecordgd_sftp_programid", "custrecordgd_sftp_prefaceddealercode", "custrecordgd_sftp_prefacedmembernumb", "custrecordgd_sftp_newused", "custrecordgd_sftp_retaillastname", "custrecordgd_sftp_retailfirstname", "custrecordgd_sftp_address", "custrecordgd_sftp_city", "custrecordgd_sftp_state", "custrecordgd_sftp_zipcode", "custrecordgd_sftp_termmiles", "custrecordgd_sftp_termmonths", "custrecordgd_sftp_startdate", "custrecordgd_sftp_startmiles", "custrecordgd_sftp_vin", "custrecordgd_sftp_vehicleyear", "custrecordgd_sftp_vehiclemake", "custrecordgd_sftp_vehiclemodel", '' AS dollar_limit, '' AS reject_id, "custrecordgd_sftp_aux1", "custrecordgd_sftp_aux2", "custrecordgd_sftp_clientref", '' AS expiration_date, '' AS expiration_miles, "custrecordgd_sftp_country", "custrecordgd_sftp_phonenumber", "custrecordgd_sftp_email", "custrecordgd_sftp_optemail" FROM customrecordgd_sftp_queue WHERE custrecordgd_sftp_type = 1 AND custrecordgd_sftp_status = 'Pending' and isinactive = 'F'`;
                var Membership_ResultSet = query.runSuiteQL({
                    query: Membership_suiteQL
                });
                var Membership_ResultSet_Mapped = Membership_ResultSet.asMappedResults();
                if (Object.keys(Membership_ResultSet_Mapped).length) {
                    let seqField = 'custrecordgd_saferide_memeberseq'
                    var memberSeq = nextSequence(config_ResultSet, seqField);
                    if (enviType != '"SANDBOX"') {
                        var sftpFileName = `${config_ResultSet[0].custrecordgd_saferide_clientid}-${yyyymmDate}-MBR-${yyyymmddDate}${memberSeq}`;
                    } else {
                        var sftpFileName = `SANDBOX_${config_ResultSet[0].custrecordgd_saferide_clientid}-${yyyymmDate}-MBR-${yyyymmddDate}${memberSeq}`;
                    }
                    processCSVtoFile(sftpFileName, config_ResultSet, Membership_ResultSet_Mapped);
                    processingFile(sftpFileName, Membership_ResultSet_Mapped);
                }
            } catch (e) {
                log.error('Membership error: ', e);
            }

            try {
                //Dealer file
                var dealer_suiteQL = `SELECT "id", "custrecordgd_sftp_clientid","custrecordgd_sftp_formatversion", "custrecordgd_sftp_prefaceddealercode", "custrecordgd_stfp_dealername", "custrecordgd_sftp_address", "custrecordgd_sftp_city", "custrecordgd_sftp_state", "custrecordgd_sftp_zipcode", "custrecordgd_sftp_phonenumber", "custrecordgd_sftp_country", "custrecordgd_sftp_transactioncode" FROM customrecordgd_sftp_queue WHERE custrecordgd_sftp_type = 2 AND custrecordgd_sftp_status = 'Pending' and isinactive = 'F'`;
                var dealer_ResultSet = query.runSuiteQL({
                    query: dealer_suiteQL
                });
                var dealer_ResultSet_Mapped = dealer_ResultSet.asMappedResults();
                if (Object.keys(dealer_ResultSet_Mapped).length) {
                    let seqField = 'custrecordgd_saferide_dealerseq';
                    var dealerSeq = nextSequence(config_ResultSet, seqField);
                    if (enviType != '"SANDBOX"') {
                        var sftpFileName = `${config_ResultSet[0].custrecordgd_saferide_clientid}-${yyyymmDate}-DLR-${yyyymmddDate}${dealerSeq}`;
                    } else {
                        var sftpFileName = `SANDBOX_${config_ResultSet[0].custrecordgd_saferide_clientid}-${yyyymmDate}-DLR-${yyyymmddDate}${dealerSeq}`;
                    }
                    processCSVtoFile(sftpFileName, config_ResultSet, dealer_ResultSet_Mapped);
                    processingFile(sftpFileName, dealer_ResultSet_Mapped);
                }
                return true;
            } catch (e) {
                log.error('Dealer error: ', e);
                return false;
            }
        }

        /**
         * Prcesses SuiteQL to CSV Output File.
         * @since 2015.2
         */
        const processCSVtoFile = (sftpFileName, config_ResultSet, ResultSet) => {
            try {
                var csv;
                //Converst Mapped Resulst to CSV style output - The File does not need the Headers this is only used for testing
                var columnNames = Object.keys(ResultSet[0]);
                // var row = '' + columnNames.join('|') + '';
                // csv = row + "\r\n";

                //log.debug('ResultSet.length', ResultSet.length);
                for (r = 0; r < ResultSet.length; r++) {
                    var record = ResultSet[r];
                    var values = [];
                    for (c = 1; c < columnNames.length; c++) {
                        var column = columnNames[c];
                        var value = record[column];
                        if (value != null) {
                            value = value.toString();
                        } else {
                            value = '';
                        }
                        values.push('' + value + '');
                    }
                    var row = values.join('|');
                    if (!csv) {
                        csv = row + "\r\n"; //Row 1
                    } else {
                        csv += row + "\r\n"; //Row 2 +
                    }
                }

                var fileName = sftpFileName;
                var fileObj = file.create({
                    name: fileName,
                    fileType: file.Type.PLAINTEXT,
                    contents: csv,
                    encoding: file.Encoding.UTF8,
                    folder: config_ResultSet[0].custrecordgd_saferide_outboundfolderid, //Log Files Folder
                    isOnline: true
                });
                // Save the file
                var fileDetail = fileObj.save();
                log.audit('File Saved', fileName);
            } catch (fileDetail) {
                log.error('File error: ', fileErr);
            }
        }

        /**
         * Prcesses Executes the upload/download of Files via SFTP.
         * @since 2015.2
         */
        const sftpExecute = (config_ResultSet) => {
            try {
                var enviType = JSON.stringify(runtime.envType);
                var filesToProcess_suiteQL = `SELECT * FROM FILE WHERE FOLDER = ${config_ResultSet[0].custrecordgd_saferide_outboundfolderid}`;
                var filesToProcess_ResultSet = query.runSuiteQL({
                    query: filesToProcess_suiteQL
                });

                try {
                    //create sftp connection to the remote server.
                    var connection = sftp.createConnection({
                        url: config_ResultSet[0].custrecordgd_saferide_sftpendpoint,
                        username: config_ResultSet[0].custrecordgd_saferide_userid,
                        passwordGuid: config_ResultSet[0].custrecordgd_saferide_sftppassword,
                        //directory: `/`,
                        hostKey: config_ResultSet[0].custrecordgd_saferide_sfthostkey,
                    });
                } catch (err) {
                    log.error('sftp.createConnection ERROR', err);
                }
                var filesToProcess_ResultSet_Mapped = filesToProcess_ResultSet.asMappedResults();
                log.audit('File Count to Be Sent', Object.keys(filesToProcess_ResultSet_Mapped).length)
                if (connection && enviType != '"SANDBOX"') {
                    if (Object.keys(filesToProcess_ResultSet_Mapped).length) {
                        //#region Upload
                        for (let i = 0; i < Object.keys(filesToProcess_ResultSet_Mapped).length; i++) {
                            var fileObj = file.load({
                                id: filesToProcess_ResultSet_Mapped[i].id
                            });
                            try {
                                var myUpload = connection.upload({
                                    directory: `/${config_ResultSet[0].custrecordgd_saferide_sftpuploadfolder}`,
                                    file: fileObj,
                                    replaceExisting: true
                                });
                                log.audit('File Uploaded', fileObj);
                            } catch (err) {
                                log.error('connection.upload ERROR', err);
                            }
                        }
                        var ConnectionList = connection.list({
                            path: `/${config_ResultSet[0].custrecordgd_saferide_sftpuploadfolder}`
                        });
                        log.audit('ConnectionList', ConnectionList);
                        //#endregion Upload
                    }

                    //#region Download
                    try {
                        let downloadConnectionList = connection.list({
                            path: `/${config_ResultSet[0].custrecordgd_saferide_downloadfolder}`
                        });
                        log.audit('downloadConnectionList', downloadConnectionList);
                        if (downloadConnectionList) {
                            try {
                                connection.download({
                                    directory: `/${config_ResultSet[0].custrecordgd_saferide_downloadfolder}`
                                });
                            } catch (err) {
                                log.error('connection.download ERROR', err);
                            }
                        }
                        downloadConnectionList = connection.list({
                            path: `/${config_ResultSet[0].custrecordgd_saferide_downloadfolder}`
                        });
                        log.audit('downloadConnectionList', downloadConnectionList);
                    } catch (err) {
                        log.error('downloadConnectionList ERROR', err);
                    }
                    //#endregion Download
                }
            } catch (e) {
                log.error('SFTP SECTION ERROR', e);
            }
            try {
                if (Object.keys(filesToProcess_ResultSet_Mapped).length) {
                    for (let j = 0; j < Object.keys(filesToProcess_ResultSet_Mapped).length; j++) {
                        var moveFileObj = file.load({
                            id: filesToProcess_ResultSet_Mapped[j].id
                        });
                        moveFileObj.folder = config_ResultSet[0].custrecordgd_saferide_archivefolderid;
                        moveFileObj.save();
                    }
                }
            } catch (e) {
                log.error('SFTP Move Files ERROR', e);
            }
        }

        /**
         * Prcesses the file sequence number.
         * @since 2015.2
         */
        const nextSequence = (config_ResultSet, configField) => {
            var returnSeq;
            //Get todays Date
            var today = new Date();
            var todayFormatted = format.format({
                value: today,
                type: format.Type.DATETIMETZ
            });
            today = today.toLocaleDateString();
            //Get the last Sequence Updated Date
            var seqLastUpdated = new Date(config_ResultSet[0].custrecordgd_saferide_sequpdatedate);
            seqLastUpdated = seqLastUpdated.toLocaleDateString();
            var config_Field = configField;
            // The Sequnce should always start with 'A' and incrase through the Alphabet through out the Day if mutilple files are sent.
            //If the Last update was not today then the Sequence should be reset to 'A'
            if (seqLastUpdated != today) {
                //Load the Record
                var configRecord = record.load({
                    type: 'customrecordgd_saferide_config',
                    id: config_ResultSet[0].id,
                    isDynamic: true
                });
                configRecord.setText({
                    fieldId: config_Field,
                    text: 'A',
                    ignoreFieldChange: true
                });
                configRecord.setText({
                    fieldId: 'custrecordgd_saferide_sequpdatedate',
                    text: todayFormatted,
                    ignoreFieldChange: true
                });
                configRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: false
                });
                returnSeq = 'A';
            } else {
                //Load the Record
                var configRecord = record.load({
                    type: 'customrecordgd_saferide_config',
                    id: config_ResultSet[0].id,
                    isDynamic: true
                });
                var currentSeq = configRecord.getValue({
                    fieldId: config_Field
                });
                let nextSeq = String.fromCharCode(currentSeq.charCodeAt(0) + 1);
                configRecord.setValue({
                    fieldId: config_Field,
                    value: nextSeq.toUpperCase(),
                    ignoreFieldChange: true
                });
                configRecord.setText({
                    fieldId: 'custrecordgd_saferide_sequpdatedate',
                    text: todayFormatted,
                    ignoreFieldChange: true
                });
                configRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: false
                });
                returnSeq = nextSeq.toUpperCase();
            }

            return returnSeq;
        }

        /**
         * Prcesses Records that are marked to be sent to SafeRide.
         * @param {Object} scriptContext
         * @since 2015.2
         */
        const processOutboundRecords = (config_ResultSet, createdFileList) => {
            //trigger map/reduce to update the queue records with the following fields: filename (custrecordgd_sftp_outboundfile), SFTP Status (custrecordgd_sftp_status), SFTP Date (custrecordgd_sftp_outbounddate)
            //fileLogger('createdFileList', JSON.stringify(createdFileList));
            try {
                SSLib_Task.startMapReduceScript('customscriptgd_sftpqueueupdater_mr', 'customdeploygd_sftpqueueupdater_mr', {
                    custscriptgd_recordlist: createdFileList
                }, '1', '5', '60');
            } catch (err) {
                log.error('error attempting to kick off the map reduce.', err);
            }
        }

        /**
         * Parses the inbound Files and update records with any error messages.
         * @param {Object} scriptContext
         * @since 2015.2
         */
        const processInboundRecords = (config_ResultSet, downloadConnectionList) => {
            //load the file contents and create a JSON of the data. Pass Data to the Map/Reduce.
            var dataJSON;
            //trigger map/reduce to update the queue records with the following fields: filename (custrecordgd_sftp_outboundfile), SFTP Status (custrecordgd_sftp_status), SFTP Date (custrecordgd_sftp_outbounddate)
            try {
                SSLib_Task.startMapReduceScript('customscriptgd_sftpqueueupdater_mr', null, {
                    custscriptgd_recordlist: dataJSON
                }, '1', '5', '60');
            } catch (err) {
                log.error('error attempting to kick off the map reduce.', err);
            }
            //Move the Files to Archive
        }

        /**
         * Parses the inbound Files and update records with any error messages.
         * @param {Object} scriptContext
         * @since 2015.2
         */
        const archiveFileCleanup = (config_ResultSet) => {
            //get the list of files in the Archive folder.
            //remove any files older than the retention days set in the configuration record.
            try {
                var today = new Date();
                var retentionDate = new Date(today.setDate(today.getDate() - config_ResultSet[0].custrecordgd_sftp_retention));
                retentionDate = retentionDate.getMonth() + '/' + retentionDate.getDate() + '/' + retentionDate.getFullYear();
                fileSuiteQL = `SELECT * FROM file WHERE folder = ${config_ResultSet[0].custrecordgd_saferide_archivefolderid} AND createddate < '${retentionDate}'`;
                var filesToDelete_ResultSet = query.runSuiteQL({
                    query: fileSuiteQL
                }).asMappedResults();
                if (Object.keys(filesToDelete_ResultSet).length) {
                    for (let k = 0; k < Object.keys(filesToDelete_ResultSet).length; k++) {
                        file.delete({
                            id: filesToDelete_ResultSet[k].id
                        });
                    }
                }
            } catch (err) {
                log.error('error attempting to delete archive files.', err);
            }
        }

        /**
         * Prcessesed Records keep the ID and File Name in a file for processin in map reduce.
         * @param {Object} scriptContext
         * @since 2015.2
         */
        const processingFile = (sftpFileName, queryData) => {
            queryData.forEach((data) => {
                var dataID = data.id;
                    processResultSet.push(`${sftpFileName} | ${dataID}`);
            });
            return true;
        }

        const fileLogger = (FileName, Log) => {
            try {
                let fileName = (`Script log - ${FileName}.txt`);
                let fileObj = file.create({
                    name: fileName,
                    fileType: file.Type.PLAINTEXT,
                    contents: Log,
                    encoding: file.Encoding.UTF8,
                    folder: 40418678, //Saferide Files Folder
                    isOnline: true
                });
                // Save the file
                fileObj.save();
                log.debug('File Logger Saved');
            } catch (fileErr) {
                log.error('File Logger error: ', fileErr);
            }
        }

        return {
            execute
        }

    });