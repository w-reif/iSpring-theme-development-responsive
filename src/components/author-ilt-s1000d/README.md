# author-base-component
Bare minimum component files



Github - Author-base-component

Backbone model:	https://backbonejs.org/#Model

The following core models are inherited by every Adapt component and extend the Backbone model. They have no default values & their values are assigned in components.json: 
- configModel (configModel.js)
- lockingModel (lockingModel.js)
- notifyModel (notifyModel.js)
- routerModel (routerModel.js)
- adaptModel (adaptModel.js)
  - courseModel (courseModel.js)
  - contentObjectsModel (contentObjectsModel.js)
  - articleModel (articleModel.js)
  - blockModel (blockModel.js)
  - componentModel (componentModel.js)
    - questionModel.js extends componentModel.js
  - core buttons: Default values are found in course.json, but may be overridden by components.json.


### Events:
- setReadyStatus() - loaded (please see the adapt-contrib-narrative component for an example of imageReady)
- setCompletionStatus() - complete
- preRender: - before rendering in the DOM
- postRender - after rendering in the DOM
- Events - attach events
### Properties:
- _isCorrect (boolean) - This should be set when the question has no more attempts and the user has finished interacting with the question.

## Rough Process:
1. Start with bower.json - update all of the properties. Remember that "component" must be unique
2. In the js directory rename the "main" js file to match bower.json.
3. Place any external libraries into the libraries directory. Some are already available, see below.
![author_libraries](https://user-images.githubusercontent.com/80276228/119965522-451bf780-bfa2-11eb-80b0-8a859f4b402d.png)
4. Next set the example.json to contain the data that you’ll build the component using. This is the data that you expect the user to add into the Author interface to customise that component.
5. Update the properties.schema to match the data in example.json, this controls the fields visible in Author.
6. In the JS file be sure to rename to match the bower file.


Add LESS css files into the css directory and they will be processed on publish.

