/**
 * The KO object model for the SRV Service Work Order Operation Lines sublist.
 *
 * Version    Date            Author           Remarks
 * 1.00       12 Dec 2016      Brian Sutter
 *
 */
var SRV_LINETYPE_OPERATION = 1;
var SRV_LINETYPE_PART = 2;
var SRV_LINETYPE_TIMEENTRY = 3;
var SRV_OP_SUBLIST = 'recmachcustrecordsrv_opline_swo';
var SRV_PART_SUBLIST = 'recmachcustrecordsrv_partline_swo';
var SRV_SWO_TIMEENTRY_SUBLIST = 'recmachcustrecordsrv_swo_timeentry_swo';
var SRV_PAYMENTTYPE_WARRANTY = 1;
var SRV_PAYMENTTYPE_CUSTOMER = 2;
var SRV_PAYMENTTYPE_INSURANCE = 3;
var SRV_PAYMENTTYPE_GOODWILL = 4;
var SALESTAX = .07;
var SRV_SWO_STAGE_OPEN = '1';

function SRV_SWOViewModel() {
    /** STATICS AND OBSERVABLES */
    var self = this;
    self.operationLines = ko.observableArray();
    self.selectedOperationLine = ko.observable();
    self.paymenttypeOptions = [];
    self.flatratecodeOptions = [];
    self.faultcodeOptions = [];
    self.itemcat1Options = [];
    self.itemcat2Options = [];
    self.uomOptions = [];
    self.oldOperationLine = null; //Stores which item the selectedOperationLine will replace in the operationLines array when the user cancel the line.
    self.warrantyLaborRate = parseFloat(nlapiGetFieldValue('custpage_srvwarratylaborrate'));
    self.customerLaborRate = parseFloat(nlapiGetFieldValue('custpage_srvcustlaborrate'));
    /** SUBSCRIBERS */
    self.operationLines.subscribe(function () {
        self.updateLaborAndPartsTotals();
    });
    /** TEMPLATES */
//Determines which template will be used for each line.
    self.operationTemplateToUse = function (item) {
        return self.selectedOperationLine() === item ? 'editOpLineTmpl' : 'viewOpLineTmpl';
    };
    /** INITIALIZE */
//When the view model is initialized, create the static lists from the NetSuite account. Then initialize the KO lists with what's in the NS sublists.
    self.initialize = function () {
//Initialize the static lists.
//These are loaded before load and set on a field on the form.
        self.paymenttypeOptions = JSON.parse(nlapiGetFieldValue('custpage_srvpaymenttypes'));
        self.faultcodeOptions = JSON.parse(nlapiGetFieldValue('custpage_srvfaultcodes'));
        self.flatratecodeOptions = JSON.parse(nlapiGetFieldValue('custpage_srvflatratecodes'));
        self.itemcat1Options = JSON.parse(nlapiGetFieldValue('custpage_srvitemcat1'));
        self.itemcat2Options = JSON.parse(nlapiGetFieldValue('custpage_srvitemcat2'));
        self.uomOptions = JSON.parse(nlapiGetFieldValue('custpage_srvuoms'));
        self.serviceTechOptions = JSON.parse(nlapiGetFieldValue('custpage_techoptions'));
//Set values from the sublists.
        self.setLinesFromSublist();
//Update the body fields
        self.updateLaborAndPartsTotals();
    };
//Create the criteria array based on the values in the sublist.
    self.setLinesFromSublist = function () {
//Get the time tracked object
        var timeTracked = JSON.parse(nlapiGetFieldValue('custpage_timetracked'));
        var tempOps = [];
        var allParts = JSON.parse(nlapiGetFieldValue('custpage_srvparts'));
        var allTimeEntries = JSON.parse(nlapiGetFieldValue('custpage_srvtimeentries')); //array of objects
        for (var i = 1; i <= nlapiGetLineItemCount(SRV_OP_SUBLIST); i++) {
            var curOpLineId = nlapiGetLineItemValue(SRV_OP_SUBLIST, 'id', i);
//get the time tracked on this line to set time required field.
            if (timeTracked.hasOwnProperty(curOpLineId))
                var timeTrackedOnThisLine = timeTracked[curOpLineId];
            else
                var timeTrackedOnThisLine = 0;
            var opLineObj = new SRVOperationLine({
                id: curOpLineId,
                sortOrder: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_sortorder', i),
                paymentTypeId: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_paymenttype', i),
                flatRateCodeId: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_code', i),
                faultCodeId: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_faultcode', i),
                itemCat1Id: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_itemcat1', i),
                itemCat2Id: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_itemcat2', i),
                complaint: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_complaint', i),
                cause: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_cause', i),
                correction: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_correction', i),
                manufacturer: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_manufacturer', i),
                modelNumber: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_modelnum', i),
                serialNumber: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_serialnum', i),
                techInfo: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_techinfo', i),
                notes: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_notes', i),
                timeAllowed: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_time', i),
                timeRequired: timeTrackedOnThisLine,
                stage: nlapiGetFieldValue('custrecordsrv_swo_stage'),
                amount: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_amt', i),
                subletAmount: nlapiGetLineItemValue(SRV_OP_SUBLIST, 'custrecordsrv_opline_subletamt', i),
            }, self);
//Get the part lines for this Op Line
            var lockedPartLineIds = JSON.parse(nlapiGetFieldValue('custpage_lockedsrvparts'));
            var tempPartLines = [];
            for (var j = 1; j <= nlapiGetLineItemCount(SRV_PART_SUBLIST); j++) {
                if (curOpLineId == nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_opline', j)) {
                    var itemId = ConvertNSFieldToString(nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_item', j));
                    var itemName = itemId.length > 0 ? allParts[itemId].name : '';
                    var itemUOMType = itemId.length > 0 ? allParts[itemId].uomType : '';
                    var curPartLineId = nlapiGetLineItemValue(SRV_PART_SUBLIST, 'id', j);
                    tempPartLines.push(new SRVPartLine({
                        id: curPartLineId,
                        sortOrder: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_sortorder', j),
                        item: new SRVItem({
                            id: itemId,
                            name: itemName,
                            uomType: itemUOMType,
                            basePrice: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_rate', j),
                            isDiscount: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_isdiscount', j) == 'T'
                        }),
                        uomId: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_uom', j),
                        description: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_desc', j),
                        quantity: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_qty', j),
                        rate: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_rate', j),
                        amount: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_amt', j),
                        isVCB: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_isvcb', j) == 'T',
                        notes: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_notes', j),
                        paymentTypeId: nlapiGetLineItemValue(SRV_PART_SUBLIST, 'custrecordsrv_partline_paymenttype', j),
                        isLocked: lockedPartLineIds.indexOf(curPartLineId) > -1
                    }, opLineObj));
                }
            }
//Add the part lines to the opLineObj
            tempPartLines.sort(function (a, b) {
                return a.sortOrder - b.sortOrder;
            });
            opLineObj.partLines(tempPartLines);
//Get the time entry lines for this Op Line.
            var tempTimeEntries = [];
            for (var j = 0; j < allTimeEntries.length; j++) {
                if (curOpLineId == allTimeEntries[j].opLine) {
                    tempTimeEntries.push(new SRVTimeEntry({
                        id: allTimeEntries[j].id,
                        tech: allTimeEntries[j].tech,
                        time: allTimeEntries[j].time,
                        dateCreated: allTimeEntries[j].dateCreated,
                    }, opLineObj));
                }
            }
            opLineObj.timeEntries(tempTimeEntries);
//Add the op line to the array for the parent view model.
            tempOps.push(opLineObj);
        }
        tempOps.sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
        });
        self.operationLines(tempOps);
    };
    /** BUTTON FUNCTIONS */
    self.editOpLine = function (item) {
        if (!self.canSubmitOpLine()) return;
        self.oldOperationLine = item;
//Duplicate the item for the new line and insert it in the old item's position.
        var copiedItem = self.copyOperationLine(item);
        self.operationLines.replace(item, copiedItem);
        self.selectedOperationLine(copiedItem);
    };
    self.cancelOpLine = function () {
//Reset the old criteria value in the array.
        if (self.oldOperationLine)
            self.operationLines.replace(self.selectedOperationLine(), self.oldOperationLine);
        else
            self.operationLines.remove(self.selectedOperationLine());
        self.selectedOperationLine(null);
    };
    self.addOpLine = function () {
        if (!self.canSubmitOpLine()) return;
        self.oldOperationLine = null;
        var newItem = new SRVOperationLine(null, self);
        self.selectedOperationLine(newItem);
        self.operationLines.push(newItem);
    };
    self.removeOpLine = function (item) {
        self.operationLines.remove(item);
    };
    self.saveOpLine = function (item) {
        if (!self.canSubmitOpLine()) return false;
        self.selectedOperationLine(null);
        return true;
    };
    self.configureOpLine = function (item) {
//Open the popup with the currently selected item.
        var popupWidth = parseInt(window.innerWidth * .9);
        var popupHeight = parseInt(window.innerHeight * .8);
      var marginX = parseInt(window.innerWidth * .05);
        var marginY = parseInt(window.innerHeight * .1);
        ss$('#modal-opline').dialog({
            position: {
                my: 'left+' + marginX + ' top+' + marginY,                 
                       of: window
                    },
            draggable: true,
            resizeable: true,
            width: popupWidth,
            height: popupHeight,
            minWidth: popupWidth * .8,
            minHeight: popupHeight * .8,
            modal: true,
            dialogClass: 'srvdialog',
            open: function (event, ui) {
//Add the close icon
                ss$('.ui-dialog-titlebar-close').css('display', 'none');
//Make the lists part of the popup so they don't appear behind the popup.
                ss$('ul.ui-menu.ui-widget.ui-widget-content.ui-autocomplete.ui-front').prependTo('#modal-opline');
            },
            beforeClose: function (event, ui) {
            }
        });
    };
    /** POPUP FUNCTIONS */
