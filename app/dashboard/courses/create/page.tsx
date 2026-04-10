"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { coursesAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export default function CreateCoursePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ name: "", code: "", description: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSaving(true)

    try {
      await coursesAPI.createCourse(formData)
      router.push("/dashboard/courses")
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
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Course</h1>
        <p className="text-muted-foreground">Add a new course for assignments.</p>
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
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Provide the course information below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={fieldErrors.name ? "border-red-300 focus-visible:ring-red-300" : undefined}
                />
                {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  required
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className={fieldErrors.code ? "border-red-300 focus-visible:ring-red-300" : undefined}
                />
                {fieldErrors.code && <p className="text-xs text-red-600">{fieldErrors.code[0]}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={fieldErrors.description ? "border-red-300 focus-visible:ring-red-300" : undefined}
              />
              {fieldErrors.description && <p className="text-xs text-red-600">{fieldErrors.description[0]}</p>}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
