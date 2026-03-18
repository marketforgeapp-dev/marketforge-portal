export type MonthKey =
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec";

export type SeasonalityTiming =
  | "PEAK"
  | "SHOULDER"
  | "SLOW"
  | "BUSY"
  | "NEUTRAL";

type FamilySeasonalityWindow = {
  peakMonths: MonthKey[];
  shoulderMonths: MonthKey[];
};

const MONTH_ALIASES: Record<string, MonthKey> = {
  january: "jan",
  jan: "jan",
  february: "feb",
  feb: "feb",
  march: "mar",
  mar: "mar",
  april: "apr",
  apr: "apr",
  may: "may",
  june: "jun",
  jun: "jun",
  july: "jul",
  jul: "jul",
  august: "aug",
  aug: "aug",
  september: "sep",
  sept: "sep",
  sep: "sep",
  october: "oct",
  oct: "oct",
  november: "nov",
  nov: "nov",
  december: "dec",
  dec: "dec",
};

const ALL_YEAR_WINDOW: FamilySeasonalityWindow = {
  peakMonths: [],
  shoulderMonths: [],
};

const FAMILY_SEASONALITY_WINDOWS: Record<string, FamilySeasonalityWindow> = {
  "burst-pipe-repair": {
    peakMonths: ["dec", "jan", "feb"],
    shoulderMonths: ["nov", "mar"],
  },
  "emergency-plumbing": {
    peakMonths: ["dec", "jan", "feb"],
    shoulderMonths: ["mar", "jul", "aug"],
  },
  "water-heater-repair-replacement": {
    peakMonths: ["nov", "dec", "jan", "feb"],
    shoulderMonths: ["oct", "mar"],
  },
  "water-heater-service": {
    peakMonths: ["nov", "dec", "jan", "feb"],
    shoulderMonths: ["oct", "mar"],
  },
  "tankless-water-heater": {
    peakMonths: ["nov", "dec", "jan", "feb"],
    shoulderMonths: ["oct", "mar"],
  },
  "gas-line": {
    peakMonths: ["oct", "nov", "dec", "jan", "feb"],
    shoulderMonths: ["mar", "sep"],
  },
  "drain-cleaning": {
    peakMonths: ["mar", "apr", "may", "sep", "oct"],
    shoulderMonths: ["feb", "jun", "nov"],
  },
  "hydro-jetting": {
    peakMonths: ["mar", "apr", "may", "sep", "oct"],
    shoulderMonths: ["feb", "jun", "nov"],
  },
  "sewer-line-service": {
    peakMonths: ["mar", "apr", "may", "sep", "oct"],
    shoulderMonths: ["feb", "jun", "nov"],
  },
  "slab-leak-repair": {
    peakMonths: ["dec", "jan", "feb", "mar"],
    shoulderMonths: ["nov", "apr"],
  },
  "leak-repair": {
    peakMonths: ["dec", "jan", "feb", "mar"],
    shoulderMonths: ["nov", "apr"],
  },
  repiping: {
    peakMonths: ["jan", "feb", "mar", "oct", "nov"],
    shoulderMonths: ["apr", "sep", "dec"],
  },
  "water-softener": {
    peakMonths: ["apr", "may", "jun", "jul"],
    shoulderMonths: ["mar", "aug"],
  },
  "custom-home-plumbing-installation": {
    peakMonths: ["mar", "apr", "may", "jun", "jul", "aug"],
    shoulderMonths: ["feb", "sep", "oct"],
  },
  "septic-tank-pumping": {
    peakMonths: ["apr", "may", "jun", "jul", "aug"],
    shoulderMonths: ["mar", "sep", "oct"],
  },
  "septic-system-inspection": {
    peakMonths: ["mar", "apr", "may", "jun"],
    shoulderMonths: ["feb", "jul", "sep"],
  },
  "drain-field-repair": {
    peakMonths: ["apr", "may", "jun", "jul"],
    shoulderMonths: ["mar", "aug", "sep"],
  },
  "lift-pump-service": {
    peakMonths: ["apr", "may", "jun", "jul", "aug"],
    shoulderMonths: ["mar", "sep"],
  },
  "grease-trap-cleaning": {
    peakMonths: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
    shoulderMonths: [],
  },
  "riser-lid-installation": {
    peakMonths: ["apr", "may", "jun", "jul"],
    shoulderMonths: ["mar", "aug", "sep"],
  },
  "tree-removal": {
    peakMonths: ["aug", "sep", "oct", "nov"],
    shoulderMonths: ["mar", "apr", "may"],
  },
  "storm-cleanup": {
    peakMonths: ["aug", "sep", "oct"],
    shoulderMonths: ["jul", "nov"],
  },
  "pruning-trimming": {
    peakMonths: ["jan", "feb", "mar", "apr"],
    shoulderMonths: ["nov", "dec", "may"],
  },
  "stump-grinding": {
    peakMonths: ["apr", "may", "jun", "jul", "aug"],
    shoulderMonths: ["mar", "sep", "oct"],
  },
  "lot-clearing": {
    peakMonths: ["mar", "apr", "may", "jun", "jul", "aug"],
    shoulderMonths: ["feb", "sep", "oct"],
  },
  "plant-health-care": {
    peakMonths: ["apr", "may", "jun", "jul"],
    shoulderMonths: ["mar", "aug", "sep"],
  },
  "disease-pest-management": {
    peakMonths: ["apr", "may", "jun", "jul", "aug"],
    shoulderMonths: ["mar", "sep"],
  },
  "ac-repair": {
    peakMonths: ["jun", "jul", "aug"],
    shoulderMonths: ["may", "sep"],
  },
  "heating-repair": {
    peakMonths: ["nov", "dec", "jan", "feb"],
    shoulderMonths: ["oct", "mar"],
  },
  "hvac-maintenance": {
    peakMonths: ["apr", "may", "sep", "oct"],
    shoulderMonths: ["mar", "jun", "nov"],
  },
  "system-replacement": {
    peakMonths: ["jun", "jul", "aug", "dec", "jan", "feb"],
    shoulderMonths: ["may", "sep", "oct", "mar"],
  },
};

