import * as $ from 'jquery';
import { AfterViewInit, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { AlertService } from 'app/core/alert/alert.service';
import { WindowRef } from 'app/core/websocket/window.service';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ExampleSubmissionService } from 'app/exercises/shared/example-submission/example-submission.service';
import { TextAssessmentsService } from 'app/exercises/text/assess/text-assessments.service';
import { HighlightColors } from 'app/exercises/text/assess/highlight-colors';
import { TutorParticipationService } from 'app/exercises/shared/dashboards/tutor/tutor-participation.service';
import { ArtemisMarkdownService } from 'app/shared/markdown.service';
import Interactable from '@interactjs/core/Interactable';
import interact from 'interactjs';
import { AccountService } from 'app/core/auth/account.service';
import { GuidedTourService } from 'app/guided-tour/guided-tour.service';
import { tutorAssessmentTour } from 'app/guided-tour/tours/tutor-assessment-tour';
import { TextSubmissionService } from 'app/exercises/text/participate/text-submission.service';
import { ExampleSubmission } from 'app/entities/example-submission.model';
import { Feedback } from 'app/entities/feedback.model';
import { ExerciseService } from 'app/exercises/shared/exercise/exercise.service';
import { ResultService } from 'app/exercises/shared/result/result.service';
import { TextExercise } from 'app/entities/text-exercise.model';
import { TutorParticipation } from 'app/entities/participation/tutor-participation.model';
import { TextSubmission } from 'app/entities/text-submission.model';
import { Result } from 'app/entities/result.model';

