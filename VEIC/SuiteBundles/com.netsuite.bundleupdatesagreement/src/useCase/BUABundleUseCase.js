define(["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports["default"] = void 0;

  /**
   * Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved.
   */
  var self;

  var BUABundleUseCase =
  /** @class */
  function () {
    function BUABundleUseCase(options) {
      this._errors = {
        OPTIONS_IS_REQUIRED: 'options is required.',
        DEPENDENCIES_IS_REQUIRED: 'options.dependencies is required.',
        GATEWAY_IS_REQUIRED: 'options.dependencies["BUABundleGateway"] is required.'
      };

      this.getBUATotalCount = function () {
        var countQuery = 'SELECT * from customrecord_bua_bundle_update_pref';
        return self.BUABundleGateway._runQuery(countQuery).length;
      };

      if (!options) {
        throw new Error(this._errors.OPTIONS_IS_REQUIRED);
      }

      if (!options.dependencies) {
        throw new Error(this._errors.DEPENDENCIES_IS_REQUIRED);
      }

      if (!options.dependencies.BUABundleGateway) {
        throw new Error(this._errors.GATEWAY_IS_REQUIRED);
      }

      self = this;
      self.BUABundleGateway = options.dependencies.BUABundleGateway;
      self._runQuery = self.BUABundleGateway.runQuery;
      self._constants = self.BUABundleGateway.getConstants();
    }

    BUABundleUseCase.prototype.getTranslationString = function (collection, key) {
      return self.BUABundleGateway.getTranslations(collection, key);
    };

    BUABundleUseCase.prototype.setDefaultValues = function (form) {
      var TRANSLATION_COLLECTION = self._constants.CUSTOM_RECORD.UPDATE_VERIFICATION.TRANSLATION_COLLECTION.ID;
      var _a = self._constants.CUSTOM_RECORD.UPDATE_VERIFICATION.FIELDS,
          CUSTOM_SEGMENT_CHANGES = _a.CUSTOM_SEGMENT_CHANGES,
          CUSTOM_RECORD_CHANGES = _a.CUSTOM_RECORD_CHANGES,
          CLASSIFICATION_CHANGES = _a.CLASSIFICATION_CHANGES,
          REPORT_CHANGES = _a.REPORT_CHANGES,
          CUSTOM_TRANSACTION_CHANGES = _a.CUSTOM_TRANSACTION_CHANGES,
          NAVIGATION_LINKS = _a.NAVIGATION_LINKS,
          SUITEAPP_UPDATES_SANDBOX = _a.SUITEAPP_UPDATES_SANDBOX,
          ALL_CHANGES = _a.ALL_CHANGES,
          WARNING_MESSAGE = _a.WARNING_MESSAGE;
      var _b = self._constants.CUSTOM_RECORD.UPDATE_VERIFICATION.DEFAULT_TEXT,
          CUSTOM_SEGMENT_CHANGES_TEXT_0 = _b.CUSTOM_SEGMENT_CHANGES_TEXT_0,
          CUSTOM_SEGMENT_CHANGES_TEXT_1 = _b.CUSTOM_SEGMENT_CHANGES_TEXT_1,
          CUSTOM_SEGMENT_CHANGES_TEXT_2 = _b.CUSTOM_SEGMENT_CHANGES_TEXT_2,
          CUSTOM_SEGMENT_CHANGES_TEXT_3 = _b.CUSTOM_SEGMENT_CHANGES_TEXT_3,
          CUSTOM_SEGMENT_CHANGES_TEXT_4 = _b.CUSTOM_SEGMENT_CHANGES_TEXT_4,
          CUSTOM_SEGMENT_CHANGES_TEXT_5 = _b.CUSTOM_SEGMENT_CHANGES_TEXT_5,
          CUSTOM_SEGMENT_CHANGES_TEXT_6 = _b.CUSTOM_SEGMENT_CHANGES_TEXT_6,
          CUSTOM_RECORD_CHANGES_TEXT_0 = _b.CUSTOM_RECORD_CHANGES_TEXT_0,
          CUSTOM_RECORD_CHANGES_TEXT_1 = _b.CUSTOM_RECORD_CHANGES_TEXT_1,
          CUSTOM_RECORD_CHANGES_TEXT_2 = _b.CUSTOM_RECORD_CHANGES_TEXT_2,
          CUSTOM_RECORD_CHANGES_TEXT_3 = _b.CUSTOM_RECORD_CHANGES_TEXT_3,
          CUSTOM_RECORD_CHANGES_TEXT_4 = _b.CUSTOM_RECORD_CHANGES_TEXT_4,
          CUSTOM_RECORD_CHANGES_TEXT_5 = _b.CUSTOM_RECORD_CHANGES_TEXT_5,
          CUSTOM_RECORD_CHANGES_TEXT_6 = _b.CUSTOM_RECORD_CHANGES_TEXT_6,
          CUSTOM_RECORD_CHANGES_TEXT_7 = _b.CUSTOM_RECORD_CHANGES_TEXT_7,
          CUSTOM_RECORD_CHANGES_TEXT_8 = _b.CUSTOM_RECORD_CHANGES_TEXT_8,
          CUSTOM_RECORD_CHANGES_TEXT_9 = _b.CUSTOM_RECORD_CHANGES_TEXT_9,
          CLASSIFICATION_CHANGES_TEXT_0 = _b.CLASSIFICATION_CHANGES_TEXT_0,
          REPORTS_CHANGES_TEXT_0 = _b.REPORTS_CHANGES_TEXT_0,
          TRANSACTION_CHANGES_TEXT_0 = _b.TRANSACTION_CHANGES_TEXT_0,
          NAVIGATION_CHANGES_TEXT_0 = _b.NAVIGATION_CHANGES_TEXT_0,
          SANDBOX_CHANGES_TEXT_0 = _b.SANDBOX_CHANGES_TEXT_0,
          FINAL_CHANGES_TEXT_0 = _b.FINAL_CHANGES_TEXT_0,
          WARNING_MESSAGE_TEXT_0 = _b.WARNING_MESSAGE_TEXT_0,
          WARNING_MESSAGE_TEXT_1 = _b.WARNING_MESSAGE_TEXT_1,
          WARNING_MESSAGE_TEXT_2 = _b.WARNING_MESSAGE_TEXT_2;
      var custom_segments = form.getField({
        id: CUSTOM_SEGMENT_CHANGES
      });
      var custom_records = form.getField({
        id: CUSTOM_RECORD_CHANGES
      });
      var classifications_changes = form.getField({
        id: CLASSIFICATION_CHANGES
      });
      var report_changes = form.getField({
        id: REPORT_CHANGES
      });
      var transaction_changes = form.getField({
        id: CUSTOM_TRANSACTION_CHANGES
      });
      var navigation_links = form.getField({
        id: NAVIGATION_LINKS
      });
      var sandbox_updates = form.getField({
        id: SUITEAPP_UPDATES_SANDBOX
      });
      var ready_to_update = form.getField({
        id: ALL_CHANGES
      });
      var warning_message = form.getField({
        id: WARNING_MESSAGE
      });
      var segment_text0 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_SEGMENT_CHANGES_TEXT_0);
      var segment_text1 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_SEGMENT_CHANGES_TEXT_1);
      var segment_text2 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_SEGMENT_CHANGES_TEXT_2);
      var segment_text3 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_SEGMENT_CHANGES_TEXT_3);
      var segment_text4 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_SEGMENT_CHANGES_TEXT_4);
      var segment_text5 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_SEGMENT_CHANGES_TEXT_5);
      var segment_text6 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_SEGMENT_CHANGES_TEXT_6);
      var record_text0 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_0);
      var record_text1 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_1);
      var record_text2 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_2);
      var record_text3 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_3);
      var record_text4 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_4);
      var record_text5 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_5);
      var record_text6 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_6);
      var record_text7 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_7);
      var record_text8 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_8);
      var record_text9 = self.getTranslationString(TRANSLATION_COLLECTION, CUSTOM_RECORD_CHANGES_TEXT_9);
      var classification_text = self.getTranslationString(TRANSLATION_COLLECTION, CLASSIFICATION_CHANGES_TEXT_0);
      var reports_text = self.getTranslationString(TRANSLATION_COLLECTION, REPORTS_CHANGES_TEXT_0);
      var transaction_text = self.getTranslationString(TRANSLATION_COLLECTION, TRANSACTION_CHANGES_TEXT_0);
      var navigation_text = self.getTranslationString(TRANSLATION_COLLECTION, NAVIGATION_CHANGES_TEXT_0);
      var sandbox_text = self.getTranslationString(TRANSLATION_COLLECTION, SANDBOX_CHANGES_TEXT_0);
      var ready_to_update_text = self.getTranslationString(TRANSLATION_COLLECTION, FINAL_CHANGES_TEXT_0);
      var warning_text0 = self.getTranslationString(TRANSLATION_COLLECTION, WARNING_MESSAGE_TEXT_0);
      var warning_text1 = self.getTranslationString(TRANSLATION_COLLECTION, WARNING_MESSAGE_TEXT_1);
      var warning_text2 = self.getTranslationString(TRANSLATION_COLLECTION, WARNING_MESSAGE_TEXT_2);
      warning_message.defaultValue = "<div style=\"width: 720px; margin: 10px\">\n        <div\n        style=\"\n        font-family: Open Sans, Helvetica, sans-serif;\n        font-size: 12px;\n        color: #4b4949;\n        white-space: normal;\n        \"\n        >\n        <p>\n        <b>" + warning_text0 + "</b> " + warning_text1 + "\n        <a href=\"javascript:nlPopupHelp('DOC_section_162029406973','help')\"\n        >" + warning_text2 + "</a\n        >.\n        </p>\n        </div>\n        </div>";
      custom_segments.defaultValue = "<div style=\"width: 720px; margin: 10px\">\n        <div\n        style=\"\n        font-family: Open Sans, Helvetica, sans-serif;\n        font-size: 12px;\n        color: #4b4949;\n        white-space: normal;\n        \"\n        >\n        <p>" + segment_text0 + "</p>\n        <ul>\n        <li>" + segment_text1 + "</li>\n        <li>" + segment_text2 + "</li>\n        <li>" + segment_text3 + "</li>\n        <li>" + segment_text4 + "</li>\n        <li>" + segment_text5 + "</li>\n        </ul>\n        <p>" + segment_text6 + "</p>\n        </div>\n        </div>\n        </body>\n        </html>";
      custom_records.defaultValue = "<div style=\"width: 720px; margin: 10px\">\n        <div\n        style=\"\n        font-family: Open Sans, Helvetica, sans-serif;\n        font-size: 12px;\n        color: #4b4949;\n        white-space: normal;\n        \"\n        >\n        <p>\n        " + record_text0 + "\n        </p>\n        <ul>\n        <li>\n        " + record_text1 + "\n        <ul>\n        <li>" + record_text2 + "</li>\n        <li>" + record_text3 + "</li>\n        </ul>\n        </li>\n        <li>\n        " + record_text4 + "\n        <ul>\n        <li>" + record_text5 + "</li>\n        <li>" + record_text6 + "</li>\n        </ul>\n        </li>\n        <li>\n        " + record_text7 + "\n        </li>\n        </ul>\n        <span\n        ><br /><b>" + record_text8 + "</b> " + record_text9 + "</span\n        >\n        </div>\n        </div>";
      classifications_changes.defaultValue = "<div style=\" width: 720px; margin: 10px;\">\n        <div style=\" font-family: Open Sans,Helvetica,sans-serif;  font-size: 12px;color: #4b4949;white-space: normal;\">\n        <p>" + classification_text + "</p>\n        </div>\n        </div>";
      report_changes.defaultValue = "<div style=\" width: 720px; margin: 10px;\">\n        <div style=\" font-family: Open Sans,Helvetica,sans-serif;  font-size: 12px;color: #4b4949;white-space: normal;\">\n        <p>" + reports_text + "</p>\n        </div>\n        </div>";
      transaction_changes.defaultValue = "<div style=\" width: 720px; margin: 10px;\">\n        <div style=\" font-family: Open Sans,Helvetica,sans-serif;  font-size: 12px;color: #4b4949;white-space: normal;\">\n        <p>" + transaction_text + "</p>\n        </div>\n        </div>";
      navigation_links.defaultValue = "<div style=\" width: 720px; margin: 10px;\">\n        <div style=\" font-family: Open Sans,Helvetica,sans-serif;  font-size: 12px;color: #4b4949;white-space: normal;\">\n        <p>" + navigation_text + "</p>\n        </div>\n        </div>";
      sandbox_updates.defaultValue = "<div style=\"width: 720px; margin: 10px; \">\n        <div style=\" font-family: Open Sans,Helvetica,sans-serif;  font-size: 12px;color: #4b4949;white-space: normal;\">\n        <p>" + sandbox_text + "\n        </p>\n        </div>\n        </div>";
      ready_to_update.defaultValue = "<div style=\" width: 720px; margin: 10px;\">\n        <div style=\" font-family: Open Sans,Helvetica,sans-serif;  font-size: 12px;color: #4b4949;white-space: normal;\">\n        <p>" + ready_to_update_text + "</p>\n        </div>\n        </div>";
    };

    return BUABundleUseCase;
  }();

  var _default = BUABundleUseCase;
  _exports["default"] = _default;
});