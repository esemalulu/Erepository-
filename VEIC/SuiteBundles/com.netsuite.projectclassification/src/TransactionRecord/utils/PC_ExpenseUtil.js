var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "../../common/constants/PCConstants"], function (require, exports, PCConstants_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    PCConstants_1 = __importDefault(PCConstants_1);
    var PC_ExpenseUtil = /** @class */ (function () {
        function PC_ExpenseUtil() {
        }
        /*
         * Fetches project values selected at single or multiple lines in EXPENSE sublist
         * of Vendor bill transaction.
         */
        PC_ExpenseUtil.prototype.fetchProjectFromExpenseSublist = function (transactionRecord) {
            var projects = new Set();
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.EXPENSE
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line,
                    sublistId: PCConstants_1.default.SUBLIST.EXPENSE
                });
                if (project)
                    projects.add(project);
            }
            return {
                projectsAtExpenseSublist: Array.from(projects)
            };
        };
        /*
         * Fetches project and item values selected at single or multiple lines in ITEM sublist
         * of Vendor bill transaction.
         */
        PC_ExpenseUtil.prototype.fetchProjectAndItemFromItemSublist = function (transactionRecord) {
            var projects = new Set();
            var items = new Set();
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.ITEM
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line,
                    sublistId: PCConstants_1.default.SUBLIST.ITEM
                });
                if (project)
                    projects.add(project);
                var item = transactionRecord.getSublistValue({
                    fieldId: PCConstants_1.default.FIELDS.ITEM,
                    line: line,
                    sublistId: PCConstants_1.default.SUBLIST.ITEM
                });
                if (item)
                    items.add(item);
            }
            return {
                projectsAtItemSublist: Array.from(projects),
                itemsAtItemSublist: Array.from(items)
            };
        };
        /*
         * Fetch Employee and Project Values from the Expense Sublist
         */
        PC_ExpenseUtil.prototype.fetchEmployeeProjectValuesFromExpenseReportTransaction = function (transactionRecord) {
            var projects = new Set();
            var employee = transactionRecord.getValue({
                fieldId: PCConstants_1.default.FIELDS.ENTITY
            });
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.EXPENSE
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line
                });
                if (project)
                    projects.add(project);
            }
            return {
                employee: employee,
                projectsAtExpenseSublist: Array.from(projects)
            };
        };
        /*
         * Sets DLC fields on Expense Sublist single or multiple lines of VendorBill transaction
         */
        PC_ExpenseUtil.prototype.updateDCLFieldsOnExpenseSublist = function (transactionRecord, projectMap) {
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.EXPENSE
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line,
                    sublistId: PCConstants_1.default.SUBLIST.EXPENSE
                });
                var projectDCLValues = project && projectMap[project] ? projectMap[project] : {};
                if (projectDCLValues.class) {
                    transactionRecord.setSublistValue({
                        value: projectDCLValues.class,
                        fieldId: PCConstants_1.default.FIELDS.CLASS,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.EXPENSE
                    });
                }
                if (projectDCLValues.department) {
                    transactionRecord.setSublistValue({
                        value: projectDCLValues.department,
                        fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.EXPENSE
                    });
                }
                if (projectDCLValues.location) {
                    transactionRecord.setSublistValue({
                        value: projectDCLValues.location,
                        fieldId: PCConstants_1.default.FIELDS.LOCATION,
                        line: line,
                        sublistId: PCConstants_1.default.SUBLIST.EXPENSE
                    });
                }
            }
        };
        /*
         * Sets DLC fields on Expense Sublist of Expense Report transaction
         */
        PC_ExpenseUtil.prototype.updateDCLFieldsOnExpenseReportSublist = function (transactionRecord, projectMap, employeeDCLValues) {
            var lineCount = transactionRecord.getLineCount({
                sublistId: PCConstants_1.default.SUBLIST.EXPENSE
            });
            for (var line = 0; line < lineCount; line++) {
                var project = transactionRecord.getSublistValue({
                    sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                    fieldId: PCConstants_1.default.FIELDS.CUSTOMER,
                    line: line
                });
                var projectDCLValues = project && projectMap[project] ? projectMap[project] : {};
                if (project) {
                    if (projectDCLValues.department || employeeDCLValues.department) {
                        transactionRecord.setSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                            fieldId: PCConstants_1.default.FIELDS.DEPARTMENT,
                            line: line,
                            value: projectDCLValues.department || employeeDCLValues.department
                        });
                    }
                    if (projectDCLValues.class || employeeDCLValues.class) {
                        transactionRecord.setSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                            fieldId: PCConstants_1.default.FIELDS.CLASS,
                            line: line,
                            value: projectDCLValues.class || employeeDCLValues.class
                        });
                    }
                    if (projectDCLValues.location || employeeDCLValues.location) {
                        transactionRecord.setSublistValue({
                            sublistId: PCConstants_1.default.SUBLIST.EXPENSE,
                            fieldId: PCConstants_1.default.FIELDS.LOCATION,
                            line: line,
                            value: projectDCLValues.location || employeeDCLValues.location
                        });
                    }
                }
            }
        };
        return PC_ExpenseUtil;
    }());
    exports.default = PC_ExpenseUtil;
});
