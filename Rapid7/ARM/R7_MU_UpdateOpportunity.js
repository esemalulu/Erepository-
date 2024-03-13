/*
 * Author: Sa Ho (RSM US)
 * Date: 6/5/2017
 * Description: Update Items on Opportunity to use ARM Upgrade Items, if applicable.
 * 
 */

function updateOpportunity(rec_type, rec_id) {
    try {
        nlapiLogExecution('DEBUG', 'Starting Update Opportunity');

        var currOppRec = nlapiLoadRecord(rec_type, rec_id, { recordmode: 'dynamic' });
        var itemsCount = currOppRec.getLineItemCount('item');

        nlapiLogExecution('DEBUG', 'Loading Record Type: ' + rec_type + ', Record ID: ' + rec_id + ', ' + 'Number of items: ' + itemsCount, JSON.stringify(currOppRec));

        //Copy existing items list into an array
        var oldItemsList = [];
        var hasSkipItemGroup = false;
        var hasArmItemGroup = false;

        if (itemsCount > 0) {
            for (var i = 1; i <= itemsCount; i++) {
                nlapiLogExecution('DEBUG', 'Opportunity Item Line: ' + i + ', ItemId ' + currOppRec.getLineItemValue('item', 'item', i));

                var itemData = {
                    'Line': i,
                    'Job': currOppRec.getLineItemValue('item', 'job', i),
                    'ItemId': currOppRec.getLineItemValue('item', 'item', i),
                    'ItemIsInactive': nlapiLookupField('item', currOppRec.getLineItemValue('item', 'item', i), 'isinactive'),
                    'ItemType': currOppRec.getLineItemValue('item', 'itemtype', i),
                    'InGroup': currOppRec.getLineItemValue('item', 'ingroup', i),
                    'ArmItemId': nlapiLookupField('item', currOppRec.getLineItemValue('item', 'item', i), 'custitem_arm_upgrade_item'),
                    'ArmItemType': null,
                    //'Units': currOppRec.getLineItemValue('item', 'units', i),
                    'Quantity': currOppRec.getLineItemValue('item', 'quantity', i),
                    'QtyUnit': currOppRec.getLineItemValue('item', 'custcolr7itemqtyunit', i),
                    'Description': currOppRec.getLineItemValue('item', 'description', i),
                    'PriceLevel': currOppRec.getLineItemValue('item', 'price', i),
                    'ItemRate': currOppRec.getLineItemValue('item', 'custcolr7itemrateprediscount', i),
                    'Discount': currOppRec.getLineItemValue('item', 'custcolr7amountdiscountinline', i),
                    'Rate': currOppRec.getLineItemValue('item', 'rate', i),
                    'Amount': currOppRec.getLineItemValue('item', 'amount', i),
                    'ProductKey': currOppRec.getLineItemValue('item', 'options', i),
                    'StartDate': currOppRec.getLineItemValue('item', 'custcolr7startdate', i),
                    'EndDate': currOppRec.getLineItemValue('item', 'custcolr7enddate', i),
                    'ACL': currOppRec.getLineItemValue('item', 'custcolr7parentaclid', i),
                    'LineContact': currOppRec.getLineItemValue('item', 'custcolr7translinecontact', i),
                    'CreatedFrom': currOppRec.getLineItemValue('item', 'custcolr7createdfromra', i),
                    'Location': currOppRec.getLineItemValue('item', 'location', i),
                    'LicenseIdText': currOppRec.getLineItemValue('item', 'custcolr7translicenseid', i),
                    'ContractRenewal': currOppRec.getLineItemValue('item', 'custcolr7contractrenewal', i),
                    'AmountRenewalTotal': currOppRec.getLineItemValue('item', 'custcolr7opamountrenewalbaseline', i),
                    'AmountRenewalCoTerm': currOppRec.getLineItemValue('item', 'custcolr7opamountrenewalcotermline', i),
                    'AmountRenewalMultiyear': currOppRec.getLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', i),
                    'IsCoTerm': currOppRec.getLineItemValue('item', 'custcolr7iscotermline', i),
                    'RenewalBaseTermDays': currOppRec.getLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', i),
                    'ShipToEntity': currOppRec.getLineItemValue('item', 'custcol_ava_shiptousecode', i),
                    'RenewalAcvAmount': currOppRec.getLineItemValue('item', 'custcolr7acvamount', i),
                    'CreatedFromRaLineId': currOppRec.getLineItemValue('item', 'custcolr7createdfromra_lineid', i),
                    'MonthlyDataLimit': currOppRec.getLineItemValue('item', 'custcolr7_monthlydatalimit_gb', i),
                    'UniqueRevenueGrouping': currOppRec.getLineItemValue('item', 'custcol_r7uniquerevenuegrouping', i),
                    'SkipLine': false
                };

                oldItemsList.push(itemData);
            }

            nlapiLogExecution('DEBUG', 'Old Items Length: ' + oldItemsList.length, JSON.stringify(oldItemsList));

            //Delete existing items list, skip if item is inactive or an item group
            var lineNum = 1;

            for (var j = 1; j <= itemsCount; j++) {
                var itemId = currOppRec.getLineItemValue('item', 'item', lineNum);

                if (itemId != null) {
                    var isInactive = nlapiLookupField('item', itemId, 'isinactive');
                    var itemType = currOppRec.getLineItemValue('item', 'itemtype', lineNum);
                    var inGroup = currOppRec.getLineItemValue('item', 'ingroup', lineNum);

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
                        currOppRec.removeLineItem('item', lineNum);
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
                            itemId = oldItemsList[k].ArmItemId;

                            if (oldItemsList[k].ArmItemType == 'Group')
                                hasArmItemGroup = true;

                            nlapiLogExecution('DEBUG', 'line ' + k + ' oldItemsList[k].ArmItemType updated', JSON.stringify(oldItemsList[k]));
                        }

                        if (itemId != null && itemId != '') {
                            nlapiLogExecution('DEBUG', 'Adding new item line, Item ID ' + itemId);

                            currOppRec.selectNewLineItem('item');
                            currOppRec.setCurrentLineItemValue('item', 'job', oldItemsList[k].Job);
                            currOppRec.setCurrentLineItemValue('item', 'item', itemId);
                            //currOppRec.setCurrentLineItemValue('item', 'units', oldItemsList[k].Units);
                            currOppRec.setCurrentLineItemValue('item', 'quantity', oldItemsList[k].Quantity);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7itemqtyunit', oldItemsList[k].QtyUnit);
                            currOppRec.setCurrentLineItemValue('item', 'description', oldItemsList[k].Description);

                            if (oldItemsList[k].ArmItemType != 'Group') {
                                currOppRec.setCurrentLineItemValue('item', 'price', oldItemsList[k].PriceLevel);
                                currOppRec.setCurrentLineItemValue('item', 'rate', oldItemsList[k].Rate);
                                currOppRec.setCurrentLineItemValue('item', 'amount', oldItemsList[k].Amount);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', oldItemsList[k].AmountRenewalTotal);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalcotermline', oldItemsList[k].AmountRenewalCoTerm);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', oldItemsList[k].AmountRenewalMultiyear);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7acvamount', oldItemsList[k].RenewalAcvAmount);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', oldItemsList[k].CreatedFromRaLineId);
                            }

                            currOppRec.setCurrentLineItemValue('item', 'custcolr7itemrateprediscount', oldItemsList[k].ItemRate);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7amountdiscountinline', oldItemsList[k].Discount);
                            currOppRec.setCurrentLineItemValue('item', 'options', oldItemsList[k].ProductKey);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7startdate', oldItemsList[k].StartDate);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7enddate', oldItemsList[k].EndDate);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7parentaclid', oldItemsList[k].ACL);

                            //Check if Line Contact is inactive or belongs to a different account
                            if (oldItemsList[k].LineContact != null && oldItemsList[k].LineContact != '') {
                                var lineContactIsInactive = nlapiLookupField('contact', oldItemsList[k].LineContact, 'isinactive');
                                var lineContactCompany = nlapiLookupField('contact', oldItemsList[k].LineContact, 'company');
                                var currOppCompany = currOppRec.getFieldValue('entity');

                                if (lineContactIsInactive != 'T' && lineContactCompany == currOppCompany)
                                    currOppRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', oldItemsList[k].LineContact);
                            }

                            //Check if location is empty, fill in default from Opportunity header if empty
                            if (oldItemsList[k].Location == null || oldItemsList[k].Location == '') {
                                currOppRec.setCurrentLineItemValue('item', 'location', currOppRec.getFieldValue('location'));
                            }

                            else
                                currOppRec.setCurrentLineItemValue('item', 'location', oldItemsList[k].Location);

                            currOppRec.setCurrentLineItemValue('item', 'custcolr7createdfromra', oldItemsList[k].CreatedFrom);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', oldItemsList[k].LicenseIdText);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7contractrenewal', oldItemsList[k].ContractRenewal);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7iscotermline', oldItemsList[k].IsCoTerm);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', oldItemsList[k].RenewalBaseTermDays);
                            currOppRec.setCurrentLineItemValue('item', 'custcol_ava_shiptousecode', oldItemsList[k].ShipToEntity);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7_monthlydatalimit_gb', oldItemsList[k].MonthlyDataLimit);
                            currOppRec.setCurrentLineItemValue('item', 'custcol_r7uniquerevenuegrouping', oldItemsList[k].UniqueRevenueGrouping);
                            currOppRec.commitLineItem('item');
                        }
                    }
                }
            }
        }

        //nlapiSubmitRecord(currOppRec, true, true);

        //If there is one or more Item Groups, get original data for item group columns
        if (hasArmItemGroup) {
            var counter = 0;

            //currOppRec = nlapiLoadRecord(rec_type, rec_id, { recordmode: 'dynamic' });
            itemsCount = currOppRec.getLineItemCount('item');
            nlapiLogExecution('DEBUG', 'Item Group(s) found on item list. Attempting to update item group lines.');

            if (itemsCount > 0) {
                var skipGroupLine = false;

                for (var m = 1; m <= itemsCount; m++) {
                    var itemId = currOppRec.getLineItemValue('item', 'item', m);
                    var checkItemType = currOppRec.getLineItemValue('item', 'itemtype', m);
                    var checkInGroup = currOppRec.getLineItemValue('item', 'ingroup', m);

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
                        nlapiLogExecution('DEBUG', 'Group line! Line ' + m + ', item ID ' + itemId);

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

                            currOppRec.selectLineItem('item', m);
                            currOppRec.setCurrentLineItemValue('item', 'price', oldItemsList[counter].PriceLevel);

                            var armPricingLine = nlapiLookupField('item', itemId, 'custitem_arm_upgrade_pricing_line');
                            if (armPricingLine == 'T') {
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7itemrateprediscount', oldItemsList[counter].ItemRate);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7amountdiscountinline', oldItemsList[counter].Discount);
                                currOppRec.setCurrentLineItemValue('item', 'rate', oldItemsList[counter].Rate);
                                currOppRec.setCurrentLineItemValue('item', 'amount', oldItemsList[counter].Amount);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', oldItemsList[counter].AmountRenewalTotal);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalcotermline', oldItemsList[counter].AmountRenewalCoTerm);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7opamountrenewalmultiyearline', oldItemsList[counter].AmountRenewalMultiyear);
                                currOppRec.setCurrentLineItemValue('item', 'custcolr7acvamount', oldItemsList[counter].RenewalAcvAmount);
                            }

                            else {
                                currOppRec.setCurrentLineItemValue('item', 'rate', 0);
                                currOppRec.setCurrentLineItemValue('item', 'amount', 0);
                            }

                            currOppRec.setCurrentLineItemValue('item', 'options', oldItemsList[counter].ProductKey);
                            currOppRec.setCurrentLineItemDateTimeValue('item', 'custcolr7startdate', oldItemsList[counter].StartDate);
                            currOppRec.setCurrentLineItemDateTimeValue('item', 'custcolr7enddate', oldItemsList[counter].EndDate);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7parentaclid', oldItemsList[counter].ACL);

                            //Check if Line Contact is inactive or belongs to a different account
                            if (oldItemsList[counter].LineContact != null && oldItemsList[counter].LineContact != '') {
                                var lineContactIsInactive = nlapiLookupField('contact', oldItemsList[counter].LineContact, 'isinactive');
                                var lineContactCompany = nlapiLookupField('contact', oldItemsList[counter].LineContact, 'company');
                                var currOppCompany = currOppRec.getFieldValue('entity');

                                if (lineContactIsInactive != 'T' && lineContactCompany == currOppCompany)
                                    currOppRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', oldItemsList[counter].LineContact);
                            }

                            currOppRec.setCurrentLineItemValue('item', 'custcolr7createdfromra', oldItemsList[counter].CreatedFrom);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', oldItemsList[counter].CreatedFromRaLineId);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', oldItemsList[counter].LicenseIdText);
                            currOppRec.setCurrentLineItemValue('item', 'location', oldItemsList[counter].Location);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7contractrenewal', oldItemsList[counter].ContractRenewal);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7iscotermline', oldItemsList[counter].IsCoTerm);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7opamtrenewbasetermdaysline', oldItemsList[counter].RenewalBaseTermDays);
                            currOppRec.setCurrentLineItemValue('item', 'custcol_ava_shiptousecode', oldItemsList[counter].ShipToEntity);
                            currOppRec.setCurrentLineItemValue('item', 'custcolr7_monthlydatalimit_gb', oldItemsList[counter].MonthlyDataLimit);
                            currOppRec.setCurrentLineItemValue('item', 'custcol_r7uniquerevenuegrouping', oldItemsList[counter].UniqueRevenueGrouping);
                            currOppRec.commitLineItem('item');

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
            currOppRec.setFieldValue('custbody_arm_item_replace_error', 'Item Group found. Skipped replacement.');

        //Update Arm Item Update Date to indicate Mass Update has processed the record
        var today = new Date()
        today.setTime(today.getTime() + (3 * 60 * 60 * 1000)); //3 hour adjustment for Eastern timezone

        var date = nlapiDateToString(today, 'datetimetz');
        currOppRec.setDateTimeValue('custbody_r7_arm_item_update_date', date, 14); //Eastern timezone

        nlapiSubmitRecord(currOppRec, true, true);
    }

    catch (error) {
        if (error instanceof nlobjError) {
            var msg = '';
            msg += 'Record Id: ' + rec_id + '\n';
            msg += 'Code: ' + error.getCode() + '\n';
            msg += 'Details: ' + error.getDetails() + '\n';

            nlapiLogExecution('ERROR', 'Error Updating Opportunity', msg);
        }
        else {
            var msg = '';
            msg += 'Record Id: ' + rec_id + '\n';
            msg += 'Error: ' + error.toString() + '\n';

            nlapiLogExecution('ERROR', 'Error Updating Opportunity', msg);
        }
    }
}