import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { StudentService } from '../student.service';
import {
  StudentResponse,
  StudentFilter,
  UpdateStudentRequest,
} from '../student.models';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnInit {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  students: StudentResponse[] = [];

  isLoading = false;
  errorMessage = '';

  pageNumber = 1;
  pageSize = 5;
  totalRecords = 0;
  totalPages = 0;

  selectedStudent: StudentResponse | null = null;
  isDetailsLoading = false;
  detailsError = '';

  filters: StudentFilter = {
    search: '',
    status: null,
    department: '',
    minAge: null,
    maxAge: null,
    minCgpa: null,
    maxCgpa: null,
  };

  isEditModalOpen = false;
  isEditLoading = false;
  isUpdatingStudent = false;
  editErrorMessage = '';
  editSuccessMessage = '';
  editingStudentId: number | null = null;
  editingStudentEmail = '';

  studentForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.maxLength(120),
    ]),
    department: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    age: new FormControl(18, [
      Validators.required,
      Validators.min(17),
      Validators.max(60),
    ]),
    cgpa: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(10),
    ]),
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService.getStudents(this.pageNumber, this.pageSize, this.filters).subscribe({
      next: (response) => {
        this.students = response.items;
        this.totalRecords = response.totalRecords;
        this.totalPages = response.totalPages;
        this.pageNumber = response.pageNumber;
        this.pageSize = response.pageSize;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load students:', error);
        this.errorMessage = 'Unable to load students.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  approveStudent(id: number): void {
    if (!confirm('Are you sure you want to approve this student?')) return;

    this.studentService.approveStudent(id).subscribe({
      next: (response) => {
        alert(response.message);
        this.loadStudents();
      },
      error: (error) => {
        console.error(error);
        alert('Unable to approve student.');
      },
    });
  }

  rejectStudent(id: number): void {
    if (!confirm('Are you sure you want to reject this student?')) return;

    this.studentService.rejectStudent(id).subscribe({
      next: (response) => {
        alert(response.message);
        this.loadStudents();
      },
      error: (error) => {
        console.error(error);
        alert('Unable to reject student.');
      },
    });
  }

  goToPreviousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadStudents();
    }
  }

  goToNextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadStudents();
    }
  }

  changePageSize(size: string): void {
    this.pageSize = Number(size);
    this.pageNumber = 1;
    this.loadStudents();
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.loadStudents();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      status: null,
      department: '',
      minAge: null,
      maxAge: null,
      minCgpa: null,
      maxCgpa: null,
    };

    this.pageNumber = 1;
    this.loadStudents();
  }

  viewStudent(id: number): void {
    this.selectedStudent = null;
    this.isDetailsLoading = true;
    this.detailsError = '';

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.selectedStudent = student;
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student details:', error);
        this.detailsError = 'Unable to load student details.';
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  editStudent(id: number): void {
    this.editingStudentId = id;
    this.isEditModalOpen = true;
    this.isEditLoading = true;
    this.isUpdatingStudent = false;
    this.editErrorMessage = '';
    this.editSuccessMessage = '';
    this.editingStudentEmail = '';

    this.studentForm.reset({
      name: '',
      department: '',
      age: 18,
      cgpa: 0,
    });

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.editingStudentEmail = student.email;
        this.studentForm.patchValue({
          name: student.name,
          department: student.department,
          age: student.age,
          cgpa: student.cgpa,
        });
        this.isEditLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student details:', error);
        this.editErrorMessage = 'Unable to load student details. Please try again.';
        this.isEditLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeEditModal(): void {
    if (this.isUpdatingStudent) return;

    this.isEditModalOpen = false;
    this.isEditLoading = false;
    this.editingStudentId = null;
    this.editingStudentEmail = '';
    this.editErrorMessage = '';
    this.editSuccessMessage = '';

    this.studentForm.reset({
      name: '',
      department: '',
      age: 18,
      cgpa: 0,
    });
  }

  updateStudent(): void {
    if (
      this.studentForm.invalid ||
      this.editingStudentId === null ||
      this.isUpdatingStudent ||
      this.isEditLoading
    ) {
      this.studentForm.markAllAsTouched();
      return;
    }

    const formValue = this.studentForm.getRawValue();

    const studentData: UpdateStudentRequest = {
      name: formValue.name!.trim(),
      department: formValue.department!.trim(),
      age: formValue.age!,
      cgpa: formValue.cgpa!,
    };

    if (!studentData.name || !studentData.department) {
      this.studentForm.markAllAsTouched();
      return;
    }

    this.isUpdatingStudent = true;
    this.editErrorMessage = '';
    this.editSuccessMessage = '';

    this.studentService.updateStudent(this.editingStudentId, studentData).subscribe({
      next: () => {
        this.isUpdatingStudent = false;
        this.editSuccessMessage = 'Student details updated successfully.';
        this.cdr.markForCheck();

        this.loadStudents();

        setTimeout(() => {
          this.closeEditModal();
          this.cdr.markForCheck();
        }, 1000);
      },
      error: (error) => {
        console.error('Failed to update student:', error);
        this.isUpdatingStudent = false;
        this.editErrorMessage =
          error.error?.message || 'Unable to update student. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  deleteStudent(id: number): void {
    if (!confirm('Are you sure you want to delete this student?')) return;

    this.studentService.deleteStudent(id).subscribe({
      next: () => this.loadStudents(),
      error: (error) => console.error('Failed to delete student:', error),
    });
  }
}
