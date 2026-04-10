"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { studentsAPI } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

type Assignment = {
  id: number
  title: string
  course_name: string
  student_name: string
  student_id: string
  submission_date: string | null
  created_at: string
  plagiarism_results: { id: number; overall_score: number; processed_at: string }[]
}

type StudentDetail = {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  institution: string
  department: string
  assignments: Assignment[]
}

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = Number(params?.id)
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return

    const loadStudent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await studentsAPI.getStudent(studentId)
        setStudent(data)
      } catch (err: any) {
        setError(err.message || "Failed to load student.")
      } finally {
        setIsLoading(false)
      }
    }

    loadStudent()
  }, [studentId])

  const displayName = useMemo(() => {
    if (!student) return ""
    return student.first_name || student.last_name
      ? `${student.first_name} ${student.last_name}`.trim()
      : student.username
  }, [student])

  const getSeverity = (score: number) => {
    if (score < 20) return { label: "Low", color: "bg-green-100 text-green-800" }
    if (score < 50) return { label: "Medium", color: "bg-yellow-100 text-yellow-800" }
    return { label: "High", color: "bg-red-100 text-red-800" }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Details</h1>
        <p className="text-muted-foreground">Assignments and plagiarism history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "Loading..." : displayName}</CardTitle>
          <CardDescription>{student?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Username: {student?.username}</div>
          <div>Institution: {student?.institution || "-"}</div>
          <div>Department: {student?.department || "-"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Latest submissions for this student.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading assignments...</div>
          ) : !student || student.assignments.length === 0 ? (
            <div className="text-sm text-slate-500">No assignments found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Plagiarism</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.assignments.map((assignment) => {
                  const latestResult = assignment.plagiarism_results?.[0]
                  const score = latestResult?.overall_score ?? 0
                  const severity = getSeverity(score)

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>{assignment.course_name}</TableCell>
                      <TableCell>
                        {assignment.submission_date
                          ? new Date(assignment.submission_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {latestResult ? (
                          <Badge className={severity.color}>{score.toFixed(1)}%</Badge>
                        ) : (
                          <span className="text-sm text-slate-500">Not checked</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
