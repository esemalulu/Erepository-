/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */

 define(["N/url", "N/record"], function (url, record) {
    const SCRIPT = "customscript_acc_sl_omnitracs_send_order";
    const DEPLOYMENT = "customdeploy_acc_sl_omnitracs_send_order";

    function pageInit() {
    }

    function returnHome() {
        document.location = url.resolveScript({
            scriptId: SCRIPT,
            deploymentId: DEPLOYMENT,
            returnExternalUrl: false,
        });
    }

    function goBack() {
        window.history.back();
    }

    function receiveOrders() {
        debugger;
        var statusReceivedRoutes = document.getElementsByName("inpt_custpage_routes_status")[0]?.value || -1;
        // var username = document.getElementsByName("custpage_username")[0]?.value || -1;
        // var password = document.getElementsByName("custpage_password")[0]?.value || -1;
        // var loginurl = document.getElementsByName("custpage_loginurl")[0]?.value || -1;
        // var routeurl = document.getElementsByName("custpage_routeurl")[0]?.value || -1;
        var debug = document.getElementsByName("custpage_enviroment")[0]?.value || -1;
        var environment = record.load({
            type: "customrecord_sdb_enviroments",
            id: debug,
        }); 
        var username = environment.getValue({ fieldId: "custrecord_sdb_username"}) || -1;
        var password = environment.getValue({ fieldId: "custrecord_sdb_password"}) || -1;
        var loginurl = environment.getValue({ fieldId: "custrecord_sdb_loginurl"}) || -1;
        var routeurl = environment.getValue({ fieldId: "custrecord_sdb_recive"}) || -1;
        
        document.location = url.resolveScript({
            scriptId: SCRIPT,
            deploymentId: DEPLOYMENT,
            returnExternalUrl: false,
            params: {
                receiveOrders: true, routesStatus: statusReceivedRoutes,
                custpage_username: username, custpage_password: password,
                custpage_loginurl: loginurl, custpage_routeurl: routeurl,
            }
        });
    }

    return {
        pageInit: pageInit,
        returnHome: returnHome,
        goBack: goBack,
        receiveOrders: receiveOrders
    };
});