/// <amd-module name="SuiteCommerce.CustomFields.Checkout.Setup"/>
define("SuiteCommerce.CustomFields.Checkout.Setup", ["require", "exports", "underscore", "SuiteCommerce.CustomFields.Checkout.Data", "SuiteCommerce.CustomFields.Checkout.Helper"], function (require, exports, _, Checkout_Data_1, Checkout_Helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Setup = /** @class */ (function () {
        function Setup() {
        }
        Setup.addCustomFieldsToCheckout = function (options) {
            var collection = Checkout_Helper_1.Helper.getFieldsCollection();
            var groupedFields = collection.getGroupedFields();
            this.processGroupedFields(options, groupedFields);
        };
        Setup.processGroupedFields = function (options, groupedFields) {
            var _this = this;
            var modulesToAdd = [];
            _(groupedFields).each(function (positions, moduleKey) {
                var orderWizardModuleInfo = Checkout_Helper_1.Helper.getOrderWizardModule(options.checkoutFlow, moduleKey);
                var moduleIndex = _this.getModuleIndex(options, orderWizardModuleInfo);
                modulesToAdd.push({
                    positions: positions,
                    orderWizardModuleInfo: orderWizardModuleInfo,
                    index: moduleIndex,
                });
            });
            // sort by the index of the related order wizard module in reverse order,
            // so splice ensures modules added last end up first, to fix sorting issues
            // when adding "after X" and "before Y" when X and Y are adjacent
            modulesToAdd = _(modulesToAdd)
                .sortBy('index')
                .reverse();
            _(modulesToAdd).each(function (module) {
                var moduleIndex = module.index;
                var orderWizardModuleInfo = module.orderWizardModuleInfo;
                _(module.positions).each(function (fieldsCollection, position) {
                    _this.addCustomFieldsWizardModule(options, {
                        position: position,
                        moduleIndex: moduleIndex,
                        fieldsCollection: fieldsCollection,
                        module: orderWizardModuleInfo.module,
                        step: orderWizardModuleInfo.step,
                    });
                });
            });
        };
        Setup.getModuleIndex = function (options, moduleInfo) {
            var _this = this;
            var stepsInfo = options.stepsInfo;
            var stepUrl = moduleInfo.step;
            var index = -1;
            _(stepsInfo).find(function (step) {
                var indexes = [];
                if (step.url === stepUrl) {
                    indexes = _this.getModuleIndexesInStep(step, moduleInfo);
                    if (indexes.length > 0) {
                        index = _this.getModuleIndexForRepeated(moduleInfo, indexes);
                        return true;
                    }
                }
                return false;
            });
            return index;
        };
        Setup.getModuleIndexesInStep = function (step, moduleInfo) {
            var moduleId = moduleInfo.module;
            var indexes = [];
            _(step.modules).each(function (module) {
                if (module.id === moduleId) {
                    indexes.push(module.index);
                }
            });
            return indexes;
        };
        Setup.getModuleIndexForRepeated = function (moduleInfo, indexes) {
            var indexIfRepeated = moduleInfo.indexIfRepeatedModule || 0;
            if (indexIfRepeated > 0 && indexes.length > indexIfRepeated) {
                return indexes[indexIfRepeated];
            }
            return indexes[0];
        };
        Setup.addCustomFieldsWizardModule = function (options, data) {
            var position = data.position;
            var index = data.moduleIndex;
            var positionStr;
            // injecting modules performs "splice" so we only increase index if is after
            if (position === Checkout_Data_1.FieldPosition.BEFORE) {
                positionStr = 'before';
            }
            else {
                index += 1;
                positionStr = 'after';
            }
            options.checkout.addModuleToStep({
                step_url: data.step,
                module: {
                    index: index,
                    id: "custom-fields-checkout-" + positionStr + "-" + data.module,
                    classname: 'SuiteCommerce.CustomFields.Checkout.OrderWizardModule.View',
                    options: {
                        collection: data.fieldsCollection,
                        configuration: {
                            position: position,
                            module: data.module,
                        },
                    },
                },
            });
        };
        return Setup;
    }());
    exports.Setup = Setup;
});
