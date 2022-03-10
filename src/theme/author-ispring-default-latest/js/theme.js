define([
  "core/js/adapt",
  "./themePageView",
  "./themeArticleView",
  "./themeBlockView",
  "./themeView",
], function (
  Adapt,
  ThemePageView,
  ThemeArticleView,
  ThemeBlockView,
  ThemeView
) {
  function onDataReady() {
    $("html").addClass(Adapt.course.get("_courseStyle"));
  }

  function onPostRender(view) {
    var model = view.model;
    var theme = model.get("_ispringDefault");

    if (!theme) return;

    switch (model.get("_type")) {
      case "page":
        new ThemePageView({ model: new Backbone.Model(theme), el: view.$el });
        break;
      case "article":
        new ThemeArticleView({
          model: new Backbone.Model(theme),
          el: view.$el,
        });
        break;
      case "block":
        new ThemeBlockView({ model: new Backbone.Model(theme), el: view.$el });
        break;
      default:
        new ThemeView({ model: new Backbone.Model(theme), el: view.$el });
    }
  }

  function onNavigationPreRender(nav) {
    $(nav.el).addClass("u-display-none");
  }

  function onNavigationRender() {
    renderTopNavigation();
  }

  function renderTopNavigation() {
    var header = document.querySelector(
      "#author-cbt-frame__top__navigation-wrapper"
    );
    if (header && !header.innerHTML) {
      header.innerHTML = Handlebars.templates["cbt-navigation"]();
    }
  }

  function changeNavigationBlockTitle(currentBlock) {
    $(".cbt-navigation__left__block-title").text(
      currentBlock.get("displayTitle")
    );
  }

  Adapt.on({
    "app:dataReady": onDataReady,
    "pageView:postRender articleView:postRender blockView:postRender":
      onPostRender,
    "cbtView:blockLoaded cbtView:blockLoading": changeNavigationBlockTitle,
  });

  Adapt.once("navigationView:postRender", onNavigationPreRender);
  Adapt.on("navigationView:postRender", onNavigationRender);
  Adapt.on(
    "cbtView:renderTopNavigation cbtView:onTemplateRendered",
    renderTopNavigation
  );
});
