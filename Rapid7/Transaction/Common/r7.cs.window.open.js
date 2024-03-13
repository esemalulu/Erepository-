/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([],

function() {
    function pageInit(context) {}

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

    // noinspection JSUnusedGlobalSymbols
    return {
        pageInit: pageInit,
        closeWindow: closeWindow,
        popUpWindow: popUpWindow,
        replaceWindow: replaceWindow
    };
    
});