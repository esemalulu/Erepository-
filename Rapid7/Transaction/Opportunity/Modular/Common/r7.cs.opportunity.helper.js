// noinspection JSDuplicatedDeclaration

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

        function upgradeOppToIVM(){

            // noinspection JSCheckFunctionSignatures
            document.getElementById('custpage_upgradeivm').value = 'Upgrading...';

            let options = {
                title: 'Confirmation',
                message: 'Are you sure you want to upgrade opportunity to RIVM?'
            };

            function success(result) {
                console.log('Success with value ' + result);
                if (result === true) {
                    let orderId = currentRecord.get().id;
                    let orderType = currentRecord.get().type;

                    let numRandom = Math.floor(Math.random() * 9999999);
                    let suiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7migratetoivm_suitelet',
                        deploymentId: 'customdeployr7migratetoivm_suitelet',
                        params: {
                            custparam_tranid: orderId,
                            custparam_trantype: orderType,
                            custparam_random : numRandom
                        },
                        returnExternalUrl: false
                    });

                    // noinspection JSCheckFunctionSignatures
                    let response = https.get({url: suiteletURL})
                    let responseBody = response.body;
                    if (responseBody == null || responseBody === '') {
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: 'Something went wrong. Please contact the Administrator.'})
                    }
                    let objResponse = JSON.parse(responseBody);

                    if (objResponse.success) {
                        // noinspection JSCheckFunctionSignatures
                        document.getElementById('tbl_custpage_upgradeivm').style.display = 'none';
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: 'Successfully upgraded.'})
                        location.reload();
                    }
                    else {
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: objResponse.error})
                        // noinspection JSCheckFunctionSignatures
                        document.getElementById('custpage_upgradeivm').value = 'Upgrade to IVM';
                    }
                }else{
                    // noinspection JSCheckFunctionSignatures
                    document.getElementById('custpage_upgradeivm').value = 'Upgrade to IVM';
                }
            }

            function failure(reason) {
                console.log('Failure: ' + reason);
            }
            dialog.confirm(options).then(success).catch(failure);
        }

        function r7_upgradeOpportunity(){

            // noinspection JSCheckFunctionSignatures
            document.getElementById('custpage_upgradenxentall').value = 'Upgrading...';

            let options = {
                title: 'Confirmation',
                message: 'Are you sure you want to upgrade opportunity to RNXENTALL?'
            };

            function success(result) {
                console.log('Success with value ' + result);
                if (result === true) {
                    let orderId = currentRecord.get().id;
                    let orderType = currentRecord.get().type;

                    let numRandom = Math.floor(Math.random() * 9999999);
                    let suiteletURL = url.resolveScript({
                        scriptId: 'customscriptr7migratetonxentall_suitelet',
                        deploymentId: 'customdeployr7migratetonxentall_suitelet',
                        params: {
                            custparam_tranid: orderId,
                            custparam_trantype: orderType,
                            custparam_random : numRandom
                        },
                        returnExternalUrl: false
                    });

                    // noinspection JSCheckFunctionSignatures
                    let response = https.get({url: suiteletURL})
                    let responseBody = response.body;
                    if (responseBody == null || responseBody === '') {
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: 'Something went wrong. Please contact the Administrator.'})
                    }
                    let objResponse = JSON.parse(responseBody);

                    if (objResponse.success) {
                        // noinspection JSCheckFunctionSignatures
                        document.getElementById('tbl_custpage_upgradenxentall').style.display = 'none';
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: 'Successfully upgraded.'})
                        location.reload();
                    }
                    else {
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: objResponse.error})
                        // noinspection JSCheckFunctionSignatures
                        document.getElementById('custpage_upgradenxentall').value = 'Upgrade to RNXENTALL';
                    }
                }else{
                    // noinspection JSCheckFunctionSignatures
                    document.getElementById('custpage_upgradenxentall').value = 'Upgrade to RNXENTALL';
                }
            }

            function failure(reason) {
                console.log('Failure: ' + reason);
            }
            dialog.confirm(options).then(success).catch(failure);
        }

        function redirectToRenewalSuitelet(tranType) {
            if (tranType === 'opp') {
                // noinspection JSCheckFunctionSignatures
                document.getElementById('custpage_cotermthisopp').value = 'Validating...';
                // noinspection JSCheckFunctionSignatures
                document.getElementById('custpage_cotermthisopp').style.cursor = 'wait';
                document.body.style.cursor = 'wait';

                //window.location = 'https://system.sandbox.netsuite.com/app/site/hosting/scriptlet.nl?script=474&deploy=1&custparam_opportunity=' + currentRecord.get().id;
                window.location = url.resolveScript({
                    scriptId: 'customscriptr7renewalautomation_suitlet',
                    deploymentId: 'customdeployr7renewalautomation_suitlet',
                    params: {
                        custparam_opportunity: currentRecord.get().id
                    },
                    returnExternalUrl: false
                });
            }
            else {
                // noinspection JSCheckFunctionSignatures
                document.getElementById('custpage_renew').value = 'Validating...';
                // noinspection JSCheckFunctionSignatures
                document.getElementById('custpage_renew').style.cursor = 'wait';
                document.body.style.cursor = 'wait';

                //window.location = 'https://system.sandbox.netsuite.com/app/site/hosting/scriptlet.nl?script=474&deploy=1&custparam_salesorder=' + currentRecord.get().id;
                window.location = url.resolveScript({
                    scriptId: 'customscriptr7renewalautomation_suitlet',
                    deploymentId: 'customdeployr7renewalautomation_suitlet',
                    params: {
                        custparam_salesorder: currentRecord.get().id
                    },
                    returnExternalUrl: false
                });
            }
        }

        function migrateToIntSub() {

            // made the same as by scheduled script (Isabel Opportunity Move Scheduled)
            let DEFAULT_SALESREP = 190399631; // Customer Operations Support
            let DEFAULT_PRESALESREP = 20791131; // Moon, HyunWook

            let options = {
                title: 'Confirmation',
                message: 'Are you sure? This action will close this Opportunity and migrate it to International Subsidiary. Press OK to proceed.'
            };

            // noinspection JSCheckFunctionSignatures
            function success(result) {
                if (result === true) {
                    let oppId = currentRecord.get().id;
                    // noinspection JSCheckFunctionSignatures
                    let suiteletURL = url.resolveScript({
                        scriptId: 'customscript_r7_isabel_opp_move_sl',
                        deploymentId: 'customdeploy_r7_isabel_opp_move_sl',
                        params: {
                            oppId: oppId,
                            custscriptr7_default_salesrep: DEFAULT_SALESREP,
                            custscript_r7_default_presalesrep: DEFAULT_PRESALESREP
                        }
                    });
                    document.body.style.cursor = 'wait'
                    window.location.assign(suiteletURL)
                }
            }

            function failure(reason) {
                console.log('Failure: ' + reason)
            }

            dialog.confirm(options).then(success).catch(failure)
        }

        // noinspection JSUnusedGlobalSymbols
        return {
            closeWindow: closeWindow,
            popUpWindow: popUpWindow,
            replaceWindow: replaceWindow,
            upgradeOppToIVM: upgradeOppToIVM,
            r7_upgradeOpportunity: r7_upgradeOpportunity,
            redirectToRenewalSuitelet,redirectToRenewalSuitelet,
            migrateToIntSub: migrateToIntSub
        };
    });
