var GEngine_ver = 0.13;
var GDEBUG = false;

var GResolution = {
	resolutions: [
		{ factor: 10, width: 3200, height: 2400 },
		{ factor: 9, width: 2880, height: 2160 },
		{ factor: 8, width: 2560, height: 1920 },
		{ factor: 7, width: 2240, height: 1680 },
		{ factor: 6, width: 1920, height: 1440 },
		{ factor: 5, width: 1600, height: 1200 },
		{ factor: 4.375, width: 1400, height: 1050 },
		{ factor: 4, width: 1280, height: 960 },
		{ factor: 3.2, width: 1024, height: 768},
		{ factor: 3, width: 960, height: 720 },
		{ factor: 2.5, width: 800, height: 600 },
		{ factor: 2, width: 640, height: 480 },
		{ factor: 1.5, width: 480, height: 360 },
		{ factor: 1, width: 320, height: 240 },
		{ factor: 0.5, width: 160, height: 120 }
	],
	getResolution: function(factor) {
		return $.grep(this.resolutions, function(el, i) { return el.factor === factor; })[0];
	},
	getOptimalResolution: function(width, height) {
		return $.grep(this.resolutions, function(el, i) { return el.width <= width && el.height <= height; })[0];
	}
};

var GExceptionCodes = {
	IS_RESOURCE : 1
}
function GException(code, message) {
	this.code = code;
	this.message = message;
}

function GPosition(x, y) {
	if (y === undefined && GUtil.getClassName(x) === 'GPosition') {
		this.x = x.x;
		this.y = x.y;
	} else {
    	this.x = x;
    	this.y = y;
    }
};
GPosition.name = "GPosition";
GPosition.prototype.setPosition = function(x, y) {
	if (y === undefined && GUtil.getClassName(x) === 'GPosition') {
		this.x = x.x;
		this.y = x.y;
	} else {
		this.x = ~~x;
		this.y = ~~y;
	}
};
GUtil = {
	rescale: function(val, oldFactor, newFactor) {
		return ~~(val * newFactor / oldFactor)
	},
	rectangleIntersect: function(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
		return !(bx1 > ax2 || 
           bx2 < ax1 || 
           by1 > ay2 ||
           by2 < ay1);
		/*
		return !(r2.left > r1.right || 
           r2.right < r1.left || 
           r2.top > r1.bottom ||
           r2.bottom < r1.top);
        */
	},
	getClassName: function(cl) {
		if (cl === null) {
			return null;
		}
		return cl.constructor.name;
	}
};

var GStopwatch = Class.extend({
	EaseMethods: {
		Normal: 0,
		QuadIn: 1,
		QuadOut: 2,
		QuadInOut: 7,
		EaseInOut: 3,
		CubicIn: 4,
		CubicOut: 5,
		CubicInOut: 6
		
	},
	init: function(duration, easeMethod) {
		this.duration = duration;
		this.running = false;
		this.deadTime = 0;
		this.deadStart = null;
		this.startTime = 0;
		this.easeMethod = easeMethod;
		return this;
	},
	start: function() {
		this.startTime = +new Date();
		this.running = true;
	},
	pause: function() {
		this.running = false;
		this.deadStart = +new Date();
	},
	unpause: function() {
		this.running = true;
		if (this.deadStart !== null) {
			this.deadTime += (+new Date()) - this.deadStart;
			this.deadStart = null;
		}
	},
	getTimeRunning: function() {
		return (+new Date() - this.startTime) - this.deadTime;
	},
	getCompletion: function() {
		var c = this.getTimeRunning() / this.duration;
		if (c > 1) {
			c = 1;
		}
		if (this.easeMethod === this.EaseMethods.QuadIn) {
			return c*c;
		} else if (this.easeMethod === this.EaseMethods.QuadOut) {
			return 1 - (1-c) * (1-c);
		} else if (this.easeMethod === this.EaseMethods.QuadInOut) {
			var t = c;
			t *= 2;
			if (t < 1) {
				return 1/2*t*t;
			}
			t--;
			return -1/2 * (t*(t-2) - 1);
		} else if (this.easeMethod === this.EaseMethods.CubicIn) {
			return c*c*c;
		} else if (this.easeMethod === this.EaseMethods.CubicOut) {
			c--;
			return (c*c*c + 1);
		} else if (this.easeMethod === this.EaseMethods.CubicInOut) {
			c *= 2;
			if (c < 1) {
				return 1/2*c*c*c;
			}
			c -= 2;
			return 1/2*(c*c*c + 2);
		} else {
			return c;
		}
	},
	isCompleted: function() {

		return (this.getTimeRunning() / this.duration) >= 1;
	}

});

var GMove = Class.extend({
	init: function() {

	},
	begin: function(sprite) {
		this.beginPosition = new GPosition(sprite.getPosition().x, sprite.getPosition().y);
	},
	getPosition: function(sprite, d) {
		// abstract
	}
});
var GMovePosition = GMove.extend({
	init: function(newPos) {
		this._super();
		this.endPosition = newPos;
	},
	begin: function(sprite) {
		this._super(sprite);
		if (sprite.initAngle !== undefined) {
			sprite.angle = Math.atan2(this.endPosition.x - this.beginPosition.x, -1 * (this.endPosition.y - this.beginPosition.y));
		}

	},
	getPosition: function(sprite, d) {
		// d = % of path
		// get new x/y based on % of path
		if (this.beginPosition === undefined) {
			return undefined;
		}
		return [
				this.beginPosition.x + ~~((this.endPosition.x - this.beginPosition.x) * d),
				this.beginPosition.y + ~~((this.endPosition.y - this.beginPosition.y) * d)
				];

	},
	debugDrawMovement: function(sprite, ctx) {
		if (this.beginPosition === undefined) {
			return;
		}
		ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		var p = this.getPosition(undefined, 0);
		ctx.moveTo(
					GUtil.rescale(p[0], sprite.displayer.cmdFactor, sprite.factor),
					GUtil.rescale(p[1], sprite.displayer.cmdFactor, sprite.factor)
				);

		for (var i = 1; i <= 100; i++) {
			p = this.getPosition(undefined, i/100.0);
			ctx.lineTo(
					GUtil.rescale(p[0], sprite.displayer.cmdFactor, sprite.factor),
					GUtil.rescale(p[1], sprite.displayer.cmdFactor, sprite.factor)
				);
		}
		ctx.closePath();
		ctx.stroke();
	}
});

var GMoveSmoothPath = GMove.extend({
	init: function(path, hasPrefix, hasPostfix) {
		var self = this;
		this.hasPrefix = (hasPrefix === undefined ? false : hasPrefix);
		this.hasPostfix = (hasPostfix === undefined ? false : hasPostfix);

		this._super();
		this.path = path;
		this.aPath = [];
		$.each(this.path, function(i, el) {
			self.aPath.push([el.x, el.y]);
		});

		this.numPoints = this.path.length - 1;
		if (this.hasPrefix) {
			this.numPoints--;
		}
		if (this.hasPostfix) {
			this.numPoints--;
		}

		this.smooth = Smooth(this.aPath, {
			method: Smooth.METHOD_CUBIC, 
    		clip: Smooth.CLIP_CLAMP, 
    		cubicTension: Smooth.CUBIC_TENSION_CATMULL_ROM
		});
	},
	begin: function(sprite) {

	},
	getPosition: function(sprite, d) {
		var pd = d * this.numPoints;
		if (this.hasPrefix) {
			pd++;
		}
		/*
		if (this.hasPostfix) {
			// nothing to do...
		}
		*/

		var sp = this.smooth(pd);

		if (sprite !== undefined && sprite.initAngle !== undefined && this.prevPosition) {
			if (sprite.smoothRotation === undefined) {
				sprite.angle = Math.atan2(sp[0] - this.prevPosition[0], -1 * (sp[1] - this.prevPosition[1]));
			} else if (sprite.smoothRotation === GSpriteItem.prototype.SmoothRotation.METHOD1) {
				if (sprite.lastDrawnAngle === null) {
					sprite.angle = Math.atan2(sp[0] - this.prevPosition[0], -1 * (sp[1] - this.prevPosition[1]));
				} else {
					var nAngle = Math.atan2(sp[0] - this.prevPosition[0], -1 * (sp[1] - this.prevPosition[1]));
					//var nDif = (sprite.lastDrawnAngle + nAngle) / 2;
					var nDif = (5*sprite.lastDrawnAngle + nAngle) / 6;
					if (Math.abs(sprite.lastDrawnAngle - nDif) > 1) {
						sprite.angle = nAngle;
					} else {
						sprite.angle = nDif;
					}
				}
			}
		}
		this.prevPosition = sp;
		

		return [
				sp[0],
				sp[1]
				];

		// d = % of time
		// s(x) => x [ 0 ... this.path.length-1]
	},
	debugDrawMovement: function(sprite, ctx) {
		ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
		ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';

		ctx.lineWidth = 1;

		$.each(this.path, function(i, el) {
			ctx.fillRect(
					GUtil.rescale(el.x-1, sprite.displayer.cmdFactor, sprite.factor), 
					GUtil.rescale(el.y-1, sprite.displayer.cmdFactor, sprite.factor), 
					3, 3);
		});

		ctx.beginPath();
		var p = this.smooth(0);
		ctx.moveTo(
					GUtil.rescale(p[0], sprite.displayer.cmdFactor, sprite.factor),
					GUtil.rescale(p[1], sprite.displayer.cmdFactor, sprite.factor)
				);
		for (var i = 1; i <= 100; i++) {
			var pd = (i / 100.0) * this.numPoints;
			if (this.hasPrefix) {
				pd++;
			}
			/*
			if (this.hasPostfix) {
				// nothing to do...
			}
			*/
			p = this.smooth(pd);
			ctx.lineTo(
					GUtil.rescale(p[0], sprite.displayer.cmdFactor, sprite.factor),
					GUtil.rescale(p[1], sprite.displayer.cmdFactor, sprite.factor)
				);
		}
		if (this.hasPostfix) {
			p = this.path[this.path.length - 1];
			ctx.lineTo(
					GUtil.rescale(p.x, sprite.displayer.cmdFactor, sprite.factor),
					GUtil.rescale(p.y, sprite.displayer.cmdFactor, sprite.factor)
				);
		}
		//ctx.closePath();
		ctx.stroke();
	}
});

