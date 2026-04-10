"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { coursesAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Pencil, Trash2 } from "lucide-react"

type Course = {
  id: number
  name: string
  code: string
  description: string
  teacher_name: string
}

const emptyForm = {
  name: "",
  code: "",
  description: "",
}

export default function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({ ...emptyForm })
  const [isCreating, setIsCreating] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string[]>>({})

  const extractFieldErrors = (payload: any) => {
    const result: Record<string, string[]> = {}
    if (!payload || typeof payload !== "object") return result

    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = value.map(String)
      } else if (typeof value === "string") {
        result[key] = [value]
      } else if (value && typeof value === "object") {
        result[key] = Object.values(value).flat().map(String)
      }
    })

    return result
  }

  const loadCourses = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await coursesAPI.getCourses()
      setCourses(data)
    } catch (err: any) {
      setError(err.message || "Failed to load courses.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    if (!editingCourse) {
      setEditForm({ ...emptyForm })
      setEditFieldErrors({})
      return
    }

    setEditForm({
      name: editingCourse.name || "",
      code: editingCourse.code || "",
      description: editingCourse.description || "",
    })
  }, [editingCourse])

  const handleCreateChange = (field: string, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsCreating(true)

    try {
      const created = await coursesAPI.createCourse(createForm)
      setCourses((prev) => [created, ...prev])
      setCreateForm({ ...emptyForm })
    } catch (err: any) {
      const fields = extractFieldErrors(err?.fields)
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        if (fields.non_field_errors?.length) {
          setError(fields.non_field_errors.join(" "))
        } else if (fields.detail?.length) {
          setError(fields.detail.join(" "))
        }
      } else {
        setError(err.message || "Failed to create course.")
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveCourse = async () => {
    if (!editingCourse) return
    setError(null)
    setEditFieldErrors({})
    setIsSaving(true)

    try {
      const updated = await coursesAPI.updateCourse(editingCourse.id, editForm)
      setCourses((prev) => prev.map((course) => (course.id === updated.id ? updated : course)))
      setEditingCourse(null)
    } catch (err: any) {
      const fields = extractFieldErrors(err?.fields)
      if (Object.keys(fields).length > 0) {
        setEditFieldErrors(fields)
        if (fields.non_field_errors?.length) {
          setError(fields.non_field_errors.join(" "))
        } else if (fields.detail?.length) {
          setError(fields.detail.join(" "))
        }
      } else {
        setError(err.message || "Failed to update course.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!editingCourse) return
    setError(null)
    setIsDeleting(true)

    try {
      await coursesAPI.deleteCourse(editingCourse.id)
      setCourses((prev) => prev.filter((course) => course.id !== editingCourse.id))
      setEditingCourse(null)
    } catch (err: any) {
      setError(err.message || "Failed to delete course.")
    } finally {
      setIsDeleting(false)
    }
  }

  const isTeacher = user?.is_teacher

  const courseCountLabel = useMemo(() => {
    if (isLoading) return "Loading..."
    return `${courses.length} course${courses.length === 1 ? "" : "s"}`
  }, [courses.length, isLoading])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <p className="text-muted-foreground">{courseCountLabel}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle>Create Course</CardTitle>
            <CardDescription>Add a new course for assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  required
                  value={createForm.name}
                  onChange={(e) => handleCreateChange("name", e.target.value)}
                  className={fieldErrors.name ? "border-red-300 focus-visible:ring-red-300" : undefined}
                />
                {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  required
                  value={createForm.code}
                  onChange={(e) => handleCreateChange("code", e.target.value)}
                  className={fieldErrors.code ? "border-red-300 focus-visible:ring-red-300" : undefined}
                />
                {fieldErrors.code && <p className="text-xs text-red-600">{fieldErrors.code[0]}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                rows={3}
                value={createForm.description}
                onChange={(e) => handleCreateChange("description", e.target.value)}
                className={fieldErrors.description ? "border-red-300 focus-visible:ring-red-300" : undefined}
              />
              {fieldErrors.description && <p className="text-xs text-red-600">{fieldErrors.description[0]}</p>}
            </div>

              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Course"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Course List</CardTitle>
          <CardDescription>All available courses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="text-sm text-slate-500">No courses found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Description</TableHead>
                  {isTeacher && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell>{course.code}</TableCell>
                    <TableCell>{course.teacher_name || "-"}</TableCell>
                    <TableCell className="max-w-md">
                      <span className="line-clamp-2 text-sm text-slate-600">{course.description || "-"}</span>
                    </TableCell>
                    {isTeacher && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditingCourse(course)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>

          {editingCourse && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Course Name</Label>
                  <Input
                    id="edit_name"
                    value={editForm.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                    className={editFieldErrors.name ? "border-red-300 focus-visible:ring-red-300" : undefined}
                  />
                  {editFieldErrors.name && <p className="text-xs text-red-600">{editFieldErrors.name[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_code">Course Code</Label>
                  <Input
                    id="edit_code"
                    value={editForm.code}
                    onChange={(e) => handleEditChange("code", e.target.value)}
                    className={editFieldErrors.code ? "border-red-300 focus-visible:ring-red-300" : undefined}
                  />
                  {editFieldErrors.code && <p className="text-xs text-red-600">{editFieldErrors.code[0]}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => handleEditChange("description", e.target.value)}
                  className={editFieldErrors.description ? "border-red-300 focus-visible:ring-red-300" : undefined}
                />
                {editFieldErrors.description && (
                  <p className="text-xs text-red-600">{editFieldErrors.description[0]}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="destructive" onClick={handleDeleteCourse} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingCourse(null)} disabled={isSaving || isDeleting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCourse} disabled={isSaving || isDeleting}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