//Closes the popup and sticks the old data back into the operation lines.
    self.cancelPopup = function () {
        self.cancelOpLine();
        ss$('.ui-dialog-titlebar-close').click();
    };
//Closes the popup and remove the selected popup operation line
    self.savePopup = function () {
        if (!self.canSubmitPopup()) return false;
        self.selectedOperationLine(null);
        ss$('.ui-dialog-titlebar-close').click();
        return true;
    };
    //Before we let the user submit the popup, make sure the part line and body fields are valid.
    self.canSubmitPopup = function () {
        if (!self.selectedOperationLine().canSave()) return false; // check body fields
        //check part lines
        for (var i = 0; i < self.selectedOperationLine().partLines().length; i++) {
            var curPartLine = self.selectedOperationLine().partLines()[i];
            if (!curPartLine.canSave()) return false;
        }
        //check time entries
        for (var i = 0; i < self.selectedOperationLine().timeEntries().length; i++) {
            var curTimeEntry = self.selectedOperationLine().timeEntries()[i];
            if (!curTimeEntry.canSave()) return false;
        }
        return true;
    };
    /** VALIDATOR FUNCTIONS */
    //Try to submit the current line.
    self.canSubmitOpLine = function () {
        //Before the edit, make sure they can save a previous line if they were editing one.
        if (self.selectedOperationLine()) {
            return self.selectedOperationLine().canSave();
        }
        return true;
    };
    //Returns whether or not the VM can be submitted.
    self.saveRecord = function () {
        if (!self.canSubmitOpLine()) return false;
        nlapiSetFieldValue('custpage_srvkodata', JSON.stringify(self.getJSSelf()));
        return true;
    };
    /** UTILITIES **/
    //Performs a deep copy of an Operation Line, including the parts lines
    self.copyOperationLine = function (itemNotJS) {
        var item = ko.toJS(itemNotJS);
        var newOpLine = new SRVOperationLine({
            id: item.id,
            paymentTypeId: item.selectedPaymentType ? item.selectedPaymentType.id : null,
            sortOrder: item.sortOrder,
            flatRateCodeId: item.selectedFlatRateCode ? item.selectedFlatRateCode.id : null,
            faultCodeId: item.selectedFaultCode ? item.selectedFaultCode.id : null,
            itemCat1Id: item.selectedItemCat1 ? item.selectedItemCat1.id : null,
            itemCat2Id: item.selectedItemCat2 ? item.selectedItemCat2.id : null,
            complaint: item.complaint,
            cause: item.cause,
            correction: item.correction,
            manufacturer: item.manufacturer,
            modelNumber: item.modelNumber,
            serialNumber: item.serialNumber,
            techInfo: item.techInfo,
            notes: item.notes,
            timeAllowed: item.timeAllowed,
            timeRequired: item.timeRequired,
            stage: item.stage,
            amount: item.amount,
            subletAmount: item.subletAmount,
            partLines: null,
            timeEntries: null,
        }, self);
//Create the part lines
        var tempPartLines = [];
        ss$.each(itemNotJS.partLines(), function (idx, curPartLine) {
            tempPartLines.push(new SRVPartLine({
                id: curPartLine.id,
                item: curPartLine.item(),
                uomId: curPartLine.selectedUOM() ? curPartLine.selectedUOM().id : null,
                description: curPartLine.description(),
                quantity: curPartLine.quantity(),
                rate: curPartLine.rate(),
                amount: curPartLine.amount(),
                isVCB: curPartLine.isVCB(),
                notes: curPartLine.notes(),
                isLocked: curPartLine.isLocked(),
                paymentTypeId: curPartLine.paymentTypeId()
            }, newOpLine));
        });
        newOpLine.partLines(tempPartLines);
//Create the time entries
        var tempTimeEntries = [];
        ss$.each(itemNotJS.timeEntries(), function (idx, curTimeEntry) {
            tempTimeEntries.push(new SRVTimeEntry({
                id: curTimeEntry.id,
                dateCreated: curTimeEntry.dateCreated(),
                tech: curTimeEntry.tech(),
                time: curTimeEntry.time()
            }, newOpLine));
        });
        newOpLine.timeEntries(tempTimeEntries);
        return newOpLine;
    };