var GMovement = Class.extend({
	CompletedCode: {
		TIMER: 1,
		MANUAL: 2
	},
	init: function(stopwatch, move, beginHandler, completionHandler, progressHandler) {
		this.stopwatch = stopwatch;
		this.move = move;
		this.beginHandler = beginHandler;
		this.completionHandler = completionHandler;
		this.progressHandler = progressHandler;
		this.completion = 0;
		this.progressHandlerStep = 0.01;
		this.completed = false;
		this.completedCode = null;
		this.running = false;
	},
	begin: function(sprite) {
		this.running = true;
		if (this.beginHandler !== undefined) {
			this.beginHandler();
		}

		this.stopwatch.start();

		this.move.begin(sprite);
	},
	update: function(sprite) {
		var ret = false;
		if (!this.running) {
			this.begin(sprite);
		}
		if (this.completed) {
			return true;
		}
		if (this.stopwatch.isCompleted()) {
			this.completed = true;
			this.completedCode = GMovement.prototype.CompletedCode.TIMER;
			if (this.completionHandler !== undefined) {
				this.completionHandler.apply(sprite, [this.completedCode]);
			}
			ret = true;
		}
		var completion = this.stopwatch.getCompletion();
		var p = this.move.getPosition(sprite, completion);
		
		if (sprite.getPosition().x !== p[0] || sprite.getPosition().y !== p[1]) {
			ret = true;
			sprite.getPosition().x = p[0];
			sprite.getPosition().y = p[1];
		}

		if (this.progressHandler && completion >= this.completion+this.progressHandlerStep) {
			this.progressHandler.apply(sprite, [completion, this.stopwatch.getTimeRunning()]);
			this.completion = completion;
		}


		return ret;

		
	},
	setCompleted: function(sprite, isCompleted, completedCode) {
		this.completed = isCompleted;

		if (isCompleted) {
			this.completedCode = completedCode;
			if (this.completionHandler !== undefined) {
				this.completionHandler.apply(sprite, [this.completedCode]);
			}
		}
	},
	isCompleted: function() {
		return this.completed;
	},
	debugDrawMovement: function(sprite, ctx) {
		this.move.debugDrawMovement(sprite, ctx);
	}
});
// new GMovement(new GStopwatch(3000), new GMovePosition(new GPosition(400, 100)), function() { console.log("Completed") }))
var GSpriteItem = Class.extend({
	AnchorTypes: {
		TOP_LEFT: 1,
		CENTER: 2,
		BOTTOM_CENTER: 3
	},
	SmoothRotation: {
		METHOD1: 1
	},
	DroppableEvents: {
		OVER_START: 1, // draggable element is over this droppable element
		OVER_STOP: 2, // draggable element is not over this droppable element anymore
		RELEASE: 3, // draggable element is released over this droppable element
	},
	CollisionEvents: {
		START: 1,
		STOP: 2
	},
	init: function(prop) {
		if (prop === undefined) {
			return;
		}

		if (prop.debug !== undefined) {
			this.debug = prop.debug;
		} else {
			this.debug = GDEBUG;
		}

		if (prop.smoothRotation !== undefined) {
			this.smoothRotation = prop.smoothRotation;
		}

		this.id = prop.id;
		this.initFactor = prop.factor;
		this.factor = prop.factor;

		this.effectorCanvas = null;
		this.effectorCtx = null;

		this.prop = prop;
		this.isResource = prop.isResource || false;

		this.initAngle = prop.initAngle || null;

		this.reset();

		if (prop.msPerFrame !== undefined) {
			this.msPerFrame = prop.msPerFrame;
		}

		if (prop.width !== undefined) {
			this.width = prop.width;
			this.initWidth = prop.width;
		}
		if (prop.height !== undefined) {
			this.height = prop.height;
			this.initHeight = prop.height;
		}

		this.translateX = ~~(this.width / 2);
		this.translateY = ~~(this.height / 2);

		if (prop.animations !== undefined) {
			this.animations = prop.animations;
		}

	},
	reset: function() {
		var prop = this.prop;

		this.angle = this.initAngle || 0;
		this.lastDrawnAngle = null;

		//Animation properties
		this.frame = 0;
		this.visible = false;
		this.alpha = 1;
		this.animation = null;
		this.currentAnimation = null;
		this.animationActive = false;
		this.msPerFrame = 16;

		this.resetDragProp();
		this.resetDropProp();
		this.resetCollisionProp();

		this.acDelta = 0;

		//Movement properties
		this.movements = [];
		this.effectors = [];


		if (this.effectorCanvas !== null) {
			this.effectorCanvas = null;
			this.effectorCtx = null;
		}

		this.anchorType = prop.anchorType;

		// if set, this sprite has a resource. It's up to sprite subtype to decide what to do with it (how to draw it)
		this.resource = prop.resource || false;
		if (this.resource) {
			this.width = this.resource.width;
			this.initWidth = this.resource.initWidth;

			this.height = this.resource.height;
			this.initHeight = this.resource.initHeight;
			this.factor = this.resource.factor;
			this.initFactor = this.resource.initFactor;
			this.initAngle = this.resource.initAngle;
			this.anchorType = this.anchorType || this.resource.anchorType;
		}

		if (this.isResource) {
			this.initEffectorBuffer();
		}

		// subsprite elements
		// if sprite is a subsprite
		this.isSubsprite = false;
		// parent sprite
		this.parent = null;
		// subsprite list
		this.subsprites = [];
		// hardlinked subsprite - visibility and property settings
		this.subspriteHardLink = false;

		this.anchorType = this.anchorType || GSpriteItem.prototype.AnchorTypes.TOP_LEFT;

		if (prop.position !== undefined) {
			this.position = prop.position;
		} else {
			this.position = new GPosition(0, 0);
		}
		this.data = {};
	},
	resetDragProp: function() {
		this.dragProp = {
			draggable: false,
			dragged: false,		// if this elt. is being dragged at the moment
			dragHandler: null,	// called when object is dragged
			dropHandler: null,	// called when interaction with droppable occurs (while dragging)
			automove: false,
			droppables: [],
			droppableStates: {} // temp. storage for states of droppable elements (by id)
		}
	},
	resetDropProp: function() {
		this.dropProp = {
			droppable: false,
			dropHandler: null
		}
	},
	resetCollisionProp: function() {
		this.collisionProp = {
			enabled: false,
			handler: null,
			objects: [], // null = all, [...]
			inCollisionById: {} // storage of all objects that this one is in collision (by id)
		}
	},
	initEffectorBuffer: function() {
		if (this.resource) {
			return;
		}

		if (this.effectorCanvas === null) {
			this.effectorCanvas = document.createElement("canvas");
			this.effectorCanvas.width = this.width;
			this.effectorCanvas.height = this.height;
			this.effectorCtx = this.effectorCanvas.getContext('2d');
			this.effectorCtx.webkitImageSmoothingEnabled = true;
			this.effectorCtx.imageSmoothingEnabled = true; 
			this.effectorCtx.mozImageSmoothingEnabled = true; 
		}
		this.effectorCtx.clearRect(0, 0, this.width, this.height);
	},
	getEffectorCtx: function() {
		if (this.resource) {
			return this.resource.effectorCtx;
		} else {
			return this.effectorCtx;
		}
	},
	duplicate: function(newSprite) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot be duplicated");
		}

		if (newSprite === undefined) {
			newSprite = new GSpriteItem();
		}

		newSprite.debug = this.debug;
		newSprite.smoothRotation = this.smoothRotation;
		newSprite.id = null;
		newSprite.initFactor = this.initFactor;
		newSprite.factor = this.factor;
		newSprite.prop = jQuery.extend(true, {}, this.prop);
		if (this.prop.position !== undefined) {
			newSprite.prop.position = new GPosition(this.prop.position);
		}
		newSprite.reset();

		newSprite.initAngle = this.initAngle;

		newSprite.msPerFrame = newSprite.msPerFrame;
		newSprite.width = this.width;
		newSprite.initWidth = this.initWidth;
		newSprite.height = this.height;
		newSprite.initHeight = this.initHeight;

		if (this.animations !== undefined) {
			newSprite.animations = jQuery.extend(true, {}, this.animations);
		}

		newSprite.setContext(this.getContext());


		return newSprite;
	},
	setChanged: function() {
		this.getContext().setChanged();
	},
	addSubsprite: function(sprite, hardLink) {
		sprite.isSubsprite = true;
		sprite.subspriteHardLink = hardLink;
		sprite.parent = this;
		this.subsprites.push(sprite);
	},
	removeSubsprite: function(sprite) {
		for (var i = 0; i < this.subsprites.length; i++) {
			if (this.subsprites[i].id === sprite.id) {
				delete this.subsprites[i];
				sprite.isSubsprite(false);
				sprite.parent = null;
				return true;
			}
		}
		return false;
	},
	setContext: function(displayer) {
		this.displayer = displayer;
		this.w = this.initWidth * this.initFactor / this.displayer.cmdFactor;
		this.h = this.initHeight * this.initFactor / this.displayer.cmdFactor;
	},
	getContext: function() {
		return this.displayer;
	},
	changeFactor: function(newFactor) {
		if (newFactor === this.factor) {
			return false;
		}

		this.factor = newFactor;
		//console.log("Resizing original sprite factor " + this.initFactor + " to " + this.factor);

		this.width = ~~(this.initWidth * newFactor / this.initFactor);
		this.height = ~~(this.initHeight * newFactor / this.initFactor);

		// rotation around center (change?)
		this.translateX = ~~(this.width / 2);
		this.translateY = ~~(this.height / 2);

		if (this.effectorCanvas !== null) {
			this.effectorCanvas.width = this.width;
			this.effectorCanvas.height = this.height;
		}


		return true;
	},
	getSuperspritePosition: function() {
		if (this.isSubsprite) {
			var pos = this.parent.getSuperspritePosition();
			return [this.position.x + pos[0], this.position.y + pos[1]];
		}
		return [ this.position.x, this.position.y ];
	},
	getTopLeftPosition: function(returnInCurrentFactor) {		
		if (this.isSubsprite) {
			var pos = this.getSuperspritePosition();

			var x = pos[0];
			var y = pos[1];

		} else {
			var x = this.position.x;
			var y = this.position.y;
		}


		switch (this.anchorType) {
			case this.AnchorTypes.TOP_LEFT:
				break;
			case this.AnchorTypes.BOTTOM_CENTER:
				x -= ~~(this.w/2);
				y -= this.h;
				break;
			case this.AnchorTypes.CENTER:
				x -= ~~(this.w/2);
				y -= ~~(this.h/2);

				//x -= ~~GUtil.rescale(this.w/2, this.initFactor, this.displayer.cmdFactor);
				//y -= ~~GUtil.rescale(this.h/2, this.initFactor, this.displayer.cmdFactor);
				break;
		}
/*
		if (this.isSubsprite) {
			x += this.parent.position.x;
			y += this.parent.position.y;
		}
*/
		if (returnInCurrentFactor === true) {
			return [
						GUtil.rescale(x, this.displayer.cmdFactor, this.factor),
						GUtil.rescale(y, this.displayer.cmdFactor, this.factor)
					];
		} else {
			return [x, y];
		}
	},
	getCenterPosition: function(returnInCurrentFactor) {
		if (this.isSubsprite) {
			var pos = this.getSuperspritePosition();

			var x = pos[0];
			var y = pos[1];

		} else {
			var x = this.position.x;
			var y = this.position.y;
		}
		/*
		var x = this.position.x;
		var y = this.position.y;
		*/

		switch (this.anchorType) {
			case this.AnchorTypes.TOP_LEFT:
				x += ~~(this.w/2);
				y += ~~(this.h/2);

				//x += ~~GUtil.rescale(this.w/2, this.initFactor, this.displayer.cmdFactor);
				//y += ~~GUtil.rescale(this.h/2, this.initFactor, this.displayer.cmdFactor);
				break;
			case this.AnchorTypes.BOTTOM_CENTER:
				//x -= ~~(this.w/2);
				y -= ~~(this.h/2);
				break;
			case this.AnchorTypes.CENTER:
				break;
		}

/*
		if (this.isSubsprite) {
			x += this.parent.position.x;
			y += this.parent.position.y;
		}
*/
		if (returnInCurrentFactor === true) {
			return [
						GUtil.rescale(x, this.displayer.cmdFactor, this.factor),
						GUtil.rescale(y, this.displayer.cmdFactor, this.factor)
					];
		} else {
			return [x, y];
		}
		
	},
	intersectsWith: function(sprite) {
		var atl = this.getTopLeftPosition();
		var btl = sprite.getTopLeftPosition();
		return GUtil.rectangleIntersect(atl[0], atl[1], atl[0]+this.w, atl[1]+this.h, btl[0], btl[1], btl[0]+sprite.w, btl[1]+sprite.h);
	},
	setPosition: function(x, y) {
		this.position.setPosition(x, y);
		this.displayer.setChanged();
		return this;
	},
	incPosition: function(dx, dy) {
		this.position.x += dx;
		this.position.y += dy;
		this.displayer.setChanged();
		return this;
	},
	getPosition: function() {
		return this.position;
	},
	setVisible: function(visible) {
		if (this.visible !== visible) {
			this.displayer.setChanged();	
		}
		this.visible = visible;
		for (var i = 0; i < this.subsprites.length; i++) {
			if (this.subsprites[i].subspriteHardLink === true) {
				this.subsprites[i].setVisible(visible);
			}
		}
		
		return this;
	},
	isVisible: function() {
		return this.visible;
	},
	setAlpha: function(alpha) {
		if (this.alpha !== alpha) {
			this.displayer.setChanged();	
		}
		this.alpha = alpha;
		for (var i = 0; i < this.subsprites.length; i++) {
			if (this.subsprites[i].subspriteHardLink == true) {
				this.subsprites[i].setAlpha(alpha);
			}
		}
		
		return this;
	},
	getAlpha: function() {
		return this.alpha;
	},
	setDraggable: function(isDraggable, prop) {
		if (isDraggable === this.dragProp.draggable) {
			return this;
		}

		if (isDraggable) {
			this.resetDragProp();
			this.dragProp.draggable = true;
			$.extend(this.dragProp, prop);

			this.getContext().inputHandler.addListener(this, GMouseHandler.prototype.EventTypes.DRAG, function(eventType, coord, obj) {
				if (coord !== null && this.dragProp.automove === true) {
					var cmdDX = GUtil.rescale(coord.deltaX, this.factor, this.displayer.cmdFactor);
					var cmdDY = GUtil.rescale(coord.deltaY, this.factor, this.displayer.cmdFactor);

					this.incPosition(cmdDX, cmdDY);
				}

				if (coord.dragStart) {
					this.setDragged(true);
				} else if (coord.dragEnd) {
					this.setDragged(false);
				}

				var hadIntersect = false;

				if (this.getDroppables().length > 0) {
					// check sprite's every droppable object
					var droppables = this.getDroppables();
					for (var i = 0; i < droppables.length; i++) {
						if (droppables[i].dropProp.droppable !== true) {
							continue;
						}

						var intersects = false;
						if (this.intersectsWith(droppables[i]) && !hadIntersect) {
							intersects = true;
						}
						if (this.dragProp.droppableStates[i] === true) {
							if (intersects === false) {
								// it did intersect, but now it doesn't anymore - we have a stop
								this.dragProp.droppableStates[i] = false;
								if (droppables[i].dropProp.dropHandler !== null) {
									droppables[i].dropProp.dropHandler.apply(droppables[i], [ GSpriteItem.prototype.DroppableEvents.OVER_STOP, this ]);
								}
								if (this.dragProp.dropHandler !== null) {
									this.dragProp.dropHandler.apply(this, [ GSpriteItem.prototype.DroppableEvents.OVER_STOP, droppables[i] ]);
								}
							} else if (coord.dragEnd) {
								// it did intersect and now the drag has ended - we have a release over droppable obj.
								this.dragProp.droppableStates[i] = false;
								if (droppables[i].dropProp.dropHandler !== null) {
									droppables[i].dropProp.dropHandler.apply(droppables[i], [ GSpriteItem.prototype.DroppableEvents.RELEASE, this ]);
								}
								if (this.dragProp.dropHandler !== null) {
									this.dragProp.dropHandler.apply(this, [ GSpriteItem.prototype.DroppableEvents.RELEASE, droppables[i] ]);
								}
							}
						} else {
							if (intersects === true) {
								// it was not activated and now it intersects - we have a start
								this.dragProp.droppableStates[i] = true;
								if (droppables[i].dropProp.dropHandler !== null) {
									droppables[i].dropProp.dropHandler.apply(droppables[i], [ GSpriteItem.prototype.DroppableEvents.OVER_START, this ]);
								}
								if (this.dragProp.dropHandler !== null) {
									this.dragProp.dropHandler.apply(this, [ GSpriteItem.prototype.DroppableEvents.OVER_START, droppables[i] ]);
								}
							}
						}

						if (intersects) {
							hadIntersect = true;
						}
					}
				}

				if (this.dragProp.dragHandler) {
					this.dragProp.dragHandler.apply(obj, [coord]);
				}

			});
		} else {
			this.dragProp.draggable = false;
			this.getContext().inputHandler.stopDrag(this);
			this.getContext().inputHandler.removeListener(this, GMouseHandler.prototype.EventTypes.DRAG);
		}

		return this;

	},
	getDroppables: function() {
		return this.dragProp.droppables;
	},
	setDroppable: function(isDroppable, prop) {
		if (isDroppable === this.dropProp.droppable) {
			return this;
		}

		if (isDroppable) {
			this.resetDropProp();
			this.dropProp.droppable = true;
			$.extend(this.dropProp, prop);
		} else {
			this.dropProp.droppable = false;
		}
		return this;
	},
	setDragged: function(isDragged) {
		this.dragProp.dragged = isDragged;
	},
	setCollision: function(enabled, prop) {
		if (enabled == this.collisionProp.enabled) {
			return;
		}

		if (enabled) {
			this.resetCollisionProp();
			this.collisionProp.enabled = true;
			$.extend(this.collisionProp, prop);
		} else {
			this.collisionProp.enabled = false;
		}
	},
	processCollisions: function() {
		if (this.isVisible() === false) {
			return false;
		}
		if (this.collisionProp.enabled === false) {
			return false;
		}

		var ret = false;

		for (var i = 0; i < this.collisionProp.objects.length; i++) {
			if (!this.collisionProp.objects[i].isVisible()) {
				continue;
			}
			var intersects = this.intersectsWith(this.collisionProp.objects[i]);
			if (intersects && this.collisionProp.inCollisionById[this.collisionProp.objects[i].id] !== true) {
				// new intersect
				this.collisionProp.inCollisionById[this.collisionProp.objects[i].id] = true;

				this.collisionProp.handler.apply(this, [ GSpriteItem.prototype.CollisionEvents.START, this.collisionProp.objects[i] ]);

				ret = true;

			} else if (!intersects && this.collisionProp.inCollisionById[this.collisionProp.objects[i].id] === true) {
				// not intersecting anymore
				delete this.collisionProp.inCollisionById[this.collisionProp.objects[i].id];

				this.collisionProp.handler.apply(this, [ GSpriteItem.prototype.CollisionEvents.STOP, this.collisionProp.objects[i] ]);

				ret = true;
			}
		}

		return ret;
		
	},
	getCurrentAnimation: function() {
		if (this.currentAnimation !== null) {
			return (this.resource ? this.resource.animations[this.currentAnimation] : this.animations[this.currentAnimation]);
		} else {
			return null;
		}
	},
	stopAnimation: function() {
		this.currentAnimation = null;
	},
	setAnimation: function(ani, stopOnFrame, startFrame, completionHandler) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Cannot set animation on resource");
		}

		var animations = (this.resource ? this.resource.animations : this.animations);

		if (animations === null || animations[ani] === undefined) {
			console.warn("No animation", ani, animations);
			return;
		}
		this.setChanged();

		this.currentAnimation = ani;
		this.currentAnimationCompletionHandler = completionHandler;

		if (this.getCurrentAnimation() === null) {
			this.animationActive = false;
			this.frame = null;
			return this;

		} else if (this.getCurrentAnimation().length === 1) {
			// we have 1 frame animation
			this.animationActive = false;
		} else {
			this.animationActive = !stopOnFrame;
		}
		this.frame = (startFrame === undefined ? 0 : startFrame);
		return this;
	},
	animationStep: function(step) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot step animation");
		}

		if (!this.currentAnimation || !this.animationActive) {
			return false;
		}

		var animations = (this.resource ? this.resource.animations : this.animations);

		var fFrom = animations[this.currentAnimation][0];
		var fTo = animations[this.currentAnimation][1];
		var frequency = (animations[this.currentAnimation][3] === undefined ? 1 : animations[this.currentAnimation][3]);
		var fDiff = (fTo - fFrom + 1) * frequency;

		if (this.frame + step >= fDiff) {
			if (this.currentAnimationCompletionHandler) {
				this.currentAnimationCompletionHandler.call(this);
			}
			if (animations[this.currentAnimation][2] === this.currentAnimation) {
				// looping ani
				var nextFrame = (this.frame + step) % fDiff;
				if (nextFrame !== this.frame) {
					this.frame = nextFrame;	
				} else {
					return false;
				}
				
			} else {
				var overStep = (this.frame + step) - fDiff;
				var nextAni = animations[this.currentAnimation][2];
				var nextFrequency = ((animations[nextAni] === null || animations[nextAni][3] === undefined) ? 1 : animations[nextAni][3]);
				this.setAnimation(nextAni, this.animationActive, overStep / nextFrequency);
			}
			return true;
		} else {
			this.frame += step;
			return true;
		}
		
	},
	addMovement: function(movement) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot have movement");
		}

		this.movements.push(movement);
		return movement;
	},
	removeMovement: function(movement) {
		movement.isCompleted
	},
	processMovements: function() {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot process animation");
		}

		var ret = false;
		if (!this.movements.length) {
			return false;
		}

		var movement = this.movements[0];
		ret = movement.update(this) || ret;
		if (movement.isCompleted()) {
			this.movements.splice(0, 1);
			ret = true;
		}
		return ret;

	},
	addEffector: function(effector) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot have effects");
		}

		this.initEffectorBuffer();
		this.effectors.push(effector);
		return effector;
	},
	/*
		Effector is processed after movements. Processing and drawing are separated
		- update the state and then call draw on effect to draw the state...
	*/
	processEffectors: function() {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot process effects");
		}

		var ret = false;
		if (!this.hasEffectors()) {
			return false;
		}

		var effector = this.effectors[0];
		ret = effector.update(this) || ret;

		if (effector.isCompleted()) {
			this.effectors.splice(0, 1);
			ret = true;
		}
		return ret;

	},
	hasEffectors: function() {
		if (!this.effectors.length) {
			return false;
		}
		return true;
	},
	drawEffectors: function() {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot draw effects");
		}

		if (!this.hasEffectors()) {
			return false;
		}
		return this.effectors[0].draw(this);
	},
	setData: function(key, value) {
		if (value === undefined) {
			delete this.data[key];
		} else {
			this.data[key] = value;
		}
		return this;
	},
	getData: function(key) {
		return this.data[key];
	},
	update: function(delta) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot be updated");
		}

		this.acDelta += delta;
		if (this.acDelta >= this.msPerFrame) {
			var ret = false;
			this.acDelta = 0;
			if (this.animationStep(1)) {
				ret = true;
			}
			if (this.processMovements()) {
				ret = true;
			}
			if (this.processEffectors()) {
				ret = true;
			}
			if (this.processCollisions()) {
				ret = true;
			}
			return ret;
		} else {
			return false;
		}
	},
	drawOnCanvas: function(ctx) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot be drawn");
		}

		var p = this.getTopLeftPosition();
		this.lastDrawnAngle = this.angle;
		this.drawWithParameters(this.angle, p[0], p[1], ctx);

		var ssl = this.subsprites.length;
		if (ssl > 0) {
			for (var i = 0; i < ssl; i++) {
				if (this.subsprites[i].visible === true) {
					this.subsprites[i].drawOnCanvas(ctx);
				}
			}
		}

	},
	drawWithParameters: function(angle, xOriginal, yOriginal, ctx) {
		if (this.isResource) {
			throw new GException(GExceptionCodes.IS_RESOURCE, "Resource cannot be drawn");
		}

		//animation frame is null, display nothing!
		if (this.frame === null) {
			return;
		}

		var frame = 0;
		var initAngle = this.initAngle;

		var x = GUtil.rescale(xOriginal, this.displayer.cmdFactor, this.factor);
		var y = GUtil.rescale(yOriginal, this.displayer.cmdFactor, this.factor);

		if (this.debug === true) {
			ctx.fillStyle = '#f00';
			ctx.lineWidth = 1;
			ctx.fillRect(GUtil.rescale(this.position.x, this.displayer.cmdFactor, this.factor)-1, GUtil.rescale(this.position.y, this.displayer.cmdFactor, this.factor)-1, 3, 3);
			ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, this.width, this.height);

			if (this.movements.length) {
				var movement = this.movements[0];
				movement.debugDrawMovement(this, ctx);
			}
		}
		

	},
	load: function(handler) {
		if (handler !== undefined) {
			handler();
		}
	}
});

