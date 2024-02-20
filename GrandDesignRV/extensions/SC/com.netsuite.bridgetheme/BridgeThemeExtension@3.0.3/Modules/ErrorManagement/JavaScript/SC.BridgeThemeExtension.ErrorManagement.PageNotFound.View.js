define('SC.BridgeThemeExtension.ErrorManagement.PageNotFound.View', [
  'underscore',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper'
], function ThemeExtensionErrorManagementPageNotFoundView(
  _,
  Configuration,
  LayoutHelper
) {
  'use strict';

  return {
    loadModule: function loadModule() {
      LayoutHelper.addToViewContextDefinition(
        'ErrorManagement.PageNotFound.View',
        'extraErrorMgtPageNotFoundView',
        'object',
        function () {
          return {
            backgroundImage: Configuration.get(
              'errorManagementPageNotFound.pageNotFoundBgrImg'
            ),
            backgroundColor: Configuration.get(
              'errorManagementPageNotFound.bkgdColor'
            ),
            title: Configuration.get('errorManagementPageNotFound.title'),
            text: Configuration.get('errorManagementPageNotFound.text'),
            btnText: Configuration.get('errorManagementPageNotFound.btnText'),
            btnHref: Configuration.get('errorManagementPageNotFound.btnHref')
          };
        }
      );
    }
  };
});
