/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        return {
            CUSTOM_RECORD_ID: 'customrecord_gd_supply_chain_export_proc',
            SCHEDULED_SCRIPT: {
                scriptId: 'customscript_gd_sch_workbook_export',
                deploymentId: 'customdeploy_gd_sch_workbook_export'
            },
            TIMESPAN: {
                1: {
                    value: 1,
                    duration: 'days'
                },
                2: {
                    value: 12,
                    duration: 'hours'
                },
                3: {
                    value: 6,
                    duration: 'hours'
                },
                4: {
                    value: 2,
                    duration: 'hours'
                },
                5: {
                    value: 1,
                    duration: 'hours'
                },
                6: {
                    value: 30,
                    duration: 'minutes'
                },
                7: {
                    value: 15,
                    duration: 'minutes'
                },
                8: {
                    value: 5,
                    duration: 'minutes'
                },
                9: {
                    value: 1,
                    duration: 'minutes'
                },
                10: {
                    value: 30,
                    duration: 'seconds'
                }
            },
            WGO_SEARCHES: {
                VENDOR_MASTER_SEARCH: 'customsearch_gd_vendor_master_wgo',
                ITEM_MASTER_SEARCH: 'customsearch_gd_item_master_wgo',
                ITEM_RECEIPT_SEARCH: 'customsearch_gd_item_receipt_wgo',
            },
            WGO_SCH_EXPORT_DEPLOYMENTS: {
                vendorMaster: 'customdeploy_gd_sch_export_vendor_master',
                itemMaster: 'customdeploy_gd_sch_export_item_master',
                itemReceipt: 'customdeploy_gd_sch_export_item_receipt'
            },
            WGO_SCH_UPLOAD: {
                scriptId: 'customscript_gd_sch_wgo_upload',
                vendorMaster: 'customdeploy_gd_sch_upload_vendor_master',
                itemMaster: 'customdeploy_gd_sch_upload_item_master',
                itemReceipt: 'customdeploy_gd_sch_upload_item_receipt',
            }
        }

    });
