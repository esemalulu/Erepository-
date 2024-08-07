/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/email', 'N/file', 'N/log', 'N/record','N/search'],
    (email, file, log, record,search) => {

        const searchFileByName=() => {
            try {
                let idFolder;
                let fileSearchObj = search.create({
                    type: "file",
                    filters:
                        [
                            ["folder", "anyof", "-15"],
                            "AND",
                            ["name","contains","Credit-Memo-Invoices-Network-Report"]
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
            } catch (error) {
                log.error("SearchFileByName error",error);
            }
        }

        const execute = (scriptContext) => {
            try {
                var csvFileId = searchFileByName();
                if(!csvFileId){
                    throw new Error('Error file not exists.');
                }
                let fileLoaded = file.load({id: csvFileId});
                var recipientsEmails = ['german.m@suitedb.com','bthompson@acmepaper.com','pciura@networkdistribution.com'];
                email.send({
                    author: 96988,
                    recipients: recipientsEmails,
                    subject: 'Invoice CSV Report',
                    body: 'CSV File Attached',
                    attachments: [fileLoaded],
                });
                
            } catch (error) {
                log.error('execute',error)
            }
        }

        return {execute}

    });
