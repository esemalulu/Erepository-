/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/ui/dialog', 'N/currentRecord', 'N/https', 'N/url', '../../../Common/r7.recalculate.tax'],

    function(dialog, currentRecord, https, url, recalculateTax) {
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

        function migrateToOnePrice() {
            //document.getElementById('custpage_onepricemigration').value = 'Migrating...';
            let orderId = currentRecord.get().id;
            let migrationSuiteletUrl = url.resolveScript({
                scriptId: 'customscript_oneprice_migration_suitelet',
                deploymentId: 'customdeploy_oneprice_migration_suitelet',
                params: {
                    sointid: orderId,
                    soaction: 'migrate-to-oneprice'
                },
                returnExternalUrl: false
            });
            console.log('migrationSuiteletUrl'+  migrationSuiteletUrl);

            // noinspection JSCheckFunctionSignatures
            let response = https.get({url: migrationSuiteletUrl})
            let responseBody = response.body;
            // noinspection JSIgnoredPromiseFromCall
            dialog.alert({title: 'Alert', message: responseBody})
        }

        function validateOrder(){
            // noinspection JSCheckFunctionSignatures
            document.getElementById('custpage_validateorder').value = 'Validating...';
            let orderId = currentRecord.get().id;
            let orderType = currentRecord.get().type;
            let numRandom = Math.floor(Math.random() * 9999999);
            let suiteletURL = url.resolveScript({
                scriptId: 'customscriptr7ordervalidation_suitelet',
                deploymentId: 'customdeployr7ordervalidation_suitelet',
                params: {
                    custparam_salesorder: orderId,
                    custparam_ordertype: orderType,
                    custparam_random: numRandom
                },
                returnExternalUrl: false
            });
            console.log('suiteletURL'+  suiteletURL);

            // noinspection JSCheckFunctionSignatures
            let response = https.get({url: suiteletURL})
            let responseBody = response.body;

            if (responseBody.indexOf('Validated') !== -1) {
                // noinspection JSCheckFunctionSignatures
                document.getElementById('tbl_custpage_validateorder').style.display = 'none';
                // noinspection JSCheckFunctionSignatures
                document.getElementById('tbl_custpage_associateitems_acr').style.display = 'none';
                // noinspection JSIgnoredPromiseFromCall
                dialog.alert({title: 'Alert', message: responseBody})
            }
            else {
                if (responseBody.indexOf('Please confirm') !== -1) {
                    let options = {
                        title: 'Confirmation',
                        message: responseBody
                    };
                    function success(result) {
                        console.log('Success with value ' + result);
                        if (result === true) {
                            // noinspection JSCheckFunctionSignatures
                            document.getElementById('tbl_custpage_validateorder').style.display = 'none';
                            // noinspection JSCheckFunctionSignatures
                            document.getElementById('tbl_custpage_associateitems_acr').style.display = 'none';
                            validateNow();
                            // noinspection UnnecessaryReturnStatementJS
                            return;
                        }
                    }

                    function failure(reason) {
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: responseBody})
                    }
                    dialog.confirm(options).then(success).catch(failure);
                }
                else {
                    // noinspection JSIgnoredPromiseFromCall
                    dialog.alert({title: 'Alert', message: responseBody})
                }
                // noinspection JSCheckFunctionSignatures
                document.getElementById('custpage_validateorder').value = 'Validate Order';
            }
        }

        function unValidateOrder(){
            // noinspection JSCheckFunctionSignatures
            document.getElementById('custpage_unvalidateorder').value = 'Un-validating...';
            let orderId = currentRecord.get().id;
            let orderType = currentRecord.get().type;
            let numRandom = Math.floor(Math.random() * 9999999);
            let suiteletURL = url.resolveScript({
                scriptId: 'customscriptr7ordervalidation_suitelet',
                deploymentId: 'customdeployr7ordervalidation_suitelet',
                params: {
                    custparam_salesorder: orderId,
                    custparam_ordertype: orderType,
                    custparam_action : 'unvalidate',
                    custparam_random: numRandom
                },
                returnExternalUrl: false
            });

            // noinspection JSCheckFunctionSignatures
            https.get({url: suiteletURL})
            // noinspection JSIgnoredPromiseFromCall
            dialog.alert({title: 'Alert', message: 'Un-validated'});
            window.location.reload();
        }

        function validateNow(){
            let orderId = currentRecord.get().id;
            let orderType = currentRecord.get().type;
            let numRandom = Math.floor(Math.random() * 9999999);
            let suiteletURL = url.resolveScript({
                scriptId: 'customscriptr7ordervalidation_suitelet',
                deploymentId: 'customdeployr7ordervalidation_suitelet',
                params: {
                    custparam_salesorder: orderId,
                    custparam_ordertype: orderType,
                    custparam_action : 'validate',
                    custparam_random: numRandom
                },
                returnExternalUrl: false
            });

            // noinspection JSCheckFunctionSignatures
            https.get({url: suiteletURL})
            // noinspection JSIgnoredPromiseFromCall
            dialog.alert({title: 'Alert', message: 'Validated'});
            window.location.reload();
        }

        function removeContract() {
            let salesOrderId = currentRecord.get().id;
            let options = {
                title: 'Confirmation',
                message: 'Are you sure you want to delete all contracts tied to this sales order?'
            };
            function success(result) {
                console.log('Success with value ' + result);
                if (result === true) {
                    // noinspection JSCheckFunctionSignatures
                    let suiteletURL = url.resolveScript({
                        scriptId: 'customscript_remove_contract_suitelet',
                        deploymentId: 'customdeploy_remove_contract_suitelet',
                        params: {
                            custparam_salesorder: salesOrderId
                        }
                    });
                    // noinspection JSCheckFunctionSignatures
                    https.get({url: suiteletURL})
                    window.location.reload();
                }
            }

            function failure(reason) {
                console.log('Failure: ' + reason);
            }
            dialog.confirm(options).then(success).catch(failure);
        }

        function processNexposeItems(){
            let orderId = currentRecord.get().id;
            // noinspection JSCheckFunctionSignatures
            let suiteletURL = url.resolveScript({
                scriptId: 'customscriptnexpose_to_ivm_update',
                deploymentId: 'customdeploynexpose_to_ivm_update',
                params: {
                    custscript_salesorder: orderId
                }
            });

            let options = {
                title: 'Confirmation',
                message: 'Please confirm, you want to replace Nexpose items to IVM?'
            };

            function success(result) {
                console.log('Success with value ' + result);
                if (result === true) {
                    // noinspection JSIgnoredPromiseFromCall
                    dialog.alert({title: 'Alert', message: 'Submitted items, this could take some time...'});
                    // noinspection JSCheckFunctionSignatures
                    let response = https.get({url: suiteletURL})
                    let responseBody = response.body;
                    if(responseBody==='SO Updated'){
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: 'Items are updated, reloading transaction...'});
                        window.location.reload();
                    }else if(responseBody==='no_items'){
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: 'There are no items to update'});
                    }else{
                        // noinspection JSIgnoredPromiseFromCall
                        dialog.alert({title: 'Alert', message: responseBody});
                    }
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

        // noinspection JSUnusedGlobalSymbols
        return {
            closeWindow: closeWindow,
            popUpWindow: popUpWindow,
            replaceWindow: replaceWindow,
            migrateToOnePrice: migrateToOnePrice,
            validateOrder: validateOrder,
            unValidateOrder: unValidateOrder,
            validateNow: validateNow,
            removeContract: removeContract,
            processNexposeItems: processNexposeItems,
            redirectToRenewalSuitelet: redirectToRenewalSuitelet,
            recalculateTax: recalculateTax
        };

    });