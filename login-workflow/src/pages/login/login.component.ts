import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ValidatorFn, Validators } from '@angular/forms';
import { AuthErrorStateMatcher } from '../../util/matcher';
import { isEmptyView } from '../../util/view-utils';
import { PxbAuthSecurityService } from '../../services/state/auth-security.service';
import { PxbAuthUIService } from '../../services/api/auth-ui.service';
import {
    CONTACT_SUPPORT_ROUTE,
    CREATE_ACCOUNT_INVITE_ROUTE,
    CREATE_ACCOUNT_ROUTE,
    FORGOT_PASSWORD_ROUTE,
    RESET_PASSWORD_ROUTE,
} from '../../auth/auth.routes';

import { PxbAuthConfig } from '../../services/config/auth-config';
import { PxbLoginErrorDialogService } from '../../services/dialog/login-error-dialog.service';
import { ErrorDialogData } from '../../services/dialog/error-dialog.service';

// TODO: Find a home for this const, perhaps config folder.
export const PXB_LOGIN_VALIDATOR_ERROR_NAME = 'PXB_LOGIN_VALIDATOR_ERROR_NAME';

@Component({
    selector: 'pxb-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    host: {
        class: 'pxb-login',
    },
})
export class PxbLoginComponent implements OnInit, AfterViewInit {
    @ViewChild('header', { static: false }) headerEl: ElementRef;
    @ViewChild('footer', { static: false }) footerEl: ElementRef;

    @Input() customEmailValidator: ValidatorFn;
    customErrorName = PXB_LOGIN_VALIDATOR_ERROR_NAME;

    emailFormControl: FormControl;
    passwordFormControl: FormControl;
    matcher = new AuthErrorStateMatcher();

    isLoading: boolean;
    rememberMe: boolean;
    enableDebugMode: boolean;
    showSelfRegistration: boolean;

    isPasswordVisible = false;
    debugMode = false;
    idFieldActive = false;
    touchedIdField = false;

    isEmpty = (el: ElementRef): boolean => isEmptyView(el);

    constructor(
        private readonly _router: Router,
        private readonly _pxbAuthConfig: PxbAuthConfig,
        private readonly _changeDetectorRef: ChangeDetectorRef,
        private readonly _pxbUIActionsService: PxbAuthUIService,
        private readonly _pxbSecurityService: PxbAuthSecurityService,
        private readonly _pxbLoginErrorDialogService: PxbLoginErrorDialogService
    ) {}

    ngOnInit(): void {
        this.enableDebugMode = this._pxbAuthConfig.allowDebugMode;
        this.showSelfRegistration = this._pxbAuthConfig.showSelfRegistration;

        const emailValidators = [
            Validators.required,
            Validators.email,
            Validators.pattern(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i),
        ];
        if (this.customEmailValidator) {
            emailValidators.push(this.customEmailValidator);
        }
        this.emailFormControl = new FormControl(
            this._pxbSecurityService.getSecurityState().rememberMeDetails.email,
            emailValidators
        );
        this.passwordFormControl = new FormControl('', []);
        this.rememberMe = this._pxbSecurityService.getSecurityState().rememberMeDetails.rememberMe;
        if (this._pxbSecurityService.getSecurityState().isAuthenticatedUser) {
            this.navigateToDefaultRoute();
            return;
        }
    }

    ngAfterViewInit(): void {
        this._changeDetectorRef.detectChanges();
    }

    togglePasswordVisibility(): void {
        this.isPasswordVisible = !this.isPasswordVisible;
    }

    toggleDebugMode(): void {
        this.debugMode = !this.debugMode;
    }

    login(): void {
        const email = this.emailFormControl.value;
        const password = this.passwordFormControl.value;
        const rememberMe = Boolean(this.rememberMe);
        this._pxbSecurityService.setLoading(true);
        this._pxbUIActionsService
            .login(email, password, rememberMe)
            .then(() => {
                this._pxbSecurityService.onUserAuthenticated(email, password, rememberMe);
                this.navigateToDefaultRoute(); // TODO: User needs to provide this route somehow.
                this._pxbSecurityService.setLoading(false);
            })
            .catch((data: ErrorDialogData) => {
                this._pxbLoginErrorDialogService.openDialog(data);
                this._pxbSecurityService.onUserNotAuthenticated();
                this._pxbSecurityService.setLoading(false);
            });
    }

    emitRememberMeChange(): void {
        const rememberMe = this.rememberMe;
        this._pxbSecurityService.updateSecurityState({ rememberMeDetails: { rememberMe } });
    }

    navigateToDefaultRoute(): void {
        void this._router.navigate([this._pxbAuthConfig.homeRoute]);
    }

    forgotPassword(): void {
        void this._router.navigate([`${this._pxbAuthConfig.authRoute}/${FORGOT_PASSWORD_ROUTE}`]);
    }

    testForgotPasswordEmail(): void {
        void this._router.navigate([`${this._pxbAuthConfig.authRoute}/${RESET_PASSWORD_ROUTE}`], {
            queryParams: { code: 'DEADBEEF', email: 'resetPassword@email.com' },
        });
    }

    testInviteRegister(): void {
        void this._router.navigate([`${this._pxbAuthConfig.authRoute}/${CREATE_ACCOUNT_INVITE_ROUTE}`], {
            queryParams: { code: 'DEADBEEF' },
        });
    }

    createAccount(): void {
        void this._router.navigate([`${this._pxbAuthConfig.authRoute}/${CREATE_ACCOUNT_ROUTE}`]);
    }

    contactSupport(): void {
        void this._router.navigate([`${this._pxbAuthConfig.authRoute}/${CONTACT_SUPPORT_ROUTE}`]);
    }

    isValidFormEntries(): boolean {
        return this.passwordFormControl.value && this.emailFormControl.valid;
    }

    isLoginFormDirty(): boolean {
        return (
            !this.idFieldActive && this.touchedIdField && (this.emailFormControl.dirty || this.emailFormControl.touched)
        );
    }
}
