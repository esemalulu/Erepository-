define([
    './SOConsolidation.BodyFields.Library',
    './SOConsolidation.Lines.Library',
    './Utils',
    './Search.Helper',
    'N/error',
    'N/record',
    'N/search',
    'N/log',
    '../thirdparty/underscore'
], function SOConsolidationLibrary(
    BodyFields,
    Lines,
    Utils,
    SearchHelper,
    nError,
    nRecord,
    nSearch,
    nLog,
    _
) {
    'use strict';

    var MAX_ORDERS_TO_CONSOLIDATE_ON_ONE_MERGE = 50;

    return {
        consolidate: function consolidate(searchId, key) {
            var propertiesToUpdateOnMaster;
            var linesToConsolidate = this.getLinesToConsolidate(searchId, key);
            var salesOrdersToConsolidate = _.first(
                this.getOrdersToConsolidateFromLines(linesToConsolidate),
                MAX_ORDERS_TO_CONSOLIDATE_ON_ONE_MERGE
            );
            var ordersInvolvedSummary;

            // Only for logging purposes
            try {
                nLog.debug(
                    'Orders involved',
                    JSON.stringify(
                        _.map(salesOrdersToConsolidate, function logOrders(so) {
                            return {
                                internalid: so.internalid,
                                custbody_acs_soc_master: so.custbody_acs_soc_master
                            };
                        })
                    )
                );
            } catch (e) {
                nLog.error('error logging', e);
            }

            salesOrdersToConsolidate = this.handleMasterDefinition(salesOrdersToConsolidate);

            // Only for logging purposes
            try {
                ordersInvolvedSummary = _.map(salesOrdersToConsolidate, function logOrders(so) {
                    return {
                        internalid: so.internalid,
                        custbody_acs_soc_master: so.custbody_acs_soc_master,
                        isMaster: so.isMaster
                    };
                });

                nLog.audit(
                    'Orders involved - after master handling',
                    JSON.stringify(ordersInvolvedSummary)
                );
            } catch (e) {
                nLog.error('error logging', e);
            }
            // End Only for logging purposes

            if (!salesOrdersToConsolidate || salesOrdersToConsolidate.length < 2) {
                nLog.debug('Aborting Consolidation, only one order', JSON.stringify(key));
                return false;
            }

            try {
                this.lockSalesOrders(salesOrdersToConsolidate);
                propertiesToUpdateOnMaster = this.getConsolidatedSalesOrder(salesOrdersToConsolidate);
                this.updateMasterOrder(propertiesToUpdateOnMaster);
                this.closeAndUnlock(salesOrdersToConsolidate);
            } catch (e) {
                nLog.error('ERROR', JSON.stringify(e));
                this.unlockAllOrders(salesOrdersToConsolidate);
                throw nError.create({
                    name: 'ERR_COULDNT_PROCESS',
                    message: 'Couldn\'t process ' + JSON.stringify(key || '') + '\n' + JSON.stringify(ordersInvolvedSummary || '')
                });
            }
            return true;
        },
        updateMasterOrder: function updateMasterOrder(newData) {
            var linesToModify;
            var newLines;
            var bodyFieldsToSet = [
                'memo',
                'custbody_restrict_items_approved',
                'custbody_ifd_transaction_internal_note',
                'custbody_ifd_used_so'
            ];
            var lineFieldsToSet = [
                'item',
                'price',
                'rate',
                'custcol_ifd_subitemindicator',
                'custcol_ifd_price_override',
                'custcol_ifd_pallet_key_type',
                'custcol_ifd_pallet_type_code',
                'quantity',
                'location'
            ];
            var record = nRecord.load({
                type: nRecord.Type.SALES_ORDER,
                id: newData.internalid,
                isDynamic: false
            });

            /*
            try {
                this.storeMasterOrderBackup(record, lineFieldsToSet);
            } catch (e) {
                log.error('error bkp', e);
            }*/

            _.each(bodyFieldsToSet, function updateField(fieldName) {
                record.setValue({ fieldId: fieldName, value: newData[fieldName] });
            });

            linesToModify = _.filter(newData.lines, { isUpdated: true });
            newLines = _.filter(newData.lines, { isNew: true });

            _.each(linesToModify, function eachMasterLineToModify(l) {
                var linePos = record.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'lineuniquekey',
                    value: l.lineuniquekey
                });

                if (linePos === -1) {
                    throw nError.create({
                        name: 'ERR_NOT_FOUND',
                        message: 'Submitted not found line'
                    });
                }

                record.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: linePos,
                    value: l.quantity
                });

                record.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: linePos,
                    value: l.rate
                });
            });

            _.each(newLines, function eachNewLineToAppend(l) {
                var newPos = record.getLineCount({ sublistId: 'item' });
                _.each(lineFieldsToSet, function eachSublistFieldToSet(fieldName) {
                    record.setSublistValue({
                        sublistId: 'item',
                        fieldId: fieldName,
                        line: newPos,
                        value: l[fieldName]
                    });
                });
            });

            record.setValue({ fieldId: 'custbody_acs_soc_order_locked', value: false });
            record.setValue({ fieldId: 'custbody_acs_soc_master', value: true });
            record.setValue({ fieldId: 'custbody_consolidated', value: false });

            record.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
        },
        storeMasterOrderBackup: function storeMasterOrderBackup(salesOrder, fieldsToBkp) {
            var bkpPropId = 'custbody_acs_soc_original_m_l';
            var previousValue = salesOrder.getValue({ fieldId: bkpPropId });
            var itemLineCount = salesOrder.getLineCount({ sublistId: 'item' });
            var arrLines = [];
            var i;
            var objData;

            // Store value only before first consolidation
            if (previousValue) {
                return;
            }

            for (i = 0; i < itemLineCount; i++) {
                objData = {};
                // eslint-disable-next-line no-loop-func
                _.each(fieldsToBkp, function eachField(field) {
                    objData[field] = salesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: field,
                        line: i
                    });
                });
                arrLines.push(objData);
            }

            salesOrder.setValue({
                fieldId: bkpPropId,
                value: JSON.stringify(arrLines)
            });
        },
        handleMasterDefinition: function handleMasterDefinition(pSalesOrdersToConsolidate) {
            var master;
            var otherMasterCandidates;
            var salesOrdersToConsolidate = pSalesOrdersToConsolidate;
            var soMasterCandidates = _.where(salesOrdersToConsolidate, { custbody_acs_soc_master: true });

            if (soMasterCandidates.length > 1) {
                otherMasterCandidates = _.pluck(_.rest(soMasterCandidates), 'internalid');
                nLog.audit('Multiple Masters - excluding', 'Removing ' + JSON.stringify(otherMasterCandidates));
                salesOrdersToConsolidate = _.reject(salesOrdersToConsolidate, function rejectOtherMasters(i) {
                    return otherMasterCandidates.indexOf(i.internalid) !== -1;
                });
            }

            master = (soMasterCandidates && soMasterCandidates[0]) || salesOrdersToConsolidate[0];
            master.isMaster = true;
            _.each(master.lines, function (l) {
                l.isMaster = true;
            });

            return salesOrdersToConsolidate;
        },
        closeAndUnlock: function closeAndUnlock(salesOrders) {
            var self = this;
            var masterOrder = _.findWhere(salesOrders, { isMaster: true });
            var salesOrdersToClose = _.reject(salesOrders, { isMaster: true });
            var salesOrdersToCloseIds = _.pluck(salesOrdersToClose, 'internalid');
            var retries = 0;

            /**
             * Note: this adds a small delay, to mitigate issues
             caused by other concurrent processes that are running on the account
            */
            var syncPause = function syncPause(ms) {
                var curr = new Date().getTime();
                var targetMs = ms + curr;
                while (curr < targetMs) {
                    curr = new Date().getTime();
                }
            };

            var processFn = function processFn(so) {
                var success;
                if (_.contains(salesOrdersToCloseIds, so.internalid)) {
                    success = self.closeAndUnlockOneOrder(so, masterOrder);
                    if (success) {
                        salesOrdersToCloseIds = _.reject(
                            salesOrdersToCloseIds,
                            function rejectSO(value) {
                                return value === so.internalid;
                            }
                        );
                    }
                }
            };

            nLog.debug('Orders to close, try: ' + retries, JSON.stringify(salesOrdersToCloseIds));
            while (retries < 5 && salesOrdersToCloseIds.length > 0) {
                _.each(salesOrdersToClose, processFn);
                retries += 1;
                if (salesOrdersToCloseIds.length > 0) {
                    nLog.audit('Orders to close, after try ' + retries, JSON.stringify(salesOrdersToCloseIds || ''));
                    // Hack with a backing strategy
                    syncPause(250 * retries);
                }
            }

            if (salesOrdersToCloseIds.length > 0) {
                nLog.emergency('Error Closing Order', JSON.stringify(salesOrdersToCloseIds || ''));
                throw nError.create({
                    name: 'ERROR_CLOSING_ORDER',
                    message: 'Couldn\'t close: ' + salesOrdersToCloseIds
                });
            } else {
                nLog.debug('All orders closed after try: ' + retries, JSON.stringify(salesOrdersToCloseIds));
            }
        },
        closeAndUnlockOneOrder: function closeAndUnlockOneOrder(so, master) {
            var rec;
            var itemCount;
            var i;
            try {
                rec = nRecord.load({
                    type: nRecord.Type.SALES_ORDER,
                    id: so.internalid
                });

                itemCount = rec.getLineCount({ sublistId: 'item' });
                for (i = 0; i < itemCount; i++) {
                    rec.setSublistValue({
                        sublistId: 'item',
                        line: i,
                        fieldId: 'isclosed',
                        value: true
                    });
                }

                rec.setValue({ fieldId: 'custbody_acs_soc_order_locked', value: false });
                rec.setValue({ fieldId: 'custbody_consolidate_so_parent', value: master.internalid });
                rec.setValue({ fieldId: 'custbody_consolidated', value: true });

                rec.save({
                    ignoreMandatoryFields: true,
                    enableSourcing: true
                });
                return true;
            } catch (e) {
                log.audit('Error trying to close order! - ' + so.internalid, e);
            }
            return false;
        },
        getConsolidatedSalesOrder: function getConsolidatedSalesOrder(salesOrders) {
            var masterSO = _.findWhere(salesOrders, { isMaster: true });
            var fieldsToSet = _.extend(
                {
                    internalid: masterSO.internalid
                },
                BodyFields.getConsolidatedBodyFields(salesOrders),
                { lines: Lines.getLines(salesOrders) }
            );
            return fieldsToSet;
        },
        parseLineToConsolidate: function parseLineToConsolidate(row) {
            return {
                internalid: row.getValue({ name: 'internalid' }),
                entity: row.getValue({ name: 'entity' }),
                otherrefnum: Utils.normalizeOtherRefNum(row.getValue({ name: 'otherrefnum' })),
                shipdate: row.getValue({ name: 'shipdate' }),
                custbody_ifd_so_route_number: row.getValue({ name: 'custbody_ifd_so_route_number' }),
                custbody_ifd_stop: row.getValue({ name: 'custbody_ifd_stop' }),
                custbody_restrict_items_approved: row.getValue({ name: 'custbody_restrict_items_approved' }),
                isMaster: row.getValue({ name: 'custbody_acs_soc_master' }),
                custbody_acs_soc_master: row.getValue({ name: 'custbody_acs_soc_master' }),
                custbody_ifd_transaction_internal_note: row.getValue({ name: 'custbody_ifd_transaction_internal_note' }),
                custbody_ifd_used_so: row.getValue({ name: 'custbody_ifd_used_so' }),
                memo: row.getValue({ name: 'memomain' }),
                line: {
                    soId: row.getValue({ name: 'internalid' }),
                    isMaster: row.getValue({ name: 'custbody_acs_soc_master' }),
                    item: row.getValue({ name: 'item' }),
                    price: row.getValue({ name: 'pricelevel' }),
                    lineuniquekey: row.getValue({ name: 'lineuniquekey' }),
                    linesequencenumber: row.getValue({ name: 'linesequencenumber' }),
                    custcol_ifd_subitemindicator: row.getValue({ name: 'custcol_ifd_subitemindicator' }),
                    custcol_ifd_price_override: row.getValue({ name: 'custcol_ifd_price_override' }),
                    custcol_ifd_pallet_key_type: row.getValue({ name: 'custcol_ifd_pallet_key_type' }),
                    custcol_ifd_pallet_type_code: row.getValue({ name: 'custcol_ifd_pallet_type_code' }),
                    quantity: parseInt(row.getValue({ name: 'quantity' }), 10),
                    rate: row.getValue({ name: 'rate' }),
                    costestimate: row.getValue({ name: 'costestimate' }),
                    costestimaterate: row.getValue({ name: 'costestimaterate' }),
                    estgrossprofit: row.getValue({ name: 'estgrossprofit' }),
                    location: row.getValue({ name: 'location' }),
                    locationnohierarchy: row.getValue({ name: 'locationnohierarchy' })
                }
            };
        },
        /**
         * getLinesToConsolidate returns:
         * Lines for all orders with same shipdate-po-entity that are opened and not consolidated.
         * It's assumed that the first lines WILL BE of the master sales order, the one that lines will be consolidated on
         */
        getLinesToConsolidate: function getLinesToConsolidate(searchId, key) {
            var lines;
            var searchLines = nSearch.load({ id: searchId });
            SearchHelper.prependFilters(searchLines, SearchHelper.getConsolidationKeyFilters(key));
            lines = SearchHelper.getAll(searchLines, this.parseLineToConsolidate);
            return lines;
        },
        getOrdersToConsolidateFromLines: function getOrdersToConsolidateFromLines(lines) {
            var groupedLinesBySO = _.groupBy(lines, 'internalid');
            var sos = _.reduce(groupedLinesBySO, function (memo, linesBySo) {
                var so = JSON.parse(JSON.stringify(linesBySo[0]));
                var linesWithOnlyData = _.pluck(linesBySo, 'line');
                delete so.line;
                so.lines = _.sortBy(linesWithOnlyData, function (l) { return Number(l.linesequencenumber); });
                memo.push(so);
                return memo;
            }, []);
            var sortedSOs = _.sortBy(sos, function (l) { return Number(l.internalid); });
            return sortedSOs;
        },
        lockSalesOrders: function lockSalesOrders(salesOrders) {
            _.each(salesOrders, function eachSOToLock(salesOrder) {
                try {
                    salesOrder.lockingIssue = false;
                    nRecord.submitFields({
                        type: nRecord.Type.SALES_ORDER,
                        id: salesOrder.internalid,
                        values: { custbody_acs_soc_order_locked: true },
                        options: { enablesourcing: false, ignoreMandatoryFields: true }
                    });
                } catch (e) {
                    if (!(e && e.name === 'ERR_SO_CONSOL_LOCKED')) {
                        nLog.error('Error locking', e);
                        nLog.error('LOCKING ERROR', 'Couldn\'t lock order: ' + salesOrder.internalid);
                        salesOrder.lockingIssue = true;
                        throw nError.create({
                            name: 'ERROR_LOCKING',
                            message: 'Couldn\'t lock order: ' + salesOrder.internalid
                        });
                    }
                }
            });
        },
        /**
         * Unlock orders
         */
        unlockAllOrders: function unlockAllOrders(salesOrders) {
            _.each(salesOrders, function eachOrderToUnlock(salesOrder) {
                try {
                    nRecord.submitFields({
                        type: nRecord.Type.SALES_ORDER,
                        id: salesOrder.internalid,
                        values: { custbody_acs_soc_order_locked: false },
                        options: { enablesourcing: false, ignoreMandatoryFields: true }
                    });
                } catch (e) {
                    nLog.error('UNLOCKING ERROR', 'Couldn\'t unlock order: ' + salesOrder.internalid);
                    nLog.debug('UNLOCKING ERROR', JSON.stringify(e));
                }
            });
        }
    };
});