@Component({
    selector: 'jhi-example-text-submission',
    templateUrl: './example-text-submission.component.html',
    providers: [],
    styleUrls: ['./example-text-submission.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class ExampleTextSubmissionComponent implements OnInit, AfterViewInit {
    isNewSubmission: boolean;
    areNewAssessments = true;
    exerciseId: number;
    exampleSubmission = new ExampleSubmission();
    textSubmission = new TextSubmission();
    assessments: Feedback[] = [];
    assessmentsAreValid = false;
    result: Result;
    totalScore: number;
    invalidError: string | null;
    exercise: TextExercise;
    isAtLeastInstructor = false;
    readOnly: boolean;
    toComplete: boolean;

    resizableMinWidth = 100;
    resizableMaxWidth = 1200;
    resizableMinHeight = 200;
    interactResizableSubmission: Interactable;
    interactResizableAssessment: Interactable;
    interactResizableTop: Interactable;

    public getColorForIndex = HighlightColors.forIndex;

    private exampleSubmissionId: number;
    constructor(
        private exerciseService: ExerciseService,
        private textSubmissionService: TextSubmissionService,
        private exampleSubmissionService: ExampleSubmissionService,
        private assessmentsService: TextAssessmentsService,
        private tutorParticipationService: TutorParticipationService,
        private jhiAlertService: AlertService,
        private accountService: AccountService,
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private artemisMarkdown: ArtemisMarkdownService,
        private resultService: ResultService,
        private $window: WindowRef,
        private guidedTourService: GuidedTourService,
    ) {}

    ngOnInit(): void {
        // (+) converts string 'id' to a number
        this.exerciseId = Number(this.route.snapshot.paramMap.get('exerciseId'));
        const exampleSubmissionId = this.route.snapshot.paramMap.get('exampleSubmissionId');
        this.readOnly = !!this.route.snapshot.queryParamMap.get('readOnly');
        this.toComplete = !!this.route.snapshot.queryParamMap.get('toComplete');

        if (exampleSubmissionId === 'new') {
            this.isNewSubmission = true;
            this.exampleSubmissionId = -1;
        } else {
            this.exampleSubmissionId = +exampleSubmissionId!;
        }
        this.loadAll();
    }

    ngAfterViewInit(): void {
        this.resizableMinWidth = this.$window.nativeWindow.screen.width / 6;
        this.resizableMinHeight = this.$window.nativeWindow.screen.height / 7;

        this.interactResizableSubmission = interact('.resizable-submission')
            .resizable({
                // Enable resize from left edge; triggered by class .resizing-bar
                edges: { left: '.resizing-bar', right: false, bottom: false, top: false },
                // Set min and max width
                modifiers: [
                    // Set maximum width
                    interact.modifiers!.restrictSize({
                        min: { width: this.resizableMinWidth, height: 0 },
                        max: { width: this.resizableMaxWidth, height: 2000 },
                    }),
                ],
                inertia: true,
            })
            .on('resizestart', function (event: any) {
                event.target.classList.add('card-resizable');
            })
            .on('resizeend', function (event: any) {
                event.target.classList.remove('card-resizable');
            })
            .on('resizemove', function (event: any) {
                const target = event.target;
                // Update element width
                target.style.width = event.rect.width + 'px';
                target.style.minWidth = event.rect.width + 'px';
            });

        this.interactResizableAssessment = interact('.resizable-assessment')
            .resizable({
                // Enable resize from left edge; triggered by class .resizing-bar-assessment
                edges: { left: '.resizing-bar-assessment', right: false, bottom: false, top: false },
                // Set min and max width
                modifiers: [
                    // Set maximum width
                    interact.modifiers!.restrictSize({
                        min: { width: this.resizableMinWidth, height: 0 },
                        max: { width: this.resizableMaxWidth, height: 2000 },
                    }),
                ],
                inertia: true,
            })
            .on('resizestart', function (event: any) {
                event.target.classList.add('card-resizable');
            })
            .on('resizeend', function (event: any) {
                event.target.classList.remove('card-resizable');
            })
            .on('resizemove', function (event: any) {
                const target = event.target;
                // Update element width
                target.style.width = event.rect.width + 'px';
                target.style.minWidth = event.rect.width + 'px';
            });

        this.interactResizableTop = interact('.resizable-horizontal')
            .resizable({
                // Enable resize from bottom edge; triggered by class .resizing-bar-bottom
                edges: { left: false, right: false, top: false, bottom: '.resizing-bar-bottom' },
                // Set min height
                modifiers: [
                    // Set maximum width
                    interact.modifiers!.restrictSize({
                        min: { width: 0, height: this.resizableMinHeight },
                    }),
                ],
                inertia: true,
            })
            .on('resizestart', function (event: any) {
                event.target.classList.add('card-resizable');
            })
            .on('resizeend', function (event: any) {
                event.target.classList.remove('card-resizable');
            })
            .on('resizemove', function (event: any) {
                const target = event.target;
                // Update element height
                target.style.minHeight = event.rect.height + 'px';
                $('#submission-area').css('min-height', event.rect.height - 100 + 'px');
            });

        this.guidedTourService.componentPageLoaded();
    }

    loadAll() {
        this.exerciseService.find(this.exerciseId).subscribe((exerciseResponse: HttpResponse<TextExercise>) => {
            this.exercise = exerciseResponse.body!;
            this.isAtLeastInstructor = this.accountService.isAtLeastInstructorInCourse(this.exercise.course!);
            this.guidedTourService.enableTourForExercise(this.exercise, tutorAssessmentTour, false);
        });

        if (this.isNewSubmission) {
            return; // We don't need to load anything else
        }

        this.exampleSubmissionService.get(this.exampleSubmissionId).subscribe((exampleSubmissionResponse: HttpResponse<ExampleSubmission>) => {
            this.exampleSubmission = exampleSubmissionResponse.body!;
            this.textSubmission = this.exampleSubmission.submission as TextSubmission;

            // Do not load the results when we have to assess the submission. The API will not provide it anyway
            // if we are not instructors
            if (this.toComplete) {
                return;
            }

            this.assessmentsService.getExampleResult(this.exerciseId, this.textSubmission.id).subscribe((result) => {
                this.result = result;
                this.assessments = this.result.feedbacks || [];
                this.areNewAssessments = this.assessments.length <= 0;
                this.checkScoreBoundaries();
            });
        });
    }

    createUpdateExampleTextSubmission() {
        this.textSubmission.exampleSubmission = true;
        if (this.isNewSubmission) {
            this.createNewExampleTextSubmission();
        } else {
            this.updateExampleTextSubmission();
        }
    }

    toggleCollapse($event: any, resizable: string) {
        const target = $event.toElement || $event.relatedTarget || $event.target;
        target.blur();
        let $card: any;

        if (resizable === 'submission') {
            $card = $(target).closest('#instructions');
        } else if (resizable === 'assessment') {
            $card = $(target).closest('#assessment-instructions');
        }

        if ($card.hasClass('collapsed')) {
            $card.removeClass('collapsed');
            if (resizable === 'submission') {
                this.interactResizableSubmission.resizable({ enabled: true });
            } else if (resizable === 'assessment') {
                this.interactResizableAssessment.resizable({ enabled: true });
            }
            $card.css({ width: this.resizableMinWidth + 'px', minWidth: this.resizableMinWidth + 'px' });
        } else {
            $card.addClass('collapsed');
            if (resizable === 'submission') {
                this.interactResizableSubmission.resizable({ enabled: false });
            } else if (resizable === 'assessment') {
                this.interactResizableAssessment.resizable({ enabled: false });
            }
            $card.css({ width: '55px', minWidth: '55px' });
        }
    }

    private createNewExampleTextSubmission() {
        const newExampleSubmission = new ExampleSubmission();
        newExampleSubmission.submission = this.textSubmission;
        newExampleSubmission.exercise = this.exercise;

        this.exampleSubmissionService.create(newExampleSubmission, this.exerciseId).subscribe((exampleSubmissionResponse: HttpResponse<ExampleSubmission>) => {
            this.exampleSubmission = exampleSubmissionResponse.body!;
            this.exampleSubmission.exercise = this.exercise;
            this.exampleSubmissionId = this.exampleSubmission.id;
            this.textSubmission = this.exampleSubmission.submission as TextSubmission;
            this.isNewSubmission = false;

            // Update the url with the new id, without reloading the page, to make the history consistent
            const newUrl = window.location.hash.replace('#', '').replace('new', `${this.exampleSubmissionId}`);
            this.location.go(newUrl);

            this.resultService.createNewExampleResult(this.textSubmission.id).subscribe((response: HttpResponse<Result>) => {
                this.result = response.body!;
                this.jhiAlertService.success('artemisApp.exampleSubmission.submitSuccessful');
            }, this.onError);
        }, this.onError);
    }

    private updateExampleTextSubmission() {
        this.exampleSubmissionService.update(this.exampleSubmission, this.exerciseId).subscribe((exampleSubmissionResponse: HttpResponse<ExampleSubmission>) => {
            this.exampleSubmission = exampleSubmissionResponse.body!;

            this.jhiAlertService.success('artemisApp.exampleSubmission.saveSuccessful');
        }, this.onError);
    }

    public addAssessment(assessmentText: string): void {
        const assessment = new Feedback();
        assessment.reference = assessmentText;
        this.assessments.push(assessment);
        this.checkScoreBoundaries();
    }

    public deleteAssessment(assessmentToDelete: Feedback): void {
        this.assessments = this.assessments.filter((elem) => elem !== assessmentToDelete);
        this.checkScoreBoundaries();
    }

    /**
     * Calculates the total score of the current assessment.
     * Returns an error if the total score cannot be calculated
     * because a score is not a number/empty.
     */
    public checkScoreBoundaries() {
        if (!this.assessments || this.assessments.length === 0) {
            this.totalScore = 0;
            this.assessmentsAreValid = true;
            return;
        }

        const credits = this.assessments.map((assessment) => assessment.credits);

        if (!credits.every((credit) => credit !== null && !isNaN(credit))) {
            this.invalidError = 'The score field must be a number and can not be empty!';
            this.assessmentsAreValid = false;
            return;
        }

        this.totalScore = credits.reduce((a, b) => a! + b!, 0)!;
        this.assessmentsAreValid = true;
        this.invalidError = null;
        if (this.guidedTourService.currentTour && this.toComplete) {
            this.guidedTourService.updateAssessmentResult(this.assessments.length, this.totalScore);
        }
    }

    public saveAssessments(): void {
        this.checkScoreBoundaries();
        if (!this.assessmentsAreValid) {
            this.jhiAlertService.error('artemisApp.textAssessment.error.invalidAssessments');
            return;
        }

        this.assessmentsService.save(this.exercise.id, this.result.id, this.assessments, []).subscribe((response) => {
            this.result = response.body!;
            this.areNewAssessments = false;
            this.jhiAlertService.success('artemisApp.textAssessment.saveSuccessful');
        });
    }

    async back() {
        const courseId = this.exercise.course!.id;

        if (this.readOnly || this.toComplete) {
            this.router.navigate([`/course-management/${courseId}/exercises/${this.exerciseId}/tutor-dashboard`]);
        } else {
            await this.router.navigate(['/course-management', courseId, 'text-exercises']);
            this.router.navigate(['/course-management', courseId, 'text-exercises', this.exerciseId, 'edit']);
        }
    }

    checkAssessment() {
        this.checkScoreBoundaries();
        if (!this.assessmentsAreValid) {
            this.jhiAlertService.error('artemisApp.textAssessment.error.invalidAssessments');
            return;
        }

        const exampleSubmission = Object.assign({}, this.exampleSubmission);
        exampleSubmission.submission.result = new Result();
        exampleSubmission.submission.result.feedbacks = this.assessments;

        this.tutorParticipationService.assessExampleSubmission(exampleSubmission, this.exerciseId).subscribe(
            (res: HttpResponse<TutorParticipation>) => {
                this.jhiAlertService.success('artemisApp.exampleSubmission.assessScore.success');
            },
            (error: HttpErrorResponse) => {
                const errorType = error.headers.get('x-artemisapp-error');

                if (errorType === 'error.tooLow') {
                    this.jhiAlertService.error('artemisApp.exampleSubmission.assessScore.tooLow');
                } else if (errorType === 'error.tooHigh') {
                    this.jhiAlertService.error('artemisApp.exampleSubmission.assessScore.tooHigh');
                } else {
                    this.onError(error.message);
                }
            },
        );
    }

    readAndUnderstood() {
        this.tutorParticipationService.assessExampleSubmission(this.exampleSubmission, this.exerciseId).subscribe((res: HttpResponse<TutorParticipation>) => {
            this.jhiAlertService.success('artemisApp.exampleSubmission.readSuccessfully');
            this.back();
        });
    }

    private onError(error: string) {
        console.error(error);
        this.jhiAlertService.error(error, null, undefined);
    }
}
