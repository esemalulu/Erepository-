/*
 * Author: Sa Ho (RSM US)
 * Date: 6/14/2017
 * Description: Update Items on Quote to use ARM Upgrade Items, if applicable.
 * 
 */

function updateQuote(rec_type, rec_id) {
    try {
        nlapiLogExecution('DEBUG', 'Starting Update Quote');
        
        var currQuoteRec = nlapiLoadRecord(rec_type, rec_id, { recordmode: 'dynamic' });
        var itemsCount = currQuoteRec.getLineItemCount('item');

        nlapiLogExecution('DEBUG', 'Loading Record Type: ' + rec_type + ', Record ID: ' + rec_id + ', ' + 'Number of items: ' + itemsCount, JSON.stringify(currQuoteRec));

        //Copy existing items list
        var oldItemsList = [];
        var hasSkipItemGroup = false;
        var hasArmItemGroup = false;

        if (itemsCount > 0) {
            for (var i = 1; i <= itemsCount; i++) {
                nlapiLogExecution('DEBUG', 'Quote Item Line: ' + i + ', ItemId ' + currQuoteRec.getLineItemValue('item', 'item', i));

                var itemData = {
                    'Line': i,
                    'ItemId': currQuoteRec.getLineItemValue('item', 'item', i),
                    'ItemIsInactive': nlapiLookupField('item', currQuoteRec.getLineItemValue('item', 'item', i), 'isinactive'),
                    'ItemType': currQuoteRec.getLineItemValue('item', 'itemtype', i),
                    'InGroup': currQuoteRec.getLineItemValue('item', 'ingroup', i),
                    'ArmItemId': nlapiLookupField('item', currQuoteRec.getLineItemValue('item', 'item', i), 'custitem_arm_upgrade_item'),
                    'ArmItemType': null,
                    'Quantity': currQuoteRec.getLineItemValue('item', 'quantity', i),
                    'Unit': currQuoteRec.getLineItemValue('item', 'custcolr7itemqtyunit', i),
                    //'Units': currQuoteRec.getLineItemValue('item', 'units', i),
                    'Description': currQuoteRec.getLineItemValue('item', 'description', i),
                    'PriceLevel': currQuoteRec.getLineItemValue('item', 'price', i),
                    'ItemRate': currQuoteRec.getLineItemValue('item', 'custcolr7itemrateprediscount', i),
                    'Discount': currQuoteRec.getLineItemValue('item', 'custcolr7amountdiscountinline', i),
                    'Rate': currQuoteRec.getLineItemValue('item', 'rate', i),
                    'Amount': currQuoteRec.getLineItemValue('item', 'amount', i),
                    'TaxCode': currQuoteRec.getLineItemValue('item', 'taxcode', i),
                    'TaxRate1': currQuoteRec.getLineItemValue('item', 'taxrate1', i),
                    'Class': null, //use class from ARM Upgrade Item, otherwise, leave empty to avoid errors
                    'Location': currQuoteRec.getLineItemValue('item', 'location', i),
                    'ACL': currQuoteRec.getLineItemValue('item', 'custcolr7parentaclid', i),
                    'ProductKey': currQuoteRec.getLineItemValue('item', 'options', i),
                    'LineContact': currQuoteRec.getLineItemValue('item', 'custcolr7translinecontact', i),
                    'StartDate': currQuoteRec.getLineItemValue('item', 'custcolr7startdate', i),
                    'EndDate': currQuoteRec.getLineItemValue('item', 'custcolr7enddate', i),
                    'License': currQuoteRec.getLineItemValue('item', 'custcolr7translicenselink', i),
                    'Lid': currQuoteRec.getLineItemValue('item', 'custcolr7translicenseid', i),
                    'CreatedFrom': currQuoteRec.getLineItemValue('item', 'custcolr7createdfromra', i),
                    'Job': currQuoteRec.getLineItemValue('item', 'job', i),
                    'ContractRenewal': currQuoteRec.getLineItemValue('item', 'custcolr7contractrenewal', i),
                    'AmountRenewalTotal': currQuoteRec.getLineItemValue('item', 'custcolr7opamountrenewalbaseline', i),
                    'AmountRenewalCoTerm': currQuoteRec.getLineItemValue('item', 'custcolr7opamountrenewalcotermline', i),
                    'AmountRenewalMultiyear': currQuoteRec.getLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', i),
                    'RenewalBaseTermDays': currQuoteRec.getLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', i),
                    'IsCoTerm': currQuoteRec.getLineItemValue('item', 'custcolr7iscotermline', i),
                    'EventMaster': currQuoteRec.getLineItemValue('item', 'custcolr7eventmaster', i),
                    'RenewalAcvAmount': currQuoteRec.getLineItemValue('item', 'custcolr7acvamount', i),
                    'ShipToEntity': currQuoteRec.getLineItemValue('item', 'custcol_ava_shiptousecode', i),
                    'CreatedFromRaLineId': currQuoteRec.getLineItemValue('item', 'custcolr7createdfromra_lineid', i),
                    'MonthlyDataLimit': currQuoteRec.getLineItemValue('item', 'custcolr7_monthlydatalimit_gb', i),
                    'RevStartDate': currQuoteRec.getLineItemValue('item', 'custcol_start_date_so_line', i),
                    'RevEndDate': currQuoteRec.getLineItemValue('item', 'custcol_end_date_so_line', i),
                    'ReferenceIdKey': currQuoteRec.getLineItemValue('item', 'custcol_key', i),
                    'SoImport': currQuoteRec.getLineItemValue('item', 'custcol_rap7_so_imp_amt', i),
                    'SoImportRate': currQuoteRec.getLineItemValue('item', 'custcolr7_so_import_rate', i),
                    'SkipLine': false
                };

                oldItemsList.push(itemData);
            }

            nlapiLogExecution('DEBUG', 'Old Items Length: ' + oldItemsList.length, JSON.stringify(oldItemsList));

            //Delete existing items list, skip if item is inactive or an item group
            var lineNum = 1;

            for (var j = 1; j <= itemsCount; j++) {
                var itemId = currQuoteRec.getLineItemValue('item', 'item', lineNum);

                if (itemId != null) {
                    var isInactive = nlapiLookupField('item', itemId, 'isinactive');
                    var itemType = currQuoteRec.getLineItemValue('item', 'itemtype', lineNum);
                    var inGroup = currQuoteRec.getLineItemValue('item', 'ingroup', lineNum);

                    if (itemType == 'Group' || inGroup == 'T') {
                        hasSkipItemGroup = true;
                        oldItemsList[j - 1].SkipLine = true;
                        lineNum++;
                    }

                    else if (isInactive == 'T') {
                        oldItemsList[j - 1].SkipLine = true;
                        lineNum++;
                    }

                    else
                        currQuoteRec.removeLineItem('item', lineNum);
                }

                else
                    break;
            }
        }

        //Add item lines back in, using ARM Upgrade item if applicable
        if (oldItemsList != null && oldItemsList != '' && oldItemsList.length > 0) {
            for (var k = 0; k <= oldItemsList.length; k++) {
                if (oldItemsList[k] != null && oldItemsList[k] != '') {
                    //if (oldItemsList[k].ItemIsInactive != 'T' && oldItemsList[k].ItemType != 'Group' && oldItemsList[k].InGroup != 'T') {
                    if (!oldItemsList[k].SkipLine) {
                        var itemId = oldItemsList[k].ItemId;

                        //If item has a ARM Upgrade item, replace it
                        if (oldItemsList[k].ArmItemId != null && oldItemsList[k].ArmItemId != '') {
                            oldItemsList[k].ArmItemType = nlapiLookupField('item', oldItemsList[k].ArmItemId, 'type');
                            oldItemsList[k].Class = nlapiLookupField('item', oldItemsList[k].ArmItemId, 'class');
                            itemId = oldItemsList[k].ArmItemId;

                            if (oldItemsList[k].ArmItemType == 'Group')
                                hasArmItemGroup = true;

                            nlapiLogExecution('DEBUG', 'line ' + k + ' oldItemsList[k].ArmItemType updated', JSON.stringify(oldItemsList[k]));
                        }

                        if (itemId != null && itemId != '') {
                            nlapiLogExecution('DEBUG', 'Adding new item line, Item ID ' + itemId);

                            currQuoteRec.selectNewLineItem('item');
                            currQuoteRec.setCurrentLineItemValue('item', 'item', itemId);
                            

                            if (oldItemsList[k].ArmItemType != 'Group') {
                                if (oldItemsList[k].ItemType != 'Discount' && oldItemsList[k].ItemType != 'Subtotal') {
                                    currQuoteRec.setCurrentLineItemValue('item', 'amount', oldItemsList[k].Amount);
                                }

                                currQuoteRec.setCurrentLineItemValue('item', 'price', oldItemsList[k].PriceLevel);
                                currQuoteRec.setCurrentLineItemValue('item', 'rate', oldItemsList[k].Rate);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7contractrenewal', oldItemsList[k].ContractRenewal);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', oldItemsList[k].AmountRenewalTotal);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalcotermline', oldItemsList[k].AmountRenewalCoTerm);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', oldItemsList[k].AmountRenewalMultiyear);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7acvamount', oldItemsList[k].RenewalAcvAmount);
                                currQuoteRec.setCurrentLineItemValue('item', 'options', oldItemsList[k].ProductKey);
                            }

                            currQuoteRec.setCurrentLineItemValue('item', 'quantity', oldItemsList[k].Quantity);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7itemqtyunit', oldItemsList[k].Unit);
                            //currQuoteRec.setCurrentLineItemValue('item', 'units', oldItemsList[k].Units);
                            currQuoteRec.setCurrentLineItemValue('item', 'description', oldItemsList[k].Description);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7itemrateprediscount', oldItemsList[k].ItemRate);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7amountdiscountinline', oldItemsList[k].Discount);
                            currQuoteRec.setCurrentLineItemValue('item', 'taxcode', oldItemsList[k].TaxCode);
                            currQuoteRec.setCurrentLineItemValue('item', 'taxrate1', oldItemsList[k].TaxRate1);
                            currQuoteRec.setCurrentLineItemValue('item', 'class', oldItemsList[k].Class);
                            currQuoteRec.setCurrentLineItemValue('item', 'location', oldItemsList[k].Location);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7parentaclid', oldItemsList[k].ACL);

                            //Check if Line Contact is inactive or belongs to a different account
                            if (oldItemsList[k].LineContact != null && oldItemsList[k].LineContact != '') {
                                var lineContactIsInactive = nlapiLookupField('contact', oldItemsList[k].LineContact, 'isinactive');
                                var lineContactCompany = nlapiLookupField('contact', oldItemsList[k].LineContact, 'company');
                                var currQuoteCompany = currQuoteRec.getFieldValue('entity');

                                if (lineContactIsInactive != 'T' && lineContactCompany == currQuoteCompany)
                                    currQuoteRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', oldItemsList[k].LineContact);
                            }

                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7startdate', oldItemsList[k].StartDate);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7enddate', oldItemsList[k].EndDate);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7translicenselink', oldItemsList[k].License);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', oldItemsList[k].Lid);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7createdfromra', oldItemsList[k].CreatedFrom);
                            currQuoteRec.setCurrentLineItemValue('item', 'job', oldItemsList[k].Job);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', oldItemsList[k].RenewalBaseTermDays);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7iscotermline', oldItemsList[k].IsCoTerm);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7eventmaster', oldItemsList[k].EventMaster);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_ava_shiptousecode', oldItemsList[k].ShipToEntity);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', oldItemsList[k].CreatedFromRaLineId);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7_monthlydatalimit_gb', oldItemsList[k].MonthlyDataLimit);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_start_date_so_line', oldItemsList[k].RevStartDate);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_end_date_so_line', oldItemsList[k].RevEndDate);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_key', oldItemsList[k].ReferenceIdKey);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_rap7_so_imp_amt', oldItemsList[k].SoImport);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7_so_import_rate', oldItemsList[k].SoImportRate);
                            currQuoteRec.commitLineItem('item');
                        }
                    }
                }
            }
        }

        //nlapiSubmitRecord(currQuoteRec, true, true);

        //If there is one or more Item Groups, get original data for item group columns
        if (hasArmItemGroup) {
            var counter = 0;

            //currQuoteRec = nlapiLoadRecord(rec_type, rec_id, { recordmode: 'dynamic' });
            itemsCount = currQuoteRec.getLineItemCount('item');
            nlapiLogExecution('DEBUG', 'Item Group(s) found on item list. Attempting to update item group lines.');

            if (itemsCount > 0) {
                var skipGroupLine = false;

                for (var m = 1; m <= itemsCount; m++) {
                    var itemId = currQuoteRec.getLineItemValue('item', 'item', m);
                    var checkItemType = currQuoteRec.getLineItemValue('item', 'itemtype', m);
                    var checkInGroup = currQuoteRec.getLineItemValue('item', 'ingroup', m);

                    //Item Group Header
                    if (checkItemType == 'Group') {
                        nlapiLogExecution('DEBUG', 'Header - line ' + m + ', item ID ' + itemId);

                        //Check if this group existed before and was skipped
                        for (var x = 0; x < oldItemsList.length; x++) {
                            if (itemId == oldItemsList[x].ItemId && oldItemsList[x].ItemType == 'Group') {
                                nlapiLogExecution('DEBUG', 'Group header found in oldItemsList, oldItemList item ID ' + oldItemsList[x].ItemId);
                                skipGroupLine = true;
                                break;
                            }
                        }

                        continue;
                    }

                    //Item Group Line
                    else if (checkInGroup == 'T' && checkItemType != 'Group' && checkItemType != 'EndGroup') {
                        nlapiLogExecution('DEBUG', 'Group line! Line ' + m + ' item ID ' + itemId);

                        if (skipGroupLine) {
                            nlapiLogExecution('DEBUG', 'skipping group line');
                            continue;
                        }

                        else {
                            nlapiLogExecution('DEBUG', 'updating group line');
                            //Incrementing counter to find the next (old) item group
                            for (var n = counter; n < oldItemsList.length; n++) {
                                if (oldItemsList[n].SkipLine == true || oldItemsList[n].ItemIsInactive == 'T' || oldItemsList[n].ArmItemType != 'Group') {
                                    counter++;
                                }
                                else
                                    break;
                            }

                            currQuoteRec.selectLineItem('item', m);
                            currQuoteRec.setCurrentLineItemValue('item', 'price', oldItemsList[counter].PriceLevel);

                            var armPricingLine = nlapiLookupField('item', itemId, 'custitem_arm_upgrade_pricing_line');
                            if (armPricingLine == 'T') {
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7itemrateprediscount', oldItemsList[counter].ItemRate);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7amountdiscountinline', oldItemsList[counter].Discount);
                                currQuoteRec.setCurrentLineItemValue('item', 'rate', oldItemsList[counter].Rate);
                                //currQuoteRec.setCurrentLineItemValue('item', 'amount', oldItemsList[counter].Amount);
                                currQuoteRec.setCurrentLineItemValue('item', 'taxcode', oldItemsList[counter].TaxCode);
                                currQuoteRec.setCurrentLineItemValue('item', 'taxrate1', oldItemsList[counter].TaxRate1);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', oldItemsList[counter].AmountRenewalTotal);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalcotermline', oldItemsList[counter].AmountRenewalCoTerm);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', oldItemsList[counter].AmountRenewalMultiyear);
                                currQuoteRec.setCurrentLineItemValue('item', 'custcolr7acvamount', oldItemsList[counter].RenewalAcvAmount);
                            }

                            else {
                                currQuoteRec.setCurrentLineItemValue('item', 'rate', 0);
                                //currQuoteRec.setCurrentLineItemValue('item', 'amount', 0);
                            }

                            currQuoteRec.setCurrentLineItemValue('item', 'class', oldItemsList[counter].Class);
                            currQuoteRec.setCurrentLineItemValue('item', 'location', oldItemsList[counter].Location);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7parentaclid', oldItemsList[counter].ACL);
                            currQuoteRec.setCurrentLineItemValue('item', 'options', oldItemsList[counter].ProductKey);

                            //Check if Line Contact is inactive or belongs to a different account
                            if (oldItemsList[counter].LineContact != null && oldItemsList[counter].LineContact != '') {
                                var lineContactIsInactive = nlapiLookupField('contact', oldItemsList[counter].LineContact, 'isinactive');
                                var lineContactCompany = nlapiLookupField('contact', oldItemsList[counter].LineContact, 'company');
                                var currQuoteCompany = currQuoteRec.getFieldValue('entity');

                                if (lineContactIsInactive != 'T' && lineContactCompany == currQuoteCompany)
                                    currQuoteRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', oldItemsList[counter].LineContact);
                            }

                            currQuoteRec.setCurrentLineItemDateTimeValue('item', 'custcolr7startdate', oldItemsList[counter].StartDate);
                            currQuoteRec.setCurrentLineItemDateTimeValue('item', 'custcolr7enddate', oldItemsList[counter].EndDate);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7translicenselink', oldItemsList[counter].License);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', oldItemsList[counter].Lid);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7createdfromra', oldItemsList[counter].CreatedFrom);
                            currQuoteRec.setCurrentLineItemValue('item', 'job', oldItemsList[counter].Job);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', oldItemsList[counter].RenewalBaseTermDays);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7iscotermline', oldItemsList[counter].IsCoTerm);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7eventmaster', oldItemsList[counter].EventMaster);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_ava_shiptousecode', oldItemsList[counter].ShipToEntity);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7_monthlydatalimit_gb', oldItemsList[counter].MonthlyDataLimit);
                            currQuoteRec.setCurrentLineItemDateTimeValue('item', 'custcol_start_date_so_line', oldItemsList[counter].RevStartDate);
                            currQuoteRec.setCurrentLineItemDateTimeValue('item', 'custcol_end_date_so_line', oldItemsList[counter].RevEndDate);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_key', oldItemsList[counter].ReferenceIdKey);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcol_rap7_so_imp_amt', oldItemsList[counter].SoImport);
                            currQuoteRec.setCurrentLineItemValue('item', 'custcolr7_so_import_rate', oldItemsList[counter].SoImportRate);
                            currQuoteRec.commitLineItem('item');

                            nlapiLogExecution('DEBUG', 'Group Item Line ' + m + ' itemID ' + itemId + ' updated, counter at ' + counter);
                        }
                    }

                    //Item Group Footer
                    else if (checkInGroup == 'T' && checkItemType == 'EndGroup') {
                        nlapiLogExecution('DEBUG', 'Footer - line ' + m);

                        if (skipGroupLine)
                            skipGroupLine = false;
                        else
                            counter++;
                    }

                    //Non-Group Item
                    else {
                        nlapiLogExecution('DEBUG', 'Non-Group line, line ' + m);
                        continue;
                    }
                }
            }
        }

        if (hasSkipItemGroup)
            currQuoteRec.setFieldValue('custbody_arm_item_replace_error', 'Item Group found. Skipped replacement.');

        //Update Arm Item Update Date to indicate Mass Update has processed the record
        var today = new Date()
        today.setTime(today.getTime() + (3 * 60 * 60 * 1000)); //3 hour adjustment for Eastern timezone

        var date = nlapiDateToString(today, 'datetimetz');
        currQuoteRec.setDateTimeValue('custbody_r7_arm_item_update_date', date, 14); //Eastern timezone

        nlapiSubmitRecord(currQuoteRec, true, true);
    }

    catch (error) {
        if (error instanceof nlobjError) {
            var msg = '';
            msg += 'Record Id: ' + rec_id + '\n';
            msg += 'Code: ' + error.getCode() + '\n';
            msg += 'Details: ' + error.getDetails() + '\n';

            nlapiLogExecution('ERROR', 'Error Updating Quote', msg);
        }
        else {
            var msg = '';
            msg += 'Record Id: ' + rec_id + '\n';
            msg += 'Error: ' + error.toString() + '\n';

            nlapiLogExecution('ERROR', 'Error Updating Quote', msg);
        }
    }
}