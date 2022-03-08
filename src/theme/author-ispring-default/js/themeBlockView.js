define(["./themeView", "core/js/adapt"], function (ThemeView, Adapt) {
  var ThemeBlockView = ThemeView.extend({
    className: function () {
      var classes = "";
      classes += this.model.get("_isDividerBlock") ? "is-divider-block " : "";
      var bgStyles = this.model.get("_backgroundStyles");
      var opacityDisabled =
        bgStyles && bgStyles._disableOpacity ? "block-opacity-disabled " : "";
      classes += opacityDisabled;
      
      return classes;
    },

    setCustomStyles: function () {},

    onRemove: function () {},
  });

  return ThemeBlockView;
});
