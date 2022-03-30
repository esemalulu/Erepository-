/**
* @NApiVersion 2.x
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/
define(['N/https'],

function(https)
{
    function execute(scriptContext)
    {
        var endPoint = 'http://my.nalpeiron.com/shaferws.asmx/GetProduct';

        var headers = {};
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        headers['Cache-Control'] = 'no-cache';

        var body =
        {
            'Auth':'<auth><username>test</username><password>abc</password><customerid>4875</customerid></auth>',
            'Data':'<data><productid>8562300100</productid></data>'
        };

        var response = https.post({
            url : endPoint,
            headers : headers,
            body : body
        });

        log.debug(response.body);

        var xmlDoc = xml.Parser.fromString({ text : response.body});


    }

    return {
        execute: execute
    };

});
