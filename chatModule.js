﻿var Chat = (function () {
  var self = {};

  var data = {};
  var context;
  var tags;
  var next;
  var chat;
  var uiOptions;
  var waiting = true;
  var curTag;
  var textResponse;
  var msgDelay = 1000;
  var backButton;
  var tempTagsLength;
  var signPadContent;
  self.start = function (ctx, tgs) {
    context = ctx;
    tags = tgs;
    next = 0;
    data = {};
    tempTagsLength = tags.length;
    context.empty();
    context.addClass("chat-context");
    context.append(
      '<div id="chat"></div><div id="ui-control"><button id="back" >חזור שאלה</button><div id="ui-options"></div>' +
        '<div id="ui-response"><input id="response-text" /><div id="ui-submit"><i style="color:black;" class="fas fa-arrow-up"></i></div></div></div>'
    );
    chat = $("#chat");
    backButton = $("#back");
    textResponse = $("#response-text");
    uiOptions = $("#ui-options");
    $("#ui-submit").click(submitInput);
    uiOptions.on("ChatResponseLoaded", function (e) {
        
      $("#ui-control .hidden").removeClass("hidden");
      if (curTag.tag === "text") {
        textResponse.focus();
      }
      waiting = true;
    });
    backButton.click(buttonBack);
    uiOptions.on("click", ".ui-option", function () {
      $(this).toggleClass("selected");
      if (curTag.tag == "radio" && $(this).hasClass("selected")) {
        backButton.hide();
        submitInput();
      }
    });

    textResponse.on("keyup", function (e) {
      filterOptions(e);
    });

    $("#Chatform").on("keyup keypress", function (e) {
      var keyCode = e.keyCode || e.which;
      if (keyCode === 13) {
        e.preventDefault();
        return false;
      }
    });
    nextTag();
  };
  var buttonBack = function (e) {
      
      e.preventDefault();
      nextTag(true);
  }
  var addReferences = function (m) {
    var splitMsg = m.split("{{");
    var msg = splitMsg[0];

    for (var i = 1; i < splitMsg.length; i++) {
      if (splitMsg[i].includes("}}")) {
        var keys = splitMsg[i].split("}}");
        msg += data[keys[0]];
        msg += keys[1];
      } else {
        msg += splitMsg[i];
      }
    }

    return msg;
  };

  var addResponse = async function (isRobot, m, contentFn = "") {
    waiting = false;

    var msg = addReferences(m.toString());

    if (isRobot) {
      var loader = $(
        '<div style="float:right" class=" typing-indicator "><span></span><span></span><span></span></div>'
      );
      chat.append(loader);
      $(loader).velocity("scroll", { container: chat, duration: 500 });
      setTimeout(function () {
        $(".typing-indicator").remove();

        appendResponse(true, msg, contentFn);
      }, 2000);
    } else {
      backButton.hide();
      appendResponse(false, msg, contentFn);
    }
  };

 function appendResponse(isRobot, msg, contentFn) {
    var chatResponse = $(` <div class="chat-response ${isRobot ? "robot " : "user"}">
    <p>${msg}</p>
    <div  class="add-content"></div></div>`);
    

    chat.append(chatResponse);
    //var addContent = $(``);
    if ((curTag.tag =="radio" || curTag.tag=="custom"  ) && isRobot) {
        
      if(curTag.tag =="radio"){
        var addContent = $(`<div id="add_content_${curTag.name}"></div>`);
        textResponse.prop('disabled', true);
        setTimeout(() => {
          $(addContent).velocity("scroll", { container: chat, duration: 500 });
          addOptions(curTag.children);
        }, 1000);  
        addContent.append(uiOptions);
        $("#back").css('margin-bottom','17px');
      }else if(curTag.name=="uploadImage") {
        var addContent = $(`<div id="add_content_${curTag.name}"></div>`);
        setTimeout(() => {
          addContent.append($("#uploadImage"));
        }, 1000);
      }else if(curTag.name == "signPad"){
        var addContent = $(`<div id="add_content_${curTag.name}"></div>`);
        $("#signPad").show();
        setTimeout(() => {
          
          addContent.append($("#signPad"));
        }, 1000);
      }
      else if (curTag.name == "dropdown"){
        var addContent = $(`<div style="direction:rtl" id="add_content_${curTag.name}"></div>`);
        
        addContent.append($("#select"));
        
       
      }
      chat.append(addContent);
     
    }

    if (!isRobot && (curTag.tag == "text" || curTag.tag == "radio" || curTag.name =="dropdown"  )) {

      $("#Chatform").append(
        '<input id="id_' +
          curTag.name +
          '" style="display:none" name= ' +
          curTag.name +
          " /> "
      );

      if($('input[name='+curTag.name+']').val() != null){
        $('input[name='+curTag.name+']').remove();
        $("#Chatform").append(
            '<input id="id_' +
              curTag.name +
              '" style="display:none" name= ' +
              curTag.name +
              " /> "
          );
          $('input[name='+curTag.name+']').val(data[curTag.name])

      }else{
          $('input[name='+curTag.name+']').val(data[curTag.name])
      }

        
    
    }
    
    
    if (contentFn != "") {
      renderAdditionalContent(
        contentFn,
        $(".chat-response:last .add-content")[0]
      );
    }
    
    $(".chat-response:last")
      .velocity("scroll", { container: chat, duration: 500 })
      .velocity("fadeIn", {
        duration: 300,
        complete: function (elements) {
          if (isRobot) {
              
            uiOptions.trigger("ChatResponseLoaded");
            
          }
        },
      });
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  var filterOptions = function (e) {
    //submit input on enter
    if (e.which == 13) {
      submitInput();
    }

    var str = textResponse.val().toLowerCase();

    $("#ui-options .ui-option").each(function () {
      $this = $(this);

      if (
        $this.text().toLowerCase().includes(str) ||
        $this.attr("data-value").toLowerCase().includes(str)
      ) {
        $this.removeClass("filtered-out");
      } else {
        $this.addClass("filtered-out");
      }
    });
  };

  //call function to get additional contact, when it finishes, insert its result into the content area of the appropriate response
  var renderAdditionalContent = function (contentFn, container) {
    if (curTag.showLoader) {
      $(container).html('<div class="loader"></div>');
    }
    
    $.when(contentFn()).then(function (content) {
      $(container).html(content);
      //Once content has rendered, scroll to it
      $(".chat-response:last").velocity("scroll", {
        container: chat,
        duration: 500,
      });
    });
  };

  self.getData = function () {
    return data;
  };
  var isBackClicked = function () {
    
    next = next-2;
    if(tags[next].type == "msg"){
        next = next-1;
    }
    var tempTag = tags[next];
    for (let i = $(".chat-response").length; i > 0; i--) {
      if($(".chat-response").eq(i-1).hasClass("robot")){
        $(".chat-response").eq(i-1).remove();
      }else break;
    }
    if ( $(`#add_content_uploadImage`).parents("#chat").length == 1 ) {
      $(`#add_content_uploadImage`).remove();
    }
    if ( $(`#add_content_dropdown`).parents("#chat").length == 1 ) {
      $(`#add_content_dropdown`).remove();
    }
    if ( $(`#add_content_signPad`).parents("#chat").length == 1 ) {
      $(`#add_content_signPad`).remove();
      $(`input[id = id_signPad]`).remove();
    }
    $(`#${curTag.name}`).remove();
    if(curTag.name == 'selected'){ 
        removeOptions();
    }
    for (let i = 0; i< tags.length; i++) {
      if(tags[i].name == "selected" && next>=i && tempTagsLength<tags.length){
          tags.splice(i+1,1);
          break;
      }
    }
    textResponse.prop('disabled', false); 
    textResponse.attr("readonly", false);
  }
  var nextTag = async function (isPreTag = false) {


    if(isPreTag){
      isBackClicked();
    }
    waiting = false;
    curTag = tags[next++];

    if (!curTag) {
      return;
    }

    addResponse(true, curTag["chat-msg"], curTag.content || "");



    if (curTag.submitBarStyle) {
      $("#ui-response").addClass(curTag.submitBarStyle);
      $(".fas").hide();
      if(curTag.name == "signPad")
        $("#ui-submit").html("שלח חתימה");
      else if(curTag.name == "uploadImage")
        $("#ui-submit").html("שלח תמונה");
      else
        $("#ui-submit").html("שלח בחירה");
    } else {
      $("#ui-response").removeClass();
      $("#ui-submit").html('<i class="fas fa-arrow-up"></i>');
      
    }

    //support custom data tags (eg clickable map) by user-supplied 'renderer' returning html into options
    //html is appended so the user can directly modify uiOptions without it being overridden
    if (curTag.tag == "custom") {
      textResponse.attr("readonly", true);
      await curTag.renderer();
      //If chat response already scrolled into view, make sure that custom content does not cover it up
      $(".chat-response:last").velocity("scroll", {
        container: chat,
        duration: 500,
      });
    }

    //hide submit options until response has rendered, if response has not yet rendered
    if (!waiting) {
      $("#ui-control").children(":not(#ui-response)").addClass("hidden");
    }

    //set placeholder to user spec or default
    textResponse.attr("placeholder", curTag.placeholder || "הכנס טקסט כאן");
    backButton.show();
    //set timeout if tag type is 'msg'
    if (curTag.type == "msg") {
      window.setTimeout(nextTag, curTag.delay || 2100);
    }
    
    if (curTag.callback) {
       curTag.callback(data);
    }
  };

  var submitInput = async function () {
    if (waiting === false) {
      return;
    }
    waiting = false;

    var selected = [];
    var friendlySelected = [];
    
    if (curTag.tag == "text") {
      selected = friendlySelected = textResponse.val();
    }
    //retrieve data from user supplied custom tag
    else if (curTag.tag == "custom") {
      //TODO allow custom to return 'friendly' and 'actual' data
      var resp = await curTag.retriever();
      selected = resp.data;
      friendlySelected = resp.friendly ? resp.friendly : selected;
      textResponse.attr("readonly", false);
    } else {
        
        textResponse.prop('disabled', false); 
      $("#ui-options .selected").each(function (i, el) {
        selected.push($(el).data("value"));
        friendlySelected.push($(el).children(".text").text());
      });
      $("#ui-control .selected").each(function (i, el) {
        selected.push($(el).data("value"));
        friendlySelected.push($(el).children(".text").text());
      });
      if (selected.length == 0) {
        var remaining = $("#ui-options .ui-option:not(.filtered-out)");
        if (curTag.tag === "radio" && remaining.length == 1) {
          remaining.addClass("selected");
        }
        //TODO rethink submitting all of the options on enter for checkbox type...
        else if (curTag.tag === "checkbox") {
          remaining.addClass("selected");
        }

        $("#ui-control .selected").each(function (i, el) {
          selected.push($(el).data("value"));
          friendlySelected.push($(el).children(".text").text());
        });
      }
    }

    //if no input, throw error
    if ( selected.length == 0 || (curTag.validator && !curTag.validator(selected))) {
      if (!curTag.optional) {
        addResponse(false,selected,"");
        return invalidInput(curTag.invalid || "קלט לא תקין , נסה שוב");
      }
      friendlySelected = "קלט לא תקין , נסה שוב";
    }

    //Join arrays with spaces for readability & text wrapping
    if (Array.isArray(friendlySelected)) {
      friendlySelected = friendlySelected.join(", ");
    }
    
    data[curTag.name] = selected;

    if (curTag.name == "signPad") {
      addResponse(false, friendlySelected, function () {
        return data[curTag.name];
      });
    } else if (curTag.name == "uploadImage") {
      addResponse(false, friendlySelected, function () {
        return data[curTag.name];
      });
    } 
    else addResponse(false, friendlySelected);

    textResponse.val(null);
    removeOptions();

    if (curTag.success) {
      curTag.success(data);
    }

    if (next < tags.length) {
      window.setTimeout(nextTag, msgDelay);
    }
    
  };

  //function for external to be able to add tags
  self.addTags = function (t, i = 0) {
    var offset = next + i;
    var start = tags.slice(0, offset);
    var end = tags.slice(offset);

    tags = start.concat(t).concat(end);
  };

  var invalidInput = function (msg) {
    waiting = false;
    addResponse(true, msg, "");
    window.setTimeout(function () {
      textResponse.val(null);
      waiting = true;
      textResponse.focus();
    }, 100);
  };

  var removeOptions = function () {
    uiOptions.addClass("hidden");
    uiOptions.empty();
  };

  var addOptions = function (options) {
    //hide options until question fully loaded
    if (waiting == false) {
      //uiOptions.addClass('hidden');
    }

    //only add options, removal will be handled in submit of user response
    //universal between checkbox and radio button, that state is handled in the curTag
    
    for (var i = 0; i < options.length; i++) {
        var option = options[i];
        //chat.append('<div id="ui-options"></div>');
        uiOptions.append(
            '<div class="ui-option" data-value="' +
            option.value +
            '"><p class="text">' +
            option.text +
            '</p><p class="subtext">' +
            (option.subtext || "") +
            "</p></div>"
        );
    }



  };

  self.ValidateEmail = function (mail) {
    var mailFormat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/g;
    if (mail.match(mailFormat)) {
      return true;
    }
    return false;
  };

  self.isValidIsraeliID = function (id) {
    var id = String(id).trim();
    if (id.length != 9 || isNaN(id)) return false;

    return (
      Array.from(id, Number).reduce((counter, digit, i) => {
        const step = digit * ((i % 2) + 1);
        return counter + (step > 9 ? step - 9 : step);
      }) %
        10 ===
      0
    );
  };

  self.signPadRender = function () {
    $("#ui-control").prepend(
      '<div style="direction:rtl;display:none" id="signPad"></div>' 
    );
    
    $("#signPad").append('<div class="sigPad"></div>');

    $(".sigPad").append('<ul class="sigNav"></ul>');

    $(".sigNav").append(
      `<li class="clearButton"><a style="font-size:${(innerWidth<900) ? "small" : "large" }" href="#clear">נקה חתימה</a></li>`
    );

    $(".sigPad").append('<div class="sig sigWrapper"></div>');

    $(".sigWrapper").append(
      '<div class="typed"></div>' +
        `<canvas class="pad" width=  "390" height= "170"></canvas>` +
        '<input  type="hidden" name="signPadJson" class="output"/>'
    );

    $("#signPad").prepend($(".sigPad"));
    $(".sigPad").signaturePad({
      drawOnly: true,
      drawBezierCurves: true,
      lineTop: 400,
    });
  };

  self.uploadImageRender = function () {
   
    $("#ui-control").prepend(
      '<div style="direction:rtl" id="uploadImage"></div>'
    );
    $("#uploadImage").append('<div class="upload-btn-wrapper"></div >');
    $(".upload-btn-wrapper").append(
      '<button class="btn">בחירת קובץ</button><input  type="file" name=' +
        curTag.name + 
        " />" 
    );
    $("#uploadImage").append(
        '<img id="img_' +
        curTag.name +
        '" style="display:none;padding-right:10px; "  src="#" alt="your image" height=60 width=60>'
    );
    
    var img = "";
    document
      .querySelector("input[name=" + curTag.name + "]")
      .addEventListener("change", function () {
        backButton.hide();
        
        $("#img_" + curTag.name).show();

        if (this.files && this.files[0]) {
          img = document.getElementById("img_" + curTag.name);
          img.src = URL.createObjectURL(this.files[0]); // set src to blob url
          img.onload = imageIsLoaded;
        }
      });
      
    var imageIsLoaded = function () {
      window.uploadImage = img.src;
      //$("Chatform").append($("input[name=" + curTag.name + "]"))
    };
  };

  self.signPadRetriever = function () {
    var api = $(".sigPad").signaturePad();
    var image = window.innerWidth > 768 ? new Image(120, 90) :  new Image(90,70);
    image.src = api.getSignatureImage();
    $("input[name=signPadJson]").remove();
    $("#Chatform").append(
      `<input type="hidden"  id="id_${curTag.name}" style="display:none" name= ${curTag.name} /> `
    );
    document.getElementById(`id_${curTag.name}`).setAttribute('value', image.src);
    $(".sigPad").hide();
    return {
      data: image,
      friendly: "החתימה שלך ",
    };
  };

  self.uploadImageRetriever = function () {
      
    var image = window.innerWidth > 768 ? new Image(110, 90) :  new Image(75,75);
    image.src = window.uploadImage;
    $("#myImg").remove();
    $("#uploadImage").hide();
    
    return {
      data: image,
      friendly: "העלאת תמונה",
    };
  };

  self.imageFromRobotContent = function () {
    var imgSrc = curTag.ImageUrl;
    var newImg = document.createElement("img");
    newImg.width = window.innerWidth > 768 ? 200 : 100;
    newImg.height =  window.innerWidth > 768 ? 150 : 75;
    newImg.src = imgSrc;
    return newImg;
  };

  self.minMaxValidation = function(){
     
      var number = textResponse.val();
      if(isNaN(number)){
          return false;
      }
      return (number > curTag.min && number < curTag.max);
  }
  self.phoneNumberValidation = function(){
    var phoneNumber = textResponse.val();
    var regex = /^0(5[^7]|[2-4]|[8-9]|7[0-9])-?[0-9]{7}$/;
    return regex.test(phoneNumber);
  }
  self.hebrewValidation = function() {
    var hebrewWord = textResponse.val();
    var regex = /^[\u0590-\u05fe]+$/i;
    return regex.test(hebrewWord);
  }
  
  self.dateValidation = function(){
    var date = textResponse.val();
    var regex =/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})|([0-9]{2})$/;
    var pdate = date.split('/');
  
    var dd = parseInt(pdate[0]);
    var mm  = parseInt(pdate[1]);
    var yy = parseInt(pdate[2]);
    // Create list of days of a month [assume there is no leap year by default]
    var ListofDays = [31,28,31,30,31,30,31,31,30,31,30,31];
    if(mm>12){
      return false;
    }
    if (mm==1 || mm>2)
    {
      if (dd>ListofDays[mm-1])
        return false;
    }
    if (mm==2)
    {
      var lyear = false;
      if ( (!(yy % 4) && yy % 100) || !(yy % 400)) 
      {
        lyear = true;
      }
      if ((lyear==false) && (dd>=29))
        return false;
      if ((lyear==true) && (dd>29))
        return false;
        
      
    }
    return regex.test(date);
  }
   
  self.dropDownRender = function(dropDownOptions){
    var element = $('<div  id="select"></div>');
    $("#ui-control").prepend(element);
    VirtualSelect.init({
      ele: "#select",
      options: dropDownOptions
    });
  }
  self.dropDownRetriever = function () {
    var choosed = $(`#select`).val();
    for (let index = 0; index < myOptions.length; index++) {
      const element = myOptions[index];
      if(element.value == choosed){
        var result = element.label;
      }
      
    }
    $(`#select`).remove();
    return {
        data: choosed,
        friendly:result
    };
  }

  self.englishValidation = function () {
    var word = textResponse.val();
    var regex = /^[a-zA-Z\u0080-\u024F]+$/i;
    return regex.test(word);
  }
  return self;
})();
