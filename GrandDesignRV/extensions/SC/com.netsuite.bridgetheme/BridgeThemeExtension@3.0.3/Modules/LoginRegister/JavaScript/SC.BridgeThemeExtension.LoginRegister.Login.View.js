define('SC.BridgeThemeExtension.LoginRegister.Login.View', [
  'underscore',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper'
], function ThemeExtensionLoginRegister(_, Configuration, LayoutHelper) {
  'use strict';

  return {
    loadModule: function loadModule() {
      LayoutHelper.addToViewContextDefinition(
        'LoginRegister.Login.View',
        'extraLoginRegisterLoginView',
        'object',
        function () {
          return {
            loginSubtitle: Configuration.get('loginRegister.loginSubtitle'),
            loginText: Configuration.get('loginRegister.loginText')
          };
        }
      );
    }
  };
});