//Updates the fields in the Totals section of the page.
    self.updateLaborAndPartsTotals = function () {
        var laborTotal = 0;
        var subletTotal = 0;
        var partsTotal = 0;
        var warrantyPay = 0;
        var customerPay = 0;
        ss$.each(self.operationLines(), function (idx, curOpLine) {
            if (curOpLine.selectedPaymentType()) {
                var paymentType = curOpLine.selectedPaymentType().id;
                var amount = ConvertNSFieldToFloat(curOpLine.amount());
                var subletAmount = ConvertNSFieldToFloat(curOpLine.subletAmount());
                laborTotal += amount;
                subletTotal += subletAmount;
                if (paymentType == SRV_PAYMENTTYPE_WARRANTY || paymentType == SRV_PAYMENTTYPE_GOODWILL) {
                    warrantyPay += amount + subletAmount;
                } else {
                    customerPay += amount + subletAmount;
                }
                ss$.each(curOpLine.partLines(), function (idx, curPartLine) {
                    var partAmount = ConvertNSFieldToFloat(curPartLine.amount());
                    partsTotal += partAmount;
                    if (paymentType == SRV_PAYMENTTYPE_WARRANTY || paymentType == SRV_PAYMENTTYPE_GOODWILL) {
                        warrantyPay += partAmount;
                    } else {
                        customerPay += partAmount;
                    }
                });
            }
        });
//Calculate taxes
        var customerTax = partsTotal * SALESTAX;
//Update the body fields.
        nlapiSetFieldValue('custrecordsrv_swo_totallabor', laborTotal.toFixed(2));
        nlapiSetFieldValue('custrecordsrv_swo_sublettotal', subletTotal.toFixed(2));
        nlapiSetFieldValue('custrecordsrv_swo_totalparts', partsTotal.toFixed(2));
        nlapiSetFieldValue('custrecordsrv_swo_totaltax', customerTax.toFixed(2));
        nlapiSetFieldValue('custrecordsrv_swo_totalamount', (warrantyPay + customerPay + customerTax).toFixed(2));
        nlapiSetFieldValue('custrecordsrv_swo_warrantypay', warrantyPay.toFixed(2));
        nlapiSetFieldValue('custrecordsrv_swo_customerpay', (customerPay + customerTax).toFixed(2));
    };
//Gets a plain JS version of this view model with no dependencies
    self.getJSSelf = function () {
//Convert the current view model to JS so we can loop over the operationLines list and set the parent references to null.
//If we don't set the .parent to null, we get a "Converting circular structure to JSON" error
        var selfJS = ko.toJS(self);
        for (var i = 0; i < selfJS.operationLines.length; i++) {
            selfJS.operationLines[i].parent = null;
            selfJS.operationLines[i].oldPartLine = null;
            selfJS.operationLines[i].oldTimeEntry = null;
            for (var j = 0; j < selfJS.operationLines[i].partLines.length; j++) {
                selfJS.operationLines[i].partLines[j].parent = null;
            }
            for (var j = 0; j < selfJS.operationLines[i].timeEntries.length; j++) {
                selfJS.operationLines[i].timeEntries[j].parent = null;
            }
        }
//Set the old operation line to empty. This also causes a circular reference
        selfJS.oldOperationLine = null;
        return selfJS;
    };
//Returns whether or not this SWO has any Operations that are marked as Customer/Insurance.
    self.hasCustomerLines = function () {
        var hasCustomerLines = false;
        ss$.each(self.operationLines(), function (idx, curOpLine) {
            if (curOpLine.selectedPaymentType()) {
                var paymentType = curOpLine.selectedPaymentType().id;
                if (paymentType == SRV_PAYMENTTYPE_CUSTOMER || paymentType == SRV_PAYMENTTYPE_INSURANCE) {
                    hasCustomerLines = true;
                    return;
                }
            }
        });
        return hasCustomerLines;
    };
}

/**
 * Represents a single line on the Operation Lines sublist.
 */
