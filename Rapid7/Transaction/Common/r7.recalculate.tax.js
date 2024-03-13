/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/https', 'N/url'], function (currentRecord, https, url) {
    function recalculateTax() {
        setButtonBusy();

        const { type, id } = currentRecord.get();
        const internalRestletUrl = url.resolveScript({
            scriptId: 'customscript_r7_internal_restlet',
            deploymentId: 'customdeploy_r7_internal_restlet'
        });

        https.post.promise({
            url: internalRestletUrl,
            body: { restletFunction: 'recalculateTax', type, id }
        }).then(response => {
            const responseBody = JSON.parse(response.body);

            if (responseBody.result?.isSuccess) {
                window.location.reload();
            } else {
                setButtonIdle();
                alert(`Error recalculating tax: ${responseBody.result?.error}`);
            }
        }).catch(error => {
            setButtonIdle();
            alert(`Error recalculating tax: ${error}`);
        });

        function setButtonBusy() {
            // noinspection JSCheckFunctionSignatures
            const button = document.getElementById('custpage_recalculate_tax');

            document.body.style.cursor = 'wait';
            button.value = 'Recalculating...';
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.5';
            button.disabled = true;

            setTimeout(() => {}, 0);
        }

        function setButtonIdle() {
            // noinspection JSCheckFunctionSignatures
            const button = document.getElementById('custpage_recalculate_tax');

            document.body.style.cursor = 'normal';
            button.value = 'Recalculate Tax';
            button.style.cursor = 'normal';
            button.style.opacity = '1';
            button.disabled = false;

            setTimeout(() => {}, 0);
        }
    }

    return recalculateTax;
});