/**
 * @NApiVersion 2.x
 */

/**
 * Copyright (c) 2016 Trajectory Inc. 
 * 2 Berkeley Street, Unit 205, Toronto, ON, Canada, M5A 4J5 
 * www.trajectoryinc.com 
 * All Rights Reserved. 
 */

/**
* @System: D-Wave
* @Module: DWNMR
* @Version: 1.0.01
* @Company: Trajectory Inc.
* @CreationDate: 20160615
* @FileName: TJINC_DWNMR_CS.js
* @NamingStandard: TJINC_NSJ-2-0-0
 */

define(['N/currentRecord', 'N/url'], function (currentRecord, url) {
    return {
        bpo_click: function (context) {
            // Client script executed by the button 'Create PO for Back Orders'
            var o_rec = currentRecord.get();
            var s_url = url.resolveScript({
                scriptId: 'customscript_tjinc_dwvnmr_sl_main',
                deploymentId: 'customdeploy_tjinc_dwvnmr_sl_main',
                returnExternalUrl: false
            });

            jQuery.get(s_url, { ss: true, id: o_rec.getValue('id') },
                function (response) {
                    alert("The requested PO's will be created shortly. Please refresh the page in a few minutes");
                    jQuery('#tbl_custpage_bpo').hide();
                }, 'text');
        }
    };
});