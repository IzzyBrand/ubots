
var friction = 0.4;
var maxMotorActivation = 2;
var energyConsumptionCoeff = 1e-2;
var sourceConsumptionCoeff = 2;

let sources = [];
let bots = [];
let colors, backgroundColor, botColor;
let startTime;

function setup() {
  // create a canvas the same size the window
  createCanvas(window.innerWidth, window.innerHeight);
  colors = [color(172, 128, 255),
            color(166, 226, 44),
            color(104, 216, 239),
            color(253, 150, 33),
            color(249, 36,  114),
            color(231, 219, 116)];
  backgroundColor = color(40,  41,  35);
  botColor = color(158, 158, 156);


  for (var i = 0; i < 30; i++) {
    sources.push({x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  type: Math.floor(Math.random()*3- 1e-4),
                  energy: Math.random() * 40});
  }
  for (var i=0; i < 20; i++) {
    bots.push(buildSymmetricRandomBot(Math.random() * window.innerWidth/2 + window.innerWidth/4,
                             Math.random() * window.innerHeight/2 + window.innerHeight/4,
                             Math.random() * Math.PI * 2));
  }
}


function draw() {
  background(backgroundColor);

  for (var i = 0; i < sources.length; i++) {
    if (sources[i].energy < 0) {
      sources.splice(i, 1);
      sources.push({x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  type: Math.floor(Math.random()*3- 1e-4),
                  energy: Math.random() * 20});
    }
  }
  drawSources();
  for (var i=0; i < bots.length; i++) {
    var bot = bots[i];
    updateBot(bot);
    drawBot(bot);
    // kill the bot if it runs out of energy
    if (bot.energy < 0) {
      bots.splice(i, 1);
      // TODO(izzy): change this to copy and randomly modify an existing botß
      bots.push(buildSymmetricRandomBot(Math.random() * window.innerWidth/2 + window.innerWidth/4,
                             Math.random() * window.innerHeight/2 + window.innerHeight/4,
                             Math.random() * Math.PI * 2));
    }
  }


}

function updateBot(bot) {

  bot.energy -= energyConsumptionCoeff;

  // calculate the activations of the sensors
  for (var i = 0; i < bot.sensors.length; i++) {
    bot.sensors[i].activation = 0;
    for (var j = 0; j < sources.length; j++) {
      var source = sources[j];
      if (source.type == bot.sensors[i].type) {
        var sensorGlobal = translate2d(rotate2d(bot.sensors[i], bot.pos.theta), bot.pos);
        var dist2 = Math.pow(source.x - sensorGlobal.x, 2) + Math.pow(source.y - sensorGlobal.y, 2);
        bot.energy += sourceConsumptionCoeff/(dist2 + 1e-4); // make the bot eat
        source.energy -= sourceConsumptionCoeff/(dist2 + 1e-4); // and eating comsumes the sources
        bot.sensors[i].activation += 2e3/(dist2 + 1e-4); // hedge away from infinite activation
      }
    }
  }

  // calculate the activations of the motors
  for (var i = 0; i < bot.connections.length; i++) {
    c = bot.connections[i];
    bot.motors[c.m].activation += c.f(bot.sensors[c.s].activation);
  }

  // apply forces from the motors
  for (var i = 0; i < bot.motors.length; i++) {
    var m = bot.motors[i];

    // threshold the motor activation
    m.activation = Math.max(Math.min(m.activation, maxMotorActivation), -maxMotorActivation);

    // rotation
    var distFromCenter = Math.sqrt(Math.pow(m.x,2) + Math.pow(m.y,2));
    var angleFromCenter = Math.atan2(m.y, m.x);
    var rotationComponent = Math.cos(m.theta - angleFromCenter);
    bot.vel.theta += rotationComponent * m.activation * distFromCenter * 1e-2;

    // translation
    var bodyFrameAccel = {x: -Math.sin(m.theta) * m.activation,
                          y: Math.cos(m.theta) * m.activation};
    var globalFrameAccel = rotate2d(bodyFrameAccel, bot.pos.theta);
    bot.vel.x += globalFrameAccel.x;
    bot.vel.y += globalFrameAccel.y;

    bot.motors[i].activation = 0; // reset the activation for next time
  }


  bot.vel.x *= (1-friction);
  bot.vel.y *= (1-friction);
  bot.vel.theta *= (1-friction);

  bot.pos.x += bot.vel.x;
  bot.pos.y += bot.vel.y;
  bot.pos.theta += bot.vel.theta;
}

function drawSources() {
  for (var i = 0; i < sources.length; i++) {
    s = sources[i];
    fill(colors[s.type]);
    noStroke();
    ellipse(s.x, s.y, s.energy, s.energy);

    // for (var j = 0; j < s.energy/3; j++) {
    //   stroke(colors[s.type]);
    //   noFill();
    //   var r = s.energy * Math.pow(j*0.7,2);
    //   ellipse(s.x, s.y, r, r)
    // }
  }
}

function rotate2d(pos, theta) {
  var newPos = {x:0,y:0};
  newPos.x = Math.cos(theta) * pos.x - Math.sin(theta) * pos.y;
  newPos.y = Math.sin(theta) * pos.x + Math.cos(theta) * pos.y;
  return newPos;
}

function translate2d(pos, delta) {
  var newPos = {x: pos.x + delta.x,
                y: pos.y + delta.y};
  return newPos;
}

