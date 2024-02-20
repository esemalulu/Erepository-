define('SC.BridgeThemeExtension.Shopping', [
  'SC.BridgeThemeExtension.ApplicationSkeleton.Layout',
  'SC.BridgeThemeExtension.Footer',
  'SC.BridgeThemeExtension.Home',
  'SC.BridgeThemeExtension.ErrorManagement.PageNotFound.View',
  'SC.BridgeThemeExtension.ItemRelations.SC.Configuration',
  'SC.BridgeThemeExtension.LoadWebFont',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper',
  'Utils',
  'underscore'
], function SCBridgeThemeExtensionShoppingEntryPoint(
  BridgeThemeExtApplicationSkeletonLayout,
  BridgeThemeExtFooter,
  BridgeThemeExtHome,
  BridgeThemeExtErrorManagementPageNotFoundView,
  BridgeThemeExtItemRelations,
  BridgeThemeExtLoadWebFont,
  Configuration,
  LayoutHelper,
  Utils,
  _
) {
  'use strict';

  return {
    mountToApp: function (container) {
      Configuration.setEnvironment(container.getComponent('Environment'));
      LayoutHelper.setLayoutComponent(container.getComponent('Layout'));

      Utils.initBxSlider = _.initBxSlider = _.wrap(
        _.initBxSlider,
        function initBxSlider(fn) {
          var autoPlayCarousel = Configuration.get('home.autoPlayCarousel');
          var carouselSpeed = Configuration.get('home.carouselSpeed');

          if (
            arguments.length !== 0 &&
            arguments[1] &&
            arguments[1][0] &&
            arguments[1][0].id === 'home-image-slider-list'
          ) {
            arguments[2] = _.extend(arguments[2], {
              auto: autoPlayCarousel,
              pause: carouselSpeed
            });
          }

          return fn.apply(this, _.toArray(arguments).slice(1));
        }
      );

      BridgeThemeExtApplicationSkeletonLayout.loadModule();
      BridgeThemeExtFooter.loadModule();
      BridgeThemeExtHome.loadModule();
      BridgeThemeExtErrorManagementPageNotFoundView.loadModule();
      BridgeThemeExtItemRelations.loadModule();
      BridgeThemeExtLoadWebFont.loadModule();
    }
  };
});
