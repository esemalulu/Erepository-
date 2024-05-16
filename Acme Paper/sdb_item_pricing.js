/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/record","N/url","N/https","N/ui/message","N/runtime","N/currentRecord"], function (record,url,https,message,runtime,currentRecord) {
    var itemLineCount;
    var itemsOnSublist=[];
    var itemsToRemoveOnCustomer = [];
    function pageInit(ctx) {
        try {
            var currentRecord = ctx.currentRecord
            itemLineCount = ctx.currentRecord.getLineCount('custpage_sublist');
            window.onbeforeunload=function(){
                return
            }
            for (let i = 0; i < itemLineCount; i++) {
                var itemId = currentRecord.getSublistValue({
                    sublistId: 'custpage_sublist',
                    fieldId: 'custpage_col_item',
                    line: i
                })
                itemsOnSublist.push(itemId)         
            }
            var saveButton = document.getElementById('custpage_save');
            if(saveButton)saveButton.addEventListener('click',editCustomer)
            var removeButton = document.getElementById('tbl_custpage_sublist_remove')
            if (removeButton) removeButton.addEventListener('click',()=>{getRemovedLine(currentRecord)})
            var sortButton = document.getElementById('custpage_sort')
            if (sortButton) sortButton.addEventListener('click',()=>{sortSublist(currentRecord)})
        } catch (error) {
            console.log('pageInit ERROR: ' + error)   
        }
     }
    
    

    function redirectToSuitelet(customerId){
        try {
            sessionStorage.setItem("customerId", customerId);

            let suiteletURL = url.resolveScript({
                scriptId: 'customscript_sdb_customer_edit_item_pric',
                deploymentId: 'customdeploy_sdb_customer_edit_item_pric',
                returnExternalUrl: false,
                params:{
                    custom_param_customer : customerId
                },
            })
            window.open(suiteletURL,"_self")

        } catch (error) {
          console.log('redirectToSuitelet ERROR' + error)   
        }
    }
    var newItemsPricingLines = []; 
    function fieldChanged(context){
        try {
            var record = context.currentRecord;
                var customer = record.getCurrentSublistValue({
                    sublistId: 'custpage_sublist',
                    fieldId: 'custpage_col_customer',
                    line:context.line
                });
                if(!customer){

                    var lineForm= record.selectLine({
                        sublistId: 'custpage_sublist',
                        line: context.line
                    });
                    record.setCurrentSublistValue({
                    sublistId: 'custpage_sublist',
                    fieldId: 'custpage_col_customer',
                    value: sessionStorage.getItem("customerId")
                });
                }
                var item = record.getCurrentSublistValue({
                    sublistId: 'custpage_sublist',
                    fieldId: 'custpage_col_item',
                    line:context.line
                });
                var priceLevel = record.getCurrentSublistValue({
                    sublistId: 'custpage_sublist',
                    fieldId: 'custpage_col_price_level',
                    line:context.line
                });
                var currentSell = record.getCurrentSublistValue({
                    sublistId: 'custpage_sublist',
                    fieldId: 'custpage_col_current_sell',
                    line:context.line
                });

                var newItemPriceObj={
                    item:item,
                    priceLevel:priceLevel,
                    currentsell:currentSell
                }
                if(newItemPriceObj.item && newItemPriceObj.priceLevel){
                    var objExists = newItemsPricingLines.findIndex(obj => obj.item==newItemPriceObj.item);
                    if(objExists>=0)newItemsPricingLines[objExists]=newItemPriceObj;
                    if(objExists==-1){
                        newItemsPricingLines.push(newItemPriceObj)
                        itemsOnSublist.push(newItemPriceObj.item)
                    }
                }
        } catch (error) {
            console.log('fieldChanged ERROR' + error)
        }
    }

    function getRemovedLine(currentRecord){
        try {
            var currIndex = currentRecord.getCurrentSublistIndex({
                sublistId: 'custpage_sublist'
            });
            var removedItem = itemsOnSublist[currIndex]
            itemsOnSublist = itemsOnSublist.filter(item => item!=removedItem)
            itemsToRemoveOnCustomer.push(removedItem)
            newItemsPricingLines = newItemsPricingLines.filter(obj => obj?.item!= removedItem)
        } catch (error) {
            console.log('getRemovedLine' + error)
        }
     }

    function validateField(context) {
        try {
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
            if (sublistName === 'custpage_sublist') {
                if (sublistFieldName === 'custpage_col_current_sell') {
                    var lineForm= currentRecord.selectLine({
                        sublistId: 'custpage_sublist',
                        line: context.line
                    });
                    if (currentRecord.getCurrentSublistValue({sublistId: sublistName,fieldId: 'custpage_col_price_level'}) == -1 && (currentRecord.getCurrentSublistValue({sublistId: sublistName,fieldId: sublistFieldName,line:context.line})<0)){
                        alert("For 'Custom' Price Level the current sell must be greater or equal than 0 ");
                        return false;
                    }
                    if (currentRecord.getCurrentSublistValue({sublistId: sublistName,fieldId: 'custpage_col_price_level'}) != -1 &&  currentRecord.getCurrentSublistValue({sublistId: sublistName,fieldId: sublistFieldName})){
                        currentRecord.setCurrentSublistValue({sublistId: sublistName,fieldId: 'custpage_col_current_sell',value:0})
                    }
                }
            }
            if (sublistName === 'custpage_sublist') {
                if (sublistFieldName === 'custpage_col_price_level') {
                    if (currentRecord.getCurrentSublistValue({sublistId: sublistName,fieldId: 'custpage_col_price_level'}) != -1){
                        var lineForm= currentRecord.selectLine({
                            sublistId: 'custpage_sublist',
                            line: context.line
                        });
                        currentRecord.setCurrentSublistValue({sublistId: sublistName,fieldId: 'custpage_col_current_sell',value:0})
                    }
                }
            }
           return true;
        } catch (error) {
            console.log("error validateField" + error)
        }
    }

    function editCustomer(){
        try {
            if(newItemsPricingLines.length>0 || itemsToRemoveOnCustomer.length>0){
                var customerId = Number(sessionStorage.getItem("customerId"))

                var custom_param_data = {
                    custom_param_item_pricing_to_insert : newItemsPricingLines,
                    custom_param_customer_id :customerId,
                    custom_param_item_pricing_to_remove : itemsToRemoveOnCustomer
                }

                let suitelet = url.resolveScript({
                    scriptId: 'customscript_sdb_customer_edit_item_pric',
                    deploymentId: 'customdeploy_sdb_customer_edit_item_pric',
                    returnExternalUrl: false,
                    params:{
                        custom_param_data:JSON.stringify(custom_param_data)
                    },
                })

                var response = https.post({
                    url: suitelet
                });
            }
                var account = runtime.accountId
                if(account.includes("_")){
                    account = account.replace("_","-")
                }
                if(!customerId)customerId = Number(sessionStorage.getItem("customerId"))

                var urlCustomer = 'https://'+account+'.app.netsuite.com/app/common/entity/custjob.nl?id='+customerId

                location.href = urlCustomer;
                window.open(urlCustomer,"_self")

        } catch (error) {
            console.log('editCustomer ERROR' + error)
        }
    }

       function sortSublist(currentRecord){
        try {
            var selectedSort = currentRecord.getValue('custpage_sort_select')
            var isAscendingSort = currentRecord.getValue('custpage_ascending_sort')
            var customer = sessionStorage.getItem("customerId");        
            let suiteletURL = url.resolveScript({
                scriptId: 'customscript_sdb_customer_edit_item_pric',
                deploymentId: 'customdeploy_sdb_customer_edit_item_pric',
                returnExternalUrl: false,
                params:{
                    custom_param_customer : customer,
                    custom_param_sortOption:selectedSort,
                    custom_param_isAscendingSort:isAscendingSort
                },
            })
            window.open(suiteletURL,"_self")
        } catch (error) {
            console.log("sortSublist Error" + error)
        }
    }

    function cancelEdition(customerId){
        try {
            var account = runtime.accountId

            if(account.includes("_")){
                account = account.replace("_","-")
            }
        
            if(!customerId)customerId = Number(sessionStorage.getItem("customerId"))
            var urlCustomer = 'https://'+account+'.app.netsuite.com/app/common/entity/custjob.nl?id='+customerId
            
            location.href = urlCustomer;
            window.open(urlCustomer,"_self")
        } catch (error) {
            console.log('CalcelEdition ERROR'+ error)
        }
    }
    return {
        pageInit,
        redirectToSuitelet:redirectToSuitelet,
        fieldChanged:fieldChanged,
        editCustomer:editCustomer,
        cancelEdition:cancelEdition,
        validateField:validateField,
    };
});