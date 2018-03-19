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

var saveAs = require("file-saver").saveAs;

$("#initForm").submit(function(event){
    event.preventDefault();
    var data = toJSONString(this);
    var form = {};
    form.initial = data;
    sessionStorage.setItem("form", JSON.stringify(form));

    var link = window.location.origin;

    window.location.href = link + "/game?id=1";
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
    saveAs(blob, FILENAME + ".txt");
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

    switch (path){
        case "game":
            handleGameLoading(id);
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

var handleGameLoading = function(id){
    console.log("Loading game for id: ", id, " ...");

    switch (id){
        case "1":
            loadGame1();
            break;
        default:
            break;
    }
};

var loadGame1 = function () {
    window.targets = [];
    window.curTarget = 0;
    window.cursorSize = 5;
    window.startArea = {x:10, y:10, width:1100, height:300};
    window.targetArea = {x:300, y:40, width:860, height:720};
    window.running = false;
    window.mode = "bubble";
    window.trial = -1;
    window.hit = [];
    window.startTime;
    window.startPosition;
    window.studyLog;
    window.gravity_scale = 0.1;

    window.reset = function (repeat) {
        running = false;
        hit = [];
        targets = [];
        while(targets.length < 20) {
            var add = true;
            /*t = {x:targetArea.x + random(targetArea.width), y:targetArea.y + random(targetArea.height), r:random(10, 40)}

            for(var i = 0; i < targets.length; ++i) {
                if(collideCircleCircle(t.x, t.y, t.r * 2.1, targets[i].x, targets[i].y, targets[i].r * 2.1)) {
                    add = false;
                    break;
                }
            }*/
            t = new Target(random(0.5, 3), startArea.x + random(startArea.width), startArea.y + random(startArea.height), random(10, 40));
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
        cursorSize = 1;
        if(!repeat)
            trial++;
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
        reset();
    };

    window.mouseClicked =  function() {
        if(running) {
            hit = []
            for(var i = 0; i < targets.length; ++i) {
                /*if(collideCircleCircle(mouseX, mouseY, cursorSize * 2, targets[i].position.x, targets[i].position.y, targets[i].r * 2)) {
                    hit.push(i);
                }*/
                r = targets[i].r;
                x = targets[i].position.x;
                y = targets[i].position.y;
                if(mouseX > x - r && mouseX < x + r && mouseY > y - r && mouseY < y + r){
                    hit.push(i);
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

                gravity_scale += 0.1;
                reset();
            }
        } else{
            if(collidePointRect(mouseX, mouseY, startArea.x, startArea.y, startArea.width, startArea.height)) {
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

    window.draw = function () {
        background('#d1d8e0');

        if(!running) {
            fill('#fed330');
            stroke(75);
            strokeWeight(2);
            rect(startArea.x, startArea.y, startArea.width, startArea.height);

            cursor(HAND);

            noStroke();
            fill(0);
            textSize(18);
            textAlign(CENTER);
            text('Click mouse here\nto start trial #' + (trial + 1), startArea.x + 0.5 * startArea.width, startArea.y + 0.5 * startArea.height - 0.5);
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
            /*
            for(var i = 0; i < targets.length; ++i) {
                if(i == curTarget) {
                    fill('#fd9644');
                } else {
                    fill('#4b7bec');
                }

                if(hit.indexOf(i) != -1) {
                    stroke('#eb3b5a');
                    strokeWeight(4);
                } else {
                    noStroke();
                }

                ellipse(targets[i].x, targets[i].y, targets[i].r * 2);
            }*/

            for (var i = 0; i < targets.length; i++) {

                // Is the Target in the liquid?
                //if (liquid.contains(Targets[i])) {
                // Calculate drag force
                //var dragForce = liquid.calculateDrag(Targets[i]);
                // Apply drag force to Target
                //Targets[i].applyForce(dragForce);
                //}

                // Gravity is scaled by mass here!
                var gravity = createVector(0, gravity_scale*targets[i].mass);
                // Apply gravity
                targets[i].applyForce(gravity);

                // Update and display
                targets[i].update();
                targets[i].display(i);
                targets[i].checkEdges();
            }

            // If current target hits the ground before being clicked...
            if (targets[curTarget].position.y > (height - targets[curTarget].r - 1)) {
                reset(true);	// ... the trial is repeated
            }


            if(mode == "bubble") {
                var crossSize = 6;
                stroke(255);
                line(mouseX - crossSize, mouseY, mouseX + crossSize, mouseY);
                line(mouseX, mouseY - crossSize, mouseX, mouseY + crossSize);
            }
        }
    };


    window.Target = function (m,x,y,r) {
        this.mass = m;
        this.r = r;
        this.position = createVector(x,y);
        this.velocity = createVector(0,0);
        this.acceleration = createVector(0,0);
    };

    // Newton's 2nd law: F = M * A
    // or A = F / M
    Target.prototype.applyForce = function(force) {
        var f = p5.Vector.div(force,this.mass);
        this.acceleration.add(f);
    };

    Target.prototype.update = function() {
        // Velocity changes according to acceleration
        this.velocity.add(this.acceleration);
        // position changes by velocity
        this.position.add(this.velocity);
        // We must clear acceleration each frame
        this.acceleration.mult(0);
    };

    Target.prototype.display = function(i) {
        /*stroke(0);
        strokeWeight(2);
        fill(255,127);
        ellipse(this.position.x,this.position.y,this.mass*16,this.mass*16);
          */
        if(i == curTarget) {
            fill('#fd9644');
        } else {
            fill('#4b7bec');
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
