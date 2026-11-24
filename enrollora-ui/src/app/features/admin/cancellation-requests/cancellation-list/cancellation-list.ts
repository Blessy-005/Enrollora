import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CancellationService } from '../cancellation.service';
import {
  CancellationFilter,
  CancellationResponse,
  CancellationStatus,
} from '../cancellation.models';

import { CourseService } from '../../../admin/courses/course.service';
import { CourseResponse } from '../../../admin/courses/course.models';

@Component({
  selector: 'app-cancellation-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-list.html',
  styleUrl: './cancellation-list.css',
})
export class CancellationListComponent implements OnInit {
  private readonly cancellationService = inject(CancellationService);
  private readonly courseService = inject(CourseService);

  readonly CancellationStatus = CancellationStatus;

  requests = signal<CancellationResponse[]>([]);
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
  status = signal<CancellationStatus | null>(null);
  fromDate = signal('');
  toDate = signal('');
  sortOrder = signal<'asc' | 'desc'>('desc');

  selectedRequest = signal<CancellationResponse | null>(null);
  adminRemarks = signal('');
  isReviewModalOpen = signal(false);
  isReviewing = signal(false);
  reviewError = signal('');
  reviewSuccess = signal('');

  ngOnInit(): void {
    this.loadCourses();
    this.loadRequests();
  }

  loadCourses(): void {
    this.courseLoadError.set('');

    this.courseService.getCourses(1, 100).subscribe({
      next: (response) => {
        this.courses.set(response.items);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.courseLoadError.set('Unable to load course filter options.');
      },
    });
  }

  buildFilters(): CancellationFilter {
    return {
      search: this.search().trim() || undefined,
      courseId: this.courseId(),
      status: this.status(),
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate()
        ? `${this.toDate()}T23:59:59`
        : undefined,
      sortOrder: this.sortOrder(),
    };
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.cancellationService
      .getCancellationRequests(
        this.pageNumber(),
        this.pageSize(),
        this.buildFilters(),
      )
      .subscribe({
        next: (response) => {
          this.requests.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.pageNumber.set(response.pageNumber);
          this.pageSize.set(response.pageSize);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading cancellation requests:', error);
          this.errorMessage.set('Unable to load cancellation requests.');
          this.isLoading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadRequests();
  }

  resetFilters(): void {
    this.search.set('');
    this.courseId.set(null);
    this.status.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.sortOrder.set('desc');
    this.pageNumber.set(1);
    this.loadRequests();
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setCourseId(value: string): void {
    this.courseId.set(value ? Number(value) : null);
  }

  setStatus(value: string): void {
    this.status.set(
      value === '' ? null : Number(value) as CancellationStatus,
    );
  }

  setFromDate(value: string): void {
    this.fromDate.set(value);
  }

  setToDate(value: string): void {
    this.toDate.set(value);
  }

  setSortOrder(value: string): void {
    this.sortOrder.set(value as 'asc' | 'desc');
    this.applyFilters();
  }

  setPageSize(value: string): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
    this.loadRequests();
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadRequests();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadRequests();
    }
  }

  openReviewModal(request: CancellationResponse): void {
    if (request.status !== CancellationStatus.Pending) {
      return;
    }

    this.selectedRequest.set(request);
    this.adminRemarks.set('');
    this.reviewError.set('');
    this.reviewSuccess.set('');
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    if (this.isReviewing()) {
      return;
    }

    this.isReviewModalOpen.set(false);
    this.selectedRequest.set(null);
    this.adminRemarks.set('');
    this.reviewError.set('');
    this.reviewSuccess.set('');
  }

  approveRequest(): void {
    this.reviewRequest(true);
  }

  rejectRequest(): void {
    this.reviewRequest(false);
  }

  private reviewRequest(approve: boolean): void {
    const request = this.selectedRequest();

    if (!request || this.isReviewing()) {
      return;
    }

    const action = approve ? 'approve' : 'reject';

    if (
      !confirm(
        `Are you sure you want to ${action} this cancellation request?`,
      )
    ) {
      return;
    }

    this.isReviewing.set(true);
    this.reviewError.set('');

    const reviewData = {
      adminRemarks: this.adminRemarks().trim() || null,
    };

    const reviewCall = approve
      ? this.cancellationService.approveRequest(
          request.cancellationRequestId,
          reviewData,
        )
      : this.cancellationService.rejectRequest(
          request.cancellationRequestId,
          reviewData,
        );

    reviewCall.subscribe({
      next: () => {
        this.isReviewing.set(false);
        this.reviewSuccess.set(
          `Cancellation request ${approve ? 'approved' : 'rejected'} successfully.`,
        );

        this.loadRequests();

        setTimeout(() => {
          this.closeReviewModal();
        }, 1000);
      },
      error: (error) => {
        console.error('Error reviewing cancellation request:', error);
        this.isReviewing.set(false);
        this.reviewError.set(
          error.error?.message ||
            `Unable to ${action} cancellation request. Please try again.`,
        );
      },
    });
  }

  getStatusLabel(status: CancellationStatus): string {
    switch (status) {
      case CancellationStatus.Pending:
        return 'Pending';
      case CancellationStatus.Approved:
        return 'Approved';
      case CancellationStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }
}
