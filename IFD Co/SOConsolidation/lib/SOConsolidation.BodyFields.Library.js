define([
    '../thirdparty/underscore'
], function BodyFieldsLibrary(
    _
) {
    return {
        getConsolidatedBodyFields: function getConsolidatedBodyFields(salesOrders) {
            this.rules = [
                   { fieldName: 'memo', fn: this.getMemo },
                   { fieldName: 'custbody_restrict_items_approved', fn: this.getRestrictedItemsApproved },
                   { fieldName: 'custbody_ifd_transaction_internal_note', fn: this.getInternalNote },
                   { fieldName: 'custbody_ifd_used_so', fn: this.getUsedSOs }
            ];
            return _.reduce(this.rules, function reduceRules(memo, rule) {
                memo[rule.fieldName] = rule.fn(salesOrders);
                return memo;
            }, {});
        },
        /**
         * Concatenate all memos, remove '- None -', remove duplicates. Limit 1000 chars
         */
        getMemo: function getMemo(salesOrders) {
            var allMemos = _.map(salesOrders, function mapSos(r) {
                var memo = (r.memo || '') + '';
                if (memo.toLowerCase() === '- none -') {
                    memo = '';
                }
                return memo;
            });
            allMemos = _.compact(_.uniq(allMemos));
            return allMemos.join('\n').substring(0, 1000);
        },
        /**
         * Check if checked on any SO
         */
        getRestrictedItemsApproved: function getRestrictedItemsApproved(salesOrders) {
            return _.any(_.pluck(salesOrders, 'custbody_restrict_items_approved'));
        },
        getInternalNote: function getInternalNote(salesOrders) {
            var allMemos = _.map(salesOrders, function internalNoteMap(r) {
                var internalNote = (r.custbody_ifd_transaction_internal_note + '') || '';
                if (internalNote.toLowerCase() === '- none -') {
                    internalNote = '';
                }
                return internalNote;
            });
            allMemos = _.compact(_.uniq(allMemos));
            return allMemos.join('\n').substring(0, 3999);
        },
        /**
         * parse all previous values, set the new values, merge, sort, stringify
         */
        getUsedSOs: function getUsedSOs(salesOrders) {
            var allUsedSOs = _.map(salesOrders, function mapAllUsedSOs(salesOrder) {
                var used = [];
                if (salesOrder.custbody_ifd_used_so) {
                    try {
                        used = JSON.parse(salesOrder.custbody_ifd_used_so);
                    } catch (e) {
                        log.error('ignoring all used sos', salesOrder.custbody_ifd_used_so);
                    }
                }
                return used;
            });
            allUsedSOs.push(_.pluck(salesOrders, 'internalid'));
            allUsedSOs = _.flatten(allUsedSOs);
            return JSON.stringify(_.compact(_.uniq(allUsedSOs)).sort());
        }
    };
});
