define('SC.BridgeThemeExtension.Common.Configuration', [], function () {
  'use strict';
  var environment = null;
  return {
    setEnvironment: function (environmentComponent) {
      environment = environmentComponent;
    },
    get: function (key) {
      if (environment) {
        return environment.getConfig(key)
      }
      console.error('Please set the Env.Component in the Layout Helper.');
      return null;
    },
    getOverallConfiguration: function () {
      return environment.application.getConfig();
    }
  };
});
