define(["exports"], function (_exports) {
  /**
   * Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved.
   */
  'use strict';

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports["default"] = void 0;
  var self;

  var BaseGateway =
  /** @class */
  function () {
    function BaseGateway(options) {
      var _this = this;

      this._query = null;
      this._translations = null;
      this._constants = null;
      this._errors = {
        OPTIONS_IS_REQUIRED: 'options is required',
        DEPENDENCIES_IS_REQUIRED: 'options.dependencies is required.',
        N_Query_IS_REQUIRED: 'options.dependencies["N/query"] is required.'
      };

      this.runSuiteQL = function (sqlQuery) {
        return self._query.runSuiteQL({
          query: sqlQuery
        });
      };

      this.getConstants = function () {
        return _this._constants;
      };

      this.getTranslations = function (collection, key) {
        return _this._translations.get({
          collection: collection,
          key: key
        })();
      };

      if (!options) {
        throw new Error(this._errors.OPTIONS_IS_REQUIRED);
      }

      if (!options.dependencies) {
        throw new Error(this._errors.DEPENDENCIES_IS_REQUIRED);
      }

      self = this;
      self._constants = options.constants;
      self._query = options.dependencies['N/query'];
      self._translations = options.dependencies['N/translation'];
    }

    return BaseGateway;
  }();

  var _default = BaseGateway;
  _exports["default"] = _default;
});