/// <amd-module name="SuiteCommerce.CustomFields.PDP.Main.View"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define("SuiteCommerce.CustomFields.PDP.Main.View", ["require", "exports", "Backbone", "suitecommerce_customfields_pdp_field.tpl", "SuiteCommerce.CustomFields.Instrumentation"], function (require, exports, Backbone_1, pdpFieldsTpl, Instrumentation_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PDPFieldsView = /** @class */ (function (_super) {
        __extends(PDPFieldsView, _super);
        function PDPFieldsView(options) {
            var _this = _super.call(this, options) || this;
            _this.template = pdpFieldsTpl;
            _this.isQuickView = !!options.isQuickView;
            _this.model.on('childSelected', function () {
                _this.render();
            });
            return _this;
        }
        PDPFieldsView.prototype.logFieldsQuantity = function (quantity) {
            var log = Instrumentation_1.default.getLog('usage');
            var SECTION = this.isQuickView ? 'Quick View' : 'PDP';
            log.setParameters({
                activity: "Show custom " + SECTION + " fields.",
                instanceCount: quantity,
            });
            log.submit();
        };
        PDPFieldsView.prototype.getContext = function () {
            var model = this.model;
            var fieldList = model.get('fieldsList');
            var fieldsToShow = fieldList.filter(function (field) {
                return field.show;
            });
            var fieldQuantityToShow = fieldsToShow.length;
            this.logFieldsQuantity(fieldQuantityToShow);
            return {
                field: fieldsToShow,
                showContainer: fieldQuantityToShow > 0,
            };
        };
        return PDPFieldsView;
    }(Backbone_1.View));
    exports.PDPFieldsView = PDPFieldsView;
});
