define([
    'core/js/adapt',
    'core/js/views/componentView',
    'core/js/models/componentModel',
    'jquery'
], function(Adapt, ComponentView, ComponentModel, $) {
    'use strict';


    //  repurpose author-ilt-mcq

    

    var compView = ComponentView.extend({
        preRender: function(){
            this.listenTo(Adapt, {
                'device:changed device:preResize device:resize device:postResize': this.model.onDeviceResize
            });


            
            if(Adapt.locale!==undefined){
                let langCode = Adapt.config.get('_activeLanguage');
                // let langCode = Adapt.course.get('_cbtTraining')._langCode;
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

            
            this.model.ansClickBind = this.model.ansClick.bind(this.model);

            this.model.attributes.shuffAns = [];
            let tempArr = [];
            for(var i=0;i<this.model.attributes.answers.length;i++){
                tempArr.push(this.model.attributes.answers[i].answerText);
                if(this.model.attributes.answers[i].correct===true){
                    this.model.attributes.correctanswer.push(this.model.attributes.answers[i].answerText);
                }
            }
            for(var k=tempArr.length;k>0;k--){
                var ranInt = Math.round(( Math.random()*(tempArr.length) )-0.5);
                var remvd = tempArr.splice(ranInt, 1)[0];
                this.model.attributes.shuffAns.push('<span class="ilt-mcq-answerIndex">'+String.fromCharCode(64 + k)+'</span><span class="ilt-mcq-answer-text">'+remvd+'</span>');
            }
            this.model.attributes.shuffAns.reverse();

            // Adapt.on('cbtView:replay',this.model.replayFn.bind(this.model));
            // Adapt.on('cbtView:blockLoaded',this.model.blockLoaded.bind(this.model));
        },
        postRender: function (){
            this.model.authorCBTInit();
            this.setReadyStatus(); // tells Author that the component is ready to interact with
        }
    },{
        template: 'ilt-mcq' // this is the hbs file in the templates directory that will be passed this.model.attributes
    });

    var compModel = ComponentModel.extend({
        attempts:0,

        initialize:function(){
            this.attributes.correctanswer = [];
        },

        onDeviceResize:function(){
            console.log('device resized');
        },
        
        authorCBTInit:function(){
            var answers = $('.'+this.attributes._id+' .ilt-mcq-answer');
            for(var i=0;i<answers.length;i++){
                answers.eq(i)[0].addEventListener('click', this.ansClickBind);
            };
            
            $('.'+this.attributes._id+' .ilt-mcq-submitBtn')[0].addEventListener('click', this.sbtClick.bind(this));
            $('.'+this.attributes._id+' .ilt-mcq-submitBtn').prop('disabled', true).removeClass('ilt-mcq-Active');
        },
        // replayFn:function (componentID) {
        //     if(componentID === this.get('_id')){
        //         this.attempts = 0;

        //         var initialHTML = Handlebars.templates['ilt-mcq'];
        //         $('.'+this.attributes._id).empty('').html(initialHTML(this.attributes));

        //         this.authorCBTInit();
        //     }
        // },
        // blockLoaded:function (blockModel) {
        //   if(blockModel.attributes._children.models[0].get('_id') === this.get('_id')){
        //     this.replayFn(this.get('_id'));
        //   }
        // },
        checkAnswer:function(passedArr){
            if(passedArr.length !==this.attributes.correctanswer.length){
                this.failEvt();
            } else {
                var corrFound = 0;
                for(var i=0;i<this.attributes.correctanswer.length;i++){
                    var ansFound = false;
                    ansFor: for(var j=0;j<passedArr.length;j++){
                        if(passedArr[j] === this.attributes.correctanswer[i]){
                            ansFound = true;
                            ++corrFound;
                            passedArr.splice(j,1);
                            break ansFor;
                        }
                    }
                    if(ansFound===false){
                        corrFound = -1;
                        break;
                    }
                }
                if(passedArr.length===0 && corrFound === this.attributes.correctanswer.length){
                    this.successEvt();
                } else {
                    this.failEvt();
                }
            }
        },
        sbtClick:function(e){
            var selArr = [];
            $('.'+this.attributes._id+' .ilt-mcq-Selected .ilt-mcq-answer-text').each(function(u,tgt){
                selArr.push($(this).html());
            })
            this.checkAnswer(selArr);
        },

        successEvt:function(){
            $('.'+this.attributes._id+' .ilt-mcq-instrBar-text').html(this.attributes.langData.correctfeedback);
            this.disableAll();
        },
        failEvt:function(){
            ++this.attempts;
            if(this.attempts>=2){
                $('.'+this.attributes._id+' .ilt-mcq-instrBar-text').html(this.attributes.langData.incorrectfeedback);
                this.disableAll();
            } else {
                $('.'+this.attributes._id+' .ilt-mcq-instrBar-text').text(this.attributes.langData.tryAgain);
                
            }
        },

        disableAll:function(){
            var answers = $('.'+this.attributes._id+' .ilt-mcq-answer');
            for(var i=0;i<answers.length;i++){
                answers.eq(i).removeClass('ilt-mcq-Selected');
                answers.eq(i).removeClass('ilt-mcq-Active');
                answers.eq(i)[0].removeEventListener('click', this.ansClickBind);
                answers.eq(i).prop('disabled', true);
                
                for(var j=0;j<this.attributes.correctanswer.length;j++){
                    if(answers.eq(i).find('.ilt-mcq-answer-text').text() === this.attributes.correctanswer[j]){
                        $(answers.eq(i)).addClass("ilt-mcq-answerCorrect");
                    }
                }
            };
            $('.'+this.attributes._id+' .ilt-mcq-answerButtons').addClass('ilt-mcq-Complete');
            $('.'+this.attributes._id+' .ilt-mcq-submitBtn').prop('disabled', true).removeClass('ilt-mcq-Active');

            
            this.setCompletionStatus();
        },

        ansClick:function(e){
            $('.'+this.attributes._id+' .ilt-mcq-submitBtn').prop('disabled', false).addClass('ilt-mcq-Active');
            if(this.attributes.correctanswer.length === 1){
                $('.'+this.attributes._id+' .ilt-mcq-Selected').removeClass('ilt-mcq-Selected');
            }
            $(e.currentTarget).toggleClass('ilt-mcq-Selected');
        }
    });

    

    return Adapt.register('ilt-mcq', {
        model: compModel,
        view: compView
    })
});
