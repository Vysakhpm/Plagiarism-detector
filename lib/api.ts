import { jwtDecode } from "jwt-decode"
import {
  buildDemoUser,
  clearDemoUser,
  getDemoState,
  getDemoUser,
  nextId,
  setDemoUser,
  updateDemoState,
} from "@/lib/demo-store"

// API configuration
const getDefaultApiUrl = () => {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:8000`
  }
  return "http://localhost:8000"
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim() || getDefaultApiUrl()
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

// Token management
const getTokens = () => {
  if (typeof window === "undefined") return null

  const tokens = localStorage.getItem("auth_tokens")
  return tokens ? JSON.parse(tokens) : null
}

const setTokens = (tokens: { access: string; refresh: string }) => {
  localStorage.setItem("auth_tokens", JSON.stringify(tokens))
}

const clearTokens = () => {
  localStorage.removeItem("auth_tokens")
}

// Check if token is expired
const isTokenExpired = (token: string) => {
  if (DEMO_MODE) return false
  try {
    const decoded: any = jwtDecode(token)
    return decoded.exp * 1000 < Date.now()
  } catch (error) {
    return true
  }
}

// Refresh the access token
const refreshAccessToken = async () => {
  if (DEMO_MODE) {
    throw new Error("Token refresh is disabled in demo mode")
  }
  const tokens = getTokens()
  if (!tokens) throw new Error("No refresh token available")

  try {
    const response = await fetch(`${API_URL}/auth/jwt/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: tokens.refresh }),
    })

    if (!response.ok) throw new Error("Failed to refresh token")

    const data = await response.json()
    setTokens({ ...tokens, access: data.access })
    return data.access
  } catch (error) {
    clearTokens()
    throw error
  }
}

// API client with authentication
const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  if (DEMO_MODE) {
    throw new Error("API client is disabled in demo mode")
  }
  let tokens = getTokens()

  // If we have tokens and the access token is expired, try to refresh it
  if (tokens && isTokenExpired(tokens.access)) {
    try {
      const newAccessToken = await refreshAccessToken()
      tokens = { ...tokens, access: newAccessToken }
    } catch (error) {
      // If refresh fails, clear tokens and continue without authentication
      tokens = null
    }
  }

  // Prepare headers
  const headers = new Headers(options.headers)

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (tokens) {
    headers.set("Authorization", `Bearer ${tokens.access}`)
  }

  // Make the request
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized
  if (response.status === 401) {
    clearTokens()
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  return response
}

const createDemoUserFromLogin = (email: string) => {
  const safeEmail = (email || "").trim() || "demo@plagiarismdetect.app"
  const username = safeEmail.split("@")[0] || "demo"
  const displayName = username
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
  const [firstName, ...rest] = displayName.split(" ")
  const lastName = rest.join(" ").trim()

  return buildDemoUser({
    email: safeEmail,
    username,
    first_name: firstName || "Demo",
    last_name: lastName || "User",
    is_teacher: true,
  })
}

const getDemoCourseName = (courseId: number, fallback = "General Studies") => {
  const state = getDemoState()
  const course = state.courses.find((item) => item.id === courseId)
  if (!course) return fallback
  return `${course.code} - ${course.name}`
}

const randomScore = (min = 8, max = 78) => {
  const value = Math.random() * (max - min) + min
  return Math.round(value * 10) / 10
}

const buildMatches = (overallScore: number) => {
  const sources = [
    { name: "Open Knowledge Library", url: "https://example.com/knowledge-library" },
    { name: "Student Submission Archive", url: null },
    { name: "Academic Journal Index", url: "https://example.com/journal-index" },
    { name: "Institutional Repository", url: "https://example.com/repository" },
  ]

  const matchCount = overallScore > 55 ? 3 : overallScore > 30 ? 2 : 1
  return sources.slice(0, matchCount).map((source, index) => ({
    id: index + 1,
    source_name: source.name,
    source_url: source.url,
    similarity_score: Math.max(3, Math.round((overallScore / matchCount) * 10) / 10),
  }))
}

const readFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
    if (DEMO_MODE) {
      const user = createDemoUserFromLogin(email)
      setDemoUser(user)
      return { access: "demo", refresh: "demo" }
    }
    const response = await fetch(`${API_URL}/auth/jwt/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Login failed")
    }

    const tokens = await response.json()
    setTokens(tokens)
    return tokens
  },

  register: async (userData: any) => {
    if (DEMO_MODE) {
      const user = buildDemoUser({
        email: userData?.email || "demo@plagiarismdetect.app",
        username: userData?.username || "demo",
        first_name: userData?.first_name || "Demo",
        last_name: userData?.last_name || "User",
        institution: userData?.institution || "Crescent University",
        department: userData?.department || "Research Integrity",
        is_teacher: !!userData?.is_teacher,
      })
      setDemoUser(user)
      return user
    }
    const response = await fetch(`${API_URL}/auth/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(Object.values(error).flat().join(", "))
    }

    return response.json()
  },

  logout: () => {
    if (DEMO_MODE) {
      clearDemoUser()
      return
    }
    clearTokens()
  },

  getCurrentUser: async () => {
    if (DEMO_MODE) {
      const user = getDemoUser()
      if (!user) throw new Error("No demo user")
      return user
    }
    const response = await apiClient("/api/profile/")

    if (!response.ok) {
      throw new Error("Failed to fetch user profile")
    }

    return response.json()
  },

  updateCurrentUser: async (userData: any) => {
    if (DEMO_MODE) {
      const current = getDemoUser()
      if (!current) throw new Error("No demo user")
      const updated = { ...current, ...userData }
      setDemoUser(updated)
      return updated
    }
    const response = await apiClient("/api/profile/", {
      method: "PATCH",
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(Object.values(error).flat().join(", "))
    }

    return response.json()
  },

  isAuthenticated: () => {
    if (DEMO_MODE) {
      return !!getDemoUser()
    }
    const tokens = getTokens()
    return !!tokens && !isTokenExpired(tokens.access)
  },
}

