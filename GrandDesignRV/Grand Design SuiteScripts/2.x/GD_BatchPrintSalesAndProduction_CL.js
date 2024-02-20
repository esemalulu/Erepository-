/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message', 'N/url', 'N/https', 'N/search'],
    /**
     * @param {message} message
     * @param {url} url
     * @param {https} https
     * @returns {{saveRecord: (function(*): boolean)}}
     */
    function (message, url, https, search) {

        var processMessage;
        var informationMessage;
        var batchPrintSuiteletURL;
        var taskId;
        var filename = '';
        var checkCount = 0;
        function isProcessComplete(taskId) {
            if (!batchPrintSuiteletURL) {
                batchPrintSuiteletURL = url.resolveScript({
                    scriptId: 'customscriptgd_batchprintorders_suitelet',
                    deploymentId: 'customdeploygd_batchprintorders_suitelet',
                    returnExternalUrl: false
                });
            }
            if (taskId) {
                var response = https.get.promise({
                    url: batchPrintSuiteletURL + '&checkTaskId=' + taskId
                }).then(function (response) {
                    var resObj = JSON.parse(response.body);
                    console.dir(resObj)
                    if (resObj && resObj.status === 'COMPLETE' || resObj.status === 'FAILED') {
                        clearConfirmationMessage();
                        checkCount = 0;
                    } else {
                        checkCount++;
                        updateMessage(resObj);
                        setTimeout(function () {
                            isProcessComplete(taskId);
                        }, 1500);
                    }
                });
            }
        }
        function updateMessage(taskStatus) {
            if (processMessage) {
                processMessage.hide();
                processMessage = null;
                processMessage = message.create({
                    title: 'File Creation',
                    message: 'Please wait while the file is being generated. This message will be removed when the process is complete.' + '<br/><br/>Status: ' + taskStatus.status + ' (' + checkCount +')<br/><br/>Stage: ' + taskStatus.stage,
                    type: message.Type.INFORMATION
                });
                processMessage.show();
                window.processMessage = processMessage;
            }
        }
        function clearConfirmationMessage() {
            if (processMessage) {
                processMessage.hide();
                processMessage = null;
            }
            var fileInfo = getFileInfo(filename);
            if(fileInfo.url) {
                informationMessage = message.create({
                    title: 'File Created',
                    message: '<br/><span style="font-size: 16px;">Orders Complete: <a href=' + fileInfo.url + '>' + filename + '</a><br/>',
                    type: message.Type.CONFIRMATION
                });
                informationMessage.show();
            }
        }

        function showProcessStatus(taskId) {
            processMessage = message.create({
                title: 'File Creation',
                message: 'Please wait while the file is being generated. This message will be removed when the process is complete.',
                type: message.Type.INFORMATION
            });
            processMessage.show();
            setTimeout(function () {
                isProcessComplete(taskId);
            }, 1000);
        }

        function saveRecord(scriptContext) {
            return true;
        }

        function pageInit(scriptContext) {
            console.log('pageInit');
            var currentRecord = scriptContext.currentRecord;
            taskId = currentRecord.getValue('custpage_taskid');
            filename = currentRecord.getValue('custpage_filename');
            if(taskId) {
                showProcessStatus(taskId);
            }
        }
        
        function redirectToScript() {
            window.location = nlapiResolveURL('SUITELET', 'customscriptgd_batchprintorders_suitelet', 'customdeploygd_batchprintorders_suitelet');
        }
        
        /**
         * Returns the file information for the given filename.
         * @param filename
         * @returns {{}}
         */
        function getFileInfo(filename) {
            var fileInfo = {};
            if(filename) {
                var result = search.create({
                    type: 'file',
                    filters:
                        [
                            ['name', 'is', filename],
                            'AND',
                            ['folder', 'anyof', 46240080]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'name',
                                sort: search.Sort.ASC,
                                label: 'Name'
                            }),
                            search.createColumn({name: 'url', label: 'URL'})
                        ]
                }).run().getRange({start: 0, end: 1});

                if (result && result.length > 0) {
                    fileInfo.fileId = result[0].id;
                    fileInfo.name = result[0].getValue({name: 'name'})
                    fileInfo.url = result[0].getValue({name: 'url'})
                }
            }
            return fileInfo;
        }
        return {
            pageInit: pageInit,
            showProcessStatus: showProcessStatus,
            saveRecord: saveRecord,
            redirectToScript: redirectToScript
        };

    });
