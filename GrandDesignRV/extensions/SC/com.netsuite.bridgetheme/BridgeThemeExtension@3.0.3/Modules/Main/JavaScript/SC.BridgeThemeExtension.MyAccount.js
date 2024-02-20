define('SC.BridgeThemeExtension.MyAccount', [
  'SC.BridgeThemeExtension.ApplicationSkeleton.Layout',
  'SC.BridgeThemeExtension.Footer',
  'SC.BridgeThemeExtension.ErrorManagement.PageNotFound.View',
  'SC.BridgeThemeExtension.ItemRelations.SC.Configuration',
  'SC.BridgeThemeExtension.LoadWebFont',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper'
], function SCBridgeThemeExtensionMyAccountEntryPoint(
  BridgeThemeExtApplicationSkeletonLayout,
  BridgeThemeExtFooter,
  BridgeThemeExtErrorManagementPageNotFoundView,
  BridgeThemeExtItemRelations,
  BridgeThemeExtLoadWebFont,
  Configuration,
  LayoutHelper
) {
  'use strict';

  return {
    mountToApp: function (container) {
      Configuration.setEnvironment(container.getComponent('Environment'));
      LayoutHelper.setLayoutComponent(container.getComponent('Layout'));
      BridgeThemeExtApplicationSkeletonLayout.loadModule();
      BridgeThemeExtFooter.loadModule();
      BridgeThemeExtErrorManagementPageNotFoundView.loadModule();
      BridgeThemeExtItemRelations.loadModule();
      BridgeThemeExtLoadWebFont.loadModule();
    }
  };
});