function SRVOperationLine(data, parent) {
    /** STATICS AND OBSERVABLES */
    var self = this;
    self.parent = parent;
    self.type = SRV_LINETYPE_OPERATION;
    self.id = data ? data.id : null;
    self.sortOrder = data ? data.sortOrder : 0; //only used on load
//Observable dropdowns
    self.selectedPaymentType = ko.observable(data ? ko.utils.arrayFirst(self.parent.paymenttypeOptions, function (item) {
            return item.id == data.paymentTypeId;
        }) : null
    );
    self.selectedFlatRateCode = ko.observable(data ? ko.utils.arrayFirst(self.parent.flatratecodeOptions, function (item) {
            return item.id == data.flatRateCodeId;
        }) : null
    );
    self.selectedFaultCode = ko.observable(data ? ko.utils.arrayFirst(self.parent.faultcodeOptions, function (item) {
            return item.id == data.faultCodeId;
        }) : null
    );
    self.selectedItemCat1 = ko.observable(data ? ko.utils.arrayFirst(self.parent.itemcat1Options, function (item) {
            return item.id == data.itemCat1Id;
        }) : null
    );
    self.selectedItemCat2 = ko.observable(data ? ko.utils.arrayFirst(self.parent.itemcat2Options, function (item) {
            return item.id == data.itemCat2Id;
        }) : null
    );
//Observables for text boxes and numerics
    self.complaint = ko.observable(data ? data.complaint : '');
    self.cause = ko.observable(data ? data.cause : '');
    self.correction = ko.observable(data ? data.correction : '');
    self.manufacturer = ko.observable(data ? data.manufacturer : '');
    self.modelNumber = ko.observable(data ? data.modelNumber : '');
    self.serialNumber = ko.observable(data ? data.serialNumber : '');
    self.techInfo = ko.observable(data ? data.techInfo : '');
    self.notes = ko.observable(data ? data.notes : '');
    self.timeAllowed = ko.observable(data ? data.timeAllowed : '');
    self.timeRequired = ko.observable(data ? data.timeRequired : '');
    self.stage = ko.observable(data ? data.stage : '');
    self.amount = ko.observable(data ? data.amount : 0);
    self.subletAmount = ko.observable(data ? data.subletAmount : '');
//Observables for the list of part lines.
    self.partLines = ko.observableArray(data ? data.partLines : []);
    self.selectedPartLine = ko.observable();
    self.oldPartLine = null;
//Observables for the list of time entries.
    self.timeEntries = ko.observableArray(data ? data.timeEntries : []);
    self.selectedTimeEntry = ko.observable();
    self.oldTimeEntry = null;
//Computed
    self.requiresSerial = ko.computed(function () {
        return (self.selectedFlatRateCode() && self.selectedFlatRateCode().serialReq);
    });
//	self.lockTimeAllowed = ko.computed(function() {
//		return (self.stage() != SRV_SWO_STAGE_OPEN);
//	});
    self.lockPaymentType = ko.computed(function () {
//Don't let them change the payment type if any of the part lines are locked.
        return self.partLines() && self.partLines().length > 0 && self.partLines().find(function (e) {
            return e.isLocked();
        });
    });
    self.hasDiscountLine = ko.computed(function () {
        if (self.partLines()) {
            for (var i = 0; i < self.partLines().length; i++) {
                if (self.partLines()[i].item().isDiscount)
                    return true;
            }
        }
        return false;
    });
    self.canHaveDiscountLine = ko.computed(function () {
        if (self.selectedPaymentType())
            return (self.selectedPaymentType().id != SRV_PAYMENTTYPE_WARRANTY && self.selectedPaymentType().id != SRV_PAYMENTTYPE_GOODWILL);
        else
            return true;
    });
    /** SUBSCRIBERS */
//Update the totals when the amounts change
    self.amount.subscribe(function () {
        self.parent.updateLaborAndPartsTotals();
    });
    self.subletAmount.subscribe(function () {
        self.parent.updateLaborAndPartsTotals();
    });
//Update the rate of all child part lines before updating the amount.
    self.selectedPaymentType.subscribe(function () {
        self.updateAmount();
        ss$.each(self.partLines(), function (idx, curPartLine) {
            curPartLine.updateRate();
        });
        self.parent.updateLaborAndPartsTotals();
    });
//Update the hours to be the default hours on the flat rate code.
    self.selectedFlatRateCode.subscribe(function () {
        self.timeAllowed(self.selectedFlatRateCode() ? self.selectedFlatRateCode().timeAllowed : 0);
    });
//Update the amount when they change the time.
    self.timeAllowed.subscribe(function () {
        self.updateAmount();
    });
    /** TEMPLATES */
//Determines how to display the part lines in the HTML
    self.operationPartTemplateToUse = function (item) {
        if (item.partLines() == null || item.partLines().length == 0) {
            return 'blankHeaderTmpl';
        }
        return 'partHeaderTmpl';
    };
//Determines how to display the time entries in the HTML
    self.operationTimeEntryTemplateToUse = function (item) {
        if (item.timeEntries() == null || item.timeEntries().length == 0) {
            return 'blankHeaderTmpl';
        }
        return 'timeEntryHeaderTmpl';
    };
//Determine the part line template to use in the popup.
    self.popupPartTemplateToUse = function (item) {
        var template = self.selectedPartLine() === item ? 'editPartPopupTmpl' : 'viewPartPopupTmpl';
        return template;
    };
//Determine the part line template to use in the popup.
    self.popupTimeEntryTemplateToUse = function (item) {
        var template = self.selectedTimeEntry() === item ? 'editTimeEntryPopupTmpl' : 'viewTimeEntryPopupTmpl';
        return template;
    };
    /** POPUP BUTTON FUNCTIONS */
    self.editPartLine = function (item) {
        if (!self.canSubmitPartLine()) return;
        self.oldPartLine = item;
//Duplicate the item for the new line and insert it in the old item's position.
        var copiedItem = self.copyPartLine(item);
        self.partLines.replace(item, copiedItem);
        self.selectedPartLine(copiedItem);
    };
    self.cancelPartLine = function () {
//Reset the old criteria value in the array.
        if (self.oldPartLine)
            self.partLines.replace(self.selectedPartLine(), self.oldPartLine);
        else
            self.partLines.remove(self.selectedPartLine());
        self.selectedPartLine(null);
    };
    self.addPartLine = function () {
        if (!self.canSubmitPartLine()) return;
        self.oldPartLine = null;
        var newItem = new SRVPartLine(null, self);
        self.selectedPartLine(newItem);
        self.partLines.push(newItem);
    };
    self.removePartLine = function (item) {
        self.partLines.remove(item);
    };
    self.savePartLine = function (item) {
        if (!self.canSubmitPartLine()) return false;
        self.selectedPartLine(null);
        return true;
    };
    self.editTimeEntry = function (item) {
        if (!self.canSubmitTimeEntry()) return;
        self.oldTimeEntry = item;
//Duplicate the item for the new line and insert it in the old item's position.
        var copiedItem = self.copyTimeEntry(item);
        self.timeEntries.replace(item, copiedItem);
        self.selectedTimeEntry(copiedItem);
    };
    self.cancelTimeEntry = function () {
//Reset the old criteria value in the array.
        if (self.oldTimeEntry)
            self.timeEntries.replace(self.selectedTimeEntry(), self.oldTimeEntry);
        else
            self.timeEntries.remove(self.selectedTimeEntry());
//unselect the current time entry
        self.selectedTimeEntry(null);
//update time required
        self.updateTimeRequired()
    };
    self.addTimeEntry = function () {
        if (!self.canSubmitTimeEntry()) return;
        self.oldTimeEntry = null;
        var newItem = new SRVTimeEntry({
            dateCreated: nlapiDateToString(new Date(), 'date')
        }, self);
        self.selectedTimeEntry(newItem);
        self.timeEntries.push(newItem);
    };
    self.removeTimeEntry = function (item) {
        self.timeEntries.remove(item);
        self.updateTimeRequired()
    };
    self.saveTimeEntry = function (item) {
        if (!self.canSubmitTimeEntry()) return false;
        self.selectedTimeEntry(null);
        return true;
    };
    /** FILTER DROP DOWNS */
//Filters the flat rate code by the selected Item Category 1 and 2
    self.filteredFlatRateCodes = ko.computed(function () {
        if (self.selectedItemCat1()) {
            return self.parent.flatratecodeOptions.filter(function (val) {
                if (self.selectedItemCat2() && val.itemCat2 != self.selectedItemCat2().id) {
                    return false;
                }
                return val.itemCat1 == self.selectedItemCat1().id;
            });
        }
        return self.parent.flatratecodeOptions;
    });
//Filter the item cat 2 options by the selected Item Category 1
    self.filteredItemCat2 = ko.computed(function () {
        if (self.selectedItemCat1()) {
            return self.parent.itemcat2Options.filter(function (val) {
                return val.itemCat1 == self.selectedItemCat1().id;
            });
        }
        return self.parent.itemcat2Options;
    });
    /** VALIDATOR FUNCTIONS */
//Try to submit the current part line.
    self.canSubmitPartLine = function () {
//Before the edit, make sure they can save a previous line if they were editing one.
        if (self.selectedPartLine()) {
            return self.selectedPartLine().canSave();
        }
        return true;
    };
//Try to submit the current time entry.
    self.canSubmitTimeEntry = function () {
//Before the edit, make sure they can save a previous line if they were editing one.
        if (self.selectedTimeEntry()) {
            return self.selectedTimeEntry().canSave();
        }
        return true;
    };
//Returns whether or not this operation line is okay to save.
    self.canSave = function () {
        if (!self.selectedPaymentType()) {
            alert('Enter a value for Payment Type');
            return false;
        } else if (!self.selectedFlatRateCode()) {
            alert('Enter a value for Flat Rate Code');
            return false;
        } else if (!self.selectedFaultCode()) {
            alert('Enter a value for Fault Code');
            return false;
        } else if (!self.complaint() || self.complaint().length < 1) {
            alert('Enter a value for Complaint');
            return false;
        } else if (!self.cause() || self.cause().length < 1) {
            alert('Enter a value for Cause');
            return false;
        } else if (!self.correction() || self.correction().length < 1) {
            alert('Enter a value for Correction');
            return false;
        } else if (!self.timeAllowed() || self.timeAllowed().length < 1 || isNaN(self.timeAllowed())) {
            alert('Enter a value for Time Allowed. It must be a number');
            return false;
        } else if (!self.amount() || self.amount().length < 1 || isNaN(self.amount())) {
            alert('Enter a value for Amount. It must be a number');
            return false;
        } else if (self.subletAmount() && isNaN(self.subletAmount())) {
            alert('Sublet Amount must be a number.');
            return false;
        } else if (self.requiresSerial() && (!self.manufacturer() || self.manufacturer().length == 0)) {
            alert('Enter a value for Manufacturer.');
            return false;
        } else if (self.requiresSerial() && (!self.modelNumber() || self.modelNumber().length == 0)) {
            alert('Enter a value for Model.');
            return false;
        } else if (self.requiresSerial() && (!self.serialNumber() || self.serialNumber().length == 0)) {
            alert('Enter a value for Serial Number.');
            return false;
        } else if (self.hasDiscountLine() && !self.canHaveDiscountLine()) {
            alert('Operation Lines with payment type Warranty or Goodwill cannot have a Part Line with discount items.');
            return false;
        }
        ;
        return true;
    };
    /** UTILITIES */
//Copies a Part Line.
    self.copyPartLine = function (itemNotJS) {
        var item = ko.toJS(itemNotJS);
        var newPartLine = new SRVPartLine({
            id: item.id,
            item: item.item,
            uomId: item.selectedUOM ? item.selectedUOM.id : null,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            isVCB: item.isVCB,
            notes: item.notes,
            isLocked: item.isLocked,
            paymentTypeId: item.paymentTypeId
        }, self);
        return newPartLine;
    };
//Copies a Time Entry.
    self.copyTimeEntry = function (itemNotJS) {
        var item = ko.toJS(itemNotJS);
        var newTimeEntry = new SRVTimeEntry({
            id: item.id,
            dateCreated: item.dateCreated,
            tech: item.tech,
            time: item.time
        }, self);
        return newTimeEntry;
    };
//Updates the amount for this Op line based on the hours, labor rate, and payment type
    self.updateAmount = function () {
//Make sure the payment type and hours are set.
        var payType = self.selectedPaymentType() ? self.selectedPaymentType().id : 0;
        if (isNaN(self.timeAllowed()) || payType == 0) {
            self.amount('0.00');
            return;
        }
//Update the amount
        if (payType == SRV_PAYMENTTYPE_CUSTOMER || payType == SRV_PAYMENTTYPE_INSURANCE) {
            self.amount((ConvertNSFieldToFloat(self.timeAllowed()) * self.parent.customerLaborRate).toFixed(2));
        } else {
            self.amount((ConvertNSFieldToFloat(self.timeAllowed()) * self.parent.warrantyLaborRate).toFixed(2));
        }
    };
//Update Time Required with the sum of the time tracked on the operation lines.
    self.updateTimeRequired = function () {
        var timeTotal = 0;
        ss$.each(self.timeEntries(), function (idx, curTimeEntry) {
            if (curTimeEntry.time()) {
                var time = ConvertNSFieldToFloat(curTimeEntry.time());
                timeTotal += time;
            }
        });
//toFixed deals with floating point imprecision (for example, 4.300000000000001), and parseFloat removes trailing zeros.
        timeTotal = parseFloat(timeTotal.toFixed(2));
        self.timeRequired(timeTotal);
    }
}

