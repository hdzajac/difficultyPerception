(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}

},{}],2:[function(require,module,exports){
const FILENAME = "results";
const ID = "id";
const VERSION = "ver";

var saveAs = require("file-saver").saveAs;

$("#initForm").submit(function(event){
    event.preventDefault();
    var data = toJSONString(this);
    var form = {};
    form.initial = JSON.parse(data);
    sessionStorage.setItem("form", JSON.stringify(form));

    var link = window.location.origin;
    console.log(link + "/game?" + ID + "=1&" + VERSION + "=1");
    window.location.href = link + "/game?" + ID + "=1&" + VERSION + "=1";
});


$(".after-game-form").submit(function(event){
    event.preventDefault();
    const data = JSON.parse(toJSONString(this));

    var id = getUrlParameter("id");
    console.log("ID: " + id);

    var ver = getUrlParameter("ver");
    console.log("Version: " + ver);

    const form = JSON.parse(sessionStorage.getItem("form"));
    form["id-" + id + "_ver-" + ver] = data;

    sessionStorage.setItem("form", JSON.stringify(form));
    var link = window.location.origin;

    if(id === "1"){
        if (ver === "1")
            ver = "2";
        else{
            id = "2";
            ver = "1";
        }
    } else {
        if (ver === 1)
            ver = "2";
        else{
            downloadForm();
            window.location.href = link + "/finish";
        }
    }

    window.location.href = link + "/game?" + ID + "="+ id + "&" + VERSION + "=" + ver;
});

// ************************************************************************
// SLIDER
// ************************************************************************

// Update the current slider value (each time you drag the slider handle)
$(".slider").on("input", function(event){
    const id = event.target.id;
    const output = document.getElementById(id + 'Value');
    output.innerHTML = event.target.value; // Display the default slider value
});

// ************************************************************************
// GLOBAL FUNCTIONS
// ************************************************************************

var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

// parsing the form to json

var toJSONString = function ( form ) {
        var obj = {};
        var elements = form.querySelectorAll( "input, select, textarea" );
        console.log(elements);
        for( var i = 0; i < elements.length; ++i ) {
            var element = elements[i];
            var name = element.id;
            var value = element.value;

            if( name ) {
                obj[ name ] = value;
            }
        }

        return JSON.stringify( obj );
    };

var downloadForm = function(){
    var blob = new Blob([sessionStorage.getItem("form")], {type: "text/json;charset=utf-8"});
    saveAs(blob, FILENAME + ".json");
};

// ************************************************************************
//
// On document ready load proper methods
//
// ************************************************************************


var initialise = function () {

    var path = window.location.pathname.substr(1);
    console.log("Page: " + path);

    var id = getUrlParameter("id");
    console.log("ID: " + id);

    var ver = getUrlParameter("ver");
    console.log("Version: " + ver);

    switch (path){
        case "game":
            handleGameLoading(id, ver);
            break;
        default:
            break;
    }

};

// ************************************************************************
//
// Games section
//
// ************************************************************************

var handleGameLoading = function(id, ver){
    console.log("Loading game for id: ", id, " ...");

    switch (id){
        case "1":
            loadGame(1, ver);
            break;
        case "2":
            loadGame(2, ver);
            break;
        default:
            break;
    }
};

var loadGame = function (game, version) {
    window.targets = [];
    window.curTarget = 0;
    window.cursorSize = 5;
    window.targetArea = {x:300, y:40, width:860, height:720};
    window.startButtonArea = {x:10, y:10, width:200, height:100};
    window.running = false;
    window.mode = "bubble";
    window.trial = -1;
    window.hit = [];
    window.startTime;
    window.startPosition;
    window.studyLog;
    window.gravity_scale = 0.1;
    window.game = game;
    window.version = version;
    window.gameSpeed = 0;
    window.experimentTime = 30000;
    window.experimentFinished = false;

    window.reset = function (repeat) {
        running = false;

        createTargets();

        cursorSize = 1;
        if(!repeat)
            trial++;
    };

    window.resetEpisode = function (repeat) {
        running = true;

        createTargets();

        cursorSize = 1;
        if(!repeat)
            trial++;
    };

    window.endEpisode = function (repeat) {
        running = false;

        //handleGameLoading("1", "1");
        if(window.game == 1){
            if(window.version == "1"){
                window.version = "2";
            }else{
                window.game = 2;
                window.version = "1"
            }
        }
        else{
            if(window.version == "1"){
                window.version = "2";
            }else{
                window.game = 2;
                window.version = "1";
                window.gameBackground = '#d1d8e0';
                window.experimentFinished = true;
            }
        }
        //window.game = 1;
        //window.version = "1";
        window.setup();
    };

    window.createTargets = function(){
        hit = [];
        targets = [];


        while(targets.length < window.numberOfCircles) {
            var add = true;
            t = new Target(random(0.5, 3), startArea.x + random(startArea.width), startArea.y + random(startArea.height), random(10, 40), false);

            for (var i = 0; i < targets.length; i++) {
                if(collideCircleCircle(t.position.x, t.position.y, t.r * 2.1, targets[i].position.x, targets[i].position.y, targets[i].r * 2.1)) {
                    add = false;
                    break;
                }
            }
            if(add) {
                targets.push(t);
            }
        }
        curTarget = int(random(targets.length));
        targets[curTarget].isCurrentTarget = true;




    };



    window.setup = function () {
        var canvas = createCanvas(1200, 800);
        canvas.parent('sketch-holder');
        studyLog = new p5.Table();
        studyLog.addColumn('Participant');
        studyLog.addColumn('Trial');
        studyLog.addColumn('Condition');
        studyLog.addColumn('Time');
        studyLog.addColumn('TargetSize');
        studyLog.addColumn('TargetDistance');
        studyLog.addColumn('Duration');



        // Implement here the specific setup logic for each game
        if(window.game == 1) {
            window.startArea = {x: 10, y: 10, width: 1100, height: 300};// This is the area in which circles are generated
            window.numberOfCircles = 20;
        }
        else if(window.game == 2) {
            window.startArea = {x: 600, y: 10, width: 250, height: 700};
            window.numberOfCircles = 50;
            window.gameSpeed = 1;
        }
        else{}


        if(window.version == "1"){
            window.bubbleColor = '#000000';
            window.targetColor = '#00ff04';
            window.gameBackground = '#2a00ff';
        }
        else{
            window.bubbleColor = '#4b7bec';
            window.targetColor = '#fd9644';
            window.gameBackground = '#d1d8e0';
        }

        reset();
    };

    window.mouseClicked =  function() {
        if(running) {
            hit = []
            for(var i = 0; i < targets.length; ++i) {
                r = targets[i].r;
                x = targets[i].position.x;
                y = targets[i].position.y;
                if(window.version == "1"){
                    if(mouseX > x - r && mouseX < x + r && mouseY > y - r && mouseY < y + r){
                        hit.push(i);
                    }
                }
                else if(window.version == "2"){
                    if(mouseX > x - 0.85*r && mouseX < x + 0.85*r  && mouseY > y - 0.85*r && mouseY < y + 0.85*r){
                        hit.push(i);
                    }
                }
            }
            if(hit.indexOf(curTarget) != -1) {
                var curTime = new Date();

                var row = studyLog.addRow();
                row.setNum('Participant', document.getElementById('ParticipantField').value);
                row.setNum('Trial', trial);
                row.setString('Condition', mode);
                row.setString('Time', curTime.toJSON());
                row.setNum('TargetSize', targets[curTarget].r * 2);
                row.setNum('TargetDistance', dist(startPosition.x, startPosition.y, targets[curTarget].x, targets[curTarget].y));
                row.setNum('Duration', curTime - startTime);

                updateGame();
                resetEpisode();
            }
        } else{
            if(collidePointRect(mouseX, mouseY, startButtonArea.x, startButtonArea.y, startButtonArea.width, startButtonArea.height)) {
                setTimeout(endEpisode, window.experimentTime);
                running = true;
                startTime = new Date();
                startPosition = {x:mouseX, y:mouseY};
                mode = document.querySelector('input[name="studyMode"]:checked').value;
                if(mode == "bubble") {
                    noCursor();
                } else {
                    cursor(ARROW);
                }
            }
        }
    };

    // Here is the logic for modifying the game whenever a new trial starts (just in case we want to make the game
    // to be more difficult incrementally)
    window.updateGame = function(){

        if(window.game == 1){
            if(window.version == "1")
                window.gravity_scale += 0.1;
            else
                window.gravity_scale += 0.15;
        }
        else if(window.game == 2){
            if(window.version == "1")
                window.gameSpeed += 0.2;
            else
                window.gameSpeed += 0.3;
        }
        else{

        }
    }

    window.draw = function () {
        background(window.gameBackground);

        if(!running) {
            fill('#fed330');
            stroke(75);
            strokeWeight(2);
            rect(startButtonArea.x, startButtonArea.y, startButtonArea.width, startButtonArea.height);

            cursor(HAND);

            noStroke();
            fill(0);
            textSize(18);
            textAlign(CENTER);
            if(!window.experimentFinished)
                text('Click mouse here\nto start trial #' + (trial + 1), startButtonArea.x + 0.5 * startButtonArea.width, startButtonArea.y + 0.5 * startButtonArea.height - 0.5);
            else{
                text('Experiment finished.', startButtonArea.x + 0.5 * startButtonArea.width, startButtonArea.y + 0.5 * startButtonArea.height - 0.5);
            }
        } else {
            if(mode == "bubble") {
                cursorSize = -1;
                for(var i = 0; i < targets.length; ++i) {
                    var distance = dist(mouseX, mouseY, targets[i].x, targets[i].y) - targets[i].r;
                    if(cursorSize == -1 || distance < cursorSize) {
                        cursorSize = distance;
                    }
                }

                fill('#20bf6b');
                noStroke();
                ellipse(mouseX, mouseY, cursorSize * 2);

                for(var i = 0; i < targets.length; ++i) {
                    if(collideCircleCircle(mouseX, mouseY, cursorSize * 2, targets[i].x, targets[i].y, targets[i].r * 2)) {
                        fill('#20bf6b');
                        noStroke();
                        ellipse(targets[i].x, targets[i].y, targets[i].r * 2 + 20);
                    }
                }
            }

            // Update and display
            for (var i = 0; i < targets.length; i++) {
                targets[i].update();
                targets[i].display(i);
                targets[i].checkEdges();
            }




            if(mode == "bubble") {
                var crossSize = 6;
                stroke(255);
                line(mouseX - crossSize, mouseY, mouseX + crossSize, mouseY);
                line(mouseX, mouseY - crossSize, mouseX, mouseY + crossSize);
            }
        }
    };


    window.Target = function (m,x,y,r,t) {
        this.mass = m;
        this.r = r;
        this.position = createVector(x,y);
        this.velocity = createVector(0,0);
        this.acceleration = createVector(0,0);
        this.isCurrentTarget = t;
    };

    // Newton's 2nd law: F = M * A
    // or A = F / M
    Target.prototype.applyForce = function(force) {
        var f = p5.Vector.div(force,this.mass);
        this.acceleration.add(f);
    };

    // Here is the logic of the circles in each game and version
    Target.prototype.update = function() {

        if(window.game == 1){      // Circles fall to ground
            // Gravity is scaled by mass here
            var gravity = createVector(0, gravity_scale*this.mass);
            // Apply gravity
            this.applyForce(gravity);
            // Velocity changes according to acceleration
            this.velocity.add(this.acceleration);
            // position changes by velocity
            this.position.add(this.velocity);
            // We must clear acceleration each frame
            this.acceleration.mult(0);

            // If current target hits the ground before being clicked...
            /*
            if (this.isCurrentTarget && this.position.y > (height - this.r - 1)) {
                resetEpisode(true);	// ... the trial is repeated
            }*/
        }
        else if(window.game == 2){  // Circles left to right
           this.position.x -= window.gameSpeed;
            if(this.position.x < 0)
                this.position.x = width;

            if(window.version == "2"){  //  Difficult version
                if(Math.abs(mouseX - this.position.x) < 50 && Math.abs(mouseY - this.position.y) < 50 && this.isCurrentTarget)
                    this.position.y += random(-1,1);
            }

        }
        else{

        }




    };

    Target.prototype.display = function(i) {

        if(i == curTarget) {
            fill(window.targetColor);
        } else {
            fill(window.bubbleColor);
        }

        if(hit.indexOf(i) != -1) {
            stroke('#eb3b5a');
            strokeWeight(4);
        } else {
            noStroke();
        }

        ellipse(this.position.x, this.position.y, this.r * 2);
    };

    // Bounce off bottom of window
    Target.prototype.checkEdges = function() {
        if (this.position.y > (height - this.r)) {
            // A little dampening when hitting the bottom
            this.velocity.y *= -0.9;
            this.position.y = (height - this.r);
        }
    };

    console.log("Game LOADED");
};








initialise();
},{"file-saver":1}]},{},[2]);
