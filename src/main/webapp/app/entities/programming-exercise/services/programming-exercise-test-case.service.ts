import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { SERVER_API_URL } from 'app/app.constants';
import { ProgrammingExerciseTestCase } from '../programming-exercise-test-case.model';
import { JhiWebsocketService } from 'app/core';

export interface IProgrammingExerciseTestCaseService {
    subscribeForTestCases(exerciseId: number): Observable<ProgrammingExerciseTestCase[] | null>;
}

@Injectable({ providedIn: 'root' })
export class ProgrammingExerciseTestCaseService implements IProgrammingExerciseTestCaseService, OnDestroy {
    public testCaseUrl = `${SERVER_API_URL}api/programming-exercise-test-cases`;

    private connections: { [exerciseId: string]: string } = {};
    private subjects: { [exerciseId: string]: BehaviorSubject<ProgrammingExerciseTestCase[] | null> } = {};

    constructor(private jhiWebsocketService: JhiWebsocketService, private http: HttpClient) {}

    /**
     * On destroy unsubscribe all connections.
     */
    ngOnDestroy(): void {
        Object.values(this.connections).forEach(connection => this.jhiWebsocketService.unsubscribe(connection));
    }

    /**
     * Subscribe to test case changes on the server.
     * Executes a REST request initially to get the current value, so that ideally no null value is emitted to the subscriber.
     *
     * If the result is an empty array, this will be translated into a null value.
     * This is done on purpose most likely this is an error as most programming exercises have at least one test case.
     *
     * @param exerciseId
     */
    subscribeForTestCases(exerciseId: number): Observable<ProgrammingExerciseTestCase[] | null> {
        if (this.subjects[exerciseId]) {
            return this.subjects[exerciseId] as Observable<ProgrammingExerciseTestCase[] | null>;
        } else {
            return this.getTestCases(exerciseId).pipe(
                map(testCases => (testCases.length ? testCases : null)),
                catchError(() => of(null)),
                switchMap((testCases: ProgrammingExerciseTestCase[] | null) => this.initTestCaseSubscription(exerciseId, testCases)),
            );
        }
    }

    /**
     * Executes a REST request to the test case endpoint.
     * @param exerciseId
     */
    private getTestCases(exerciseId: number): Observable<ProgrammingExerciseTestCase[]> {
        return this.http.get<ProgrammingExerciseTestCase[]>(`${this.testCaseUrl}/${exerciseId}`);
    }

    /**
     * Set up the infrastructure for handling and reusing a new test case subscription.
     * @param exerciseId
     * @param initialValue
     */
    private initTestCaseSubscription(exerciseId: number, initialValue: ProgrammingExerciseTestCase[] | null) {
        const testCaseTopic = `/topic/programming-exercise/${exerciseId}/test-cases`;
        this.jhiWebsocketService.subscribe(testCaseTopic);
        this.connections[exerciseId] = testCaseTopic;
        this.subjects[exerciseId] = new BehaviorSubject(initialValue);
        this.jhiWebsocketService
            .receive(testCaseTopic)
            .pipe(
                map(testCases => (testCases.length ? testCases : null)),
                tap(testCases => this.notifySubscribers(exerciseId, testCases)),
            )
            .subscribe();
        return this.subjects[exerciseId];
    }

    /**
     * Notify the subscribers of the exercise specific test cases.
     * @param exerciseId
     * @param testCases
     */
    private notifySubscribers(exerciseId: number, testCases: ProgrammingExerciseTestCase[] | null) {
        this.subjects[exerciseId].next(testCases);
    }
}