// Courses API
export const coursesAPI = {
  getCourses: async () => {
    if (DEMO_MODE) {
      const state = getDemoState()
      return state.courses
    }
    const response = await apiClient("/api/courses/")

    if (!response.ok) {
      throw new Error("Failed to fetch courses")
    }

    return response.json()
  },

  getCourse: async (id: number) => {
    if (DEMO_MODE) {
      const state = getDemoState()
      const course = state.courses.find((item) => item.id === id)
      if (!course) throw new Error("Course not found")
      return course
    }
    const response = await apiClient(`/api/courses/${id}/`)

    if (!response.ok) {
      throw new Error("Failed to fetch course")
    }

    return response.json()
  },

  createCourse: async (courseData: any) => {
    if (DEMO_MODE) {
      let createdCourse: any = null
      updateDemoState((state) => {
        const id = nextId(state, "course")
        createdCourse = {
          id,
          name: courseData?.name || "Untitled Course",
          code: courseData?.code || `COURSE-${id}`,
          description: courseData?.description || "",
          teacher_name: "Dr. Mira Patel",
        }
        state.courses = [createdCourse, ...state.courses]
        return state
      })
      return createdCourse
    }
    const response = await apiClient("/api/courses/", {
      method: "POST",
      body: JSON.stringify(courseData),
    })

    if (!response.ok) {
      const error = await response.json()
      const message =
        typeof error === "string" ? error : Object.values(error).flat().join(", ") || "Failed to create course"
      const err = new Error(message) as Error & { fields?: any }
      err.fields = error
      throw err
    }

    return response.json()
  },

  updateCourse: async (id: number, courseData: any) => {
    if (DEMO_MODE) {
      let updatedCourse: any = null
      updateDemoState((state) => {
        const index = state.courses.findIndex((item) => item.id === id)
        if (index === -1) throw new Error("Course not found")
        updatedCourse = {
          ...state.courses[index],
          ...courseData,
        }
        state.courses[index] = updatedCourse
        return state
      })
      return updatedCourse
    }
    const response = await apiClient(`/api/courses/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(courseData),
    })

    if (!response.ok) {
      const error = await response.json()
      const message =
        typeof error === "string" ? error : Object.values(error).flat().join(", ") || "Failed to update course"
      const err = new Error(message) as Error & { fields?: any }
      err.fields = error
      throw err
    }

    return response.json()
  },

  deleteCourse: async (id: number) => {
    if (DEMO_MODE) {
      updateDemoState((state) => {
        state.courses = state.courses.filter((course) => course.id !== id)
        return state
      })
      return true
    }
    const response = await apiClient(`/api/courses/${id}/`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete course")
    }

    return true
  },
}

// Assignments API
export const assignmentsAPI = {
  getAssignments: async () => {
    if (DEMO_MODE) {
      const state = getDemoState()
      return state.assignments
    }
    const response = await apiClient("/api/assignments/")

    if (!response.ok) {
      throw new Error("Failed to fetch assignments")
    }

    return response.json()
  },

  getAssignment: async (id: number) => {
    if (DEMO_MODE) {
      const state = getDemoState()
      const assignment = state.assignments.find((item) => item.id === id)
      if (!assignment) throw new Error("Assignment not found")
      return assignment
    }
    const response = await apiClient(`/api/assignments/${id}/`)

    if (!response.ok) {
      throw new Error("Failed to fetch assignment")
    }

    return response.json()
  },

  uploadAssignment: async (assignmentData: FormData) => {
    if (DEMO_MODE) {
      let createdAssignment: any = null
      updateDemoState((state) => {
        const id = nextId(state, "assignment")
        const title = readFormValue(assignmentData, "title") || "Untitled Assignment"
        const courseId = Number(readFormValue(assignmentData, "course")) || 0
        const file = assignmentData.get("file") as File | null
        const createdAt = new Date().toISOString()

        createdAssignment = {
          id,
          title,
          course_id: courseId,
          course_name: getDemoCourseName(courseId),
          student_name: readFormValue(assignmentData, "student_name"),
          student_id: readFormValue(assignmentData, "student_id"),
          submission_date: readFormValue(assignmentData, "submission_date") || null,
          created_at: createdAt,
          plagiarism_results: [],
          file_name: file?.name || "",
          file_type: file?.type || "",
          file_size: file?.size || 0,
        }

        state.assignments = [createdAssignment, ...state.assignments]
        return state
      })
      return createdAssignment
    }
    const response = await apiClient("/api/assignments/", {
      method: "POST",
      body: assignmentData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(Object.values(error).flat().join(", "))
    }

    return response.json()
  },

  deleteAssignment: async (id: number) => {
    if (DEMO_MODE) {
      updateDemoState((state) => {
        state.assignments = state.assignments.filter((assignment) => assignment.id !== id)
        state.results = state.results.filter((result) => result.assignment.id !== id)
        return state
      })
      return true
    }
    const response = await apiClient(`/api/assignments/${id}/`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete assignment")
    }

    return true
  },
}

// Plagiarism API
export const plagiarismAPI = {
  checkPlagiarism: async (assignmentId: number, options = { compareWithCourse: true, compareWithAll: false }) => {
    if (DEMO_MODE) {
      let createdResult: any = null
      updateDemoState((state) => {
        const assignment = state.assignments.find((item) => item.id === assignmentId)
        if (!assignment) throw new Error("Assignment not found")

        const overallScore = randomScore()
        const matches = buildMatches(overallScore)
        const processedAt = new Date().toISOString()
        const resultId = nextId(state, "result")

        createdResult = {
          id: resultId,
          assignment: {
            id: assignment.id,
            title: assignment.title,
            student_name: assignment.student_name,
          },
          overall_score: overallScore,
          processed_at: processedAt,
          matches,
        }

        assignment.plagiarism_results = [
          { id: resultId, overall_score: overallScore, processed_at: processedAt },
          ...(assignment.plagiarism_results || []),
        ]

        state.results = [createdResult, ...state.results]
        return state
      })
      return createdResult
    }
    const response = await apiClient("/api/check-plagiarism/", {
      method: "POST",
      body: JSON.stringify({
        assignment_id: assignmentId,
        compare_with_course: options.compareWithCourse,
        compare_with_all: options.compareWithAll,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to check plagiarism")
    }

    return response.json()
  },

  getResults: async () => {
    if (DEMO_MODE) {
      const state = getDemoState()
      return state.results
    }
    const response = await apiClient("/api/results/")

    if (!response.ok) {
      throw new Error("Failed to fetch plagiarism results")
    }

    return response.json()
  },

  getResult: async (id: number) => {
    if (DEMO_MODE) {
      const state = getDemoState()
      const result = state.results.find((item) => item.id === id)
      if (!result) throw new Error("Result not found")
      return result
    }
    const response = await apiClient(`/api/results/${id}/`)

    if (!response.ok) {
      throw new Error("Failed to fetch plagiarism result")
    }

    return response.json()
  },
}

// Students API (teacher-only)
export const studentsAPI = {
  getStudents: async () => {
    if (DEMO_MODE) {
      const state = getDemoState()
      return state.students
    }
    const response = await apiClient("/api/students/")

    if (!response.ok) {
      throw new Error("Failed to fetch students")
    }

    return response.json()
  },

  getStudent: async (id: number) => {
    if (DEMO_MODE) {
      const state = getDemoState()
      const student = state.students.find((item) => item.id === id)
      if (!student) throw new Error("Student not found")

      const studentAssignments = state.assignments.filter((assignment) => {
        if (assignment.student_id && assignment.student_id === student.username) return true
        const fullName = `${student.first_name} ${student.last_name}`.trim()
        return fullName && assignment.student_name === fullName
      })

      return {
        ...student,
        assignments: studentAssignments,
      }
    }
    const response = await apiClient(`/api/students/${id}/`)

    if (!response.ok) {
      throw new Error("Failed to fetch student")
    }

    return response.json()
  },

  createStudent: async (studentData: any) => {
    if (DEMO_MODE) {
      let createdStudent: any = null
      updateDemoState((state) => {
        const id = nextId(state, "student")
        createdStudent = {
          id,
          email: studentData?.email || `student${id}@demo.edu`,
          username: studentData?.username || `student${id}`,
          first_name: studentData?.first_name || "",
          last_name: studentData?.last_name || "",
          institution: studentData?.institution || "",
          department: studentData?.department || "",
        }
        state.students = [createdStudent, ...state.students]
        return state
      })
      return createdStudent
    }
    const response = await apiClient("/api/students/", {
      method: "POST",
      body: JSON.stringify(studentData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(Object.values(error).flat().join(", "))
    }

    return response.json()
  },

  updateStudent: async (id: number, studentData: any) => {
    if (DEMO_MODE) {
      let updatedStudent: any = null
      updateDemoState((state) => {
        const index = state.students.findIndex((item) => item.id === id)
        if (index === -1) throw new Error("Student not found")
        updatedStudent = {
          ...state.students[index],
          ...studentData,
        }
        state.students[index] = updatedStudent
        return state
      })
      return updatedStudent
    }
    const response = await apiClient(`/api/students/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(studentData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(Object.values(error).flat().join(", "))
    }

    return response.json()
  },

  deleteStudent: async (id: number) => {
    if (DEMO_MODE) {
      updateDemoState((state) => {
        state.students = state.students.filter((student) => student.id !== id)
        return state
      })
      return true
    }
    const response = await apiClient(`/api/students/${id}/`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete student")
    }

    return true
  },

  importStudentsCSV: async (file: File) => {
    if (DEMO_MODE) {
      const text = await file.text()
      const rows = text.trim().split(/\r?\n/).filter(Boolean)
      if (rows.length <= 1) {
        return { created: [], errors: [{ row: 1, error: "No student rows found." }] }
      }

      const headers = rows[0].split(",").map((header) => header.trim().toLowerCase())
      const created: any[] = []
      const errors: any[] = []

      updateDemoState((state) => {
        rows.slice(1).forEach((row, index) => {
          const columns = row.split(",").map((value) => value.trim())
          const data: Record<string, string> = {}
          headers.forEach((header, colIndex) => {
            data[header] = columns[colIndex] || ""
          })

          if (!data.email || !data.username) {
            errors.push({ row: index + 2, error: "Missing email or username." })
            return
          }

          const id = nextId(state, "student")
          const password = data.password || `Temp-${Math.random().toString(36).slice(2, 8)}`

          const student = {
            id,
            email: data.email,
            username: data.username,
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            institution: data.institution || "",
            department: data.department || "",
          }

          state.students = [student, ...state.students]
          created.push({ ...student, password })
        })

        return state
      })

      return { created, errors }
    }
    const formData = new FormData()
    formData.append("file", file)

    const response = await apiClient("/api/students/import_csv/", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to import students")
    }

    return response.json()
  },
}