var GSpriteText = GSpriteItem.extend({
	init: function(prop) {
		this._super(prop);

		this.textData = prop.textData;
		$.each(this.textData, function() {
			/*
				text: "CLICK ON YOUR\nSPACESHIP TO START\nTHE GAME!\nGOOD LUCK!",
				font: "GoodDogRegular",
				size: 21,
				color: '#fff'

				lineHeight
				textAlign: [start, end, left, right, and center]
				textBaseline: [top, hanging, middle, alphabetic, ideographic, or bottom]
			*/
			this.sizeOriginal = this.size;
			if (this.lineHeight !== undefined) {
				this.lineHeightOriginal = this.lineHeight;
			}
			if (this.textAlign === undefined) {
				this.textAlign = "left";
			}
			if (this.textBaseline === undefined) {
				this.textBaseline = "top";
			}
		});
	},
	changeFactor: function(newFactor) {
		if (!this._super(newFactor)) {
			return false;
		}
		//console.log("Resizing original font factor " + this.initFactor + " to " + this.factor);
		var self = this;
		$.each(this.textData, function() {
			this.size = GUtil.rescale(this.sizeOriginal, self.displayer.cmdFactor, self.displayer.canvasFactor);
			if (this.lineHeightOriginal !== undefined) {
				this.lineHeight = GUtil.rescale(this.lineHeightOriginal, self.displayer.cmdFactor, self.displayer.canvasFactor);
			}
		});
	},
	setText: function(text, frame) {
		if (frame === undefined) {
			$.each(this.textData, function() {
				this.text = "" + text;
			});
		} else {
			this.textData[frame].text = "" + text;
		}
		return this;
	},
	drawWithParameters: function(angle, xOriginal, yOriginal, ctx) {
		//animation frame is null, display nothing!
		if (this.frame === null) {
			return;
		}

		var frame = 0;
		//var initAngle = this.initAngle;

		var originalAlpha = ctx.globalAlpha;
		ctx.globalAlpha = this.getAlpha();

		//var x = GUtil.rescale(xOriginal, this.displayer.cmdFactor, this.factor);
		//var y = GUtil.rescale(yOriginal, this.displayer.cmdFactor, this.factor);
		var pp = this.getCenterPosition();
		var x = GUtil.rescale(pp[0], this.displayer.cmdFactor, this.factor);
		var y = GUtil.rescale(pp[1], this.displayer.cmdFactor, this.factor);
		
		if (this.currentAnimation) {
			var frequency = (this.animations[this.currentAnimation][3] === undefined ? 1 : this.animations[this.currentAnimation][3]);
			//console.log(3, frequency, this.frame, ~~(this.frame / frequency));
			frame = this.animations[this.currentAnimation][0] + (~~(this.frame / frequency));
			if (this.animations[this.currentAnimation][4] !== undefined) {
				initAngle = this.animations[this.currentAnimation][4];
			}
		}

		var t = this.textData[frame];
		ctx.save();

		ctx.fillStyle = t.color;
		ctx.font = t.size + "px " + t.font;
		ctx.textBaseline = t.textBaseline;
		ctx.textAlign = t.textAlign;

		if (t.shadow) {
			ctx.shadowColor = t.shadow.color;
      		ctx.shadowBlur = t.shadow.blur;
      		ctx.shadowOffsetX = t.shadow.x;
      		ctx.shadowOffsetY = t.shadow.y;
		}

		var text = t.text.split("\n");
		if (text.length === 1) {
			ctx.fillText(t.text, x, y);	
		} else {
			for (var i = 0; i < text.length; i++) {
				ctx.fillText(text[i], x, y + (t.lineHeight !== undefined ? t.lineHeight : t.size)*i);
			}
		}
		ctx.restore();
		ctx.globalAlpha = originalAlpha;

		if (this.debug === true) {
			ctx.fillStyle = '#0f0';
			ctx.lineWidth = 1;
			var sp = this.getSuperspritePosition();

			ctx.fillRect(GUtil.rescale(sp[0], this.displayer.cmdFactor, this.factor)-1, GUtil.rescale(sp[1], this.displayer.cmdFactor, this.factor)-1, 3, 3);
			//ctx.fillRect(GUtil.rescale(this.position.x, this.displayer.cmdFactor, this.factor)-1, GUtil.rescale(this.position.y, this.displayer.cmdFactor, this.factor)-1, 3, 3);
			//ctx.fillRect(x-1, y-1, 3, 3);
			ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
			ctx.lineWidth = 1;
			ctx.strokeRect(~~(x-this.width/2), ~~(y - this.height/2), this.width, this.height);

			if (this.movements.length) {
				var movement = this.movements[0];
				movement.debugDrawMovement(this, ctx);
			}
		}
		

	}
});

