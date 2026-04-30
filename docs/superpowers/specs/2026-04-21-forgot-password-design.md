# Forgot Password Design

## Goal

Add a lightweight "Forgot password?" action to the existing login screen so a user can request a Supabase password reset email without leaving the screen.

## Existing Context

- The login UI lives in `app/login.tsx`.
- Authentication uses the shared Supabase client in `lib/supabase.ts`.
- The screen already uses `Alert.alert(...)` for validation and error feedback.
- There is no existing in-app password recovery screen or `PASSWORD_RECOVERY` deep-link handling flow.

## Scope

This change only covers sending the password reset email.

Included:

- A visible "Forgot password?" button on the login screen
- Validation that an email address has been entered
- A call to `supabase.auth.resetPasswordForEmail(...)`
- User feedback for success and failure

Excluded:

- A dedicated reset-password screen
- Handling the password recovery link inside the app
- Updating the password after the user opens the email link
- Changes to signup, remember-me, or post-login routing behavior

## UX Design

Place a text-style "Forgot password?" action near the password input and before the primary login button so it is easy to find without competing with the main submit action.

Behavior:

1. Read the current email field value.
2. Trim whitespace and lowercase it for consistency with the existing login flow.
3. If the email is empty, show an alert asking the user to enter their email first.
4. If the email is present, call Supabase to send the reset email.
5. On success, show a generic confirmation message such as "If an account exists for that email, check your inbox for reset instructions."
6. Keep the user on the login screen after the alert.

## Error Handling

- Empty email: show a validation alert and do not call Supabase.
- Supabase error: surface the returned message through the existing alert pattern.
- Loading state: disable the action while another auth request is in progress to prevent duplicate submissions.

## Technical Design

Modify `app/login.tsx` to add:

- A `handleForgotPassword` async handler
- A `Pressable` for the new action
- Any small supporting styles needed for placement and visual treatment

The handler will:

- Reuse the current `email` state
- Normalize the email with `trim().toLowerCase()`
- Call `supabase.auth.resetPasswordForEmail(normalizedEmail)`
- Reuse the screen's existing `loading` guard and alert-based feedback style

No changes are needed in `lib/supabase.ts` because the shared client already exposes `auth`.

## External Dependency

Supabase password reset emails redirect the user using the project's Auth URL configuration. Even though this feature only sends the email, the reset link still needs a valid redirect target configured in Supabase Auth settings, or the emailed link may not land somewhere useful.

## Testing

Manual verification is sufficient for this small UI change:

1. Open the login screen.
2. Tap "Forgot password?" with an empty email field and confirm the validation alert appears.
3. Enter an email and tap "Forgot password?".
4. Confirm the success alert appears when Supabase accepts the request.
5. Confirm the button is disabled while a request is already loading.

## Risks

- If Supabase redirect URLs are not configured correctly, the email can send successfully while the recovery link still leads to an unusable destination.
- Reusing the shared `loading` state means the forgot-password action should remain simple and not overlap with sign-in requests.
