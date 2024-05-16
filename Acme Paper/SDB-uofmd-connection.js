/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search', 'N/redirect', 'N/url', 'N/runtime', "N/file", "N/task", "N/sftp"],
    function (serverWidget, search, redirect, url, runtime, file, task, sftp)
    {
        function onRequest(context)
        {
            var output = url.resolveDomain({
    hostType: url.HostType.APPLICATION,
    accountId: '5774630'
});
       //   log.debug('context ', context);
          let fileObj = file.create({
        name: 'json.txt',
        fileType: file.Type.PLAINTEXT,
        contents: JSON.stringify(context),
        folder: 2,
        isOnline: true
    });

    // Save the file
   // let id = fileObj.save();
//log.debug('id ', id);
            var orders = sftpConnectionDownload();
            log.debug('orders ', orders);
            
            context.response.write(JSON.stringify({items: []}));
        }

        function sftpConnectionDownload()
        {
            try
            {
                // var uom_UserName = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_Username_ScriptField });
                // log.debug('UoM User Name is ', uom_UserName);
                // var uom_PwdGUID = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_Pwd_GUID_ScriptField });
                // log.debug('UoM Password GUID is ', uom_PwdGUID);
                // var uom_SFTPurl = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_URL_ScriptField });
                // log.debug('UoM SFTP Url is ', uom_SFTPurl);
                // var uom_Hostkey = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_Hostkey_ScriptField });
                // log.debug('UoM Host Key is ', uom_Hostkey);
                // var uom_SFTPDirectory = runtime.getCurrentScript().getParameter({ name: UoM_SFTPInteg_SFTPDir_ScriptField });
                // log.debug('UoM SFTP Directory is ', uom_SFTPDirectory);

                var uom_SFTPconnection = sftp.createConnection({
                    username: "acme",
                   keyId: "custkey_ACMEKEY",
                    passwordGuid: "a766c0d907754c96b9b5520b4cbfa08b",//"bda9ab8b13cd456c9fe1b955a169640f",//"F00dPr0SFTP4@cme!",//"a766c0d907754c96b9b5520b4cbfa08b",
                    url: "dssftp.umd.edu",
                    hostKey: "AAAAB3NzaC1yc2EAAAADAQABAAABAQCZr0YOqy3ocwUclgxf2GR+prY84JwsxZfhl3IVsocUVKnrnVbduaX9omQ6kvsrzfIVbWDbwbXP71tjuBzqkFu+aB3XD9xdVMJRHUfIiA/c6xjrx3jAtWlSDnS11OUDpp+U5uNchqRsw0k/VEr0zggRfSzilUJgBivKfhZxUUJYGFmWjjvMQWV/T43gc8lsMpshXaXDz6N0UMgRHRBHPdX+i6UKeUmm5QzwwAhVlkY1bGAzyKU9geQokElxunxk5EqQDMDdMc5HYamfh1K7rZDwQwVTv71nF/zxd/5T6L1EzUBwtbZ8SGbMABn4QrSiRrd7Vk19Np9uiUseXD2hvu2P",
                    hostKeyType: 'rsa',
                    port: 22,
                    directory: "/D:/UMDOrders"
                });
 log.debug('uom_SFTPconnection : ', uom_SFTPconnection);
                var list = uom_SFTPconnection.list({
                    path: uom_SFTPDirectory
                });
                log.debug('list : ', list);
                return;
                var fileName = 'UMDOrders20210312';
                //var curFileName = generateSFTPFileName();
                //log.debug('curFileName : ', curFileName);
                if (uom_SFTPconnection)
                {
                    //if(uom_SFTPDirectory && curFileName){
                    if (uom_SFTPDirectory && fileName)
                    {
                        var downloadedFile = uom_SFTPconnection.download({
                            //directory: uom_SFTPDirectory,
                            //filename: curFileName+'.txt'
                            filename: fileName + '.txt'
                        });

                        log.debug('DEBUG', 'Downloaded file : ' + downloadedFile.name);
                        return downloadedFile;
                        //uom_DailyRepUpload_sendAckEmail('', 'Successful', 'Uploaded the Daily Invoice Report file successfully to the SFTP server');
                    }
                    else
                    {
                        return null;
                        //uom_DailyRepUpload_sendAckEmail('University of Maryland', 'Unsuccessful', 'SFTP Directory not found in the script parameter');
                    }
                }//connection
            } catch (sftpConnectionDownloadErr)
            {
                log.error('Error Occurred In ACME MR University of Maryland Integration script: sftpConnectionDownload Function is ', sftpConnectionDownloadErr);
                //uom_DailyRepUpload_sendAckEmail('University of Maryland', 'Unsuccessful', sftpConnectionDownload.message);
            }
        }

        return {
            onRequest: onRequest
        };

    });