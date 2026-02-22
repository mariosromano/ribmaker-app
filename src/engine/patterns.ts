export interface Pattern {
  id: string;
  name: string;
  file: string;
}

export const PATTERNS: Pattern[] = [
  { id: "rings", name: "Rings", file: "rings.png" },
  { id: "voronoi_cells", name: "Voronoi Cells", file: "v2_01_voronoi_cells.png" },
  { id: "turing_spots", name: "Turing Spots", file: "v2_02_turing_spots.png" },
  { id: "lissajous_web", name: "Lissajous Web", file: "v2_03_lissajous_web.png" },
  { id: "flow_field", name: "Flow Field", file: "v2_04_flow_field.png" },
  { id: "hexagonal_grid", name: "Hexagonal Grid", file: "v2_05_hexagonal_grid.png" },
  { id: "moire_interference", name: "Moire", file: "v2_07_moire_interference.png" },
  { id: "diamond_ripple", name: "Diamond Ripple", file: "v2_08_diamond_ripple.png" },
  { id: "islamic_geometry", name: "Islamic Geo", file: "v2_09_islamic_geometry.png" },
  { id: "mountain_contours", name: "Mountains", file: "v2_10_mountain_contours.png" },
  { id: "stepped_pyramid", name: "Pyramid", file: "v2_12_stepped_pyramid.png" },
  { id: "rose_curve", name: "Rose Curve", file: "v2_13_rose_curve.png" },
  { id: "warped_checker", name: "Warped Check", file: "v2_14_warped_checker.png" },
  { id: "soundwave_stack", name: "Soundwave", file: "v2_17_soundwave_stack.png" },
  { id: "hypnotic_eye", name: "Hypnotic Eye", file: "v2_18_hypnotic_eye.png" },
];
