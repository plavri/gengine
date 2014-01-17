var GSpriteScratch = GSpriteItem.extend({
	ClearMethods: {
		ALPHA_ARC_100: 1,
		ALPHA_ARC_70: 2,
		ALPHA_ARC_40: 3
	},
	init: function(prop) {
		if (prop === undefined) {
			return;
		}
		this._super(prop);
		this.setContext(this.scratchImage.displayer);

		this.reset();

		this.handleCleared = prop.handleCleared;

		this.getContext().inputHandler.addListener(this, GMouseHandler.prototype.EventTypes.MOVE, function(eventType, coord, obj) {
			obj.handleScratch(coord);
		});

	},
	reset: function() {
		this._super();
		var prop = this.prop;

		this.addSubsprite(prop.scratchMask, true);
		this.addSubsprite(prop.scratchImage, true);
		this.clearGridFactor = prop.clearGridFactor || [10, 10];
		this.clearGridLimit = prop.clearGridLimit || 0.35;
		this.clearGrid = new Array(this.clearGridFactor[0] * this.clearGridFactor[1]);
		for (var i = 0; i < this.clearGridFactor[0] * this.clearGridFactor[1]; i++) {
			this.clearGrid[i] = 0;
		}
		this.cleared = false;

		this.scratchMask = prop.scratchMask;
		this.scratchImage = prop.scratchImage;

		this.scratchable = prop.scratchable || false;
		this.clearMethod = prop.clearMethod || GSpriteScratch.prototype.ClearMethod.ALPHA_ARC_100;
	},
	duplicate: function(newSprite) {
		console.log("NOT IMPLEMENTED")
		return false;
	},
	setScratchable: function(scratchable) {
		this.scratchable = scratchable;
	},
	isScratchable: function() {
		return this.scratchable;
	},
	drawOnCanvas: function(ctx) {
		var p = this.getTopLeftPosition();
		this.lastDrawnAngle = this.angle;
		this.drawWithParameters(this.angle, p[0], p[1], ctx);

		if (this.scratchImage.visible === true) {
			this.scratchImage.drawOnCanvas(ctx);
		}
		if (this.scratchMask.visible === true) {
			this.scratchMask.drawOnCanvas(ctx);
		}

		if (GDEBUG === true) {
			var pos = this.scratchMask.getTopLeftPosition(true);

			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
			for (var i = 0; i < this.clearGridFactor[0]; i++) {
				for (var j = 0; j < this.clearGridFactor[1]; j++) {
					if (this.clearGrid[this.clearGridFactor[0]*j + i] === 1) {
						ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
					} else {
						ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
					}

					ctx.fillRect(
							pos[0] + i*this.scratchMask.width/this.clearGridFactor[0],
							pos[1] + j*this.scratchMask.width/this.clearGridFactor[1],
							this.scratchMask.width/this.clearGridFactor[0],
							this.scratchMask.width/this.clearGridFactor[1]
								);
					ctx.strokeRect(
							pos[0] + i*this.scratchMask.width/this.clearGridFactor[0],
							pos[1] + j*this.scratchMask.width/this.clearGridFactor[1],
							this.scratchMask.width/this.clearGridFactor[0],
							this.scratchMask.width/this.clearGridFactor[1]
								);

				}
			}
			
		}

	},
	handleScratch: function(coord) {
		if (!this.isScratchable()) {
			return;
		}

		var p = this.scratchMask.getTopLeftPosition(true);

		/*
		this.scratchMask.imgCtx.beginPath();
		this.scratchMask.imgCtx.clearRect(x - radius - 1, y - radius - 1, radius * 2 + 2, radius * 2 + 2);
		this.scratchMask.imgCtx.closePath();
		*/

		//this.clearGrid[]

		//console.log(coord.x - p[0], this.scratchMask.width, this.clearGridFactor[0]);

		var cgCoord = 
				~~(((coord.x - p[0])/this.scratchMask.width) * this.clearGridFactor[0]) + 
				~~(((coord.y - p[1])/this.scratchMask.height) * this.clearGridFactor[1]) * this.clearGridFactor[0];

		switch (this.clearMethod) {
			case GSpriteScratch.prototype.ClearMethods.ALPHA_ARC_100:
				this.scratchMask.imgCtx.beginPath();
				this.scratchMask.imgCtx.fillStyle = "rgba(0, 0, 0, 1)";
				this.scratchMask.imgCtx.globalCompositeOperation = 'destination-out';
				this.scratchMask.imgCtx.arc(
						coord.x - p[0], 
						coord.y - p[1], 
						this.getContext().rescaleFromCmd(8), 
						0, 2 * Math.PI, false);
				this.scratchMask.imgCtx.fill();
				break;
			case GSpriteScratch.prototype.ClearMethods.ALPHA_ARC_70:
				this.scratchMask.imgCtx.beginPath();
				this.scratchMask.imgCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
				this.scratchMask.imgCtx.globalCompositeOperation = 'destination-out';
				this.scratchMask.imgCtx.arc(
						coord.x - p[0], 
						coord.y - p[1], 
						this.getContext().rescaleFromCmd(8), 
						0, 2 * Math.PI, false);
				this.scratchMask.imgCtx.fill();
				break;
			case GSpriteScratch.prototype.ClearMethods.ALPHA_ARC_40:
				this.scratchMask.imgCtx.beginPath();
				this.scratchMask.imgCtx.fillStyle = "rgba(0, 0, 0, 0.4)";
				this.scratchMask.imgCtx.globalCompositeOperation = 'destination-out';
				this.scratchMask.imgCtx.arc(
						coord.x - p[0], 
						coord.y - p[1], 
						this.getContext().rescaleFromCmd(8), 
						0, 2 * Math.PI, false);
				this.scratchMask.imgCtx.fill();
				break;
		}

		this.setChanged();

		if (this.clearGrid[cgCoord] !== 1) {
			this.clearGrid[cgCoord] = 1;
			if (this.isGridCleared() && !this.cleared) {
				this.cleared = true;
				if (this.handleCleared !== undefined) {
					this.handleCleared();
				}
			}
		}
		//this.scratchMask.setChanged();

	},
	isGridCleared: function() {
		var numCleared = 0;
		for (var i = 0; i < this.clearGrid.length; i++) {
			if (this.clearGrid[i] === 1) {
				numCleared++;
			}
		}

		if (numCleared/this.clearGrid.length >= this.clearGridLimit) {
			return true;
		}
		return false;
	}
});
