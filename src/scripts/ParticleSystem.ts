export { Point, ParticleSystem };

class Point {
	public constructor(public x: number, public y: number) {}
}

interface FieldOutput {
	field: Point[];
	falloff: number[];
}

interface Field {
	evaluate(points: Point[]) : FieldOutput;
}

class ParticleSystem {
	pos: Point[] = [];
	vel: Point[] = [];
	acc: Point[] = [];
	rst: Point[] = [];
	rad: number[] = [];

	initialize(size: number) {
		this.pos = new Array<Point>(size);
		this.vel = new Array<Point>(size);
		this.acc = new Array<Point>(size);
		this.rst = new Array<Point>(size);
		this.rad = new Array<number>(size);
	}

	createGrid(w: number, h: number) {
		this.initialize(w * h);
		var i = 0;
		for (var y = 0; y < h; y++) {
			for (var x = 0; x < w; x++, i++) {
				const jitter = 1.0;
				const gx = (x + 0.5 + jitter * (Math.random() - 0.5)) / w;
				const gy = (y + 0.5 + jitter * (Math.random() - 0.5)) / h;
				this.pos[i] = new Point(gx, gy);
				this.rst[i] = new Point(gx, gy);
				this.vel[i] = new Point(0.0, 0.0);
				this.acc[i] = new Point(0.0, 0.0);
				this.rad[i] = Math.pow(Math.random(), 3.0) * 4.0 + 3.0;
			}
		}
	}
}