/**
 * Represents a single line on the Parts Lines sublist.
 * Has a parent of the Operation Line and the Service Work Order.
 */
function SRVPartLine(data, parent) {
    /** STATICS AND OBSERVABLES */
    var self = this;
    self.parent = parent;
    self.type = SRV_LINETYPE_PART;
    self.id = data ? data.id : null;
    self.sortOrder = data ? data.sortOrder : 0; //only used on load
    self.isPaymentTypeOverridden = !!data?.paymentTypeId;
    // Get the selected payment type from the parent.
    var parentPaymentType = self.parent.selectedPaymentType();
    console.log(data);
    var paymentTypeId = data ? (parseInt(data.paymentTypeId) ? parseInt(data.paymentTypeId) : parseInt(parentPaymentType.id)) : parseInt(parentPaymentType.id);
    self.paymentTypeId = ko.observable(parseInt(paymentTypeId));
    //data.paymentTypeId = paymentTypeId;
//Observable dropdowns
    self.item = ko.observable(data ? data.item : new SRVItem({id: '', name: '', uomType: '', basePrice: 0}));
    self.selectedUOM = ko.observable(data ? ko.utils.arrayFirst(self.parent.parent.uomOptions, function (item) {
            return item.id == data.uomId;
        }) : null
    );
    self.selectedPaymentType = ko.observable(data ? ko.utils.arrayFirst(self.parent.parent.paymenttypeOptions, function (item) {
            return item.id ==  data.paymentTypeId;
        }) : null
    );
//Observable text boxes and numerics
    self.description = ko.observable(data ? data.description : '');
    self.quantity = ko.observable(data ? data.quantity : '');
    self.rate = ko.observable(data ? data.rate : 0);
// Select Price level based on Payment Type
    self.priceLevel = ko.observable();
    var paymentType = self.selectedPaymentType();
    paymentTypeId = paymentType ? parseInt(paymentType.id) : null;
/*    var parentPaymentType = self.parent.selectedPaymentType();
    var paymentTypeId = parentPaymentType ? parseInt(parentPaymentType.id) : null;*/
    console.log(typeof paymentTypeId, paymentTypeId);
    console.log(typeof SRV_PAYMENTTYPE_CUSTOMER, SRV_PAYMENTTYPE_CUSTOMER);
    console.log(typeof SRV_PAYMENTTYPE_INSURANCE, SRV_PAYMENTTYPE_INSURANCE);
    switch (paymentTypeId) {
        case SRV_PAYMENTTYPE_CUSTOMER:
            self.priceLevel('MSRP 100');
            console.log('Customer');
            break;
        case SRV_PAYMENTTYPE_INSURANCE:
            self.priceLevel('MSRP 200');
            console.log('Insurance');
            break;
        default:
            self.priceLevel('Base Price');
    }
    self.amount = ko.observable(data ? data.amount : '');
    self.isVCB = ko.observable(data ? data.isVCB : false);
    self.notes = ko.observable(data ? data.notes : '');
    self.isLocked = ko.observable(data ? data.isLocked : false);
//Computed fields
    self.selectedUOMText = ko.computed(function () {
        if (self.selectedUOM()) return self.selectedUOM().abbr;
        return '';
    });
    /** SUBSCRIBERS */
//Update the line amount when the qty/rate changes
    self.rate.subscribe(function () {
        self.updateAmount();
    });
    self.quantity.subscribe(function () {
        self.updateAmount();
    });
//Change the rate when the item changes
    self.item.subscribe(function () {
        self.onPartChange();
    });
//Change the rate when the UOM changes
    self.selectedUOM.subscribeChanged(function (newVal, oldVal) {
        self.onUOMChange(newVal, oldVal);
    });
    //Change the rate when the Price Level changes
    self.priceLevel.subscribeChanged(function (newVal, oldVal) {
        switch (self.priceLevel()) {
            case 'MSRP 100':
                self.paymentTypeId(2)
                break
            case 'MSRP 200':
                self.paymentTypeId(3)
                break;
            default:
                self.paymentTypeId(1);
        }
        console.log('priceLevel changed: ', self.paymentTypeId(), data.paymentTypeId);
        self.updateRate();
    });
//Update the totals when the amounts change
    self.amount.subscribe(function () {
        self.parent.parent.updateLaborAndPartsTotals();
    });
    /** FILTER DROP DOWNS */
//Filters the list of all UOMs by the selected item's UOM type
    self.filteredUOMs = ko.computed(function () {
        if (self.item() && self.item().id && self.item().uomType && self.item().uomType.length > 0) {
//filter array by uom type
            return self.parent.parent.uomOptions.filter(function (val) {
                return val.uomType == self.item().uomType;
            });
        }
        return self.parent.parent.uomOptions;
    });
    self.itemPriceLevels = ko.observableArray(['Base Price', 'MSRP 100', 'MSRP 200', 'MSRP 300']);
    /** VALIDATOR FUNCTIONS */
//Returns whether or not this part line can be saved on the popup
    self.canSave = function () {
        if (!self.item() || !self.item().id || self.item().id.length == 0) {
            alert('Enter a value for Item');
            return false;
        } else if (!self.selectedUOM() && !self.item().isDiscount) {
            alert('Enter a value for Units');
            return false;
        } else if (!self.quantity() || self.quantity().length < 1 || isNaN(self.quantity()) || self.quantity() <= 0) {
            alert('Enter a value for Quantity. It must be a positive number.');
            return false;
        } else if (self.rate() == null || self.rate().length < 1 || isNaN(self.rate())) {
            alert('Enter a value for Rate. It must be a number.');
            return false;
        } else if (self.amount() == null || self.amount().length < 1 || isNaN(self.amount())) {
            alert('Enter a value for Amount. It must be a number.');
            return false;
        } else if (self.item().isDiscount && self.rate() >= 0) {
            alert('Enter a value for Rate. It must be a negative number for discount items.');
            return false;
        }
        return true;
    };
    /** UTILITY FUNCTIONS */
//Update the amount on the line to be the rate * quantity
    self.updateAmount = function () {
        var rate = ConvertNSFieldToFloat(self.rate());
        var qty = ConvertNSFieldToFloat(self.quantity());
        if (isNaN(rate) || isNaN(qty)) {
            self.amount(0);
        } else {
            self.amount((rate * qty).toFixed(2));
        }
    };
//Update the rate if the part changed
    self.onPartChange = function () {
        self.updateRate();
    };
//Convert the price to the new UOM.
    self.onUOMChange = function (newVal, oldVal) {
//Get the from and to rates to do the conversion.
        var fromRate = 1;
        if (oldVal != null) {
            fromRate = ConvertNSFieldToFloat(oldVal.convRate);
            if (fromRate == 0) fromRate = 1;
        }
        var toRate = 1;
        if (newVal != null) {
            toRate = ConvertNSFieldToFloat(newVal.convRate);
            if (toRate == 0) toRate = 1;
        }
//Do the conversion
        self.rate(((ConvertNSFieldToFloat(self.rate()) / fromRate) * toRate).toFixed(2));
    };
//Sets the rate of the part line depending on the payment type of the Operation Line
    self.updateRate = function () {
        var paymentType = self.selectedPaymentType();
        var parentPaymentType = self.parent.selectedPaymentType();
        var paymentTypeId = paymentType ? parseInt(paymentType.id) : parentPaymentType ? parseInt(parentPaymentType.id) : null;

        if (paymentTypeId == SRV_PAYMENTTYPE_GOODWILL || paymentTypeId == SRV_PAYMENTTYPE_WARRANTY) {
            self.rate(0);
        } else {
            var multiplier = 1;
            switch (self.priceLevel()) {
                case 'MSRP 100':
                    multiplier = 2;
                    break
                case 'MSRP 200':
                    multiplier = 3;
                    break;
                case 'MSRP 300':
                    multiplier = 4;
                    break;
                default:
                    multiplier = 1;
            }
            self.rate(self.item() ? (parseFloat(self.item().basePrice) * multiplier).toFixed(2) : 0);
        }
    };
}

