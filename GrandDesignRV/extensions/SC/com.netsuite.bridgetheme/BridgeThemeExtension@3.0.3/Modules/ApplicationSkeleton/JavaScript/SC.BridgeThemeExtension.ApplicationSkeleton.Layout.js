define('SC.BridgeThemeExtension.ApplicationSkeleton.Layout', [
  'SC.BridgeThemeExtension.Common.Configuration',
  'underscore'
], function ThemeExtensionApplicationSkeletonLayout(Configuration, _) {
  'use strict';

  return {
    loadModule: function loadModule() {
      var fixedHeader = Configuration.get('header.fixedHeader');
      if (fixedHeader) {
        jQuery(window).scroll(function () {
          if ($(window).width() > 992) {
            if (!jQuery('header').hasClass('checkout-layout-header')) {
              var HeaderHeight = jQuery('#site-header').outerHeight(true);
              var y = jQuery(this).scrollTop();
              if (y >= 300) {
                jQuery('body').addClass('fixed-header');
                jQuery('#main-container').css('padding-top', HeaderHeight);
              }
              if (y < 1) {
                jQuery('body').removeClass('fixed-header');
                jQuery('#main-container').css('padding-top', '0px');
              }
            }
          }
        });
      }
    }
  };
});