var GSprite = GSpriteItem.extend({
	init: function(prop) {
		if (prop === undefined) {
			return;
		}
		this._super(prop);

		if (!prop.resource) {
			this.src = prop.url;
		}

	},
	changeFactor: function(newFactor) {
		if (!this._super(newFactor)) {
			return false;
		}
		//console.log("Resizing original image factor " + this.initFactor + " to " + this.factor);

		if (!this.resource) {
			this.imageWidth = (this.initImageWidth / this.initWidth) * this.width;
			this.imageHeight = (this.initImageHeight / this.initHeight) * this.height;

		
			this.imgCanvas.width = this.imageWidth;
			this.imgCanvas.height = this.imageHeight;

			this.drawCanvas.width = this.imageWidth;
			this.drawCanvas.height = this.imageHeight;

			this.imgCtx.clearRect(0, 0, this.imageWidth, this.imageHeight);
			this.imgCtx.webkitImageSmoothingEnabled = true;
			this.imgCtx.imageSmoothingEnabled = true; 
			this.imgCtx.mozImageSmoothingEnabled = true; 
			this.imgCtx.drawImage(this.initImg, 0, 0, this.initImageWidth, this.initImageHeight, 0, 0, this.imageWidth, this.imageHeight);

			this.drawCtx.webkitImageSmoothingEnabled = true;
			this.drawCtx.imageSmoothingEnabled = true; 
			this.drawCtx.mozImageSmoothingEnabled = true; 
		}

	},
	duplicate: function(newSprite) {
		if (newSprite === undefined) {
			newSprite = new GSprite();
		}
		this._super(newSprite);

		if (!this.resource) {
			newSprite.src = this.src;

			newSprite.initImg = this.initImg;
			newSprite.initImageWidth = this.initImageWidth;
			newSprite.initImageHeight = this.initImageHeight;
			newSprite.imageWidth = this.imageWidth;
			newSprite.imageHeight = this.imageHeight;

			newSprite.imgCanvas = document.createElement("canvas");
			newSprite.imgCanvas.width = this.imageWidth;
			newSprite.imgCanvas.height = this.imageHeight;
			newSprite.imgCtx = newSprite.imgCanvas.getContext('2d');
			newSprite.imgCtx.webkitImageSmoothingEnabled = true;
			newSprite.imgCtx.imageSmoothingEnabled = true; 
			newSprite.imgCtx.mozImageSmoothingEnabled = true; 
			newSprite.imgCtx.drawImage(this.initImg, 0, 0, this.initImageWidth, this.initImageHeight, 0, 0, this.imageWidth, this.imageHeight);

			newSprite.drawCanvas = document.createElement("canvas");
			newSprite.drawCanvas.width = this.imageWidth;
			newSprite.drawCanvas.height = this.imageHeight;
			newSprite.drawCtx = newSprite.drawCanvas.getContext('2d');
			newSprite.drawCtx.webkitImageSmoothingEnabled = true;
			newSprite.drawCtx.imageSmoothingEnabled = true; 
			newSprite.drawCtx.mozImageSmoothingEnabled = true; 

			//todo calcs...
		}

		return newSprite;
	},
	load: function(handler) {
		if (!this.resource) {
			var self = this;
			this.initImg = new Image();
			this.initImg.onload = function() {
				self.initImageWidth = this.width;
				self.imageWidth = this.width;
				self.initImageHeight = this.height;
				self.imageHeight = this.height;

				if (self.width === undefined) {
					self.width = self.imageWidth;
					self.initWidth = self.imageWidth;
				}
				if (self.height === undefined) {
					self.height = self.imageHeight;
					self.initHeight = self.imageHeight;
				}

				self.imgCanvas = document.createElement("canvas");
				self.imgCanvas.width = this.width;
				self.imgCanvas.height = this.height;
				self.imgCtx = self.imgCanvas.getContext('2d');
				self.imgCtx.drawImage(self.initImg, 0, 0);

				self.drawCanvas = document.createElement("canvas");
				self.drawCanvas.width = this.width;
				self.drawCanvas.height = this.height;
				self.drawCtx = self.drawCanvas.getContext('2d');

				self.translateX = ~~(self.width / 2);
				self.translateY = ~~(self.height / 2);

				if (handler !== undefined) {
					handler();
				}
			};
			this.initImg.src = this.src;
		} else {
			if (handler !== undefined) {
				handler();
			}
		}
	},
	drawWithParameters: function(angle, xOriginal, yOriginal, ctx) {
		//animation frame is null, display nothing!
		if (this.frame === null) {
			return;
		}

		var animations = (this.resource ? this.resource.animations : this.animations);
		var frame = 0;
		var initAngle = this.initAngle;

		var x = GUtil.rescale(xOriginal, this.displayer.cmdFactor, this.factor);
		var y = GUtil.rescale(yOriginal, this.displayer.cmdFactor, this.factor);


		var originalAlpha = ctx.globalAlpha;
		ctx.globalAlpha = this.getAlpha();

		if (this.currentAnimation) {
			var frequency = (animations[this.currentAnimation][3] === undefined ? 1 : animations[this.currentAnimation][3]);
			//console.log(3, frequency, this.frame, ~~(this.frame / frequency));
			frame = animations[this.currentAnimation][0] + (~~(this.frame / frequency));
			if (animations[this.currentAnimation][4] !== undefined) {
				initAngle = animations[this.currentAnimation][4];
			}
		}

		if (!this.resource) {
			// not a resource, use buffered canvases
			if (initAngle !== null && angle !== initAngle) {
				this.drawCtx.save();
				this.drawCtx.clearRect(0, 0, this.width, this.height);

				this.drawCtx.translate(this.translateX, this.translateY);
				this.drawCtx.rotate(-initAngle + angle);
				this.drawCtx.translate(-this.translateX, -this.translateY);
					
					//this.drawCtx.translate(~~(this.width / 2), - ~~(this.height / 4));
					//this.drawCtx.rotate(Math.PI/4);
				if (this.hasEffectors()) {
					this.effectorCtx.drawImage(this.imgCanvas, frame*this.width, 0, this.width, this.height, 0, 0, this.width, this.height);
					this.drawEffectors();
					this.drawCtx.drawImage(this.effectorCanvas);
				} else {
					this.drawCtx.drawImage(this.imgCanvas, frame*this.width, 0, this.width, this.height, 0, 0, this.width, this.height);
				}
				this.drawCtx.restore();

				ctx.drawImage(this.drawCanvas, x, y);
			} else {
				if (this.hasEffectors()) {
					this.effectorCtx.drawImage(this.imgCanvas, frame*this.width, 0, this.width, this.height, 0, 0, this.width, this.height);
					this.drawEffectors();
					ctx.drawImage(this.effectorCanvas, 0 , 0, this.width, this.height, x, y, this.width, this.height);
				} else {
					ctx.drawImage(this.imgCanvas, frame*this.width, 0, this.width, this.height, x, y, this.width, this.height);
				}
			}
		} else {
			// we have a resource, draw that on ctx
			if (initAngle !== null) {
				// TODO: THIS COULD BE TRICKY, ROTATING ON A COMMON BUFFER CANVAS
				this.resource.drawCtx.save();
				this.resource.drawCtx.clearRect(0, 0, this.resource.width, this.resource.height);

				this.resource.drawCtx.translate(this.translateX, this.translateY);
				this.resource.drawCtx.rotate(-initAngle + angle);
				this.resource.drawCtx.translate(-this.translateX, -this.translateY);
					
				if (this.hasEffectors()) {
					this.resource.effectorCtx.drawImage(this.resource.imgCanvas, frame*this.resource.width, 0, this.resource.width, this.resource.height, 0, 0, this.resource.width, this.resource.height);
					this.drawEffectors();
					this.resource.drawCtx.drawImage(this.resource.effectorCanvas);
				} else {
					this.resource.drawCtx.drawImage(this.resource.imgCanvas, frame*this.resource.width, 0, this.resource.width, this.resource.height, 0, 0, this.resource.width, this.resource.height);
				}
				this.resource.drawCtx.restore();

				ctx.drawImage(this.resource.drawCanvas, x, y);
			} else {
				if (this.hasEffectors()) {
					this.resource.effectorCtx.drawImage(this.resource.imgCanvas, frame*this.resource.width, 0, this.resource.width, this.resource.height, 0, 0, this.resource.width, this.resource.height);
					this.drawEffectors();
					ctx.drawImage(this.resource.effectorCanvas, 0 , 0, this.resource.width, this.resource.height, x, y, this.resource.width, this.resource.height);
				} else {
					ctx.drawImage(this.resource.imgCanvas, frame*this.resource.width, 0, this.resource.width, this.resource.height, x, y, this.resource.width, this.resource.height);
				}
			}
		}

		ctx.globalAlpha = originalAlpha;

		if (this.debug === true) {
			ctx.fillStyle = '#f00';
			ctx.lineWidth = 1;

			var sp = this.getSuperspritePosition();
			ctx.fillRect(GUtil.rescale(sp[0], this.displayer.cmdFactor, this.factor)-1, GUtil.rescale(sp[1], this.displayer.cmdFactor, this.factor)-1, 3, 3);
			//ctx.fillRect(GUtil.rescale(this.position.x, this.displayer.cmdFactor, this.factor)-1, GUtil.rescale(this.position.y, this.displayer.cmdFactor, this.factor)-1, 3, 3);
			//ctx.fillRect(x-1, y-1, 3, 3);
			ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, this.width, this.height);

			if (this.movements.length) {
				var movement = this.movements[0];
				movement.debugDrawMovement(this, ctx);
			}
		}

	}
});

