// @module CXExtensibility.CoreContent.CMSMerchzoneCCT

// An example cct that shows a message with the price, using the context data from the item

// Use: Utils.getAbsoluteUrl(getExtensionAssetsPath('services/service.ss'))
// to reference services or images available in your extension assets folder

define('CXExtensibility.CoreContent.CMSMerchzoneCCT', ['CXExtensibility.CoreContent.CMSMerchzoneCCT.View'], function (
    CMSMerchzoneCCTView
) {
    'use strict';

    return {
        mountToApp: function mountToApp(container) {
            var environment = container.getComponent('Environment');

            environment.setTranslation('fr_CA', [{ key: 'See More', value: 'Voir Plus' }]);
            environment.setTranslation('es_ES', [{ key: 'See More', value: 'Ver Más' }]);

            container.getComponent('CMS').registerCustomContentType({
                // this property value MUST be lowercase
                id: 'CMS_MERCHZONETWO',

                // The view to render the CCT
                view: CMSMerchzoneCCTView,
            });
        },
    };
});
