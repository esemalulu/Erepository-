define(["exports", "N/query", "./Query"], function (_exports, _query, _Query) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.runQuery = void 0;

  /**
   * @copyright © 2020, Oracle and/or its affiliates. All rights reserved.
   *
   */
  var runQuery = (0, _Query.runQueryConstructor)(_query.runSuiteQL);
  _exports.runQuery = runQuery;
});