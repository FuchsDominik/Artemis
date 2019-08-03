/* tslint:disable max-line-length */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

import { ExerciseHintComponent } from 'app/entities/exercise-hint/exercise-hint.component';
import { ExerciseHintService } from 'app/entities/exercise-hint/exercise-hint.service';
import { ExerciseHint } from 'app/entities/exercise-hint/exercise-hint.model';
import { ArTEMiSTestModule } from '../../test.module';

describe('Component Tests', () => {
    describe('ExerciseHint Management Component', () => {
        let comp: ExerciseHintComponent;
        let fixture: ComponentFixture<ExerciseHintComponent>;
        let service: ExerciseHintService;

        beforeEach(() => {
            TestBed.configureTestingModule({
                imports: [ArTEMiSTestModule],
                declarations: [ExerciseHintComponent],
                providers: [],
            })
                .overrideTemplate(ExerciseHintComponent, '')
                .compileComponents();

            fixture = TestBed.createComponent(ExerciseHintComponent);
            comp = fixture.componentInstance;
            service = fixture.debugElement.injector.get(ExerciseHintService);
        });

        it('Should call load all on init', () => {
            // GIVEN
            const headers = new HttpHeaders().append('link', 'link;link');
            const hint = new ExerciseHint();
            hint.id = 123;

            spyOn(service, 'findByExerciseId').and.returnValue(
                of(
                    new HttpResponse({
                        body: [hint],
                        headers,
                    }),
                ),
            );

            // WHEN
            comp.ngOnInit();

            // THEN
            expect(service.findByExerciseId).toHaveBeenCalled();
            expect(comp.exerciseHints[0]).toEqual(jasmine.objectContaining({ id: 123 }));
        });
    });
});