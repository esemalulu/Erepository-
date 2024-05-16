/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/record", "N/email"], function (record, email) {

    function onRequest(context) {
        var thisemail =email.send({
            author: '85394',
            body: 'Test',
            recipients: 'fernando.i@suitedb.com',
            subject: 'Test'
        })
        log.debug('Email sent', thisemail);
    }

    return {
        onRequest: onRequest
    }
});
