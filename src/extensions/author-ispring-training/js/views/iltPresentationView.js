define(["core/js/adapt", "libraries/mobx"], function (Adapt, mobx) {
  var ILTPresentationView = Backbone.View.extend({
    globalElements: {
      wrapper: "#wrapper",
      app: "#app",
    },

    handlers: {
      instructor: {
        jumpTo: "iltInstructor:jumpToSlide",
      },
      adapt: {
        pageReady: "pageView:ready",
        menuReady: "menuView:ready",
        routerMenu: "router:menu",
        routerPage: "router:page",
      },
    },

    setState: function () {
      var isDoubleScreen = window.name === "contntWdw";
      if (isDoubleScreen) {
        this.state = opener.Adapt.stateManager.state;
      }
    },

    initialize: function () {
      this.setState();
      this.setupTemplate();

      this.evs = {
        WB_NEXT: this.next.bind(this),
        WB_BACK: this.back.bind(this),
        WB_JS: this.jumpTo.bind(this),
        WB_RESET: this.reset.bind(this),
        WB_FS: this.enterFullScreen.bind(this),
        WB_EFS: this.exitFullScreen.bind(this),
      };

      window.addEventListener(
        "message",
        function (event) {
          var eventHandler = this.evs[event.data.label];
          eventHandler && eventHandler(event.data);
        }.bind(this)
      );
    },


    centerWindow: function () {
      $("body").css("display", "flex");
      $("body").css("flex-direction", "column");
      $("body").css("justify-content", "center");
    },

    /**
     * Mount Handlebars Template
     */
    setupTemplate: function () {
      this.centerWindow();

      var globalElements = this.globalElements;
      $(globalElements.wrapper).hide();
      var currentBlockIndex = Adapt.stateManager.state.currentBlockIndex + 1;

      $(globalElements.app).append(
        Handlebars.templates["presentationWindow"]({
          currentBlockIndex: currentBlockIndex,
        })
      );
      this.setupILTEvents();
      $("#presentationWindow__startBlock").append(
        Handlebars.templates["ispringBlockStart"]()
      );
      $("#presentationWindow__endBlock").append(
        Handlebars.templates["ispringBlockEnd"]()
      );

      $(".presentationWindow__inner__content__center").on("click", function () {
        opener.postMessage({ label: "WB_NEXT" });
      });
      $("#presentationWindow__startBlock").on("click", function () {
        opener.postMessage({ label: "WB_NEXT" });
      });

      $("#prevCtrlL").on("click", function () {
        opener.postMessage({ label: "WB_BACK" });
      });
      
      this.listenTo(Adapt, {
        "device:changed": this.onDeviceResize,
      });
    },


    onDeviceResize: function() {
      var h = 1;
      var w = 1;
    },

    next: function (data) {
      this.goToBlock(data.value);
    },
    back: function (data) {
      this.goToBlock(data.value);
    },
    jumpTo: function (data) {
      this.goToBlock(data.value);
    },
    reset: function (data) {
      this.goToBlock(data.value);
    },
    enterFullScreen: function () {
      var element = document.querySelector("#container");
      element.requestFullscreen().then(function () {});
    },
    exitFullScreen: function () {
      document.exitFullscreen().then(function () {
        // element has exited fullscreen mode
      });
    },

    goToBlock: function (blockIndex) {
      var block = Adapt.stateManager.state.blockByIndex(blockIndex);
      this.loadSlideIndex(blockIndex);
      this.loadBlockView(block);
    },
    /**
     * Load content when page are rendered
     * (when hash route changes it triggers pageRender events)
     */
    loadContentOnPageRender: function () {
      $(".article").hide();
      $(".block").hide();
      $(".component").hide();
      this.goToBlock(Adapt.stateManager.state.currentBlockIndex);
    },

    setupILTEvents: function () {
      var instructor = this.handlers.instructor;
      var adapt = this.handlers.adapt;

      Adapt.on({
        [adapt.pageReady]: this.loadContentOnPageRender.bind(this),
      });

      $("#fullScreenCtrl").on("click", function () {
        var element = document.querySelector(".presentationWindow__inner");
        element.requestFullscreen().then(function () {});
      });

      $(".presentationWindow__inner").on("fullscreenchange", function () {
        var display = $("#fullScreenCtrl").css("display");
        $("#fullScreenCtrl").css(
          "display",
          display === "none" ? "block" : "none"
        );
      });
    },

    renderBlock: function (currentBlock) {
      var id = currentBlock.get("_id");
      if (["START_BLOCK", "END_BLOCK"].includes(id)) {
        return;
      }
      var content = $(".presentationWindow__inner__content__center").first();
      var currentArticle = currentBlock.getParent();

      var componentsInView = currentBlock
        .getChildren()
        .filter(this.isILTPresentationComponent);

      componentsInView.forEach(this.showPresentationComponent.bind(this));
      console.log(componentsInView.length);

      var selector1 =
        ".article__container > .article." + currentArticle.get("_id");
      var $block = $(selector1)
        .find(".block__container > .block." + currentBlock.get("_id"))
        .first()
        .detach();

      content.append($block);
      $block.show();
    },

    mountBlockBack: function (blockId) {
      var content = $(".presentationWindow__inner__content__center").first();
      var children = content.children();
      var $block = children.first().detach();
      var blockId = $block.data("adapt-id");
      var blockModel = Adapt.blocks.models.find(
        (m) => m.get("_id").toString() === blockId
      );

      var previousArticle = blockModel.getParent();
      var selector1 =
        ".article__container > .article." + previousArticle.get("_id");
      $(selector1).find(".block__container").append($block);
    },

    loadSlideIndex: function (blockIndex) {
      $(".slideIndex").html(1 + blockIndex);
    },

    showStartSlide: function () {
      $(".presentationWindow__inner__content__center").hide();
      $("#presentationWindow__endBlock").hide();
      $(".presentationWindow__inner__block-img").hide();
      $(".presentationWindow__inner__block-brand").hide();
      $(".presentationWindow__inner__content__bottom__end").hide();
      $("#presentationWindow__startBlock").show();
    },

    showEndSlide: function () {
      $(".presentationWindow__inner__content__center").hide();
      $("#presentationWindow__startBlock").hide();
      $(".presentationWindow__inner__block-img").hide();
      $(".presentationWindow__inner__block-brand").hide();
      $(".presentationWindow__inner__content__bottom__end").hide();
      $("#presentationWindow__endBlock").show();
    },

    showContentSlide: function () {
      var startBlock = $("#presentationWindow__startBlock");
      startBlock.hide();
      var endBlock = $("#presentationWindow__endBlock");
      endBlock.hide();
      $(".presentationWindow__inner__content__bottom__end").show();
      $(".presentationWindow__inner__block-img").show();
      $(".presentationWindow__inner__block-brand").show();
      var coursewareBlock = $(".presentationWindow__inner__content__center");
      coursewareBlock.show();
    },

    handleSlideDisplay: function (blockId) {
      if (blockId === "START_BLOCK") {
        this.showStartSlide();
        return;
      } else if (blockId === "END_BLOCK") {
        this.showEndSlide();
        return;
      }
      this.showContentSlide();
    },

    loadBlockView: function (currentBlock) {
      var blockId = currentBlock.get("_id");
      this.handleSlideDisplay(blockId);
      var content = $(".presentationWindow__inner__content__center").first();
      var children = content.children();

      if (children.length === 0) {
        this.renderBlock(currentBlock);
      } else {
        this.mountBlockBack(blockId);
        this.renderBlock(currentBlock);
      }
    },

    isILTPresentationComponent: function (component) {
      if (!component) return false;
      var outputTypes = component.get("output");
      var metadata = component.get("__metadata");

      if (!outputTypes) return false;

      var isPresentationComponent =
        outputTypes && outputTypes.iltSettings.iltStudent;

      return !!isPresentationComponent;
    },

    showPresentationComponent: function (component) {
      var selector = ".component." + component.get("_id").toString();
      var $comp = $(selector);
      $comp.show();
    },
  });

  return ILTPresentationView;
});