var GButtonStates = {
	NORMAL: 'normal',
	PRESSED: 'pressed',
	HOVER: 'hover',
	DISABLED: 'disabled'
}
var GButton = GSpriteItem.extend({
	init: function(prop) {
		if (prop === undefined) {
			return;
		}

		if (prop.AnchorType === undefined) {
			prop.anchorType = GSprite.prototype.AnchorTypes.TOP_LEFT;
		}

		if (prop.animations === undefined) {
			prop.animations = {
							normal: [0],
							pressed: [1],
							hover: [2],
							disabled: [3]
						};
		}
		
		this.setContext(prop.sprites[0].displayer);
		this._super(prop);

		this.handleClick = prop.handleClick;
	},
	reset: function() {
		this._super();
		var prop = this.prop;

		for (var i = 0; i < prop.sprites.length; i++) {
			this.addSubsprite(prop.sprites[i], true);
		}
		this.enabled = false;
		this.getContext().inputHandler.addListener(this, GMouseHandler.prototype.EventTypes.UP, function(eventType, coord, obj) {
			this.setState(GButtonStates.NORMAL);
			obj.handleClick.apply(obj, [coord]);
		});
		this.getContext().inputHandler.addListener(this, GMouseHandler.prototype.EventTypes.DOWN, function(eventType, coord, obj) {
			this.setState(GButtonStates.PRESSED);
		});

	},
	setState: function(state) {
		this.setAnimation(state);

		for (var i = 0; i < this.subsprites.length; i++) {
			this.subsprites[i].setAnimation(state);
		}

		return this;
	},
	enable: function() {
		this.enabled = true;
		this.displayer.inputHandler.enableListener(this, GMouseHandler.prototype.EventTypes.DOWN);
		this.displayer.inputHandler.enableListener(this, GMouseHandler.prototype.EventTypes.UP);

		this.setState(GButtonStates.NORMAL);

		return this;
	},
	disable: function() {
		this.enabled = false;
		this.displayer.inputHandler.disableListener(this, GMouseHandler.prototype.EventTypes.DOWN);
		this.displayer.inputHandler.disableListener(this, GMouseHandler.prototype.EventTypes.UP);

		this.setState(GButtonStates.DISABLED);

		return this;
	}
});

