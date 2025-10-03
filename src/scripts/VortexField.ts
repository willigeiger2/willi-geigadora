import { type Field, FieldOutput, Point } from "./ParticleSystem";
import * as Utils from "./utils"
export { VortexField };

class VortexField implements Field {
	public constructor(public center: Point, public omega: number) {}

	evaluate(points: Point[]) : FieldOutput {
		let size = points.length;
		let field = new Array<Point>(size);
		let falloff = new Array<number>(size);
		for (let i = 0; i < size; i++) {
			let dx = points[i].x - this.center.x;
			let dy = points[i].y - this.center.y;
			let d = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
			let pRot = Utils.rotate(new Point(dx, dy),
				this.omega / (2.0 * Math.PI));
			field[i] = new Point((pRot.x - dx) / d,
			                     (pRot.y - dy) / d);
			falloff[i] = 1.0;
		}
		return new FieldOutput(field, falloff);
	}
}
