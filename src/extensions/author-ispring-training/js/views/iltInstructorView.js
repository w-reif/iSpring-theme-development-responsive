define(["core/js/adapt", "libraries/mobx"], function (Adapt, mobx) {
  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = (event) => resolve(JSON.parse(event.target.result));
      fileReader.onerror = (error) => reject(error);
      fileReader.readAsText(file);
    });
  }

  function getLocalNotesAccessor() {
    return "slides-" + Adapt.config.get("_id");
  }

  var ILTInstructorView = Backbone.View.extend({
    // Selectors for global elements
    globalElements: {
      wrapper: "#wrapper",
      app: "#app",
    },

    wasPresentationWindowLaunchedBefore: false,

    // Backbone constructor fn
    initialize: function () {
      this.stateManager = Adapt.stateManager;
      this.state = this.stateManager.state;
      this.setupTemplate();
      this.setupReactions();
    },

    evs: {
      WB_NEXT: "WB_NEXT",
      WB_BACK: "WB_BACK",
      WB_JS: "WB_JS",
      WB_RESET: "WB_RESET",
      WB_FS: "WB_FS",
      WB_EFS: "WB_EFS",
    },

    // Setup Instructor Window Template
    setupTemplate: function () {
      $(this.globalElements.wrapper).hide();
      $(this.globalElements.app).append(
        Handlebars.templates["instructorWindow"]()
      );
      this.handleThumbStrip();
      this.windowControls.forEach(
        function (control) {
          $(control.selector).on(control.event, control.callback.bind(this));
        }.bind(this)
      );

      var childEvs = {
        WB_NEXT: this.onPresentationNextClicked.bind(this),
        WB_BACK: this.onPresentationBackClicked.bind(this),
      };

      window.addEventListener(
        "message",
        function (event) {
          var eventHandler = childEvs[event.data.label];
          eventHandler && eventHandler();
        }.bind(this)
      );

      Adapt.on(
        "iltInstructor:slidesNotesLoaded",
        function () {
          this.renderSlideNotes();
        }.bind(this)
      );

      this.listenTo(Adapt, {
        "device:changed": this.onDeviceResize,
      });
    },

    onDeviceResize: function () {
      this.handleThumbStrip();
    },

    handleThumbStrip: function () {
      var height = $(".footStick").offset().top - $("#launchCtrl").offset().top;
      $(".thumbStrip").css("height", height + "px");
    },

    renderSlideNotes: function () {
      var accessor = getLocalNotesAccessor();
      var notes = localStorage.getItem(accessor);
      try {
        var parsed = JSON.parse(notes);
        var currentSlideIndex = (this.state.currentBlockIndex) + 1;
        var data = parsed[currentSlideIndex];
        var message = data && data.message;
        if (message) {
          $("#addlNotesDiv").html(message);
        }
      } catch (error) {
        localStorage.setItem(accessor, JSON.stringify({}));
      }
    },

    onPresentationBackClicked: function () {
      this.prevBlock();
    },

    onPresentationNextClicked: function () {
      this.nextBlock();
    },

    // Setup Mobx reaction to state properties
    setupReactions: function () {
      mobx.reaction(
        this.bindMobxCurrentBlockIndex.bind(this),
        this.reactToCurrentBlockIndex.bind(this)
      );
    },

    bindMobxCurrentBlockIndex: function () {
      return this.state.currentBlockIndex;
    },

    reactToCurrentBlockIndex: function () {
      var blockIndex = this.state.currentBlockIndex;
      var block = this.state.blockByIndex(blockIndex);
      this.setupBlockForInstructor(block);
      this.sendChildWinEvent(this.evs.WB_JS, blockIndex);
      this.renderSlideNotes();
    },

    setupBlockForInstructor: function (block) {
      var blockId = block.get("_id");
      $("#notesDiv").html(null);

      if (["START_BLOCK", "END_BLOCK"].includes(blockId)) {
        var title =
          Adapt.course.get("displayTitle") || Adapt.course.get("title");
        var prefix = blockId === "START_BLOCK" ? "First Slide" : "Last Slide";
        $("#slideTitle").html("<div>" + prefix + " " + title + "</div>");
        return;
      }

      if (blockId === "END_BLOCK") {
        console.log("render endblock");
        return;
      }

      $("#slideTitle").html(block.get("title"));
      var comps = this.state.findInstructorComponents(block.getChildren());
      $("#notesDiv").hide();
      $("#notesDiv").html(null);
      comps.forEach(function (comp) {
        $("#notesDiv").append(comp.get("textAreaField"));
      });

      $("#notesDiv").show();
    },

    isPresWinOpen: function () {
      var win = this.stateManager.childWindow;
      return win && !win.closed;
    },

    changeBlockIndexState: function (newIndex) {
      this.state.previousBlockIndex = this.state.currentBlockIndex;
      this.state.currentBlockIndex = newIndex;
      var block = this.state.blockByIndex(newIndex);
      this.selectThumb(block.get("_id"));
    },

    sendChildWinEvent: function (label, value) {
      var childWindow = this.stateManager.childWindow;
      if (!childWindow) return;
      childWindow.postMessage({ label: label, value: value }, "*");
    },

    prevBlock: function () {
      if (!this.isPresWinOpen()) {
        return;
      }
      var newIndex = this.state.currentBlockIndex - 1;
      if (newIndex >= -1) {
        this.changeBlockIndexState(newIndex);
        this.sendChildWinEvent(this.evs.WB_BACK, newIndex);
      }
    },

    nextBlock: function () {
      if (!this.isPresWinOpen()) {
        return;
      }
      var isNotLast = this.state.blocks.length !== this.state.currentBlockIndex;
      var newIndex = this.state.currentBlockIndex + 1;
      if (isNotLast) {
        this.changeBlockIndexState(newIndex);
        this.sendChildWinEvent(this.evs.WB_NEXT, newIndex);
      }
    },

    _launchPresentationWin: function () {
      if (!this.isPresWinOpen()) {
        this.stateManager.childWindow = window.open(
          window.location.href + "#/" + this.state.firstPageId,
          "contntWdw",
          "left=0,top=0,width=1280,height=720"
        );
      } else {
        this.stateManager.childWindow.close(); // not working
        this.stateManager.childWindow = null;
      }

      if (!this.wasPresentationWindowLaunchedBefore) {
        this.handleFirstLaunch();
      }
    },

    handleFirstLaunch: function () {
      this.wasPresentationWindowLaunchedBefore = true;
      var blockIndex = this.state.currentBlockIndex
      var block = this.state.blockByIndex(blockIndex);
      this.setupBlockForInstructor(block);
      this.renderSlideNotes();
      this.renderThumbs();
      this.selectThumb(block.get("_id"));
    },

    selectThumb: function (blockId) {
      var targetId = "thumb_" + blockId;
      if (["START_BLOCK", "END_BLOCK"].includes(blockId)) {
        targetId = blockId;
      }
      $(".lh_thumb_selected").removeClass("lh_thumb_selected");
      // $('li[data-blockid="' + blockId + '"').addClass("lh_thumb_selected");
      var toHighlight = document.getElementById(targetId);
      if (toHighlight) {
        toHighlight.classList.add("lh_thumb_selected");
        toHighlight.parentNode.parentNode.scrollTop =
          toHighlight.offsetTop -
          toHighlight.parentNode.offsetTop -
          (document.getElementById("slideTitle").offsetTop -
            document.getElementById("slideTitle").parentNode
              .offsetTop) /*- (toHighlight.parentNode.parentNode.offsetHeight/3)*/;
      }
    },

    restartBlockIndex: function () {
      if (!this.isPresWinOpen()) {
        return;
      }
      var newIndex = 0;
      this.changeBlockIndexState(newIndex);
      this.sendChildWinEvent(this.evs.WB_RESET, newIndex);
    },

    setActiveThumb: function (event) {
      var blockIndex = $(event.target).data("blockindex");
      var blockId = $(event.target).data("blockid");
      this.state.currentBlockIndex = Number(blockIndex);
      this.selectThumb(blockId);
    },

    _createThumbImg: function (options) {
      var thumbImg = document.createElement("img");
      thumbImg.src = options.src;
      thumbImg.id = options.id;
      thumbImg.setAttribute("data-blockid", options.blockId);
      thumbImg.setAttribute("data-blockindex", options.index);
      return thumbImg;
    },

    _createThumbLi: function (options) {
      var thumbList = document.getElementById("thumbList");
      var thumbImg = this._createThumbImg({
        index: options.index,
        blockId: options.blockId,
        src: options.src,
        id: options.id,
      });
      var thumbLi = document.createElement("li");
      thumbLi.classList.add("splide__slide");
      thumbLi.appendChild(thumbImg);
      thumbLi.id = options.id;
      thumbLi.setAttribute("data-blockid", options.blockId);
      thumbLi.setAttribute("data-blockindex", options.index);
      thumbLi.addEventListener("click", this.setActiveThumb.bind(this));
      thumbList.appendChild(thumbLi);
    },

    renderThumbs: function () {
      this._createThumbLi({
        index: -1,
        blockId: "START_BLOCK",
        src: "assets/start.png",
        id: "START_BLOCK",
      });
      var blocks = this.state.blocks;
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var blockId = block.get("_id");
        this._createThumbLi({
          index: i,
          blockId: blockId,
          src: "course/en/assets/thumbs/" + blockId + ".png",
          id: "thumb_" + blockId,
        });
      }
      this._createThumbLi({
        index: blocks.length,
        blockId: "END_BLOCK",
        src: "assets/end.png",
        id: "END_BLOCK",
      });
    },

    // EventListener Bindings
    windowControls: [
      {
        selector: "#launchCtrl",
        event: "click",
        callback: function () {
          this._launchPresentationWin();
        },
      },
      {
        selector: "#previousCtrl",
        event: "click",
        callback: function () {
          this.prevBlock();
        },
      },
      {
        selector: "#nextCtrl",
        event: "click",
        callback: function () {
          this.nextBlock();
        },
      },
      {
        selector: "#restartCtrl",
        event: "click",
        callback: function () {
          this.restartBlockIndex();
        },
      },
      {
        selector: "#inputFile",
        event: "change",
        callback: async function (event) {
          var uploadedFile = event.target.files[0];
          var data = await readFile(uploadedFile);
          document.querySelector("#inputFile").value = "";
          var key = getLocalNotesAccessor();
          localStorage.setItem(key, JSON.stringify(data));
          Adapt.trigger("iltInstructor:slidesNotesLoaded");
        },
      },
    ],
  });

  return ILTInstructorView;
});
