define([
  "core/js/adapt",
  "./stateManager.js",
  "../libraries/html2canvas.js",
], function (Adapt, StateManager, html2canvas) {
  window.Adapt = Adapt;
  window.html2canvas = html2canvas;

  Adapt.once("adapt:start", function onAdaptStarted() {
    new StateManager();
  });

  Adapt.once("app:dataReady", function () {
    configureStartPage();
  });

  function configureStartPage() {
    var isPresentationWindow = window.name === "contntWdw";
    var isThumbnailView = window.name === "ispring-thumbnail";

    var firstPage = Adapt.contentObjects.models[0];
    var _start = {
      _isEnabled: isPresentationWindow || isThumbnailView,
      _startIds: [
        {
          _id: firstPage.get("_id"),
          _skipIfComplete: false,
          _className: "",
        },
      ],
      _force: true,
      _isMenuDisabled: true,
    };

    if (window.name === "fast-preview") {
      _start._isEnabled = true;
    }

    if (window.name === "ispring-thumbnail") {
      _start._isEnabled = true;
    }

    Adapt.course.set("_start", _start);
  }
});
