import type { ExerciseTemplate, TemplateId } from "./types";

export type ProgramDay = {
  title: string;
  exercises: ExerciseTemplate[];
};

export type WorkoutTemplate = {
  id: TemplateId;
  short: string;
  title: string;
  exercises: ExerciseTemplate[];
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const s = (
  id: string,
  name: string,
  target: string,
  sets: number,
  bodyweight = false,
): ExerciseTemplate => ({ id, name, target, kind: "strength", sets, bodyweight });

const kb = (id: string, name: string, target: string, sets: number): ExerciseTemplate => ({
  id,
  name,
  target,
  kind: "kettlebell",
  sets,
});

const run = (id: string, name: string, target: string): ExerciseTemplate => ({
  id,
  name,
  target,
  kind: "run",
  sets: 0,
});

const mob = (id: string, name: string, target: string): ExerciseTemplate => ({
  id,
  name,
  target,
  kind: "mobility",
  sets: 0,
});

export const PROGRAM: ProgramDay[] = [
  {
    title: "Gym 1: Lower & Arms + Easy Run",
    exercises: [
      s("squat", "Barbell Back Squat or Hack Squat", "4 sets × 6–10 reps", 4),
      s("rdl", "Romanian Deadlift (RDL)", "3 sets × 8–10 reps, 3s eccentric", 3),
      s("lunge", "Walking Lunges / Split Squats", "3 sets × 10–12 reps/leg", 3),
      s("calf", "Standing / Seated Calf Raises", "4 sets × 12–15 reps, 2s pause", 4),
      s("curl", "Barbell / EZ-Bar Curl", "3 sets × 8–12 reps", 3),
      s("tri-ext", "Cable / Overhead Triceps Extension", "3 sets × 10–12 reps", 3),
      run("easy-run", "Easy Run", "25–30 min conversational pace"),
      mob("mob-lower", "Lower-Body & Shoulder Mobility", "10 min"),
    ],
  },
  {
    title: "Pull-Ups, Kettlebells & Mobility",
    exercises: [
      s("pull-sub", "Pull-Ups (Sub-maximal)", "6 sets × 3–4 reps, 90–120s rest", 6, true),
      s("dips-tue", "Dips (Roman Chair)", "4 sets × 6–9 reps", 4, true),
      kb("kb-squat", "Kettlebell Goblet / Front-Racked Squat", "3 sets × 12–15 reps, 12–15 kg", 3),
      kb("kb-row", "Kettlebell Row", "3 sets × 10–12 reps/arm, 13.5–15 kg", 3),
      kb("kb-hammer", "Kettlebell Hammer Curl", "3 sets × 12–15 reps, 6–10.5 kg", 3),
      kb("kb-oh-tri", "Kettlebell Overhead Triceps Press", "3 sets × 12–15 reps, 6–10.5 kg", 3),
      mob("mob-tue", "Mobility Stretching (Couch, Wall Ankle, Pec, Lat Hang)", "12 min"),
    ],
  },
  {
    title: "Track Speed Intervals + Core & Stretch",
    exercises: [
      run("wu-wed", "Easy Warm-Up + Strides", "10 min"),
      run("intervals", "Track Intervals: 8 × 400m", "5km pace or faster, 90s rest"),
      run("cd-wed", "Easy Cool-Down", "8 min"),
      s("hlr", "Hanging Leg Raises (Roman Chair)", "3 sets × 8–12 reps", 3, true),
      mob("stretch-wed", "Dead Bugs & Hamstring/Calf Stretch", "15 min"),
    ],
  },
  {
    title: "Gym 2: Upper Heavy & Arms",
    exercises: [
      s("bench", "Barbell Bench Press or Incline Press", "4 sets × 6–10 reps", 4),
      s("row", "Chest-Supported Row or Heavy Barbell/Cable Row", "4 sets × 8–10 reps", 4),
      s("ohp", "Overhead Press (Barbell or Dumbbell)", "3 sets × 6–10 reps", 3),
      s("pulldown", "Lat Pulldown or Assisted/Weighted Pull-Ups", "3 sets × 8–12 reps", 3),
      s("inc-curl", "Incline Dumbbell Curl", "3 sets × 10–12 reps", 3),
      s("skull", "Skullcrushers or Rope Pushdowns", "3 sets × 10–12 reps", 3),
      mob("mob-upper", "Upper Body & Thoracic Stretching", "10 min"),
    ],
  },
  {
    title: "KB Conditioning, Push-Ups & Aerobic Run",
    exercises: [
      kb("swings", "Kettlebell Swings", "5 sets × 15–20 reps, 12–15 kg", 5),
      s("pushups", "Push-Ups", "4 sets × 15–20 reps, 2–3 RIR", 4, true),
      kb("kb-bss", "Kettlebell Bulgarian Split Squat", "3 sets × 8–10 reps/leg, 7.5–12 kg", 3),
      kb("kb-lat", "Kettlebell Lateral Raise", "3 sets × 12–15 reps, 3–6 kg", 3),
      run("aero", "Easy Aerobic Run", "30–35 min"),
      mob("stretch-fri", "Full-Body Stretch", "10 min"),
    ],
  },
  {
    title: "Tempo Run + Roman Chair Finisher",
    exercises: [
      run("wu-sat", "Easy Warm-Up", "10 min"),
      run("tempo", "Tempo / Threshold Run", "15–20 min at comfortably hard effort"),
      run("cd-sat", "Easy Cool-Down", "8 min"),
      s("pull-sat", "Pull-Ups (Dead Hang to Chin Over Bar)", "5 sets × 3–5 reps", 5, true),
      s("dips-sat", "Dips (Roman Chair)", "3 sets × 8–10 reps", 3, true),
      kb("kb-super", "KB Curls & Triceps Kickbacks Superset", "3 sets × 12 reps, 4.5–9 kg", 3),
      mob("stretch-sat", "Hip, Glute & Calf Stretch", "12 min"),
    ],
  },
  {
    title: "Active Recovery & Optional GTG",
    exercises: [
      mob("recovery", "Brisk Walk / Light Cycling & Deep Mobility Flow", "20–25 min"),
      s("gtg", "Optional Grease-the-Groove Pull-Ups / Push-Ups", "2–3 easy sets if fresh", 3, true),
    ],
  },
];

/** Original weekday slot (Mon=0) before templates could move. */
export const LEGACY_WEEKDAY_TEMPLATE: TemplateId[] = ["A", "C", "D", "B", "E", "F", "G"];

const TEMPLATE_SOURCES: { id: TemplateId; short: string; source: number }[] = [
  { id: "A", short: "Gym 1", source: 0 },
  { id: "B", short: "Gym 2", source: 3 },
  { id: "C", short: "Pulls", source: 1 },
  { id: "D", short: "Track", source: 2 },
  { id: "E", short: "KB", source: 4 },
  { id: "F", short: "Tempo", source: 5 },
  { id: "G", short: "Rest", source: 6 },
];

export const TEMPLATES: WorkoutTemplate[] = TEMPLATE_SOURCES.map((meta) => ({
  id: meta.id,
  short: meta.short,
  title: PROGRAM[meta.source].title,
  exercises: PROGRAM[meta.source].exercises,
}));

/** Mon Pulls, Tue Gym 1, Wed Track, Thu KB, Fri Gym 2, Sat Tempo, Sun Rest. */
export const DEFAULT_LAYOUT: TemplateId[] = ["C", "A", "D", "E", "B", "F", "G"];

export function isTemplateId(value: string): value is TemplateId {
  return TEMPLATES.some((t) => t.id === value);
}

export function templateById(id: TemplateId): WorkoutTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function exercisesForTemplate(id: TemplateId, custom: ExerciseTemplate[]): ExerciseTemplate[] {
  return [...templateById(id).exercises, ...custom];
}
