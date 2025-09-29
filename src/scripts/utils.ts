import { Color, Point, ParticleSystem } from "../scripts/ParticleSystem";
export { hsv2rgb, rotate, smoothstep };

function hsv2rgb(h: number, s: number, v: number): number[] {
	while (h < 0) {
		h += 1;
	}
	h *= 6;
	const i = Math.floor(h);
	const f = h - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	switch (i % 6) {
		case 0: return [v * 255, t * 255, p * 255];
		case 1: return [q * 255, v * 255, p * 255];
		case 2: return [p * 255, v * 255, t * 255];
		case 3: return [p * 255, q * 255, v * 255];
		case 4: return [t * 255, p * 255, v * 255];
		case 5: return [v * 255, p * 255, q * 255];
	}
	return [0, 0, 0];
}

function rotate(pos: Point, angle: number): Point {
	return new Point(
		Math.cos(angle) * pos.x + Math.sin(angle) * pos.y,
		-Math.sin(angle) * pos.x + Math.cos(angle) * pos.y);
}

function smoothstep(x0: number, x1: number, x: number) {
	let t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
	return t * t * (3 - 2 * t);
}
