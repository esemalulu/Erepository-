/// <reference path="netsuiteAPI.js" />
/// <reference path="_nsiLibrary.js" />

function updateLicenseActivations(type)
{
    // Ensure we are running in scheduled mode...
    var scriptStartTime = new Date();
    if (type != 'scheduled' && type != 'skipped' && type != 'userinterface') return;
    
    // Set up recommended operating constraints.
    getRemainingUsage(); // Make context acquisition part of startup costs...
    var scriptShouldStopTime = new Date();
    scriptShouldStopTime.addSeconds((MAX_SCHED_EXECUTION_SECONDS * .9) | 0);
    var scriptMinRemainingUsage = (MAX_SCHED_USAGE_UNITS * .05) | 0;
    nlapiLogExecution('AUDIT', 'updateLicenseActivation Starting', 
        'Scheduled script starting run at ' + scriptStartTime + '\n' +
        ' * Should end at ' + scriptShouldStopTime + ' or with ' + scriptMinRemainingUsage + ' execution units remaing.');

    var searchResults = nlapiSearchRecord('customrecord_licenses', 'customsearch_activatedlicenses', null);

    var lastDate = '09/08/2008';
    if (searchResults != null)
    {
        lastDate = searchResults[0].getValue('custrecord_licensedactivateddate');
    }

    var activations = getActivations(lastDate);
    var nbrActivations = activations.length;
    var record = null;
    
    var currentUsage = getRemainingUsage();
    var lastUsage = currentUsage;
    var nbrProcessed = 0;
    var nbrNoMatch = 0;
    nlapiLogExecution('DEBUG', 'updateLicenseActivation Usage', currentUsage + ' execution units remaing.');
    for (var i = 0; i < nbrActivations; i++)
    {
        searchResults = nlapiSearchRecord('customrecord_licenses', null, new nlobjSearchFilter('custrecord_serialnumber', null, 'is', activations[i].serialNumber));
        if (searchResults != null)
        {
            nlapiLogExecution('AUDIT', 'updateLicenseActivation', 'Updating activation information for \'' + activations[i].serialNumber + '\'.');
            record = nlapiLoadRecord('customrecord_licenses', searchResults[0].getId());
            record.setFieldValue('custrecord_machineid', activations[i].lastMachineId);
            record.setFieldValue('custrecord_licensedactivateddate', nlapiDateToString(activations[i].lastActivationDate));
            record.setFieldValue('custrecord_activationcode', activations[i].lastActivationCode);
            record.setFieldValue('custrecord_license_activationcount', activations[i].activationCount);
            nlapiSubmitRecord(record, false);
            nbrProcessed++;
        }
        else
        {
            nbrNoMatch++;
        }

        currentUsage = getRemainingUsage();
        nlapiLogExecution('DEBUG', 'updateLicenseActivation Usage', (lastUsage - currentUsage) + ' execution units used in loop; ' + currentUsage + ' execution units remaing.');
        lastUsage = currentUsage;
        
        if (currentUsage <= scriptMinRemainingUsage)
        {
            nlapiLogExecution('ERROR', 'updateLicenseActivation Usage Exceeding Margin', 'Script ending due to execution unit constraints...\n' + 
                                        currentUsage + ' execution units remaing.');
            break;
        }
        if (new Date() >= scriptShouldStopTime)
        {
            nlapiLogExecution('DEBUG', 'updateLicenseActivation Time Exceeding Margin', 'Script ending due to execution time constraints...\n' +
                                        currentUsage + ' execution units remaing.');
            break;
        }
    }

    nlapiLogExecution('AUDIT', 'updateLicenseActivation Ending', 'Scheduled script ending run at ' + new Date() + ' with ' + getRemainingUsage() + ' execution units remaing.\n' +
                                                                 nbrActivations + ' activations received.\n' +
                                                                 nbrNoMatch + ' not matched.\n' +
                                                                 nbrProcessed + ' licenses updated.\n' +
                                                                 (nbrActivations - (nbrProcessed + nbrNoMatch)) + ' remaining.');
}