function normalizeMonthToken(value: string): MonthKey | null {
  const normalized = value.trim().toLowerCase();
  return MONTH_ALIASES[normalized] ?? null;
}

export function normalizeMonthValues(values: string[] | null | undefined): MonthKey[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(normalizeMonthToken)
        .filter((value): value is MonthKey => value !== null)
    )
  );
}

export function getCurrentMonthKey(date = new Date()): MonthKey {
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "America/New_York",
  })
    .format(date)
    .toLowerCase();

  return normalizeMonthToken(month) ?? "jan";
}

export function getFamilySeasonalityWindow(
  familyKey: string
): FamilySeasonalityWindow {
  return FAMILY_SEASONALITY_WINDOWS[familyKey] ?? ALL_YEAR_WINDOW;
}

export function getReadableMonthLabel(month: MonthKey): string {
  const labels: Record<MonthKey, string> = {
    jan: "January",
    feb: "February",
    mar: "March",
    apr: "April",
    may: "May",
    jun: "June",
    jul: "July",
    aug: "August",
    sep: "September",
    oct: "October",
    nov: "November",
    dec: "December",
  };

  return labels[month];
}

export function getSeasonalityTiming(params: {
  familyKey: string;
  busyMonths?: string[] | null;
  slowMonths?: string[] | null;
  currentMonth?: MonthKey;
}): {
  currentMonth: MonthKey;
  timing: SeasonalityTiming;
  inFamilyPeakSeason: boolean;
  inFamilyShoulderSeason: boolean;
  inUserBusySeason: boolean;
  inUserSlowSeason: boolean;
  demandScoreAdjustment: number;
  scheduleFillScoreAdjustment: number;
  explanation: string;
} {
  const currentMonth = params.currentMonth ?? getCurrentMonthKey();
  const busyMonths = normalizeMonthValues(params.busyMonths ?? []);
  const slowMonths = normalizeMonthValues(params.slowMonths ?? []);
  const familyWindow = getFamilySeasonalityWindow(params.familyKey);

  const inFamilyPeakSeason = familyWindow.peakMonths.includes(currentMonth);
  const inFamilyShoulderSeason = familyWindow.shoulderMonths.includes(currentMonth);
  const inUserBusySeason = busyMonths.includes(currentMonth);
  const inUserSlowSeason = slowMonths.includes(currentMonth);

  // Business-defined seasonality is authoritative.
  if (inUserSlowSeason) {
    return {
      currentMonth,
      timing: "SLOW",
      inFamilyPeakSeason,
      inFamilyShoulderSeason,
      inUserBusySeason,
      inUserSlowSeason,
      demandScoreAdjustment: -8,
      scheduleFillScoreAdjustment: 18,
      explanation: inFamilyPeakSeason
        ? `The business marked ${getReadableMonthLabel(currentMonth)} as a slower month, so schedule-fill actions should take priority even though this service can still carry seasonal demand.`
        : `The business marked ${getReadableMonthLabel(currentMonth)} as a slower month, so schedule-fill and lower-friction booking actions should take priority right now.`,
    };
  }

  if (inUserBusySeason) {
    return {
      currentMonth,
      timing: "BUSY",
      inFamilyPeakSeason,
      inFamilyShoulderSeason,
      inUserBusySeason,
      inUserSlowSeason,
      demandScoreAdjustment: 6,
      scheduleFillScoreAdjustment: -18,
      explanation: inFamilyPeakSeason
        ? `The business marked ${getReadableMonthLabel(currentMonth)} as a busy month and this service is also seasonally strong, so urgent and higher-value demand capture should take priority.`
        : `The business marked ${getReadableMonthLabel(currentMonth)} as a busy month, so schedule-fill actions should fall back behind urgent and higher-value work.`,
    };
  }

  // Service-family seasonality only leads when the business has not explicitly set the month.
  if (inFamilyPeakSeason) {
    return {
      currentMonth,
      timing: "PEAK",
      inFamilyPeakSeason,
      inFamilyShoulderSeason,
      inUserBusySeason,
      inUserSlowSeason,
      demandScoreAdjustment: 10,
      scheduleFillScoreAdjustment: -10,
      explanation: `This service is in a strong seasonal demand window for ${getReadableMonthLabel(currentMonth)}.`,
    };
  }

  if (inFamilyShoulderSeason) {
    return {
      currentMonth,
      timing: "SHOULDER",
      inFamilyPeakSeason,
      inFamilyShoulderSeason,
      inUserBusySeason,
      inUserSlowSeason,
      demandScoreAdjustment: 4,
      scheduleFillScoreAdjustment: 6,
      explanation: `This service is entering or exiting a seasonal demand window in ${getReadableMonthLabel(currentMonth)}.`,
    };
  }

  return {
    currentMonth,
    timing: "NEUTRAL",
    inFamilyPeakSeason,
    inFamilyShoulderSeason,
    inUserBusySeason,
    inUserSlowSeason,
    demandScoreAdjustment: 0,
    scheduleFillScoreAdjustment: 0,
    explanation: `This service is not in a major seasonal window for ${getReadableMonthLabel(currentMonth)}.`,
  };
}