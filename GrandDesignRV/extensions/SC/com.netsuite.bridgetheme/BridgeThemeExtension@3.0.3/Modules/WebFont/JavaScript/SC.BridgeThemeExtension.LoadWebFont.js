define('SC.BridgeThemeExtension.LoadWebFont', [
  'SC.BridgeThemeExtension.Common.Configuration'
], function SCBridgeThemeExtensionLoadWebFont(Configuration) {
  'use strict';

  return {
    loadModule: function loadModule() {
      if (
        Configuration.get('bridge.webFonts.isWebFontEnabled') &&
        Configuration.get('bridge.webFonts.isWebFontAsync')
      ) {
        window.WebFontConfig = Configuration.get(
          'bridge.webFonts.webFontConfig'
        );

        if (SC.ENVIRONMENT.jsEnvironment === 'browser') {
          (function (d) {
            var wf = d.createElement('script'),
              s = d.scripts[0];
            wf.src =
              ('https:' === document.location.protocol ? 'https' : 'http') +
              '://ajax.googleapis.com/ajax/libs/webfont/1.5.18/webfont.js';
            wf.type = 'text/javascript';
            wf.async = 'true';
            s.parentNode.insertBefore(wf, s);
          })(document);
        }
      }
    }
  };
});
