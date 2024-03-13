// noinspection JSCheckFunctionSignatures,JSUnusedGlobalSymbols

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/https',
    'N/log',
    'N/url',
    'N/currentRecord',
    '../../Common/r7.recalculate.tax'
], function (https, log, url, currentRecord, recalculateTax) {
    function validateOrder() {
        // Add comment to force re-deploy
        document.getElementById('custpage_validateorder').value = 'Validating...';

        const transaction = currentRecord.get();
        const orderId = transaction.id;
        const orderType = transaction.type;

        const numRandom = Math.floor(Math.random() * 9999999);
        const suiteletURL = url.resolveScript({
            scriptId: 'customscriptr7ordervalidation_suitelet',
            deploymentId: 'customdeployr7ordervalidation_suitelet',
            params: {
                'custparam_salesorder': orderId,
                'custparam_ordertype': orderType,
                'custparam_random': numRandom
            }
        });

        log.debug({ title: 'suiteletURL', details: suiteletURL });
        const response = https.get({ url: suiteletURL });
        const responseBody = response.body;

        if (responseBody.indexOf('Validated') !== -1) {
            document.getElementById('tbl_custpage_validateorder').style.display = 'none';
            document.getElementById('tbl_custpage_associateitems_acr').style.display = 'none';
            alert(responseBody);
        }

        else {
            if (responseBody.indexOf('Please confirm') !== -1) {
                var conf = confirm(responseBody);
                if (conf) {
                    document.getElementById('tbl_custpage_validateorder').style.display = 'none';
                    document.getElementById('tbl_custpage_associateitems_acr').style.display = 'none';
                    validateNow();
                    return;
                }
            }
            else {
                alert(responseBody);
            }
            document.getElementById('custpage_validateorder').value = 'Validate Order';
        }
    }

    function unValidateOrder() {
        document.getElementById('custpage_unvalidateorder').value = 'Un-validating...';

        const transaction = currentRecord.get();
        const orderId = transaction.id;
        const orderType = transaction.type;
        const numRandom = Math.floor(Math.random() * 9999999);

        const suiteletURL = url.resolveScript({
            scriptId: 'customscriptr7ordervalidation_suitelet',
            deploymentId: 'customdeployr7ordervalidation_suitelet',
            params: {
                'custparam_salesorder': orderId,
                'custparam_ordertype': orderType,
                'custparam_action': 'unvalidate',
                'custparam_random': numRandom
            }
        });

        https.get({ url: suiteletURL });
        alert('Un-validated');
        window.location.reload();
    }

    function validateNow() {
        const transaction = currentRecord.get();
        const orderId = transaction.id;
        const orderType = transaction.type;
        const numRandom = Math.floor(Math.random() * 9999999);

        const suiteletURL = url.resolveScript({
            scriptId: 'customscriptr7ordervalidation_suitelet',
            deploymentId: 'customdeployr7ordervalidation_suitelet',
            params: {
                'custparam_salesorder': orderId,
                'custparam_ordertype': orderType,
                'custparam_action': 'validate',
                'custparam_random': numRandom
            }
        });

        https.get({ url: suiteletURL });
        alert('Validated');
        window.location.reload();    }

    function removeContract() {
        const salesOrderId = currentRecord.get().id;
        const question = confirm('Are you sure you want to delete all contracts tied to this sales order?');
        if (question) {
            const suiteletURL = url.resolveScript({
                scriptId: 'customscript_remove_contract_suitelet',
                deploymentId: 'customdeploy_remove_contract_suitelet',
                params: {
                    'custparam_salesorder': salesOrderId
                }
            });

            https.get({ url: suiteletURL });
            location.reload();
        }
    }

    function popUpWindow(url, width, height){
        var params = '';

        if (width != null && width !== '' && height != null && height !== '') {
            // var left = (screen.width - width) / 2;
            // var top = (screen.height - height) / 2;
            params += 'width=' + width + ', height=' + height;
            params += ', menubar=no';
            params += ', status=no';
        }

        const newwin = window.open(url, null, params);

        if (window.focus) {
            newwin.focus();
        }
        return false;
    }

    function replaceWindow(url){

        window.location = url;

        return false;
    }

    return {
        validateOrder,
        unValidateOrder,
        validateNow,
        removeContract,
        popUpWindow,
        replaceWindow,
        recalculateTax
    };
});