var GEffect = Class.extend({
	init: function() {

	},
	begin: function(sprite) {
		// effect starts
	},
	getPosition: function(sprite, d) {
		// abstract
	}
});
var GBlinkEffect = GEffect.extend({
	init: function(opt) {
		this._super();
		this.opt = opt;
		this.state = {};
	},
	/*
	begin: function(sprite) {
		this._super(sprite);
	},
	*/
	update: function(sprite, d) {
		// d = % of effect

		if (d <= 0.5) {
			this.state.intensity = d * 2;
		} else {
			this.state.intensity = (1 - d) * 2;
		}

		return true;

	},
	draw: function(sprite) {
		// draw on sprite.effectorCtx with this.state

		var pixels = sprite.getEffectorCtx().getImageData(0, 0, sprite.width, sprite.height);
		var d = pixels.data;
		var adjustment = 255 * this.state.intensity;

		for (var i=0; i<d.length; i+=4) {
			d[i] = Math.min(d[i] + adjustment, 255);
			d[i+1] = Math.min(d[i+1] + adjustment, 255);
			d[i+2] = Math.min(d[i+2] + adjustment, 255);
		}
		sprite.getEffectorCtx().putImageData(pixels, 0, 0);

	}

});
var GGlowEffect = GEffect.extend({
	init: function(opt) {
		this._super();
		this.opt = opt;
		this.state = {};
	},
	/*
	begin: function(sprite) {
		this._super(sprite);
	},
	*/
	update: function(sprite, d) {
		// d = % of effect

		if (d <= 0.5) {
			this.state.intensity = d * 2;
		} else {
			this.state.intensity = (1 - d) * 2;
		}

		return true;

	},
	draw: function(sprite) {
		var amount = this.state.intensity;

		var pixels = sprite.getEffectorCtx().getImageData(0, 0, sprite.width, sprite.height);
		var data = pixels.data;
		var p = sprite.width * sprite.height;
		var pix = p*4, pix1 = pix + 1, pix2 = pix + 2, pix3 = pix + 3;
		while (p--) {
			if ((data[pix-=4] += amount * data[pix]) > 255) { data[pix] = 255; }
			if ((data[pix1-=4] += amount * data[pix1]) > 255) { data[pix1] = 255; }
			if ((data[pix2-=4] += amount * data[pix2]) > 255) { data[pix2] = 255; }
		}
		sprite.getEffectorCtx().putImageData(pixels, 0, 0);

	}

});

var GEffector = Class.extend({
	init: function(stopwatch, effects, beginHandler, completionHandler) {
		this.stopwatch = stopwatch;
		if (effects instanceof Array) {
			this.effects = effects;
		} else {
			this.effects = [effects];
		}
		this.beginHandler = beginHandler;
		this.completionHandler = completionHandler;
		this.completed = false;
		this.running = false;
	},
	begin: function(sprite) {
		this.running = true;
		if (this.beginHandler !== undefined) {
			this.beginHandler();
		}

		this.stopwatch.start();

		for (var i = 0; i < this.effects.length; i++) {
			this.effects[i].begin(sprite);
		}
	},
	update: function(sprite) {
		var ret = false;
		if (!this.running) {
			this.begin(sprite);
		}
		if (this.completed) {
			return true;
		}
		if (this.stopwatch.isCompleted()) {
			this.completed = true;
			if (this.completionHandler !== undefined) {
				this.completionHandler();
			}
			ret = true;
		}
		for (var i = 0; i < this.effects.length; i++) {
			ret = this.effects[i].update(sprite, this.stopwatch.getCompletion()) || ret;
		}

		return ret;
	},
	draw: function(sprite) {
		var ret = false;
		for (var i = 0; i < this.effects.length; i++) {
			ret = this.effects[i].draw(sprite) || ret;
		}
		return ret;
	},
	isCompleted: function() {
		return this.completed;
	}
});

function GGroup() {
	this.elements = [];
}
GGroup.prototype.addElement = function(el) {
	this.elements.push(el);
}
GGroup.prototype.removeElement = function(el) {
	for (var i = 0; i < this.elements.length; i++) {
		if (this.elements[i].id === el.id) {
			this.elements.splice(i, 1);
			return;
		}
	}
}
GGroup.prototype.hasElement = function(el) {
	for (var i = 0; i < this.elements.length; i++) {
		if (this.elements[i].id === el.id) {
			return true;
		}
	}
	return false;
}


