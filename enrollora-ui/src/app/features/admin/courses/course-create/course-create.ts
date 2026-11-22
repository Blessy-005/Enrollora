import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CourseService } from '../course.service';
import { SaveCourseRequest } from '../course.models';

@Component({
  selector: 'app-course-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './course-create.html',
  styleUrl: './course-create.css',
})
export class CourseCreate {
  private fb = inject(FormBuilder);
  private courseService = inject(CourseService);
  private router = inject(Router);

  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  courseForm = this.fb.nonNullable.group({
    courseName: ['', [Validators.required, Validators.maxLength(100)]],
    duration: ['', [Validators.required, Validators.maxLength(50)]],
    fees: [0, [Validators.required, Validators.min(1)]],
    capacity: [1, [Validators.required, Validators.min(1)]],
    isActive: [true],
  });

  onSubmit(): void {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const request: SaveCourseRequest = this.courseForm.getRawValue();

    this.courseService.createCourse(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Course created successfully!');

        setTimeout(() => {
          this.router.navigate(['/admin/courses']);
        }, 1000);
      },
      error: (error) => {
        console.error('Error creating course:', error);

        this.isSubmitting.set(false);
        this.errorMessage.set(
          error.error?.message || 'Unable to create course. Please try again.',
        );
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/courses']);
  }
}
