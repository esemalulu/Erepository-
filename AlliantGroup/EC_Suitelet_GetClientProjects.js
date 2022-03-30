// EC_SharedLibrary_Common_AlliantGroup.js

function getProjects(clientId) {

    var filters = new Array();
    filters.push(new nlobjSearchFilter('parent', null, 'is', clientId));
    filters.push(new nlobjSearchFilter('custentity_billinginprogress',null,'is','F'));
    var columns = new Array();
    columns.push(new nlobjSearchColumn('entityid'));
    columns.push(new nlobjSearchColumn('companyname'));

    var r = nlapiSearchRecord('job', null, filters, columns);

    if (r && r.length > 0) {
        for (var i = 0; i < r.length; i++) {
            var p = new project();
            p.id = r[i].getId();
            p.name = r[i].getValue('entityid') + ' ' + r[i].getValue('companyname');
            projects.push(p);
        }
        return projects;
    }
    return [];
}

function onStart(request, response) {

    try {

        nlapiLogExecution('DEBUG', 'HTTP Method', request.getMethod());

        if (request.getMethod() == "GET") {

            var params = request.getAllParameters();
            for (param in params)
                nlapiLogExecution('DEBUG', 'parameter:value', param + ':' + params[param]);

            var clientId = request.getParameter('clientid');

            if (!clientId)
                throw 'ERROR - Missing URL Parameter, clientId';

            var output = new Object();
            output.projects = getProjects(clientId);

            var outputJSONString = JSON.stringify(output);
            nlapiLogExecution('DEBUG', 'output', outputJSONString);

            response.write(outputJSONString);
        }
    }

    catch (e) {

        throw e;

        //var msg = Logger.FormatException(e);
        //Logger.Write(Logger.LogType.Error, "onStart()", msg);
        //catchErrors(e, "onStart()", "Suitelet_nondiscriminationTest_renewal.js");
    }
}