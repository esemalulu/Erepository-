/*
 * Copyright (c) 2021. Coupa Software.
 */
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 *
 */
/*******************************************************************************
 *
 * Name: Yogesh Jagdale
 *
 * Script Type: Custom Module
 *
 * Description: Custom Module for 2.1 Scripts to return Access Token for OpenIDConnect Client. Request for Bearer Token before making API call
 *
 ********************************************************************************/
define(['N/https', 'N/runtime', 'N/url', 'N/config'],
    /**
     * @param{https} https
     * @param{runtime} runtime
     */
    function (https, runtime, url, config) {

        /**
         * This function returns API header if clientURL, clientID & clientSecret for the OIDC connection are set by going to Setup > Company > General Preferences > Custom Preferences.
         * @param contentType
         * @param URL
         * @param scope
         * @param clientID
         * @param clientSecret
         * @return {null|{Authorization: string, Accept: string}}
         */
        function getAPIHeader(contentType, scope) {
            var clientURL = runtime.getCurrentScript().getParameter({
                name: 'custscript_coupa_oidc_client_url'
            });
            var clientID = clientID ? clientID : runtime.getCurrentScript().getParameter({
                name: 'custscript_coupa_oidc_client_id'
            });
            var clientSecret = clientSecret ? clientSecret : runtime.getCurrentScript().getParameter({
                name: 'custscript_coupa_oidc_client_secret'
            });
            var configRecObj = config.load({
                type: config.Type.COMPANY_INFORMATION
            });
            var companyURL = configRecObj.getValue('appurl');
            var preferenceURL = url.resolveTaskLink('ADMI_GENERAL');
            if (clientURL && clientID && clientSecret) {
                var accessToken = getBearerToken(clientURL, scope, clientID, clientSecret);
                if (accessToken) {
                    contentType = contentType ? contentType : 'application/json';
                    var header = {
                        'Accept': contentType,
                        'Authorization': "bearer " + accessToken
                    }
                } else {
                    log.audit('DEPRECATION_WARNING', 'Coupa will eventually deprecate legacy API Keys and require the use of OpenID Connect (OIDC), first starting with new customer implementations, and eventually for all customers. This will be a gradual process and require you to upgrade your API integrations to OIDC. For more details refer https://success.coupa.com/Integrate/ERP_Playbooks');
                    log.audit('OpenID Connect (OIDC) Configuration Instructions', 'You can set the OIDC configuration parameters by going to Setup > Company > General Preferences > Custom Preferences or visit ' + companyURL + preferenceURL + '. These are Company level Parameters that will be available for all the Coupa Scripts.');
                    return null;
                }
                return header;
            } else {
                log.audit('DEPRECATION_WARNING', 'Coupa will eventually deprecate legacy API Keys and require the use of OpenID Connect (OIDC), first starting with new customer implementations, and eventually for all customers. This will be a gradual process and require you to upgrade your API integrations to OIDC. For more details refer https://success.coupa.com/Integrate/ERP_Playbooks');
                log.audit('OpenID Connect (OIDC) Configuration Instructions', 'You can set the OIDC configuration parameters by going to Setup > Company > General Preferences > Custom Preferences or visit ' + companyURL + preferenceURL + '. These are Company level Parameters that will be available for all the Coupa Scripts.');
                return null;
            }
        }

        /**
         *
         * @param URL
         * @param scope
         * @param clientID
         * @param clientSecret
         * @return {string|*}
         */
        function getBearerToken(clientURL, scope, clientID, clientSecret) {
            var bundleID = runtime.getCurrentScript().bundleIds[0];
            var OIDC_SCOPES = "";
            switch (bundleID) {
                case '84306':
                    //Scopes for P2P Bundle
                    OIDC_SCOPES = "core.invoice.read core.invoice.write core.payables.invoice.read core.payables.invoice.write core.supplier.read core.supplier.write core.common.read core.common.write core.expense.read core.expense.write core.pay.payments.read core.pay.payments.write core.pay.virtual_cards.read core.pay.virtual_cards.write";
                    break;
                case '72208':
                    //Scopes for P2O Bundle
                    OIDC_SCOPES = "core.pay.virtual_cards.read core.pay.virtual_cards.write core.purchase_order.read core.purchase_order.write core.inventory.receiving.read core.inventory.receiving.write core.supplier.read core.supplier.write core.common.read core.common.write";
                    break;
                default:
                    //Scopes for unbundled scripts(P2O & P2P)
                    OIDC_SCOPES = "core.invoice.read core.invoice.write core.payables.invoice.read core.payables.invoice.write core.supplier.read core.supplier.write core.common.read core.common.write core.expense.read core.expense.write core.pay.payments.read core.pay.payments.write core.pay.virtual_cards.read core.pay.virtual_cards.write core.purchase_order.read core.purchase_order.write core.inventory.receiving.read core.inventory.receiving.write";
                    break;
            }
            log.debug({
                title: "Bundle ID: ",
                details: bundleID
            });

            try {

                if (clientURL && clientID && clientSecret) {
                    scope = scope ? scope : OIDC_SCOPES;
                    var response = https.post({
                        url: clientURL + '/oauth2/token',
                        body: {
                            grant_type: 'client_credentials',
                            client_id: clientID,
                            client_secret: clientSecret,
                            scope: scope
                        },
                        headers: {
                            'content-type': 'application/x-www-form-urlencoded'
                        },
                    });
                    if (response && response.code == 200) {
                        log.debug("Successfully generated bearer token: response.code = ", response.code);
                        response = JSON.parse(response.body);
                        return response.access_token;
                    } else {
                        log.debug("Error while generating bearer token: ", response);
                        log.error("Error while generating bearer token: ", JSON.parse(response.body));
                    }
                } else {
                    log.debug('Incorrect Parameters', 'Base URL: ' + clientURL + ' clientID: ' + clientID + ' clientSecret: ' + clientSecret + ' scope: ' + scope);
                    return null;
                }
            } catch (e) {
                log.debug(JSON.stringify(e));
                log.error(JSON.stringify(e.message));
                return null;
            }
        }

        return {
            getAPIHeader: getAPIHeader,
            getBearerToken: getBearerToken
        };

    });