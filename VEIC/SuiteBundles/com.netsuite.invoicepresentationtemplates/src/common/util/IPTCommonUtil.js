var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "N/query", "../constants/IPTConstants"], function (require, exports, query_1, IPTConstants_1) {
    "use strict";
    var _a;
    Object.defineProperty(exports, "__esModule", { value: true });
    query_1 = __importDefault(query_1);
    IPTConstants_1 = __importDefault(IPTConstants_1);
    class IPTCommonUtils {
        static getDefaultIpt(subsidiary) {
            let iptPreferencesQuery = `select ${IPTConstants_1.default.FIELDS.IPT_PREFERENCES_FIELD} from ${IPTConstants_1.default.RECORDS.IPT_PREFERENCE_RECORD}`;
            const resultSet = query_1.default.runSuiteQL({
                query: iptPreferencesQuery
            });
            let preferences = { ipt_preferences: {} };
            let iptPreferenceRecord = resultSet.asMappedResults();
            if (iptPreferenceRecord === null || iptPreferenceRecord === void 0 ? void 0 : iptPreferenceRecord.length) {
                let prefData = iptPreferenceRecord[0].custrecord_ipt_preferences;
                preferences = JSON.parse(prefData.toString());
            }
            const subsidiaryConfig = preferences[IPTConstants_1.default.PREFERENCES.PREFERENCES_KEY][subsidiary];
            return subsidiaryConfig
                ? subsidiaryConfig[IPTConstants_1.default.PREFERENCES.IPT_DEFAULT_INVOICE_TEMPLATE][IPTConstants_1.default.FIELDS.IPT_ID]
                : '';
        }
        static async getEntityRecordType(entityId) {
            const resultSet = await query_1.default.runSuiteQL.promise({
                query: `select ${IPTConstants_1.default.FIELDS.ENTITY_TYPE} from ${IPTConstants_1.default.RECORDS.ENTITY} entity where entity.${IPTConstants_1.default.FIELDS.IPT_ID} = ${entityId}`
            });
            const type = resultSet.asMappedResults()[0].type;
            return type === IPTConstants_1.default.FIELDS.CUSTOMER_TYPE_AT_ENTITY
                ? IPTConstants_1.default.RECORDS.CUSTOMER
                : type;
        }
        static isSelectedIPTDeleted(ipt) {
            const resultSet = query_1.default.runSuiteQL({
                query: `SELECT count(*) as count FROM customrecord_ipt_template
                    WHERE id = ${ipt}`
            });
            const results = resultSet.asMappedResults()[0];
            return results['count'] > 0 ? false : true;
        }
    }
    exports.default = IPTCommonUtils;
    _a = IPTCommonUtils;
    IPTCommonUtils.getIPTAndSubsidiaryAtCustomerRecord = async (customerId) => {
        const recordType = await IPTCommonUtils.getEntityRecordType(customerId);
        const subsidiaryRelationshipTable = recordType === IPTConstants_1.default.RECORDS.CUSTOMER
            ? 'CustomerSubsidiaryRelationship'
            : 'ProjectSubsidiaryRelationship';
        const recordResultSet = await query_1.default.runSuiteQL.promise({
            query: `SELECT
              ${IPTConstants_1.default.FIELDS.SUBSIDIARY},
              ${IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT}
            FROM
              ${recordType},
              ${subsidiaryRelationshipTable}
            WHERE
              ${recordType}.id= ${subsidiaryRelationshipTable}.entity
              and
              ${recordType}.id= ${customerId}`
        });
        const results = recordResultSet.asMappedResults();
        return results.length ? results[0] : null;
    };
});
