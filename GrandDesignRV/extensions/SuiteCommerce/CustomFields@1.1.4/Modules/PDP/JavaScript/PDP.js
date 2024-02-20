/// <amd-module name="SuiteCommerce.CustomFields.PDP"/>
define("SuiteCommerce.CustomFields.PDP", ["require", "exports", "SuiteCommerce.CustomFields.PDP.Configuration", "SuiteCommerce.CustomFields.PDP.Main.View", "SuiteCommerce.CustomFields.PDP.Model"], function (require, exports, PDP_Configuration_1, PDP_Main_View_1, PDP_Model_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            PDP_Configuration_1.Configuration.setEnvironment(container.getComponent('Environment'));
            var pdp = container.getComponent('PDP');
            if (pdp) {
                this.addCustomFields(pdp);
            }
        },
        addCustomFields: function (pdp) {
            this.addCustomFieldsToPDP(pdp);
            this.addCustomFieldsToQuickViews(pdp);
        },
        addCustomFieldsToPDP: function (pdp) {
            pdp.addChildView('Product.Sku', this.pdpFieldsViewConstructor(pdp));
        },
        addCustomFieldsToQuickViews: function (pdp) {
            pdp.addChildViews(pdp.PDP_QUICK_VIEW, {
                'Product.Sku': {
                    'CustomFields.PDPFields': {
                        childViewIndex: 11,
                        childViewConstructor: this.pdpFieldsViewConstructor(pdp, true),
                    },
                },
            });
        },
        pdpFieldsViewConstructor: function (pdp, isQuickView) {
            if (isQuickView === void 0) { isQuickView = false; }
            return function () {
                var model = new PDP_Model_1.PDPModel({
                    pdp: pdp,
                    isQuickView: isQuickView,
                });
                return new PDP_Main_View_1.PDPFieldsView({
                    model: model,
                    isQuickView: isQuickView,
                });
            };
        },
    };
});
