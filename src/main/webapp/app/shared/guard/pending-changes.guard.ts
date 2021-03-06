import { CanDeactivate } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { TranslateService } from '@ngx-translate/core';
import { ComponentCanDeactivate } from 'app/shared/guard/can-deactivate.model';

@Injectable({ providedIn: 'root' })
export class PendingChangesGuard implements CanDeactivate<ComponentCanDeactivate> {
    constructor(private translateService: TranslateService) {}

    canDeactivate(component: ComponentCanDeactivate): boolean | Observable<boolean> {
        const warning = this.translateService.instant('pendingChanges');
        return component.canDeactivate() ? true : confirm(warning);
    }
}
