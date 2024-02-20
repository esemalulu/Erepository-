define('CXExtensibility.CoreContent.CoreContentModule', [
    'CXExtensibility.CoreContent.CMSMerchzoneCCT',
], function (CMSMerchzoneCCT) {
    'use strict';

    return {
        mountToApp: function mountToApp(container) {
            CMSMerchzoneCCT.mountToApp(container);
        },
    };
});
