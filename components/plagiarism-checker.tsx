"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, FileText, AlertTriangle } from "lucide-react"
import FileUploader from "@/components/file-uploader"
import ResultsTable from "@/components/results-table"
import { useAuth } from "@/components/auth/auth-provider"
import { assignmentsAPI, coursesAPI, plagiarismAPI } from "@/lib/api"

export default function PlagiarismChecker() {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState("upload")
  const [files, setFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [submissionDate, setSubmissionDate] = useState(() => new Date().toISOString().split("T")[0])

  useEffect(() => {
    const loadCourses = async () => {
      if (!isAuthenticated) {
        setIsLoadingCourses(false)
        return
      }

      try {
        const coursesData = await coursesAPI.getCourses()
        setCourses(coursesData)
        if (coursesData.length > 0) {
          setSelectedCourseId((prev) => prev || coursesData[0].id.toString())
        }
      } catch (err) {
        console.error("Failed to load courses:", err)
        setError("Failed to load courses. Please try again later.")
      } finally {
        setIsLoadingCourses(false)
      }
    }

    loadCourses()
  }, [isAuthenticated])

  const handleFileUpload = (uploadedFiles: File[]) => {
    setFiles((prev) => [...prev, ...uploadedFiles])
  }

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please upload at least one file to check")
      return
    }

    if (!isAuthenticated) {
      setError("Please log in to upload assignments and run plagiarism checks.")
      return
    }

    if (!selectedCourseId) {
      setError("Please select a course")
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      const nextResults: any[] = []
      const errors: string[] = []

      for (const file of files) {
        try {
          const formDataToSend = new FormData()
          const title = file.name.replace(/\.[^/.]+$/, "")

          formDataToSend.append("file", file)
          formDataToSend.append("title", title)
          formDataToSend.append("description", "")
          formDataToSend.append("course", selectedCourseId)
          formDataToSend.append("student_name", studentName)
          formDataToSend.append("student_id", studentId)
          formDataToSend.append("submission_date", submissionDate)

          const assignment = await assignmentsAPI.uploadAssignment(formDataToSend)
          const result = await plagiarismAPI.checkPlagiarism(assignment.id, {
            compareWithCourse: true,
            compareWithAll: false,
          })

          nextResults.push({
            filename: file.name,
            size: file.size,
            plagiarismScore: Number((result.overall_score || 0).toFixed(1)),
            matches: (result.matches || []).map((match: any) => ({
              source: match.source_name,
              similarity: Number((match.similarity_score || 0).toFixed(1)),
              url: match.source_url || null,
            })),
          })
        } catch (err: any) {
          console.error("Failed to process file:", file.name, err)
          errors.push(`Failed to process ${file.name}.`)
        }
      }

      if (errors.length > 0) {
        setError(errors.join(" "))
      }

      if (nextResults.length > 0) {
        setResults(nextResults)
        setActiveTab("results")
      }
    } catch (err) {
      setError("An error occurred while processing your files. Please try again.")
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Plagiarism Checker</CardTitle>
        <CardDescription>Upload student assignments to check for plagiarism</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="results" disabled={results.length === 0}>
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isAuthenticated && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Required</AlertTitle>
                <AlertDescription>Please log in to upload assignments and run plagiarism checks.</AlertDescription>
              </Alert>
            )}

            {isAuthenticated && !isLoadingCourses && courses.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Courses Found</AlertTitle>
                <AlertDescription>Create a course in the backend before uploading assignments.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={setSelectedCourseId}
                    disabled={isLoadingCourses || !isAuthenticated}
                  >
                    <SelectTrigger id="course">
                      <SelectValue placeholder={isLoadingCourses ? "Loading courses..." : "Select a course"} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submission_date">Submission Date</Label>
                  <Input
                    id="submission_date"
                    type="date"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    disabled={!isAuthenticated}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student_name">Student Name (Optional)</Label>
                  <Input
                    id="student_name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Student full name"
                    disabled={!isAuthenticated}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID (Optional)</Label>
                  <Input
                    id="student_id"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Student ID"
                    disabled={!isAuthenticated}
                  />
                </div>
              </div>

              <FileUploader onFilesUploaded={handleFileUpload} acceptedFileTypes=".pdf,.doc,.docx,.txt" />

              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Uploaded Files ({files.length})</h3>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-slate-500 mr-2" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(index)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="results">
            {results.length > 0 ? (
              <ResultsTable results={results} />
            ) : (
              <div className="text-center py-8">
                <p>No results to display. Upload and check files first.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-slate-500">
          <Info className="h-4 w-4 mr-1" />
          <span>Files are processed securely and confidentially</span>
        </div>
        {activeTab === "upload" && (
          <Button onClick={handleSubmit} disabled={isProcessing || files.length === 0}>
            {isProcessing ? (
              <>
                <span className="mr-2">Processing</span>
                <Progress value={45} className="w-20 h-2" />
              </>
            ) : (
              <>Check for Plagiarism</>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
