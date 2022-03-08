define([
  "core/js/adapt",
  "./models/mobxState.js",
  "./views/iltInstructorView.js",
  "./views/iltPresentationView.js",
  "./views/iltMakeThumbnailView.js",
], function (
  Adapt,
  MobxState,
  InstructorView,
  PresentationView,
  ThumbnailView
) {
  var StateManager = Backbone.View.extend({
    isPresentationWindow: function () {
      return window.name === "contntWdw";
    },

    isFastPreview: function () {
      return window.name === "fast-preview" || opener && opener.name === "fast-preview";
    },

    isThumbnailView: function () {
      return window.name === "ispring-thumbnail";
    },

    initialize: function () {
      if (this.isFastPreview()) {
        $(".js-loading").hide();
        // this.createFastPresentationWindow();
        // return;
      }

      if (this.isThumbnailView()) {
        $(".js-loading").hide();
        this.createThumbnailView();
        return;
      }

      
      !this.isPresentationWindow() && this.createInstructorWindow();
      this.isPresentationWindow() && this.createPresentationWindow();
    },

    disposeInterval: function () {
      // console.log("dispose interval");
      // function dispose() {
      //   console.log({
      //     opener,
      //   });
      //   if (opener) return;
      //   window.close();
      // }
      // setInterval(dispose.bind(this), 1000);
    },

    createInstructorWindow: function () {
      this.manager = this;
      this.childWindow = null;
      window.Adapt = Adapt;
      Adapt.stateManager = this;
      this.state = new MobxState();
      new InstructorView();
    },

    createPresentationWindow: function () {
      this.disposeInterval();
      Adapt.stateManager = opener.Adapt.stateManager;
      this.manager = opener.Adapt.stateManager;
      this.state = opener.Adapt.stateManager.state;
      new PresentationView();
    },

    createThumbnailView: function () {
      this.manager = this;
      this.childWindow = null;
      window.Adapt = Adapt;
      Adapt.stateManager = this;
      this.state = new MobxState();
      var p = new ThumbnailView();
      this.state.currentBlockIndex = 0;
      p.goToBlock(0);
    },
  });

  return StateManager;
});
