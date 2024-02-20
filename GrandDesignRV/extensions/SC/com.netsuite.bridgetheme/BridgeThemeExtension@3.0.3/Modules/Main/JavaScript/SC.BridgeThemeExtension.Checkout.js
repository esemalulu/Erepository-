define('SC.BridgeThemeExtension.Checkout', [
  'SC.BridgeThemeExtension.Footer',
  'SC.BridgeThemeExtension.Footer.Simplified',
  'SC.BridgeThemeExtension.ErrorManagement.PageNotFound.View',
  'SC.BridgeThemeExtension.ItemRelations.SC.Configuration',
  'SC.BridgeThemeExtension.LoginRegister.Login.View',
  'SC.BridgeThemeExtension.LoadWebFont',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper'
], function SCBridgeThemeExtensionCheckoutEntryPoint(
  BridgeThemeExtFooter,
  BridgeThemeExtFooterSimplified,
  BridgeThemeExtErrorManagementPageNotFoundView,
  BridgeThemeExtItemRelations,
  BridgeThemeExtLoginRegister,
  BridgeThemeExtLoadWebFont,
  Configuration,
  LayoutHelper
) {
  'use strict';

  return {
    mountToApp: function (container) {
      Configuration.setEnvironment(container.getComponent('Environment'));
      LayoutHelper.setLayoutComponent(container.getComponent('Layout'));
      BridgeThemeExtFooter.loadModule();
      BridgeThemeExtFooterSimplified.loadModule();
      BridgeThemeExtErrorManagementPageNotFoundView.loadModule();
      BridgeThemeExtItemRelations.loadModule();
      BridgeThemeExtLoginRegister.loadModule();
      BridgeThemeExtLoadWebFont.loadModule();
    }
  };
});
