define(["core/js/adapt", "libraries/mobx"], function (Adapt, mobx) {
  var startBlock = new Backbone.Model({
    _id: "START_BLOCK",
  });
  var endBlock = new Backbone.Model({
    _id: "END_BLOCK",
  });
  function isFastPreview () {
    return window.name === "fast-preview" || opener && opener.name === "fast-preview";
  };

  var currentBlockIndex = isFastPreview() ? 0 : -1;

  function MobxState() {
    
    return mobx.observable({
      previousBlockIndex: null,
      currentBlockIndex: currentBlockIndex,
      get pages() {
        return Adapt.contentObjects.models;
      },
      get articles() {
        return Adapt.articles.models;
      },
      get blocks() {
        return Adapt.blocks.models;
      },

      blockByIndex: function (index) {
        var blockLength = this.blocks.length;
        if (index === -1) {
          return startBlock;
        }
        if (index === blockLength) {
          return endBlock;
        }
        return this.blocks[index];
      },

      get components() {
        return Adapt.components.models;
      },
      get previousArticle() {
        var block = this.previousBlock;
        return block && block.getParent();
      },
      get previousBlock() {
        var blocks = this.blocks;
        var block = blocks[this.previousBlockIndex];
        return block;
      },
      get previousComponents() {
        var block = this.previousBlock;
        return block && block.getChildren();
      },
      get currentArticle() {
        var block = this.currentBlock;
        return block && block.getParent();
      },
      get currentBlock() {
        var blocks = this.blocks;
        var block = blocks[this.currentBlockIndex];
        return block;
      },
      get currentComponents() {
        var block = this.currentBlock;
        return block && block.getChildren();
      },

      get firstPageId() {
        var pages = this.pages;
        var page = pages[0];
        return page && page.get("_id");
      },

      findPresentationComponents: function (components) {
        return components.filter(this.isComponentForPresenation.bind(this));
      },
      findInstructorComponents: function (components) {
        return components.filter(this.isComponentForInstructor.bind(this));
      },
      isComponentForPresenation: function (component) {
        return true;
      },
      isComponentForInstructor: function (component) {
        //var metadata = component.get('__metadata');

        var output = component.get("output");
        if (!output) return;

        var isForInstructor = !!(output && output.iltSettings.iltInstructor);
        return isForInstructor;
      },
    });
  }
  return MobxState;
});
