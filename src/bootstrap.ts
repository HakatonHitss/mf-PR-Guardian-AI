import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElements } from '@claro/ui/loader';
import { appConfig } from '@mf-PR-Guardian-AI/app/app.config';
import { AppComponent } from '@mf-PR-Guardian-AI/app/app.component';

defineCustomElements();


bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
