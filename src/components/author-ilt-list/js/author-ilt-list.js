define([
    'core/js/adapt',
    'core/js/views/componentView',
    'core/js/models/componentModel',
    'jquery'
], function(Adapt, ComponentView, ComponentModel, $) {
    'use strict';

    var compView = ComponentView.extend({
        preRender: function(){
        },
        postRender: function (){
            var container = $('.'+this.model.attributes._id+' .ilt-list-list');
            
            //setList
            var items = this.model.attributes['listItems'];
            var ol = document.createElement('ol');
            
            items.forEach(element => {
              var li = document.createElement('li');
                li.innerHTML = element.textArea;
                ol.appendChild(li);
            });
            
            ol = this.model.setStart(ol);
            ol = this.model.setStyle(ol);
            
            //list
            container[0].append(ol);
            
            this.setReadyStatus(); // tells Author that the component is ready to interact with
            this.model.completeFunction();
        }
    },{
        template: 'ilt-list' // this is the hbs file in the templates directory that will be passed this.model.attributes
    });

    var compModel = ComponentModel.extend({
        completeFunction:function(){
            this.setCompletionStatus();  // tells Author that the component is complete
        },

        setStart:function(ol){
          ol.setAttribute('start', this.attributes.startNum.toString());
          return ol;
        },
        
        setStyle:function(ol){
          switch (this.attributes.listType) {
            case 'Letters':
              ol.style['list-style-type'] = 'lower-alpha';
              break;
            case 'Bullets':
              ol.style['list-style-type'] = 'disc';
              break;
            case 'Numbers':
              ol.style['list-style-type'] = 'decimal';
              break;
            case 'Blank':
            default:
                ol.style['list-style-type'] = 'none';
                // ol.style['list-style-type'] = 'unset';
                break;
          }
          return ol;
        }
    });

    return Adapt.register('ilt-list', {
        model: compModel,
        view: compView
    })
});
