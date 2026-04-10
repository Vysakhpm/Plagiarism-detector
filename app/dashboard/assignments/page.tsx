"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { assignmentsAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Upload } from "lucide-react"

type Assignment = {
  id: number
  title: string
  course_name: string
  student_name: string
  student_id: string
  submission_date: string | null
  plagiarism_results: { id: number; overall_score: number }[]
}

export default function AssignmentsPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAssignments = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await assignmentsAPI.getAssignments()
        setAssignments(data)
      } catch (err: any) {
        setError(err.message || "Failed to load assignments.")
      } finally {
        setIsLoading(false)
      }
    }

    loadAssignments()
  }, [])

  const getSeverity = (score: number) => {
    if (score < 20) return { label: "Low", color: "bg-green-100 text-green-800" }
    if (score < 50) return { label: "Medium", color: "bg-yellow-100 text-yellow-800" }
    return { label: "High", color: "bg-red-100 text-red-800" }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">Manage uploaded assignments.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/assignments/upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Assignment
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assignment List</CardTitle>
          <CardDescription>
            {user?.is_teacher ? "Assignments submitted to your courses." : "Assignments you uploaded."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-sm text-slate-500">No assignments found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Plagiarism</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const latestResult = assignment.plagiarism_results?.[0]
                  const score = latestResult?.overall_score ?? 0
                  const severity = latestResult ? getSeverity(score) : null

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>{assignment.course_name}</TableCell>
                      <TableCell>{assignment.student_name || assignment.student_id || "-"}</TableCell>
                      <TableCell>
                        {assignment.submission_date
                          ? new Date(assignment.submission_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {latestResult ? (
                          <Badge className={severity?.color}>{score.toFixed(1)}%</Badge>
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