function drawBot(bot) {
  translate(bot.pos.x, bot.pos.y);
  rotate(bot.pos.theta);
  rectMode(CENTER);
  fill(backgroundColor);
  stroke(botColor);
  rect(0,0, bot.width, bot.height);

  for (var i = 0; i < bot.connections.length; i++) {
    var c = bot.connections[i];
    var s = bot.sensors[c.s];
    var m = bot.motors[c.m];
    stroke(colors[s.type]);
    line(s.x, s.y, m.x, m.y);
  }

  stroke(botColor);
  for (var i = 0; i < bot.motors.length; i++) {
    var m = bot.motors[i];
    translate(m.x, m.y);
    rotate(m.theta);
    quad(0.5*m.scale, m.scale,
         0.8*m.scale, -m.scale,
        -0.8*m.scale, -m.scale,
        -0.5*m.scale, m.scale);
    rotate(-m.theta);
    translate(-m.x, -m.y);
  }

  for (var i = 0; i < bot.sensors.length; i++) {
    var s = bot.sensors[i];
    stroke(colors[s.type]);
    ellipse(s.x, s.y, s.scale, s.scale);
  }


  rotate(-bot.pos.theta);
  translate(-bot.pos.x, -bot.pos.y);
}

// returns a linear function for a connection
function linear(coeff) {
  return function(x) {
    return x * coeff;
  };
}


function buildBaseBot(x=window.innerWidth/2, y=window.innerHeight/2, theta=0) {
  var bot = {width: Math.min(window.innerWidth, window.innerHeight) / 15,
             height: Math.min(window.innerWidth, window.innerHeight) / 10,
             pos: {x: x, y: y, theta: theta},
             vel: {x: 0, y: 0, theta: 0},
             sensors: [],
             motors: [],
             connections: [],
             energy: 10};
  return bot;
}

function buildSimpleBot(x=window.innerWidth/2, y=window.innerHeight/2, theta=0) {
  var bot = buildBaseBot(x, y, theta);

  bot.sensors.push({x: bot.width/2, y: bot.height/2, type:0, scale: bot.width/3});
  bot.sensors.push({x: -bot.width/2, y: bot.height/2, type:0, scale: bot.width/3});
  bot.sensors.push({x: bot.width/2, y: 0, type:1, scale: bot.width/3});
  bot.sensors.push({x: -bot.width/2, y: 0, type:1, scale: bot.width/3});

  bot.motors.push({x: bot.width/2, y: -bot.height/2, theta: 0, scale: bot.width/4, activation: 0});
  bot.motors.push({x: -bot.width/2, y: -bot.height/2, theta: 0, scale: bot.width/4, activation: 0});

  bot.connections.push({s: 0, m: 1, f: linear(1)});
  bot.connections.push({s: 1, m: 0, f: linear(1)});
  bot.connections.push({s: 2, m: 0, f: linear(0.5)});
  bot.connections.push({s: 3, m: 1, f: linear(0.5)});
  return bot;
}

function buildRandomBot(x=window.innerWidth/2, y=window.innerHeight/2, theta=0) {
  var bot = buildBaseBot(x, y, theta);

  bot.motors.push({x: bot.width/2, y: -bot.height/2, theta: 0, scale: bot.width/4, activation: 0});
  bot.motors.push({x: -bot.width/2, y: -bot.height/2, theta: 0, scale: bot.width/4, activation: 0});

  var numSensors = Math.random() * 6;
  for (var i = 0; i< numSensors; i++) {
    bot.sensors.push({x: (Math.random() - 0.5) * bot.width,
                      y: (Math.random() - 0.5) * bot.height,
                      type: Math.floor(Math.random() * 2.99),
                      scale: bot.width/4});

    if (Math.random() > 0.5) {
      bot.connections.push({s: i, m: 0, f:linear(Math.random())});
    }
    if (Math.random() > 0.5) {
      bot.connections.push({s: i, m: 1, f:linear(Math.random())});
    }
    
  }

  return bot;
}

function buildSymmetricRandomBot(x=window.innerWidth/2, y=window.innerHeight/2, theta=0) {
  var bot = buildBaseBot(x, y, theta);

  bot.motors.push({x: bot.width/2, y: -bot.height/2, theta: 0, scale: bot.width/4, activation: 0});
  bot.motors.push({x: -bot.width/2, y: -bot.height/2, theta: 0, scale: bot.width/4, activation: 0});

  var numSensors = Math.random() * 6;
  for (var i = 0; i < numSensors; i++) {
    var sensorX = (Math.random() - 0.5) * bot.width;
    var sensorY = (Math.random() - 0.5) * bot.height;
    var sensorType = Math.floor(Math.random() * 2.99);
    bot.sensors.push({x: sensorX,
                      y: sensorY,
                      type: sensorType,
                      scale: bot.width/4});
    bot.sensors.push({x: -sensorX,
                      y: sensorY,
                      type: sensorType,
                      scale: bot.width/4});

    if (Math.random() > 0.5) {
      var coeff = Math.random();
      bot.connections.push({s: 2*i, m: 0, f:linear(coeff)});
      bot.connections.push({s: 2*i+1, m: 1, f:linear(coeff)});
    }
    if (Math.random() > 0.5) {
      var coeff = Math.random();
      bot.connections.push({s: 2*i, m: 1, f:linear(coeff)});
      bot.connections.push({s: 2*i+1, m: 0, f:linear(coeff)});
    }
    
  }

  return bot;
}



function mouseClicked() {
  for (var i = 0; i < bots.length; i++) {
    var bot = bots[i];
    var dist = Math.sqrt(Math.pow(bot.pos.x - mouseX, 2) + Math.pow(bot.pos.y - mouseY, 2));
    if (dist < bot.width) {
      bots.splice(i, 1);
      return
    }
  }
  bots.push(buildRandomBot(mouseX, mouseY, Math.random() * Math.PI * 2));
}

