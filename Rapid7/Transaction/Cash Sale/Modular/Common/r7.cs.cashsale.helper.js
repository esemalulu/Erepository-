/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/ui/dialog', 'N/currentRecord', 'N/https', 'N/url'],

    function(dialog,currentRecord, https, url) {
        function closeWindow(){
            window.opener = top;
            window.close();
        }

        function popUpWindow(url, width, height){
            let params = '';
            if (width != null && width !== '' && height != null && height !== '') {
                //let left = (screen.width - width) / 2;
                //let top = (screen.height - height) / 2;
                params += 'width=' + width + ', height=' + height;
                params += ', menubar=no';
                params += ', status=no';
            }
            let newwin = window.open(url, null, params);
            if (window.focus) {
                newwin.focus();
            }
            return false;
        }

        function replaceWindow(url){
            window.location = url;
            return false;
        }

        function deleteJournals_cs(){

            let options = {
                title: 'Confirmation',
                message: 'Are you sure you want to delete ALL Journal Entries created from this transaction?'
            };

            function success(result) {
                console.log('Success with value ' + result);
                // noinspection JSIgnoredPromiseFromCall
                if (result === true) {
                    // noinspection JSCheckFunctionSignatures
                    document.getElementById('custpage_deletejournals').value = 'Deleting Journals...';
                    let recordId = currentRecord.get().id;

                    let postData = [];
                    postData['custparam_tranid'] = recordId;

                    // noinspection JSCheckFunctionSignatures
                    let deleteJournalURL = url.resolveScript({
                        scriptId: 'customscriptr7deletejournalbutton_suitel',
                        deploymentId: 'customdeployr7deletejournalbutton_suitel',
                        returnExternalUrl: false
                    });

                    // noinspection JSCheckFunctionSignatures
                    let response = https.post({url: deleteJournalURL, body: postData})
                    // noinspection JSCheckFunctionSignatures
                    document.getElementById('tbl_custpage_deletejournals').style.display = 'none';
                    let responseBody = response.body;
                    // noinspection JSIgnoredPromiseFromCall
                    dialog.alert({title: 'Alert', message: responseBody})

                }
            }

            function failure(reason) {
                console.log('Failure: ' + reason);
            }
            dialog.confirm(options).then(success).catch(failure);
        }

        return {
            closeWindow: closeWindow,
            popUpWindow: popUpWindow,
            replaceWindow: replaceWindow,
            deleteJournals_cs: deleteJournals_cs
        };

    });