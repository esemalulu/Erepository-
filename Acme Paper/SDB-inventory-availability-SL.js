/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/ui/serverWidget", "N/search"], function (log, serverWidget, search)
{
    function onRequest(context)
    {
        var form = serverWidget.createForm({ title: 'Visibility to inventory availability', hideNavBar: true });
        form.clientScriptModulePath = 'SuiteScripts/SDB-inventory-availability-CS.js';

        let itemSublist = form.addSublist({
            id: 'sublist_items',
            type: serverWidget.SublistType.LIST,
            label: 'Item Results'
        });

        setColumnHeader(itemSublist);

        // ---------------- GET ALL ITEMS FROM SEARCH -------------------
        const paginationItems = getPaginationItems();

        fetchPage(1, paginationItems, itemSublist);
        // --------------------------------------------------------------

        if (paginationItems?.pageRanges?.length > 1)
        {
            form.addButton({
                id: 'custpage_next_page',
                label: 'Next Page',
                functionName: 'nextPage'
            });
        }


        context.response.writePage(form);
    }

    function showItemsAsSublist(itemArray, sublistName)
    {
        try
        {
            for (let i = 0; i < itemArray.length; i++)
            {
                const thisItem = itemArray[i];

                var dictionary = {
                    'custcol_internalid': thisItem?.internalid || " ",
                    'custcol_name': thisItem?.itemName || " ",
                    'custcol_item_defined_cost': thisItem?.costestimate || " ",
                    'custcol_available': thisItem?.quantityavailable || " ",
                    'custcol_on_hand': thisItem?.quantityonhand || " ",
                    'custcol_commited': thisItem?.quantitycommitted || " ",
                    'custcol_backordered': 0,
                    'custcol_on_order': thisItem?.quantityonorder || " ",
                    'custcol_restricted_items': thisItem?.custitem_acme_restricted_items || " ",
                    'custcol_supersede_items': thisItem?.custitem_acc_supercede_item || " ",
                    'custcol_sap_code': thisItem?.custitem_acc_sap_code || " ",
                    'custcol_sap_code_2': thisItem?.custitem_acc_sap_code2 || " ",
                    'custcol_buyer': thisItem?.custitem_buyer || " ",
                    'custcol_vendor': thisItem?.othervendor || " ",
                    'custcol_receive_at_savage': thisItem?.custitem_receive_at_savage || " "
                }

                Object.entries(dictionary).forEach((valueKey) =>
                {
                    sublistName.setSublistValue({
                        id: valueKey[0],
                        line: i,
                        value: valueKey[1]
                    });
                });
            }
        } catch (error)
        {
            log.error("error", error);
        }
    }//End sublist

    function getPaginationItems()
    {
        var itemSearchObj = search.create({
            type: "item",
            filters:
                [
                    [["locationquantityonhand", "isnotempty", ""], "AND", ["locationquantityonhand", "notequalto", "0"]]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({
                        name: "itemid",
                        sort: search.Sort.ASC,
                        label: "Item Name"
                    }),
                    search.createColumn({ name: "costestimate", label: "Item Defined Cost" }),
                    search.createColumn({ name: "quantityavailable", label: "Available" }),
                    search.createColumn({ name: "quantityonhand", label: "On Hand" }),
                    search.createColumn({ name: "quantitycommitted", label: "Committed" }),
                    search.createColumn({ name: "quantityonorder", label: "On Order" }),
                    search.createColumn({ name: "custitem_acme_restricted_items", label: "Restricted Items" }),
                    search.createColumn({ name: "custitem_acc_supercede_item", label: "Supersede Item" }),
                    search.createColumn({ name: "custitem_acc_sap_code", label: "SAP Code" }),
                    search.createColumn({ name: "custitem_acc_sap_code2", label: "SAP Code #2" }),
                    search.createColumn({ name: "custitem_buyer", label: "Buyer" }),
                    search.createColumn({ name: "othervendor", label: "Vendor" }),
                    search.createColumn({ name: "custitem_receive_at_savage", label: "Receive at Savage" })
                ]
        });
        var myPagedResults = itemSearchObj.runPaged({ pageSize: 300 });

        return myPagedResults;
    }//End getItems

    function setColumnHeader(itemSublist)
    {
        itemSublist.addField({
            id: 'custcol_internalid',
            type: serverWidget.FieldType.TEXT,
            label: 'Internal Id'
        });

        itemSublist.addField({
            id: 'custcol_name',
            type: serverWidget.FieldType.TEXT,
            label: 'Name'
        });

        itemSublist.addField({
            id: 'custcol_item_defined_cost',
            type: serverWidget.FieldType.TEXT,
            label: 'Item Defined Cost'
        });

        itemSublist.addField({
            id: 'custcol_available',
            type: serverWidget.FieldType.TEXT,
            label: 'Available'
        });

        itemSublist.addField({
            id: 'custcol_on_hand',
            type: serverWidget.FieldType.TEXT,
            label: 'On hand'
        });

        itemSublist.addField({
            id: 'custcol_commited',
            type: serverWidget.FieldType.TEXT,
            label: 'Commited'
        });

        itemSublist.addField({
            id: 'custcol_backordered',
            type: serverWidget.FieldType.TEXT,
            label: 'Back Ordered'
        });

        itemSublist.addField({
            id: 'custcol_on_order',
            type: serverWidget.FieldType.TEXT,
            label: 'On Order'
        });

        itemSublist.addField({
            id: 'custcol_restricted_items',
            type: serverWidget.FieldType.TEXT,
            label: 'Restricted Items'
        });

        itemSublist.addField({
            id: 'custcol_supersede_items',
            type: serverWidget.FieldType.TEXT,
            label: 'Supersede Item'
        });

        itemSublist.addField({
            id: 'custcol_sap_code',
            type: serverWidget.FieldType.TEXT,
            label: 'Sap Code'
        });

        itemSublist.addField({
            id: 'custcol_sap_code_2',
            type: serverWidget.FieldType.TEXT,
            label: 'Sap Code #2'
        });

        itemSublist.addField({
            id: 'custcol_buyer',
            type: serverWidget.FieldType.TEXT,
            label: 'Buyer'
        });

        itemSublist.addField({
            id: 'custcol_vendor',
            type: serverWidget.FieldType.TEXT,
            label: 'Vendor'
        });

        itemSublist.addField({
            id: 'custcol_receive_at_savage',
            type: serverWidget.FieldType.TEXT,
            label: 'Receive at savage'
        });
    }

    function fetchPage(pageIndex, pagedData, sublistData)
    {
        var items = [];

        // Add the search results to the sublist
        var currentPage = pagedData.fetch({ index: pageIndex });
        currentPage.data.forEach(function (result)
        {
            var obj = {};
            obj.internalid = result.id;
            obj.itemName = result.getValue({ name: 'itemid' });
            obj.costestimate = result.getValue({ name: 'costestimate' });
            obj.quantityavailable = result.getValue({ name: 'quantityavailable' });
            obj.quantityonhand = result.getValue({ name: 'quantityonhand' });
            obj.quantitycommitted = result.getValue({ name: 'quantitycommitted' });
            obj.quantityonorder = result.getValue({ name: 'quantityonorder' });
            obj.custitem_acme_restricted_items = result.getValue({ name: 'custitem_acme_restricted_items' });
            obj.custitem_acc_supercede_item = result.getValue({ name: 'custitem_acc_supercede_item' });
            obj.custitem_acc_sap_code = result.getValue({ name: 'custitem_acc_sap_code' });
            obj.custitem_acc_sap_code2 = result.getValue({ name: 'custitem_acc_sap_code2' });
            obj.custitem_buyer = result.getValue({ name: 'custitem_buyer' });
            obj.othervendor = result.getValue({ name: 'othervendor' });
            obj.custitem_receive_at_savage = result.getValue({ name: 'custitem_receive_at_savage' });

            items.push(obj);

            return true;
        });

        showItemsAsSublist(items, sublistData);
    }


    return {
        onRequest: onRequest
    }
});