var GMouseHandler = Class.extend({
	EventTypes: {
		DOWN: 1,
		UP: 2,
		MOVE: 3,
		DRAG: 4
	},
	init: function(displayer, el) {
		this.displayer = displayer;
		this.el = el;
		this.$el = $(el);
		this.listeners = {};
		
		this.mouseDown = false;
		this.move = false;
		this.moveThreshold = 4;
		this.drag = false;
		this.dragElement = null;
		this.stopDomEvents = true;
		this.lastMove = null;
		this.moveStartThreshold = 10;

		this.el.addEventListener("mousedown", this._onDownDomEvent.bind(this), false);
		this.el.addEventListener("mouseup", this._onUpDomEvent.bind(this), false);
		this.el.addEventListener("mousemove", this._onMoveDomEvent.bind(this), false);

		this.el.addEventListener("touchstart", this._onDownDomEvent.bind(this), false);
		this.el.addEventListener("touchend", this._onUpDomEvent.bind(this), false);
		this.el.addEventListener("touchmove", this._onTouchMoveDomEvent.bind(this), false);


	},
	addListener: function(sprite, eventType, handler, stopProp) {
		if (this.listeners[eventType] === undefined) {
			this.listeners[eventType] = [];
		}

		this.listeners[eventType].push({sprite: sprite, handler: handler, stopProp: stopProp, enabled: true });
	},
	enableListener: function(sprite, eventType) {
		if (this.listeners[eventType] === undefined) {
			return;
		}

		if (GUtil.getClassName(sprite) === 'GGroup') {
			for (var i = 0; i < this.listeners[eventType].length; i++) {
				if (this.listeners[eventType][i] === null) {
					continue;
				}

				if (sprite.hasElement(this.listeners[eventType][i].sprite)) {
					this.listeners[eventType][i].enabled = true;
				}
			}
		} else {

			for (var i = 0; i < this.listeners[eventType].length; i++) {
				if (this.listeners[eventType][i] !== null && this.listeners[eventType][i].sprite.id === sprite.id) {
					this.listeners[eventType][i].enabled = true;
					return;
				}
			}
		}
	},
	disableListener: function(sprite, eventType) {
		if (this.listeners[eventType] === undefined) {
			return;
		}

		if (GUtil.getClassName(sprite) === 'GGroup') {
			for (var i = 0; i < this.listeners[eventType].length; i++) {
				if (this.listeners[eventType][i] === null) {
					continue;
				}

				if (sprite.hasElement(this.listeners[eventType][i].sprite)) {
					this.listeners[eventType][i].enabled = false;
				}
			}
		} else {
			for (var i = 0; i < this.listeners[eventType].length; i++) {
				if (this.listeners[eventType][i] !== null && this.listeners[eventType][i].sprite.id === sprite.id) {
					this.listeners[eventType][i].enabled = false;
					return;
				}
			}
		}
	},
	removeListener: function(sprite, eventType) {
		if (this.listeners[eventType] === undefined) {
			return;
		}

		for (var i = 0; i < this.listeners[eventType].length; i++) {
			if (this.listeners[eventType][i] !== null && this.listeners[eventType][i].sprite.id === sprite.id) {
				this.listeners[eventType].splice(i, 1);
				return;
			}
		}
	},
	stopDrag: function(sprite) {
		this.handleEvent(this.EventTypes.DRAG, { dragEnd: true });
		this.move = false;
		this.drag = false;
	},
	handleEvent: function(eventType, coord) {
		var x = GUtil.rescale(coord.x, this.displayer.canvasFactor, this.displayer.cmdFactor);
		var y = GUtil.rescale(coord.y, this.displayer.canvasFactor, this.displayer.cmdFactor);

		if (this.drag && this.dragElement !== null && eventType == this.EventTypes.DRAG) {
			this.dragElement.handler.apply(this.dragElement.sprite, [this.EventTypes.DRAG, {
						dragStart: coord.dragStart,
						dragEnd: coord.dragEnd,
						x: coord.x,
						y: coord.y,
						deltaX: coord.deltaX,
						deltaY: coord.deltaY,
						cmdX: x,
						cmdY: y
					}, this.dragElement.sprite]);


			if (coord.dragEnd) {
				this.dragElement = null;
			}
			return;
		}

		if (this.listeners[eventType] === undefined || this.listeners[eventType].length === 0) {
			return;
		}

		for (var i = 0; i < this.listeners[eventType].length; i++) {
			var el = this.listeners[eventType][i];
			if (!el.sprite.isVisible()) {
				continue;
			}
			if (!el.enabled) {
				continue;
			}

			var p = el.sprite.getTopLeftPosition();
			var w = el.sprite.initWidth;
			var h = el.sprite.initHeight;
			if (x >= p[0] && x <= p[0]+w &&
				y >= p[1] && y <= p[1]+h) {
					if (eventType == this.EventTypes.DRAG) {
						this.dragElement = el;
						this.handleEvent(eventType, coord);
						return;
					}
					el.handler.apply(el.sprite, [eventType, {
						dragStart: coord.dragStart,
						dragEnd: coord.dragEnd,
						x: coord.x,
						y: coord.y,
						deltaX: coord.deltaX,
						deltaY: coord.deltaY,
						cmdX: x,
						cmdY: y
					}, el.sprite]);
					
					if (el.stopProp) {
						return;
					}
					continue;
			}
		}

		

	},
	_onDownDomEvent: function(e) {
		this.mouseDown = true;

		var coords = this.getInputCoordinates(e);
		this.handleEvent(this.EventTypes.DOWN, coords);
		this.stopEventIfRequired(e);

		//var coords = e.targetTouches ? e.targetTouches[0] : e;
		//console.log(coords.pageX, coords.clientX, document.body.scrollLeft, this.el.offsetLeft, this.$el.offset());
/*
		return {
        		x: (coords.pageX || coords.clientX + document.body.scrollLeft) - this.el.offsetLeft,
        		y: (coords.pageY || coords.clientY + document.body.scrollTop) - this.el.offsetTop
    	};
*/
	},
	_onUpDomEvent: function(e) {
		this.mouseDown = false;

		var coords = this.getInputCoordinates(e);
		this.handleEvent(this.EventTypes.UP, coords);

		if (this.drag) {
			coords.dragEnd = true;
			this.handleEvent(this.EventTypes.DRAG, coords);
			this.drag = false;
		}

		this.move = false;
		this.lastMove = null;
		this.stopEventIfRequired(e);
	},
	_onTouchMoveDomEvent: function(e) {

		e.preventDefault();
		this._onMoveDomEvent(e);
	},
	_onMoveDomEvent: function(e) {
		if (!this.mouseDown) {
			// speedup - trigger only for dragging...
			return;
		}

		var coords = this.getInputCoordinates(e);

		if (this.lastMove === null) {
			this.lastMove = coords;
		}

		var deltaX = coords.x - this.lastMove.x;
    	var deltaY = coords.y - this.lastMove.y;

    	var dx = Math.sqrt(deltaX*deltaX + deltaY*deltaY);

    	if (this.move && dx > this.moveThreshold) {
			if (this.drag) {
				this.handleEvent(this.EventTypes.DRAG, { x : coords.x, y: coords.y, deltaX: deltaX, deltaY: deltaY });
			}

			this.handleEvent(this.EventTypes.MOVE, { x : coords.x, y: coords.y, deltaX: deltaX, deltaY: deltaY });
			
			this.lastMove = coords;
		}

    	if (!this.move && dx > this.moveStartThreshold) {
			this.move = true;

			if (this.mouseDown) {
				this.drag = true;
				this.handleEvent(this.EventTypes.DRAG, { dragStart: true, x : coords.x, y: coords.y, deltaX: 0, deltaY: 0 });

			}
		}

		this.stopEventIfRequired(e);
	},
	getInputCoordinates: function(e) {
		if (e.targetTouches && e.targetTouches.length) {
			var coords = e.targetTouches[0];
		} else if (e.changedTouches && e.changedTouches.length) {
			var coords = e.changedTouches[0];
		} else {
			var coords = e;
		}

    	return {
        		x: ~~((coords.pageX || coords.clientX + document.body.scrollLeft) - this.$el.offset().left),
        		y: ~~((coords.pageY || coords.clientY + document.body.scrollTop) - this.$el.offset().top)
    	};
	},
	stopEventIfRequired: function(e) {
	    if (this.stopDomEvents) {
	        e.stopPropagation();
	        e.preventDefault();
	    }
	}
});

