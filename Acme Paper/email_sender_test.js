/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/record", "N/encode"], function (record, encode) {

    function onRequest(context) {
        var decodedEDI850FileContents = encode.convert({
            string: 'ISA~00~          ~00~          ~12~4107922333     ~12~9549671150     ~240726~1602~U~00401~000000001~0~T~>|GS~IN~4107922333~9549671150~20240726~1602~000000001~X~004010|ST~810~0001|BIG~20240726~INV164741~20240628~25357529X1~~~DI|N1~ST~FLOYD DELONG AND SON EXCAVATING|N2~KAYLA DELONG|N3~1295 MORRIS RD|N4~LAPEER~MI~48446~US|N1~BT~Restockit New LLC|N3~6750 N Andrews Ave|N4~Ft Lauderdale~FL~33309~US|DTM~011~20240726|IT1~1~10~EA~12.77~~VC~1169257|PID~F~~~~SOFPULL® CENTERPULL JUNIOR PAPER TOWEL DISPENSER BY GP PRO (GEORGIA-PACIFIC), B|TDS~12770~12770|CTT~1|SE~15~0001|GE~1~000000001|IEA~1~000000001',
            inputEncoding: encode.Encoding.BASE_64,
            outputEncoding: encode.Encoding.UTF_8
        });
        log.debug('decodedEDI850FileContents', decodedEDI850FileContents);
    }

    return {
        onRequest: onRequest
    }
});
