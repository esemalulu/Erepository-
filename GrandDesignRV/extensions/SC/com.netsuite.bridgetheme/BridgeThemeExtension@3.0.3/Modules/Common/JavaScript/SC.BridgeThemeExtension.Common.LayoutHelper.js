define('SC.BridgeThemeExtension.Common.LayoutHelper', [], function () {
  'use strict';
  var layoutComponent = null;
  return {
    setLayoutComponent: function (environmentComponent) {
      layoutComponent = environmentComponent;
    },
    addToViewContextDefinition: function (
      viewId,
      propertyName,
      type,
      callback
    ) {
      if (layoutComponent) {
        return layoutComponent.addToViewContextDefinition(
          viewId,
          propertyName,
          type,
          callback
        );
      }
      console.error('Please set the Layout Component in the Layout Helper.');
      return null;
    }
  };
});
