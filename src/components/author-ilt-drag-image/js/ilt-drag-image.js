const { forEach } = require("underscore");

define([
    'core/js/adapt',
    'core/js/views/componentView',
    'core/js/models/componentModel',
    'jquery'
], function(Adapt, ComponentView, ComponentModel, $) {
    'use strict';

    var DROP_TARGET_TEXT = '···';

    var compView = ComponentView.extend({
        preRender: function () {
            this.model.preloadAssets = {
                images: []
            }
            var image = this.model.get('imageField');
            if(image) {
                this.model.preloadAssets.images.push(image);
            }
            
            if(Adapt.locale!==undefined){
                let langCode = Adapt.config.get('_activeLanguage');
                this.model.attributes.langData = Adapt.locale[langCode];
            } else {
                if(this.model.attributes.langData===undefined){
                    this.model.attributes.langData = {
                        "submit": "SUBMIT",
                        "questionHead": "Question:",
                        "instruction":"<p></p>",
                        "tryAgain": "Try again!",
                        "correctfeedback":"Correct.",
                        "incorrectfeedback":"Incorrect."
                    }
                }
            }

            this.model.attributes.matches = [];
            var selfAt = this.model;

            this.model.attributes.dragItems.forEach(function(v,i){
                selfAt.distractors.push(v.imageField);
            });
            
            this.model.attributes.itemTargetMatching.forEach(function(val,i){
                selfAt.attributes.matches.push(Object.assign({
                        "dragImage":selfAt.distractors[val.dragItemIndex]
                    }, selfAt.attributes.targetAreas[val.targetAreaIndex]));
                    selfAt.distractors[val.dragItemIndex] = null;
            });

            if(this.model.attributes.dragItems.length != this.model.attributes.itemTargetMatching.length){
                //distractors exist
                for(var dI=this.model.distractors.length-1;dI>=0;dI--){
                    if(this.model.distractors[dI]===null){
                        this.model.distractors.splice(dI,1);
                    }
                }
            }

            this.model.correctAnswers = this.model.attributes.matches.map(function (m) {
                return m["dragImage"];
            })
            this.model.correctAnswer = this.model.concatStringFromArray(this.model.correctAnswers);
            
            for(var i=0;i<this.model.attributes.matches.length;i++){
                this.model.labels.push(this.model.attributes.matches[i].dragImage);
            }

            this.model.submitBtnClickedBind = this.model.submitBtnClicked.bind(this.model);

            Adapt.on('cbtView:replay',this.model.replayFn.bind(this.model));
            Adapt.on('cbtView:blockLoaded',this.model.blockLoaded.bind(this.model));

            this.model.dragBinds = {
                start:this.model.dragBindsStart.bind(this.model),
                end:this.model.dragBindsEnd.bind(this.model),
                move:this.model.dragBindsMove.bind(this.model)
            }
        },
        postRender: function (){
            window.addEventListener('resize', this.model.windowResize.bind(this.model));

            var source = this.model.get('imageField');
            if(!source) {
                console.warn("No drag and drop image specified.");
                // this.model.authorCBTInit();
                this.setReadyStatus();
                this.setCompletionStatus();
                return;
            }
            var img = new Image();
            img.modelContext = this;
            img.onload = function (e) {
                this.modelContext.model.imgRes = {width:this.width,height:this.height};
                this.modelContext.model.authorCBTInit();
                this.modelContext.setReadyStatus();
            // }.bind(this);
            }
            img.onerror = function () {
                console.warn("Error while loading image ", source);
                // this.modelContext.model.authorCBTInit();
                this.modelContext.setReadyStatus();
                this.modelContext.setCompletionStatus();
            }.bind(this);
            img.src = source;
        }
    },{
        template: 'ilt-drag-image' // this is the hbs file in the templates directory that will be passed this.model.attributes
    });

    var compModel = ComponentModel.extend({

        initialize: function(){
            this.submitBtnClickedBind = null;
            this.preloadAssets = null;
            this.labels = [];
            this.distractors = [];
            this.wrongAttempts = 0;
            this.correctAnswers = [];
            this.correctAnswer = '';
        },

        authorCBTInit:function(){
            var submitBtn = $('.' + this.attributes._id + ' .ilt-drag-image-submitBtn')[0];
            submitBtn.addEventListener('click', this.submitBtnClickedBind);

            this.addDraggables();
            this.consistentSizes();
        },
        // setOptionSizeConstraints:function(){
        //     if(this.attributes.optionwidth && this.attributes.optionwidth!==undefined && this.attributes.optionwidth!==0){
        //         var imgProps = this.getImageProps();
        //         var optionWidth = (imgProps.scale*this.imgRes.width) * (this.attributes.optionwidth/100);
        //         var optionHeight = (imgProps.scale*this.imgRes.height) * (this.attributes.optionheight/100);
                
        //         $('.' + this.attributes._id + ' .ilt-drag-image-options').css('width',optionWidth+'px');
        //         $('.' + this.attributes._id + ' .ilt-drag-image-target, .' + this.attributes._id + ' .ilt-drag-image-option').each(function(){
        //             $(this).css('height',optionHeight+'px');
        //         });
        //     }
        // },
        replayFn:function (componentID) {
            if(componentID === this.get('_id')){
                this.wrongAttempts = 0;

                var initialHTML = Handlebars.templates['ilt-drag-image'];
                $('.'+this.attributes._id).empty('').html(initialHTML(this.attributes));

                this.authorCBTInit();
            }
        },
        blockLoaded:function (blockModel) {
          if(blockModel.attributes._children.models[0].get('_id') === this.get('_id')){
            this.replayFn(this.get('_id'));

            if(window.state && window.state._developerMode && window.state._developerMode === true){
                $('.' + this.attributes._id + ' .ilt-drag-image-image img').on('click',function(e){
                    
                    var imgProps = this.getImageProps();
                    var clickLeftPc = Math.round(((e.pageX-imgProps.leftOffset)/(imgProps.scale*this.imgRes.width)) * 10000)/100;
                    var clickTopPc = Math.round(((e.pageY-imgProps.topOffset)/(imgProps.scale*this.imgRes.height)) * 10000)/100;
                    if(clickLeftPc<=100 && clickLeftPc>=0 && clickTopPc<=100 && clickTopPc>=0){
                        Adapt.trigger("debugmessages:push", "Left: "+clickLeftPc+"%   Top: "+clickTopPc+"%");
                    }
                }.bind(this));
            }
          }
        },

        getImageProps(){
            var containerEl = $('.' + this.attributes._id + ' .ilt-drag-image-image img')
            var offset = containerEl.offset();

            var imgProps = {
                width:containerEl.width(),
                height:containerEl.height(),
                leftOffset:offset.left,
                topOffset:offset.top,
                scale:0,
            };
            var containerRatio = imgProps.width/imgProps.height;
            var imgRatio = this.imgRes.width/this.imgRes.height;
            
            var constraint = 'width';
            if(imgRatio===1){
                if(containerRatio>1){
                    constraint = 'height';
                }
            } else if(imgRatio>1){
                if(imgRatio>containerRatio){
                } else {
                    constraint = 'height';
                }
            } else {
                if(imgRatio<containerRatio){
                    constraint = 'height';
                }
            }
            if(constraint === 'width'){
                imgProps.scale = imgProps.width/this.imgRes.width;
            } else {
                imgProps.scale = imgProps.height/this.imgRes.height;
            }
            if(imgProps.scale>1){ imgProps.scale = 1; }
            imgProps.leftOffset += (imgProps.width-(imgProps.scale*this.imgRes.width))/2;
            imgProps.topOffset += (imgProps.height-(imgProps.scale*this.imgRes.height))/2;

            return imgProps;
        },


        windowResize:function(e){
            var currentBlock = window.state._currentBlock;
            var blockId = currentBlock && currentBlock.get('_id');
            if(this.get('_parentId') === blockId){
                var delay = 1000/25;
                this.resizeIntervalCount = 10;
                clearInterval(this.resizeInterval);
                this.resizeInterval = setInterval(function(){
                    --this.resizeIntervalCount;
                    if(this.resizeIntervalCount>0){
                        this.consistentSizes();
                    } else {
                        clearInterval(this.resizeInterval);
                    }
                }.bind(this),delay)
            }
        },

        repositionDropOptions: function(){
            $('.' + this.attributes._id + ' .ilt-drag-image-option').each(function(i,el){
                if($(el).data('ontgt')!==undefined){
                    this.optionToTarget(el, $('.ilt-drag-image-target[data-indx="'+$(el).data('ontgt')+'"]')[0]);
                } else {
                    this.optionOrigin(el, i);
                }
            }.bind(this));
        },

        consistentSizes:function(){
            // this.setOptionSizeConstraints();
            
            var elems = $('.'+this.attributes._id+' .ilt-drag-image-option, .'+this.attributes._id+' .ilt-drag-image-target');
            
            // make targets match the fixed width
            var optionWidth = parseFloat($('.'+this.attributes._id+' .ilt-drag-image-options').width());
            for(var elem of elems){
                var padding = parseFloat($(elem).outerWidth()) - parseFloat($(elem).width());
                $(elem).css('width',optionWidth-padding+'px');
            }

            for(var elem of elems){
                var padding = parseFloat($(elem).outerWidth()) - parseFloat($(elem).width());
                $(elem).css('width',optionWidth-padding+'px');
                
                // because height is fixed we reduce the font-size on each element to fit as necessary.
                // $(elem).css('font-size', '');
                // while(this.isOverflown(elem)){
                //     var currentSize = parseFloat($(elem).css('font-size'));
                //     $(elem).css('font-size', (currentSize*0.9)+'px');
                // }
                // $(elem).data('fontsize',parseFloat($(elem).css('font-size')));
            }

            this.positionDropTargets();
        },

        isOverflown:function(element) {
            return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
        },

        submitBtnClicked: function () {
            var correct = this.checkAnswers();
            var feedback = '';
            if (!correct) {
                this.wrongAttempts++;
                if (this.wrongAttempts > 1) {
                    feedback = this.attributes.langData.incorrectfeedback;
                    this.revealCorrectAnswer();
                    this.setCompletionStatus();
                    this.disableUI();
                } else {
                    feedback = this.attributes.langData.tryAgain;
                }
            } else {
                feedback = this.attributes.langData.correctfeedback;
                this.setCompletionStatus();
                this.disableUI();
            }

            $('.' + this.attributes._id + ' .ilt-drag-image-instrBar-text').html(feedback);
        },
        disableUI: function () {
            var submitBtn = $('.' + this.attributes._id + ' .ilt-drag-image-submitBtn')[0];
            submitBtn.setAttribute('disabled', true);
            submitBtn.removeEventListener("click", this.submitBtnClickedBind);

            this.removeListeners();
        },

        checkAnswers: function () {
            var answerStr = this.buildSentence();
            return answerStr === this.correctAnswer;
        },

        buildSentence:function(){
            var elemsArray = $('.'+this.attributes._id+' .ilt-drag-image-target');
            var strArray = [];

            elemsArray.each(function(){
                strArray.push($(this).find('img').attr('src'));
            })

            return this.concatStringFromArray(strArray);
        },

        revealCorrectAnswer: function () {
            this.clearTargets();
            //establish each items order by looking at the text content and referencing
            var elems = $('.' + this.attributes._id + ' .ilt-drag-image-option');
            var slots = $('.' + this.attributes._id + ' .ilt-drag-image-target');
            //get the correct index of each by comparing to _options
            for(var elem of elems){
                var index = this.getIndex(this.correctAnswers, elem.getElementsByTagName('img')[0].attributes.src);
                var tgtEl = slots[index];
                //set to offset of slot at same index
                var slotOffset = $(tgtEl).offset();
                var currentOffset = $(elem).offset();
                var currentAbsPos = {
                    left: parseInt($(elem).css('left')),
                    top: parseInt($(elem).css('top'))
                }
                var origOffset = {
                    left: currentOffset.left-currentAbsPos.left,
                    top: currentOffset.top-currentAbsPos.top
                }
                var newOffset = {
                    top: slotOffset.top - origOffset.top,
                    left: slotOffset.left - origOffset.left
                }
                this.animateToTarget(newOffset,elem,tgtEl);
            }
        },
        animateToTarget:function(newOffset,optEl, targtEl){
            $(optEl).animate(newOffset, 'slow', function(){
                this.optionToTarget(optEl, targtEl);
            }.bind(this));
        },
        addDraggables: function () {
            this.labels = this.shuffle(this.labels);

            var optionsElement = $('.' + this.attributes._id + ' .ilt-drag-image-options');
            var container = $('.' + this.attributes._id + ' .ilt-drag-image-image');
            
            this.labels.forEach(function (labelText, idx) {
                var option = '<div class="ilt-drag-image-option" data-indx="'+idx+'"><img src="' + labelText + '"/></div>';
                optionsElement.append(option);
            });
            var disIdxInit = this.labels.length;
            this.distractors.forEach(function (labelText, idx) {
                var option = '<div class="ilt-drag-image-option" data-indx="'+(disIdxInit+idx)+'"><img src="' + labelText + '"/></div>';
                optionsElement.append(option);
            });
            $('.' + this.attributes._id + ' .ilt-drag-image-option').each(function(i,el){
                this.optionOrigin(el, i);
            }.bind(this));
            this.attributes.matches.forEach(function (m, ti) {
                container.append('<div class="ilt-drag-image-target" data-indx="'+ti+'">' + DROP_TARGET_TEXT + '</div>');
            });

            this.addListeners();
        },

        resetTargets:function(answer){
            var answerSlotCollection = $('.'+this.attributes._id+' .ilt-drag-image-target');
            for (var slot of answerSlotCollection){
                if(slot.innerText === answer){
                    slot.innerHTML = DROP_TARGET_TEXT;
                    $(slot).css('font-size','');
                }
            }
        },
        clearTargets:function(){
            var answerSlotCollection = $('.'+this.attributes._id+' .ilt-drag-image-target');
            for (var slot of answerSlotCollection){
                slot.innerHTML = DROP_TARGET_TEXT;
            }
        },

        positionDropTargets: function () {
            //ref all drop spaces
            var elems = $('.' + this.attributes._id + ' .ilt-drag-image-target');
            var i = -1;


            //for each space
            for (var e of elems) {
                i++;
                var p = {
                    top: this.attributes.matches[i].pcTop,
                    left: this.attributes.matches[i].pcLeft
                }

                //if px not pc
                // p.top = this.attributes.matches[i].pcTop/this.imgRes.height;
                // p.left = this.attributes.matches[i].pcLeft/this.imgRes.width;

                var draggerWidth = $(e).outerWidth(true);
                var draggerHeight = $(e).outerHeight(true);
                
                var imgProps = this.getImageProps();

                imgProps.leftOffset += imgProps.scale*((p.left/100) * this.imgRes.width);
                imgProps.topOffset += imgProps.scale*((p.top/100) * this.imgRes.height);

                switch(this.attributes.matches[i].alignment){
                    case "top-left":
                        // imgProps.leftOffset
                        // imgProps.topOffset
                        break;
                    case "top-centre":
                        imgProps.leftOffset-=draggerWidth/2;
                        // imgProps.topOffset
                        break;
                    case "top-right":
                        imgProps.leftOffset-=draggerWidth;
                        // imgProps.topOffset
                        break;
                    case "centre-left":
                        // imgProps.leftOffset
                        imgProps.topOffset-=draggerHeight/2;
                        break;
                    case "centre-right":
                        imgProps.leftOffset-=draggerWidth;
                        imgProps.topOffset-=draggerHeight/2;
                        break;
                    case "lower-left":
                        // imgProps.leftOffset
                        imgProps.topOffset-=draggerHeight;
                        break;
                    case "lower-centre":
                        imgProps.leftOffset-=draggerWidth/2;
                        imgProps.topOffset-=draggerHeight;
                        break;
                    case "lower-right":
                        imgProps.leftOffset-=draggerWidth;
                        imgProps.topOffset-=draggerHeight;
                        break;
                    case "centre-centre":
                    default:
                        imgProps.leftOffset-=draggerWidth/2;
                        imgProps.topOffset-=draggerHeight/2;
                        break;
                }

                $(e).offset({
                    top: imgProps.topOffset,
                    left: imgProps.leftOffset
                })
            }
            this.repositionDropOptions();
        },

        shuffle: function (array) {
            let counter = array.length;

            // While there are elements in the array
            while (counter > 0) {
                // Pick a random index
                let index = Math.floor(Math.random() * counter);

                // Decrease counter by 1
                counter--;

                // And swap the last element with it
                let temp = array[counter];
                array[counter] = array[index];
                array[index] = temp;
            }

            return array;
        },

        // getIndex: function (elems, elem) {
        //     var index;
        //     for (var i in elems) {
        //         if (elems[i] === elem) {
        //             index = i;
        //             break;
        //         }
        //     }

        //     return index;
        // },

        concatStringFromArray: function (arr) {
            var str = "";
            for (var item of arr) {
                str += item
            }

            return str;
        },












        

        dragBinds:{},

        dragEvtMgr:{
            interval:0,
            beingDragged:null,
            initialPosition:{},
            initialCursorPosition:{},
            currentCursorPosition:{}
        },

        addListeners: function () {
            var elems = $('.' + this.attributes._id + ' .ilt-drag-image-option');
            for (var elem of elems) {
                elem.addEventListener('mouseenter', this.mouseEnterDragAnswer);
                elem.addEventListener('mouseleave', this.mouseLeaveDragAnswer);
                this.addDropListeners(elem);
            }
        },
        removeListeners: function () {
            var elems = $('.' + this.attributes._id + ' .ilt-drag-image-option');
            for (var elem of elems) {
                elem.removeEventListener('mouseenter', this.mouseEnterDragAnswer);
                elem.removeEventListener('mouseleave', this.mouseLeaveDragAnswer);
                this.removeDropListeners(elem);
            }
        },
        mouseEnterDragAnswer: function (e) {
            e.target.classList.add('mouse-enter-answer');
        },

        mouseLeaveDragAnswer: function (e) {
            e.target.classList.remove('mouse-enter-answer');
        },

        addDropListeners:function(el){
            el.addEventListener('touchstart',this.dragBinds.start);
            el.addEventListener('mousedown',this.dragBinds.start);
        },

        removeDropListeners:function(el){
            el.removeEventListener('touchstart',this.dragBinds.start);
            el.removeEventListener('mousedown',this.dragBinds.start);
        },

        dragBindsStart:function(e){
            this.dragEvtMgr.beingDragged = e.target;
            this.dragEvtMgr.initialPosition = {
                x:e.target.offsetLeft,
                y:e.target.offsetTop
            }
            if(e.type==='mousedown'){
                this.dragEvtMgr.initialCursorPosition = {
                    x:e.pageX,
                    y:e.pageY
                }
            } else {
                this.dragEvtMgr.initialCursorPosition = {
                    x:e.touches[0].pageX,
                    y:e.touches[0].pageY
                }
            }
            this.dragBindsMove(e);

            this.dragEvtMgr.beingDragged.classList.add('active');
            this.dragEvtMgr.beingDragged.style.zIndex = 100;

            document.body.addEventListener('touchmove',this.dragBinds.move);
            document.body.addEventListener('mousemove',this.dragBinds.move);

            document.body.addEventListener('touchend',this.dragBinds.end);
            document.body.addEventListener('mouseup',this.dragBinds.end);
            document.body.addEventListener('mouseleave', this.dragBinds.end);

            this.resetTargets(this.dragEvtMgr.beingDragged.innerText);
            this.dragEvtMgr.interval = setInterval(this.dragInterval.bind(this), (1000/30));
        },
        dragInterval:function(){
            if(this.dragEvtMgr.beingDragged){
                this.dragEvtMgr.beingDragged.style.top = (this.dragEvtMgr.initialPosition.y+this.dragEvtMgr.currentCursorPosition.y - this.dragEvtMgr.initialCursorPosition.y)+'px';
                this.dragEvtMgr.beingDragged.style.left = (this.dragEvtMgr.initialPosition.x+this.dragEvtMgr.currentCursorPosition.x - this.dragEvtMgr.initialCursorPosition.x)+'px';
            }
        },
        dragBindsMove:function(e){
            if(e.type==='mousemove' || e.type==='mousedown'){
                this.dragEvtMgr.currentCursorPosition.y = e.pageY;
                this.dragEvtMgr.currentCursorPosition.x = e.pageX;
            } else {
                this.dragEvtMgr.currentCursorPosition.y = e.touches[0].pageY;
                this.dragEvtMgr.currentCursorPosition.x = e.touches[0].pageX;
            }
        },
        dragBindsEnd:function(e){
            if(this.dragEvtMgr.beingDragged === null){  //e.type === 'mouseleave'
                return;
            }

            var dropTargets;
            if(document.elementsFromPoint){
                dropTargets = document.elementsFromPoint(this.dragEvtMgr.currentCursorPosition.x-window.scrollX,this.dragEvtMgr.currentCursorPosition.y-window.scrollY);
            } else if(document.msElementsFromPoint){
                dropTargets = document.msElementsFromPoint(this.dragEvtMgr.currentCursorPosition.x-window.scrollX,this.dragEvtMgr.currentCursorPosition.y-window.scrollY);
            } else {
                console.log('No document.elementsFromPoint support');
            }
            if(dropTargets){
                var tgtFound = null;
                for(var i=1;i<dropTargets.length;i++){
                    if(dropTargets[i] === this.dragEvtMgr.beingDragged){
                    } else if(dropTargets[i].className && dropTargets[i].className.indexOf('ilt-drag-image-option')>-1){
                        if($(dropTargets[i]).data('ontgt')!==undefined){
                            if($(this.dragEvtMgr.beingDragged).data('ontgt')!==undefined){
                                this.optionToTarget(dropTargets[i], $('.ilt-drag-image-target[data-indx="'+$(this.dragEvtMgr.beingDragged).data('ontgt')+'"]')[0]);
                            } else {
                                this.optionOrigin(dropTargets[i], dropTargets[i].dataset.indx);
                            }
                        }
                        // break;
                    } else if(dropTargets[i].className && dropTargets[i].className.indexOf('ilt-drag-image-target')>-1){
                        tgtFound = {
                            class:'ilt-drag-image-target',
                            el: dropTargets[i]
                        };
                        break;
                    } else if(dropTargets[i].className && dropTargets[i].className.indexOf('ilt-drag-image-options')>-1){
                        tgtFound = {
                            class:'ilt-drag-image-options',
                            el: dropTargets[i]
                        };
                        break;
                    }
                }
                if(tgtFound===null){
                    // return to initial position
                    this.optionOrigin(this.dragEvtMgr.beingDragged, this.dragEvtMgr.beingDragged.dataset.indx);
                } else {
                    //snap to position
                    if(tgtFound.class === 'ilt-drag-image-target' && tgtFound.el.textContent){
                        this.optionToTarget(this.dragEvtMgr.beingDragged, tgtFound.el);
                    } else {
                        this.optionOrigin(this.dragEvtMgr.beingDragged, this.dragEvtMgr.beingDragged.dataset.indx);
                    }
                }
            }
            
            this.clearDrag();
        },
        optionToTarget: function (optnEl, tgtEl){
            $(optnEl).data('ontgt', tgtEl.dataset.indx);
            if($(optnEl).data('fontsize')){
                $(tgtEl).css('font-size',$(optnEl).data('fontsize')+'px');
            }
            tgtEl.innerHTML = optnEl.innerHTML;
            // tgtEl.textContent = optnEl.textContent;
            $(optnEl).offset($(tgtEl).offset());
            $('.'+this.attributes._id+' .ilt-drag-image-submitBtn').prop('disabled', false);
        },
        optionOrigin: function(el,i){
            $(el).removeData('ontgt');
            var maxHeight = 0;
            $('.' + this.attributes._id + ' .ilt-drag-image-option').each(function(i,el){
                var thisHght = $(el).outerHeight(true);
                if(thisHght>maxHeight){ maxHeight = thisHght; }
            });
            $(el).css('left','');
            $(el).css('top', (i*(maxHeight*1.1))+'px');
        },
        clearDrag:function(){
            clearInterval(this.dragEvtMgr.interval);

            if(this.dragEvtMgr.beingDragged && this.dragEvtMgr.beingDragged.classList){
                this.dragEvtMgr.beingDragged.classList.remove('active');
            }
            if(this.dragEvtMgr.beingDragged && this.dragEvtMgr.beingDragged.style){
                this.dragEvtMgr.beingDragged.style.zIndex = 10;
            }

            this.dragEvtMgr.beingDragged = null;

            document.body.removeEventListener('touchmove',this.dragBinds.move);
            document.body.removeEventListener('mousemove',this.dragBinds.move);

            document.body.removeEventListener('touchend',this.dragBinds.end);
            document.body.removeEventListener('mouseup',this.dragBinds.end);
            document.body.removeEventListener('mouseleave', this.dragBinds.end);
        }
    });

    

    return Adapt.register('ilt-drag-image', {
        model: compModel,
        view: compView
    })
});
