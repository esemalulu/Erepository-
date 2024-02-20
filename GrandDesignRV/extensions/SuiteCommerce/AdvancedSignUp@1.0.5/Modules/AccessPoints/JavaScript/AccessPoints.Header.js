/// <amd-module name="SuiteCommerce.AdvancedSignUp.AccessPoints.Header"/>
define("SuiteCommerce.AdvancedSignUp.AccessPoints.Header", ["require", "exports", "SuiteCommerce.AdvancedSignUp.AccessPoints.Header.View"], function (require, exports, AccessPoints_Header_View_1) {
    "use strict";
    return {
        mountToApp: function (container) {
            var layoutComponent = container.getComponent('Layout');
            layoutComponent.addChildView('Header.Profile', function () { return new AccessPoints_Header_View_1.HeaderView(layoutComponent); });
        },
    };
});
