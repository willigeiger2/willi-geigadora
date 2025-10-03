import { type Field, FieldOutput, Point } from "./ParticleSystem";
import * as Utils from "./utils"
export { WaveField };

class WaveField implements Field {
	public constructor(public axis: Point,
		               public magnitude: number,
					   public frequency: number,
					   public phase: number) {}

	evaluate(points: Point[]) : FieldOutput {
		let size = points.length;
		let field = new Array<Point>(size);
		let falloff = new Array<number>(size);

		for (let i = 0; i < size; i++) {
			let t = 2.0 * Math.PI
				* (this.frequency * Utils.dot(points[i], this.axis)
					+ this.phase);
			let wave = this.magnitude * Math.cos(t);
			field[i] = new Point(-wave * this.axis.y,
				                  wave * this.axis.x);
			falloff[i] = 1.0;
		}

		return new FieldOutput(field, falloff);
	}
}
