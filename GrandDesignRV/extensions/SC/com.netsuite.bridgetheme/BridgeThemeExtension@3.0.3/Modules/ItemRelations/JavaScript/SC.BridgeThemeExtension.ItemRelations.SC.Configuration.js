define('SC.BridgeThemeExtension.ItemRelations.SC.Configuration', [
  'SC.BridgeThemeExtension.Common.Configuration'
], function ThemeExtensionItemRelations(Configuration) {
  'use strict';

  return {
    loadModule: function loadModule() {
      var overallConfiguration = Configuration.getOverallConfiguration();
      if (
        overallConfiguration.bxSliderDefaults &&
        overallConfiguration.bxSliderDefaults.slideWidth
      ) {
        overallConfiguration.bxSliderDefaults.slideWidth = 242;
        overallConfiguration.bxSliderDefaults.maxSlides = 3;
      }
    }
  };
});
