import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EnrollmentService } from '../../enrollment.service';
import { EnrollmentFilter, EnrollmentResponse } from '../../enrollment.models';

import { CourseService } from '../../../admin/courses/course.service';
import { CourseResponse } from '../../../admin/courses/course.models';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './enrollment-list.html',
  styleUrl: './enrollment-list.css',
})
export class EnrollmentListComponent implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService = inject(CourseService);

  enrollments = signal<EnrollmentResponse[]>([]);
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');
  courseLoadError = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  search = signal('');
  courseId = signal<number | null>(null);
  status = signal<number | null>(null);
  fromDate = signal('');
  toDate = signal('');

  sortBy = signal('enrolledAt');
  sortOrder = signal('desc');

  ngOnInit(): void {
    this.loadCourses();
    this.loadEnrollments();
  }

  loadCourses(): void {
    this.courseLoadError.set('');

    this.courseService.getCourses(1, 100, { isActive: true }).subscribe({
      next: (response) => {
        this.courses.set(response.items);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.courseLoadError.set('Unable to load course filter options.');
      },
    });
  }

  buildFilters(): EnrollmentFilter {
    return {
      search: this.search().trim() || undefined,
      courseId: this.courseId(),
      status: this.status(),
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate()
        ? `${this.toDate()}T23:59:59`
        : undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService
      .getEnrollments(this.pageNumber(), this.pageSize(), this.buildFilters())
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading enrollments:', error);
          this.errorMessage.set('Unable to load enrollments.');
          this.isLoading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  resetFilters(): void {
    this.search.set('');
    this.courseId.set(null);
    this.status.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.sortBy.set('enrolledAt');
    this.sortOrder.set('desc');
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setCourseId(value: string): void {
    this.courseId.set(value ? Number(value) : null);
  }

  setStatus(value: string): void {
    this.status.set(value === '' ? null : Number(value));
  }

  setFromDate(value: string): void {
    this.fromDate.set(value);
  }

  setToDate(value: string): void {
    this.toDate.set(value);
  }

  setSortBy(value: string): void {
    this.sortBy.set(value);
    this.applyFilters();
  }

  setSortOrder(value: string): void {
    this.sortOrder.set(value);
    this.applyFilters();
  }

  setPageSize(value: string): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }
}