/**
 * Represents a single item.  Used to encapsulate the part on a part line.
 */
function SRVItem(data) {
    var self = this;
    self.id = data.id;
    self.name = data.name;
    self.uomType = data.uomType;
    self.basePrice = data.basePrice;
    self.isDiscount = data.isDiscount;
}

/**
 * Represents a single line on the Time Entry sublist.
 * Has a parent of the Operation Line and the Service Work Order.
 */
function SRVTimeEntry(data, parent) {
    /** STATICS AND OBSERVABLES */
    var self = this;
    self.parent = parent;
    self.type = SRV_LINETYPE_TIMEENTRY;
    self.today = nlapiDateToString(new Date(), 'date');
    self.user = nlapiLookupField('employee', nlapiGetUser(), 'entityid');
    self.id = data ? data.id : '';
//Observable text boxes and numerics
    self.dateCreated = ko.observable(data ? data.dateCreated : '');
    self.time = ko.observable(data ? data.time : '');
    self.tech = ko.observable(data ? data.tech : '');
//Update the time Required when the time changes
    self.time.subscribe(function () {
        self.parent.updateTimeRequired();
    });
    /** VALIDATOR FUNCTIONS */
//Returns whether or not this time entry can be saved on the popup
    self.canSave = function () {
        if (self.time() == null || self.time().length < 1 || isNaN(self.time()) || self.time() <= 0) {
            alert('Enter a valid number value for Time Tracked.');
            return false;
        }
        return true;
    };
    /** UTILITY FUNCTIONS */
//Update the time Required on the op line to add on the
    self.updateAmount = function () {
        var rate = ConvertNSFieldToFloat(self.rate());
        var qty = ConvertNSFieldToFloat(self.quantity());
        if (isNaN(rate) || isNaN(qty)) {
            self.amount(0);
        } else {
            self.amount((rate * qty).toFixed(2));
        }
    };
}

