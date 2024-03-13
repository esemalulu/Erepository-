/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/url'], function (log, url) {
    function openCreateLicenseWindow() {
        const customerId = window.employeeCenterCustomerId;

        if (!customerId) {
            alert('Unable to determine customer ID.');
        }

        const createLicenseUrl = url.resolveScript({
            scriptId: 'customscriptr7createlicensefromtemplate',
            deploymentId: 'customdeployr7createlicensefromtemplate',
            params: {
                custparam_customer: customerId
            }
        });

        popUpWindow(createLicenseUrl, 500, 500);
    }

    // noinspection DuplicatedCode
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

    return {
        openCreateLicenseWindow,
        popUpWindow
    };
});