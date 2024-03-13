/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ClientScript
 * @module
 * @description
 */
 define(['N/record', 'N/search', 'N/format'], function(record, search, format) {

    /**
     * On pageInit, compare new RA to originating transaction.
     * 
     * Line items should match, if not, compare item sublists
     * on both transactions. Where a line does not match,
     * insert line from originating transaction into
     * RA item sublist to match. 
     * 
     * Once comparison is complete, sublists should match. 
     * 
     */
    function pageInit(context) {
         //debugger;
         const type = context.mode;

         if(type == "create" || type == "copy") {
 
             let newRaRec = context.currentRecord;
             var createdFrom = newRaRec.getValue('createdfrom');
             //if not created from another transaction, break from execution
             if(!createdFrom){
                 return;
             }
             jQuery('#_loading_dialog').attr('title', 'Return Authorization');
             jQuery('#_loading_dialog').html(
                 `<div style="text-align: center; font-size:15px; font-style: italic;">Please wait to complete the background processing of Return Authorization.<br>This may take a time and do not click on <b>Exit Page</b> button.</div>
                 <br>
                 <div style="text-align: center; width:100%;">
                 <i class="fas fa-cog fa-pulse fa-spin" style="font-size:24px" data-fa-transform="grow-18"></i>
                 </div>`
             );
             jQuery('#_loading_dialog').dialog({
                 modal: true,
                 width: 400,
                 height: 160,
                 resizable: false,
                 closeOnEscape: false,
                 position: { my: "top", at: "top+120", of: '#main_form' },
                 open: function (evt, ui) {
                     // jQuery(".ui-dialog-titlebar-close").hide();
                     setTimeout(function() { runAutomation(context) });
                 }
             });  
         }
     }
 
     function runAutomation(context){
        const type = context.mode;
        let newRaRec = context.currentRecord;
        //ahead of sourcing line items from orig transaction,
        //set rate line field to be editable.
        // let rateFld = newRaRec.getSublistField({
        //     sublistId: 'item',
        //     fieldId: 'rate',
        //     line: 0
        // });
        // rateFld.isDisabled = false;

        //only execute if RA is created or copied
        if(type == "create" || type == "copy") {
            //get originating transaction
            var createdFrom = newRaRec.getValue('createdfrom');

            var findTranType = search.lookupFields({
                type: search.Type.TRANSACTION,
                id: createdFrom,
                columns: 'type'
            });
            let recType;
            switch (findTranType.type[0].value) {
                case 'SalesOrd' :
                    recType = 'salesorder';
                    break;
                case 'CustInvc' :
                    recType = 'invoice'
                    break;
            }
            let originRec = record.load({
                type: recType,
                id: createdFrom
            });

            //get totals & line counts from both RA & orig transaction
            const raTotal = newRaRec.getValue('subtotal');
            const origTotal = originRec.getValue('subtotal');
            let raLines = newRaRec.getLineCount('item');
            const origLines = originRec.getLineCount('item');
            // log.debug("Do totals match?", "orig:"+origTotal+", ra:"+raTotal);
            // log.debug("Do lines match?","orig:"+origLines+", ra:"+raLines);
            // console.log("Do totals match?", "orig:"+origTotal+", ra:"+raTotal);
            // console.log("Do lines match?","orig:"+origLines+", ra:"+raLines);

            clearArrFieldValueBody(newRaRec);

            //if lines do not match, replace complete RA line
            //object with lines from original transaction.
            if(raLines !== origLines){
                //get lines from original transaction
                // log.debug("Line counts do not match.", "Compare Lines & Insert missing values");
                // console.log("Line counts do not match.", "Compare Lines & Insert missing values");
                let origRecLinesObj = JSON.parse(JSON.stringify(originRec)).sublists.item;
                delete origRecLinesObj.currentline;
                let arrOrigRecLines = new Array();
                Object.keys(origRecLinesObj).forEach(key => { 
                    //console.log(origRecLinesObj[key]); //values
                    arrOrigRecLines.push(origRecLinesObj[key]); 
                    //console.log(key); //keys 
                });
                
                //delete all lines from RA
                if(raLines > 0){
                    do{
                        newRaRec.removeLine({
                            sublistId: 'item',
                            line: 0,
                            ignoreRecalc: true
                        });
                        raLines = newRaRec.getLineCount('item');
                    } while (raLines > 0)
                }

                //start fresh adding new lines from orig rec
                arrOrigRecLines.forEach(item => {
                    // console.log("Processing Line",item.item);
                    // log.debug("Processing Line", item.item);
                    let itemType = item.itemtype.legacyStringValue ? item.itemtype.legacyStringValue : null;
                    let itemInGroup = null;
                  	let itemInGroupPresent = item.ingroup;
                    if(itemType != 'Group' && itemType != 'EndGroup' && itemType != 'Discount' && itemType != 'Subtotal' && itemType != 'Description' && itemInGroupPresent){
                        itemInGroup = item.ingroup.legacyStringValue ? item.ingroup.legacyStringValue : null;
                    }
                    
                    //if item is item group, add top level group item & commmit line.
                    if(itemType == "Group"){
                        newRaRec.selectNewLine({
                            sublistId: 'item'
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: item.item.legacyStringValue,
                            ignoreFieldChange: true
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: item.quantity.legacyStringValue,
                            ignoreFieldChange: true
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: 0.00,
                            ignoreFieldChange: true
                        });
                        //manually set tax code for item group lines
                        let sub = newRaRec.getValue({
                            fieldId: 'subsidiary'
                        });
                        let taxCode;
                        if(sub == 10){
                            taxCode = 2051;
                        } else {
                            taxCode = 376;
                        }
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: taxCode,
                            ignoreFieldChange: true
                        });
                        Object.keys(item).forEach(key => {
                            // console.log("Processing Field",key); //keys 
                            // log.debug("Processing field", key);
                            //console.log(item[key].legacyStringValue); //values
                            if(key !== 'item' && key !== '_sequence' && key !== '_id' && key !== 'taxrate1' && key !== 'attachedtorevenueelement'
                                && key !== 'custcol_r7_cash_arr' && key !== 'custcolr7_cash_excess_term_line'
                                && key !== 'custcol_r7_hardware_cash' && key !== 'custcol_r7_perpetual_cash'
                                && key !== 'custcol_r7_other_cash' && key !=='custcol_r7_services_cash'){
                                let value = item[key].legacyStringValue;
                                if(value == 'F'){
                                    value = false;
                                } else if(value == 'T'){
                                    value = true;
                                } else if(key == 'custcolr7enddate' || key == 'custcolr7startdate' || key == 'revrecenddate' || key == 'revrecstartdate' || key == 'custcol_end_date_so_line' || key == 'custcol_start_date_so_line' || key == 'custcolr7acvenddate' || key == 'custcolr7acvstartdate' || key == 'custcolr7_category_purchased_expire'){
                                    let date = value.split("/");
                                    date = new Date(date[2], date[0] - 1, date[1]);
                                    value = date;
                                }
                                newRaRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value: value,
                                    ignoreFieldChange: true
                                });
                            }
                        });
                        newRaRec.commitLine({
                            sublistId: 'item'
                        });
                    }
                    // if next item is group component, 
                    else if (itemInGroup == 'T' && itemType != 'Group' && itemType != 'EndGroup') {
                        //in client script, group components have to be added manually,
                        //add each 'ingroup' component.
                        newRaRec.selectNewLine({
                            sublistId: 'item'
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: item.item.legacyStringValue,
                            ignoreFieldChange: true
                        });
                        //manually set tax code for item group lines
                        let sub = newRaRec.getValue({
                            fieldId: 'subsidiary'
                        });
                        let taxCode;
                        if(sub == 10){
                            taxCode = 2051;
                        } else {
                            taxCode = 376;
                        }
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: taxCode,
                            ignoreFieldChange: true
                        });
                        Object.keys(item).forEach(key => {
                            //console.log("Processing Field",key); //keys 
                            // log.debug("Processing field", key);
                            //console.log(item[key].legacyStringValue); //values
                            if(key !== 'item' && key !== '_sequence' && key !== '_id' && key !== 'taxrate1' && key !== 'attachedtorevenueelement'
                                && key !== 'custcol_r7_cash_arr' && key !== 'custcolr7_cash_excess_term_line'
                                && key !== 'custcol_r7_hardware_cash' && key !== 'custcol_r7_perpetual_cash'
                                && key !== 'custcol_r7_other_cash' && key !=='custcol_r7_services_cash'){
                                let value = item[key].legacyStringValue;
                                if(value == 'F'){
                                    value = false;
                                } else if(value == 'T'){
                                    value = true;
                                } else if(key == 'custcolr7enddate' || key == 'custcolr7startdate' || key == 'revrecenddate' || key == 'revrecstartdate' || key == 'custcol_end_date_so_line' || key == 'custcol_start_date_so_line' || key == 'custcolr7acvenddate' || key == 'custcolr7acvstartdate' || key == 'custcolr7_category_purchased_expire'){
                                    let date = value.split("/");
                                    date = new Date(date[2], date[0] - 1, date[1]);
                                    value = date;
                                }
                                
                                newRaRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value: value,
                                    ignoreFieldChange: true
                                });
                                
                            }
                        });
                        newRaRec.commitLine({
                            sublistId: 'item'
                        });
                    }
                    //if line is end group,
                    else if(itemType == 'EndGroup'){
                        //in client script, need to manually add end group line
                        newRaRec.selectNewLine({
                            sublistId: 'item'
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: 0,
                            ignoreFieldChange: true
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemtype',
                            value: 'EndGroup',
                            ignoreFieldChange: true
                        });
                        //manually set tax code for item group lines
                        let sub = newRaRec.getValue({
                            fieldId: 'subsidiary'
                        });
                        let taxCode;
                        if(sub == 10){
                            taxCode = 2051;
                        } else {
                            taxCode = 376;
                        }
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: taxCode,
                            ignoreFieldChange: true
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: item["location"].legacyStringValue,
                            ignoreFieldChange: true
                        });
                        newRaRec.commitLine({
                            sublistId: 'item'
                        });
                    }
                    //if line is discount
                    else if(itemType == 'Discount'){
                        newRaRec.selectNewLine({
                            sublistId: 'item'
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: item.item.legacyStringValue,
                            ignoreFieldChange: true
                        });
                        //manually set tax code for item group lines
                        let sub = newRaRec.getValue({
                            fieldId: 'subsidiary'
                        });
                        let taxCode;
                        if(sub == 10){
                            taxCode = 2051;
                        } else {
                            taxCode = 376;
                        }
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: taxCode,
                            ignoreFieldChange: true
                        });
                        Object.keys(item).forEach(key => {
                            //console.log("Processing Field",key); //keys 
                            // log.debug("Processing field", key);
                            //console.log(item[key].legacyStringValue); //values
                            if(key !== 'item' && key !== '_sequence' && key !== '_id' && key !== 'taxrate1' && key !== 'attachedtorevenueelement' && key !== 'rate'
                                && key !== 'custcol_r7_cash_arr' && key !== 'custcolr7_cash_excess_term_line'
                                && key !== 'custcol_r7_hardware_cash' && key !== 'custcol_r7_perpetual_cash'
                                && key !== 'custcol_r7_other_cash' && key !=='custcol_r7_services_cash'){
                                let value = item[key].legacyStringValue;
                                if(value == 'F'){
                                    value = false;
                                } else if(value == 'T'){
                                    value = true;
                                } else if(key == 'custcolr7enddate' || key == 'custcolr7startdate' || key == 'revrecenddate' || key == 'revrecstartdate' || key == 'custcol_end_date_so_line' || key == 'custcol_start_date_so_line' || key == 'custcolr7acvenddate' || key == 'custcolr7acvstartdate' || key == 'custcolr7_category_purchased_expire'){
                                    let date = value.split("/");
                                    date = new Date(date[2], date[0] - 1, date[1]);
                                    value = date;
                                } else if(key == 'amount') {
                                    //when setting amount field, set same value in rate field
                                    //this is only done for discount items 
                                    newRaRec.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value: value,
                                        ignoreFieldChange: true
                                    });
                                }

                                newRaRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value: value,
                                    ignoreFieldChange: true
                                });
                                
                            }
                        });
                        newRaRec.commitLine({
                            sublistId: 'item'
                        });
                    }
                    //anything else, e.g. individual items, add item, then add all associated line field values
                    else {
                        newRaRec.selectNewLine({
                            sublistId: 'item'
                        });
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: item.item.legacyStringValue,
                            ignoreFieldChange: true
                        });
                        //manually set tax code for item group lines
                        let sub = newRaRec.getValue({
                            fieldId: 'subsidiary'
                        });
                        let taxCode;
                        if(sub == 10){
                            taxCode = 2051;
                        } else {
                            taxCode = 376;
                        }
                        newRaRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: taxCode,
                            ignoreFieldChange: true
                        });
                        Object.keys(item).forEach(key => {
                            console.log("Processing Field",key); //keys 
                            // log.debug("Processing field", key);
                            //console.log(item[key].legacyStringValue); //values
                            if(key !== 'item' && key !== '_sequence' && key !== '_id' && key !== 'taxrate1' && key !== 'attachedtorevenueelement'
                                && key !== 'custcol_r7_cash_arr' && key !== 'custcolr7_cash_excess_term_line'
                                && key !== 'custcol_r7_hardware_cash' && key !== 'custcol_r7_perpetual_cash'
                                && key !== 'custcol_r7_other_cash' && key !=='custcol_r7_services_cash'){
                                let value = item[key].legacyStringValue;
                                if(value == 'F'){
                                    value = false;
                                } else if(value == 'T'){
                                    value = true;
                                } else if(key == 'custcolr7enddate' || key == 'custcolr7startdate' || key == 'revrecenddate' || key == 'revrecstartdate' || key == 'custcol_end_date_so_line' || key == 'custcol_start_date_so_line' || key == 'custcolr7acvenddate' || key == 'custcolr7acvstartdate' || key == 'custcolr7_category_purchased_expire'){
                                    let date = value.split("/");
                                    date = new Date(date[2], date[0] - 1, date[1]);
                                    value = date;
                                }
                                newRaRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value: value,
                                    ignoreFieldChange: true
                                });
                            }
                        });
                        newRaRec.commitLine({
                            sublistId: 'item'
                        });
                    }
                });

                // let newRaRecLineCount = newRaRec.getLineCount('item');
                // for(var i=0; i < newRaRecLineCount; i++){
                //     let currItemType = newRaRec.getSublistValue({
                //         sublistId: 'item',
                //         fieldId: 'itemtype',
                //         line: i
                //     });
                //     if(currItemType != 'EndGroup' && currItemType != 'Group'){
                //         newRaRec.selectLine({
                //             sublistId: 'item',
                //             line: i
                //         });
                //         newRaRec.setCurrentSublistValue({
                //             sublistId: 'item',
                //             fieldId: 'price',
                //             value: '-1',
                //             ignoreFieldChange: true
                //         });
                //         newRaRec.commitLine({
                //             sublistId: 'item'
                //         });
                //     }
                // }
                //Some fields need to be added after the initial line is committed. Add fieldIds
                //to the afterCommitFields array for any fields that require this.
                let newRecLinesObj = JSON.parse(JSON.stringify(originRec)).sublists.item;
                let afterCommitFields = ['price', 'itemtype', 'custcolr7itemmsproductkey', 'custcolr7registrationid', 'custcolr7managedsoftwareid', 'custcolr7managedserviceid'];
                let afterCommitItems = {};
                for(field of afterCommitFields){
                    for (line of Object.keys(newRecLinesObj)){
                        if(newRecLinesObj[line].hasOwnProperty(field) && newRecLinesObj[line][field]){
                            const fieldVal = newRecLinesObj[line][field];
                            if(!afterCommitItems[line]){
                                afterCommitItems[line] = {};
                            }
                            afterCommitItems[line][field] = fieldVal;
                        }
                    }
                }

                //Gets fields added to the afterCommitItems obj to recommit them after the initial commits.
                //Right now only works for standard ids and strings - no special logic for dates or checkboxes.
                
                let count = 0;
                Object.keys(afterCommitItems).sort().forEach(item => {
                    let arrItem = item.split(" ");
                    newRaRec.selectLine({
                        sublistId: 'item',
                        line: arrItem[1]
                    });
                    // let obj = afterCommitItems[item];
                    // if(obj.itemtype.legacyStringValue != "EndGroup" && obj.itemtype.legacyStringValue != "Group"){
                    //     newRaRec.setCurrentSublistValue({
                    //         sublistId: 'item',
                    //         fieldId: 'price',
                    //         value: obj.price.legacyStringValue,
                    //         ignoreFieldChange: true
                    //     });
                    //     newRaRec.commitLine({
                    //         sublistId: 'item'
                    //     });
                    // }
                    let obj = afterCommitItems[item];
                    if(obj.itemtype.legacyStringValue != "EndGroup" && obj.itemtype.legacyStringValue != "Group"){
                        Object.keys(afterCommitItems[item]).forEach(key =>{
                            let value = afterCommitItems[item][key].legacyStringValue;
                            if(key !== 'itemtype'){
                                newRaRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: key,
                                    value: value,
                                    ignoreFieldChange: true
                                });
                            }
                        });
                        newRaRec.commitLine({
                            sublistId: 'item'
                        });
                    }
                }); 
            } else {
                clearArrFieldValueLine(newRaRec); 
            }
        }

        jQuery('#_loading_dialog').dialog('close');
        jQuery('#_loading_dialog').html('');
    }

    function clearArrFieldValueBody(newRaRec){
        //set ARR Calc Status back to not calculated
        newRaRec.setValue({
            fieldId: 'custbody_r7_cash_arr_calc_status',
            value: 1
        });
        //clear ARR body fields
        newRaRec.setValue({
            fieldId: 'custbody_r7_total_excess_term',
            value: ''
        });
        newRaRec.setValue({
            fieldId: 'custbody_r7_total_perpetual',
            value: ''
        });
        newRaRec.setValue({
            fieldId: 'custbody_r7_cash_other',
            value: ''
        });
        newRaRec.setValue({
            fieldId: 'custbody_r7_total_hardware',
            value: ''
        });
        newRaRec.setValue({
            fieldId: 'custbody_r7_total_services',
            value: ''
        });
        newRaRec.setValue({
            fieldId: 'custbody_r7_total_arr_usd',
            value: ''
        });
        newRaRec.setValue({
            fieldId: 'custbody_r7_arr_override',
            value: false
        });
    }
    
    function clearArrFieldValueLine(newRaRec){
        for(var i=0; i < newRaRec.getLineCount({sublistId: 'item'}); i++){
            //clear line ARR field values
            newRaRec.selectLine({
                sublistId: 'item',
                line: i
            });
            //check if itemtype is not EndGroup
            var itemType = newRaRec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'itemtype'
            });
            if(itemType !== "EndGroup"){
                newRaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_r7_cash_arr',
                    value: ''
                });
                newRaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_cash_excess_term_line',
                    value: ''
                });
                newRaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_r7_hardware_cash',
                    value: ''
                });
                newRaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_r7_perpetual_cash',
                    value: ''
                });
                newRaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_r7_other_cash',
                    value: ''
                });
                newRaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_r7_services_cash',
                    value: ''
                });
                newRaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_reporting_obj',
                    value: ''
                });
                newRaRec.commitLine({
                    sublistId: 'item',
                });
            }
        }
    }

    return {
        pageInit: pageInit
    };
});