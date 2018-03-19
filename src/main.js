
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