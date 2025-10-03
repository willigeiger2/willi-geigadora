import { type Falloff, Point } from "./ParticleSystem";
import * as Utils from "./utils"
export { RadialFalloff };

class RadialFalloff implements Falloff {
	public constructor(public center: Point,
		               public magnitude: number,
					   public screenSize: Point) {}

	evaluate(points: Point[]) : number[] {
		let w = this.screenSize.x;
		let h = this.screenSize.y;
		let sqrtArea = Math.sqrt(w * w + h * h);
		let size = points.length;
		let falloff = new Array<number>(size);

		for (var i = 0; i < size; i++) {
			let dx = w * (points[i].x - this.center.x);
			let dy = h * (points[i].y - this.center.y);
			let d = Math.sqrt(dx * dx + dy * dy) / sqrtArea;
			//console.log("d = " + d);
			//const k = 1.0 / (this.magnitude * d + 1.0);
			const k = Utils.smoothstep(1.0, 0.0, d);
			/*
			const f = this.magnitude *
				Utils.smoothstep(0.5, 0, (d / sqrtArea)) / d;
				*/
			falloff[i] = k;
		}

		return falloff;
	}
}
