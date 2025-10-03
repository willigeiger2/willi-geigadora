import { type Field, FieldOutput, Point } from "./ParticleSystem";
import * as Utils from "./utils"
export { SumField };

class SumField implements Field {
	public constructor(public fields: Field[]) {}

	addField(field: Field) {
		this.fields.push(field);
	}

	evaluate(points: Point[]) : FieldOutput {
		let size = points.length;
		let field = new Array<Point>(size);
		let falloff = new Array<number>(size);

		for (var i = 0; i < size; i++) {
			field[i] = new Point(0.0, 0.0);
		}

		for (const f of this.fields) {
			let r = f.evaluate(points);
			for (var i = 0; i < size; i++) {
				field[i].x += r.field[i].x;
				field[i].y += r.field[i].y;
				falloff[i] += r.falloff[i];
			}
		}

		return new FieldOutput(field, falloff);
	}
}
