from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db.models import Q

from detector.models import Course, Assignment, PlagiarismResult, PlagiarismMatch
from detector.utils.plagiarism_detector import PlagiarismDetector
from .serializers import (
    CourseSerializer,
    AssignmentSerializer,
    AssignmentCreateSerializer,
    PlagiarismResultSerializer,
    CheckPlagiarismSerializer,
    UserSerializer,
    StudentSerializer,
    StudentDetailSerializer,
)
from accounts.models import User
import csv
import io
import secrets


class IsTeacherOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow teachers to create/edit objects.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to teachers
        return request.user.is_authenticated and request.user.is_teacher


class IsTeacher(permissions.BasePermission):
    """Allow access only to teachers."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_teacher


class UserProfileView(APIView):
    """View for retrieving and updating user profile"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing student accounts (teacher only)"""
    queryset = User.objects.filter(is_teacher=False)
    serializer_class = StudentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_teacher:
            return User.objects.filter(is_teacher=False)
        return User.objects.none()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StudentDetailSerializer
        return StudentSerializer

    def perform_create(self, serializer):
        serializer.save(is_teacher=False)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        if not file.name.lower().endswith('.csv'):
            return Response({"detail": "Only CSV files are supported."}, status=status.HTTP_400_BAD_REQUEST)

        decoded = file.read().decode('utf-8', errors='ignore')
        reader = csv.DictReader(io.StringIO(decoded))

        created = []
        errors = []
        row_number = 1

        for row in reader:
            row_number += 1
            email = (row.get('email') or '').strip()
            username = (row.get('username') or '').strip()
            password = (row.get('password') or '').strip()

            if not email or not username:
                errors.append({"row": row_number, "error": "email and username are required"})
                continue

            if not password:
                password = secrets.token_urlsafe(8)

            payload = {
                "email": email,
                "username": username,
                "password": password,
                "first_name": (row.get('first_name') or '').strip(),
                "last_name": (row.get('last_name') or '').strip(),
                "institution": (row.get('institution') or '').strip(),
                "department": (row.get('department') or '').strip(),
            }

            serializer = StudentSerializer(data=payload)
            if serializer.is_valid():
                student = serializer.save()
                created.append({
                    "id": student.id,
                    "email": student.email,
                    "username": student.username,
                    "password": password
                })
            else:
                errors.append({"row": row_number, "error": serializer.errors})

        return Response({"created": created, "errors": errors})


class CourseViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Course instances"""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsTeacherOrReadOnly]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.is_teacher:
                # Teachers can see their own courses
                return Course.objects.filter(teacher=user)
            else:
                # Students can see all courses (read-only)
                return Course.objects.all()
        return Course.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class AssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing Assignment instances"""
    queryset = Assignment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AssignmentCreateSerializer
        return AssignmentSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.is_teacher:
                # Teachers can see assignments in their courses
                return Assignment.objects.filter(course__teacher=user)
            else:
                # Students can see their own assignments
                return Assignment.objects.filter(uploaded_by=user)
        return Assignment.objects.none()


class PlagiarismResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing PlagiarismResult instances"""
    queryset = PlagiarismResult.objects.all()
    serializer_class = PlagiarismResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.is_teacher:
                # Teachers can see results for assignments in their courses
                return PlagiarismResult.objects.filter(assignment__course__teacher=user)
            else:
                # Students can see results for their own assignments
                return PlagiarismResult.objects.filter(assignment__uploaded_by=user)
        return PlagiarismResult.objects.none()


class CheckPlagiarismView(APIView):
    """View for checking plagiarism on an assignment"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = CheckPlagiarismSerializer(data=request.data)
        if serializer.is_valid():
            assignment_id = serializer.validated_data['assignment_id']
            compare_with_course = serializer.validated_data['compare_with_course']
            compare_with_all = serializer.validated_data['compare_with_all']
            
            # Get the assignment to check
            assignment = get_object_or_404(Assignment, id=assignment_id)
            
            # Check permissions
            if not (request.user.is_teacher and assignment.course.teacher == request.user) and assignment.uploaded_by != request.user:
                return Response({"detail": "You do not have permission to check this assignment."}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            # Get reference assignments to compare with
            reference_assignments = []
            
            if compare_with_course:
                # Compare with other assignments in the same course
                course_assignments = Assignment.objects.filter(
                    course=assignment.course
                ).exclude(id=assignment.id)
                reference_assignments.extend(course_assignments)
            
            if compare_with_all:
                # Compare with all assignments
                all_assignments = Assignment.objects.exclude(
                    Q(id=assignment.id) | Q(id__in=[a.id for a in reference_assignments])
                )
                reference_assignments.extend(all_assignments)
            
            # Prepare reference texts for plagiarism detection
            reference_texts = []
            for ref_assignment in reference_assignments:
                if ref_assignment.content_text:
                    source_info = {
                        'id': ref_assignment.id,
                        'title': ref_assignment.title,
                        'student_name': ref_assignment.student_name,
                        'type': 'assignment'
                    }
                    reference_texts.append((ref_assignment.content_text, source_info))
            
            # Initialize plagiarism detector
            detector = PlagiarismDetector()
            
            # Detect plagiarism
            result = detector.detect_plagiarism(assignment.content_text, reference_texts)
            
            # Save the result to the database
            plagiarism_result = PlagiarismResult.objects.create(
                assignment=assignment,
                overall_score=result['overall_score']
            )
            
            # Save individual matches
            for match in result['matches']:
                source_info = match['source_info']
                source_assignment = None
                
                if source_info['type'] == 'assignment':
                    source_assignment_id = source_info['id']
                    source_assignment = Assignment.objects.get(id=source_assignment_id)
                
                PlagiarismMatch.objects.create(
                    result=plagiarism_result,
                    source_type=source_info['type'],
                    source_name=source_info['title'],
                    source_assignment=source_assignment,
                    similarity_score=match['similarity_score'],
                    matched_text="\n".join([m['text1_sentence'] for m in match['sentence_matches'][:5]])
                )
            
            # Return the result
            result_serializer = PlagiarismResultSerializer(plagiarism_result)
            return Response(result_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
