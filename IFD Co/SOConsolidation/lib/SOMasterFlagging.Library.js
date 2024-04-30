define([
    './Search.Helper',
    './Utils',
    '../thirdparty/underscore',
    'N/search',
    'N/log',
    'N/record'
], function SOMasterFlaggingLibrary(
    SearchHelper,
    Utils,
    _,
    nSearch,
    nLog,
    nRecord
) {
    function normalizeListRecordResultValue(data, prop) {
        if (!data) {
            return null;
        }
        if (!_.isArray(data[prop]) && !_.isUndefined(data[prop].value)) {
            return data[prop].value;
        }
        if (_.isArray(data[prop]) && data[prop].length === 1) {
            return data[prop][0].value;
        }
        return null;
    }
    return {
        setMasterForSOs: function setMasterForSOs(masterFlaggingSearchId, newSalesOrdersToProcess) {
            var masterSO = this.getMasterSO(
                masterFlaggingSearchId,
                newSalesOrdersToProcess[0]
            );
            var newSalesOrdersWithoutMaster = _.reject(newSalesOrdersToProcess, { id: masterSO.id });
            this.flagMasterSO(masterSO);
            _.each(newSalesOrdersWithoutMaster, _.bind(this.flagNonMasterSOs, this));
            log.audit('Master:' + masterSO.id, 'Non Masters: ' + JSON.stringify(_.pluck(newSalesOrdersWithoutMaster, 'id')));
        },
        flagMasterSO: function flagMasterSO(masterSO) {
            var fieldsToSubmitMaster = {
                custbody_acs_soc_master: true,
                custbody_acs_soc_cons_key: this.getSOKey(masterSO),
                custbody_acs_soc_classified: true
            };
            if (masterSO.custbody_acs_soc_master !== true) {
                try {
                    nRecord.submitFields({
                        type: masterSO.recordType,
                        id: masterSO.id,
                        values: fieldsToSubmitMaster,
                        options: { enablesourcing: false, ignoreMandatoryFields: true }
                    });
                } catch (e) {
                    log.error('SOConsolidation-MasterFlag', e);
                    throw e;
                }
            }
        },
        flagNonMasterSOs: function newSOsToProcess(soToProcess) {
            var fieldsToSubmit = {
                custbody_acs_soc_master: false,
                custbody_acs_soc_cons_key: this.getSOKey(soToProcess),
                custbody_acs_soc_classified: true
            };
            try {
                nRecord.submitFields({
                    type: soToProcess.recordType,
                    id: soToProcess.id,
                    values: fieldsToSubmit,
                    options: { enablesourcing: false, ignoreMandatoryFields: true }
                });
            } catch (e) {
                log.error('SOConsolidation-NonMasterFlag', e);
            }
        },
        /**
         * Find for a given entity, otherrefnum and entity, the master or master candidate (oldest)
         */
        getMasterSO: function getMasterSO(searchId, key) {
            var search = nSearch.load({
                id: searchId
            });
            var self = this;
            var salesOrders;
            var master;
            var keyFilters = SearchHelper.getConsolidationKeyFilters(key);

            SearchHelper.prependFilters(search, keyFilters);
            salesOrders = SearchHelper.getAll(search, function normalizationFn(r) {
                return self.normalizeSOData(r.toJSON());
            });

            master = _.findWhere(salesOrders, { custbody_acs_soc_master: true });

            if (!master) {
                master = salesOrders[0];
            }

            return master;
        },
        getSOKey: function getSOKey(soRow) {
            return soRow.entity + '|' + Utils.normalizeOtherRefNum(soRow.otherrefnum) + '|' + soRow.shipdate;
        },
        normalizeSOData: function normalizeSOData(data) {
            return {
                recordType: data.recordType,
                id: data.id,
                entity: normalizeListRecordResultValue(data.values, 'entity'),
                datecreated: data.values.datecreated,
                otherrefnum: Utils.normalizeOtherRefNum(data.values.otherrefnum),
                shipdate: data.values.shipdate,
                custbody_acs_soc_classified: data.values.custbody_acs_soc_classified || false,
                custbody_acs_soc_master: data.values.custbody_acs_soc_master || false
            };
        }
    };
});
