import { type Field, FieldOutput, Point } from "../scripts/ParticleSystem";
export { LinearField };

class LinearField implements Field {
	public constructor(public direction: Point) {}

	evaluate(points: Point[]) : FieldOutput {
		let size = points.length;
		let field = new Array<Point>(size);
		let falloff = new Array<number>(size);
		for (let i = 0; i < size; i++) {
			field[i] = this.direction;
			falloff[i] = 1.0;
		}
		return new FieldOutput(field, falloff);
	}

	setDirection(direction: Point): LinearField {
		this.direction = direction;
		return this;
	}
}
