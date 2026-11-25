import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';

import { EnrollmentResponse } from '../../enrollment.models';
import { EnrollmentService } from '../../enrollment.service';

import {
  CancellationResponse,
  CancellationStatus,
} from '../../cancellation/cancellation.models';
import { StudentCancellationService } from '../../cancellation/cancellation.service';

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './my-enrollments.css',
  templateUrl: './my-enrollments.html',
})
export class MyEnrollments implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly cancellationService = inject(StudentCancellationService);

  enrollments = signal<EnrollmentResponse[]>([]);
  cancellationRequests = signal<CancellationResponse[]>([]);

  isLoading = signal(false);
  isCancellationLoading = signal(false);
  isSubmitting = signal(false);

  errorMessage = signal('');
  cancellationError = signal('');
  successMessage = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  selectedEnrollment = signal<EnrollmentResponse | null>(null);
  cancellationReason = signal('');
  cancellationFormError = signal('');

  ngOnInit(): void {
    this.loadEnrollments();
    this.loadCancellationRequests();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService
      .getMyEnrollments(this.pageNumber(), this.pageSize())
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error;

          this.errorMessage.set(
            body?.detail ||
              body?.message ||
              body?.title ||
              'Unable to load your enrollments.',
          );

          this.isLoading.set(false);
        },
      });
  }

  loadCancellationRequests(): void {
    this.isCancellationLoading.set(true);
    this.cancellationError.set('');

    this.cancellationService.getMyCancellationRequests(1, 100).subscribe({
      next: (response) => {
        this.cancellationRequests.set(response.items);
        this.isCancellationLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const body = error.error;

        this.cancellationError.set(
          body?.detail ||
            body?.message ||
            body?.title ||
            'Unable to load cancellation request history.',
        );

        this.isCancellationLoading.set(false);
      },
    });
  }

  statusLabel(status: number): string {
    return status === 0 ? 'Active' : 'Cancelled';
  }

  cancellationStatusLabel(status: CancellationStatus): string {
    switch (status) {
      case CancellationStatus.Pending:
        return 'Request Pending';

      case CancellationStatus.Approved:
        return 'Cancellation Approved';

      case CancellationStatus.Rejected:
        return 'Request Rejected';

      default:
        return 'Unknown';
    }
  }

  requestForEnrollment(
    enrollmentId: number,
  ): CancellationResponse | undefined {
    return this.cancellationRequests()
      .filter((request) => request.enrollmentId === enrollmentId)
      .sort(
        (first, second) =>
          new Date(second.requestedAt).getTime() -
          new Date(first.requestedAt).getTime(),
      )[0];
  }

  canRequestCancellation(enrollment: EnrollmentResponse): boolean {
    if (enrollment.status !== 0) {
      return false;
    }

    const request = this.requestForEnrollment(enrollment.enrollmentId);

    return (
      !request ||
      request.status === CancellationStatus.Rejected
    );
  }

  openCancellationModal(enrollment: EnrollmentResponse): void {
    if (!this.canRequestCancellation(enrollment)) {
      return;
    }

    this.selectedEnrollment.set(enrollment);
    this.cancellationReason.set('');
    this.cancellationFormError.set('');
  }

  closeCancellationModal(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.selectedEnrollment.set(null);
    this.cancellationReason.set('');
    this.cancellationFormError.set('');
  }

  submitCancellationRequest(): void {
    const enrollment = this.selectedEnrollment();
    const reason = this.cancellationReason().trim();

    if (!enrollment) {
      return;
    }

    if (!reason) {
      this.cancellationFormError.set(
        'Please enter a reason for cancellation.',
      );
      return;
    }

    if (reason.length > 1000) {
      this.cancellationFormError.set(
        'The reason cannot exceed 1000 characters.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.cancellationFormError.set('');

    this.cancellationService
      .createCancellationRequest(enrollment.enrollmentId, { reason })
      .subscribe({
        next: (response) => {
          this.cancellationRequests.update((requests) => [
            response,
            ...requests,
          ]);

          this.successMessage.set(
            'Your cancellation request has been submitted successfully.',
          );

          this.selectedEnrollment.set(null);
          this.cancellationReason.set('');
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error;

          this.cancellationFormError.set(
            body?.detail ||
              body?.message ||
              body?.title ||
              'Unable to submit your cancellation request.',
          );

          this.isSubmitting.set(false);
        },
      });
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }
}