var GDisplayer = Class.extend({
	LoadingStage: {
		LOADING: 1,
		RESIZING: 2
	},
	init: function(param, sprites) {
		if (param.backgroundPainter !== undefined) {
			this.backgroundPainter = param.backgroundPainter;
		}
		if (param.postPainter !== undefined) {
			this.postPainter = param.postPainter;
		}
		if (param.loadFinishedHandler !== undefined) {
			this.loadFinishedHandler = param.loadFinishedHandler;
		}
		if (param.resizeHandler !== undefined) {
			this.resizeHandler = param.resizeHandler;
		}
		if (param.updateHandler !== undefined) {
			this.updateHandler = param.updateHandler;
		}
		if (param.loadingHandler !== undefined) {
			this.loadingHandler = param.loadingHandler;
		}
		this.canvas = param.canvas;
		this.running = false;
		this.removeSprites = [];
		this.removeSpritesHandlers = [];

		this.ctx = this.canvas.getContext('2d');
		

		var resolution = GResolution.getResolution(param.factor);

		this.canvasFactor = resolution.factor;
		this.canvas.width = resolution.width;
		this.canvas.height = resolution.height;
		this.canvasWidth = this.canvas.width;
		this.canvasHeight = this.canvas.height;


		this.cmdFactor = param.cmdFactor;
		this.cmdResolution = GResolution.getResolution(this.cmdFactor);

		this.cmdw = this.cmdResolution.width;
		this.cmdh = this.cmdResolution.height;

		this.w = this.cmdResolution.width;
		this.h = this.cmdResolution.height;

		this.lastUpdateTime = 0;

		this.backCanvas = document.createElement('canvas');
		this.backCanvas.width = this.canvasWidth;
		this.backCanvas.height = this.canvasHeight;
		this.backCtx = this.backCanvas.getContext('2d');
	    
		this.graphics = {};
		this._graphics = new Array();
		this._graphicsLength = 0;

		this.numLoaded = 0;
		this.numLoadedCount = 0;

		if (param.setupInputHandler === false) {
		} else {
			this.inputHandler = new GMouseHandler(this, this.canvas);
		}
		this._sprites = sprites;

		window.requestAnimFrame = (function () {
		    var func = window.requestAnimationFrame ||
		        window.webkitRequestAnimationFrame ||
		        window.mozRequestAnimationFrame ||
		        window.oRequestAnimationFrame ||
		        window.msRequestAnimationFrame ||
		        function (callback, element)
		        {
		            window.setTimeout(callback, 1000 / this.fps);
		        };

		    // apply to our window global to avoid illegal invocations (it's a native)
		    return function (callback, element) {
		        func.apply(window, [callback, element]);
		    };
		})();
	},
	begin: function() {
		try {
			var context = this;
			$.each(context._sprites, function(si, sprite) {
				context.numLoadedCount++;
			});
			if (context.numLoadedCount === 0) {
				context.graphicsResizer();
			} else {
				$.each(context._sprites, function(si, sprite) {
					sprite.setContext(context);
					context.graphics[sprite.id] = sprite;
					context._graphics.push(sprite);
					context._graphicsLength = context._graphics.length;

					sprite.load(function() {
						//console.log("    img loaded " + (context.numLoaded + 1) + " / " + context.numLoadedCount);
						if (context.numLoaded+1 === context.numLoadedCount) {
						    context.numLoaded++;
						    context.graphicsResizer();
						    
						} else {
						    context.numLoaded++;
						}
						if (context.loadingHandler !== undefined) {
							context.loadingHandler(GDisplayer.prototype.LoadingStage.LOADING, context.numLoaded, context.numLoadedCount);
						}

					});
				});
			}
		} catch (err) {
			console.log(err.stack);
		}
	},

	addSprite: function(sprite) {
		var context = this;

		context.numLoadedCount++;
		context.numLoaded++;

		context.graphics[sprite.id] = sprite;
		context._graphics.push(sprite);
		context._graphicsLength = context._graphics.length;

	},

	processRemoveSprites: function() {
		if (this.removeSprites.length == 0) {
			return 0;
		}

		var context = this;

		var numRemoved = 0;
		for (var i = 0; i < context.removeSprites.length; i++) {
			var rs = context.removeSprites[i];
			delete context.graphics[rs];

			numRemoved++;
		}
		context.removeSprites = [];

		context._graphics = [];
		$.each(context.graphics, function() {
			context._graphics.push(this);
		});
		context._graphicsLength = context._graphics.length;

		for (var i = 0; i < context.removeSpritesHandlers.length; i++) {
			var h = this.removeSpritesHandlers[i];
			if (h) {
				h(numRemoved);
			}
		}
		context.removeSpritesHandlers = [];

		return numRemoved;

	},

	removeSpritesById: function(spritesId, handler) {
		for (var i = 0; i < spritesId.length; i++) {
			if (this.graphics[spritesId[i]] !== undefined) {
				this.removeSprites.push(spritesId[i]);
			}
		}
		this.removeSpritesHandlers.push(handler);
		this.setChanged();
	},

	registerSprite: function(sprite, h) {
		var self = this;
		sprite.setContext(this);
		sprite.changeFactor(self.canvasFactor);

		sprite.load(function() {
			self.addSprite(sprite);
			if (h !== undefined) {
				h();
			}
		});
	},

	reset: function(param) {
		$.each(this._graphics, function(si, sprite) {
			if (param === undefined || param.excludedSprites === undefined || param.excludedSprites.indexOf(sprite.id) === -1) {
				sprite.reset();
			}
		});
	},

	graphicsResizer: function() {
		var self = this;
		var ic = 0;
		$.each(this._graphics, function(si, sprite) {
			//console.log("Resizing", ic, self._graphicsLength)
			sprite.changeFactor(self.canvasFactor);
			ic++;
			if (self.loadingHandler !== undefined) {
				self.loadingHandler(GDisplayer.prototype.LoadingStage.RESIZING, ic, self._graphicsLength);
			}
			if (ic === self._graphicsLength) {
				self.loaderComplete();
			}
		});

		if (ic === 0) {
			self.loaderComplete();
		}

		
	},
	resize: function(width, height, handler) {
		var self = this;
		var ic = 0;

		self.devicePixelRatio = window.devicePixelRatio;

		var resolution = GResolution.getOptimalResolution(width, height);

		var factor = Math.max(0.5, resolution.factor);

		self.w = width;
		self.h = height;
		self.canvasWidth = width;
		self.canvasHeight = height;
		self.canvas.width = self.canvasWidth;
		self.canvas.height = self.canvasHeight;
		self.backCanvas.width = self.canvasWidth;
		self.backCanvas.height = self.canvasHeight;

		self.canvasFactor = factor;
		$.each(this._graphics, function(si, sprite) {
			//console.log("Resizing", ic, self._graphicsLength)
			sprite.changeFactor(self.canvasFactor);
			ic++;
			if (ic === self._graphicsLength) {
				if (handler !== undefined) {
					handler();
				}
			}
		});
		if (self.resizeHandler !== undefined) {
			self.resizeHandler();
		}
	},

	loaderComplete: function() {
		var h = this.loadFinishedHandler;
				    
	    if (this.loadFinishedHandler!=null) {
			this.loadFinishedHandler = null;
			h();
	    }
	},

	getCenterX: function() {
		return ~~(this.canvasWidth / 2);
	},

	getCenterY: function() {
		return ~~(this.canvasHeight / 2);
	},

	getWidth: function() {
		return this.canvasWidth;
	},

	getHeight: function() {
		return this.canvasHeight;
	},

	start: function() {
		this.lastUpdateTime = 0;
		this.running = true;
		window.requestAnimFrame(this.update.bind(this));
	},
	stop: function() {
		this.running = false;
	},
	isRunning: function() {
		return this.running;
	},
	setChanged: function() {
		this.changed = true;
	},
	lastChange: 0,
	changed: false,
	update: function() {
		if (this.running) {
			window.requestAnimFrame(this.update.bind(this));
		}

		var changed = false;

		var now = Date.now();
		var delta = now - this.lastUpdateTime;

		for (var si = 0; si < this._graphicsLength; si++) {
			var sprite = this._graphics[si];
			if (sprite.isResource) {
				continue;
			}

			this.changed = sprite.update(delta) || this.changed;

		}
		if (this.updateHandler !== undefined) {
			this.changed = this.updateHandler(delta) || this.changed;
		}
		this.lastUpdateTime = now;

		if (now - this.lastChange > 1000 || this.changed) {
			this.lastChange = now;
			this.changed = false;
			this.draw(delta);
		}
		this.processRemoveSprites();
		

	},
	draw: function(delta) {
		this.clearCanvas(this.backCtx);
		if (this.backgroundPainter !== undefined) {
			this.backgroundPainter(this.backCtx, delta);
		}

		for (s in this._graphics) {
			var sprite = this._graphics[s];
			if (!sprite.visible || sprite.isSubsprite || sprite.isResource) {
				continue;
			}

			sprite.drawOnCanvas(this.backCtx);
			
		}
		if (this.postPainter !== undefined) {
			this.postPainter(this.backCtx, delta);
		}

		this.clearCanvas(this.ctx);
		this.ctx.drawImage(this.backCanvas, 0, 0);
	},
	clearCanvas: function(ctx) {
		ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
	},

	getSprite: function(id) {
		return this.graphics[id];
	},

	rescaleFromCmd: function(x) {
		return GUtil.rescale(x, this.cmdFactor, this.canvasFactor);
	},
	rescaleToCmd: function(x) {
		return GUtil.rescale(x, this.canvasFactor, this.cmdFactor);
	}

});

/*

Changelist:

0.13 / 2014-01-10
- GButton

0.12 / 2014-01-08
- enable/disable eventlistener per sprite or group
- groups of elements


0.11 / 2013-09-20
- unload sprites mechanism
- movement progress ticker
- stop event propagation support

0.10 / 2013-09-16
- added resources support - load graphics just once and use it many times: sprite { isResource: true }, resource usage: sprite { resouce: <SPRITE> }

0.09 / 2013-09-12
- collisions

0.08 / 2013-07-25
- decoupled start of loading (in case of functions in constructor)
- added option to disable input handlers (ipad) with "param.setupInputHandler"
- added registration of new sprites after data has been already loaded

0.07 / 2013-05-07
- Implemented droppable object: <SPRITE>.setDroppable(true, { dropHandler: function(event, obj) { ... }})
- added dropHandler to draggable object (called when dragable object interacts with droppable)

0.06 / 2013-04-24
- Draggable objects changes: <SPRITE>.setDraggable(true, { automove: true, droppables: [ <sprites> ], dragHandler: function(coord) { ... } })

0.05 / 2013-04-17
- Draggable objects: <SPRITE>.setDraggable(true, { automove: true }, function(coord) { ... })

0.04 / 2013-04-11
- Support for alpha transparency on sprites, use with: <SPRITE>.setAlpha([0.0-1.0]) / <SPRITE>.getAlpha()

*/