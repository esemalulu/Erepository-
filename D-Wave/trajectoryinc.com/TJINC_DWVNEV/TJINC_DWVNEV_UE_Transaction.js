/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

/**
 * Copyright (c) 2018 Trajectory Inc.
 * 250 The Esplanade, Suite 402, Toronto, ON, Canada, M5A 1J2
 * www.trajectoryinc.com
 * All Rights Reserved.
 */

/**
 * @System: D-Wave
 * @Module: DWVNEV NetSuite Events
 * @Version: 1.0.2
 * @Company: Trajectory Inc.
 * @CreationDate: 20160628
 * @RequirementsUrl:
 * @FileName: TJINC_DWVNEV_UE_Transaction.js
 * @NamingStandard: TJINC_NSJ-2-0-0
 */
define(['N/record', '/SuiteScripts/trajectoryinc.com/TJINC_DWVNMR/TJINC_DWVNMR_UE_Main'], function (record, lib) {
    var o__config = { version: '1.0.2' };

    function tjincDWVNEV_afterSubmit(context) {
        var s_recType = '';
        switch (context.newRecord.type.toLowerCase()) {
            case record.Type.CASH_SALE.toLowerCase():
                s_recType = 'CS';
                lib.tjincDWVNMR_afterSubmitCS(context);
                break;

            case record.Type.PURCHASE_ORDER.toLowerCase():
                s_recType = 'PO';
                lib.tjincDWVNMR_afterSubmitPO(context);
                break;

            case record.Type.SALES_ORDER.toLowerCase():
                s_recType = 'SO';
                lib.tjincDWVNMR_afterSubmitSO(context);
                break;

            case record.Type.WORK_ORDER.toLowerCase():
                s_recType = 'WO';
                lib.tjincDWVNMR_afterSubmitWO(context);
                break;
        }
        if (s_recType) {
            log.debug('tjincDWVNEV_afterSubmit (' + s_recType + ') - In / Out', 'Ver: ' + o__config.version);
        }
    }

    function tjincDWVNEV_beforeLoad(context) {
        var s_recType = '';
        switch (context.newRecord.type.toLowerCase()) {
            case record.Type.PURCHASE_ORDER.toLowerCase():
                s_recType = 'PO';
                lib.tjincDWVNMR_beforeLoadPO(context);
                break;

            case record.Type.WORK_ORDER.toLowerCase():
                s_recType = 'WO';
                lib.tjincDWVNMR_beforeLoadWO(context);
                break;
        }
        if (s_recType) {
            log.debug('tjincDWVNEV_beforeLoad (' + s_recType + ') - In / Out', 'Ver: ' + o__config.version);
        }
    }

    function tjincDWVNEV_beforeSubmit(context) {
        var s_recType = '';
        switch (context.newRecord.type.toLowerCase()) {
            case record.Type.CASH_SALE.toLowerCase():
                s_recType = 'CS';
                lib.tjincDWVNMR_beforSubmitCS(context);
                break;

            case record.Type.SALES_ORDER.toLowerCase():
                s_recType = 'SO';
                lib.tjincDWVNMR_beforSubmitSO(context);
                break;

            case record.Type.WORK_ORDER.toLowerCase():
                s_recType = 'WO';
                lib.tjincDWVNMR_beforSubmitWO(context);
                break;
        }
        if (s_recType) {
            log.debug('tjincDWVNEV_beforeSubmit (' + s_recType + ') - In / Out', 'Ver: ' + o__config.version);
        }
    }

    return {
        afterSubmit: tjincDWVNEV_afterSubmit,
        beforeLoad: tjincDWVNEV_beforeLoad,
        beforeSubmit: tjincDWVNEV_beforeSubmit
    };
});