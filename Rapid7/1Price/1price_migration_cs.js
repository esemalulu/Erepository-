/*
 * @author lweyrauch
 */

function migrateToOnePrice() {

    //document.getElementById('custpage_onepricemigration').value = 'Migrating...';

    var migrationSuiteletUrl = nlapiResolveURL('SUITELET', 'customscript_oneprice_migration_suitelet', 'customdeploy_oneprice_migration_suitelet', null) + '&sointid=' + nlapiGetRecordId() + '&soaction=migrate-to-oneprice';
    nlapiLogExecution('DEBUG', 'migrationSuiteletUrl', migrationSuiteletUrl);

    var response = nlapiRequestURL(migrationSuiteletUrl);
    var responseBody = response.getBody();
    alert(responseBody);
}
