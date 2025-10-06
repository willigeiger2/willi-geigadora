import { type Field, FieldOutput, Point } from "./ParticleSystem";
import * as Utils from "./utils"
export { RadialField };

class RadialField implements Field {
	public constructor(public center: Point,
		               public magnitude: number,
					   public screenSize: Point) {}

	evaluate(points: Point[]) : FieldOutput {
		let w = this.screenSize.x;
		let h = this.screenSize.y;
		let sqrtArea = Math.sqrt(w * w + h * h);
		let size = points.length;
		let field = new Array<Point>(size);
		let falloff = new Array<number>(size);

		for (var i = 0; i < size; i++) {
			let dx = w * (points[i].x - this.center.x);
			let dy = h * (points[i].y - this.center.y);
			let d = Math.sqrt(dx * dx + dy * dy);
			if (d > 1.0) {
				const f = this.magnitude *
					Utils.smoothstep(0.5, 0, (d / sqrtArea)) / d;
				field[i] = new Point(f * dx / w, f * dy / h);
				falloff[i] = 1.0;
			}
		}

		return new FieldOutput(field, falloff);
	}

	setCenter(center: Point): RadialField {
		this.center = center;
		return this;
	}

	setMagnitude(magnitude: number): RadialField {
		this.magnitude = magnitude;
		return this;
	}

	setScreenSize(screenSize: Point): RadialField {
		this.screenSize = screenSize;
		return this;
	}
}