/**
 * Name: document.ready()
 * Description: Page event that fires after the DOM is initialized.  Sets up all the event bindings
 * and Jquery widget initializations
 * @returns {void}
 */
$(document).ready(function () {
    var swoLinesViewModel = new SRV_SWOViewModel();
    swoLinesViewModel.initialize();
    ko.applyBindings(swoLinesViewModel);
    window.GetSWOLinesVM = function () {
        return swoLinesViewModel;
    };
});
ss$ = jQuery.noConflict(true); //This needs to be outside of document.ready() for the sortable list to load.
//connect items with observableArrays
ko.bindingHandlers.sortableList = {
    init: function (element, valueAccessor) {
        var list = valueAccessor();
        ss$(element).sortable({
            update: function (event, ui) {
//retrieve our actual data item
                var item = ko.dataFor(ui.item[0]);//.tmplItem().data;
//figure out its new position
                var position = ko.utils.arrayIndexOf(ui.item.parent().children(), ui.item[0]);
//remove the item and add it back in the right spot
                if (position >= 0) {
                    list.remove(item);
                    list.splice(position, 0, item);
                }
                ui.item.remove();
            }
        });
    }
};
//control visibility, give element focus, and select the contents (in order)
ko.bindingHandlers.visibleAndSelect = {
    update: function (element, valueAccessor) {
        ko.bindingHandlers.visible.update(element, valueAccessor);
        if (valueAccessor()) {
            setTimeout(function () {
                ss$(element).focus().select();
            }, 0); //new tasks are not in DOM yet
        }
    }
};
//Set up the Item Inputs to allow them to query items in the system
ko.bindingHandlers.setupItemInputs = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        initializeItemInputs(viewModel);
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
};
//Additional function on subscribables to get both the old and new values when the observable is changed.
ko.subscribable.fn.subscribeChanged = function (callback) {
    var oldValue = null;
    this.subscribe(function (_oldValue) {
        oldValue = _oldValue;
    }, this, 'beforeChange');
    this.subscribe(function (newValue) {
        callback(newValue, oldValue);
    });
};
ko.bindingHandlers.jqAuto = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        var options = valueAccessor() || {},
            allBindings = allBindingsAccessor(),
            unwrap = ko.utils.unwrapObservable,
            modelValue = allBindings.jqAutoValue,
            source = allBindings.jqAutoSource,
            valueProp = allBindings.jqAutoSourceValue,
            inputValueProp = allBindings.jqAutoSourceInputValue || valueProp,
            labelProp = allBindings.jqAutoSourceLabel || valueProp;

