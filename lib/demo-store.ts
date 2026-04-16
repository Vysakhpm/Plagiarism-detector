export type DemoUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  institution: string
  department: string
  is_teacher: boolean
}

export type DemoCourse = {
  id: number
  name: string
  code: string
  description: string
  teacher_name: string
}

export type DemoAssignment = {
  id: number
  title: string
  course_id: number
  course_name: string
  student_name: string
  student_id: string
  submission_date: string | null
  created_at: string
  plagiarism_results: { id: number; overall_score: number; processed_at: string }[]
}

export type DemoResult = {
  id: number
  assignment: { id: number; title: string; student_name: string }
  overall_score: number
  processed_at: string
  matches: { id: number; source_name: string; similarity_score: number; source_url: string | null }[]
}

export type DemoStudent = {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  institution: string
  department: string
}

export type DemoState = {
  courses: DemoCourse[]
  assignments: DemoAssignment[]
  results: DemoResult[]
  students: DemoStudent[]
  counters: {
    course: number
    assignment: number
    result: number
    student: number
  }
}

const DEMO_STATE_KEY = "plagiarism_demo_state_v1"
const DEMO_USER_KEY = "plagiarism_demo_user_v1"

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined"

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const readJSON = <T>(key: string, fallback: T): T => {
  if (!canUseStorage()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const writeJSON = (key: string, value: unknown) => {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const today = () => new Date().toISOString().split("T")[0]
const nowIso = () => new Date().toISOString()

const seedDemoState = (): DemoState => {
  const createdAt = nowIso()

  const courses: DemoCourse[] = [
    {
      id: 1,
      name: "Data Ethics & Integrity",
      code: "CSE402",
      description: "Academic integrity, citation workflows, and ethical data use.",
      teacher_name: "Dr. Mira Patel",
    },
    {
      id: 2,
      name: "Research Methods",
      code: "ENG301",
      description: "Primary sources, synthesis writing, and research design.",
      teacher_name: "Dr. Mira Patel",
    },
  ]

  const students: DemoStudent[] = [
    {
      id: 1,
      email: "alina.shah@university.edu",
      username: "alina",
      first_name: "Alina",
      last_name: "Shah",
      institution: "Crescent University",
      department: "Computer Science",
    },
    {
      id: 2,
      email: "ben.das@university.edu",
      username: "ben",
      first_name: "Ben",
      last_name: "Das",
      institution: "Crescent University",
      department: "English",
    },
  ]

  const assignments: DemoAssignment[] = [
    {
      id: 1,
      title: "Climate Policy Review",
      course_id: 1,
      course_name: "CSE402 - Data Ethics & Integrity",
      student_name: "Alina Shah",
      student_id: "alina",
      submission_date: today(),
      created_at: createdAt,
      plagiarism_results: [
        {
          id: 1,
          overall_score: 12.4,
          processed_at: createdAt,
        },
      ],
    },
    {
      id: 2,
      title: "Digital Privacy Case Study",
      course_id: 2,
      course_name: "ENG301 - Research Methods",
      student_name: "Ben Das",
      student_id: "ben",
      submission_date: today(),
      created_at: createdAt,
      plagiarism_results: [
        {
          id: 2,
          overall_score: 38.7,
          processed_at: createdAt,
        },
      ],
    },
  ]

  const results: DemoResult[] = [
    {
      id: 1,
      assignment: { id: 1, title: "Climate Policy Review", student_name: "Alina Shah" },
      overall_score: 12.4,
      processed_at: createdAt,
      matches: [
        {
          id: 1,
          source_name: "Journal of Environmental Policy",
          similarity_score: 12.4,
          source_url: "https://example.com/environmental-policy",
        },
      ],
    },
    {
      id: 2,
      assignment: { id: 2, title: "Digital Privacy Case Study", student_name: "Ben Das" },
      overall_score: 38.7,
      processed_at: createdAt,
      matches: [
        {
          id: 2,
          source_name: "Privacy Law Review",
          similarity_score: 24.1,
          source_url: "https://example.com/privacy-law-review",
        },
        {
          id: 3,
          source_name: "Student Submission Archive",
          similarity_score: 14.6,
          source_url: null,
        },
      ],
    },
  ]

  return {
    courses,
    assignments,
    results,
    students,
    counters: {
      course: courses.length,
      assignment: assignments.length,
      result: results.length,
      student: students.length,
    },
  }
}

let memoryState: DemoState | null = null
let memoryUser: DemoUser | null = null

export const getDemoState = (): DemoState => {
  if (canUseStorage()) {
    const stored = readJSON<DemoState | null>(DEMO_STATE_KEY, null)
    if (stored) return stored
    const seeded = seedDemoState()
    writeJSON(DEMO_STATE_KEY, seeded)
    return seeded
  }

  if (!memoryState) {
    memoryState = seedDemoState()
  }

  return memoryState
}

export const setDemoState = (state: DemoState) => {
  if (canUseStorage()) {
    writeJSON(DEMO_STATE_KEY, state)
    return
  }
  memoryState = state
}

export const updateDemoState = (updater: (state: DemoState) => DemoState) => {
  const next = updater(clone(getDemoState()))
  setDemoState(next)
  return next
}

export const nextId = (state: DemoState, key: keyof DemoState["counters"]) => {
  const next = state.counters[key] + 1
  state.counters[key] = next
  return next
}

export const getDemoUser = (): DemoUser | null => {
  if (canUseStorage()) {
    return readJSON<DemoUser | null>(DEMO_USER_KEY, null)
  }
  return memoryUser
}

export const setDemoUser = (user: DemoUser) => {
  if (canUseStorage()) {
    writeJSON(DEMO_USER_KEY, user)
    return
  }
  memoryUser = user
}

export const clearDemoUser = () => {
  if (canUseStorage()) {
    window.localStorage.removeItem(DEMO_USER_KEY)
    return
  }
  memoryUser = null
}

export const buildDemoUser = (overrides: Partial<DemoUser> = {}): DemoUser => ({
  id: 1,
  username: "mira.patel",
  email: "mira.patel@plagiarismdetect.app",
  first_name: "Mira",
  last_name: "Patel",
  institution: "Crescent University",
  department: "Research Integrity",
  is_teacher: true,
  ...overrides,
})

export const getOrCreateDemoUser = (overrides: Partial<DemoUser> = {}) => {
  const existing = getDemoUser()
  if (existing) return existing
  const created = buildDemoUser(overrides)
  setDemoUser(created)
  return created
}
