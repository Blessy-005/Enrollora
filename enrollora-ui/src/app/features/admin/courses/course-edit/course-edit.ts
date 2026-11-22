import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CourseService } from '../course.service';
import { SaveCourseRequest } from '../course.models';

@Component({
  selector: 'app-course-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './course-edit.html',
  styleUrl: './course-edit.css',
})
export class CourseEdit implements OnInit {
  private fb = inject(FormBuilder);
  private courseService = inject(CourseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  courseId = 0;

  isLoading = signal(false);
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

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.courseId || this.courseId <= 0) {
      this.errorMessage.set('Invalid course ID.');
      return;
    }

    this.loadCourse();
  }

  loadCourse(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        this.courseForm.patchValue({
          courseName: course.courseName,
          duration: course.duration,
          fees: course.fees,
          capacity: course.capacity,
          isActive: course.isActive,
        });

        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading course:', error);
        this.errorMessage.set(
          error.error?.message || 'Unable to load course details.',
        );
        this.isLoading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const request: SaveCourseRequest = this.courseForm.getRawValue();

    this.courseService.updateCourse(this.courseId, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Course updated successfully!');

        setTimeout(() => {
          this.router.navigate(['/admin/courses']);
        }, 1000);
      },
      error: (error) => {
        console.error('Error updating course:', error);

        this.isSubmitting.set(false);
        this.errorMessage.set(
          error.error?.message || 'Unable to update course. Please try again.',
        );
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/courses']);
  }
}
