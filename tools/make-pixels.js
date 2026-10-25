// builds the frames for the pixels page transition into src/assets/img/page-pixels.svg
// usage: node tools/make-pixels.js
// a 16x16 grid filled in a random order over 10 steps, each frame is a <view> the css steps through: #p0 to #p10
import { writeFileSync } from "node:fs";

const _out = "src/assets/img/page-pixels.svg";
const _grid = 16;
const _steps = 10;

// same order on every build
let _seed = 7;
const _random = () => ((_seed = (_seed * 16807) % 2147483647) - 1) / 2147483646;

const _cells = Array.from({ length: _grid * _grid }, (_, index) => [index % _grid, Math.floor(index / _grid)]);
for (let index = _cells.length - 1; index > 0; index--) {
    const _pick = Math.floor(_random() * (index + 1));
    [_cells[index], _cells[_pick]] = [_cells[_pick], _cells[index]];
}
const _perStep = _cells.length / _steps;

const _views = Array.from({ length: _steps + 1 }, (_, step) => `<view id="p${step}" viewBox="${step * _grid} 0 ${_grid} ${_grid}"/>`);

// each frame is the one before it, moved a slot right, plus its new cells
const _frames = [];
for (let step = 1; step < _steps; step++) {
    const _new = _cells.slice(Math.round((step - 1) * _perStep), Math.round(step * _perStep));
    const _path = _new.map(([x, y]) => `M${step * _grid + x} ${y}h1v1h-1z`).join("");
    const _before = step > 1 ? `<use href="#f${step - 1}" x="${_grid}"/>` : "";
    _frames.push(`<g id="f${step}">${_before}<path d="${_path}"/></g>`);
}
_frames.push(`<rect x="${_steps * _grid}" width="${_grid}" height="${_grid}"/>`);

const _svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(_steps + 1) * _grid} ${_grid}" shape-rendering="crispEdges">${_views.join("")}${_frames.join("")}</svg>\n`;

writeFileSync(_out, _svg);
console.log(`${_out} ${_svg.length} bytes`);
