define('SC.BridgeThemeExtension.Home', [
  'underscore',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper'
], function ThemeExtensionHome(_, Configuration, LayoutHelper) {
  'use strict';

  return {
    loadModule: function loadModule() {
      var carousel = Configuration.get('home.themeCarouselImages', []);
      var topPromo = Configuration.get('home.topPromo', []);
      var infoblock = Configuration.get('home.infoblock', []);
      var freeTextImages = Configuration.get('home.freeTextImages', []);
      var infoblockTile = false;
      var infoblockFive = false;
      var showCarousel = false;
      var carouselObj;
      var isReady = false;

      LayoutHelper.addToViewContextDefinition(
        'Home.View',
        'extraHomeViewContext',
        'object',
        function (context) {
          carouselObj = context.carousel;
          isReady =
            _.has(context, 'isReady') && !_.isUndefined(context.isReady)
              ? context.isReady
              : true;

          if (!_.isEmpty(carouselObj)) {
            _.each(carouselObj, function (carousel) {
              if (!_.isEmpty(carousel.image)) {
                _.extend(carousel, {
                  isAbsoluteUrl: carousel.image.indexOf('core/media') !== -1
                });
              }
            });
          } else {
            carouselObj = carousel;
          }

          if (infoblock.length === 3 || infoblock.length > 5) {
            infoblockTile = true;
          }

          if (infoblock.length === 5) {
            infoblockFive = true;
          }

          return {
            isReady: isReady,
            showCarousel: carouselObj && !!carouselObj.length,
            carousel: carouselObj,
            infoblockCount: infoblock.length,
            infoblockTile: infoblockTile,
            infoblockFive: infoblockFive,
            infoblock: infoblock,
            freeText: _(Configuration.get('home.freeText', '')).translate(),
            freeTextTitle: _(
              Configuration.get('home.freeTextTitle')
            ).translate(),
            showFreeTextImages: freeTextImages && !!freeTextImages.length,
            freeTextImages: freeTextImages,
            topPromo: topPromo
          };
        }
      );
    }
  };
});
