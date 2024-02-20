define('SC.BridgeThemeExtension.Footer.Simplified', [
  'underscore',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper'
], function ThemeExtensionFooterSimplified(_, Configuration, LayoutHelper) {
  'use strict';

  return {
    loadModule: function loadModule() {
      // for Copyright message
      var initialConfigYear = Configuration.get('footer.copyright.initialYear');
      var initialYear = initialConfigYear
        ? parseInt(initialConfigYear, 10)
        : new Date().getFullYear();
      var currentYear = new Date().getFullYear();

      LayoutHelper.addToViewContextDefinition(
        'Footer.Simplified.View',
        'extraFooterSimplifiedViewContext',
        'object',
        function () {
          return {
            copyright: {
              hide: !!Configuration.get('footer.copyright.hide'),
              companyName: Configuration.get('footer.copyright.companyName'),
              initialYear: initialYear,
              currentYear: currentYear,
              showRange: initialYear < currentYear
            }
          };
        }
      );
    }
  };
});
