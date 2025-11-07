define(["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.runQueryConstructor = runQueryConstructor;

  /**
   * @copyright © 2020, Oracle and/or its affiliates. All rights reserved.
   *
   */
  var __spreadArrays = void 0 && (void 0).__spreadArrays || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) {
      s += arguments[i].length;
    }

    for (var r = Array(s), k = 0, i = 0; i < il; i++) {
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) {
        r[k] = a[j];
      }
    }

    return r;
  };

  function runQueryConstructor(runSuiteQL) {
    return function (query, parameters) {
      if (parameters === void 0) {
        parameters = [];
      }

      return runSuiteQL({
        params: __spreadArrays(parameters),
        query: query
      }).asMappedResults();
    };
  }
});