export interface Pattern {
  id: string;
  name: string;
  file: string;
}

// Curated set: each pattern is a smooth grayscale gradient with full 0..255
// range and strong horizontal variation, so the rib-depth sampler produces
// flowing, designed-looking walls (no chaotic noise).
//
// Top row = strongest first impression.
export const PATTERNS: Pattern[] = [
  { id: 'rings',             name: 'Rings',         file: 'rings.png' },
  { id: 'horizontal_waves',  name: 'Sine Bands',    file: 'horizontal_waves.png' },
  { id: 'zigzag_organic',    name: 'Organic Wave',  file: 'zigzag_organic.png' },
  { id: 'flow_field',        name: 'Flow Field',    file: 'flow_field.png' },
  { id: 'diagonal_waves',    name: 'Diagonal Wave', file: 'diagonal_waves.png' },
  { id: 'topo_contours',     name: 'Topography',    file: 'topo_contours.png' },
  { id: 'mountain_horizon',  name: 'Mountain',      file: 'mountain_horizon.png' },
  { id: 'radial_dome',       name: 'Dome',          file: 'radial_dome.png' },
  { id: 'spiral',            name: 'Spiral',        file: 'spiral.png' },
  { id: 'vertical_gradient', name: 'Gradient',      file: 'vertical_gradient.png' },
  { id: 'ridges',            name: 'Ridges',        file: 'ridges.png' },
  { id: 'ocean_waves',       name: 'Ocean',         file: 'ocean_waves.png' },
];
