/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * Purpose : The purpose of the restlet is validating the pick task entered exists or not 
 */
define(["N/search"],
    function (search) {
        function post(context) {
            opentasklist = {};
            try {
                let txtItem = context.params.txtItem;
                let itemList = context.params.itemList;
                let opentaskid = context.params.opentaskid;
                let itemAliaslist =[];
                var customrecord_wmsse_sku_aliasSearchObj = search.create({
                    type: "customrecord_wmsse_sku_alias",
                    filters:
                    [
                       ["name","haskeywords",txtItem]
                    ],
                    columns:
                    [
                       search.createColumn({
                          name: "name",
                          sort: search.Sort.ASC,
                          label: "Name"
                       }),
                       search.createColumn({name: "scriptid", label: "Script ID"}),
                       search.createColumn({name: "custrecord_wmsse_alias_item", label: "Item"})
                    ]
                 });
                 var searchResultCount = customrecord_wmsse_sku_aliasSearchObj.runPaged().count;
                 log.debug("customrecord_wmsse_sku_aliasSearchObj result count",searchResultCount);
                 customrecord_wmsse_sku_aliasSearchObj.run().each(function(result){
                    let itemName = result.getText({ name: "custrecord_wmsse_alias_item" })
                    itemAliaslist.push({ itemName: itemName,})
                    return true;
                 });
                 if(itemAliaslist.length !==0){
                    txtItem = itemAliaslist[0].itemName
                 }



                 
                log.debug('opentaskid', opentaskid);
                if (opentaskid ==( '' || undefined)) {
                    var newArray = itemList.filter(function (el) {
                        return el.itemName == txtItem  ||
                            el.upccode == txtItem
                    });

                }
                else {
                    var newArray = itemList.filter(function (el) {
                        return el.opentaskid == opentaskid
                    });
                }
                log.debug('newArray',newArray);
                if (newArray.length != 0) {
                    var data = newArray.reduce(function (prev, curr) {
                        return prev.opentaskid < curr.opentaskid ? prev : curr;
                    });
                    opentasklist = data;
                    opentasklist['isValid'] = true;
                }
                else {
                    opentasklist['isValid'] = false;
                    opentasklist['errorMessage'] = 'Please Enter Valid Item ';
                }
            }
            catch (e) {
                opentasklist['isValid'] = false;
                opentasklist['errorMessage'] = e;
            }
            return opentasklist;
        }
        return {
            post: post
        }
    })