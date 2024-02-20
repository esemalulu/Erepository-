define('SC.BridgeThemeExtension.Footer', [
  'underscore',
  'SC.BridgeThemeExtension.Common.Configuration',
  'SC.BridgeThemeExtension.Common.LayoutHelper',
  'jQuery'
], function ThemeExtensionFooter(_, Configuration, LayoutHelper, jQuery) {
  'use strict';

  var getColLinks = function getColLinks(whichColumn) {
    // for large format footer with up to four columns of links
    var multiColLinks = Configuration.get('footer.multiColLinks', []);
    var targetColLinks = jQuery.grep(multiColLinks, function targetColLinks(e) {
      return e.column === whichColumn;
    });
    return targetColLinks;
  };

  return {
    loadModule: function loadModule() {
      // for Social Media Links
      var socialMediaLinks = Configuration.get('footer.socialMediaLinks', []);
      // for Copyright message
      var initialConfigYear = Configuration.get('footer.copyright.initialYear');
      var initialYear = initialConfigYear
        ? parseInt(initialConfigYear, 10)
        : new Date().getFullYear();
      var currentYear = new Date().getFullYear();

      LayoutHelper.addToViewContextDefinition(
        'Footer.View',
        'extraFooterViewContext',
        'object',
        function () {
          return {
            primaryText: Configuration.get('footer.primaryText'),
            secondaryText: Configuration.get('footer.secondaryText'),
            col1Links: getColLinks('Column 1'),
            col2Links: getColLinks('Column 2'),
            col3Links: getColLinks('Column 3'),
            col4Links: getColLinks('Column 4'),
            backgroundUrl: Configuration.get('footer.backgroundImg'),
            iconClass: Configuration.get('footer.icon'),
            title: Configuration.get('footer.title'),
            socialMediaLinks: socialMediaLinks,
            socialMediaLinksTitle: Configuration.get(
              'footer.socialMediaLinksTitle'
            ),
            copyright: {
              hide: !!Configuration.get('footer.copyright.hide'),
              companyName: Configuration.get('footer.copyright.companyName'),
              initialYear: initialYear,
              currentYear: currentYear,
              showRange: initialYear < currentYear
            },
            showLegacyNewsletter: Configuration.get(
              'footer.showLegacyNewsletter'
            )
          };
        }
      );
    }
  };
});
