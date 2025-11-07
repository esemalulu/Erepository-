define(["exports", "../common/gateway/BaseGateway"], function (_exports, _BaseGateway) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports["default"] = void 0;
  _BaseGateway = _interopRequireDefault(_BaseGateway);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

  var __extends = void 0 && (void 0).__extends || function () {
    var _extendStatics = function extendStatics(d, b) {
      _extendStatics = Object.setPrototypeOf || {
        __proto__: []
      } instanceof Array && function (d, b) {
        d.__proto__ = b;
      } || function (d, b) {
        for (var p in b) {
          if (b.hasOwnProperty(p)) d[p] = b[p];
        }
      };

      return _extendStatics(d, b);
    };

    return function (d, b) {
      _extendStatics(d, b);

      function __() {
        this.constructor = d;
      }

      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
  }();
  /**
   * Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved.
   */


  var self;

  var BUABundleGateway =
  /** @class */
  function (_super) {
    __extends(BUABundleGateway, _super);

    function BUABundleGateway(options) {
      var _this = _super.call(this, options) || this;

      self = _this;
      self._dependencies = options.dependencies;
      self._runQuery = options.runQuery;
      self._constants = options.constants;
      return _this;
    }

    return BUABundleGateway;
  }(_BaseGateway["default"]);

  var _default = BUABundleGateway;
  _exports["default"] = _default;
});