"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { studentsAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Pencil, Trash2 } from "lucide-react"

type Student = {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  institution: string
  department: string
}

const emptyForm = {
  email: "",
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  institution: "",
  department: "",
}

export default function StudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({ ...emptyForm })
  const [isCreating, setIsCreating] = useState(false)

  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<{ created: any[]; errors: any[] } | null>(null)

  const fullName = useMemo(() => {
    if (!editingStudent) return ""
    return `${editingStudent.first_name || ""} ${editingStudent.last_name || ""}`.trim()
  }, [editingStudent])

  const loadStudents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await studentsAPI.getStudents()
      setStudents(data)
    } catch (err: any) {
      setError(err.message || "Failed to load students.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.is_teacher) {
      loadStudents()
    } else {
      setIsLoading(false)
    }
  }, [user?.is_teacher])

  useEffect(() => {
    if (!editingStudent) {
      setEditForm({ ...emptyForm })
      return
    }

    setEditForm({
      email: editingStudent.email || "",
      username: editingStudent.username || "",
      password: "",
      first_name: editingStudent.first_name || "",
      last_name: editingStudent.last_name || "",
      institution: editingStudent.institution || "",
      department: editingStudent.department || "",
    })
  }, [editingStudent])

  const handleCreateChange = (field: string, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsCreating(true)

    try {
      const payload = { ...createForm }
      const created = await studentsAPI.createStudent(payload)
      setStudents((prev) => [created, ...prev])
      setCreateForm({ ...emptyForm })
    } catch (err: any) {
      setError(err.message || "Failed to create student.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveStudent = async () => {
    if (!editingStudent) return
    setError(null)
    setIsSaving(true)

    try {
      const payload: any = { ...editForm }
      if (!payload.password) {
        delete payload.password
      }

      const updated = await studentsAPI.updateStudent(editingStudent.id, payload)
      setStudents((prev) => prev.map((student) => (student.id === updated.id ? updated : student)))
      setEditingStudent(null)
    } catch (err: any) {
      setError(err.message || "Failed to update student.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!editingStudent) return
    setError(null)
    setIsDeleting(true)

    try {
      await studentsAPI.deleteStudent(editingStudent.id)
      setStudents((prev) => prev.filter((student) => student.id !== editingStudent.id))
      setEditingStudent(null)
    } catch (err: any) {
      setError(err.message || "Failed to delete student.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImportStudents = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) {
      setError("Please choose a CSV file to import.")
      return
    }

    setError(null)
    setIsImporting(true)

    try {
      const result = await studentsAPI.importStudentsCSV(importFile)
      setImportSummary(result)
      setImportFile(null)
      await loadStudents()
    } catch (err: any) {
      setError(err.message || "Failed to import students.")
    } finally {
      setIsImporting(false)
    }
  }

  if (!user?.is_teacher) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription>Only teachers can manage students.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-muted-foreground">Create and manage student accounts.</p>
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
          <CardTitle>Add Student</CardTitle>
          <CardDescription>Create a new student account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={createForm.first_name}
                  onChange={(e) => handleCreateChange("first_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={createForm.last_name}
                  onChange={(e) => handleCreateChange("last_name", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => handleCreateChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  required
                  value={createForm.username}
                  onChange={(e) => handleCreateChange("username", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={createForm.password}
                onChange={(e) => handleCreateChange("password", e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={createForm.institution}
                  onChange={(e) => handleCreateChange("institution", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={createForm.department}
                  onChange={(e) => handleCreateChange("department", e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Student"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Students (CSV)</CardTitle>
          <CardDescription>Upload a CSV file with student accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleImportStudents} className="flex flex-col gap-3">
            <div className="space-y-2">
              <Label htmlFor="students_csv">CSV File</Label>
              <Input
                id="students_csv"
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-slate-500">
                Columns: email, username, password (optional), first_name, last_name, institution, department
              </p>
            </div>
            <Button type="submit" disabled={isImporting || !importFile}>
              {isImporting ? "Importing..." : "Import Students"}
            </Button>
          </form>

          {importSummary && (
            <div className="space-y-2 text-sm">
              <p>
                Imported: {importSummary.created.length} student{importSummary.created.length === 1 ? "" : "s"}
              </p>
              {importSummary.errors.length > 0 && (
                <div className="text-red-600">
                  {importSummary.errors.length} row{importSummary.errors.length === 1 ? "" : "s"} failed to import.
                </div>
              )}
              {importSummary.created.length > 0 && (
                <div className="space-y-2 text-slate-600">
                  <p>Generated passwords (copy these now if needed):</p>
                  <div className="max-h-48 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Password</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importSummary.created.map((row) => (
                          <TableRow key={`${row.id}-${row.email}`}>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{row.username}</TableCell>
                            <TableCell>{row.password}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>Manage existing students.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-sm text-slate-500">No students found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      {student.first_name || student.last_name
                        ? `${student.first_name} ${student.last_name}`.trim()
                        : student.username}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.institution || "-"}</TableCell>
                    <TableCell>{student.department || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/students/${student.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Student {fullName ? `- ${fullName}` : ""}</DialogTitle>
          </DialogHeader>

          {editingStudent && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={editForm.first_name}
                    onChange={(e) => handleEditChange("first_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={editForm.last_name}
                    onChange={(e) => handleEditChange("last_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleEditChange("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_username">Username</Label>
                  <Input
                    id="edit_username"
                    value={editForm.username}
                    onChange={(e) => handleEditChange("username", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_password">Reset Password (Optional)</Label>
                <Input
                  id="edit_password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => handleEditChange("password", e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_institution">Institution</Label>
                  <Input
                    id="edit_institution"
                    value={editForm.institution}
                    onChange={(e) => handleEditChange("institution", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_department">Department</Label>
                  <Input
                    id="edit_department"
                    value={editForm.department}
                    onChange={(e) => handleEditChange("department", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="destructive" onClick={handleDeleteStudent} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingStudent(null)} disabled={isSaving || isDeleting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveStudent} disabled={isSaving || isDeleting}>
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
