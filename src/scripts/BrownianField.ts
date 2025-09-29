import { type Field, FieldOutput, Point } from "../scripts/ParticleSystem";
export { BrownianField };

class BrownianField implements Field {
	public constructor(public magnitude: Point) {}

	evaluate(points: Point[]) : FieldOutput {
		let size = points.length;
		let field = new Array<Point>(size);
		let falloff = new Array<number>(size);
		for (let i = 0; i < size; i++) {
			field[i] = new Point(
				this.magnitude.x * (Math.random() - 0.5),
				this.magnitude.y * (Math.random() - 0.5));
			falloff[i] = 1.0;
		}
		return new FieldOutput(field, falloff);
	}
}
