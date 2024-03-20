/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/query', 'N/search'],
function (query, search) {
    function dopost(requestBody) {

        try {
            var returnObj={};
            log.debug('input paramters', requestBody);
            let inputparams = requestBody.params;

            const mapResultsToColumns = (result, columns) => {
                let resultObj = {}
                for (columnIndex in columns) {
                    resultObj[columns[columnIndex]] = result.values[columnIndex]
                }
                return resultObj
            }

            let entereditem=inputparams.itemName;
            let preferredBin=inputparams.prefredbinText;
            let preferedbinid=inputparams.prefredbinId;


const itemCols=[
"itemid",
"id",
"itemtype",
"unitstype",
"islotitem"
]

const itemDetailsQuery = query.runSuiteQL({
    query: `SELECT 
${itemCols}
FROM item
WHERE itemid = `+"'" + entereditem + "'"+"OR upccode = '"+entereditem+"'"
})


const itemDetailsQueryResults = itemDetailsQuery.results.map(result => mapResultsToColumns(result, itemCols));

log.debug('results',itemDetailsQueryResults.length);
if(itemDetailsQueryResults.length>0)

{
   
    returnObj.isValid=true;
    returnObj.itemName=itemDetailsQueryResults[0].itemid;
    returnObj.itemInternalId=itemDetailsQueryResults[0].id;
    returnObj.unitType=itemDetailsQueryResults[0].unitstype;

    if(itemDetailsQueryResults[0].itemtype==='InvtPart' && itemDetailsQueryResults[0].islotitem==='T')
    returnObj.itemType="lotnumberedinventoryitem";

    else if(itemDetailsQueryResults[0].itemtype==='InvtPart' )
        returnObj.itemType="inventoryitem";

    returnObj.toBinName=preferredBin;
    returnObj.toBinId=preferedbinid;
    
}
else
{
    returnObj.isValid=false;
    returnObj.errorMessage="The entered Item is not valid"

}

return returnObj;
    }
catch(e)
{
log.error('error', e);
}


    }

    return {
        post: dopost
    }
});