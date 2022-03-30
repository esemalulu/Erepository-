/**
 * Copyright (c) 2015 Trajectory Inc.
 * 2 Berkeley Street, Unit 205, Toronto, ON, Canada, M5A 4J5
 * www.trajectoryinc.com
 * All Rights Reserved.
 */

/**
 * @System: Achievers
 * @Company: Trajectory Inc. / Kuspide Canada Inc.
 * @CreationDate: 20150223
 * @DocumentationUrl: https://docs.google.com/a/trajectoryinc.com/document/d/172tw8QfoS2jLiQNZ7tWZN92ts1QQJv8obDYZ6Mx6NBU/edit?usp=sharing
 * @FileName: TJINC_ACHNIC_Item.js
 * @NamingStandard: TJINC_NSJ-1-3-3
 */

/* exported o_REQUIREDSUBSIDIARIES, TJINC_ACHNIC_Item_SaveRecord, TJINC_ACHNIC_Item_MassUpdate, TJINC_ACHNIC_Item_BeforeSubmit */
/* global jSuite, isNotBlank, _ */

//https://docs.google.com/document/d/172tw8QfoS2jLiQNZ7tWZN92ts1QQJv8obDYZ6Mx6NBU/edit#heading=h.x4j945nwfxjf
var o_REQUIREDSUBSIDIARIES = jSuite.runSearch({
    recordType: 'subsidiary',
    filterExpression: [['custrecord_tjinc_achnic_isrequired', 'is', 'T']],
    columns: [new nlobjSearchColumn('namenohierarchy').setLabel('name'),]
}).Results;

//https://docs.google.com/document/d/172tw8QfoS2jLiQNZ7tWZN92ts1QQJv8obDYZ6Mx6NBU/edit#heading=h.n7k6nuicwql9
function TJINC_ACHNIC_Item_SaveRecord() {
    var s_message = checkPreferredVendors().message(), returnValue = true;
    nlapiSetFieldValue('custitem_tjinc_achnic_missing_vendors', s_message);
    if (s_message.length > 0) {
        returnValue = confirm(s_message + '\r\nDo you wish to save anyway?');
    }
    return returnValue;
}

//https://docs.google.com/document/d/172tw8QfoS2jLiQNZ7tWZN92ts1QQJv8obDYZ6Mx6NBU/edit#heading=h.z0ns4j1t1mio
function TJINC_ACHNIC_Item_MassUpdate(rec_type, rec_id) {
    'use strict';
    nlapiSubmitRecord(nlapiLoadRecord(rec_type, rec_id));
}

//https://docs.google.com/document/d/172tw8QfoS2jLiQNZ7tWZN92ts1QQJv8obDYZ6Mx6NBU/edit#heading=h.shf1di6a1aqd
function TJINC_ACHNIC_Item_BeforeSubmit(s_type) {
    'user strict';
    if (s_type.toString() === 'create' || s_type.toString() === 'edit') {
        if (nlapiGetContext().getExecutionContext().toString() === 'custommassupdate') {
            nlapiSetFieldValue('custitem_tjinc_achnic_missing_vendors', checkPreferredVendors().message());
        }
    }
}

//https://docs.google.com/document/d/172tw8QfoS2jLiQNZ7tWZN92ts1QQJv8obDYZ6Mx6NBU/edit#heading=h.4gyr15o1jd7a
function checkPreferredVendors() {
    'use strict';

    var i, o_foundSubsidiaries = [];

    i = parseInt(nlapiGetLineItemCount('itemvendor'), 10);

    while (i > 0) {
        //Check only preferred Vendors
        if (isNotBlank(nlapiGetLineItemValue('itemvendor', 'preferredvendor', i)) && nlapiGetLineItemValue('itemvendor', 'preferredvendor', i).toString() === 'T') {
            o_foundSubsidiaries.push(parseInt(nlapiGetLineItemValue('itemvendor', 'subsidiary', i), 10));
        }
        i = i - 1;
    }

    //Ensure the appropriate Preferred Vendors exist
    return {
        unconfiguredVendorSubs: _.difference(_.map(o_REQUIREDSUBSIDIARIES, function (sub) {
            return sub.id;
        }), o_foundSubsidiaries),
        message: function () {
            var messageString = '';
            _.each(this.unconfiguredVendorSubs, function (i_subsidiary) {
                messageString += 'Missing Preferred Vendor for Subsidiary: ' + _.where(o_REQUIREDSUBSIDIARIES, {id: i_subsidiary})[0].name.val + '\r\n';
            });
            return messageString;
        }
    };
}