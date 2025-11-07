define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Constants = void 0;
    var Constants = /** @class */ (function () {
        function Constants() {
        }
        Constants.RequestType = {
            GET_DEPARTMENT_RECORDS: 'GET_DEPARTMENT_RECORDS',
            GET_CLASSIFICATION_RECORDS: 'GET_CLASSIFICATION_RECORDS',
            GET_LOCATION_RECORDS: 'GET_LOCATION_RECORDS',
            GET_DCL_SEGMENTS_FROM_PROJECT: 'GET_DCL_SEGMENTS_FROM_PROJECT',
            GET_DCL_SEGMENTS_FROM_ITEM: 'GET_DCL_SEGMENTS_FROM_ITEM',
            GET_PC_PREFERENCES: 'GET_PC_PREFERENCES',
            GET_INACTIVE_RECORDS: 'GET_INACTIVE_RECORDS',
            IS_PROJECT_RECORD: 'IS_PROJECT_RECORD',
            IS_RECORD_INACTIVE: 'IS_RECORD_INACTIVE',
            GET_DCL_SEGMENTS_FROM_EMPLOYEE: 'GET_DCL_SEGMENTS_FROM_EMPLOYEE',
            GET_SELECTED_COLUMNS_FROM_PC_PREFERENCE: 'GET_SELECTED_COLUMNS_FROM_PC_PREFERENCE',
            GET_DCL_NAMES: 'GET_DCL_NAMES',
            GET_SUBSIDIARIES_FROM_DCL_RECORD: 'GET_SUBSIDIARIES_FROM_DCL_RECORD'
        };
        Constants.RequestParameter = {
            REQUEST_TYPE: 'requestType',
            SUBSIDIARY: 'subsidiary',
            PROJECT_ID: 'projectId',
            ITEM_ID: 'itemId',
            ITEMS_LIST: 'itemsList',
            PROJECTS_LIST: 'projectsList',
            EMPTY_PROJECTS_LIST: 'emptyProjectsList',
            EMPTY_ITEMS_LIST: 'emptyItemsList',
            RECORD_NAME: 'recordName',
            RECORD_ID: 'recordId',
            DCL_SEGMENTS: 'dclSegments',
            SEGMENTS_LIST: 'segmentsList',
            SELECTED_COLUMNS: 'selectedColumns',
            EMPLOYEE_ID: 'employeeId'
        };
        Constants.Response = {
            Status: {
                ERROR: 'ERROR'
            },
            ErrorCodes: {
                INVALID_REQUEST_TYPE: 'INVALID_REQUEST_TYPE',
                MISSING_SUBSIDIARY_PARAMETER: 'MISSING_SUBSIDIARY_PARAMETER',
                MISSING_PROJECT_ID_PARAMETER: 'MISSING_PROJECT_ID_PARAMETER',
                MISSING_ITEM_ID_PARAMETER: 'MISSING_ITEM_ID_PARAMETER',
                MISSING_ITEMS_LIST_PARAMETER: 'MISSING_ITEMS_LIST_PARAMETER',
                MISSING_PROJECTS_LIST_PARAMETER: 'MISSING_PROJECTS_LIST_PARAMETER',
                EMPTY_PROJECTS_LIST: 'EMPTY_PROJECTS_LIST',
                EMPTY_ITEMS_LIST: 'EMPTY_ITEMS_LIST',
                MISSING_REQUEST_TYPE_PARAMETER: 'MISSING_REQUEST_TYPE_PARAMETER',
                MISSING_RECORD_NAME_PARAMETER: 'MISSING_RECORD_NAME_PARAMETER',
                MISSING_SEGMENTS_LIST_PARAMETER: 'MISSING_SEGMENTS_LIST_PARAMETER',
                MISSING_RECORD_ID_PARAMETER: 'MISSING_RECORD_ID_PARAMETER',
                MISSING_SELECTED_COLUMNS_PARAMETER: 'MISSING_SELECTED_COLUMNS_PARAMETER',
                MISSING_DCL_SEGMENTS_PARAMETER: 'MISSING_DCL_SEGMENTS_PARAMETER',
                MISSING_EMPLOYEE_ID: 'MISSING_EMPLOYEE_ID'
            }
        };
        Constants.Request = {
            Header: {
                CONTENT_TYPE: 'Content-Type',
                MIME_JSON: 'application/json'
            }
        };
        return Constants;
    }());
    exports.Constants = Constants;
});
