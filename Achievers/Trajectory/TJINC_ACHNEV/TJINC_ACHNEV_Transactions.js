/**
 * Copyright (c) 2015 Trajectory Inc. 
 * 2 Berkeley Street, Unit 205, Toronto, ON, Canada, M5A 4J5 
 * www.trajectoryinc.com 
 * All Rights Reserved. 
 */

/** 
 * @System: Achievers
 * @Module: Event
 * @Version: 1.0.0
 * @Company: Trajectory Inc. / Kuspide Canada Inc. 
 * @CreationDate: 20151006
 * @RequirementsUrl: Jira Ticket ACH-35
 * @DocumentationUrl: https://docs.google.com/document/d/1zpdemsBn2Nr-IEvw3Fq6rqWZ5cndvq2aOsvgK2F3PVg/edit#
 * @FileName: TJINC_ACHNEV_Transactions.js
 * @NamingStandard: TJINC_NSJ-1-3-4
 */

/* exported TJINC_ACHNEV_AS_Transaction, TJINC_ACHNEV_BL_Transaction, TJINC_ACHNEV_BS_Transaction */
/* global TJINC_ACHNED_AS_VendorBill, TJINC_ACHNED_BL_VendorBill, TJINC_ACHNED_AS_SalesOrder, TJINC_ACHNED_AS_PurchaseOrder, 
TJINC_ACHNIC_BeforeLoad_PurchaseOrder, TJINC_ACHNIC_AfterSubmit_PurchaseOrder, TJINC_ACHNIC_BeforeSubmit_SalesOrder */

// https://docs.google.com/document/d/1zpdemsBn2Nr-IEvw3Fq6rqWZ5cndvq2aOsvgK2F3PVg/edit#heading=h.9zx4p2k43clw
function TJINC_ACHNEV_BL_Transaction(s_type, o_form) {
    if (s_type !== null) {
        s_type = s_type.toString();
    }
    var s_recordType = nlapiGetRecordType().toLowerCase();
    tj.logActive = true;
    tj.log('TJINC_ACHNEV_BL_Transaction IN', 'Type: ' + s_type);

    if (s_recordType === 'vendorbill') {
        TJINC_ACHNED_BL_VendorBill(s_type);
    }
    
    if (s_recordType === 'purchaseorder') {
        TJINC_ACHNIC_BeforeLoad_PurchaseOrder(s_type, o_form);
    }
    
    tj.log('TJINC_ACHNEV_BL_Transaction OUT', 'Out - Units: ' + nlapiGetContext().getRemainingUsage());
}


function TJINC_ACHNEV_BS_Transaction(s_type) {
    if (s_type !== null) {
        s_type = s_type.toString();
    }
    var s_recordType = nlapiGetRecordType().toLowerCase();
    tj.logActive = true;
    tj.log('TJINC_ACHNEV_BS_Transaction IN', 'Type: ' + s_type);
    
    if (s_recordType === 'salesorder') {
        TJINC_ACHNIC_BeforeSubmit_SalesOrder(s_type);
    }
    
    tj.log('TJINC_ACHNEV_BS_Transaction OUT', 'Out - Units: ' + nlapiGetContext().getRemainingUsage());
}

// https://docs.google.com/document/d/1zpdemsBn2Nr-IEvw3Fq6rqWZ5cndvq2aOsvgK2F3PVg/edit#heading=h.p1hus4arj81k
function TJINC_ACHNEV_AS_Transaction(s_type) {
    if (s_type !== null) {
        s_type = s_type.toString();
    }
    var s_recordType = nlapiGetRecordType().toLowerCase();
    tj.logActive = true;
    tj.log('TJINC_ACHNEV_AS_Transaction IN', 'Type: ' + s_type);

    if (s_recordType === 'vendorbill') {
        TJINC_ACHNED_AS_VendorBill(s_type);
    }

    if (s_recordType === 'itemfulfillment') {
        //TJINC_ACHNED_AS_ItemFulfillment(s_type);
    }

    if (s_recordType === 'purchaseorder') {
        TJINC_ACHNIC_AfterSubmit_PurchaseOrder(s_type);
        TJINC_ACHNED_AS_PurchaseOrder(s_type);
    }
    
    if (s_recordType === 'salesorder') {
        TJINC_ACHNED_AS_SalesOrder(s_type);
    }

    tj.log('TJINC_ACHNEV_AS_Transaction OUT', 'Out - Units: ' + nlapiGetContext().getRemainingUsage());
}
