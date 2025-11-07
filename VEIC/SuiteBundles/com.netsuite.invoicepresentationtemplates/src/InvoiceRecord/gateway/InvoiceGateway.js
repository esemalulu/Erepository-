var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "N/query", "../../common/constants/IPTConstants", "N/runtime"], function (require, exports, query_1, IPTConstants_1, runtime_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    query_1 = __importDefault(query_1);
    IPTConstants_1 = __importDefault(IPTConstants_1);
    runtime_1 = __importDefault(runtime_1);
    class InvoiceGateway {
        constructor() {
            this.getIptAndSubsidiaryAtProjectRecord = async (projectId) => {
                const recordResultSet = await query_1.default.runSuiteQL.promise({
                    query: `SELECT
              ${IPTConstants_1.default.FIELDS.SUBSIDIARY},
              ${IPTConstants_1.default.FIELDS.IPT_AT_CUSTOMER_AND_PROJECT}
            FROM
              ${IPTConstants_1.default.RECORDS.PROJECT},
              ProjectSubsidiaryRelationship
            WHERE
              ${IPTConstants_1.default.RECORDS.PROJECT}.id= ProjectSubsidiaryRelationship.entity
              and
              ${IPTConstants_1.default.RECORDS.PROJECT}.id= ${projectId}`
                });
                const results = recordResultSet.asMappedResults();
                return results.length ? results[0] : null;
            };
        }
        async getEntityRecordType(entityId) {
            const resultSet = await query_1.default.runSuiteQL.promise({
                query: `select 
                        ${IPTConstants_1.default.FIELDS.ENTITY_TYPE}
                    from 
                        ${IPTConstants_1.default.RECORDS.ENTITY} 
                    where
                        ${IPTConstants_1.default.FIELDS.IPT_ID} = ${entityId}`
            });
            const type = resultSet.asMappedResults()[0].type;
            return type === IPTConstants_1.default.FIELDS.CUSTOMER_TYPE_AT_ENTITY
                ? IPTConstants_1.default.RECORDS.CUSTOMER
                : type;
        }
        isExecutedViaUserInterface() {
            return runtime_1.default.executionContext === runtime_1.default.ContextType.USER_INTERFACE;
        }
        fetchIPTConfiguration(recordId) {
            const resultSet = query_1.default.runSuiteQL({
                query: `select 
                        ${IPTConstants_1.default.FIELDS.IPT_CONFIG}
                    from 
                        ${IPTConstants_1.default.RECORDS.IPT_RECORD} 
                    where 
                        id = ${recordId}`
            });
            const results = resultSet.asMappedResults();
            return results.length ? results[0][IPTConstants_1.default.FIELDS.IPT_CONFIG] : '';
        }
        fetchChargesById(queryColumns, joinCondition, id, chargeId) {
            const resultSet = query_1.default.runSuiteQL({
                query: `SELECT distinct c .id, ${queryColumns} FROM ${IPTConstants_1.default.RECORDS.CHARGE} c ${joinCondition}  WHERE c.invoice = ${id} and  c .chargetype in (select id from chargetype where scriptid = '${chargeId}')`
            });
            return resultSet.asMappedResults();
        }
        fetchCurrencyFromInvoice(invoiceId) {
            const resultSet = query_1.default.runSuiteQL({
                query: `SELECT cr.displaysymbol, cr.currencyprecision FROM ${IPTConstants_1.default.RECORDS.TRANSACTION} t  join currency cr on t.currency = cr.id WHERE t.id = ${invoiceId}`
            });
            const results = resultSet.asMappedResults();
            return results.length ? results[0] : '';
        }
        fetchRecordTypeFromTransactionRecord(transactionId) {
            const resultSet = query_1.default.runSuiteQL({
                query: `select recordType from ${IPTConstants_1.default.RECORDS.TRANSACTION} where id = ${transactionId}`
            });
            return resultSet.asMappedResults()[0].recordtype;
        }
    }
    exports.default = InvoiceGateway;
});
