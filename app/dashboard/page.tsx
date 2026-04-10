"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, BookOpen, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { assignmentsAPI, coursesAPI, plagiarismAPI, studentsAPI } from "@/lib/api"

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    assignments: 0,
    courses: 0,
    recentResults: [],
    recentStudents: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [assignments, courses, results, students] = await Promise.all([
          assignmentsAPI.getAssignments(),
          coursesAPI.getCourses(),
          plagiarismAPI.getResults(),
          user?.is_teacher ? studentsAPI.getStudents() : Promise.resolve([]),
        ])

        setStats({
          assignments: assignments.length,
          courses: courses.length,
          recentResults: results.slice(0, 5),
          recentStudents: students.slice(0, 5),
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load dashboard data",
        }))
      }
    }

    fetchDashboardData()
  }, [user?.is_teacher])

  const getPlagiarismSeverity = (score: number) => {
    if (score < 20) return { label: "Low", color: "text-green-600", icon: CheckCircle }
    if (score < 50) return { label: "Medium", color: "text-yellow-600", icon: AlertTriangle }
    return { label: "High", color: "text-red-600", icon: AlertTriangle }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Overview</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-display font-semibold tracking-tight">
          Welcome back, {user?.first_name || user?.username}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track submissions, review similarity scores, and manage courses from a single workspace.
        </p>
      </div>

      {stats.error && <div className="bg-red-50 p-4 rounded-lg text-red-600">{stats.error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.isLoading ? "..." : stats.assignments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.is_teacher ? "Submitted by students" : "Uploaded by you"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.isLoading ? "..." : stats.courses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.is_teacher ? "Created by you" : "Enrolled courses"}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-between">
              <Link href="/dashboard/assignments/upload">
                Upload New Assignment <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            {user?.is_teacher && (
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/dashboard/courses/create">
                  Create New Course <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Plagiarism Results</h2>
        {stats.isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 mx-auto"></div>
            <p className="mt-2 text-sm text-slate-600">Loading results...</p>
          </div>
        ) : stats.recentResults.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No plagiarism results found.</p>
              <p className="text-sm mt-1">Upload assignments and check for plagiarism to see results here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {stats.recentResults.map((result: any) => {
              const severity = getPlagiarismSeverity(result.overall_score)
              const SeverityIcon = severity.icon

              return (
                <Card key={result.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full bg-slate-100 ${severity.color}`}>
                          <SeverityIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{result.assignment.title}</h3>
                          <p className="text-sm text-slate-500">
                            {result.assignment.student_name || "Unknown student"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${severity.color}`}>{result.overall_score.toFixed(1)}%</div>
                        <p className="text-xs text-slate-500">{new Date(result.processed_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/results/${result.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {user?.is_teacher && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Students</h2>
          {stats.isLoading ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-2 text-sm text-slate-600">Loading students...</p>
            </div>
          ) : stats.recentStudents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No students found.</p>
                <p className="text-sm mt-1">Add students to manage their assignments.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {stats.recentStudents.map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {student.first_name || student.last_name
                            ? `${student.first_name} ${student.last_name}`.trim()
                            : student.username}
                        </p>
                        <p className="text-sm text-slate-500">{student.email}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/students/${student.id}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
