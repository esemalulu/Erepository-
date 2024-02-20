/// <amd-module name="SuiteCommerce.CustomFields.PDP.Model"/>
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
define("SuiteCommerce.CustomFields.PDP.Model", ["require", "exports", "Backbone", "SuiteCommerce.CustomFields.PDP.Configuration", "underscore"], function (require, exports, Backbone_1, PDP_Configuration_1, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PDPModel = /** @class */ (function (_super) {
        __extends(PDPModel, _super);
        function PDPModel(modelAttributes) {
            var _this = _super.call(this, modelAttributes) || this;
            _this.isQuickView = !!modelAttributes.isQuickView;
            _this.fieldsList = PDP_Configuration_1.Configuration.getFieldsFromConfiguration();
            _this.itemInfo = _this.pdp.getItemInfo().item;
            _this.fieldsForJsonLd = {};
            _this.updateFields();
            if (PDP_Configuration_1.Configuration.structuredDataMarkupType === PDP_Configuration_1.DataMarkupTypes.JsonLd) {
                _this.addJsonLdValues();
            }
            _this.pdp.on('afterOptionSelection', function () {
                _this.updateFields();
                _this.trigger('childSelected');
            });
            return _this;
        }
        Object.defineProperty(PDPModel.prototype, "pdp", {
            get: function () {
                return this.get('pdp');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPModel.prototype, "fieldsList", {
            get: function () {
                return this.get('fieldsList');
            },
            set: function (fieldsList) {
                this.set('fieldsList', fieldsList);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPModel.prototype, "itemInfo", {
            get: function () {
                return this.get('itemInfo');
            },
            set: function (itemInfo) {
                this.set('itemInfo', itemInfo);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PDPModel.prototype, "childItemInfo", {
            get: function () {
                return this.pdp.getSelectedMatrixChilds();
            },
            enumerable: true,
            configurable: true
        });
        PDPModel.prototype.updateFields = function () {
            var _this = this;
            var fieldList = this.fieldsList;
            fieldList.forEach(function (fieldObject) {
                var show = fieldObject.show, hideFromQuickView = fieldObject.hideFromQuickView, fieldText = fieldObject.fieldText, fieldsToParse = fieldObject.fieldsToParse;
                fieldObject.show = !!(show && (!_this.isQuickView || !hideFromQuickView));
                if (fieldObject.show) {
                    fieldObject.parsedText = _this.replaceFromFieldList(fieldText, fieldsToParse);
                    if (fieldObject.schema) {
                        _this.populateJsonLdValues(fieldObject);
                    }
                    fieldObject.visible = fieldObject.show && _this.updateVisibility(fieldsToParse);
                }
            });
            this.fieldsList = fieldList;
        };
        PDPModel.prototype.replaceFromFieldList = function (fieldText, stringList) {
            var _this = this;
            var resultText = fieldText;
            stringList.forEach(function (replaceValue) {
                var replaceString = _this.getItemInfoFieldValue(replaceValue);
                resultText = resultText
                    .split("[[" + replaceValue + "]]")
                    .join("" + replaceString);
            });
            return resultText;
        };
        PDPModel.prototype.updateVisibility = function (propertyList) {
            var _this = this;
            var foundProperties = false;
            propertyList.forEach(function (property) {
                var fieldValue = _this.getItemInfoFieldValue(property);
                if ((fieldValue && fieldValue !== '&nbsp;') || fieldValue === 0) {
                    foundProperties = true;
                }
            });
            return foundProperties;
        };
        PDPModel.prototype.getItemInfoFieldValue = function (fieldId) {
            var itemInfo = this.itemInfo;
            var childItemInfo = this.childItemInfo;
            if (childItemInfo.length === 1) {
                return childItemInfo[0][fieldId] || itemInfo[fieldId] || '';
            }
            return itemInfo[fieldId] || '';
        };
        PDPModel.prototype.populateJsonLdValues = function (fieldObject) {
            var _this = this;
            var fieldValue = '';
            fieldObject.fieldsToParse.forEach(function (field) {
                fieldValue += _this.getItemInfoFieldValue(field);
            });
            this.fieldsForJsonLd[fieldObject.schema] = fieldValue;
        };
        PDPModel.prototype.addJsonLdValues = function () {
            var _this = this;
            this.pdp.modifyViewJsonLd('ProductDetails.Full.View', function (json) {
                var extendedJson = _.extend(json, _this.fieldsForJsonLd);
                return jQuery.Deferred().resolve(extendedJson);
            });
        };
        return PDPModel;
    }(Backbone_1.Model));
    exports.PDPModel = PDPModel;
});
