/**
 * Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

define(["exports", "../common/Constants", "N/query", "../gateway/BUABundleGateway", "../common/Query/RunQuery", "../useCase/BUABundleUseCase", "N/record", "N/translation"], function (_exports, _Constants, query, _BUABundleGateway, _RunQuery, _BUABundleUseCase, record, translation) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.beforeSubmit = _exports.beforeLoad = void 0;
  query = _interopRequireWildcard(query);
  _BUABundleGateway = _interopRequireDefault(_BUABundleGateway);
  _BUABundleUseCase = _interopRequireDefault(_BUABundleUseCase);
  record = _interopRequireWildcard(record);
  translation = _interopRequireWildcard(translation);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

  function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

  var _createGateway = function _createGateway() {
    return new _BUABundleGateway["default"]({
      dependencies: {
        'N/query': query,
        'N/record': record,
        'N/translation': translation
      },
      runQuery: _RunQuery.runQuery,
      constants: _Constants.Constants
    });
  };

  var useCase = new _BUABundleUseCase["default"]({
    dependencies: {
      BUABundleGateway: _createGateway()
    }
  });
  var TRANSLATION_COLLECTION = _Constants.Constants.CUSTOM_RECORD.UPDATE_VERIFICATION.TRANSLATION_COLLECTION.ID;

  var beforeLoad = function beforeLoad(context) {
    var type = context.type,
        CREATE = context.UserEventType.CREATE,
        form = context.form;
    var total = useCase.getBUATotalCount();

    if (type === CREATE && total) {
      var ALREADY_EXIST = _Constants.Constants.ERROR_MESSAGES.BUNDLE_PREFERENCES.ALREADY_EXIST;
      throw Error(useCase.getTranslationString(TRANSLATION_COLLECTION, ALREADY_EXIST));
    }

    useCase.setDefaultValues(form);
  };

  _exports.beforeLoad = beforeLoad;

  var beforeSubmit = function beforeSubmit(context) {
    var type = context.type,
        DELETE = context.UserEventType.DELETE;

    if (type === DELETE) {
      var DELETE_NOT_ALLOWED = _Constants.Constants.ERROR_MESSAGES.BUNDLE_PREFERENCES.DELETE_NOT_ALLOWED;
      throw Error(useCase.getTranslationString(TRANSLATION_COLLECTION, DELETE_NOT_ALLOWED));
    }
  };

  _exports.beforeSubmit = beforeSubmit;
});