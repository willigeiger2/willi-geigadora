import { type Falloff, Point } from "./ParticleSystem";
import * as Utils from "./utils"
export { RadialFalloff };

class RadialFalloff implements Falloff {
	public constructor(public center: Point,
		               public innerRadius: number,
		               public outerRadius: number,
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

			// Optional wrapping -- this should be parameterized
			if (dx < -0.5) dx += 1.0;
			if (dx >  0.5) dx -= 1.0;
			if (dy < -0.5) dy += 1.0;
			if (dy >  0.5) dy -= 1.0;

			let d = Math.sqrt(dx * dx + dy * dy) / sqrtArea;
			falloff[i] = Utils.smoothstep(
				this.outerRadius, this.innerRadius, d);
		}

		return falloff;
	}
}
