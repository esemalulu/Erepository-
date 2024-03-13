/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 * @module 
 * @description 
 */
define(['N/search', 'N/record'], function(search, record) {

    /**
     * @function getInputData
     * @description description
     *
     * @public
     * @return {type} Description
     * @param  {Object} inputContext description
     */
    function getInputData(inputContext) {

        return search.create({
            type: "item",
            filters:
            [
               ["isinactive","is","F"]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}),
               search.createColumn({name: "type", label: "Type"}),
               search.createColumn({name: "isfulfillable", label: "Can be Fulfilled"})
            ]
         });
    }

    /**
     * @function map
     * @description description
     *
     * @public
     * @param  {Object} mapContext description
     */
    function map(mapContext) {
        log.debug('[map] mapContext for key '+mapContext.key, mapContext.value);
        var acceptedItemType = ['inventoryitem', 'noninventoryitem', 'serviceitem', 'kititem'];
        var thisSearchResult = JSON.parse(mapContext.value);
        var thisSearchResultValues = thisSearchResult.values;
        var searchItemTypeVal = thisSearchResultValues.type.value;
        var itemTypeIntId = "";
        switch(searchItemTypeVal){
            case "Description":
                itemTypeIntId = "descriptionitem";
                break;
            case "Discount":
                itemTypeIntId = "discountitem";
                break;
            case "Group":
                itemTypeIntId = "itemgroup";
                break;
            case "InvPart":
                itemTypeIntId = "inventoryitem";
                break;
            case "Kit":
                itemTypeIntId = "kititem";
                break;
            case "NonInvPart":
                itemTypeIntId = "noninventoryitem";
                break;
            case "Service":
                itemTypeIntId = "serviceitem";
                break;
            default:
                itemTypeIntId = "";
        }
        if(acceptedItemType.indexOf(itemTypeIntId) !== -1){
            record.submitFields({
                type: itemTypeIntId,
                id: mapContext.key,
                values: {
                    isfulfillable : true
                }
            });
            log.audit("Item record updated to fulfillable.", "Key : "+mapContext.key);
        }
    }
    
    /**
     * @function summarize
     * @description description
     *
     * @public
     * @param  {Object} summaryContext description
     */
    function summarize(summaryContext) {
        var type = summaryContext.toString();
        log.audit(type + ' Usage Consumed', summaryContext.usage);
        log.audit(type + ' Concurrency Number ', summaryContext.concurrency);
        log.audit(type + ' Number of Yields', summaryContext.yields);
    }

    return {
        getInputData : getInputData,
        map : map,
        summarize : summarize
    };
});