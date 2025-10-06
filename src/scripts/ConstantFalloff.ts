import { type Falloff, Point } from "./ParticleSystem";
import * as Utils from "./utils"
export { ConstantFalloff };

class ConstantFalloff implements Falloff {
	public constructor(public value: number) {}

	evaluate(points: Point[]) : number[] {
		let size = points.length;
		let falloff = new Array<number>(size);

		for (var i = 0; i < size; i++) {
			falloff[i] = this.value;
		}

		return falloff;
	}

	setValue(value: number): ConstantFalloff {
		this.value = value;
		return this;
	}
}
