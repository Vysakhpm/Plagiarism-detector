import { jwtDecode } from "jwt-decode"

// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
  try {
    const decoded: any = jwtDecode(token)
    return decoded.exp * 1000 < Date.now()
  } catch (error) {
    return true
  }
}

// Refresh the access token
const refreshAccessToken = async () => {
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

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
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
    clearTokens()
  },

  getCurrentUser: async () => {
    const response = await apiClient("/api/profile/")

    if (!response.ok) {
      throw new Error("Failed to fetch user profile")
    }

    return response.json()
  },

  updateCurrentUser: async (userData: any) => {
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
    const tokens = getTokens()
    return !!tokens && !isTokenExpired(tokens.access)
  },
}

// Courses API
export const coursesAPI = {
  getCourses: async () => {
    const response = await apiClient("/api/courses/")

    if (!response.ok) {
      throw new Error("Failed to fetch courses")
    }

    return response.json()
  },

  getCourse: async (id: number) => {
    const response = await apiClient(`/api/courses/${id}/`)

    if (!response.ok) {
      throw new Error("Failed to fetch course")
    }

    return response.json()
  },

  createCourse: async (courseData: any) => {
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
    const response = await apiClient("/api/assignments/")

    if (!response.ok) {
      throw new Error("Failed to fetch assignments")
    }

    return response.json()
  },

  getAssignment: async (id: number) => {
    const response = await apiClient(`/api/assignments/${id}/`)

    if (!response.ok) {
      throw new Error("Failed to fetch assignment")
    }

    return response.json()
  },

  uploadAssignment: async (assignmentData: FormData) => {
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
    const response = await apiClient("/api/results/")

    if (!response.ok) {
      throw new Error("Failed to fetch plagiarism results")
    }

    return response.json()
  },

  getResult: async (id: number) => {
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
    const response = await apiClient("/api/students/")

    if (!response.ok) {
      throw new Error("Failed to fetch students")
    }

    return response.json()
  },

  getStudent: async (id: number) => {
    const response = await apiClient(`/api/students/${id}/`)

    if (!response.ok) {
      throw new Error("Failed to fetch student")
    }

    return response.json()
  },

  createStudent: async (studentData: any) => {
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
    const response = await apiClient(`/api/students/${id}/`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete student")
    }

    return true
  },

  importStudentsCSV: async (file: File) => {
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
