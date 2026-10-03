export type CamId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7";

export type Cam = {
  id: CamId;
  name: string;
  x: number;
  y: number;
};

export type Road = [CamId, CamId];

export type Hit = [time: string, cam: CamId];

export type PlateEntry = {
  plate: string;
  tag: "" | "blacklist" | "anomaly" | "clone";
  hits: Hit[];
  alert?: [string, string];
};

export const CAMS: Record<CamId, Cam> = {
  C1: { id: "C1", name: "Camera 1, North Gate",         x: 90,  y: 90  },
  C2: { id: "C2", name: "Camera 2, Market Road",       x: 260, y: 90  },
  C3: { id: "C3", name: "Camera 3, Central Junction",  x: 260, y: 230 },
  C4: { id: "C4", name: "Camera 4, Ring Road East",    x: 470, y: 230 },
  C5: { id: "C5", name: "Camera 5, Station Approach",  x: 470, y: 370 },
  C6: { id: "C6", name: "Camera 6, South Flyover",     x: 620, y: 370 },
  C7: { id: "C7", name: "Camera 7, West Bridge",       x: 90,  y: 310 },
};

export const ROADS: Road[] = [
  ["C1", "C2"], ["C2", "C3"], ["C3", "C4"], ["C4", "C5"], ["C5", "C6"],
  ["C3", "C7"], ["C1", "C7"],
];

export const PLATES: Record<string, PlateEntry> = {
  "DL 01 AB 1001": {
    plate: "DL 01 AB 1001",
    tag: "",
    hits: [
      ["08:02", "C1"], ["08:09", "C2"], ["08:17", "C3"],
      ["08:31", "C4"], ["08:44", "C5"], ["08:52", "C6"],
    ],
  },
  "DL 02 CD 2002": {
    plate: "DL 02 CD 2002",
    tag: "blacklist",
    alert: [
      "Blacklist match",
      "This plate is on the stolen vehicle watchlist. Last seen at Camera 5, Station Approach.",
    ],
    hits: [
      ["14:10", "C7"], ["14:21", "C3"], ["14:36", "C4"], ["14:48", "C5"],
    ],
  },
  "DL 03 EF 3003": {
    plate: "DL 03 EF 3003",
    tag: "anomaly",
    alert: [
      "Route anomaly",
      "Passed Central Junction three times in 40 minutes.",
    ],
    hits: [
      ["19:05", "C2"], ["19:12", "C3"], ["19:20", "C7"],
      ["19:27", "C3"], ["19:38", "C4"], ["19:45", "C3"],
    ],
  },
  "DL 04 GH 4004": {
    plate: "DL 04 GH 4004",
    tag: "clone",
    alert: [
      "Possible cloned plate",
      "Seen at Camera 2 at 09:07 and Camera 6 at 09:09. The cameras are too far apart for one vehicle to cover in two minutes.",
    ],
    hits: [
      ["09:00", "C1"], ["09:07", "C2"], ["09:09", "C6"], ["09:20", "C3"],
    ],
  },
};

export const SAMPLE_PLATES = Object.keys(PLATES);