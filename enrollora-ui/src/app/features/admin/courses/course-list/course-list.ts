import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CourseService } from '../course.service';
import { CourseResponse } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);

  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  actionMessage = signal('');
  actionErrorMessage = signal('');
  deactivatingCourseId = signal<number | null>(null);

  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService.getCourses(this.pageNumber(), this.pageSize()).subscribe({
      next: (response) => {
        this.courses.set(response.items);
        this.totalRecords.set(response.totalRecords);
        this.totalPages.set(response.totalPages);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.errorMessage.set('Unable to load courses.');
        this.isLoading.set(false);
      },
    });
  }

  deactivateCourse(course: CourseResponse): void {
    if (!course.isActive || this.deactivatingCourseId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${course.courseName}"? Existing enrollments will be preserved.`,
    );

    if (!confirmed) {
      return;
    }

    this.deactivatingCourseId.set(course.courseId);
    this.actionMessage.set('');
    this.actionErrorMessage.set('');

    this.courseService.deactivateCourse(course.courseId).subscribe({
      next: (response) => {
        this.deactivatingCourseId.set(null);
        this.actionMessage.set(
          response.message || 'Course deactivated successfully.',
        );

        this.loadCourses();
      },
      error: (error) => {
        console.error('Error deactivating course:', error);

        this.deactivatingCourseId.set(null);
        this.actionErrorMessage.set(
          error.error?.message || 'Unable to deactivate course. Please try again.',
        );
      },
    });
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadCourses();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadCourses();
    }
  }
}
