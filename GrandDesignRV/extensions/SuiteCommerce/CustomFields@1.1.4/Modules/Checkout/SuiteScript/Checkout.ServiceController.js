/// <amd-module name="SuiteCommerce.CustomFields.Checkout.ServiceController"/>
define("SuiteCommerce.CustomFields.Checkout.ServiceController", ["require", "exports", "ServiceController", "underscore", "SuiteCommerce.CustomFields.Checkout.Helper", "SuiteCommerce.CustomFields.Checkout.Model"], function (require, exports, ServiceController, _, Checkout_Helper_1, Checkout_Model_1) {
    "use strict";
    return ServiceController.extend({
        name: 'SuiteCommerce.CustomFields.Checkout.ServiceController',
        get: function () {
            var data = this.parseRequest();
            var result = Checkout_Model_1.Model.get(data);
            this.sendContent(result);
        },
        post: function () {
            var data = this.parseData();
            var result = Checkout_Model_1.Model.update(data);
            this.sendContent(result);
        },
        parseRequest: function () {
            var fieldsStr = this.request.getParameter('fields') || '';
            var fieldIds = fieldsStr ? fieldsStr.split(',') : [];
            var fields = Checkout_Helper_1.Helper.getFields(fieldIds);
            return {
                fields: fields,
            };
        },
        parseData: function () {
            var data = this.data;
            var fieldIds = _(data.fields).pluck('internalid');
            data.fields = Checkout_Helper_1.Helper.getFields(fieldIds);
            return data;
        },
    });
});
