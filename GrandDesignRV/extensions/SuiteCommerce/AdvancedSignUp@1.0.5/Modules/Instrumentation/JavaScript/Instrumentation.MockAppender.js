/// <amd-module name="SuiteCommerce.AdvancedSignUp.Instrumentation.MockAppender"/>
define("SuiteCommerce.AdvancedSignUp.Instrumentation.MockAppender", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MockAppender = /** @class */ (function () {
        function MockAppender() {
        }
        MockAppender.prototype.info = function (data) {
            console.info('MockAppender - Info', data);
        };
        MockAppender.prototype.error = function (data) {
            console.error('MockAppender - Error', data);
        };
        MockAppender.getInstance = function () {
            if (!MockAppender.instance) {
                MockAppender.instance = new MockAppender();
            }
            return MockAppender.instance;
        };
        return MockAppender;
    }());
    exports.MockAppender = MockAppender;
});