//function that is shared by both select and change event handlers
        function writeValueToModel(valueToWrite) {
            if (ko.isWriteableObservable(modelValue)) {
                modelValue(valueToWrite);
            } else {  //write to non-observable
                if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers']['jqAutoValue'])
                    allBindings['_ko_property_writers']['jqAutoValue'](valueToWrite);
            }
        }

//on a selection write the proper value to the model
        options.select = function (event, ui) {
            writeValueToModel(ui.item ? ui.item.actualValue : null);
        };
//on a change, make sure that it is a valid value or clear out the model value
        options.change = function (event, ui) {
            var currentValue = ss$(element).val();
            var matchingItem = ko.utils.arrayFirst(unwrap(source), function (item) {
                return unwrap(item[inputValueProp]) === currentValue;
            });
            if (!matchingItem) {
                writeValueToModel(null);
            }
        };
//handle the choices being updated in a DO, to decouple value updates from source (options) updates
        var mappedSource = ko.dependentObservable(function () {
            mapped = ko.utils.arrayMap(unwrap(source), function (item) {
                var result = {};
                result.label = labelProp ? unwrap(item[labelProp]) : unwrap(item).toString();  //show in pop-up choices
                result.value = inputValueProp ? unwrap(item[inputValueProp]) : unwrap(item).toString();  //show in input box
                result.actualValue = valueProp ? unwrap(item[valueProp]) : item;  //store in model
                return result;
            });
            return mapped;
        });
//whenever the items that make up the source are updated, make sure that autocomplete knows it
        mappedSource.subscribe(function (newValue) {
            ss$(element).autocomplete('option', 'source', newValue);
        });
        options.source = mappedSource();
//initialize autocomplete
        ss$(element).autocomplete(options);
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
//update value based on a model change
        var allBindings = allBindingsAccessor(),
            unwrap = ko.utils.unwrapObservable,
            modelValue = unwrap(allBindings.jqAutoValue) || '',
            valueProp = allBindings.jqAutoSourceValue,
            inputValueProp = allBindings.jqAutoSourceInputValue || valueProp;
//if we are writing a different property to the input than we are writing to the model, then locate the object
        if (valueProp && inputValueProp !== valueProp) {
            var source = unwrap(allBindings.jqAutoSource) || [];
            var modelValue = ko.utils.arrayFirst(source, function (item) {
                return unwrap(item[valueProp]) === modelValue;
            }) || {};  //probably don't need the || {}, but just protect against a bad value
        }
//update the element with the value that should be shown in the input
        ss$(element).val(modelValue && inputValueProp !== valueProp ? unwrap(modelValue[inputValueProp]) : modelValue.toString());
    }
};
ko.bindingHandlers.jqAutoCombo = {
    init: function (element, valueAccessor) {
        var autoEl = ss$('#' + valueAccessor());
        ss$(element).click(function () {
//Close if already visible
            if (autoEl.autocomplete('widget').is(':visible')) {
                autoEl.autocomplete('close');
                return;
            }
            autoEl.autocomplete('search', ' ');
            autoEl.focus();
        });
    }
};
//used when we need to show the 'name' attribute of something given its 'id'.
ko.bindingHandlers.optionsLabel = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var id = valueAccessor();
        var optionsArray = allBindings.get('optionsArray');
        if (typeof optionsArray == 'function')
            optionsArray = optionsArray();
        for (var option in optionsArray) {
            if (optionsArray[option].id == id()) {
                ss$(element).html(optionsArray[option].name);
                break;
            }
        }
    }
};

//Handles the async querying of items by name
function initializeItemInputs(viewModel) {
    ss$('#popupitem_input').autocomplete({
        autoFocus: true,
        delay: 300,
        position: {my: 'left bottom', at: 'left top', collision: 'flip'},
        source: function (request, response) {
            if (request.term.length > 0) {
                ss$.ajax({
                    url: '/app/site/hosting/restlet.nl?script=customscriptsrv_getitems_rest&deploy=customdeploysrv_getitems_rest',
                    dataType: 'json',
                    data: {
                        term: request.term,
                        itemCat1: viewModel.parent.selectedItemCat1() ? viewModel.parent.selectedItemCat1().id : '',
                        itemCat2: viewModel.parent.selectedItemCat2() ? viewModel.parent.selectedItemCat2().id : '',
                    },
                    success: function (data, i) {
                        var tempArray = [];
                        for (var i = 0; i < data.items.length; i++) {
                            tempArray.push({
                                id: data.items[i].id,
                                label: data.items[i].label,
                                basePrice: data.items[i].basePrice,
                                desc: data.items[i].desc,
                                isDiscount: data.items[i].isDiscount,
                                uomType: data.items[i].uomType,
                                defaultUOM: data.items[i].defaultUOM
                            });
                        }
                        response(tempArray);
                    },
                    error: function (textStatus, errorThrown) {
                        response('Error Loading Items');
                    }
                });
            } else {
                viewModel.item(new SRVItem({id: '', name: '', uomType: '', basePrice: 0}));
            }
        },
        minLength: 3,
        select: function (event, ui) {
            if (ui.item.id != '-1') {
                viewModel.item(new SRVItem({
                    id: ui.item.id,
                    name: ui.item.label,
                    uomType: ui.item.uomType,
                    basePrice: ui.item.basePrice,
                    isDiscount: ui.item.isDiscount
                }));
                viewModel.description(ui.item.desc);
                viewModel.selectedUOM(ko.utils.arrayFirst(viewModel.parent.parent.uomOptions, function (item) {
                    return item.id == ui.item.defaultUOM;
                }));
            } else {
                viewModel.item(new SRVItem({id: '', name: '', uomType: '', basePrice: 0}));
            }
        },
        change: function (event, ui) {
            if (viewModel.item().name == null || viewModel.item().name == '') {
                viewModel.item(new SRVItem({id: '', name: '', uomType: '', basePrice: 0}));
            }
        }
    });
}

/**
 * Decodes an HTML-encoded string by using a textarea DOM element.
 * Decodes things like &amp; and &lt;
 *
 * @param encodedString
 * @returns
 */
function decodeEntities(encodedString) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

function ConvertNSFieldToFloat(value) {
    if (value == null || value == '')
        return 0;
    else
        return parseFloat(value);
}

function ConvertNSFieldToString(value) {
    if (value == null)
        return '';
    else
        return nlapiEscapeXML(value);
}