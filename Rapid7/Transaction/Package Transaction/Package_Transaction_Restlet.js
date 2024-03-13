/**
 * @NApiVersion 2.1
 * @NScriptType restlet
 */

define(['/SuiteScripts/Transaction/Package Transaction/Package_Transaction_Library.js', 'N/search', 'N/record', 'SuiteScripts/r7_mod/searchFormat'], callback);

function callback(packageTransactionLibrary, search, record, searchFormat) {

    function get(request) {
        if (!request.hasOwnProperty('transactionId')) {
            throw new Error('transactionId is required');
        }
        let transactionObject = getTransactionObject(request.transactionId);
        convertSublistsToArrays(transactionObject);

        if (transactionHasItemGroups(transactionObject)) {
            convertGroupsToSingleLine(transactionObject);
        }

        formatFieldsForWorkato(transactionObject);
        concatPercentSymbolOnTax(transactionObject);
        setPackageNames(transactionObject);
        setCorrectQuantity(transactionObject);
        setCorrectRate(transactionObject);
        setCorrectLineIndex(transactionObject);
        cleanForELAVersapay(transactionObject);
        return transactionObject;
    }

    /**
     * getPackagedRecord attempts to re-package the product
     */
    function getTransactionObject(transactionId) {
        const transactionRec = packageTransactionLibrary.getPackagedRecord(transactionId);
        const transactionObject = JSON.parse(JSON.stringify(transactionRec));
        transactionObject.id = transactionId; //ensures original ID is on object incase copy method was used for Sales order.
        return transactionObject;
    }

    /**
     * Removes non required discount lines for ELA invoices post subtotal calculation
     */
    function cleanForELAVersapay(transactionObject){
        if(transactionObject.fields.custbody_r7_ela_invoice == 'T') {
            var itemSublist=  transactionObject.sublists.item;
            let i = 0;
            while (i < itemSublist.length) {
                if (itemSublist[i].item && itemSublist[i].item.internalid == "51") {
                    itemSublist.splice(i, 1);
                } else {
                    ++i;
                }
            }
        } 
    }
    
    /**
     * Turns sublists into Arrays and removes the currentline row
     */
    function convertSublistsToArrays(transactionObject) {
        for (sublist of Object.keys(transactionObject.sublists)) {
            let sublistArr = [];
            for (line of Object.keys(transactionObject.sublists[sublist])) {
                if (line !== 'currentline') {
                    pushSublistLineToArray(sublistArr, transactionObject.sublists[sublist], line);
                }
            }
            transactionObject.sublists[sublist] = sublistArr;
        }
    }

    function pushSublistLineToArray(sublistArr, sublist, line) {
        //if the item line attr is blank, set it using the lineObj value, e.g. if item[line 1:{}], then get the value 1.
        if (!sublist[line]['line']) {
            sublist[line]['line'] = line.substring(line.indexOf(' ') + 1, line.length);
        }
        sublistArr.push(sublist[line]);
    }

    /**
     * Make an array out of all the line item itemtypes. Return true if any itemtype is 'Group'
     */
    function transactionItemTypes(transactionObject){
        return transactionObject.sublists.item.map(i => i.itemtype);
    }

    /**
     * Return true if an itemType of Group exists
     */
    function transactionHasItemGroups(transactionObject) {
        return transactionItemTypes(transactionObject).includes('Group');
    }



    /**
     * Recursive function that will loop over all line items. When it finds a Group it marks it in groupParentIndex.
     * It will loop until it finds an EndGroup. When it does, it sets groupParentIndex amount to the EndGroups amount.
     * Then it removes all of the group items; except for the groupParentIndex using slice methods.
     * If there's more groups, then it starts again, otherwise it ends.
     */
    function convertGroupsToSingleLine(transactionObject) {
        let groupParentIndex = 0;
        formatGroups(0);
        function formatGroups(index) {
            let itemArr = transactionObject.sublists.item;
            let lineItem = itemArr[index];
            if (lineItem.itemtype === 'Group') {
                groupParentIndex = index;
                formatGroups(index + 1)
            } else if (lineItem.itemtype === 'EndGroup') {
                let groupParentLine = transactionObject.sublists.item[groupParentIndex];
                groupParentLine.amount = lineItem.amount;
                groupParentLine.itemtype = 'Service';
                transactionObject.sublists.item = itemArr.slice(0, groupParentIndex + 1).concat(itemArr.slice(index + 1, itemArr.length))
                return transactionHasItemGroups(transactionObject) ? formatGroups(transactionItemTypes(transactionObject).indexOf('Group')) : true;
            } else {
                return index >= transactionObject.sublists.item.length ? true : formatGroups(index + 1)
            }
        }
    }


    /**
     * Workato requires some fields to display the value and text
     */
    function formatFieldsForWorkato(transaction) {
        const sublist = 'item';
        const fieldIds = ['item', 'custcolr7itemqtyunit'];
        let transactionSearchObj = search.create({
            type: search.Type.TRANSACTION,
            filters:
                [
                    ["mainline", "is", "F"],
                    "AND",
                    ["internalid", "anyof", transaction.id]
                ],
            columns: addColumns(sublist, fieldIds)

        });
        let searchResults = searchFormat.textAndValues(
            transactionSearchObj.run().getRange({start: 0, end: 1000})
        );
        let idAndTextVals = {item: {}, custcolr7itemqtyunit: {}};
        for (result of searchResults) {
            for (let i = 0; i < fieldIds.length; i++) {
                idAndTextVals[fieldIds[i]][result[i].value] = result[i].text;
            }
        }
        addTextAndValuesToTransaction(idAndTextVals, fieldIds, sublist, transaction);
    }

    function addColumns(sublist, fieldIds) {
        let columns = [];
        for (fieldId of fieldIds) {
            columns.push(search.createColumn({name: fieldId,}));
        }
        return columns;
    }

    function addTextAndValuesToTransaction(idAndTextVals, fieldIds, sublist, transaction) {
        for (fieldId of fieldIds) {
            for (item of transaction.sublists[sublist]) {
                if (item[fieldId]) {
                    const idVal = item[fieldId];
                    const textVal = idAndTextVals[fieldId][idVal];
                    item[fieldId] = {internalid: idVal, name: textVal};
                }
            }
        }
    }

    function setNameValue(transactionRec, sublist, fieldId, item) {
        return transactionRec.getSublistText({
            sublistId: sublist,
            fieldId: fieldId,
            line: item.line
        });
    }

    function concatPercentSymbolOnTax(transactionObject) {
        for (item of transactionObject.sublists.item) {
            if (item.hasOwnProperty('taxrate1') && item.taxrate1) {
                if (item.taxrate1.substr(item.taxrate1.length - 1) != '%') {
                    item.taxrate1 += '%';
                }
            }
        }
    }

    function setPackageNames(transactionObject) {
        for (line of transactionObject.sublists.item) {
            if (isPackage(line.item.internalid)) {
                const pkgInfo = record.load({
                    type: 'customrecord_r7_pck_level',
                    id: line.custcol_r7_pck_package_level
                });
                line.item_display = pkgInfo.getText('name');
                line.item['name'] = pkgInfo.getText('name');
            } else if (isPackageProrate(line.item.internalid)) {
                // destructuring assignment, expects an array of size 2
                const [salesDesc, itemName] = getItemValues(line.item.internalid);
                line.item_display = itemName;
                line.item['name'] = itemName;
                line.description = salesDesc;
            }
        }
    }

    // SUB-PRORATE item gets added within the getPackagedRecord function and doesn't exist on the invoice,
    // so we need to get it's name manually.
    function isPackageProrate(lineInternalId) {
        const subProrateId = 7523;
        return lineInternalId == subProrateId;;
    }

    // returns sub-prorates name and sales desc. using searchFormat this will return a simple array
    // e.g. ['salesDescVal', 'nameVal']
    function getItemValues(itemId) {
        const itemResults = search.create({
            type: search.Type.ITEM,
            filters: [["internalid", "anyof", itemId]],
            columns: ["salesdescription", "itemid"]
        }).run().getRange({start:0, end: 1}); 
        return searchFormat.valuesOnly(itemResults[0]);
    }

    function setCorrectQuantity(transactionObject) {
        for (line of transactionObject.sublists.item) {
            let transactionDisplay = line.hasOwnProperty('custcolr7onepriceinvoicedisplay') ? line.custcolr7onepriceinvoicedisplay : null;
            let quantityVal = '';
            if (transactionDisplay && transactionDisplay == 2) {
                quantityVal = line.custcolr7totalownership;
            } else if (line.quantity) {
                quantityVal = line.quantity;
            }
            line['invoice_quantity'] = quantityVal;
        }
    }

    function setCorrectRate(transactionObject) {
        for (line of transactionObject.sublists.item) {
            let itemType = line.itemtype;
            let  itemDisplay = line.item_display;
            if (itemType == 'Discount') {
                line.rate = '';
            }
            else if (itemDisplay == 'IPLAT'){
                line.custcol_arm_amount_line_value = '';
            }
            else if(line.custcolr7onepriceinvoicedisplay == "2") { //2 = Total Ownership
                let lineAmt = Number(line.amount);
                let lineTotalOwn = Number(line.custcolr7totalownership);
                let newRate = lineAmt/lineTotalOwn;
                log.debug("New Rate (Amt/Total Ownership)", newRate);
                line.rate = newRate;
            }
        }
    }
    
    // If an item has a package template then we know it is a package.
    // searchedItems caches the value so we aren't doing duplicate searches
    let searchedItems = {};
    function isPackage(itemId) {
        if(!searchedItems[itemId]){
            const count = search.create({
                type: search.Type.ITEM,
                filters: [["internalid", "anyof", itemId], "AND", ["custitem_r7_pck_package_template", "noneof", "@NONE@"]]
            }).runPaged().count;
            searchedItems[itemId] = count > 0;
        }
        return searchedItems[itemId];
    }

    //before returning transactionObject JSON to Workato,
    //ensure that line item line indexes are in sequence.
    //If INV is new (created within last 5 mins), then reset line numbers,
    //Otherwise leave as is.
    function setCorrectLineIndex(transactionObject) {
        let count = 1;
        for (line of transactionObject.sublists.item) {
            line.line = count++;
        }
    }

    return {
        get: get
    };
}