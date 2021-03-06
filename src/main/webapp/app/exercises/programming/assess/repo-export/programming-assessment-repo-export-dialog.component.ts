import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertService } from 'app/core/alert/alert.service';
import { WindowRef } from 'app/core/websocket/window.service';
import { ProgrammingAssessmentRepoExportService, RepositoryExportOptions } from 'app/exercises/programming/assess/repo-export/programming-assessment-repo-export.service';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { FeatureToggle } from 'app/shared/feature-toggle/feature-toggle.service';
import { Exercise } from 'app/entities/exercise.model';
import { ExerciseService } from 'app/exercises/shared/exercise/exercise.service';

@Component({
    selector: 'jhi-exercise-scores-repo-export-dialog',
    templateUrl: './programming-assessment-repo-export-dialog.component.html',
    styles: ['textarea { width: 100%; }'],
})
export class ProgrammingAssessmentRepoExportDialogComponent implements OnInit {
    @Input() exerciseId: number;
    // Either a participationId list or a participantIdentifier (student login or team short name) list can be provided that is used for exporting the repos.
    // Priority: participationId >> participantIdentifier.
    @Input() participationIdList: number[];
    @Input() participantIdentifierList: string; // TODO: Should be a list and not a comma separated string.
    @Input() singleParticipantMode = false;
    readonly FeatureToggle = FeatureToggle;
    exercise: Exercise;
    exportInProgress: boolean;
    repositoryExportOptions: RepositoryExportOptions;
    isLoading = false;

    constructor(
        private $window: WindowRef,
        private exerciseService: ExerciseService,
        private repoExportService: ProgrammingAssessmentRepoExportService,
        public activeModal: NgbActiveModal,
        private jhiAlertService: AlertService,
    ) {}

    ngOnInit() {
        this.isLoading = true;
        this.exportInProgress = false;
        this.repositoryExportOptions = {
            exportAllParticipants: false,
            filterLateSubmissions: false,
            filterLateSubmissionsDate: null,
            addParticipantName: true,
            combineStudentCommits: false,
            normalizeCodeStyle: false, // disabled by default because it is rather unstable
        };
        this.exerciseService
            .find(this.exerciseId)
            .pipe(
                tap(({ body: exercise }) => {
                    this.exercise = exercise!;
                }),
                catchError((err) => {
                    this.jhiAlertService.error(err);
                    this.clear();
                    return of(null);
                }),
            )
            .subscribe(() => {
                this.isLoading = false;
            });
    }

    clear() {
        this.activeModal.dismiss('cancel');
    }

    exportRepos(exerciseId: number) {
        this.exportInProgress = true;
        // The inputted participation ids take priority over the participant identifiers (student login or team names).
        if (this.participationIdList) {
            // We anonymize the assessment process ("double-blind").
            this.repositoryExportOptions.addParticipantName = false;
            this.repoExportService
                .exportReposByParticipations(exerciseId, this.participationIdList, this.repositoryExportOptions)
                .subscribe(this.handleExportRepoResponse, (err) => {
                    this.exportInProgress = false;
                });
            return;
        }
        const participantIdentifierList =
            this.participantIdentifierList !== undefined && this.participantIdentifierList !== '' ? this.participantIdentifierList.split(',').map((e) => e.trim()) : ['ALL'];

        this.repoExportService
            .exportReposByParticipantIdentifiers(exerciseId, participantIdentifierList, this.repositoryExportOptions)
            .subscribe(this.handleExportRepoResponse, (err) => {
                this.exportInProgress = false;
            });
    }

    handleExportRepoResponse = (response: HttpResponse<Blob>) => {
        this.jhiAlertService.success('artemisApp.programmingExercise.export.successMessage');
        this.activeModal.dismiss(true);
        this.exportInProgress = false;
        if (response.body) {
            const zipFile = new Blob([response.body], { type: 'application/zip' });
            const url = this.$window.nativeWindow.URL.createObjectURL(zipFile);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', response.headers.get('filename')!);
            document.body.appendChild(link); // Required for FF
            link.click();
            window.URL.revokeObjectURL(url);
        }
    };
}
